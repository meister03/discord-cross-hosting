const EventEmitter = require('events');
const mongoose = require('mongoose');
const message = require('./schema/message.js');
const EmitMessage = require('./schema/emitMessage.js')
const clusterdata  = require('./schema/clusterdata.js');

class HostManager extends EventEmitter {
   /**
   * @param {string} connectionurl The Mongodb connection url
   * @param {Object} [options] Options for the Host Manager
   * @param {string|number} [options.totalShards='auto'] Number of total internal shards or "auto"
   * @param {string|number} [options.totalMachines] Number of Machines
   * @param {string|number} [options.machineID] The ID of the current Machine
   * @param {Boolean} [options.master=false] if the Machine is Master.
   * @param {string} [options.token] Token to use for automatic internal shard count and passing to Shard Manager
   */
    constructor(connectionurl, option = {}) {
      super()
      /**
      * The Total Amount of Clusters
      * @type {Number}
      */
      this.totalCluster = option.totalCluster; 

      /**
      * The Total Amount of Shards
      * @type {Number}
      */ 
      this.totalShards = option.totalShards; 
      if (this.totalShards !== undefined) {
      if (this.totalShards !== 'auto') {
        if (typeof this.totalShards !== 'number' || isNaN(this.totalShards)) {
          throw new TypeError('CLIENT_INVALID_OPTION', 'Amount of internal shards', 'a number.');
        }
        if (this.totalShards < 1) throw new RangeError('CLIENT_INVALID_OPTION', 'Amount of internal shards', 'at least 1.');
        if (!Number.isInteger(this.totalShards)) {
          throw new RangeError('CLIENT_INVALID_OPTION', 'Amount of internal shards', 'an integer.');
        }
      }
     }

      /**
      * The Total Amount of Machines
      * @type {Number}
      */
      this.totalMachines = option.totalMachines; 
      if(!this.totalMachines) throw new Error('MISSING_OPTION', 'Total Machines', 'Provide the Amount of your Machines');
      if(typeof this.totalMachines !== 'number' || isNaN(this.totalMachines)) {
        throw new TypeError('MACHINE_INVALID_OPTION', 'Machine ID', 'must be a number.');
      }
      if(!Number.isInteger(this.totalMachines)) {
        throw new TypeError('MACHINE_INVALID_OPTION', 'Machine ID', 'must be a number.');
      }

      /**
      * The Current MachineID
      * @type {Number}
      */
      this.machineID = option.machineID; 
      if(isNaN(this.machineID)) throw new Error('WRONG/MISSING_OPTION', 'MachineID MISSING', 'Provide the Number for the current machine, 1.Machine: 0, 2.Machine: 1 ....');

      /**
      * If the Machine is Master
      * @type {Boolean}
      */
      this.master = option.master || false;

      /**
      * Your Discord Bot token
      * @type {String}
      */
      this.token =  option.token ? option.token.replace(/^Bot\s*/i, '') : null;

      /**
      * The MongoDB Connection Url
      * @type {String}
      */
      this.url = connectionurl 
      if(!this.url) throw new Error('MISSING_OPTION', 'Connection URL', 'Provide a vaild mongodb connection url');
      
      /**
      * If your machine is connected
      * @type {Boolean}
      */
      this.connected;

      /**
      * The shardList, which will be hosted by all Machines
      * @type {Array[]}
      */
      this.shardList;

      /**
      * The Manager instance, which should be listened, when broadcasting
      * @type {Object}
      */
      this.manager = {};
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
        message.watch({ fullDocument: 'updateLookup' }).on('change', this.handleStream.bind(this))
        return connection;
    } 
    /**
    * Initalizes all Machines, gets the Data and give the back for the manager.
    * @returns {Promise<Object<shardList, totalShards>>}
    */
    async getData(){
        if(!this.connected) await this.connect()
        const data = await clusterdata.find({})

        if (this.totalShards === 'auto') {
            amount = await Discord.fetchRecommendedShards(this.token, 1000);
            this.totalShards = amount;
        }
        
        if(data.length === 0){
            if(!this.master) throw new Error('COULD NOT INITALIZE MACHINE', 'MACHINE MUST BE MASTER ON INIT', 'ADD THE OPTION master: true on your main machine');
            if(!this.totalMachines) throw new Error('COULD NOT INITALIZE AMOUNT OF MACHINES', 'GIVE THE TOTAL AMOUNT OF ALL YOUR MACHINES', 'ADD THE OPTION totalMachines: machineamount ');
            if(isNaN(this.machineID)) throw new Error('COULD NOT INITALIZE  MACHINEID', 'GIVE THE MACHINEID OF THE MASTER MACHINE', 'ADD THE OPTION machineID: 1 ');
            if(!this.totalShards) throw new Error('COULD NOT INITALIZE AMOUNT OF SHARDS', 'GIVE THE TOTAL AMOUNT OF ALL YOUR SHARDS YOU WANT', 'ADD THE OPTION totalShards: shardamount/`auto` ');
            
            if(!this.totalShards === 'auto'){
                if(!this.token) throw new Error('CLIENT_MISSING_OPTION', 'A token must be provided when getting shard count on auto', 'Add the Option token: DiscordBOTTOKEN');
                this.totalShards = await Discord.fetchRecommendedShards(this.token, 1000);
            }else{
                if (typeof this.totalShards !== 'number' || isNaN(this.totalShards)) {
                    throw new TypeError('CLIENT_INVALID_OPTION', 'Amount of internal shards', 'a number.');
                }
                if (this.totalShards < 1) throw new RangeError('CLIENT_INVALID_OPTION', 'Amount of internal shards', 'at least 1.');
                if (!Number.isInteger(this.totalShards)) {
                    throw new RangeError('CLIENT_INVALID_OPTION', 'Amount of internal shards', 'an integer.');
                }
            }
            const machinedata = new clusterdata({
                totalClusters: this.totalClusters,
                totalShards: this.totalShards,
                Master: this.master,
                machineID: this.machineID,
                totalMachines:  this.totalMachines,
            })
            await machinedata.save().catch((e) => {throw new Error(e)})
            const machineIDs = [...Array((this.totalMachines)).keys()]

            this.emit(`debug`, `[Master] MachineID's for other Machines: ${machineIDs.toString()}`)

            for(let i = 0; i < machineIDs.length; i++){
                const machine = new clusterdata({
                    totalShards: this.totalShards,
                    Master: false,
                    machineID: machineIDs[i],
                    totalMachines:  this.totalMachines,
                })
                await machine.save().catch((e) => {throw new Error(e)})
            }

            this.emit(`debug`,`[Master] Ended Initalizing for all Machines`)
        }else{
            const p = data.findIndex(m => m.machineID === this.machineID)
            const machine = data[p];
            if(!machine) throw new Error(`Machine Id does not exist`, `The Provided Machine Id is not registered in the db`)
            if(!this.master && this.totalMachines && this.totalShards){
                if(machine.totalMachines !== this.totalMachines) throw new Error(`MACHINE_INVALID_OPTION`, `JUST MASTER MACHINE CAN EDIT TOTAL MACHINE COUNT`)       
                if(machine.totalShards !== this.totalShards) throw new Error(`MACHINE_INVALID_OPTION`, `JUST MASTER MACHINE CAN EDIT TOTAL SHARD COUNT`)                          
                   
            }else{
                if(machine.totalShards !== this.totalShards && this.master){
                    this.emit(`debug`,`[Master] Updating total Shards from ${machine.totalShards} to ${this.totalShards}`);
                    for(let i = 0; i < data.length;i++){
                        data[i].totalShards = this.totalShards;
                        await data[i].save()
                        this.emit(`debug`, `[Warning] Machine ${data[i].machineID} needs a Restart! Update of totalShards count.`)
                    }
                }
                if(machine.totalMachines !== this.totalMachines && this.master){
                    mongoose.connection.db.dropCollection("clusterdata", (err, result) => {
                        console.log("[Master] Machine Value Edit | Reinitalizing Machine Counts and Data's");
                        this.emit(`debug`, `[Warning] All Machine needs a Restart! Breaking Updated`);
                        return;
                    })      
                }
            }
        }
        const processdata = await clusterdata.find({})
        if(!processdata[0]) return this.getData()
        const masterdata = processdata.find((m) => m.Master === true)
        const chunkSize = Math.ceil((masterdata.totalShards || this.totalShards)/(masterdata.totalMachines|| this.totalMachines));
        const shardList = [...Array((masterdata.totalShards || this.totalShards)).keys()];
        const shardMachineList = shardList.chunks(chunkSize);
        console.log(shardMachineList);
        this.emit(`debug`, `[Data] Got ShardList for all Machines: ${shardMachineList.join(', ')}`)
        this.shardList = shardMachineList[(this.machineID)];
        return {shardList: this.shardList, ShardsperCluster: this.ShardsperCluster, totalShards: masterdata.totalShards};
    }

