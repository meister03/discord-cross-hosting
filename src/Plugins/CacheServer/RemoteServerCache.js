const { Collection } = require('discordeno');
class CacheCollection extends Collection {
    constructor(server, options) {
        super(null, options);
        this.server = server;
        this.path = options.path || [];
    }
}
module.exports = CacheCollection;
