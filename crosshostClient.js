const EventEmitter = require('events');
const mongoose = require('mongoose');
const Message = require('./schema/message.js');
const EmitMessage = require('./schema/emitMessage.js')
const clusterdata  = require('./schema/clusterdata.js');
class HostClient extends EventEmitter {
    constructor(url, options = {}){
        super();
        this.url = url;
        this.totalMachines = options.totalMachines;
        this.timeout = options.TimeoutforResponses || 5000;

        if(!this.totalMachines) throw new Error(`You must provide the total Amount of machines on Standalone Mode`)

        this.connected = false;
        this.evals = new Map();
    }
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
                    instance.resolve(data.response);
                }
            }
        }
        this.emit(`message`, emitmessage);
        return;
    }

    async send(message, shard){
        return new Promise(async (resolve, reject) => {
             const request = new Message({
                message: message,
                shard: shard
            })
            request.save().then((r) => resolve(r)).catch(e => reject(`[Error] ` +e))
        });
    }
}
module.exports = HostClient;