// @ts-check
const RemoteServerCache = require('./RemoteServerCache');
const { messageType } = require('../../Utils/Constants.js');
class CacheServer {
    constructor(server, options) {
        this.server = server;
        this.path = options.path || [];
        this.cache = this._buildCachePaths(this.path);

        this._overwriteHandlers();
    }
    _overwriteHandlers() {
        const { _handleRequest } = this.server;
        //Remove all request listerns
        this.server.off('request', _handleRequest);
        this.server.on('request', (message, res, client) => {
            if (typeof message === 'string') message = JSON.parse(message);
            if (message?.type === undefined) return;
            if (!this.server.clients.has(client.id)) return;
            if (message.type === messageType.SERVER_CACHE_SET_REQUEST) {
                return this._handleCacheSet(message, res, client);
            }
            if (message.type === messageType.SERVER_CACHE_GET_REQUEST) {
                return this._handleCacheGet(message, res, client);
            }
            if (message.type === messageType.SERVER_CACHE_DELETE_REQUEST) {
                return this._handleCacheDelete(message, res, client);
            }
            if (message.type === messageType.SERVER_CACHE_CLEAR_REQUEST) {
                return this._handleCacheClear(message, res, client);
            }
            return _handleRequest(message, res, client);
        });
    }

    _handleCacheSet(message, res, client) {
        if (!message.path) return res({ _error: 'missing cache path' });
        if (!message.data) return res({ _error: 'missing cache meta data' });
        if (!this.cache[message.path]) return res({ _error: 'cache path does not exist' });
        this.cache[message.path].set(message.data.key, message.data.value);
        res({ success: true });
    }

    _handleCacheGet(message, res, client) {
        if (!message.path) return res({ _error: 'missing cache path' });
        if (!this.cache[message.path]) return res({ _error: 'cache path does not exist' });
        const value = this.cache[message.path].get(message.data.key);
        if (value === undefined) return res({ _error: 'cache key does not exist' });
        res(value);
    }

    _handleCacheDelete(message, res, client) {
        if (!message.path) return res({ _error: 'missing cache path' });
        if (!this.cache[message.path]) return res({ _error: 'cache path does not exist' });
        this.cache[message.path].delete(message.key);
        res({ success: true });
    }

    _handleCacheClear(message, res, client) {
        if (!message.path) return res({ _error: 'missing cache path' });
        if (!this.cache[message.path]) return res({ _error: 'cache path does not exist' });
        this.cache[message.path].clear();
        res({ success: true });
    }

    _buildCachePaths(path) {
        const cache = {};
        for (let i = 0; i < path.length; i++) {
            /*
             * path.path
             * path.maxSize
             * path.forceSetFilter
             * path.properties
             * path.serializeStrategy
             */
            const key = path[i].path;
            cache[key] = new RemoteServerCache(this.server, path[i]);
        }
        this.server._debug(`[CM => CacheServer] CacheServer created with ${Object.keys(cache).length} cache paths`);
        return cache;
    }
}
module.exports = CacheServer;
