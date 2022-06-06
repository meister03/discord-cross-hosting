exports.messageType = createEnum([
    'CUSTOM_REQUEST',
    'CUSTOM_MESSAGE',
    'HEARTBEAT',
    'HEARTBEATACK',
    'SHARDLIST_DATA_REQUEST',
    'SHARDLIST_DATA_UPDATE',
    'CLIENT_SHARDLIST_DATA_CURRENT',
    'CLIENT_BROADCAST_REQUEST',
    'CLIENT_BROADCAST_RESPONSE',
    'SERVER_BROADCAST_REQUEST',
    'SERVER_BROADCAST_RESPONSE',
    'GUILD_DATA_REQUEST',
    'GUILD_DATA_RESPONSE',
    'GUILD_EVAL_REQUEST',
    'GUILD_EVAL_RESPONSE',
    'CLIENT_DATA_REQUEST',
    'CLIENT_DATA_RESPONSE',
    'SERVER_CACHE_SET_REQUEST',
    'SERVER_CACHE_SET_RESPONSE',
    'SERVER_CACHE_GET_REQUEST',
    'SERVER_CACHE_GET_RESPONSE',
    'SERVER_CACHE_DELETE_REQUEST',
    'SERVER_CACHE_DELETE_RESPONSE',
    'SERVER_CACHE_CLEAR_REQUEST',
    'SERVER_CACHE_CLEAR_RESPONSE',
]);
// Actually just move this thing to here instead of inside Util (from Discord V13)
exports.DefaultOptions = {
    http: {
        api: 'https://discord.com/api',
        version: '9',
    },
};

exports.Endpoints = {
    botGateway: '/gateway/bot',
};

function createEnum(keys) {
    const obj = {};
    for (const [index, key] of keys.entries()) {
        if (key === null) continue;
        obj[key] = index;
        obj[index] = key;
    }
    return obj;
}
