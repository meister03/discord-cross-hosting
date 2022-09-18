import { Client } from "../../Manager/Client";

import { RemoteClientCache } from './RemoteClientCache';
export class CacheClient {
    client: Client;
    path: { path: string; maxSize: number; }[];
    cache: ReturnType<CacheClient['_buildCachePaths']>;
    constructor(client: Client, options: { path: Array<{ path: string, maxSize: number }> }) {
        this.client = client;
        this.path = options.path || [];
        this.cache = this._buildCachePaths(this.path);
    }
    _buildCachePaths(path: Array<{ path: string, maxSize: number }>) {
        const cache: {[x: string]: RemoteClientCache} = {};
        for (let i = 0; i < path.length; i++) {
            /*
             * path.path
             * path.maxSize
             * path.forceSetFilter
             * path.properties
             * path.serializeStrategy
             */
            const key = path[i]?.path as string;
            cache[key] = new RemoteClientCache(this.client, path[i]!);
        }
        return cache;
    }
}