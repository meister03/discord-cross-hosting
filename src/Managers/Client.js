const { Client } = require('net-ipc');

const { IPCMessage, BaseMessage } = require('../Structures/IPCMessage.js');
const { messageType } = require('../Utils/Constants.js');

class BridgeClient extends Client {
    constructor(options = {}) {
        super(options);

        /**
         * A authentication token to be able to verify the connection to the Bridge.
         * @type {string}}
         */
        this.authToken = options?.authToken;
        if (!this.authToken) throw new Error('ClIENT_MISSING_OPTION', 'authToken must be provided', 'String');

        /**
         * A custom settable agent name. BroadcastEvals are just executed on Agents with the name 'bot'
         * @type {string}
         */
        this.agent = options?.agent;
        if (!this.agent) throw new Error('ClIENT_MISSING_OPTION', 'agent must be provided', 'Default: bot');

        /**
         * If Rolling Restart should be disabled.
         * @type {boolean}
         */
        this.rollingRestarts = options?.rollingRestarts ?? false;

        /**
         * A array of Internal ShardIds, which should be spawned in the Machine.
         * @type {Array}
         */
        this.shardList;

        /**
         * The Amount of Total Shards in all Machines.
         * @type {Array}
         */
        this.totalShards;

        this.on('ready', this._handleReady.bind(this));
        this.on('message', this._handleMessage.bind(this));
        this.on('request', this._handleRequest.bind(this));
    }

    /**
     * Connect your MachineClient to the Bridge with your Custom Data.
     * @param {object} args - Custom Data, which can be sent to the Bridge when connecting.
     */
    connect(args = {}) {
        this._debug(`[Connect] Connecting to Bridge with the given Data`);
        return super.connect({ ...args, authToken: this.authToken, agent: this.agent });
    }

    /**
     * Handle the Ready Event and lot out, when the Client connected to the Bridge.
     * @param _data
     * @private
     */
    _handleReady(_data) {
        this._debug(`[Ready] Client connected to Bridge`);
    }

    /**
     * Handles the Request Event of the Client and executes Requests based on the Message
     * @param {object} message - Request, which has been sent from the Bridge
     * @param client
     * @private
     */
    _handleMessage(message, client) {
        if (typeof message === 'string') message = JSON.parse(message);
        if (message?.type === undefined) return;

        if (message.type === messageType.SHARDLIST_DATA_UPDATE) {
            if (!this.rollingRestarts) return;
            const checkIfClusterListIsUpToDate = message.shardClusterList.find(
                x => JSON.stringify(x) === JSON.stringify(this.shardList),
            );

            if (!checkIfClusterListIsUpToDate || this.totalShards !== message.totalShards) {
                this._debug(`[SHARDLIST_DATA_UPDATE] ShardData changed, waiting 5s until RollingRestart...`, {
                    bridge: true,
                });
                setTimeout(async () => {
                    const response = await this.requestShardData();
                    // if (!response?.shardList) return; -> Kill Old Clusters
                    this.manager.totalShards = response.totalShards;
                    this.manager.shardList = response.shardList || [];
                    this.manager.totalClusters = response.shardList?.length;
                    this.manager.shardclusterlist = response.shardList || [];
                    this.manager.shardClusterList = response.shardList || []; // Support Old and New version of hybrid-sharding
                    this.manager.clusterList = response.clusterList || [];
                    this._debug(`[Start] RollingRestart`);
                    this.rollingRestart();
                }, 5000);
            } else {
                super.send({ type: messageType.CLIENT_SHARDLIST_DATA_CURRENT, shardList: this.shardList }); // removes this shardList from the queue
                this._debug(`[SHARDLIST_DATA_UPDATE] ShardData did not changed!`, { bridge: true });
                return;
            }
        }
        let emitMessage;
        if (typeof message === 'object') emitMessage = new IPCMessage(client, message);
        else emitMessage = message;
        this.emit('bridgeMessage', emitMessage, client);
    }

