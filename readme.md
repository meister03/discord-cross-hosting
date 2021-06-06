<p align="center"><a href="https://nodei.co/npm/discord-cross-hosting/"><img src="https://nodei.co/npm/discord-cross-hosting.png"></a></p>
<p align="center"><img src="https://img.shields.io/npm/v/discord-cross-hosting"> <img src="https://img.shields.io/npm/dm/discord-cross-hosting?label=downloads"> <img src="https://img.shields.io/npm/l/discord-cross-hosting"> <img src="https://img.shields.io/github/repo-size/meister03/discord-cross-hosting">  <a href="https://discord.gg/YTdNBHh"><img src="https://discordapp.com/api/guilds/697129454761410600/widget.png" alt="Discord server"/></a></p>

# Discord-cross-hosting
The first package, which allows broadcastEvaling over Cross Hosted Machines and effecient Machine & Shard Managing.

# Features:
- BroadcastEval over cross-hosted Machines 
- Sending Messages to cross-hosted Machines
### Optional, if you want to use it:
- Combination of Internal Sharding & Sharding Manager | Hybrid-Sharding -> less resources
- Machine & Shard Count Managing -> which Machine should host, which Shard...

### See below for the Guide

**If you need help feel free to join our <a href="https://discord.gg/YTdNBHh">discord server</a>. We will provied you all help ☺**
# Download
You can download it from npm:
```cli
npm i discord-cross-hosting
```

# Guide:
1. **How it works**
2. **Test | Response Time & Results**
3. **Using the Package with Hybrid-Sharding & Machine, Shard Count Managing** 
4. **Using the Package with Discord.js Sharding Manager & Machine/Shard Managing**
5. **Using the Package in Standalone Mode for just sending Messages**
6. **Api References | Very Important !!!**

## 1.How does it works?
For ensuring a fast, reliable and secure Connection, where you can also sent a ton of Data, followed to our Decision that we use MongoDB, which allows us sending messages and broadcastEval with a unlimited length and without needing a Main Server such as a TCP Server.

If you don't have a MongoDB Server, then you can create one for free under [this link](https://account.mongodb.com/account/register), which I also used for my tests.

## 2.Test | Response Time & Results:
The following Test has been accomplished on 4 different hosted Machines with different Places.
Each of the Machines had 2 Clusters (Process), which contained 2 internal Shards.
The test Object was a 20k Server Discord Bot.
- Total Machines: 4
- Total Clusters: 8
- Total Shards: 16
- Discord Bot: 20000 Servers
- Test performed: 100 times
### Test 1 | Sending Messages:
All Shards recieved a random long Message sent from a Machine in less than `12-19 milliseconds`
### Test 2 | BroadcastEval:
The Results seem to be good, assuming how much data we recieved. When your MongoDB Server and your Host are good, then the Response Time can be much more better.
| BroadcastEval:                | Response Time |
| ------------------------------| ------------- |
| Math Evalution                | `121-197 ms`  |
|`this.guilds.cache.size`       | `176-291 ms`  |
|`this.guilds.cache.get('123')` | `221-373 ms`  |
|`...this.guilds.cache.values()`| `582-776 ms`  | 
|`this`,Guilds,Roles,Channels...| `1100-1600 ms`|

## 3.Using the Package with Hybrid-Sharding & Machine,Shard Count Managing 
This is the most comfortable Solution, when you are taff on manually managing, creating Shard list. 
Another Advantage is, that you are combining Internal Sharding and Normal Sharding, which follows to less resources, also known as Clustering.

**Want to use the normal Sharding Manager? Then scroll down!**

### Important Notes:
Please read this carefully through since it contains a lot of important Information.
- Machine ID's start from 0 and there can be no Gaps. E.g: 0,1,2
- The Master Machine has the Machine ID 0 and the Initalization can just be perfomed on the Master Machine
- Changing the Machine Count or Shard Count requires a manual restart on all Machines
- You can just init, reinit or update values, such as above, on the Master Machine

This Example will have two Machines, Master Machine 0 & Machine 1.

**First start the Master Machine 0 File for first Initalization**

