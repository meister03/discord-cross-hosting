const { Client } = require("net-ipc");
const { messageType } = require("../Utils/Constants.js");
class BridgeClient extends Client {
    constructor(options = {}) {
        options.secure = true;
        options.handshake = true;
        super(options)

        this.authToken = options?.authToken;
        if(!this.authToken) throw new Error('ClIENT_MISSING_OPTION', 'authToken must be provided', 'String');

        this.agent = options?.agent;
        if(!this.authToken) throw new Error('ClIENT_MISSING_OPTION', 'agent must be provided', 'Default: bot');
        
        this.shardList;
        this.totalShards;

        this.on('ready', this._handleReady.bind(this))
        this.on('message', this._handleMessage.bind(this))
        this.on('request', this._handleRequest.bind(this))


    }

    connect(args) {
        this._debug(`[Connect] Connecting to Bridge with the given Data`);
        return super.connect({ ...args, authToken: this.authToken, agent: this.agent })
    }

    _handleReady(data) {
        this._debug(`[Ready] Client connected to Bridge`);
    }

    _handleMessage(message, client) {
        if (message?.type === undefined) return;

        if (message.type === messageType.SHARDLIST_DATA_UPDATE) {
            const checkifclusterlistisuptodate = message.shardClusterList.find(x => JSON.stringify(x) === JSON.stringify(this.shardList))
          
            if (!checkifclusterlistisuptodate || this.totalShards !== message.totalShards) {
                this._debug(`[SHARDLIST_DATA_UPDATE] ShardData changed, waiting 5s until RollingRestart...`, {bridge: true});
                setTimeout(async () => {
                    const response = await this.requestShardData();
                    if (!response?.shardList) return;
                    this.manager.totalShards = response.totalShards;
                    this.manager.shardList = response.shardList;
                    this.manager.totalClusters = response.shardList.length;
                    this.manager.shardclusterlist = response.shardList;
                    this._debug(`[Start] RollingRestart`);
                    this.rollingRestart();
                }, 5000);
            } else {
                this.send({ type: messageType.CLIENT_SHARDLIST_DATA_CURRENT, shardList: this.shardList }) ///removes this shardList from the queue
                this._debug(`[SHARDLIST_DATA_UPDATE] ShardData did not changed!`, {bridge: true});
                return;
            }
        }
    }

    _handleRequest(message, res, client) {
        if (message?.type === undefined) return;
        ///BroadcastEval
        if (message.type === messageType.SERVER_BROADCAST_REQUEST) {
            if (!this.manager) throw new Error(`A Cluster/Shard Manager has not been loaded to net-ipc`);
            message.type = messageType.CLIENT_BROADCAST_RESPONSE;
            this.manager.broadcastEval(message.script, message.options).then(e => res(e)).catch(e => res(e));
            return;
        }

        if(message.type === messageType.GUILD_DATA_REQUEST){
            if (!this.manager) throw new Error(`A Cluster/Shard Manager has not been loaded to net-ipc`);
            message.type = messageType.GUILD_DATA_RESPONSE;
            console.log(message)
            ///Find Shard
            if(message.options.hasOwnProperty('shard')){
                const findcluster = [...this.manager.clusters.values()].find(i => i.shardlist.includes(message.options.shard));
                message.options.cluster = findcluster ? findcluster.id : 0;
                console.log(`Cluster Request: ${message.options.cluster}`)
            }else return res({error: 'No Shard has been provided!', ...message});
            const cluster = this.manager.clusters.get(message.options.cluster);
            console.log(`Cluster Request: ${cluster?.id}`)
            if(cluster === undefined) return res({...message, error: `Cluster ${message.options.cluster} not found!`});
            cluster.request(message).then(e => res(e)).catch(e => res(e));
            return;
        }
        if(message.type === messageType.GUILD_EVAL_REQUEST){
            if (!this.manager) throw new Error(`A Cluster/Shard Manager has not been loaded to net-ipc`);
            message.type = messageType.GUILD_EVAL_RESPONSE;
            this.manager.evalOnCluster(message.script, message.options).then(e => res(e)).catch(e => res(e));
            return;
        }
    }


