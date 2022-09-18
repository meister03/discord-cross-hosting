import { ClusterClient, evalOptions } from 'discord-hybrid-sharding';
import { BaseMessage, RawMessage } from '../Structures/IPCMessage';
import { CrossHostMessage, messageType } from '../types/shared';

export class Shard {
    shard: ClusterClient;
    constructor(shard: ClusterClient) {
        this.shard = shard;
    }

    /**
     * Evaluates a script or function on all machine, or a given shard, in the context of the {@link Client}s.
     * @param script JavaScript to run on each cluster
     * @param options
     * @returns Results of the script execution
     * @example
     * client.crosshost.broadcastEval('this.guilds.cache.size')
     *   .then(results => console.log(`${results.reduce((prev, val) => prev + val, 0)} total guilds`))
     *   .catch(console.error);
     * @see {@link CrosshostManager#broadcastEval}
     */
    public async broadcastEval(script: string, options: evalOptions & {script?: string} = {}) {
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
     * @param message The message, which should be sent.
     */
    public async send(message: RawMessage, options: CrossHostMessage = {}) {
        if (!message) throw new Error('Request has not been provided!');
        if (typeof message !== 'object') throw new TypeError('The Request has to be an object');
        if (!options) options = {};
        message.options = options;
        message = new BaseMessage(message).toJSON();
        return this.shard.evalOnManager(`this.netipc.send('${JSON.stringify(message)}', {resolve: false})`);
    }

    /**
     * Sends a request to the Bridge
     * @param message The message, which should be sent.
     * @return The reply from the Bridge
     * client.crosshost.request({content: 'hello'})
     * .then(result => console.log(result)) // hi
     * .catch(console.error);
     */
    public async request(message: RawMessage, options: CrossHostMessage = {}) {
        if (!message) throw new Error('Request has not been provided!');
        if (typeof message !== 'object' && !options.internal) throw new TypeError('The Request has to be an object');
        if (!message.options) message.options = options;
        if (!options.internal) {
            message = new BaseMessage(message).toJSON();
        }
        return this.shard.evalOnManager(`this.netipc.request('${JSON.stringify(message)}')`);
    }

    /**
     * Sends a Request to the Guild and returns the reply
     * @param message Message, which should be sent as request and handled by the User
     * @param options
     * @returns Reply of the Message
     * @example
     * client.crosshost.requestToGuild({content: 'hello', guildId: '123456789012345678'})
     *   .then(result => console.log(result)) // hi
     *   .catch(console.error);
     */
    public async requestToGuild(message: RawMessage & {guildId: string}, options?: evalOptions) {
        if (!message.guildId) throw new Error('GuildID has not been provided!');
        if (!message.eval) message._type = messageType.GUILD_DATA_REQUEST;
        else message._type = messageType.GUILD_EVAL_REQUEST;
        if (!message.options) message.options = options;
        return this.request(message, { internal: true });
    }

    /**
     * Sends a Request to the Client and returns the reply
     * @param message Message, which should be sent as request and handled by the User
     * @param options
     * @returns Reply of the Message
     * @example
     * client.crosshost.requestToClient({content: 'hello', agent: 'dashboard', clientId: 'CLient_id_provided_by_machine'})
     *   .then(result => console.log(result)) // hi
     *   .catch(console.error);
     */
    public async requestToClient(message: RawMessage & {clientId: string}, options?: evalOptions) {
        if (!message.agent && !message.clientId) throw new Error('Agent has not been provided!');
        message._type = messageType.CLIENT_DATA_REQUEST;
        if (!message.options) message.options = options;
        return this.request(message, { internal: true });
    }
}

