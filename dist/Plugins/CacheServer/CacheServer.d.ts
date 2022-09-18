import { RemoteServerCache } from './RemoteServerCache';
import { Bridge } from '../../Manager/Bridge';
import { RawMessage } from 'discord-hybrid-sharding';
export declare class CacheServer {
    server: Bridge;
    path: {
        path: string;
        maxSize: number;
    }[];
    cache: ReturnType<CacheServer['_buildCachePaths']>;
    constructor(server: Bridge, options: {
        path: Array<{
            path: string;
            maxSize: number;
        }>;
    });
    _overwriteHandlers(): void;
    _handleCacheSet(message: RawMessage, res: (data: any) => Promise<void>): Promise<void> | undefined;
    _handleCacheGet(message: RawMessage, res: (data: any) => Promise<void>): Promise<void> | undefined;
    _handleCacheDelete(message: RawMessage, res: (data: any) => Promise<void>): Promise<void> | undefined;
    _handleCacheClear(message: RawMessage, res: (data: any) => Promise<void>): Promise<void> | undefined;
    _buildCachePaths(path: {
        path: string;
        maxSize: number;
    }[]): {
        [x: string]: RemoteServerCache;
    };
}
//# sourceMappingURL=CacheServer.d.ts.map