In Machine 0 | cluster.js
```js
const {Manager} = require('discord-cross-hosting');
const Cluster = require("discord-hybrid-sharding");

const crosshost = new Manager(`Your MongoDB Connection Url`, {
    totalShards: 4,    //The Amount of Total Shards 
    totalMachines: 2, // The Amount of the Machines, you want to host it
    machineID: 0,    //  The Machine ID
    master: true,   //   Master on true for Initalizing
})
start()

async function start(){
  const data = await crosshost.getData();
  const manager = new Cluster.Manager(`${__dirname}/bot.js`,{
        totalShards: data.totalShards ,
        shardList: data.shardList,
        totalClusters: data.ShardsperCluster(`How many Shards are in one Process`), 
        mode: "process" ,  
        token: token,
   })
   crosshost.listen(manager); //Listen to Messages and BroadcastEval

   manager.on('clusterCreate', cluster => console.log(`Launched Cluster ${cluster.id}`));

   manager.spawn(undefined, undefined, -1); //Spawn the Clusters
}

crosshost.on('debug', console.log); ///Recieve Important Messages
```
Bot.js file in Machine 0:
```js
const Crosshost = require(`discord-cross-hosting`)
const Cluster = require("discord-hybrid-sharding");
const Discord = require('discord.js')
const client = new Discord.Client({});

client.cluster = new Cluster.Client(client); //For Cluster Data and more
client.crosshost = new Crosshost.Client(`MongoDB Connection Url`, {
	totalMachines: 2,            //The Total Amount of Machines
	TimeoutforResponses: 10000, ///After how many milliseconds the broadcastEval will be resolved, with no response
});
client.crosshost.listen();

client.on('ready', async () => {
	console.log(`Shards ${client.shard.ids.keys()} are ready!`)
	if(client.cluster.id === 0 && client.cluster.ids.has(0)){
		setTimeout(async () => {
				const result = await client.crosshost.broadcastEval(`this.guilds.cache.size`)
                console.log(result)
		}, 10000);
	}
})
crosshost.on('message',console.log);
```
The Code Example above gives how the files in the Master Machine looks
- The Bot.js file looks same on all machines, like on the Example.

When your totalMachines is more than the Example, all Machines excluding the Master Machine, will have the same file style, like below. Just change the machineID

Machine 1 | cluster.js File 
```js
const {Manager} = require('discord-cross-hosting');
const Cluster = require("discord-hybrid-sharding");

const crosshost = new Manager(`Your MongoDB Connection Url`, {
    machineID: 1,    //  The Machine ID
    master: true,   //   Master on true for Initalizing
})
start()
async function start(){
  const data = await crosshost.getData();
  const manager = new Cluster.Manager(`${__dirname}/bot.js`,{
        totalShards: data.totalShards ,
        shardList: data.shardList,
        totalClusters: data.ShardsperCluster(`How many Shards are in one Process`), 
        mode: "process" ,  
        token: token,
   })
   crosshost.listen(manager); //Listen to Messages and BroadcastEval

   manager.on('clusterCreate', cluster => console.log(`Launched Cluster ${cluster.id}`));

   manager.spawn(undefined, undefined, -1); //Spawn the Clusters
}
crosshost.on('debug', console.log); ///Recieve Important Messages
```
WoW! Thats it, when you want to broadcastEval over all Machines just do `client.crosshost.broadcastEval`.

In addition, you are now using Hybrid-Sharding. You will see a difference in your ressource usage!



## 4.Using the Package with Discord.js Sharding Manager & Machine/Shard Managing
This Package can also be used for managing Shards with the normal Sharding Manager or broadcasting


### Important Notes:
Please read this carefully through since it contains a lot of important Information.
- Machine ID's start from 0 and there can be no Gaps. E.g: 0,1,2
- The Master Machine has the Machine ID 0 and the Initalization can just be perfomed on the Master Machine
- Changing the Machine Count or Shard Count requires a manual restart on all Machines
- You can just init, reinit or update values, such as above, on the Master Machine

This Example will have two Machines, Master Machine 0 & Machine 1.
**First start the Master Machine 0 File for first Initalization**

