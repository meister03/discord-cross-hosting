const { Client } = require('discord-cross-hosting');
const client = new Client({
    agent: 'bot',
    host: 'localhost',
    port: 4423,
    authToken: 'xxx-auth-token',
    retries: 360,
});
client.on('debug', console.log);
client.connect();

client.on('ready', () => {
    console.log('Client is ready');
});

const Cluster = require('discord-hybrid-sharding');
let { token } = require('./config.json');
const manager = new Cluster.Manager(`${__dirname}/bot.js`, {
    totalShards: 2,
    totalClusters: 2,
    token: token,
});
manager.on('clusterCreate', cluster => console.log(`Launched Cluster ${cluster.id}`));
manager.on('debug', console.log);

//Request ShardData from the Bridge
client
    .requestShardData()
    .then(e => {
        if (!e) return;
        manager.totalShards = e.totalShards;
        manager.totalClusters = e.shardList.length;
        manager.shardList = e.shardList;
        manager.spawn({ timeout: -1 });
    })
    .catch(e => console.log(e));

//Listen to the Manager Events
client.listen(manager);

client.on('bridgeMessage', message => {
    if (!message._sCustom) return; //If message is a Internal Message
    console.log(message);
});

client.on('bridgeRequest', message => {
    if (!message._sCustom && !message._sRequest) return; //If message is a Internal Message
    console.log(message);
    if (message.ack) return message.reply({ message: 'I am alive!' });
    message.reply({ data: 'Hello World' });
});