    /**
    * Gives back how many clusters, we need
    * @param {string|number} shardAmount The Amount of Shards, which should be fit/allocated in a Cluster
    * @returns {clusterAmount}
    */
    ShardsperCluster(shardAmount){
        if(!shardAmount) throw new Error(`Shard Amount has not beed provided`);
        const clusterAmount = Math.ceil(this.shardList.length/shardAmount);
        return clusterAmount;
    }
    
    /**
    * Listens to MongoDb messages such as BroadcastEval or Normal Messages
    * @param {Object} manager the Shard/Cluster manager, which should be listened on.
    * @returns {manager}
    */
    listen(manager){
        if(!manager) throw new Error(`A Cluster Manager has not been provided`);
        this.manager = manager
        return this.manager;
    }

    /**
    * This removed given Machines
    * @param {string|number} machineID The machineID, which should be removed from the ClusterData
    * @returns {machine}
    */
    async deleteMachine(machineID){
        if(!machineID) throw new Error(`A MachineID has not been provided`);
        const machine = await clusterdata.findOneAndDelete({machineID: machineID})
        return machine;
    }


    /**
    * Handles the MongoDB change stream
    * <warn>You shouldnt need to call this manually.</warn>
    * @param {Object} [stream] The Object, which was delivered on the Stream
    * @returns {Promise<Message>}
    */
    async handleStream(stream){
        const data = stream.fullDocument
        if(!data) return;
        if(stream.operationType === 'insert'){
            if(data.broadcastEval){
                if(data.broadcastEval.request){
                    const response = await this.manager.broadcastEval(data.message, data.broadcastEval.targetShard).catch((e) => console.log(e));
                    message.findById({_id: data._id}).then(async (m) => {
                        m.broadcastEval.response = true;
                        m.response.push(response)
                        await m.save().catch(e => new Error(e));
                    })    
                }     
            }
        }
        const emitmessage = new EmitMessage(data);

        /**
        * Emitted upon recieving a message.
        * @event HostManager#message
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
             const request = new message({
                message: message,
                shard: {target: shard}
            })
            request.save().then((r) => resolve(r)).catch(e => reject(`[Error] ` +e))
        });
    }

}


module.exports = HostManager;


Object.defineProperty(Array.prototype, 'chunks', {
    value: function(chunkSize) {
      var R = [];
      for (var i = 0; i < this.length; i += chunkSize)
        R.push(this.slice(i, i + chunkSize));
      return R;
    }
});