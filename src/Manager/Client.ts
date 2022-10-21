
import { ClusterManager, Cluster, evalOptions } from 'discord-hybrid-sharding';
import { ClientEvents } from 'discord.js';
import { Client as NetIPCClient, ClientOptions as NetIPCClientOptions } from 'net-ipc';

import { IPCMessage, BaseMessage, RawMessage } from '../Structures/IPCMessage';
import { CrossHostMessage, messageType } from '../types/shared';

export interface ClientOptions extends NetIPCClientOptions {
    /**
    * A authentication token to be able to verify the connection to the Bridge.
    */
    authToken: string;

    /**
    * A custom settable agent name. BroadcastEvals are just executed on Agents with the name 'bot'
    */
    agent: string;

    /**
     * Set if client will be a bot user or not. Defaults to false.
     */
    bot?: boolean;

    /**
    * If Rolling Restart should be enabled.
    */
    rollingRestarts?: boolean;

    /**
    * A array of Internal ShardIds, which should be spawned in the Machine.
    */
    shardList?: number[];

    /**
    * The Amount of Total Shards in all Machines.
    */
    totalShards?: number;

}

export class Client extends NetIPCClient {
    /**
    * A authentication token to be able to verify the connection to the Bridge.
    */
    authToken: string;

    /**
    * A custom settable agent name. BroadcastEvals are just executed on Agents with the name 'bot'
    */
    agent: string;

    /**
     * Set if client will be a bot user or not. Defaults to false.
     */
    bot: boolean;

    /**
    * If Rolling Restart should be enabled.
    */
    rollingRestarts: boolean;

    /**
    * A array of Internal ShardIds, which should be spawned in the Machine.
    */
    shardList: number[];

    /**
    * The Amount of Total Shards in all Machines.
    */
    totalShards: number;

    /** Cluster Manager */
    manager?: ClusterManager & { netipc?: Client };
    clusterList: never[];
    constructor(options: ClientOptions) {
        super(options);
        if (!options) throw new Error('Client required options are missing');

        this.bot = options?.bot ?? false;

        this.authToken = options?.authToken;
        if (!this.authToken) throw new Error('ClIENT_MISSING_OPTION - authToken must be provided - String');

        this.agent = options?.agent || 'bot';

        this.rollingRestarts = options?.rollingRestarts ?? false;

        this.shardList = [];
        this.clusterList = [];

        this.totalShards = -1;

        this.on('ready', this._handleReady.bind(this));

        this.on('message', this._handleMessage.bind(this) as any);
        // @ts-expect-error
        this.on('request', this._handleRequest.bind(this));
    }

    /**
     * Connect your MachineClient to the Bridge with your Custom Data.
     * @param args - Custom Data, which can be sent to the Bridge when connecting.
     */
    public override connect(args: object = {}) {
        this._debug(`[Connect] Connecting to Bridge with the given Data`);
        return super.connect({ ...args, authToken: this.authToken, agent: this.agent, bot: this.bot });
    }

    /**
     * Handle the Ready Event and lot out, when the Client connected to the Bridge.
     * @private
     */
    private _handleReady() {
        this._debug(`[Ready] Client connected to Bridge`);
    }

    /**
     * Handles the Request Event of the Client and executes Requests based on the Message
     * @param message - Request, which has been sent from the Bridge
     * @private
     */
    private _handleMessage(message: RawMessage) {
        if (typeof message === 'string') message = JSON.parse(message);
        if (message._type === undefined) return;

        if (message._type === messageType.SHARDLIST_DATA_UPDATE) {
            if (!this.rollingRestarts) return;
            const checkIfClusterListIsUpToDate = message.shardClusterList.find(
                (x: number[]) => JSON.stringify(x) === JSON.stringify(this.shardList),
            );

            if (!checkIfClusterListIsUpToDate || this.totalShards !== message.totalShards) {
                this._debug(`[SHARDLIST_DATA_UPDATE] ShardData changed, waiting 5s until RollingRestart...`, {
                    bridge: true,
                });
                setTimeout(async () => {
                    if (!this.manager) return;
                    const response = await this.requestShardData();
                    // if (!response?.shardList) return; -> Kill Old Clusters
                    this.manager.totalShards = response.totalShards;
                    this.manager.shardList = response.shardList || [];
                    this.manager.totalClusters = response.shardList?.length;
                    this.manager.shardClusterList = response.shardList || []; // Support Old and New version of hybrid-sharding
                    this.manager.clusterList = response.clusterList || [];
                    this._debug(`[Start] RollingRestart`);
                    this.rollingRestart();
                }, 5000);
            } else {
                super.send({ _type: messageType.CLIENT_SHARDLIST_DATA_CURRENT, shardList: this.shardList }); // removes this shardList from the queue
                this._debug(`[SHARDLIST_DATA_UPDATE] ShardData did not changed!`, { bridge: true });
                return;
            }
        }
        let emitMessage;
        if (typeof message === 'object') emitMessage = new IPCMessage(this, message);
        else emitMessage = message;
        this.emit('bridgeMessage', emitMessage, this);
    }

