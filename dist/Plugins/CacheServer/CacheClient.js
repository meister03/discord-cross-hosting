"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheClient = void 0;
const RemoteClientCache_1 = require("./RemoteClientCache");
class CacheClient {
    constructor(client, options) {
        this.client = client;
        this.path = options.path || [];
        this.cache = this._buildCachePaths(this.path);
    }
    _buildCachePaths(path) {
        var _a;
        const cache = {};
        for (let i = 0; i < path.length; i++) {
            const key = (_a = path[i]) === null || _a === void 0 ? void 0 : _a.path;
            cache[key] = new RemoteClientCache_1.RemoteClientCache(this.client, path[i]);
        }
        return cache;
    }
}
exports.CacheClient = CacheClient;
