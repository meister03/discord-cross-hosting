const { Shard } = require('discord-cross-hosting');
const Cluster = require('discord-hybrid-sharding');
const Discord = require('discord.js');

const client = new Discord.Client({
    intents: ['GUILDS'],
    shards: Cluster.data.SHARD_LIST,
    shardCount: Cluster.data.TOTAL_SHARDS,
});

client.cluster = new Cluster.Client(client);

// Initialize ClientMachine
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
        const customGuild = {};
        customGuild.id = guild.id;
        customGuild.name = guild.name;
        customGuild.icon = guild.icon;
        customGuild.ownerId = guild.ownerId;
        customGuild.roles = [...guild.roles.cache.values()];
        customGuild.channels = [...guild.channels.cache.values()];
        message.reply({ data: customGuild });
    }
});

client.login(process.env.token);
