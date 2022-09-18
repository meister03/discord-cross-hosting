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
exports.Shard = void 0;
const IPCMessage_1 = require("../Structures/IPCMessage");
const shared_1 = require("../types/shared");
class Shard {
    constructor(shard) {
        this.shard = shard;
    }
    broadcastEval(script, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!script || (typeof script !== 'string' && typeof script !== 'function'))
                throw new Error('Script for BroadcastEvaling must be a valid String or Function!');
            options.script =
                typeof script === 'function' ? `(${script})(this, ${JSON.stringify(options.context)})` : script;
            return this.shard.evalOnManager(`this.netipc.broadcastEval('', ${JSON.stringify(options)})`).catch(console.log);
        });
    }
    send(message, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!message)
                throw new Error('Request has not been provided!');
            if (typeof message !== 'object')
                throw new TypeError('The Request has to be an object');
            if (!options)
                options = {};
            message.options = options;
            message = new IPCMessage_1.BaseMessage(message).toJSON();
            return this.shard.evalOnManager(`this.netipc.send('${JSON.stringify(message)}', {resolve: false})`);
        });
    }
    request(message, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!message)
                throw new Error('Request has not been provided!');
            if (typeof message !== 'object' && !options.internal)
                throw new TypeError('The Request has to be an object');
            if (!message.options)
                message.options = options;
            if (!options.internal) {
                message = new IPCMessage_1.BaseMessage(message).toJSON();
            }
            return this.shard.evalOnManager(`this.netipc.request('${JSON.stringify(message)}')`);
        });
    }
    requestToGuild(message, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!message.guildId)
                throw new Error('GuildID has not been provided!');
            if (!message.eval)
                message._type = shared_1.messageType.GUILD_DATA_REQUEST;
            else
                message._type = shared_1.messageType.GUILD_EVAL_REQUEST;
            if (!message.options)
                message.options = options;
            return this.request(message, { internal: true });
        });
    }
    requestToClient(message, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!message.agent && !message.clientId)
                throw new Error('Agent has not been provided!');
            message._type = shared_1.messageType.CLIENT_DATA_REQUEST;
            if (!message.options)
                message.options = options;
            return this.request(message, { internal: true });
        });
    }
}
exports.Shard = Shard;
