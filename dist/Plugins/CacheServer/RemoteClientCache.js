"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteClientCache = void 0;
const shared_1 = require("../../types/shared");
class RemoteClientCache {
    constructor(client, options) {
        this.options = options;
        this.client = client;
    }
    set(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.client.request({
                _type: shared_1.messageType.SERVER_CACHE_SET_REQUEST,
                path: this.options.path,
                data: {
                    key,
                    value,
                },
            }, { internal: true });
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.client.request({
                _type: shared_1.messageType.SERVER_CACHE_GET_REQUEST,
                path: this.options.path,
                data: {
                    key,
                },
            }, { internal: true });
        });
    }
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.client.request({
                _type: shared_1.messageType.SERVER_CACHE_DELETE_REQUEST,
                path: this.options.path,
                data: {
                    key,
                },
            }, { internal: true });
        });
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.client.request({
                _type: shared_1.messageType.SERVER_CACHE_CLEAR_REQUEST,
                path: this.options.path,
            }, { internal: true });
        });
    }
}
exports.RemoteClientCache = RemoteClientCache;
