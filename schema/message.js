const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    message: {type: String},
    broadcastEval: {
        response: {type: Boolean},
        request:  {type: Boolean},
        targetShard: {type: String}
    },
    shard: {
        id: {type: Number},
        target: {type: Number},
    },
    cluster: {
        id: {type: Number},
    },
    response: {type: Array},
},{ collection: 'messagedata' });

module.exports = mongoose.model('messagedata', messageSchema);