    /**
     * Handles the Request Event of the Client and executes Requests based on the Message
     * @param message - Request, which has been sent from the Bridge
     * @param res
     * @param client
     * @private
     */
    private _handleRequest(message: RawMessage, res: (data: any) => Promise<void>) {
        if (typeof message === 'string') message = JSON.parse(message);
        if (message?._type === undefined) return;
        // BroadcastEval
        if (message._type === messageType.SERVER_BROADCAST_REQUEST) {
            if (!this.manager) throw new Error(`A Cluster/Shard Manager has not been loaded to net-ipc`);
            message._type = messageType.CLIENT_BROADCAST_RESPONSE;
            this.manager.broadcastEval(message.script, message.options)?.then(e => res(e))
                .catch(e => res(e));
            return;
        }

        if (message._type === messageType.GUILD_DATA_REQUEST) {
            // console.log(message)
            if (!this.manager) throw new Error(`A Cluster/Shard Manager has not been loaded to net-ipc`);
            message._type = messageType.GUILD_DATA_RESPONSE;
            // Find Shard

            if (!isNaN(message.options.shard)) {
                const findCluster = Array.from(this.manager.clusters.values()).find((i: Cluster) => {
                    if (!i) return false;
                    return i.shardList.includes(message.options.shard);
                });
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
        if (message._type === messageType.GUILD_EVAL_REQUEST) {
            if (!this.manager) throw new Error(`A Cluster/Shard Manager has not been loaded to net-ipc`);
            message._type = messageType.GUILD_EVAL_RESPONSE;
            this.manager
                .evalOnCluster(message.script, message.options)?.then(e => res(e))
                .catch(e => res(e));
            return;
        }
        let emitMessage;
        if (typeof message === 'object') emitMessage = new IPCMessage(this, message, res);
        else emitMessage = message;
        this.emit('bridgeRequest', emitMessage, this);
    }

    /**
     * Request some Shard and Important Data from the Bridge.
     * @param options
     * @returns The ShardList, TotalShards and other Data requested from the Bridge
     */
    public async requestShardData(options: { maxClusters?: number, timeout?: number } = {}) {
        const message = { _type: messageType.SHARDLIST_DATA_REQUEST, maxClusters: options.maxClusters };
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
     * @param manager the Shard/Cluster Manager, which should be listened on.
     */
    public listen(manager: ClusterManager) {
        if (!manager) throw new Error(`A Cluster/Shard Manager has not been provided`);
        this.manager = manager;

        this.manager.netipc = this;
        return this.manager;
    }

    /**
     * Evaluates a script or function on all clusters, or a given cluster, in the context of the {@link Client}s.
     * @param script JavaScript to run on each cluster
     * @param options Options provided for the ClusterClient broadcastEval Function
     * @returns Results of the script execution
     * @example
     * client.crosshost.broadcastEval('this.guilds.cache.size')
     *   .then(results => console.log(`${results.reduce((prev, val) => prev + val, 0)} total guilds`))
     *   .catch(console.error);
     * @see {@link Server#broadcastEval}
     */
    public async broadcastEval(script: string, options: evalOptions & { script?: string } = {}) {
        if (options.script) script = options.script;
        if (!script || (typeof script !== 'string' && typeof script !== 'function'))
            throw new Error('Script for BroadcastEvaling has not been provided or must be a valid String!');
        script = typeof script === 'function' ? `(${script})(this, ${JSON.stringify(options.context)})` : script;

        const message = { script, options, _type: messageType.CLIENT_BROADCAST_REQUEST };
        return super.request(message, message.options.timeout);
    }

    /**
     * Sends a Message to the Bridge
     * @param message Message, which should be sent to Bridge
     * @param options
     * @returns Message
     * @example
     * client.send({content: 'hello'})
     *   .then(result => console.log(result)) // hi
     *   .catch(console.error);
     * @see {@link IPCMessage#reply}
     */
    public override async send(message: RawMessage, options: CrossHostMessage = {}) {
        if (!message) throw new Error('Request has not been provided!');
        if (typeof message === 'string' && !options.internal) message = JSON.parse(message);
        if (typeof message !== 'object' && !options.internal) throw new TypeError('The Request has to be an object');
        if (!message.options) message.options = options;
        if (!options.internal) {
            message = new BaseMessage(message).toJSON();
        }
        // Message sent by ClusterClient, which should not be resolved to avoid memory leaks
        if (options.resolve === false) {
            super.send(JSON.stringify(message));
            return Promise.resolve();
        }
        return super.send(JSON.stringify(message));
    }

    /**
     * Sends a Request to the Bridge and returns the reply
     * @param message Message, which should be sent as request
     * @param options
     * @returns Reply of the Message
     * @example
     * client.request({content: 'hello'}, {timeout: 1000})
     *   .then(result => console.log(result)) // hi
     *   .catch(console.error);
     * @see {@link IPCMessage#reply}
     */
    // @ts-expect-error
    public override async request(message: RawMessage, options: CrossHostMessage = {}) {
        if (!message) throw new Error('Request has not been provided!');
        if (typeof message === 'string' && !options.internal) message = JSON.parse(message);
        if (typeof message !== 'object' && !options.internal) throw new TypeError('The Request has to be an object');
        // console.log(message)
        if (!message.options) message.options = options;
        if (!options.internal) {
            message = new BaseMessage(message).toJSON();
        }
        return super.request(JSON.stringify(message), message.options.timeout as number).catch(e => console.log(e));
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
        if (!message.guildId) throw new Error('GuildID has not been provided!');
        if (!message.eval) message._type = messageType.GUILD_DATA_REQUEST;
        else message._type = messageType.GUILD_EVAL_REQUEST;
        if (!message.options) message.options = options || {};
        return super.request(message, message.options.timeout);
    }

    /**
     * Sends a Request to the Client and returns the reply
     * @param message Message, which should be sent as request and handled by the User
     * @param options
     * @returns Reply of the Message
     * @example
     * client.requestToClient({content: 'hello', agent: 'dashboard', clientId: 'CLient_id_provided_by_machine'})
     *   .then(result => console.log(result)) // hi
     *   .catch(console.error);
     */
    public async requestToClient(message: RawMessage & { clientId: string }, options?: evalOptions) {
        if (!message.agent && !message.clientId) throw new Error('Agent has not been provided!');
        message._type = messageType.CLIENT_DATA_REQUEST;
        if (!message.options) message.options = options || {};
        return super.request(message, message.options.timeout);
    }

    /**
     * Executes a rolling Restart, which has been executed by the Bridge
     * @private
     */
    private rollingRestart() {
        if (!this.manager) throw new Error("No Manager was found")
        this._debug(`[RollingRestart] ShardClusterList: ${JSON.stringify(this.manager.shardClusterList)}`);

        if (!this.rollingRestarts) return;

        // Recluster Plugin enabled on hybrid-sharding
        if (this.manager.recluster) {
            this.manager.recluster.start({
                restartMode: 'rolling',
            });
        }
    }

    /**
     * Logs the Debug Messages
     * <warn>Using this method just emits the Debug Event.</warn>
     * <info>This is usually not necessary to manually specify.</info>
     */
    private _debug(message: string, options: { bridge?: Boolean } = {}) {
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

// @ts-expect-error
export interface Client extends NetIPCClient {
    on<T extends keyof ClientEvents>(event: T, listener: (...args: ClientEvents[T]) => any): this;
}
