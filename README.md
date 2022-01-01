<p align="center"><a href="https://nodei.co/npm/discord-cross-hosting/"><img src="https://nodei.co/npm/discord-cross-hosting.png"></a></p>
<p align="center"><img src="https://img.shields.io/npm/v/discord-cross-hosting"> <img src="https://img.shields.io/npm/dm/discord-cross-hosting?label=downloads"> <img src="https://img.shields.io/npm/l/discord-cross-hosting"> <img src="https://img.shields.io/github/repo-size/meister03/discord-cross-hosting">  <a href="https://discord.gg/YTdNBHh"><img src="https://discordapp.com/api/guilds/697129454761410600/widget.png" alt="Discord server"/></a></p>

# Discord-cross-hosting
The first package, which allows broadcastEvaling over Cross Hosted Machines and effecient Machine & Shard Managing.

# Features:
- BroadcastEval over cross-hosted Machines (`functions with context` or `strings`)
- Sending Messages and custom Requests to cross-hosted Machines
- Machine & Shard Count/List Managing -> RollingRestart on Update
- Connected Services such as a Dashboard...
- Super Fast IPC with `.reply`, `.send`, `.request` options...

### See below for the Guide

**If you need help feel free to join our <a href="https://discord.gg/YTdNBHh">discord server</a>. We will provide you all help ☺**
# Download
You can download it from npm:
```cli
npm i discord-cross-hosting
```

| :warning: WARNING          |
|:---------------------------|
| This package had a massive rewrite and breaking changes, follow the Guide for adapting your code. Support under `^2.0.0` has been dropped.   |



# Guide:
1. **How it works**
2. **Test | Response Time & Results**
3. **Using the Package with Hybrid-Sharding & Machine, Shard Count Managing** 
4. **Use TLS for a secure Connection**
5. **Standalone Mode**
6. **Api References**
7. **Example**

## 1.How does it works?
For ensuring a fast, reliable and secure Connection, where you can also sent a ton of Data, followed to our decision that we changed to a TCP-Server. This opens up the opportunity to connect all your services to the same Server.
The TCP-Server is used as Bridge and as Control Unit for managing the Machine & Shard Count.

## 2.Test | Response Time & Results:
The following Test has been accomplished on 4 different hosted Machines with different Locations.
Each of the Machines had 2 Clusters (Process), which contained 2 internal Shards.
The test Object was a 20k Server Discord Bot. (Also has been tested with bots bigger than 70k)
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
        port: 4444, //The Port of the Server | Proxy Connection (Replit) needs Port 443
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
        setInterval(() => {server.broadcastEval('this.guilds.cache.size').then(console.log).catch(console.log)}, 10000)
    })
```
### 3.3 Cluster:
* The Cluster is the file, where the ShardingManager/ClusterManager is created.
* The ClusterManager connects to the Bridge and requests the Sharddata and it also proceeds the requests from the Bridge.
* The ClusterManager spawns Processes (aka Shard in Djs)(aka Cluster here), which contains Internal Shards
* For having 1 InternalShard per Process, the `shardsPerCluster` has to be `1` on the Bridge Options.
* The ClusterFile can be started at anytime with `node Cluster.js` and it will recieve the appropriated Shardlist and finally spawn them
* **This File will be hosted on your wished Machines with the bot.js file and your code**

Cluster | Cluster.js
```js
const {Client} = require('discord-cross-hosting');

const client = new Client({
    agent: 'bot', 
    host: "localhost", ///Domain without https
    port: 4444, ///Proxy Connection (Replit) needs Port 443
    //handshake: true, When Replit or any other Proxy is used
    authToken: 'theauthtoken',
    rollingRestarts: false, //Enable, when bot should respawn when cluster list changes.
});
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
    manager.clusterList = e.clusterList;
    manager.spawn({timeout: -1})
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

