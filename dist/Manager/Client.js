"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
var net_ipc_1 = require("net-ipc");
var IPCMessage_1 = require("../Structures/IPCMessage");
var shared_1 = require("../types/shared");
var Client = (function (_super) {
    __extends(Client, _super);
    function Client(options) {
        var _this = this;
        var _a;
        _this = _super.call(this, options) || this;
        if (!options)
            throw new Error('Client required options are missing');
        _this.authToken = options === null || options === void 0 ? void 0 : options.authToken;
        if (!_this.authToken)
            throw new Error('ClIENT_MISSING_OPTION - authToken must be provided - String');
        _this.agent = options === null || options === void 0 ? void 0 : options.agent;
        if (!_this.agent)
            throw new Error('ClIENT_MISSING_OPTION - agent must be provided - Default: bot');
        _this.rollingRestarts = (_a = options === null || options === void 0 ? void 0 : options.rollingRestarts) !== null && _a !== void 0 ? _a : false;
        _this.shardList = [];
        _this.clusterList = [];
        _this.totalShards = -1;
        _this.on('ready', _this._handleReady.bind(_this));
        _this.on('message', _this._handleMessage.bind(_this));
        _this.on('request', _this._handleRequest.bind(_this));
        return _this;
    }
    Client.prototype.connect = function (args) {
        if (args === void 0) { args = {}; }
        this._debug("[Connect] Connecting to Bridge with the given Data");
        return _super.prototype.connect.call(this, __assign(__assign({}, args), { authToken: this.authToken, agent: this.agent }));
    };
    Client.prototype._handleReady = function () {
        this._debug("[Ready] Client connected to Bridge");
    };
    Client.prototype._handleMessage = function (message) {
        var _this = this;
        if (typeof message === 'string')
            message = JSON.parse(message);
        if ((message === null || message === void 0 ? void 0 : message._type) === undefined)
            return;
        if (!this.manager)
            return;
        if (message._type === shared_1.messageType.SHARDLIST_DATA_UPDATE) {
            if (!this.rollingRestarts)
                return;
            var checkIfClusterListIsUpToDate = message.shardClusterList.find(function (x) { return JSON.stringify(x) === JSON.stringify(_this.shardList); });
            if (!checkIfClusterListIsUpToDate || this.totalShards !== message.totalShards) {
                this._debug("[SHARDLIST_DATA_UPDATE] ShardData changed, waiting 5s until RollingRestart...", {
                    bridge: true,
                });
                setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                    var response;
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                if (!this.manager)
                                    return [2];
                                return [4, this.requestShardData()];
                            case 1:
                                response = _b.sent();
                                this.manager.totalShards = response.totalShards;
                                this.manager.shardList = response.shardList || [];
                                this.manager.totalClusters = (_a = response.shardList) === null || _a === void 0 ? void 0 : _a.length;
                                this.manager.shardClusterList = response.shardList || [];
                                this.manager.clusterList = response.clusterList || [];
                                this._debug("[Start] RollingRestart");
                                this.rollingRestart();
                                return [2];
                        }
                    });
                }); }, 5000);
            }
            else {
                _super.prototype.send.call(this, { _type: shared_1.messageType.CLIENT_SHARDLIST_DATA_CURRENT, shardList: this.shardList });
                this._debug("[SHARDLIST_DATA_UPDATE] ShardData did not changed!", { bridge: true });
                return;
            }
        }
        var emitMessage;
        if (typeof message === 'object')
            emitMessage = new IPCMessage_1.IPCMessage(this, message);
        else
            emitMessage = message;
        this.emit('bridgeMessage', emitMessage, this);
    };
    Client.prototype._handleRequest = function (message, res) {
        var _a, _b;
        if (typeof message === 'string')
            message = JSON.parse(message);
        if ((message === null || message === void 0 ? void 0 : message._type) === undefined)
            return;
        if (message._type === shared_1.messageType.SERVER_BROADCAST_REQUEST) {
            if (!this.manager)
                throw new Error("A Cluster/Shard Manager has not been loaded to net-ipc");
            message._type = shared_1.messageType.CLIENT_BROADCAST_RESPONSE;
            (_a = this.manager.broadcastEval(message.script, message.options)) === null || _a === void 0 ? void 0 : _a.then(function (e) { return res(e); }).catch(function (e) { return res(e); });
            return;
        }
        if (message._type === shared_1.messageType.GUILD_DATA_REQUEST) {
            if (!this.manager)
                throw new Error("A Cluster/Shard Manager has not been loaded to net-ipc");
            message._type = shared_1.messageType.GUILD_DATA_RESPONSE;
            if (!isNaN(message.options.shard)) {
                var findCluster = Array.from(this.manager.clusters.values()).find(function (i) {
                    if (!i)
                        return false;
                    return i.shardList.includes(message.options.shard);
                });
                message.options.cluster = findCluster ? findCluster.id : 0;
            }
            else
                return res(__assign({ error: 'No Shard has been provided!' }, message));
            var cluster = this.manager.clusters.get(message.options.cluster);
            if (cluster === undefined)
                return res(__assign(__assign({}, message), { error: "Cluster ".concat(message.options.cluster, " not found!") }));
            cluster
                .request(message)
                .then(function (e) { return res(e); })
                .catch(function (e) { return res(__assign(__assign({}, message), { error: e })); });
            return;
        }
        if (message._type === shared_1.messageType.GUILD_EVAL_REQUEST) {
            if (!this.manager)
                throw new Error("A Cluster/Shard Manager has not been loaded to net-ipc");
            message._type = shared_1.messageType.GUILD_EVAL_RESPONSE;
            (_b = this.manager
                .evalOnCluster(message.script, message.options)) === null || _b === void 0 ? void 0 : _b.then(function (e) { return res(e); }).catch(function (e) { return res(e); });
            return;
        }
        var emitMessage;
        if (typeof message === 'object')
            emitMessage = new IPCMessage_1.IPCMessage(this, message, res);
        else
            emitMessage = message;
        this.emit('bridgeRequest', emitMessage, this);
    };
    Client.prototype.requestShardData = function (options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var message, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        message = { _type: shared_1.messageType.SHARDLIST_DATA_REQUEST, maxClusters: options.maxClusters };
                        return [4, _super.prototype.request.call(this, message, options.timeout)];
                    case 1:
                        response = _a.sent();
                        this._debug("Given Shard Data: ".concat(JSON.stringify(response)), { bridge: true });
                        if (!response)
                            throw new Error("No Response from Server");
                        if (response.error)
                            throw new Error(response.error);
                        this.clusterList = response.clusterList;
                        this.shardList = response.shardList;
                        this.totalShards = response.totalShards;
                        return [2, response];
                }
            });
        });
    };
    Client.prototype.listen = function (manager) {
        if (!manager)
            throw new Error("A Cluster/Shard Manager has not been provided");
        this.manager = manager;
        this.manager.netipc = this;
        return this.manager;
    };
    Client.prototype.broadcastEval = function (script, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var message;
            return __generator(this, function (_a) {
                if (options.script)
                    script = options.script;
                if (!script || (typeof script !== 'string' && typeof script !== 'function'))
                    throw new Error('Script for BroadcastEvaling has not been provided or must be a valid String!');
                script = typeof script === 'function' ? "(".concat(script, ")(this, ").concat(JSON.stringify(options.context), ")") : script;
                message = { script: script, options: options, _type: shared_1.messageType.CLIENT_BROADCAST_REQUEST };
                return [2, _super.prototype.request.call(this, message, message.options.timeout)];
            });
        });
    };
    Client.prototype.send = function (message, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
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
                    _super.prototype.send.call(this, JSON.stringify(message));
                    return [2, Promise.resolve()];
                }
                return [2, _super.prototype.send.call(this, JSON.stringify(message))];
            });
        });
    };
    Client.prototype.request = function (message, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
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
                return [2, _super.prototype.request.call(this, JSON.stringify(message), message.options.timeout).catch(function (e) { return console.log(e); })];
            });
        });
    };
    Client.prototype.requestToGuild = function (message, options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!message.guildId)
                    throw new Error('GuildID has not been provided!');
                if (!message.eval)
                    message._type = shared_1.messageType.GUILD_DATA_REQUEST;
                else
                    message._type = shared_1.messageType.GUILD_EVAL_REQUEST;
                if (!message.options)
                    message.options = options || {};
                return [2, _super.prototype.request.call(this, message, message.options.timeout)];
            });
        });
    };
    Client.prototype.requestToClient = function (message, options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!message.agent && !message.clientId)
                    throw new Error('Agent has not been provided!');
                message._type = shared_1.messageType.CLIENT_DATA_REQUEST;
                if (!message.options)
                    message.options = options || {};
                return [2, _super.prototype.request.call(this, message, message.options.timeout)];
            });
        });
    };
    Client.prototype.rollingRestart = function () {
        if (!this.manager)
            throw new Error("No Manager was found");
        this._debug("[RollingRestart] ShardClusterList: ".concat(JSON.stringify(this.manager.shardClusterList)));
        if (!this.rollingRestarts)
            return;
        if (this.manager.recluster) {
            this.manager.recluster.start({
                restartMode: 'rolling',
            });
        }
    };
    Client.prototype._debug = function (message, options) {
        if (options === void 0) { options = {}; }
        var log;
        if (options.bridge) {
            log = "[Bridge => CM] " + message;
        }
        else {
            log = "[CM] " + message;
        }
        this.emit('debug', log);
        return log;
    };
    return Client;
}(net_ipc_1.Client));
exports.Client = Client;
