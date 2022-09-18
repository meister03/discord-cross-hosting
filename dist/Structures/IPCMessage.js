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
exports.IPCMessage = exports.BaseMessage = void 0;
const discord_hybrid_sharding_1 = require("discord-hybrid-sharding");
class BaseMessage {
    constructor(message) {
        this.nonce = message.nonce || (0, discord_hybrid_sharding_1.generateNonce)();
        message.nonce = this.nonce;
        this._raw = this.destructMessage(message);
    }
    destructMessage(message) {
        for (let [key, value] of Object.entries(message)) {
            this[key] = value;
        }
        if (message.nonce)
            this.nonce = message.nonce;
        this._type = message._type || discord_hybrid_sharding_1.messageType.CUSTOM_MESSAGE;
        return message;
    }
    toJSON() {
        return this._raw;
    }
}
exports.BaseMessage = BaseMessage;
class IPCMessage extends BaseMessage {
    constructor(instance, message, res) {
        super(message);
        this.instance = instance;
        this.raw = new BaseMessage(message).toJSON();
        this.res = res;
    }
    send(message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof message !== 'object')
                throw new TypeError('The Message has to be a object');
            const baseMessage = new BaseMessage(Object.assign(Object.assign({}, message), { _type: discord_hybrid_sharding_1.messageType.CUSTOM_MESSAGE }));
            return this.instance.send(baseMessage.toJSON());
        });
    }
    request(message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof message !== 'object')
                throw new TypeError('The Message has to be a object');
            const baseMessage = new BaseMessage(Object.assign(Object.assign({}, message), { _type: discord_hybrid_sharding_1.messageType.CUSTOM_REQUEST, nonce: this.nonce }));
            return this.instance.request(baseMessage.toJSON());
        });
    }
    reply(message) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof message !== 'object')
                throw new TypeError('The Message has to be a object');
            const baseMessage = new BaseMessage(Object.assign(Object.assign({}, message), { _type: discord_hybrid_sharding_1.messageType.CUSTOM_REPLY, nonce: this.nonce, _result: message }));
            return (_a = this.res) === null || _a === void 0 ? void 0 : _a.call(this, baseMessage.toJSON());
        });
    }
}
exports.IPCMessage = IPCMessage;
