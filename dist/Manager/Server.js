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
exports.Bridge = void 0;
var net_ipc_1 = require("net-ipc");
var IPCMessage_1 = require("../Structures/IPCMessage");
var discord_hybrid_sharding_1 = require("discord-hybrid-sharding");
var shared_1 = require("../types/shared");
var Bridge = (function (_super) {
    __extends(Bridge, _super);
    function Bridge(options) {
        var _this = this;
        var _a, _b, _c, _d;
        _this = _super.call(this, options) || this;
        if (!options)
            throw new Error('Minimum Options have not been provided, totalShards, totalMachines, authToken are missing.');
        _this.authToken = options.authToken;
        if (!_this.authToken)
            throw new Error('MACHINE_MISSING_OPTION - authToken must be provided - String');
        _this.standAlone = (_a = options.standAlone) !== null && _a !== void 0 ? _a : false;
        _this.shardsPerCluster = (_b = options.shardsPerCluster) !== null && _b !== void 0 ? _b : 1;
        _this.totalShards = options.totalShards === 'auto' ? -1 : ((_c = options.totalShards) !== null && _c !== void 0 ? _c : -1);
        if (_this.totalShards !== undefined && !_this.standAlone) {
            if (_this.totalShards !== -1) {
                if (typeof _this.totalShards !== 'number' || isNaN(_this.totalShards)) {
                    throw new TypeError('CLIENT_INVALID_OPTION - Amount of internal shards a number.');
                }
                if (_this.totalShards < 1)
                    throw new RangeError('CLIENT_INVALID_OPTION - Amount of internal shards at least 1.');
                if (!Number.isInteger(_this.totalShards)) {
                    throw new RangeError('CLIENT_INVALID_OPTION - Amount of internal shards an integer.');
                }
            }
        }
        _this.totalMachines = options.totalMachines;
        if (!_this.totalMachines)
            throw new Error('MISSING_OPTION - Total Machines - Provide the Amount of your Machines');
        if (typeof _this.totalMachines !== 'number' || isNaN(_this.totalMachines)) {
            throw new TypeError('MACHINE_INVALID_OPTION - Machine ID must be a number.');
        }
        if (!Number.isInteger(_this.totalMachines)) {
            throw new TypeError('MACHINE_INVALID_OPTION - Machine ID must be a number.');
        }
        _this.token = options.token ? options.token.replace(/^Bot\s*/i, '') : undefined;
        _this.shardList = (_d = options.shardList) !== null && _d !== void 0 ? _d : [];
        _this.shardClusterList = [];
        _this.shardClusterListQueue = [];
        _this.on('ready', _this._handleReady.bind(_this));
        _this.on('error', _this._handleError.bind(_this));
        _this.on('connect', _this._handleConnect.bind(_this));
        _this.on('disconnect', _this._handleDisconnect.bind(_this));
        _this.on('message', _this._handleMessage.bind(_this));
        _this.on('request', _this._handleRequest.bind(_this));
        _this.clients = new Map();
        return _this;
    }
    Bridge.prototype._handleReady = function (url) {
        var _this = this;
        this._debug("[READY] Bridge operational on ".concat(url));
        setTimeout(function () {
            if (!_this.standAlone)
                _this.initializeShardData();
        }, 5000);
    };
    Bridge.prototype._handleError = function (_error) { };
    Bridge.prototype._handleConnect = function (client, initialData) {
        if ((initialData === null || initialData === void 0 ? void 0 : initialData.authToken) !== this.authToken)
            return client.close('ACCESS DENIED').catch(function (e) { return console.log(e); });
        var newClient = Object.assign(client, {
            authToken: initialData.authToken,
            shardList: [],
            agent: (initialData.agent || 'none')
        });
        this.clients.set(client.id, newClient);
        this._debug("[CM => Connected][".concat(client.id, "]"), { cm: true });
    };
    Bridge.prototype._handleDisconnect = function (client, _reason) {
        var cachedClient = this.clients.get(client.id);
        if (!cachedClient)
            return;
        if (cachedClient.agent !== 'bot')
            return this.clients.delete(cachedClient.id);
        if (!cachedClient.shardList)
            return this.clients.delete(cachedClient.id);
        if (!this.standAlone)
            this.shardClusterListQueue.push(cachedClient.shardList);
        this._debug("[CM => Disconnected][".concat(cachedClient.id, "] New ShardListQueue: ").concat(JSON.stringify(this.shardClusterListQueue)));
        this.clients.delete(cachedClient.id);
    };
    Bridge.prototype._handleMessage = function (message, _client) {
        if (typeof message === 'string')
            message = JSON.parse(message);
        if ((message === null || message === void 0 ? void 0 : message._type) === undefined)
            return;
        var client = this.clients.get(_client.id);
        if (!client)
            return;
        if (message._type === shared_1.messageType.CLIENT_SHARDLIST_DATA_CURRENT) {
            if (!this.shardClusterListQueue[0])
                return;
            client.shardList = message.shardList;
            this.clients.set(client.id, client);
            var checkShardListPositionInQueue = this.shardClusterListQueue.findIndex(function (x) { return JSON.stringify(x) === JSON.stringify(message.shardList); });
            if (checkShardListPositionInQueue === undefined || checkShardListPositionInQueue === -1)
                return;
            this.shardClusterListQueue.splice(checkShardListPositionInQueue, 1);
            this._debug("[SHARDLIST_DATA_CURRENT][".concat(client.id, "] Current ShardListQueue: ").concat(JSON.stringify(this.shardClusterListQueue)));
            return;
        }
        var emitMessage;
        if (typeof message === 'object')
            emitMessage = new IPCMessage_1.IPCMessage(client, message);
        else
            emitMessage = message;
        this.emit('clientMessage', emitMessage, client);
    };
    Bridge.prototype._handleRequest = function (message, res, _client) {
        var _a, _b, _c, _d;
        if (typeof message === 'string')
            message = JSON.parse(message);
        if ((message === null || message === void 0 ? void 0 : message._type) === undefined)
            return;
        var client = this.clients.get(_client.id);
        if (!client)
            return res({ error: 'Client not registered on Bridges' });
        if (message._type === shared_1.messageType.CLIENT_BROADCAST_REQUEST) {
            var clients = Array.from(this.clients.values()).filter(((_a = message.options) === null || _a === void 0 ? void 0 : _a.agent) ? function (c) { return message.options.agent.includes(c.agent); } : function (c) { return c.agent === 'bot'; });
            message._type = shared_1.messageType.SERVER_BROADCAST_REQUEST;
            var promises = [];
            for (var _i = 0, clients_1 = clients; _i < clients_1.length; _i++) {
                var client_1 = clients_1[_i];
                promises.push(client_1.request(message, (_b = message.options) === null || _b === void 0 ? void 0 : _b.timeout));
            }
            Promise.all(promises)
                .then(function (e) { return res(e); })
                .catch(function (_e) { return null; });
            return;
        }
        if (message._type === shared_1.messageType.SHARDLIST_DATA_REQUEST) {
            if (!this.shardClusterListQueue[0])
                return res([]);
            if (!message.maxClusters) {
                client.shardList = this.shardClusterListQueue[0];
                this.shardClusterListQueue.shift();
            }
            else {
                this.shardClusterListQueue.sort(function (a, b) { return b.length - a.length; });
                var position = this.shardClusterListQueue.findIndex(function (x) { return x.length < message.maxClusters + 1; });
                if (position === -1) {
                    return res({ error: 'No Cluster List with less than ' + (message.maxClusters + 1) + ' found!' });
                }
                else {
                    client.shardList = this.shardClusterListQueue[position];
                    this.shardClusterListQueue.splice(position, 1);
                }
            }
            this._debug("[SHARDLIST_DATA_RESPONSE][".concat(client.id, "] ShardList: ").concat(JSON.stringify(client.shardList)), {
                cm: true,
            });
            var clusterIds = this.shardClusterList.map(function (x) { return x.length; });
            var shardListPosition = this.shardClusterList.findIndex(function (x) { return JSON.stringify(x) === JSON.stringify(client.shardList); });
            var clusterId = clusterIds.splice(0, shardListPosition);
            var r = 0;
            r = clusterId.reduce(function (a, b) { return a + b; }, 0);
            var clusterList = [];
            for (var i = 0; i < client.shardList.length; i++) {
                clusterList.push(r);
                r++;
            }
            res({ shardList: client.shardList, totalShards: this.totalShards, clusterList: clusterList });
            this.clients.set(client.id, client);
            return;
        }
        if (message._type === shared_1.messageType.GUILD_DATA_REQUEST) {
            if (!message.guildId)
                return res({ error: 'Missing guildId for request to Guild' });
            this.requestToGuild(message)
                .then(function (e) { return res(e); })
                .catch(function (e) { return res(__assign(__assign({}, message), { error: e })); });
            return;
        }
        if (message._type === shared_1.messageType.CLIENT_DATA_REQUEST) {
            if (!message.agent && !message.clientId)
                return res(__assign(__assign({}, message), { error: 'AGENT MISSING OR CLIENTID MISSING FOR FINDING TARGET CLIENT' }));
            if (message.clientId) {
                var targetClient = this.clients.get(message.clientId);
                if (!targetClient)
                    return res(__assign(__assign({}, message), { error: 'CLIENT NOT FOUND WITH PROVIDED CLIENT ID' }));
                return targetClient
                    .request(message, (_c = message.options) === null || _c === void 0 ? void 0 : _c.timeout)
                    .then(function (e) { return res(e); })
                    .catch(function (e) { return res(__assign(__assign({}, message), { error: e })); });
            }
            var clients = Array.from(this.clients.values()).filter(function (c) { return c.agent === String(message.agent); });
            message._type = shared_1.messageType.CLIENT_DATA_REQUEST;
            var promises = [];
            for (var _f = 0, clients_2 = clients; _f < clients_2.length; _f++) {
                var client_2 = clients_2[_f];
                promises.push(client_2.request(message, (_d = message.options) === null || _d === void 0 ? void 0 : _d.timeout));
            }
            return Promise.all(promises)
                .then(function (e) { return res(e); })
                .catch(function (e) { return res(__assign(__assign({}, message), { error: e })); });
        }
        var emitMessage;
        if (typeof message === 'object')
            emitMessage = new IPCMessage_1.IPCMessage(client, message, res);
        else
            emitMessage = message;
        this.emit('clientRequest', emitMessage, client);
    };
    Bridge.prototype.initializeShardData = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var _b, clusterAmount, ClusterList, clients, message, _i, clients_3, client;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!(this.totalShards === -1 && ((_a = this.shardList) === null || _a === void 0 ? void 0 : _a.length) === 0)) return [3, 2];
                        if (!this.token)
                            throw new Error('CLIENT_MISSING_OPTION - ' +
                                'A token must be provided when getting shard count on auto -' +
                                'Add the Option token: DiscordBOTTOKEN');
                        _b = this;
                        return [4, (0, discord_hybrid_sharding_1.fetchRecommendedShards)(this.token, 1000)];
                    case 1:
                        _b.totalShards = _c.sent();
                        this.shardList = Array.from(Array(this.totalShards).keys());
                        return [3, 3];
                    case 2:
                        if (isNaN(this.totalShards) && this.shardList) {
                            this.totalShards = this.shardList.length;
                        }
                        else {
                            if (typeof this.totalShards !== 'number' || isNaN(this.totalShards)) {
                                throw new TypeError('CLIENT_INVALID_OPTION - Amount of internal shards - a number.');
                            }
                            if (this.totalShards < 1)
                                throw new RangeError('CLIENT_INVALID_OPTION - Amount of internal shards - at least 1.');
                            if (!Number.isInteger(this.totalShards)) {
                                throw new RangeError('CLIENT_INVALID_OPTION - Amount of internal shards - an integer.');
                            }
                            this.shardList = Array.from(Array(this.totalShards).keys());
                        }
                        _c.label = 3;
                    case 3:
                        if (this.shardList.some(function (shardID) { return shardID >= _this.totalShards; })) {
                            throw new RangeError('CLIENT_INVALID_OPTION - ' +
                                'Amount of Internal Shards - ' +
                                'bigger than the highest shardID in the shardList option.');
                        }
                        clusterAmount = Math.ceil(this.shardList.length / this.shardsPerCluster);
                        ClusterList = (0, discord_hybrid_sharding_1.chunkArray)(this.shardList, Math.ceil(this.shardList.length / clusterAmount));
                        this.shardClusterList = this.parseClusterList(ClusterList);
                        this.shardClusterListQueue = this.shardClusterList.slice(0);
                        this._debug("Created shardClusterList: ".concat(JSON.stringify(this.shardClusterList)));
                        clients = Array.from(this.clients.values()).filter(function (c) { return c.agent === 'bot'; });
                        message = {
                            totalShards: this.totalShards,
                            shardClusterList: this.shardClusterList,
                            _type: shared_1.messageType.SHARDLIST_DATA_UPDATE,
                        };
                        for (_i = 0, clients_3 = clients; _i < clients_3.length; _i++) {
                            client = clients_3[_i];
                            client.send(message);
                        }
                        this._debug("[SHARDLIST_DATA_UPDATE][".concat(clients.length, "] To all connected Clients"), { cm: true });
                        return [2, this.shardClusterList];
                }
            });
        });
    };
    Bridge.prototype.parseClusterList = function (ClusterList) {
        return (0, discord_hybrid_sharding_1.chunkArray)(ClusterList, Math.ceil(ClusterList.length / this.totalMachines));
    };
    Bridge.prototype.broadcastEval = function (script, options) {
        return __awaiter(this, void 0, void 0, function () {
            var message, clients, promises, _i, clients_4, client;
            return __generator(this, function (_a) {
                if (!script || (typeof script !== 'string' && typeof script !== 'function'))
                    throw new Error('Script for BroadcastEvaling has not been provided or must be a valid String!');
                script = typeof script === 'function' ? "(".concat(script, ")(this, ").concat(JSON.stringify(options.context), ")") : script;
                if (!options)
                    options = { filter: undefined };
                message = { script: script, options: options, _type: shared_1.messageType.SERVER_BROADCAST_REQUEST };
                clients = Array.from(this.clients.values()).filter(options.filter || (function (c) { return c.agent === 'bot'; }));
                promises = [];
                for (_i = 0, clients_4 = clients; _i < clients_4.length; _i++) {
                    client = clients_4[_i];
                    promises.push(client.request(message, options.timeout));
                }
                return [2, Promise.all(promises)];
            });
        });
    };
    Bridge.prototype.requestToGuild = function (message, options) {
        return __awaiter(this, void 0, void 0, function () {
            var internalShard, targetClient;
            return __generator(this, function (_a) {
                if (!(message === null || message === void 0 ? void 0 : message.guildId))
                    throw new Error('GuildID has not been provided!');
                internalShard = (0, discord_hybrid_sharding_1.shardIdForGuildId)(message.guildId, this.totalShards);
                targetClient = Array.from(this.clients.values()).find(function (x) { var _a, _b; return (_b = (_a = x === null || x === void 0 ? void 0 : x.shardList) === null || _a === void 0 ? void 0 : _a.flat()) === null || _b === void 0 ? void 0 : _b.includes(internalShard); });
                if (!targetClient)
                    throw new Error('Internal Shard not found!');
                if (!message.options)
                    message.options = options !== null && options !== void 0 ? options : {};
                if (message.eval)
                    message._type = shared_1.messageType.GUILD_EVAL_REQUEST;
                else
                    message._type = shared_1.messageType.GUILD_DATA_REQUEST;
                message.options.shard = internalShard;
                return [2, targetClient.request(message, message.options.timeout)];
            });
        });
    };
    Bridge.prototype._debug = function (message, options) {
        var log;
        if (options === null || options === void 0 ? void 0 : options.cm) {
            log = "[Bridge => CM] " + message;
        }
        else {
            log = "[Bridge] " + message;
        }
        this.emit('debug', log);
        return log;
    };
    return Bridge;
}(net_ipc_1.Server));
exports.Bridge = Bridge;
