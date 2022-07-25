const { Server } = require('net-ipc');

const { IPCMessage, BaseMessage } = require('../Structures/IPCMessage.js');
const { messageType } = require('../Utils/Constants.js');
const Util = require('../Utils/Util.js');

class BridgeServer extends Server {
    constructor(options = {}) {
        super(options);

        /**
         * A User chosen Token for basic Authorization, when tls is disabled.
         * @type {string}
         */
        this.authToken = options.authToken;
        if (!this.authToken) throw new Error('MACHINE_MISSING_OPTION', 'authToken must be provided', 'String');
        /*********************/
        /*  Options Parsing  */
        /*********************/

        /**
         * If the Package will be used in standalone mode
         * @type {boolean}
         */
        this.standAlone = options.standAlone ?? false;

        /**
         * The Total Amount of Shards per Clusters
         * @type {number}
         */
        this.shardsPerCluster = options.shardsPerCluster ?? 1;

        /**
         * The Total Amount of Shards
         * @type {number}
         */
        this.totalShards = options.totalShards || 'auto';
        if (this.totalShards !== undefined && !this.standAlone) {
            if (this.totalShards !== 'auto') {
                if (typeof this.totalShards !== 'number' || isNaN(this.totalShards)) {
                    throw new TypeError('CLIENT_INVALID_OPTION', 'Amount of internal shards', 'a number.');
                }
                if (this.totalShards < 1)
                    throw new RangeError('CLIENT_INVALID_OPTION', 'Amount of internal shards', 'at least 1.');
                if (!Number.isInteger(this.totalShards)) {
                    throw new RangeError('CLIENT_INVALID_OPTION', 'Amount of internal shards', 'an integer.');
                }
            }
        }

        /**
         * The Total Amount of Machines
         * @type {number}
         */
        this.totalMachines = options.totalMachines;
        if (!this.totalMachines)
            throw new Error('MISSING_OPTION', 'Total Machines', 'Provide the Amount of your Machines');
        if (typeof this.totalMachines !== 'number' || isNaN(this.totalMachines)) {
            throw new TypeError('MACHINE_INVALID_OPTION', 'Machine ID', 'must be a number.');
        }
        if (!Number.isInteger(this.totalMachines)) {
            throw new TypeError('MACHINE_INVALID_OPTION', 'Machine ID', 'must be a number.');
        }

        /**
         * Your Discord Bot token
         * @type {string}
         */
        this.token = options.token ? options.token.replace(/^Bot\s*/i, '') : null;

        /**
         * The shardList, which will be hosted by all Machines
         * @type {Array[]}
         */
        this.shardList = options.shardList ?? [];

        /**
         * The shardCLusterList, which will be hosted by all Machines
         * @type {Array[]}
         */
        this.shardClusterList;

        /**
         * The shardCLusterLisQueue, the shardList which has to be spawned on the appropriated Machine
         * @type {Array[]}
         */
        this.shardClusterListQueue;

        /**
         * The Manager instance, which should be listened, when broadcasting
         * @type {object}
         */
        this.manager;

        // End options parsing

        this.on('ready', this._handleReady.bind(this));
        this.on('error', this._handleError.bind(this));
        this.on('connect', this._handleConnect.bind(this));
        this.on('disconnect', this._handleDisconnect.bind(this));
        this.on('message', this._handleMessage.bind(this));
        this.on('request', this._handleRequest.bind(this));

        this.clients = new Map();
    }

    /**
     * Starts the Bridge.
     */
    start() {
        return super.start();
    }

    /**
     * Handle the Ready Event and lot out, when the Bridge is ready.
     * @param url
     * @private
     */
    _handleReady(url) {
        this._debug(`[READY] Bridge operational on ${url}`);
        setTimeout(() => {
            if (!this.standAlone) this.initializeShardData();
        }, 5000);
    }

    /**
     * Handle the Error Event of the Bridge
     * @param _error
     * @private
     */
    _handleError(_error) {}

    /**
     * Handles the Connection of new Clients
     * @param client
     * @param initialData
     * @private
     */
    _handleConnect(client, initialData) {
        if (initialData?.authToken !== this.authToken) return client.close('ACCESS DENIED').catch(e => console.log(e));
        client.authToken = initialData.authToken;
        client.agent = initialData.agent;
        this.clients.set(client.id, client);
        this._debug(`[CM => Connected][${client.id}]`, { cm: true });
    }

    /**
     * Handles the Disconnection of Clients
     * @param client
     * @param _reason
     * @private
     */
    _handleDisconnect(client, _reason) {
        client = this.clients.get(client.id);
        if (!client) return;
        if (client.agent !== 'bot') return this.clients.delete(client.id);
        if (!client.shardList) return this.clients.delete(client.id);
        if (!this.standAlone) this.shardClusterListQueue.push(client.shardList);
        this._debug(
            `[CM => Disconnected][${client.id}] New ShardListQueue: ${JSON.stringify(this.shardClusterListQueue)}`,
        );
        this.clients.delete(client.id);
    }

