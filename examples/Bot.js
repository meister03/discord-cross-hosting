const Cluster = require('discord-hybrid-sharding');
const Discord = require('discord.js');
const client = new Discord.Client({
    intents: ['GUILDS'],
    shards: Cluster.data.SHARD_LIST,
    shardCount: Cluster.data.TOTAL_SHARDS,
});

client.cluster = new Cluster.Client(client);

////Initialize ClientMachine
const { Shard } = require('discord-cross-hosting');
client.machine = new Shard(client.cluster);

client.on('ready', () => {
    console.log('Client is ready');
    setInterval(() => {
        client.machine.request({ ack: true, message: 'Are you alive?' }).then(e => console.log(e));
    }, 10000);
});

client.cluster.on('message', message => {
    if (!message._sRequest) return;
    if (message.guildId && !message.eval) {
        const guild = client.guilds.cache.get(message.guildId);
        const customguild = {};
        customguild.id = guild.id;
        customguild.name = guild.name;
        customguild.icon = guild.icon;
        customguild.ownerId = guild.ownerId;
        customguild.roles = [...guild.roles.cache.values()];
        customguild.channels = [...guild.channels.cache.values()];
        message.reply({ data: customguild });
    }
});

client.login(process.env.token);
