import { Serializable } from "child_process";
import { Client } from "../../Manager/Client";
import { messageType } from "../../types/shared";

export class RemoteClientCache {
    options: { path: string; maxSize: number; };
    client: Client;
    constructor(client: Client, options: { path: string, maxSize: number }) {
        this.options = options;
        this.client = client;
    }

    async set(key: string, value: Serializable) {
        return await this.client.request(
            {
                _type: messageType.SERVER_CACHE_SET_REQUEST,
                path: this.options.path,
                data: {
                    key,
                    value,
                },
            },
            { internal: true },
        );
    }

    async get(key: string) {
        return await this.client.request(
            {
                _type: messageType.SERVER_CACHE_GET_REQUEST,
                path: this.options.path,
                data: {
                    key,
                },
            },
            { internal: true },
        );
    }

    async delete(key: string) {
        return await this.client.request(
            {
                _type: messageType.SERVER_CACHE_DELETE_REQUEST,
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
                _type: messageType.SERVER_CACHE_CLEAR_REQUEST,
                path: this.options.path,
            },
            { internal: true },
        );
    }
}
