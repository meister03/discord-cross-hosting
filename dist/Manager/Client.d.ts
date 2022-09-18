import { ClusterManager, evalOptions } from 'discord-hybrid-sharding';
import { ClientEvents } from 'discord.js';
import { Client as NetIPCClient, ClientOptions as NetIPCClientOptions } from 'net-ipc';
import { RawMessage } from '../Structures/IPCMessage';
import { CrossHostMessage } from '../types/shared';
export interface ClientOptions extends NetIPCClientOptions {
    authToken: string;
    agent: string;
    rollingRestarts?: boolean;
    shardList?: number[];
    totalShards?: number;
}
export declare class Client extends NetIPCClient {
    authToken: string;
    agent: string;
    rollingRestarts: boolean;
    shardList: number[];
    totalShards: number;
    manager?: ClusterManager & {
        netipc?: Client;
    };
    clusterList: never[];
    constructor(options: ClientOptions);
    connect(args?: object): Promise<this>;
    private _handleReady;
    private _handleMessage;
    private _handleRequest;
    requestShardData(options?: {
        maxClusters?: number;
        timeout?: number;
    }): Promise<any>;
    listen(manager: ClusterManager): ClusterManager & {
        netipc?: Client | undefined;
    };
    broadcastEval(script: string, options?: evalOptions & {
        script?: string;
    }): Promise<any>;
    send(message: RawMessage, options?: CrossHostMessage): Promise<void>;
    request(message: RawMessage, options?: CrossHostMessage): Promise<any>;
    requestToGuild(message: RawMessage & {
        guildId: string;
    }, options?: evalOptions): Promise<any>;
    requestToClient(message: RawMessage & {
        clientId: string;
    }, options?: evalOptions): Promise<any>;
    private rollingRestart;
    private _debug;
}
export interface Client extends NetIPCClient {
    on<T extends keyof ClientEvents>(event: T, listener: (...args: ClientEvents[T]) => any): this;
}
//# sourceMappingURL=Client.d.ts.map