    /**
     * Handles the Request Event of the Client and executes Requests based on the Message
     * @param {object} message - Request, which has been sent from the Bridge
     * @param res
     * @param client
     * @private
     */
    _handleRequest(message, res, client) {
        if (typeof message === 'string') message = JSON.parse(message);
        if (message?.type === undefined) return;
        // BroadcastEval
        if (message.type === messageType.SERVER_BROADCAST_REQUEST) {
            if (!this.manager) throw new Error(`A Cluster/Shard Manager has not been loaded to net-ipc`);
            message.type = messageType.CLIENT_BROADCAST_RESPONSE;
            this.manager
                .broadcastEval(message.script, message.options)
                .then(e => res(e))
                .catch(e => res(e));
            return;
        }

        if (message.type === messageType.GUILD_DATA_REQUEST) {
            // console.log(message)
            if (!this.manager) throw new Error(`A Cluster/Shard Manager has not been loaded to net-ipc`);
            message.type = messageType.GUILD_DATA_RESPONSE;
            // Find Shard

            if (!isNaN(message.options.shard)) {
                const findCluster = [...this.manager.clusters.values()].find(i =>
                    i.shardList[0].includes(message.options.shard),
                );
                message.options.cluster = findCluster ? findCluster.id : 0;
                // console.log(`Guild Data Cluster Request: ${message.options.cluster}`)
            } else return res({ error: 'No Shard has been provided!', ...message });
            const cluster = this.manager.clusters.get(message.options.cluster);
            // console.log(`Found Cluster to send request: ${cluster?.id}`)
            if (cluster === undefined)
                return res({ ...message, error: `Cluster ${message.options.cluster} not found!` });
            cluster
                .request(message)
                .then(e => res(e))
                .catch(e => res({ ...message, error: e }));
            return;
        }
        if (message.type === messageType.GUILD_EVAL_REQUEST) {
            if (!this.manager) throw new Error(`A Cluster/Shard Manager has not been loaded to net-ipc`);
            message.type = messageType.GUILD_EVAL_RESPONSE;
            this.manager
                .evalOnCluster(message.script, message.options)
                .then(e => res(e))
                .catch(e => res(e));
            return;
        }
        let emitMessage;
        if (typeof message === 'object') emitMessage = new IPCMessage(client || this, message, res);
        else emitMessage = message;
        this.emit('bridgeRequest', emitMessage, client || this);
    }

    /**
     * Request some Shard and Important Data from the Bridge.
     * @param options
     * @returns {object} response - The ShardList, TotalShards and other Data requested from the Bridge
     */
    async requestShardData(options = {}) {
        const message = {};
        message.type = messageType.SHARDLIST_DATA_REQUEST;
        if (options.maxClusters) this.maxClusters = options.maxClusters;
        message.maxClusters = options.maxClusters || this.maxClusters;
        const response = await super.request(message, options.timeout);
        this._debug(`Given Shard Data: ${JSON.stringify(response)}`, { bridge: true });
        if (!response) throw new Error(`No Response from Server`);
        if (response.error) throw new Error(response.error);
        this.clusterList = response.clusterList;
        this.shardList = response.shardList;
        this.totalShards = response.totalShards;
        return response;
    }

    // BroadcastEval Stuff
    /**
     * Listens to NET-IPC messages such as BroadcastEval or Normal Messages
     * @param {object} manager the Shard/Cluster Manager, which should be listened on.
     * @returns {manager}
     */
    listen(manager) {
        if (!manager) throw new Error(`A Cluster/Shard Manager has not been provided`);
        this.manager = manager;
        this.manager.netipc = this;
        return this.manager;
    }

    /**
     * Evaluates a script or function on all clusters, or a given cluster, in the context of the {@link Client}s.
     * @param {string|Function} script JavaScript to run on each cluster
     * @param {object} options Options provided for the ClusterClient broadcastEval Function
     * @returns {Promise<*>|Promise<Array<*>>} Results of the script execution
     * @example
     * client.crosshost.broadcastEval('this.guilds.cache.size')
     *   .then(results => console.log(`${results.reduce((prev, val) => prev + val, 0)} total guilds`))
     *   .catch(console.error);
     * @see {@link Server#broadcastEval}
     */
    async broadcastEval(script, options = {}) {
        if (options.script) script = options.script;
        if (!script || (typeof script !== 'string' && typeof script !== 'function'))
            throw new Error('Script for BroadcastEvaling has not been provided or must be a valid String!');
        script = typeof script === 'function' ? `(${script})(this, ${JSON.stringify(options.context)})` : script;
        options.usev13 = false;

        const message = { script, options };
        message.type = messageType.CLIENT_BROADCAST_REQUEST;
        return super.request(message, message.options.timeout);
    }

    /**
     * Sends a Message to the Bridge
     * @param {BaseMessage} message Message, which should be sent to Bridge
     * @param options
     * @returns {Promise<*>} Message
     * @example
     * client.send({content: 'hello'})
     *   .then(result => console.log(result)) // hi
     *   .catch(console.error);
     * @see {@link IPCMessage#reply}
     */
    async send(message = {}, options = {}) {
        if (!message) throw new Error('Request has not been provided!');
        if (typeof message === 'string' && !options.internal) message = JSON.parse(message);
        if (typeof message !== 'object' && !options.internal) throw new TypeError('The Request has to be an object');
        if (!message.options) message.options = options;
        if (!options.internal) {
            message._sRequest = false;
            message._sReply = false;
            message = new BaseMessage(message).toJSON();
        }
        // Message sent by ClusterClient, which should not be resolved to avoid memory leaks
        if (options.resolve === false) {
            super.send(JSON.stringify(message));
            return true;
        }
        return super.send(JSON.stringify(message));
    }

