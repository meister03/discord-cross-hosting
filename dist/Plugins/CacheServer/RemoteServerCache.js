"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteServerCache = void 0;
const discordeno_1 = require("discordeno");
class RemoteServerCache extends discordeno_1.Collection {
    constructor(server, options) {
        super(null, options);
        this.server = server;
        this.path = options.path;
    }
}
exports.RemoteServerCache = RemoteServerCache;
