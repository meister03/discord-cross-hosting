import { Collection } from 'discordeno';
import { CacheServer } from './CacheServer';
export declare class RemoteServerCache extends Collection<string, any> {
    server: CacheServer;
    path: string;
    constructor(server: CacheServer, options: {
        path: string;
        maxSize: number;
    });
}
//# sourceMappingURL=RemoteServerCache.d.ts.map