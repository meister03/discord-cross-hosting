import { Connection, Server, ServerOptions } from 'net-ipc';

import { IPCMessage, RawMessage } from '../Structures/IPCMessage';
import { chunkArray, evalOptions, fetchRecommendedShards, shardIdForGuildId } from 'discord-hybrid-sharding';
import { BridgeEvents, BroadcastEvalOptions, messageType } from '../types/shared';

export interface BridgeOptions extends ServerOptions {
    /**
    * A User chosen Token for basic Authorization, when tls is disabled.
    */
    authToken: string;
    /**
    * If the Package will be used in standalone mode
    */
    standAlone?: Boolean;
    /**
    * The Total Amount of Shards per Clusters
    */
    shardsPerCluster?: number;
    /**
    * The Total Amount of Shards
    */
    totalShards?: number | 'auto';
    /**
    * The Total Amount of Machines
    */
    totalMachines: number;
    /**
    * Your Discord Bot token
    */
    token?: string;
    /**
    * The shardList, which will be hosted by all Machines
    */
    shardList?: number[];
}

export interface BridgeClient extends Connection {
    shardList: number[];
    agent: string;
    bot: boolean;
    authToken: string;
}

export class Bridge extends Server {
    /**
    * A User chosen Token for basic Authorization, when tls is disabled.
    */
    authToken: string;
    /**
    * If the Package will be used in standalone mode
    */
    standAlone: Boolean;
    /**
    * The Total Amount of Shards per Clusters
    */
    shardsPerCluster: number;
    /**
    * The Total Amount of Shards
    */
    totalShards: number;
    /**
    * The Total Amount of Machines
    */
    totalMachines: number;
    /**
    * Your Discord Bot token
    */
    token?: string;
    /**
    * The shardList, which will be hosted by all Machines
    */
    shardList: number[];
    /**
    * The shardCLusterList, which will be hosted by all Machines
    */
    shardClusterList: number[][];
    /**
    * The shardCLusterLisQueue, the shardList which has to be spawned on the appropriated Machine
    */
    shardClusterListQueue: number[][];
    clients: Map<string, BridgeClient>;
    constructor(options: BridgeOptions) {
        super(options);
        //if (!options) throw new Error('Minimum Options have not been provided, totalShards, totalMachines, authToken are missing.')

        this.authToken = options.authToken;
        if (!this.authToken) throw new Error('MACHINE_MISSING_OPTION - authToken must be provided - String');

        this.standAlone = options.standAlone ?? false;

        this.shardsPerCluster = options.shardsPerCluster ?? 1;


        this.totalShards = options.totalShards === 'auto' ? -1 : (options.totalShards ?? -1);
        if (this.totalShards !== undefined && !this.standAlone) {
            if (this.totalShards !== -1) {
                if (typeof this.totalShards !== 'number' || isNaN(this.totalShards)) {
                    throw new TypeError('CLIENT_INVALID_OPTION - Amount of internal shards a number.');
                }
                if (this.totalShards < 1)
                    throw new RangeError('CLIENT_INVALID_OPTION - Amount of internal shards at least 1.');
                if (!Number.isInteger(this.totalShards)) {
                    throw new RangeError('CLIENT_INVALID_OPTION - Amount of internal shards an integer.');
                }
            }
        }


        this.totalMachines = options.totalMachines;
        if (!this.totalMachines)
            throw new Error('MISSING_OPTION - Total Machines - Provide the Amount of your Machines');
        if (typeof this.totalMachines !== 'number' || isNaN(this.totalMachines)) {
            throw new TypeError('MACHINE_INVALID_OPTION - Machine ID must be a number.');
        }
        if (!Number.isInteger(this.totalMachines)) {
            throw new TypeError('MACHINE_INVALID_OPTION - Machine ID must be a number.');
        }


        this.token = options.token ? options.token.replace(/^Bot\s*/i, '') : undefined;


        this.shardList = options.shardList ?? [];

        // Defined later
        this.shardClusterList = [];
        this.shardClusterListQueue = [];

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
     * Handle the Ready Event and lot out, when the Bridge is ready.
     */
    private _handleReady(url: string) {
        this._debug(`[READY] Bridge operational on ${url}`);
        setTimeout(() => {
            if (!this.standAlone) this.initializeShardData();
        }, 5000);
    }

    /**
     * Handle the Error Event of the Bridge
     */
    private _handleError(_error: Error) { }

    /**
     * Handles the Connection of new Clients
     */
    private _handleConnect(client: Connection, initialData: { authToken?: string, agent?: string, bot?: boolean }) {
        if (initialData?.authToken !== this.authToken) return client.close('ACCESS DENIED').catch(e => console.log(e));

        const newClient: BridgeClient = Object.assign(client, {
            authToken: initialData.authToken,
            shardList: [],
            agent: (initialData.agent || 'none'),
            bot: initialData.bot ?? false
        });

        this.clients.set(client.id as string, newClient);
        this._debug(`[CM => Connected][${client.id}]`, { cm: true });
    }

    /**
     * Handles the Disconnection of Clients
     */
    private _handleDisconnect(client: Connection, _reason: string) {
        const cachedClient = this.clients.get(client.id);
        if (!cachedClient) return;
        if (!cachedClient.bot) return this.clients.delete(cachedClient.id);
        if (!cachedClient.shardList) return this.clients.delete(cachedClient.id);
        if (!this.standAlone) this.shardClusterListQueue.push(cachedClient.shardList);
        this._debug(
            `[CM => Disconnected][${cachedClient.id}] New ShardListQueue: ${JSON.stringify(this.shardClusterListQueue)}`,
        );
        this.clients.delete(cachedClient.id);
    }

    /**
     * Handles the Message Event of the Bridge and executes Requests based on the Message
     */
    private _handleMessage(message: RawMessage, _client: Connection) {
        if (typeof message === 'string') message = JSON.parse(message);
        if (message?._type === undefined) return;
        const client = this.clients.get(_client.id);
        if (!client) return;

        if (message._type === messageType.CLIENT_SHARDLIST_DATA_CURRENT) {
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
     */
    private _handleRequest(message: RawMessage, res: (data: any) => Promise<void>, _client: Connection) {
        if (typeof message === 'string') message = JSON.parse(message);
        if (message?._type === undefined) return;
        const client = this.clients.get(_client.id);
        if (!client) return res({ error: 'Client not registered on Bridges' });
        // BroadcastEval
        if (message._type === messageType.CLIENT_BROADCAST_REQUEST) {
            const clients = Array.from(this.clients.values()).filter(
                message.options?.agent ? c => message.options.agent.includes(c.agent) : c => c.bot,
            );

            message._type = messageType.SERVER_BROADCAST_REQUEST;
            const promises = [];
            for (const client of clients) promises.push(client.request(message, message.options?.timeout));
            Promise.all(promises)
                .then(e => res(e))
                .catch(_e => null);
            return;
        }

        // Shard Data Request
        if (message._type === messageType.SHARDLIST_DATA_REQUEST) {

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
                    client.shardList = this.shardClusterListQueue[position] as number[];
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
        if (message._type === messageType.GUILD_DATA_REQUEST) {
            if (!message.guildId) return res({ error: 'Missing guildId for request to Guild' });
            type newMessage = RawMessage & { guildId: string };
            this.requestToGuild(message as newMessage)
                .then(e => res(e))
                .catch(e => res({ ...message, error: e }));
            return;
        }

        if (message._type === messageType.CLIENT_DATA_REQUEST) {
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
            const clients = Array.from(this.clients.values()).filter(c => c.agent === String(message.agent));
            message._type = messageType.CLIENT_DATA_REQUEST;
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
     */
    public async initializeShardData() {
        if (this.totalShards === -1 && this.shardList?.length === 0) {
            if (!this.token)
                throw new Error(
                    'CLIENT_MISSING_OPTION - ' +
                    'A token must be provided when getting shard count on auto -' +
                    'Add the Option token: DiscordBOTTOKEN'
                );
            this.totalShards = await fetchRecommendedShards(this.token, 1000);
            this.shardList = Array.from(Array(this.totalShards).keys());
        } else {
            if (isNaN(this.totalShards) && this.shardList) {
                this.totalShards = this.shardList.length;
            } else {
                if (typeof this.totalShards !== 'number' || isNaN(this.totalShards)) {
                    throw new TypeError('CLIENT_INVALID_OPTION - Amount of internal shards - a number.');
                }
                if (this.totalShards < 1)
                    throw new RangeError('CLIENT_INVALID_OPTION - Amount of internal shards - at least 1.');
                if (!Number.isInteger(this.totalShards)) {
                    throw new RangeError('CLIENT_INVALID_OPTION - Amount of internal shards - an integer.');
                }
                this.shardList = Array.from(Array(this.totalShards).keys());
            }
        }
        if (this.shardList.some(shardID => shardID >= this.totalShards)) {
            throw new RangeError(
                'CLIENT_INVALID_OPTION - ' +
                'Amount of Internal Shards - ' +
                'bigger than the highest shardID in the shardList option.'
            );
        }

        const clusterAmount = Math.ceil(this.shardList.length / this.shardsPerCluster);
        const ClusterList = chunkArray(this.shardList, Math.ceil(this.shardList.length / clusterAmount));

        this.shardClusterList = this.parseClusterList(ClusterList);

        this.shardClusterListQueue = this.shardClusterList.slice(0);
        this._debug(`Created shardClusterList: ${JSON.stringify(this.shardClusterList)}`);

        // Update Shard Data:
        const clients = Array.from(this.clients.values()).filter(c => c.bot);
        const message = {
            totalShards: this.totalShards,
            shardClusterList: this.shardClusterList,
            _type: messageType.SHARDLIST_DATA_UPDATE,
        }
        for (const client of clients) client.send(message);
        this._debug(`[SHARDLIST_DATA_UPDATE][${clients.length}] To all connected Clients`, { cm: true });

        return this.shardClusterList;
    }

    public parseClusterList(ClusterList: number[][]) {
        return chunkArray(ClusterList, Math.ceil(ClusterList.length / this.totalMachines));
    }

    /**
     * Evaluates a script or function on all clusters, or a given cluster, in the context of the {@link Client}s.
     * @param script JavaScript to run on each cluster
     * @param options Options provided for the ClusterClient broadcastEval Function
     * @returns  Results of the script execution
     * @example
     * client.crosshost.broadcastEval('this.guilds.cache.size')
     *   .then(results => console.log(`${results.reduce((prev, val) => prev + val, 0)} total guilds`))
     *   .catch(console.error);
     */
    public async broadcastEval(script: string, options: BroadcastEvalOptions) {
        if (!script || (typeof script !== 'string' && typeof script !== 'function'))
            throw new Error('Script for BroadcastEvaling has not been provided or must be a valid String!');
        script = typeof script === 'function' ? `(${script})(this, ${JSON.stringify(options.context)})` : script;

        if (!options) options = { filter: undefined }

        const message = { script, options, _type: messageType.SERVER_BROADCAST_REQUEST };
        const clients = Array.from(this.clients.values()).filter(options.filter || (c => c.bot));
        const promises = [];
        for (const client of clients) promises.push(client.request(message, options.timeout));
        return Promise.all(promises);
    }

    /**
     * Sends a Request to the Guild and returns the reply
     * @param message Message, which should be sent as request and handled by the User
     * @param options
     * @returns Reply of the Message
     * @example
     * client.crosshost.request({content: 'hello', guildId: '123456789012345678'})
     *   .then(result => console.log(result)) // hi
     *   .catch(console.error);
     */
    public async requestToGuild(message: RawMessage & { guildId: string }, options?: evalOptions) {
        // console.log(message)
        if (!message?.guildId) throw new Error('GuildID has not been provided!');
        const internalShard = shardIdForGuildId(message.guildId, this.totalShards);
        // console.log(`RequestToGuild: ` + internalShard)

        const targetClient = Array.from(this.clients.values()).find(x => x?.shardList?.flat()?.includes(internalShard));
        // console.log(`RequestToGuild Client: ` + targetClient.id)

        if (!targetClient) throw new Error('Internal Shard not found!');
        if (!message.options) message.options = options ?? {};

        if (message.eval) message._type = messageType.GUILD_EVAL_REQUEST;
        else message._type = messageType.GUILD_DATA_REQUEST;

        message.options.shard = internalShard;

        return targetClient.request(message, message.options.timeout);
    }

    /**
     * Logs the Debug Messages
     * <warn>Using this method just emits the Debug Event.</warn>
     * <info>This is usually not necessary to manually specify.</info>
     * @returns  returns the log message
     */
    private _debug(message: string, options?: { cm: Boolean }) {
        let log;
        if (options?.cm) {
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

export interface Bridge extends Server {
    on<T extends keyof BridgeEvents>(event: T, listener: (...args: BridgeEvents[T]) => any): this;
}