## 4. Using the Package with the `TLS` Option
* When using the package on a "open System" -> when you want to connect from different Machines on your IP/Domain, then a secure connection has to be ensured in order to prevent security flaws.
* This is done by using the `TLS` Option, which will be set to `true` on the Bridge & Client Options.
* The TLS Option can be used with:
  - [`PSK`](https://nodejs.org/api/tls.html#pre-shared-keys), which allows basic securtiy.
  - [`Certificate`](https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions) which requires a generated Certificate and a Private Key, but allows a high Security level.
* For futher Info and Control over the Options check the official [`TLS`](https://nodejs.org/api/tls.html) Documentation

### 4.1. `PSK` Mode:
```js
/* Bridge */
const server = new Bridge({ 
    port: 4423,
    authToken: 'xxx-auth-token', 
    totalShards: 2, 
    totalMachines: 1,
    shardsPerCluster: 2,
    tls: true,
    options: {
      pskCallback: (socket, identity) => {
        const key = Buffer.from("passwordhere");
        if(identity === "username") return key;
      },
      ciphers: "PSK",
    }
});

/* Machine */
const client = new Client({ 
    agent: 'bot', 
    host: "localhost", 
    port: 4423,
    authToken: 'xxx-auth-token', 
    retries: 360 ,
    tls: true,
    options: {
        pskCallback: () => {
          return { psk: Buffer.from("passwordhere"), identity: "username" }
        },
        ciphers: "PSK",
        checkServerIdentity: () => void 0,
    }
});
```
### 4.2. `Certificate` Mode:
```js
/* Bridge */
const server = new Bridge({ 
    port: 4423,
    authToken: 'xxx-auth-token', 
    totalShards: 2, 
    totalMachines: 1,
    shardsPerCluster: 2,
    tls: true,
    options: {
        key: fs.readFileSync(`path to certificate`),
        cert: fs.readFileSync(`path to certificate`),
    }
});

/*Machine */
const client = new Client({ 
    agent: 'bot', 
    host: "localhost", 
    port: 4423,
    authToken: 'xxx-auth-token', 
    retries: 360 ,
    tls: true,
});
```


## 5|6 Standalone Mode and Api-References is on work.

## 6. Temporary Api References:
* Check [`net-ipc`](https://npmjs.com/net-ipc) for all Bridge/Client related functions
### 6.1.1 Bridge `Options`:
| Option | Type | Description |
| ------------- | ------------- | ------------------------------------------------------ |
| authToken  | string |A User chosen Token for basic Authorization, when `tls` is disabled|
| shardsPerCluster  | number/1 |The total amount of Shards per Cluster/Process|
| totalShards  | number |The amount of Total Shards in all Machines|
| totalMachines  | number |The amount of Total Machines in order to chunk the ShardList|
| token  | string |The Discord Bot Token in order to fetch the recommanded ShardCount|
| shardList | array |A array of ShardIds to host on the connected Machines|

### 6.1.2 Bridge `Events`:
| Event |  Description |
| ------------- | -------------- |
| `ready`(url)  | Event fired when the Bridge is ready|
| `error`(error)  | Bridge Error|
| `connect`(client, initialdata) | Client, which connected to the bridge with their Initial Data|
| `disconnect`(client, reason)  |Client, which disconnected from the bridge with a providable reason|
| `clientMessage`(message, client)  | A Message, which is sent from a connected Client|
| `clientRequest`(message, client)  | A Request, which is sent from a connected Client and can be replied to with `message.reply()`|

### 6.1.3 Bridge `Functions`:
| Function |  Description |
| ------------- | -------------- |
| `start()`  | Starts the Bridge |
| `broadcastEval(script=string, options={filter: (c => c.agent === 'bot')})` | Evaluates a script or function on all clusters, or a given cluster, in the context of the Client |
| `requestToGuild(message = {})` | Sends a Request to the Guild and returns the reply, which can be answered with .reply |

### 6.2.1 Client (Machine) `Options`:
| Option | Type | Description |
| ------------- | ------------- | ------------------------------------------------------ |
| `authToken`  | string |A User chosen Token for basic Authorization, when `tls` is disabled|
| `agent`  | string=`bot` | The service name in order to identify the Clients|
| `rollingRestarts`| boolean=false | If the Clusters should be updated, when the Bridge updates the ShardList|

### 6.2.2 Client `Events`:
| Event |  Description |
| ------------- | -------------- |
| `ready`(data)  | Event fired when the Client is ready|
| `error`(error)  | Client Error|
| `bridgeMessage`(message, client)  | A Message, which is sent from the Bridge |
| `bridgeRequest`(message, client)  | A Request, which is sent from the Bridge and can be replied to with `message.reply()`|

### 6.2.3 Client `Functions`:
| Function |  Description |
| ------------- | -------------- |
| `connect(initialdata= {})`  | Connect to the Bridge with some Initial Data|
| `requestShardData()`  | Request some Shard and Important Data from the Bridge. |
| `listen(manager=HYBRID_SHARDING_MANAGER)` | Listens to the Hybrid-Sharding-Manager |
| `broadcastEval(script=string, options={filter: (c => c.agent === 'bot')})` | Evaluates a script or function on all clusters, or a given cluster, in the context of the Client |
|`send(message ={}, options ={})`| Sends a Message to the Bridge|
|`request(message ={}, options ={})`| Sends a Request to the Bridge and returns the reply|
| `requestToGuild(message = {})` | Sends a Request to the Guild and returns the reply, which can be answered with .reply |

### 6.3.1 Bot (Shard) `Options`: No Options are needed.
### 6.3.2 Bot (Shard) `Events`: Listen to [Hybrid-Sharding-Events](https://npmjs.com/discord-hybrid-sharding)

### 6.3.3 Bot (Shard) `Functions`:
| Function |  Description |
| ------------- | -------------- |
| `broadcastEval(script=string, options={filter: (c => c.agent === 'bot')})` | Evaluates a script or function on all clusters, or a given cluster, in the context of the Client |
|`send(message ={}, options ={})`| Sends a Message to the Bridge|
|`request(message ={}, options ={})`| Sends a Request to the Bridge and returns the reply|
|`requestToGuild(message = {})` | Sends a Request to the Guild and returns the reply, which can be answered with .reply |


## 7.Example:
As an example, We will show you how to use the Package with a Bot, Dashboard...
Bridge:
```js
const {Bridge} = require('discord-cross-hosting');
const server = new Bridge({ 
    port: 4423,
    authToken: 'xxx-auth-token', 
    totalShards: 2, 
    totalMachines: 1,
    shardsPerCluster: 2
});
server.on('debug', console.log)
server.start();

server.on('ready', (url) => {
    console.log('Server is ready' + url);
    setInterval(() => {server.broadcastEval('this.guilds.cache.size').then(e => console.log(e))}, 10000)
})

server.on('clientMessage', (message)=>{
    if(!message._sCustom) return; //If message is a Internal Message
    console.log(message)
})

server.on('clientRequest', (message)=>{
    if(!message._sCustom && !message._sRequest) return; //If message is a Internal Message
    if(message.ack) return message.reply({message: 'I am alive!'})
    console.log(message)
    message.reply({data: 'Hello World'});
})
```

Cluster:
```js
const {Client} = require('discord-cross-hosting');
const client = new Client({ 
    agent: 'bot', 
    host: "localhost", 
    port: 4423,
    authToken: 'xxx-auth-token', 
    retries: 360 ,
    rollingRestarts: false,
});
client.on('debug', console.log)
client.connect();

client.on('ready', () => {
    console.log('Client is ready');
})

const Cluster = require("discord-hybrid-sharding");
let { token } = require("./config.json");
const manager = new Cluster.Manager(`${__dirname}/bot.js`, {
    totalShards: 2,
    totalClusters: 2,
    token: token,
})
manager.on('clusterCreate', cluster => console.log(`Launched Cluster ${cluster.id}`));
manager.on('debug', console.log)

///Request ShardData from the Bridge
client.requestShardData().then(e => {
    if (!e) return;
    manager.totalShards = e.totalShards;
    manager.totalClusters = e.shardList.length;
    manager.shardList = e.shardList;
    manager.clusterList = e.clusterList;
    manager.spawn({timeout:  -1})
}).catch(e => console.log(e));

//Listen to the Manager Events
client.listen(manager);

client.on('bridgeMessage', (message)=>{
    if(!message._sCustom) return; //If message is a Internal Message
    console.log(message)
})

client.on('bridgeRequest', (message)=>{
    if(!message._sCustom && !message._sRequest) return; //If message is a Internal Message
    console.log(message)
    if(message.ack) return message.reply({message: 'I am alive!'})
    message.reply({data: 'Hello World'});
})
```

Bot:
```js
const Cluster = require("discord-hybrid-sharding");
const Discord = require("discord.js");
const client = new Discord.Client({
    intents: ['GUILDS'],
 	shards: Cluster.data.SHARD_LIST,        
	shardCount: Cluster.data.TOTAL_SHARDS, 
});


client.cluster = new Cluster.Client(client); 

////Initalize ClientMachine
const {Shard} = require('discord-cross-hosting');
client.machine = new Shard(client.cluster);

client.on('ready', () =>{
    console.log('Client is ready')
    setInterval(() => {client.machine.request({ack: true, message: 'Are you alive?'}).then(e => console.log(e))}, 10000)
});

client.cluster.on('message', (message) => {
	if(!message._sRequest) return;
    if(message.guildId && !message.eval){
		const guild = client.guilds.cache.get(message.guildId);
		const customguild = {};
		customguild.id = guild.id;
		customguild.name = guild.name;
		customguild.icon = guild.icon;
		customguild.ownerId = guild.ownerId;
		customguild.roles = [...guild.roles.cache.values()];
		customguild.channels = [...guild.channels.cache.values()];
		message.reply({data: customguild});
	}
})

client.login(process.env.token);
```

Dashboard:
```js
const {Client} = require('discord-cross-hosting');
const client = new Client({agent: 'dashboard', host: "localhost", port: 4423, authToken: 'xxx-auth-token'});

client.on('debug', console.log)
client.connect();
client.on('ready', ( ) => {
    console.log('Client is ready');
})

///My Express stuff- custom code
/* Pseodo Code*/
const express = require('express');
const app = express();
app.listen(3000, () => {console.log('Listening on port 3000')});
///listen to express event:
app.get('/guild/:id', async function (req, res) {
    const guildId = req.params.id; 
    client.requestToGuild({ guildId: guildId }).then(e => res.send(e)).catch(e => res.send(e));
})
```

**Have fun and feel free to Contribute/Suggest or Contact me on my [Discord server](https://discord.gg/QMTwmMZ) or per DM on Meister#9667**

## Bugs, Glitches and Issues
If you encounter any problems feel free to open an issue in our <a href="https://github.com/meister03/discord-cross-hosting/issues">github repository or join the discord server.</a>