    /**
     * Sends a Request to the Bridge and returns the reply
     * @param {BaseMessage} message Message, which should be sent as request
     * @param options
     * @returns {Promise<*>} Reply of the Message
     * @example
     * client.request({content: 'hello'}, {timeout: 1000})
     *   .then(result => console.log(result)) // hi
     *   .catch(console.error);
     * @see {@link IPCMessage#reply}
     */
    async request(message = {}, options = {}) {
        if (!message) throw new Error('Request has not been provided!');
        if (typeof message === 'string' && !options.internal) message = JSON.parse(message);
        if (typeof message !== 'object' && !options.internal) throw new TypeError('The Request has to be an object');
        // console.log(message)
        if (!message.options) message.options = options;
        if (!options.internal) {
            message._sRequest = true;
            message._sReply = false;
            message = new BaseMessage(message).toJSON();
        }
        return super.request(JSON.stringify(message), message.options.timeout).catch(e => console.log(e));
    }
    /**
     * Sends a Request to the Guild and returns the reply
     * @param {BaseMessage} message Message, which should be sent as request and handled by the User
     * @param options
     * @returns {Promise<*>} Reply of the Message
     * @example
     * client.crosshost.request({content: 'hello', guildId: '123456789012345678'})
     *   .then(result => console.log(result)) // hi
     *   .catch(console.error);
     */
    async requestToGuild(message = {}, options = {}) {
        if (!message.guildId) throw new Error('GuildID has not been provided!');
        if (!message.eval) message.type = messageType.GUILD_DATA_REQUEST;
        else message.type = messageType.GUILD_EVAL_REQUEST;
        if (!message.options) message.options = options;
        return super.request(message, message.options.timeout);
    }

    /**
     * Sends a Request to the Client and returns the reply
     * @param {BaseMessage} message Message, which should be sent as request and handled by the User
     * @param options
     * @returns {Promise<*>} Reply of the Message
     * @example
     * client.requestToClient({content: 'hello', agent: 'dashboard', clientId: 'CLient_id_provided_by_machine'})
     *   .then(result => console.log(result)) // hi
     *   .catch(console.error);
     */
    async requestToClient(message = {}, options = {}) {
        if (!message.agent && !message.clientId) throw new Error('Agent has not been provided!');
        message.type = messageType.CLIENT_DATA_REQUEST;
        if (!message.options) message.options = options;
        return super.request(message, message.options.timeout);
    }

    /**
     * Executes a rolling Restart, which has been executed by the Bridge
     * @private
     */
    rollingRestart() {
        const clusters = [...this.manager.clusters.values()];
        const length =
            clusters.length < this.manager.shardClusterList.length
                ? this.manager.shardClusterList.length
                : clusters.length;
        this._debug(`[RollingRestart] ShardClusterList: ${JSON.stringify(this.manager.shardClusterList)}`);

        if (!this.rollingRestarts) return;

        // Recluster Plugin enabled on hybrid-sharding
        if (this.manager.recluster) {
            this.manager.recluster.start({
                restartMode: 'rolling',
            });
        }

        if (this.manager.shardClusterList.length === 0) {
            clusters.map(x => {
                try {
                    x?.kill({ force: true });
                } catch (error) {
                    console.log(error);
                }

                this.manager.clusters.delete(x.id);
                this._debug(`[RollingRestart][Kill] Old Cluster ${x.id}`);
            });
            return;
        }
        for (let i = 0; i < length + 1; i++) {
            if (this.manager.shardClusterList[i]) {
                setTimeout(async () => {
                    const cluster = this.manager.createCluster(
                        this.manager.clusterList[i] || i,
                        this.manager.shardClusterList[i],
                        this.manager.totalShards,
                    );
                    this._debug(`[RollingRestart][Spawn] Cluster ${cluster.id}`);
                    cluster.spawn({ timeout: this.manager.shardClusterList[i].length * 10000 }).catch(e => e);
                    cluster.on('ready', () => {
                        const clusterPosition = clusters.findIndex(x => x.id === cluster.id);
                        if (clusterPosition === undefined || clusterPosition === -1) return;
                        try {
                            clusters.find(x => x.id === cluster.id)?.kill({ force: true });
                        } catch (error) {
                            console.log(error);
                        }
                        this._debug(`[RollingRestart][Kill] Old Cluster ${cluster.id}`);
                        clusters.splice(clusterPosition, 1);
                    });
                }, i * 7000 * this.manager.shardClusterList[i].length);
            } else {
                if (!clusters.length) continue;
                clusters.map(x => {
                    if (!this.manager.clusterList.includes(x.id)) {
                        try {
                            x?.kill({ force: true });
                        } catch (error) {
                            console.log(error);
                        }

                        this.manager.clusters.delete(x.id);
                        this._debug(`[RollingRestart][Kill] Old Cluster ${i}`);
                    }
                });
            }
        }
    }

    /**
     * Logs the Debug Messages
     * <warn>Using this method just emits the Debug Event.</warn>
     * <info>This is usually not necessary to manually specify.</info>
     * @param message
     * @param options
     * @returns {string} returns the log message
     */
    _debug(message, options = {}) {
        let log;
        if (options.bridge) {
            log = `[Bridge => CM] ` + message;
        } else {
            log = `[CM] ` + message;
        }
        /**
         * Emitted upon receiving a message
         * @event ClusterManager#debug
         * @param {string} log Message which was received
         */
        this.emit('debug', log);
        return log;
    }
}

module.exports = BridgeClient;
