const mongoose = require("mongoose");

const clusterSchema = new mongoose.Schema({
    Master: {type: Boolean},
    machineID: {type: Number},
    totalMachines:   {type: Number},
    totalShards:   {type: Number},
    totalClusters: {type: Number},
    shardClusterList: {type: Array},
    cluster: {type: Array},
    stats: {type: Array},
},{ collection: 'clusterdata' });

module.exports = mongoose.model('clusterdata', clusterSchema);