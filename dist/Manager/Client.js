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
exports.Client = void 0;
const net_ipc_1 = require("net-ipc");
const IPCMessage_1 = require("../Structures/IPCMessage");
const shared_1 = require("../types/shared");
class Client extends net_ipc_1.Client {
    constructor(options) {
        var _a;
        super(options);
        if (!options)
            throw new Error('Client required options are missing');
        this.authToken = options === null || options === void 0 ? void 0 : options.authToken;
        if (!this.authToken)
            throw new Error('ClIENT_MISSING_OPTION - authToken must be provided - String');
        this.agent = options === null || options === void 0 ? void 0 : options.agent;
        if (!this.agent)
            throw new Error('ClIENT_MISSING_OPTION - agent must be provided - Default: bot');
        this.rollingRestarts = (_a = options === null || options === void 0 ? void 0 : options.rollingRestarts) !== null && _a !== void 0 ? _a : false;
        this.shardList = [];
        this.clusterList = [];
        this.totalShards = -1;
        this.on('ready', this._handleReady.bind(this));
        this.on('message', this._handleMessage.bind(this));
        this.on('request', this._handleRequest.bind(this));
    }
    connect(args = {}) {
        this._debug(`[Connect] Connecting to Bridge with the given Data`);
        return super.connect(Object.assign(Object.assign({}, args), { authToken: this.authToken, agent: this.agent }));
    }
    _handleReady() {
        this._debug(`[Ready] Client connected to Bridge`);
    }
    _handleMessage(message) {
        if (typeof message === 'string')
            message = JSON.parse(message);
        if ((message === null || message === void 0 ? void 0 : message._type) === undefined)
            return;
        if (message._type === shared_1.messageType.SHARDLIST_DATA_UPDATE) {
            if (!this.rollingRestarts)
                return;
            const checkIfClusterListIsUpToDate = message.shardClusterList.find((x) => JSON.stringify(x) === JSON.stringify(this.shardList));
            if (!checkIfClusterListIsUpToDate || this.totalShards !== message.totalShards) {
                this._debug(`[SHARDLIST_DATA_UPDATE] ShardData changed, waiting 5s until RollingRestart...`, {
                    bridge: true,
                });
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    if (!this.manager)
                        return;
                    const response = yield this.requestShardData();
                    this.manager.totalShards = response.totalShards;
                    this.manager.shardList = response.shardList || [];
                    this.manager.totalClusters = (_a = response.shardList) === null || _a === void 0 ? void 0 : _a.length;
                    this.manager.shardClusterList = response.shardList || [];
                    this.manager.clusterList = response.clusterList || [];
                    this._debug(`[Start] RollingRestart`);
                    this.rollingRestart();
                }), 5000);
            }
            else {
                super.send({ _type: shared_1.messageType.CLIENT_SHARDLIST_DATA_CURRENT, shardList: this.shardList });
                this._debug(`[SHARDLIST_DATA_UPDATE] ShardData did not changed!`, { bridge: true });
                return;
            }
        }
        let emitMessage;
        if (typeof message === 'object')
            emitMessage = new IPCMessage_1.IPCMessage(this, message);
        else
            emitMessage = message;
        this.emit('bridgeMessage', emitMessage, this);
    }
    _handleRequest(message, res) {
        var _a, _b;
        if (typeof message === 'string')
            message = JSON.parse(message);
        if ((message === null || message === void 0 ? void 0 : message._type) === undefined)
            return;
        if (message._type === shared_1.messageType.SERVER_BROADCAST_REQUEST) {
            if (!this.manager)
                throw new Error(`A Cluster/Shard Manager has not been loaded to net-ipc`);
            message._type = shared_1.messageType.CLIENT_BROADCAST_RESPONSE;
            (_a = this.manager.broadcastEval(message.script, message.options)) === null || _a === void 0 ? void 0 : _a.then(e => res(e)).catch(e => res(e));
            return;
        }
        if (message._type === shared_1.messageType.GUILD_DATA_REQUEST) {
            if (!this.manager)
                throw new Error(`A Cluster/Shard Manager has not been loaded to net-ipc`);
            message._type = shared_1.messageType.GUILD_DATA_RESPONSE;
            if (!isNaN(message.options.shard)) {
                const findCluster = Array.from(this.manager.clusters.values()).find((i) => {
                    if (!i)
                        return false;
                    return i.shardList.includes(message.options.shard);
                });
                message.options.cluster = findCluster ? findCluster.id : 0;
            }
            else
                return res(Object.assign({ error: 'No Shard has been provided!' }, message));
            const cluster = this.manager.clusters.get(message.options.cluster);
            if (cluster === undefined)
                return res(Object.assign(Object.assign({}, message), { error: `Cluster ${message.options.cluster} not found!` }));
            cluster
                .request(message)
                .then(e => res(e))
                .catch(e => res(Object.assign(Object.assign({}, message), { error: e })));
            return;
        }
        if (message._type === shared_1.messageType.GUILD_EVAL_REQUEST) {
            if (!this.manager)
                throw new Error(`A Cluster/Shard Manager has not been loaded to net-ipc`);
            message._type = shared_1.messageType.GUILD_EVAL_RESPONSE;
            (_b = this.manager
                .evalOnCluster(message.script, message.options)) === null || _b === void 0 ? void 0 : _b.then(e => res(e)).catch(e => res(e));
            return;
        }
        let emitMessage;
        if (typeof message === 'object')
            emitMessage = new IPCMessage_1.IPCMessage(this, message, res);
        else
            emitMessage = message;
        this.emit('bridgeRequest', emitMessage, this);
    }
    requestShardData(options = {}) {
        const _super = Object.create(null, {
            request: { get: () => super.request }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const message = { _type: shared_1.messageType.SHARDLIST_DATA_REQUEST, maxClusters: options.maxClusters };
            const response = yield _super.request.call(this, message, options.timeout);
            this._debug(`Given Shard Data: ${JSON.stringify(response)}`, { bridge: true });
            if (!response)
                throw new Error(`No Response from Server`);
            if (response.error)
                throw new Error(response.error);
            this.clusterList = response.clusterList;
            this.shardList = response.shardList;
            this.totalShards = response.totalShards;
            return response;
        });
    }
    listen(manager) {
        if (!manager)
            throw new Error(`A Cluster/Shard Manager has not been provided`);
        this.manager = manager;
        this.manager.netipc = this;
        return this.manager;
    }
    broadcastEval(script, options = {}) {
        const _super = Object.create(null, {
            request: { get: () => super.request }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (options.script)
                script = options.script;
            if (!script || (typeof script !== 'string' && typeof script !== 'function'))
                throw new Error('Script for BroadcastEvaling has not been provided or must be a valid String!');
            script = typeof script === 'function' ? `(${script})(this, ${JSON.stringify(options.context)})` : script;
            const message = { script, options, _type: shared_1.messageType.CLIENT_BROADCAST_REQUEST };
            return _super.request.call(this, message, message.options.timeout);
        });
    }
    send(message, options = {}) {
        const _super = Object.create(null, {
            send: { get: () => super.send }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (!message)
                throw new Error('Request has not been provided!');
            if (typeof message === 'string' && !options.internal)
                message = JSON.parse(message);
            if (typeof message !== 'object' && !options.internal)
                throw new TypeError('The Request has to be an object');
            if (!message.options)
                message.options = options;
            if (!options.internal) {
                message = new IPCMessage_1.BaseMessage(message).toJSON();
            }
            if (options.resolve === false) {
                _super.send.call(this, JSON.stringify(message));
                return Promise.resolve();
            }
            return _super.send.call(this, JSON.stringify(message));
        });
    }
    request(message, options = {}) {
        const _super = Object.create(null, {
            request: { get: () => super.request }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (!message)
                throw new Error('Request has not been provided!');
            if (typeof message === 'string' && !options.internal)
                message = JSON.parse(message);
            if (typeof message !== 'object' && !options.internal)
                throw new TypeError('The Request has to be an object');
            if (!message.options)
                message.options = options;
            if (!options.internal) {
                message = new IPCMessage_1.BaseMessage(message).toJSON();
            }
            return _super.request.call(this, JSON.stringify(message), message.options.timeout).catch(e => console.log(e));
        });
    }
    requestToGuild(message, options) {
        const _super = Object.create(null, {
            request: { get: () => super.request }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (!message.guildId)
                throw new Error('GuildID has not been provided!');
            if (!message.eval)
                message._type = shared_1.messageType.GUILD_DATA_REQUEST;
            else
                message._type = shared_1.messageType.GUILD_EVAL_REQUEST;
            if (!message.options)
                message.options = options || {};
            return _super.request.call(this, message, message.options.timeout);
        });
    }
    requestToClient(message, options) {
        const _super = Object.create(null, {
            request: { get: () => super.request }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (!message.agent && !message.clientId)
                throw new Error('Agent has not been provided!');
            message._type = shared_1.messageType.CLIENT_DATA_REQUEST;
            if (!message.options)
                message.options = options || {};
            return _super.request.call(this, message, message.options.timeout);
        });
    }
    rollingRestart() {
        if (!this.manager)
            throw new Error("No Manager was found");
        this._debug(`[RollingRestart] ShardClusterList: ${JSON.stringify(this.manager.shardClusterList)}`);
        if (!this.rollingRestarts)
            return;
        if (this.manager.recluster) {
            this.manager.recluster.start({
                restartMode: 'rolling',
            });
        }
    }
    _debug(message, options = {}) {
        let log;
        if (options.bridge) {
            log = `[Bridge => CM] ` + message;
        }
        else {
            log = `[CM] ` + message;
        }
        this.emit('debug', log);
        return log;
    }
}
exports.Client = Client;
