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
exports.Bridge = void 0;
const net_ipc_1 = require("net-ipc");
const IPCMessage_1 = require("../Structures/IPCMessage");
const discord_hybrid_sharding_1 = require("discord-hybrid-sharding");
const shared_1 = require("../types/shared");
class Bridge extends net_ipc_1.Server {
    constructor(options) {
        var _a, _b, _c, _d;
        super(options);
        this.authToken = options.authToken;
        if (!this.authToken)
            throw new Error('MACHINE_MISSING_OPTION - authToken must be provided - String');
        this.standAlone = (_a = options.standAlone) !== null && _a !== void 0 ? _a : false;
        this.shardsPerCluster = (_b = options.shardsPerCluster) !== null && _b !== void 0 ? _b : 1;
        this.totalShards = options.totalShards === 'auto' ? -1 : ((_c = options.totalShards) !== null && _c !== void 0 ? _c : -1);
        if (this.totalShards !== undefined && !this.standAlone) {
            if (this.totalShards !== -1) {
                if (typeof this.totalShards !== 'number' || isNaN(this.totalShards)) {
                    throw new TypeError('CLIENT_INVALID_OPTION - Amount of internal shards a number.');
                }
                if (this.totalShards < 1)
                    throw new RangeError('CLIENT_INVALID_OPTION - Amount of internal shards at least 1.');
                if (!Number.isInteger(this.totalShards)) {
                    throw new RangeError('CLIENT_INVALID_OPTION - Amount of internal shards an integer.');
                }
            }
        }
        this.totalMachines = options.totalMachines;
        if (!this.totalMachines)
            throw new Error('MISSING_OPTION - Total Machines - Provide the Amount of your Machines');
        if (typeof this.totalMachines !== 'number' || isNaN(this.totalMachines)) {
            throw new TypeError('MACHINE_INVALID_OPTION - Machine ID must be a number.');
        }
        if (!Number.isInteger(this.totalMachines)) {
            throw new TypeError('MACHINE_INVALID_OPTION - Machine ID must be a number.');
        }
        this.token = options.token ? options.token.replace(/^Bot\s*/i, '') : undefined;
        this.shardList = (_d = options.shardList) !== null && _d !== void 0 ? _d : [];
        this.shardClusterList = [];
        this.shardClusterListQueue = [];
        this.on('ready', this._handleReady.bind(this));
        this.on('error', this._handleError.bind(this));
        this.on('connect', this._handleConnect.bind(this));
        this.on('disconnect', this._handleDisconnect.bind(this));
        this.on('message', this._handleMessage.bind(this));
        this.on('request', this._handleRequest.bind(this));
        this.clients = new Map();
    }
    _handleReady(url) {
        this._debug(`[READY] Bridge operational on ${url}`);
        setTimeout(() => {
            if (!this.standAlone)
                this.initializeShardData();
        }, 5000);
    }
    _handleError(_error) { }
    _handleConnect(client, initialData) {
        if ((initialData === null || initialData === void 0 ? void 0 : initialData.authToken) !== this.authToken)
            return client.close('ACCESS DENIED').catch(e => console.log(e));
        const newClient = Object.assign(client, {
            authToken: initialData.authToken,
            shardList: [],
            agent: (initialData.agent || 'none')
        });
        this.clients.set(client.id, newClient);
        this._debug(`[CM => Connected][${client.id}]`, { cm: true });
    }
    _handleDisconnect(client, _reason) {
        const cachedClient = this.clients.get(client.id);
        if (!cachedClient)
            return;
        if (cachedClient.agent !== 'bot')
            return this.clients.delete(cachedClient.id);
        if (!cachedClient.shardList)
            return this.clients.delete(cachedClient.id);
        if (!this.standAlone)
            this.shardClusterListQueue.push(cachedClient.shardList);
        this._debug(`[CM => Disconnected][${cachedClient.id}] New ShardListQueue: ${JSON.stringify(this.shardClusterListQueue)}`);
        this.clients.delete(cachedClient.id);
    }
    _handleMessage(message, _client) {
        if (typeof message === 'string')
            message = JSON.parse(message);
        if ((message === null || message === void 0 ? void 0 : message._type) === undefined)
            return;
        const client = this.clients.get(_client.id);
        if (!client)
            return;
        if (message._type === shared_1.messageType.CLIENT_SHARDLIST_DATA_CURRENT) {
            if (!this.shardClusterListQueue[0])
                return;
            client.shardList = message.shardList;
            this.clients.set(client.id, client);
            const checkShardListPositionInQueue = this.shardClusterListQueue.findIndex(x => JSON.stringify(x) === JSON.stringify(message.shardList));
            if (checkShardListPositionInQueue === undefined || checkShardListPositionInQueue === -1)
                return;
            this.shardClusterListQueue.splice(checkShardListPositionInQueue, 1);
            this._debug(`[SHARDLIST_DATA_CURRENT][${client.id}] Current ShardListQueue: ${JSON.stringify(this.shardClusterListQueue)}`);
            return;
        }
        let emitMessage;
        if (typeof message === 'object')
            emitMessage = new IPCMessage_1.IPCMessage(client, message);
        else
            emitMessage = message;
        this.emit('clientMessage', emitMessage, client);
    }
    _handleRequest(message, res, _client) {
        var _a, _b, _c, _d;
        if (typeof message === 'string')
            message = JSON.parse(message);
        if ((message === null || message === void 0 ? void 0 : message._type) === undefined)
            return;
        const client = this.clients.get(_client.id);
        if (!client)
            return res({ error: 'Client not registered on Bridges' });
        if (message._type === shared_1.messageType.CLIENT_BROADCAST_REQUEST) {
            const clients = Array.from(this.clients.values()).filter(((_a = message.options) === null || _a === void 0 ? void 0 : _a.agent) ? c => message.options.agent.includes(c.agent) : c => c.agent === 'bot');
            message._type = shared_1.messageType.SERVER_BROADCAST_REQUEST;
            const promises = [];
            for (const client of clients)
                promises.push(client.request(message, (_b = message.options) === null || _b === void 0 ? void 0 : _b.timeout));
            Promise.all(promises)
                .then(e => res(e))
                .catch(_e => null);
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
                this.shardClusterListQueue.sort((a, b) => b.length - a.length);
                const position = this.shardClusterListQueue.findIndex(x => x.length < message.maxClusters + 1);
                if (position === -1) {
                    return res({ error: 'No Cluster List with less than ' + (message.maxClusters + 1) + ' found!' });
                }
                else {
                    client.shardList = this.shardClusterListQueue[position];
                    this.shardClusterListQueue.splice(position, 1);
                }
            }
            this._debug(`[SHARDLIST_DATA_RESPONSE][${client.id}] ShardList: ${JSON.stringify(client.shardList)}`, {
                cm: true,
            });
            const clusterIds = this.shardClusterList.map(x => x.length);
            const shardListPosition = this.shardClusterList.findIndex(x => JSON.stringify(x) === JSON.stringify(client.shardList));
            const clusterId = clusterIds.splice(0, shardListPosition);
            let r = 0;
            r = clusterId.reduce((a, b) => a + b, 0);
            const clusterList = [];
            for (let i = 0; i < client.shardList.length; i++) {
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
                .then(e => res(e))
                .catch(e => res(Object.assign(Object.assign({}, message), { error: e })));
            return;
        }
        if (message._type === shared_1.messageType.CLIENT_DATA_REQUEST) {
            if (!message.agent && !message.clientId)
                return res(Object.assign(Object.assign({}, message), { error: 'AGENT MISSING OR CLIENTID MISSING FOR FINDING TARGET CLIENT' }));
            if (message.clientId) {
                const targetClient = this.clients.get(message.clientId);
                if (!targetClient)
                    return res(Object.assign(Object.assign({}, message), { error: 'CLIENT NOT FOUND WITH PROVIDED CLIENT ID' }));
                return targetClient
                    .request(message, (_c = message.options) === null || _c === void 0 ? void 0 : _c.timeout)
                    .then(e => res(e))
                    .catch(e => res(Object.assign(Object.assign({}, message), { error: e })));
            }
            const clients = Array.from(this.clients.values()).filter(c => c.agent === String(message.agent));
            message._type = shared_1.messageType.CLIENT_DATA_REQUEST;
            const promises = [];
            for (const client of clients)
                promises.push(client.request(message, (_d = message.options) === null || _d === void 0 ? void 0 : _d.timeout));
            return Promise.all(promises)
                .then(e => res(e))
                .catch(e => res(Object.assign(Object.assign({}, message), { error: e })));
        }
        let emitMessage;
        if (typeof message === 'object')
            emitMessage = new IPCMessage_1.IPCMessage(client, message, res);
        else
            emitMessage = message;
        this.emit('clientRequest', emitMessage, client);
    }
    initializeShardData() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.totalShards === -1 && ((_a = this.shardList) === null || _a === void 0 ? void 0 : _a.length) === 0) {
                if (!this.token)
                    throw new Error('CLIENT_MISSING_OPTION - ' +
                        'A token must be provided when getting shard count on auto -' +
                        'Add the Option token: DiscordBOTTOKEN');
                this.totalShards = yield (0, discord_hybrid_sharding_1.fetchRecommendedShards)(this.token, 1000);
                this.shardList = Array.from(Array(this.totalShards).keys());
            }
            else {
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
            }
            if (this.shardList.some(shardID => shardID >= this.totalShards)) {
                throw new RangeError('CLIENT_INVALID_OPTION - ' +
                    'Amount of Internal Shards - ' +
                    'bigger than the highest shardID in the shardList option.');
            }
            const clusterAmount = Math.ceil(this.shardList.length / this.shardsPerCluster);
            const ClusterList = (0, discord_hybrid_sharding_1.chunkArray)(this.shardList, Math.ceil(this.shardList.length / clusterAmount));
            this.shardClusterList = this.parseClusterList(ClusterList);
            this.shardClusterListQueue = this.shardClusterList.slice(0);
            this._debug(`Created shardClusterList: ${JSON.stringify(this.shardClusterList)}`);
            const clients = Array.from(this.clients.values()).filter(c => c.agent === 'bot');
            const message = {
                totalShards: this.totalShards,
                shardClusterList: this.shardClusterList,
                _type: shared_1.messageType.SHARDLIST_DATA_UPDATE,
            };
            for (const client of clients)
                client.send(message);
            this._debug(`[SHARDLIST_DATA_UPDATE][${clients.length}] To all connected Clients`, { cm: true });
            return this.shardClusterList;
        });
    }
    parseClusterList(ClusterList) {
        return (0, discord_hybrid_sharding_1.chunkArray)(ClusterList, Math.ceil(ClusterList.length / this.totalMachines));
    }
    broadcastEval(script, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!script || (typeof script !== 'string' && typeof script !== 'function'))
                throw new Error('Script for BroadcastEvaling has not been provided or must be a valid String!');
            script = typeof script === 'function' ? `(${script})(this, ${JSON.stringify(options.context)})` : script;
            if (!options)
                options = { filter: undefined };
            const message = { script, options, _type: shared_1.messageType.SERVER_BROADCAST_REQUEST };
            const clients = Array.from(this.clients.values()).filter(options.filter || (c => c.agent === 'bot'));
            const promises = [];
            for (const client of clients)
                promises.push(client.request(message, options.timeout));
            return Promise.all(promises);
        });
    }
    requestToGuild(message, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(message === null || message === void 0 ? void 0 : message.guildId))
                throw new Error('GuildID has not been provided!');
            const internalShard = (0, discord_hybrid_sharding_1.shardIdForGuildId)(message.guildId, this.totalShards);
            const targetClient = Array.from(this.clients.values()).find(x => { var _a, _b; return (_b = (_a = x === null || x === void 0 ? void 0 : x.shardList) === null || _a === void 0 ? void 0 : _a.flat()) === null || _b === void 0 ? void 0 : _b.includes(internalShard); });
            if (!targetClient)
                throw new Error('Internal Shard not found!');
            if (!message.options)
                message.options = options !== null && options !== void 0 ? options : {};
            if (message.eval)
                message._type = shared_1.messageType.GUILD_EVAL_REQUEST;
            else
                message._type = shared_1.messageType.GUILD_DATA_REQUEST;
            message.options.shard = internalShard;
            return targetClient.request(message, message.options.timeout);
        });
    }
    _debug(message, options) {
        let log;
        if (options === null || options === void 0 ? void 0 : options.cm) {
            log = `[Bridge => CM] ` + message;
        }
        else {
            log = `[Bridge] ` + message;
        }
        this.emit('debug', log);
        return log;
    }
}
exports.Bridge = Bridge;
