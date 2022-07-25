const { BaseMessage } = require('../Structures/IPCMessage.js');
const { messageType } = require('../Utils/Constants.js');

class ShardClient {
    constructor(shard) {
        this.shard = shard;
    }

    /**
     * Evaluates a script or function on all machine, or a given shard, in the context of the {@link Client}s.
     * @param {string|Function} script JavaScript to run on each cluster
     * @param {number} [shard] Shard to run script on, all if undefined
     * @param options
     * @returns {Promise<*>|Promise<Array<*>>} Results of the script execution
     * @example
     * client.crosshost.broadcastEval('this.guilds.cache.size')
     *   .then(results => console.log(`${results.reduce((prev, val) => prev + val, 0)} total guilds`))
     *   .catch(console.error);
     * @see {@link CrosshostManager#broadcastEval}
     */
    async broadcastEval(script, options = {}) {
        if (!script || (typeof script !== 'string' && typeof script !== 'function'))
            throw new Error('Script for BroadcastEvaling must be a valid String or Function!');
        //options.usev13 = false;
        options.script =
            typeof script === 'function' ? `(${script})(this, ${JSON.stringify(options.context)})` : script;
        // console.log(`this.netipc.broadcastEval('${script}', ${JSON.stringify(options)})`);
        return this.shard.evalOnManager(`this.netipc.broadcastEval('', ${JSON.stringify(options)})`).catch(console.log);
    }

    /**
     * Sends a message to all connected Machines.
     * @param {*} message The message, which should be sent.
     * @param options
     * @returns {Promise<*>}
     */
    async send(message, options = {}) {
        if (!message) throw new Error('Request has not been provided!');
        if (typeof message !== 'object') throw new TypeError('The Request has to be an object');
        if (!options) options = {};
        message.options = options;
        message._sRequest = false;
        message._sReply = false;
        message = new BaseMessage(message).toJSON();
        return this.shard.evalOnManager(`this.netipc.send('${JSON.stringify(message)}', {resolve: false})`);
    }

    /**
     * Sends a request to the Bridge
     * @param {*} message The message, which should be sent.
     * @param options
     * @returns {Promise<*>} The reply from the Bridge
     * client.crosshost.request({content: 'hello'})
     * .then(result => console.log(result)) // hi
     * .catch(console.error);
     */
    async request(message = {}, options = {}) {
        if (!message) throw new Error('Request has not been provided!');
        if (typeof message !== 'object' && !options.internal) throw new TypeError('The Request has to be an object');
        if (!message.options) message.options = options;
        if (!options.internal) {
            message._sRequest = true;
            message._sReply = false;
            message = new BaseMessage(message).toJSON();
        }
        return this.shard.evalOnManager(`this.netipc.request('${JSON.stringify(message)}')`);
    }

    /**
     * Sends a Request to the Guild and returns the reply
     * @param {BaseMessage} message Message, which should be sent as request and handled by the User
     * @param options
     * @returns {Promise<*>} Reply of the Message
     * @example
     * client.crosshost.requestToGuild({content: 'hello', guildId: '123456789012345678'})
     *   .then(result => console.log(result)) // hi
     *   .catch(console.error);
     */
    async requestToGuild(message = {}, options = {}) {
        if (!message.guildId) throw new Error('GuildID has not been provided!');
        if (!message.eval) message.type = messageType.GUILD_DATA_REQUEST;
        else message.type = messageType.GUILD_EVAL_REQUEST;
        if (!message.options) message.options = options;
        return this.request(message, { internal: true });
    }

    /**
     * Sends a Request to the Client and returns the reply
     * @param {BaseMessage} message Message, which should be sent as request and handled by the User
     * @param options
     * @returns {Promise<*>} Reply of the Message
     * @example
     * client.crosshost.requestToClient({content: 'hello', agent: 'dashboard', clientId: 'CLient_id_provided_by_machine'})
     *   .then(result => console.log(result)) // hi
     *   .catch(console.error);
     */
    async requestToClient(message = {}, options = {}) {
        if (!message.agent && !message.clientId) throw new Error('Agent has not been provided!');
        message.type = messageType.CLIENT_DATA_REQUEST;
        if (!message.options) message.options = options;
        return this.request(message, { internal: true });
    }
}

module.exports = ShardClient;
