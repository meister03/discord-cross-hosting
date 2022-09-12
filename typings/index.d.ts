
declare module 'discord-cross-hosting' {
    import { Collection } from "discordeno";
    import { EventEmitter } from 'events';
    import { TlsOptions, ConnectionOptions } from 'tls';
    import { ServerOpts, ConnectOpts } from 'net';
    import {
        Server,
        Connection,
        Client as BridgeClient,
        ClientReadyEvent,
        ServerOptions as NetIPCServerOptions,
        ClientOptions as NetIPCClientOptions,
    } from 'net-ipc';

    // Bridge

    type BridgeOptions = {
        authToken: string;
        shardsPerCluster?: number;
        totalShards?: number | 'auto';
        totalMachines: number;
        token: string;
        shardList?: number[];
        port: number;
        path?: string;
        tls?: boolean;
        options?: TlsOptions | ServerOpts;
    };
    interface BridgeEvent {
        debug: [message: string];
        ready: [address: string];
        connect: [client: BridgeConnection, initialData?: any];
        disconnect: [client: BridgeConnection, reason?: any];
        clientMessage: [message: IPCMessage, client: BridgeConnection];
        clientRequest: [message: IPCMessage, client: BridgeConnection];
    }
    class BridgeConnection extends Connection {
        public agent: string;
        public authToken: string;
    }
    export class Bridge extends Server {
        /**
         *
         * @param options.authToken A User chosen Token for basic Authorization, when `tls` is disabled
         * @param options.shardsPerCluster The total amount of Shards per Cluster/Process (default - `1`)
         * @param options.totalShards The amount of Total Shards in all Machines (default - `auto`)
         * @param options.totalMachines The amount of Total Machines in order to chunk the ShardList
         * @param options.token The Discord Bot Token in order to fetch the recommended ShardCount
         * @param options.shardList A array of ShardIds to host on the connected Machines (default - `[]`)
         * @param options.port The port of the bridge listen to
         * @param options.path The path of the bridge listen to (default - `/net-ipc`)
         * @param options.tls Whether to use TLS (default - `false`)
         * @param options.options The options of net-ipc
         *
         */
         clients: Map<string,BridgeClient & {shardList?: number[][]}>;
         totalShards: number | "auto";
        constructor(options: BridgeOptions);

        public on<T extends keyof BridgeEvent>(event: T, listener: (...args: BridgeEvent[T]) => any): this;

        /**
         * Starts the Bridge.
         */
        public start(): Promise<this>;

        /**
         * Evaluates a script or function on all clusters, or a given cluster, in the context of the {@link Client}s.
         * @param script JavaScript to run on each cluster
         * @param options Options provided for the ClusterClient broadcastEval Function
         * @example
         * client.crosshost.broadcastEval('this.guilds.cache.size')
         *   .then(results => console.log(`${results.reduce((prev, val) => prev + val, 0)} total guilds`))
         *   .catch(console.error);
         */
        public broadcastEval(
            script: string | Function,
            options?: {
                context?: any;
                timeout?: number;
                filter?: (client: BridgeConnection) => boolean;
            },
        ): Promise<any[]>;

        /**
         * Sends a Request to the Guild and returns the reply
         * @param message.guildId The guild id of the request
         * @example
         * client.crosshost.request({content: 'hello', guildId: '123456789012345678'})
         *   .then(result => console.log(result)) // hi
         *   .catch(console.error);
         */
        public requestToGuild(message: { guildId: string; [key: string]: any }): Promise<any>;

        public parseClusterList(clusterList: number[]): number[];
    }

    // Client

    type ClientOptions = {
        authToken: string;
        agent: string;
        rollingRestarts?: boolean;
        port: number;
        host: string;
        handshake?: boolean;
        retries?: number;
        tls?: boolean;
        options?: ConnectOpts | ConnectionOptions;
    };
    interface ClientEvent {
        ready: [data: ClientReadyEvent];
        error: [error: any];
        bridgeMessage: [message: IPCMessage, client: BridgeConnection];
        bridgeRequest: [message: IPCMessage, client: BridgeConnection | this];
        debug: [message: string];
    }
    export class Client extends BridgeClient {
        /**
         *
         * @param options.authToken A User chosen Token for basic Authorization, when `tls` is disabled
         * @param options.agent The service name in order to identify the Clients
         * @param options.rollingRestarts Whether the cluster should be restarted (default - `true`)
         * @param options.port The port of the bridge listen to
         * @param options.path The path of the bridge listen to (default - `/net-ipc`)
         * @param options.handshake Use it when you host with Replit (default - `false`)
         * @param options.retries Interval of connect retry
         * @param options.tls Whether to use TLS (default - `false`)
         * @param options.options The options of net-ipc
         *
         */
        constructor(options: ClientOptions);

        public on<T extends keyof ClientEvent>(event: T, listener: (...args: ClientEvent[T]) => any): this;

        /**
         * Connect your MachineClient to the Bridge with your Custom Data.
         * @param args - Custom Data, which can be sent to the Bridge when connecting.
         */
        public connect(args?: { [key: string]: any }): Promise<this>;

        /**
         * Request some Shard and Important Data from the Bridge.
         */
        public requestShardData(options?: { timeout?: number; maxClusters?: number }): Promise<{
            totalShards: number;
            shardList: number[][];
            clusterList: number[];
        }>;

        /**
         * Listens to NET-IPC messages such as BroadcastEval or Normal Messages
         * @param manager The Shard/Cluster Manager, which should be listened on
         */
        public listen<T extends EventEmitter>(manager: T): T;

