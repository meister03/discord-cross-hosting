const RemoteClientCache = require('./RemoteClientCache');
class CacheClient {
    constructor(client, options) {
        this.client = client;
        this.path = options.path || [];
        this.cache = this._buildCachePaths(this.path);
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
            cache[key] = new RemoteClientCache(this.client, path[i]);
        }
        return cache;
    }
}
module.exports = CacheClient;
