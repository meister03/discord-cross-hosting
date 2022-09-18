/// <reference types="node" />
import { Serializable } from "child_process";
import { Client } from "../../Manager/Client";
export declare class RemoteClientCache {
    options: {
        path: string;
        maxSize: number;
    };
    client: Client;
    constructor(client: Client, options: {
        path: string;
        maxSize: number;
    });
    set(key: string, value: Serializable): Promise<any>;
    get(key: string): Promise<any>;
    delete(key: string): Promise<any>;
    clear(): Promise<any>;
}
//# sourceMappingURL=RemoteClientCache.d.ts.map