    /**
     * Handles the Message Event of the Bridge and executes Requests based on the Message
     * @param {object} message - Message, which has been sent from the Bridge
     * @param client
     * @private
     */
    _handleMessage(message, client) {
        if (typeof message === 'string') message = JSON.parse(message);
        if (message?.type === undefined) return;

        if (message.type === messageType.CLIENT_SHARDLIST_DATA_CURRENT) {
            client = this.clients.get(client.id);
            if (!this.shardClusterListQueue[0]) return;
            client.shardList = message.shardList;
            this.clients.set(client.id, client);

            const checkShardListPositionInQueue = this.shardClusterListQueue.findIndex(
                x => JSON.stringify(x) === JSON.stringify(message.shardList),
            );

            if (checkShardListPositionInQueue === undefined || checkShardListPositionInQueue === -1) return;
            this.shardClusterListQueue.splice(checkShardListPositionInQueue, 1);
            this._debug(
                `[SHARDLIST_DATA_CURRENT][${client.id}] Current ShardListQueue: ${JSON.stringify(
                    this.shardClusterListQueue,
                )}`,
            );
            return;
        }
        let emitMessage;
        if (typeof message === 'object') emitMessage = new IPCMessage(client, message);
        else emitMessage = message;
        this.emit('clientMessage', emitMessage, client);
    }

    /**
     * Handles the Request Event of the Bridge and executes Requests based on the Message
     * @param {object} message - Request, which has been sent from the Bridge
     * @param res
     * @param client
     * @private
     */
    _handleRequest(message, res, client) {
        if (typeof message === 'string') message = JSON.parse(message);
        if (message?.type === undefined) return;
        if (!this.clients.has(client.id)) return;
        // BroadcastEval
        if (message.type === messageType.CLIENT_BROADCAST_REQUEST) {
            const clients = [...this.clients.values()].filter(
                message.options?.agent ? c => message.options.agent.includes(c.agent) : c => c.agent === 'bot',
            );

            message.type = messageType.SERVER_BROADCAST_REQUEST;
            const promises = [];
            for (const client of clients) promises.push(client.request(message, message.options?.timeout));
            Promise.all(promises)
                .then(e => res(e))
                .catch(_e => null);
            return;
        }

        // Shard Data Request
        if (message.type === messageType.SHARDLIST_DATA_REQUEST) {
            client = this.clients.get(client.id);

            if (!this.shardClusterListQueue[0]) return res([]);

            // Check if Client has a Custom Cluster Strategy
            if (!message.maxClusters) {
                client.shardList = this.shardClusterListQueue[0];
                this.shardClusterListQueue.shift();
            } else {
                this.shardClusterListQueue.sort((a, b) => b.length - a.length); // Sort by length: descending
                // console.log(this.shardClusterListQueue)
                const position = this.shardClusterListQueue.findIndex(x => x.length < message.maxClusters + 1);
                if (position === -1) {
                    return res({ error: 'No Cluster List with less than ' + (message.maxClusters + 1) + ' found!' });
                } else {
                    client.shardList = this.shardClusterListQueue[position];
                    this.shardClusterListQueue.splice(position, 1);
                }
            }

            this._debug(`[SHARDLIST_DATA_RESPONSE][${client.id}] ShardList: ${JSON.stringify(client.shardList)}`, {
                cm: true,
            });

            // Map clusterList:

            const clusterIds = this.shardClusterList.map(x => x.length);
            const shardListPosition = this.shardClusterList.findIndex(
                x => JSON.stringify(x) === JSON.stringify(client.shardList),
            );
            const clusterId = clusterIds.splice(0, shardListPosition);
            let r = 0;
            r = clusterId.reduce((a, b) => a + b, 0);
            const clusterList = [];
            for (let i = 0; i < client.shardList.length; i++) {
                clusterList.push(r);
                r++;
            }
            res({ shardList: client.shardList, totalShards: this.totalShards, clusterList: clusterList });
            this.clients.set(client.id, client);
            return;
        }

        // Guild Data Request
        if (message.type === messageType.GUILD_DATA_REQUEST) {
            this.requestToGuild(message)
                .then(e => res(e))
                .catch(e => res({ ...message, error: e }));
            return;
        }

        if (message.type === messageType.CLIENT_DATA_REQUEST) {
            if (!message.agent && !message.clientId)
                return res({ ...message, error: 'AGENT MISSING OR CLIENTID MISSING FOR FINDING TARGET CLIENT' });
            if (message.clientId) {
                const targetClient = this.clients.get(message.clientId);
                if (!targetClient) return res({ ...message, error: 'CLIENT NOT FOUND WITH PROVIDED CLIENT ID' });
                return targetClient
                    .request(message, message.options?.timeout)
                    .then(e => res(e))
                    .catch(e => res({ ...message, error: e }));
            }
            const clients = [...this.clients.values()].filter(c => c.agent === String(message.agent));
            message.type = messageType.CLIENT_DATA_REQUEST;
            const promises = [];
            for (const client of clients) promises.push(client.request(message, message.options?.timeout));
            return Promise.all(promises)
                .then(e => res(e))
                .catch(e => res({ ...message, error: e }));
        }

        let emitMessage;
        if (typeof message === 'object') emitMessage = new IPCMessage(client, message, res);
        else emitMessage = message;
        this.emit('clientRequest', emitMessage, client);
    }

