import { ClusterClient, evalOptions } from 'discord-hybrid-sharding';
import { RawMessage } from '../Structures/IPCMessage';
import { CrossHostMessage } from '../types/shared';
export declare class Shard {
    shard: ClusterClient;
    constructor(shard: ClusterClient);
    broadcastEval(script: string, options?: evalOptions & {
        script?: string;
    }): Promise<void | any[]>;
    send(message: RawMessage, options?: CrossHostMessage): Promise<any[]>;
    request(message: RawMessage, options?: CrossHostMessage): Promise<any[]>;
    requestToGuild(message: RawMessage & {
        guildId: string;
    }, options?: evalOptions): Promise<any[]>;
    requestToClient(message: RawMessage & {
        clientId: string;
    }, options?: evalOptions): Promise<any[]>;
}
//# sourceMappingURL=Shard.d.ts.map