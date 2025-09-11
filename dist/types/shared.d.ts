import { evalOptions } from 'discord-hybrid-sharding';
import { ClientReadyEvent, Connection } from 'net-ipc';
import { IPCMessage } from '../Structures/IPCMessage';
export interface BroadcastEvalOptions extends evalOptions {
    filter?(client: {
        agent: string;
    }): Boolean;
}
export declare enum messageType {
    'CUSTOM_REQUEST' = 0,
    'CUSTOM_MESSAGE' = 1,
    'CUSTOM_REPLY' = 2,
    'HEARTBEAT' = 3,
    'HEARTBEAT_ACK' = 4,
    'CLIENT_BROADCAST_REQUEST' = 5,
    'CLIENT_BROADCAST_RESPONSE' = 6,
    'SHARDLIST_DATA_REQUEST' = 21,
    'SHARDLIST_DATA_UPDATE' = 22,
    'CLIENT_SHARDLIST_DATA_CURRENT' = 23,
    'SERVER_BROADCAST_REQUEST' = 24,
    'SERVER_BROADCAST_RESPONSE' = 25,
    'GUILD_DATA_REQUEST' = 26,
    'GUILD_DATA_RESPONSE' = 27,
    'GUILD_EVAL_REQUEST' = 28,
    'GUILD_EVAL_RESPONSE' = 29,
    'CLIENT_DATA_REQUEST' = 30,
    'CLIENT_DATA_RESPONSE' = 31,
    'SERVER_CACHE_SET_REQUEST' = 32,
    'SERVER_CACHE_SET_RESPONSE' = 33,
    'SERVER_CACHE_GET_REQUEST' = 34,
    'SERVER_CACHE_GET_RESPONSE' = 35,
    'SERVER_CACHE_DELETE_REQUEST' = 36,
    'SERVER_CACHE_DELETE_RESPONSE' = 37,
    'SERVER_CACHE_CLEAR_REQUEST' = 38,
    'SERVER_CACHE_CLEAR_RESPONSE' = 39
}
export interface CrossHostMessage {
    nonce?: string;
    _type?: number;
    timeout?: number;
    resolve?: Boolean;
    internal?: Boolean;
    [x: string]: any;
}
export interface BridgeEvents {
    debug: [message: string];
    ready: [address: string];
    connect: [client: BridgeConnection, initialData?: any];
    disconnect: [client: BridgeConnection, reason?: any];
    clientMessage: [message: IPCMessage, client: BridgeConnection];
    clientRequest: [message: IPCMessage, client: BridgeConnection];
    error: [error: any];
    message: [message: any, client: Connection];
    request: [request: any, res: (d: any) => Promise<void>, client: Connection];
}
export interface ClientEvents {
    ready: [data: ClientReadyEvent];
    error: [error: any];
    bridgeMessage: [message: IPCMessage, client: BridgeConnection];
    bridgeRequest: [message: IPCMessage, client: BridgeConnection | this];
    debug: [message: string];
    request: [request: any, res: (d: any) => Promise<void>];
}
export interface BridgeConnection extends Connection {
    agent: string;
    authToken: string;
}
//# sourceMappingURL=shared.d.ts.map