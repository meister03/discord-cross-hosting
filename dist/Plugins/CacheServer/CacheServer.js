"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheServer = void 0;
const RemoteServerCache_1 = require("./RemoteServerCache");
const shared_1 = require("../../types/shared");
class CacheServer {
    constructor(server, options) {
        this.server = server;
        this.path = options.path || [];
        this.cache = this._buildCachePaths(this.path);
        this._overwriteHandlers();
    }
    _overwriteHandlers() {
        const { _handleRequest } = this.server;
        this.server.off('request', _handleRequest);
        this.server.on('request', (message, res, client) => {
            if (typeof message === 'string')
                message = JSON.parse(message);
            if ((message === null || message === void 0 ? void 0 : message._type) === undefined)
                return;
            if (!this.server.clients.has(client.id))
                return;
            if (message._type === shared_1.messageType.SERVER_CACHE_SET_REQUEST) {
                return this._handleCacheSet(message, res);
            }
            if (message._type === shared_1.messageType.SERVER_CACHE_GET_REQUEST) {
                return this._handleCacheGet(message, res);
            }
            if (message._type === shared_1.messageType.SERVER_CACHE_DELETE_REQUEST) {
                return this._handleCacheDelete(message, res);
            }
            if (message._type === shared_1.messageType.SERVER_CACHE_CLEAR_REQUEST) {
                return this._handleCacheClear(message, res);
            }
            return _handleRequest(message, res, client);
        });
    }
    _handleCacheSet(message, res) {
        var _a;
        if (!message.path)
            return res({ _error: 'missing cache path' });
        if (!message.data)
            return res({ _error: 'missing cache meta data' });
        if (!this.cache[message.path])
            return res({ _error: 'cache path does not exist' });
        (_a = this.cache[message.path]) === null || _a === void 0 ? void 0 : _a.set(message.data.key, message.data.value);
        res({ success: true });
    }
    _handleCacheGet(message, res) {
        var _a;
        if (!message.path)
            return res({ _error: 'missing cache path' });
        if (!this.cache[message.path])
            return res({ _error: 'cache path does not exist' });
        const value = (_a = this.cache[message.path]) === null || _a === void 0 ? void 0 : _a.get(message.data.key);
        if (value === undefined)
            return res({ _error: 'cache key does not exist' });
        res(value);
    }
    _handleCacheDelete(message, res) {
        var _a;
        if (!message.path)
            return res({ _error: 'missing cache path' });
        if (!this.cache[message.path])
            return res({ _error: 'cache path does not exist' });
        (_a = this.cache[message.path]) === null || _a === void 0 ? void 0 : _a.delete(message.key);
        res({ success: true });
    }
    _handleCacheClear(message, res) {
        var _a;
        if (!message.path)
            return res({ _error: 'missing cache path' });
        if (!this.cache[message.path])
            return res({ _error: 'cache path does not exist' });
        (_a = this.cache[message.path]) === null || _a === void 0 ? void 0 : _a.clear();
        res({ success: true });
    }
    _buildCachePaths(path) {
        var _a;
        const cache = {};
        for (let i = 0; i < path.length; i++) {
            if (!path[i])
                continue;
            const key = (_a = path[i]) === null || _a === void 0 ? void 0 : _a.path;
            if (path[i])
                cache[key] = new RemoteServerCache_1.RemoteServerCache(this, path[i]);
        }
        this.server._debug(`[CM => CacheServer] CacheServer created with ${Object.keys(cache).length} cache paths`);
        return cache;
    }
}
exports.CacheServer = CacheServer;
