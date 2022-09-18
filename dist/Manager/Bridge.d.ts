import { Connection, Server, ServerOptions } from 'net-ipc';
import { RawMessage } from '../Structures/IPCMessage';
import { evalOptions } from 'discord-hybrid-sharding';
import { BridgeEvents, BroadcastEvalOptions } from '../types/shared';
export interface BridgeOptions extends ServerOptions {
    authToken: string;
    standAlone?: Boolean;
    shardsPerCluster?: number;
    totalShards?: number | 'auto';
    totalMachines: number;
    token?: string;
    shardList?: number[];
}
export interface BridgeClient extends Connection {
    shardList: number[];
    agent: string;
    authToken: string;
}
export declare class Bridge extends Server {
    authToken: string;
    standAlone: Boolean;
    shardsPerCluster: number;
    totalShards: number;
    totalMachines: number;
    token?: string;
    shardList: number[];
    shardClusterList: number[][];
    shardClusterListQueue: number[][];
    clients: Map<string, BridgeClient>;
    constructor(options: BridgeOptions);
    private _handleReady;
    private _handleError;
    private _handleConnect;
    private _handleDisconnect;
    private _handleMessage;
    private _handleRequest;
    initializeShardData(): Promise<number[][]>;
    parseClusterList(ClusterList: number[][]): any[][];
    broadcastEval(script: string, options: BroadcastEvalOptions): Promise<any[]>;
    requestToGuild(message: RawMessage & {
        guildId: string;
    }, options?: evalOptions): Promise<any>;
    private _debug;
}
export interface Bridge extends Server {
    on<T extends keyof BridgeEvents>(event: T, listener: (...args: BridgeEvents[T]) => any): this;
}
//# sourceMappingURL=Bridge.d.ts.map