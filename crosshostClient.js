const EventEmitter = require('events');
const mongoose = require('mongoose');
const Message = require('./schema/message.js');
const EmitMessage = require('./schema/emitMessage.js')
const clusterdata  = require('./schema/clusterdata.js');
class HostClient extends EventEmitter {
    constructor(url, options = {}){
        super();
        /**
        * The MongoDB Connection URL
        * @type {String}
        */
        this.url = url;

        /**
        * The Total Amount of Machines
        * @type {Number}
        */
        this.totalMachines = options.totalMachines;
        if(!this.totalMachines) throw new Error(`You must provide the total Amount of machines`);

        /**
        * When a request, should timeout and be resolved
        * @type {Number}
        */
        this.timeout = options.TimeoutforResponses || 5000;

        /**
        * If the BroadcastEval should be parsed as Machine Array or as Shard Array
        * @type {Boolean}
        */
       this.parseasShardArray = options.parseasShardArray || false;

        /**
        * If your machine is connected
        * @type {Boolean}
        */
        this.connected = false;

        /**
        * Save running evals and responses for resolving back
        * @type {Map}
        */
        this.evals = new Map();

        /**
        * Save sent Messages
        * @type {Map}
        */
          this.messages = new Map();
    }

    /**
    * Connects with the mongodb server
    * <warn>You shouldnt need to call this manually.</warn>
    * @param {String} [connectionURL] The mongodb connection url
    * @returns {Promise<Connect>}
    */
    async connect(connectionURL = this.url){
        const connection = await mongoose.connect(connectionURL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        if(connection) this.connected = true;
        else throw new Error('CONNECTION_READYSTATE , Connection URL , Connection did not turned on ready, maybe bc of wrong connection');
        Message.watch({ fullDocument: 'updateLookup' }).on('change', this.handleStream.bind(this))
        return connection;
    }
    
    /**
    * Listens to the Message Event and Broadcasts
    * <warn>You must  need to call this manually.</warn>
    * @returns {Promise<Connect>}
    */
    async listen(){
        if(!this.connected) await this.connect(this.url);
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
    async broadcastEval(script, shard){
        if(!this.connected) await this.connect(this.url);
        return new Promise(async (resolve, reject) => {
            script = typeof script === 'function' ? `(${script})(this)` : script;
            const request = new Message({
                message: script,
                broadcastEval: {
                    request: true,
                    targetShard: shard,
                }    
            })
            await request.save().catch(e => reject(`[Error] ` +e))
            this.evals.set(request.id, {resolve: resolve, response: []});
            setTimeout(() => {
                if(this.evals.has(request.id)) {
                    this.evals.get(request.id).resolve(this.evals.get(request.id).response);
                    this.evals.delete(request.id);
                }
            }, this.timeout);
        });
    }

    /**
    * Handles the MongoDB change stream & broadcastEVal
    * <warn>You shouldnt need to call this manually.</warn>
    * @param {Object} [stream] The Object, which was delivered on the Stream
    * @returns {Promise<Message>}
    */
    async handleStream(stream){
        const data = stream.fullDocument
        if(!data) return;
        const emitmessage = new EmitMessage(data);
        if(stream.operationType === 'update'){
            if(data.broadcastEval){
                if(data.broadcastEval.response){
                    const instance = this.evals.get(String(data._id));
                    if(!instance) return;
                    if(data.response.length !== this.totalMachines){
                        instance.response = data.response;
                        this.evals.set(String(data._id), instance);
                        return;
                    }
                    this.evals.delete(String(data._id));
                    Message.findOneAndDelete({_id: String(data._id)}).then((e) => {emitmessage.deleted = true;}).catch((e) => new Error(e))
                    let endrepsonse = data.response;
                    if(this.parseasShardArray){
                    	     endresponse = endreponse.reduce((prev, curr) => prev.concat(curr), [] );
                    }
                    instance.resolve(endresponse);
                }
            }
        }
        if(this.messages.has(String(data._id))) return this.messages.delete(String(data._id));
        /**
        * Emitted upon recieving a message.
        * @event HostClient#message
        * @param {message} message message, which was recieved
        */
        this.emit(`message`, emitmessage);
        return;
    }

    /**
    * Sends a message to all connected Machines.
    * @param {*} message The message, which should be sent.
    * @param {string|number} shard The target shard for better handling
    * @returns {Promise<request>}
    */
    async send(message, shard){
        return new Promise(async (resolve, reject) => {
             const request = new Message({
                message: message,
                shard: {target: shard}
            })
            request.save().then((r) => resolve(r)).catch(e => reject(`[Error] ` +e))
            this.messages.set(request.id, request);
        });
    }
}
module.exports = HostClient;