// @ts-check
import { RemoteServerCache }from './RemoteServerCache';
import { messageType } from '../../types/shared';
import { Bridge } from '../../Manager/Server';
import { RawMessage } from 'discord-hybrid-sharding';
import { Connection } from 'net-ipc';
export class CacheServer {
    server: Bridge;
    path: { path: string; maxSize: number; }[];
    cache: ReturnType<CacheServer['_buildCachePaths']>;
    constructor(server: Bridge, options: { path: Array<{ path: string, maxSize: number }> }) {
        this.server = server;
        this.path = options.path || [];
        this.cache = this._buildCachePaths(this.path);

        this._overwriteHandlers();
    }
    _overwriteHandlers() {
        // @ts-expect-error
        const { _handleRequest } = this.server;
        //Remove all request listerns
        this.server.off('request', _handleRequest);
        this.server.on('request', (message: RawMessage, res, client) => {
            if (typeof message === 'string') message = JSON.parse(message);
            if (message?._type === undefined) return;
            if (!this.server.clients.has(client.id)) return;
            if (message._type === messageType.SERVER_CACHE_SET_REQUEST) {
                return this._handleCacheSet(message, res);
            }
            if (message._type === messageType.SERVER_CACHE_GET_REQUEST) {
                return this._handleCacheGet(message, res);
            }
            if (message._type === messageType.SERVER_CACHE_DELETE_REQUEST) {
                return this._handleCacheDelete(message, res);
            }
            if (message._type === messageType.SERVER_CACHE_CLEAR_REQUEST) {
                return this._handleCacheClear(message, res);
            }
            return _handleRequest(message, res, client as Connection);
        });
    }

    _handleCacheSet(message: RawMessage, res: (data: any) => Promise<void>) {
        if (!message.path) return res({ _error: 'missing cache path' });
        if (!message.data) return res({ _error: 'missing cache meta data' });
        if (!this.cache[message.path]) return res({ _error: 'cache path does not exist' });
        this.cache[message.path]?.set(message.data.key, message.data.value);
        res({ success: true });
    }

    _handleCacheGet(message: RawMessage, res: (data: any) => Promise<void>) {
        if (!message.path) return res({ _error: 'missing cache path' });
        if (!this.cache[message.path]) return res({ _error: 'cache path does not exist' });
        const value = this.cache[message.path]?.get(message.data.key);
        if (value === undefined) return res({ _error: 'cache key does not exist' });
        res(value);
    }

    _handleCacheDelete(message: RawMessage, res: (data: any) => Promise<void>) {
        if (!message.path) return res({ _error: 'missing cache path' });
        if (!this.cache[message.path]) return res({ _error: 'cache path does not exist' });
        this.cache[message.path]?.delete(message.key);
        res({ success: true });
    }

    _handleCacheClear(message: RawMessage, res: (data: any) => Promise<void>) {
        if (!message.path) return res({ _error: 'missing cache path' });
        if (!this.cache[message.path]) return res({ _error: 'cache path does not exist' });
        this.cache[message.path]?.clear();
        res({ success: true });
    }

    _buildCachePaths(path: { path: string, maxSize: number }[]) {
        const cache: {[x: string]: RemoteServerCache} = {};
        for (let i = 0; i < path.length; i++) {
            /*
             * path.path
             * path.maxSize
             * path.forceSetFilter
             * path.properties
             * path.serializeStrategy
             */
            if(!path[i]) continue;
            const key = path[i]?.path as string;
            if(path[i]) cache[key] = new RemoteServerCache(this, path[i]!);
        }

        // @ts-expect-error
        this.server._debug(`[CM => CacheServer] CacheServer created with ${Object.keys(cache).length} cache paths`);
        return cache;
    }
}

