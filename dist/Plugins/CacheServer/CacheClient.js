"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var RemoteClientCache_1 = require("./RemoteClientCache");
var CacheClient = (function () {
    function CacheClient(client, options) {
        this.client = client;
        this.path = options.path || [];
        this.cache = this._buildCachePaths(this.path);
    }
    CacheClient.prototype._buildCachePaths = function (path) {
        var _a;
        var cache = {};
        for (var i = 0; i < path.length; i++) {
            var key = (_a = path[i]) === null || _a === void 0 ? void 0 : _a.path;
            cache[key] = new RemoteClientCache_1.RemoteClientCache(this.client, path[i]);
        }
        return cache;
    };
    return CacheClient;
}());
module.exports = CacheClient;
