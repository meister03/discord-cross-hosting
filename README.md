<p align="center"><a href="https://nodei.co/npm/discord-cross-hosting/"><img src="https://nodei.co/npm/discord-cross-hosting.png"></a></p>
<p align="center"><img src="https://img.shields.io/npm/v/discord-cross-hosting"> <img src="https://img.shields.io/npm/dm/discord-cross-hosting?label=downloads"> <img src="https://img.shields.io/npm/l/discord-cross-hosting"> <img src="https://img.shields.io/github/repo-size/meister03/discord-cross-hosting">  <a href="https://discord.gg/YTdNBHh"><img src="https://discordapp.com/api/guilds/697129454761410600/widget.png" alt="Discord server"/></a></p>

# Discord-cross-hosting
The first package, which allows broadcastEvaling over Cross Hosted Machines and effecient Machine & Shard Managing.

# Features:
- BroadcastEval over cross-hosted Machines 
- Sending Messages to cross-hosted Machines
- Machine & Shard Count/List Managing -> RollingRestart on Update
- Connect Services such as a Dashboard...

### See below for the Guide

**If you need help feel free to join our <a href="https://discord.gg/YTdNBHh">discord server</a>. We will provied you all help ☺**
# Download
You can download it from npm:
```cli
npm i discord-cross-hosting
```

This package had a massive rewrite and breaking changes, follow the Guide for adapting your code.

# Guide:
1. **How it works**
2. **Test | Response Time & Results**
3. **Using the Package with Hybrid-Sharding & Machine, Shard Count Managing** 
4. **Standalone Mode**
5. **Api References**

## 1.How does it works?
For ensuring a fast, reliable and secure Connection, where you can also sent a ton of Data, followed to our Decision that we changed to a TCP-Server. This opens up the opportunity to connect all your services to the same Server.
The TCP-Server is used as Bridge and as Control Unit for managing the Machine & Shard Count.

## 2.Test | Response Time & Results:
The following Test has been accomplished on 4 different hosted Machines with different Locations.
Each of the Machines had 2 Clusters (Process), which contained 2 internal Shards.
The test Object was a 20k Server Discord Bot.
- Total Machines: 4
- Total Clusters: 8
- Total Shards: 16
- Discord Bot: 20000 Servers
- Test performed: 100 times
### Test 1 | Sending Messages:
All Shards recieved a random long Message sent from a Machine in less than `7-18 milliseconds`
### Test 2 | BroadcastEval:
The amount of data does not influence the time so much. Overall the time shows a very good perfomance.
| BroadcastEval:                | Response Time |
| ------------------------------| ------------- |
| Math Evalution                | `7-12 ms`     |
|`this.guilds.cache.size`       | `19-24 ms`    |
|`this.guilds.cache.get('123')` | `22-27 ms`    |
|`...this.guilds.cache.values()`| `21-44 ms`    | 
|`this`,Guilds,Roles,Channels...| `25-48 ms`    |

## 3.Using the Package with Hybrid-Sharding & Machine,Shard Count Managing 
### This Feature can only be used with `discord-hybrid-sharding`
This is the most comfortable Solution, when you are taff on manually managing, creating Shard list. 
Another Advantage is, that you are combining Internal Sharding and Normal Sharding, which follows to less resources, also known as Clustering.

### 3.1. How many processes are needed?
* There will be 3 important files: Bridge (`Server.js`), Cluster (`Cluster.js`), Bot (`Bot.js`)
### 3.2 Bridge:
* The Bridge is the main unit, which calculates the ShardList, recieves the requests and sends the responses (BroadcastEval).
* The Bridge should run 24/7 as it is required for the communication between the Clusters and the Bot.
* Start the Bridge with `node Server.js` and you will recieve some Debug Messages in your Console
Bridge | Server.js
```js
    const {Bridge} = require('discord-cross-hosting');

    const server = new Bridge({ 
        port: 3333, //The Port of the Server
        authToken: 'Your_auth_token_same_in_cluster.js', 
        totalShards: 40, //The Total Shards of the Bot or 'auto'
        totalMachines: 2, //The Total Machines, where the Clusters will run
        shardsPerCluster: 10, //The amount of Internal Shards, which are in one Cluster
        token: 'Your_Bot_Token',
    });

    server.on('debug', console.log)
    server.start();
    server.on('ready', (url) => {
        console.log('Server is ready' + url);   
        setInterval(() => {server.broadcastEval('this.guilds.cache.size').then(e => console.log(e))}, 10000)
    })
```
### 3.3 Cluster:
* The Cluster is the file, where the ShardingManager/ClusterManager is.
* The ClusterManager connects to the Bridge and requests the Sharddata and it also proceeds the requests from the Bridge.
* The ClusterManager spawns Processes (aka Shard in Djs)(aka Cluster here), which contains Internal Shards
* For having 1 InternalShard per Process, the `shardsPerCluster` has to be `1` on the Bridge Options.
* The ClusterFile can be started at anytime with `node Cluster.js` and it will recieve the appropriated Shardlist and finally spawn them
* **This File will be hosted on your wished Machines with the bot.js file and your code**

Cluster | Cluster.js
```js
const {Client} = require('discord-cross-hosting');

const client = new Client({agent: 'bot', url: "localhost:3333", authToken: 'theauthtoken'});
client.on('debug', console.log)
client.connect();

const Cluster = require("discord-hybrid-sharding");
const manager = new Cluster.Manager(`${__dirname}/bot.js`,{totalShards: 1 ,totalClusters: 'auto'}) //Some dummy Data
manager.on('clusterCreate', cluster => console.log(`Launched Cluster ${cluster.id}`));
manager.on('debug', console.log)

client.listen(manager);
client.requestShardData().then(e => {
    if(!e) return;
    if(!e.shardList) return;
    manager.totalShards = e.totalShards;
    manager.totalClusters = e.shardList.length;
    manager.shardList = e.shardList;
    manager.spawn(undefined,undefined,-1)
}).catch(e => console.log(e));
```

### 3.4 Bot:
* This will be your bot.js file, where the bot code is hosted.
* This file is spawned from the ClusterManager

Bot | Bot.js
```js
const Cluster = require("discord-hybrid-sharding");
const Discord = require("discord.js");
const client = new Discord.Client({
    intents: ['GUILDS'], //Your Intents
 	shards: Cluster.data.SHARD_LIST,        //  A Array of Shard list, which will get spawned
	shardCount: Cluster.data.TOTAL_SHARDS, // The Number of Total Shards
});

client.cluster = new Cluster.Client(client); .

const {Shard}= require('discord-cross-hosting');
client.machine = new Shard(client.cluster); //Initalize Cluster

client.on('ready', () => {
	client.machine.broadcastEval(`this.guilds.cache.size`).then(results => {
		console.log(results);
	}).catch(e => console.log(e))  ///BroadcastEval over all Cross-hosted Clients
})

client.login(process.env.token);
```

### 3.5 How can I use the Feature?
* Start the Bridge at first and the Cluster (on all machines you want) with `node Server.js` and `node Cluster.js`
* When you now change the ShardCount or the options of the Bridge and restart it, it will send a message to all connected Clusters, which will update the Shardlist and restart the Clusters, when the ShardList changed.
* You can broadcastEval from the bridge, from the ClusterManager and from the Client

## Standalone Mode and Api-References is on work.

**Have fun and feel free to Contribute/Suggest or Contact me on my Discord server or per DM on Meister#9667**

## Bugs, Glitches and Issues
If you encounter any problems feel free to open an issue in our <a href="https://github.com/meister03/discord-hybrid-sharding/issues">github repository or join the discord server.</a>