    ///Shard Data:
    async requestShardData() {
        const message = {}
        message.type = messageType.SHARDLIST_DATA_REQUEST;
        const response = await this.request(message);
        this._debug(`Given Shard Data: ${JSON.stringify(response)}`, {bridge: true});
        if (!response) throw new Error(`No Response from Server`);
        this.shardList = response.shardList;
        this.totalShards = response.totalShards;
        return response;
    }





    ///BroadcastEval Stuff
    /**
    * Listens to NET-IPC messages such as BroadcastEval or Normal Messages
    * @param {Object} manager the Shard/Cluster Manager, which should be listened on.
    * @returns {manager}
    */
    listen(manager) {
        if (!manager) throw new Error(`A Cluster/Shard Manager has not been provided`);
        this.manager = manager
        this.manager.netipc = this;
        return this.manager;
    }

    async broadcastEval(script, options) {
        if (!script) throw new Error('Script for BroadcastEvaling has not been provided!');
        script = typeof script === 'function' ? `(${script})(this)` : script;
        const message = { script, options }
        message.type = messageType.CLIENT_BROADCAST_REQUEST;
        return this.request(message)
    }

    async requestToGuild(message ={}){
        if (!message.guildId) throw new Error('GuildID has not been provided!');
        if(!message.eval) message.type = messageType.GUILD_DATA_REQUEST;
        else message.type = messageType.GUILD_EVAL_REQUEST;
        return this.request(message);
    }



    ///Rolling Restart
    rollingRestart() {
        const clusters = [...this.manager.clusters.values()];
        const length = clusters.length < this.manager.shardclusterlist.length ? this.manager.shardclusterlist.length : clusters.length;
        this._debug(`[RollingRestart] ShardClusterList: ${JSON.stringify(this.manager.shardclusterlist)}`);
        for (let i = 0; i < length; i++) {
            if (this.manager.shardclusterlist[i]) {
                setTimeout(async () => {
                    const cluster = this.manager.createCluster(i, this.manager.shardclusterlist[i], this.manager.totalShards);
                    this._debug(`[RollingRestart][Spawn] Cluster ${cluster.id}`);
                    cluster.spawn(-1);
                    cluster.on('ready', () => {
                        const clusterposition = clusters.findIndex(x => x.id === cluster.id)
                        if (clusterposition === undefined || clusterposition === -1) return;
                        clusters.find(x => x.id === cluster.id)?.kill({ force: true });
                        this._debug(`[RollingRestart][Kill] Old Cluster ${cluster.id}`);
                        clusters.splice(clusterposition, 1);
                    })
                }, i * 7000 * this.manager.shardclusterlist[i].length);
            } else {
                const clusterposition = clusters.findIndex(x => x.id === i)
                if (clusterposition === undefined || clusterposition === -1) return;
                this._debug(`[RollingRestart][Kill] Old Cluster ${i}`);
                clusters.find(x => x.id === i)?.kill({ force: true });
                clusters.splice(clusterposition, 1);
            }
        }

    }



    /**
    * Logsout the Debug Messages
    * <warn>Using this method just emits the Debug Event.</warn>
    * <info>This is usually not necessary to manually specify.</info>
    * @returns {log} returns the log message
    */
    _debug(message, options = {}) {
        let log;
        if (options.bridge) {
            log = `[Bridge => CM] ` + message;
        } else {
            log = `[CM] ` + message;
        }
        /**
         * Emitted upon recieving a message
         * @event ClusterManager#debug
         * @param {log} Message, which was recieved
        */
        this.emit('debug', log)
        return log;
    }
}
module.exports = BridgeClient;