        /**
         * Evaluates a script or function on all clusters, or a given cluster, in the context of the {@link Client}s.
         * @example
         * client.crosshost.broadcastEval('this.guilds.cache.size')
         *   .then(results => console.log(`${results.reduce((prev, val) => prev + val, 0)} total guilds`))
         *   .catch(console.error);
         */
        public broadcastEval(
            script: string | Function,
            options?: {
                context?: any;
                filter?: (client: BridgeConnection) => boolean;
                [key: string]: any;
            },
        ): Promise<any[]>;

        /**
         * Sends a Message to the Bridge
         * @example
         * client.send({content: 'hello'})
         *   .then(result => console.log(result))
         *   .catch(console.error);
         */
        public send<M extends string | { [key: string]: any }>(
            message: M,
            options?: { internal: M extends string ? true : boolean },
        ): Promise<any>;

        /**
         * Sends a Request to the Bridge and returns the reply
         * @example
         * client.request({content: 'hello'}, {timeout: 1000})
         *   .then(result => console.log(result)) // hi
         *   .catch(console.error);
         */
        // @ts-ignore
        override request<M extends string | { [key: string]: any }>(
            message: M,
            options?: {
                internal: M extends string ? true : boolean;
                timeout?: number;
            },
        ): Promise<any>;

        /**
         * Sends a Request to the Guild and returns the reply
         * @param message.guildId The guild id of the request
         * @example
         * client.crosshost.request({content: 'hello', guildId: '123456789012345678'})
         *   .then(result => console.log(result)) // hi
         *   .catch(console.error);
         */
        public requestToGuild(
            message: {
                guildId: string;
                [key: string]: any;
            },
            options?: { timeout?: number },
        ): Promise<any>;

        /**
         * Sends a Request to the Client and returns the reply
         * @example
         * client.requestToClient({content: 'hello', agent: 'dashboard', clientId: 'CLient_id_provided_by_machine'})
         *   .then(result => console.log(result)) // hi
         *   .catch(console.error);
         */
        public requestToClient(
            message:
                | { agent: string; clientId?: string; [key: string]: any }
                | { agent?: string; clientId: string; [key: string]: any },
            options?: { timeout?: number },
        );
    }

    // Shard

    export class Shard {
        constructor(shard: EventEmitter);

        /**
         * Evaluates a script or function on all machine, or a given shard, in the context of the {@link Client}s
         * @example
         * client.crosshost.broadcastEval('this.guilds.cache.size')
         *   .then(results => console.log(`${results.reduce((prev, val) => prev + val, 0)} total guilds`))
         *   .catch(console.error);
         */
        public broadcastEval(
            script: string | Function,
            options?: {
                context?: any;
                usev13?: boolean;
                filter?: (client: BridgeConnection) => boolean;
                [key: string]: any;
            },
        ): Promise<any>;

        /**
         * Sends a message to all connected Machines.
         */
        public send(message: { [key: string]: any }, options?: { [key: string]: any }): Promise<any>;

        /**
         * Sends a request to the Bridge
         * @example
         * client.crosshost.request({content: 'hello'})
         *   .then(result => console.log(result)) // hi
         *   .catch(console.error);
         */
        public request<M extends string | { [key: string]: any }>(
            message: M,
            options?: {
                internal: M extends string ? true : boolean;
            },
        ): Promise<any>;

        /**
         * Sends a Request to the Guild and returns the reply
         * @example
         * client.crosshost.requestToGuild({content: 'hello', guildId: '123456789012345678'})
         *   .then(result => console.log(result)) // hi
         *   .catch(console.error);
         */
        public requestToGuild(
            message: {
                guildId: string;
                [key: string]: any;
            },
            options?: { [key: string]: any },
        ): Promise<any>;

        /**
         * Sends a Request to the Client and returns the reply
         * @example
         * client.crosshost.requestToClient({content: 'hello', agent: 'dashboard', clientId: 'CLient_id_provided_by_machine'})
         *   .then(result => console.log(result)) // hi
         *   .catch(console.error);
         */
        public requestToClient(
            message:
                | { agent: string; clientId?: string; [key: string]: any }
                | { agent?: string; clientId: string; [key: string]: any },
            options?: { [key: string]: any },
        ): Promise<any>;
    }

    // Message

    class BaseMessage {
        /**
         * Marks the message as a custom message
         */
        public _sCustom: boolean;

        /**
         * Marks the message as a request
         */
        public _sRequest: boolean;

        /**
         * Creates a Message ID for identifying it for further usage such as on replies
         */
        public nonce: string;
    }
    export class IPCMessage extends BaseMessage {
        public raw: BaseMessage;

        /**
         * Sends a message to the cluster's process/worker or to the ParentCluster.
         */
        public send(message: { [key: string]: any }): Promise<any>;

        /**
         * Sends a Request to the cluster's process/worker or to the ParentCluster.
         */
        public request(message: { [key: string]: any }): Promise<any>;

        /**
         * Sends a Reply to Message from the cluster's process/worker or the ParentCluster.
         */
        public reply(message: { [key: string]: any }): Promise<any>;
    }


    export type CacheStorageOptions = {
        path: Array<{ path: string, maxSize: number }> 
    };
    
    export class CacheServer {
        [x: string]: RemoteServerCache;
        constructor(server: Bridge,storageOptions: CacheStorageOptions)
    }

    export class CacheClient {
        [x: string]: RemoteClientCache;
        constructor(client: Client,storageOptions: CacheStorageOptions)
    }

    export class RemoteServerCache extends Collection<any, any>{
        constructor(server: CacheServer, path: string[])
    }

    export class RemoteClientCache{
        constructor(client: CacheClient, path: string[])
        public set(key:any, value:any): Promise<{sucess: true}>
        public get(key: any): Promise<any> | Promise<{error: string}>
        public delete(key:any): Promise<{sucess: true}>
        public clear(): Promise<{sucess: true}>
    }
    
}
