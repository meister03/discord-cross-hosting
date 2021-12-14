const {IPCMessage, BaseMessage} = require("../Structures/IPCMessage.js");
const { messageType } = require("../Utils/Constants.js");
class ShardClient {
    constructor(shard) {
        this.shard = shard;
    }

    /**
    * Evaluates a script or function on all machine, or a given shard, in the context of the {@link Client}s.
    * @param {string|Function} script JavaScript to run on each cluster
    * @param {number} [shard] Shard to run script on, all if undefined
    * @returns {Promise<*>|Promise<Array<*>>} Results of the script execution
    * @example
    * client.crosshost.broadcastEval('this.guilds.cache.size')
    *   .then(results => console.log(`${results.reduce((prev, val) => prev + val, 0)} total guilds`))
    *   .catch(console.error);
    * @see {@link CrosshostManager#broadcastEval}
    */
    async broadcastEval(script, options){
        if (!script) throw new Error('Script for BroadcastEvaling has not been provided!');
        script = typeof script === 'function' ? `(${script})(this)` : script;
        return this.shard.evalOnManager(`this.netipc.broadcastEval('${script}', ${options})`);
    }

    /**
    * Sends a message to all connected Machines.
    * @param {*} message The message, which should be sent.
    * @returns {Promise<request>}
    */
    async send(message) {
        if (!message) throw new Error('Request has not been provided!');
        if(typeof message !== 'object') throw new TypeError('The Request has to be an object')
        if (!options) options = {};
        message.options = options;
        message._sRequest = false;
        message._sReply = false;
        message = new BaseMessage(message).toJSON()
        return this.shard.evalOnManager(`this.netipc.send('${JSON.stringify(message)}')`);
    }

    /**
    * Sends a request to the Bridge
    * @param {*} message The message, which should be sent.
    * @returns {Promise<request>} The reply from the Bridge
    * client.crosshost.request({content: 'hello'})
    * .then(result => console.log(result)) //hi
    * .catch(console.error);
    */
    async request(message ={}, options = {}) {
        if (!message) throw new Error('Request has not been provided!');
        if(typeof message !== 'object' && !options.internal) throw new TypeError('The Request has to be an object')
        if (!options) options = {};
        message.options = options;
        if(!options.internal){
            message._sRequest = true;
            message._sReply = false;
            message = new BaseMessage(message).toJSON()
        }
        return this.shard.evalOnManager(`this.netipc.request('${JSON.stringify(message)}')`);
    }

    /**
    * Sends a Request to the Guild and returns the reply
    * @param {BaseMessage} message Message, which should be sent as request and handled by the User
    * @returns {Promise<*>} Reply of the Message
    * @example
    * client.crosshost.requestToGuild({content: 'hello', guildId: '123456789012345678'})
    *   .then(result => console.log(result)) //hi
    *   .catch(console.error);
    */
    async requestToGuild(message ={}){
        if (!message.guildId) throw new Error('GuildID has not been provided!');
        if(!message.eval) message.type = messageType.GUILD_DATA_REQUEST;
        else message.type = messageType.GUILD_EVAL_REQUEST;
        return this.request(message,  {internal: true});
    }

    /**
    * Sends a Request to the Client and returns the reply
    * @param {BaseMessage} message Message, which should be sent as request and handled by the User
    * @returns {Promise<*>} Reply of the Message
    * @example
    * client.crosshost.requestToClient({content: 'hello', agent: 'dashboard', clientId: 'CLient_id_provided_by_machine'})
    *   .then(result => console.log(result)) //hi
    *   .catch(console.error);
    */
    async requestToClient(message ={}){
        if (!message.agent && !message.clientId) throw new Error('Agent has not been provided!');
        message.type = messageType.CLIENT_DATA_REQUEST;
        return this.request(message,  {internal: true});
    }
}
module.exports = ShardClient;