In Machine 0 | shard.js
```js
const {Manager} = require('discord-cross-hosting');
const { ShardingManager } = require('discord.js');

const crosshost = new Manager(`Your MongoDB Connection Url`, {
    totalShards: 4,    //The Amount of Total Shards 
    totalMachines: 2, // The Amount of the Machines, you want to host it
    machineID: 0,    //  The Machine ID
    master: true,   //   Master on true for Initalizing
})
start()

async function start(){
  const data = await crosshost.getData();

  const manager = new ShardingManager('./bot.js', { 
      totalShards: data.totalShards ,
      shardList: data.shardList,
      token: token 
  });
  
   crosshost.listen(manager); //Listen to Messages and BroadcastEval

   manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));
   manager.spawn(undefined, undefined, -1);
}

crosshost.on('debug', console.log); ///Recieve Important Messages
```
Bot.js file in Machine 0:
```js
const Crosshost = require(`discord-cross-hosting`);
const Discord = require('discord.js')
const client = new Discord.Client({});

client.crosshost = new Crosshost.Client(`MongoDB Connection Url`, {
	totalMachines: 2,            //The Total Amount of Machines
	TimeoutforResponses: 10000, ///After how many milliseconds the broadcastEval will be resolved, with no response
});
client.crosshost.listen()

client.on('ready', async () => {
	console.log(`Shards ${client.shard.id} is ready!`)
	if(client.cluster.id === 0 && client.cluster.ids.has(0)){
		setTimeout(async () => {
				const result = await client.crosshost.broadcastEval(`this.guilds.cache.size`)
                console.log(result)
		}, 20000);
	}
})
crosshost.on('message',console.log);
```
The Code Example above gives how the files in the Master Machine looks
- The Bot.js file looks same on all machines, like on the Example.

When your totalMachines is more than the Example, all Machines excluding the Master Machine, will have the same file style, like below. Just change the machineID

Machine 1 | shard.js File 
```js
const {Manager} = require('discord-cross-hosting');
const { ShardingManager } = require('discord.js');

const crosshost = new Manager(`Your MongoDB Connection Url`, {
    machineID: 1,    //  The Machine ID
    master: true,   //   Master on true for Initalizing
})
start()

async function start(){
  const data = await crosshost.getData();

  const manager = new ShardingManager('./bot.js', { 
      totalShards: data.totalShards ,
      shardList: data.shardList,
      token: token 
  });
  
   crosshost.listen(manager); //Listen to Messages and BroadcastEval

   manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));
   manager.spawn(undefined, undefined, -1);
}

crosshost.on('debug', console.log); ///Recieve Important Messages
```
WoW! Thats it, when you want to broadcastEval over all Machines, just do `client.crosshost.broadcastEval`.


## 5.Using the Package in Standalone Mode for just sending Messages

When you just want to send messages, like from your Api (E.g Welcome Api) to your bot, then listen to the crosshost message event.

You can send messages through `crosshost.send('My Cool Message', targetShard)`

Macine 1,2,3,4...
```js
const Crosshost = require(`discord-cross-hosting`);
crosshost = new Crosshost.Client(`MongoDB Connection Url`, {
	totalMachines: 2,            //The Total Amount of Machines
	TimeoutforResponses: 10000, ///After how many milliseconds the broadcastEval will be resolved, with no response
});
crosshost.listen()
crosshost.send(`hello`)
crosshost.on('message',console.log); //Log out all messages -> e.g Logs on every connectd Machine [Object with .message hello]
```

## 6. Api References


`new Crosshost.Manager(MongodbConnectionUrl,options)`

|    Options    |     Type      |    Default    |   Description |
| ------------- | ------------- | ------------- | ------------- |
| totalShards   | number/string |    'auto'     | The Number of Internal Shards, which should be spawned |
| totalMachines | number/string |   required    | The Number of Total Machines, where the totalShards are spawned |
| MachineID     | number/string |   required    | The Machine ID of the Machine, E.g 2xMachines => Machine ID's = 0,1 |
| master        | Boolean       |    false      | If the Machine is master and is able to change values |
| token         | string        | not-required  | The Bot token is just required, when you set the totalShards on auto |

`new Crosshost.Client(MongoDbConnectionUrl, options)`

|    Options             |     Type      |    Default    |   Description |
| -----------------------| ------------- | ------------- | ------------- |
| totalMachines          | number/string |   required    | The Number of Total Machines, to know the amount of Responses, which should be recieved |
| TimeoutforResponses    | number        |   required    | The Amount of Milliseconds to wait, until all Responses has been recieved |

**Have fun and feel free to Contribute/Suggest or Contact me on my Discord server or per DM on Meister#9667**

## Bugs, Glitches and Issues
If you encounter any problems feel free to open an issue in our <a href="https://github.com/meister03/discord-hybrid-sharding/issues">github repository or join the discord server.</a>
