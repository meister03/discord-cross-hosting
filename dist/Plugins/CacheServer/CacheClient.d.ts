import { Client } from "../../Manager/Client";
import { RemoteClientCache } from './RemoteClientCache';
export declare class CacheClient {
    client: Client;
    path: {
        path: string;
        maxSize: number;
    }[];
    cache: ReturnType<CacheClient['_buildCachePaths']>;
    constructor(client: Client, options: {
        path: Array<{
            path: string;
            maxSize: number;
        }>;
    });
    _buildCachePaths(path: Array<{
        path: string;
        maxSize: number;
    }>): {
        [x: string]: RemoteClientCache;
    };
}
//# sourceMappingURL=CacheClient.d.ts.map