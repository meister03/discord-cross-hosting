import type { Client } from '../Manager/Client';
import type { BridgeClient } from '../Manager/Bridge';
export interface RawMessage {
    nonce?: string;
    _type?: number;
    [x: string]: any;
}
export declare class BaseMessage {
    [x: string]: any;
    nonce: string;
    private _raw;
    constructor(message: RawMessage);
    private destructMessage;
    toJSON(): RawMessage;
}
export declare class IPCMessage extends BaseMessage {
    raw: RawMessage;
    instance: BridgeClient | Client;
    res?(data: any): Promise<void>;
    constructor(instance: BridgeClient | Client, message: RawMessage, res?: (data: any) => Promise<void>);
    send(message: object): Promise<void>;
    request(message: object): Promise<any>;
    reply(message: object): Promise<void | undefined>;
}
//# sourceMappingURL=IPCMessage.d.ts.map