    /**
     * Based on the User provided Data a Shard List, ShardCount and a ShardCluster List is created.
     * @returns {Array[]} shardClusterList - The shardClusterList, which should be spanned on the MachineClient's
     */
    async initializeShardData() {
        if (this.totalShards === 'auto' && this.shardList?.length === 0) {
            if (!this.token)
                throw new Error(
                    'CLIENT_MISSING_OPTION',
                    'A token must be provided when getting shard count on auto',
                    'Add the Option token: DiscordBOTTOKEN',
                );
            this.totalShards = await Util.fetchRecommendedShards(this.token, 1000);
            this.shardList = [...Array(this.totalShards).keys()];
        } else {
            if (isNaN(this.totalShards) && this.shardList) {
                this.totalShards = this.shardList.length;
            } else {
                if (typeof this.totalShards !== 'number' || isNaN(this.totalShards)) {
                    throw new TypeError('CLIENT_INVALID_OPTION', 'Amount of internal shards', 'a number.');
                }
                if (this.totalShards < 1)
                    throw new RangeError('CLIENT_INVALID_OPTION', 'Amount of internal shards', 'at least 1.');
                if (!Number.isInteger(this.totalShards)) {
                    throw new RangeError('CLIENT_INVALID_OPTION', 'Amount of internal shards', 'an integer.');
                }
                this.shardList = [...Array(this.totalShards).keys()];
            }
        }
        if (this.shardList.some(shardID => shardID >= this.totalShards)) {
            throw new RangeError(
                'CLIENT_INVALID_OPTION',
                'Amount of Internal Shards',
                'bigger than the highest shardID in the shardList option.',
            );
        }

        const clusterAmount = Math.ceil(this.shardList.length / this.shardsPerCluster);
        const ClusterList = this.shardList.chunkList(Math.ceil(this.shardList.length / clusterAmount));

        this.shardClusterList = this.parseClusterList(ClusterList);

        this.shardClusterListQueue = this.shardClusterList.slice(0);
        this._debug(`Created shardClusterList: ${JSON.stringify(this.shardClusterList)}`);

        // Update Shard Data:
        const clients = [...this.clients.values()].filter(c => c.agent === 'bot');
        const message = {};
        message.totalShards = this.totalShards;
        message.shardClusterList = this.shardClusterList;
        message.type = messageType.SHARDLIST_DATA_UPDATE;
        for (const client of clients) client.send(message);
        this._debug(`[SHARDLIST_DATA_UPDATE][${clients.length}] To all connected Clients`, { cm: true });

        return this.shardClusterList;
    }

    parseClusterList(ClusterList) {
        return ClusterList.chunkList(Math.ceil(ClusterList.length / this.totalMachines));
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
        if (!script || (typeof script !== 'string' && typeof script !== 'function'))
            throw new Error('Script for BroadcastEvaling has not been provided or must be a valid String!');
        script = typeof script === 'function' ? `(${script})(this, ${JSON.stringify(options.context)})` : script;
        options.usev13 = false;
        const message = { script, options };
        const clients = [...this.clients.values()].filter(options.filter || (c => c.agent === 'bot'));
        message.type = messageType.SERVER_BROADCAST_REQUEST;
        const promises = [];
        for (const client of clients) promises.push(client.request(message, options.timeout));
        return Promise.all(promises);
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
        // console.log(message)
        if (!message?.guildId) throw new Error('GuildID has not been provided!');
        const internalShard = Util.shardIdForGuildId(message.guildId, this.totalShards);
        // console.log(`RequestToGuild: ` + internalShard)

        const targetClient = [...this.clients.values()].find(x => x?.shardList?.flat()?.includes(internalShard));
        // console.log(`RequestToGuild Client: ` + targetClient.id)

        if (!targetClient) throw new Error('Internal Shard not found!');
        if (!message.options) message.options = options;

        if (message.eval) message.type = messageType.GUILD_EVAL_REQUEST;
        else message.type = messageType.GUILD_DATA_REQUEST;

        message.options.shard = internalShard;

        return targetClient.request(message, message.options.timeout);
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
        if (options.cm) {
            log = `[Bridge => CM] ` + message;
        } else {
            log = `[Bridge] ` + message;
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

Object.defineProperty(Array.prototype, 'chunkList', {
    value: function (chunkSize) {
        var R = [];
        for (var i = 0; i < this.length; i += chunkSize) R.push(this.slice(i, i + chunkSize));
        return R;
    },
});

module.exports = BridgeServer;
