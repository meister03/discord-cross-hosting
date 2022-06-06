const { messageType } = require('../../Utils/Constants.js');
class Collection {
    constructor(client, options) {
        this.options = options;
        this.client = client;
    }

    async set(key, value) {
        return await this.client.request(
            {
                type: messageType.SERVER_CACHE_SET_REQUEST,
                path: this.options.path,
                data: {
                    key,
                    value,
                },
            },
            { internal: true },
        );
    }

    async get(key) {
        return await this.client.request(
            {
                type: messageType.SERVER_CACHE_GET_REQUEST,
                path: this.options.path,
                data: {
                    key,
                },
            },
            { internal: true },
        );
    }

    async delete(key) {
        return await this.client.request(
            {
                type: messageType.SERVER_CACHE_DELETE_REQUEST,
                path: this.options.path,
                data: {
                    key,
                },
            },
            { internal: true },
        );
    }

    async clear() {
        return await this.client.request(
            {
                type: messageType.SERVER_CACHE_CLEAR_REQUEST,
                path: this.options.path,
            },
            { internal: true },
        );
    }
}
module.exports = Collection;
