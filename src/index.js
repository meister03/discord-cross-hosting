module.exports = {
    Bridge: require('./Managers/Server.js'),
    Client: require('./Managers/Client.js'),
    Shard: require('./Managers/Shard.js'),
    IPCMessage: require('./Structures/IPCMessage.js').IPCMessage,
    BaseMessage: require('./Structures/IPCMessage.js').BaseMessage,
    Constants: require('./Utils/Constants.js'),
    CacheServer: require('./Plugins/CacheServer/CacheServer.js'),
    CacheClient: require('./Plugins/CacheServer/CacheClient.js'),
};
