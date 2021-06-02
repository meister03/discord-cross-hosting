class Message{
    constructor(data){
        this._data = data;
        this.message = data.message
        this.shard = data.shard || {};
        this.cluster = data.cluster || {};
        this.broadcastEval = data.broadcastEval || {request: false};
        this.timestamp = Date.now();
        this.deleted = false;
    }
    async delete(){
      this.deleted = true;
      return this._data.remove().catch((e) => new Error(e))
    }
    async update(){
        this._data.message = data.message;
        this._data.shard = data.shard;
        this._data.cluster = data.cluster;
        return this._data.save().catch((e) => new Error(e))
    }
}
module.exports = Message;