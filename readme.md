# Discord-cross-hosting
The first package, which allows broadcastEvaling over Cross Hosted Machines and effecient Machine & Shard Managing.

# Features:
- BroadcastEval over cross-hosted Machines 
- Sending Messages to cross-hosted Machines
### Optional, if you want to use it:
- Combination of Internal Sharding & Sharding Manager -> less resources
- Machine & Shard Count Managing -> which Machine should host, which Shard...

# Guide:
1. How it works
2. Using the Package with Machine & Shard count Managing
3. Using the Package with Discord.js Sharding Manager or Discord-hybrid-sharding
4. Using the Package in Standalone Mode for just sending Messages

# How does it works?
For ensuring a fast, reliable and secure Connection, where you can also sent a ton of Data, followed to our Decision that we use MongoDB, which allows us sending messages and broadcastEval with a unlimited length and without needing a Main Server such as a TCP Server.

If you don't have a MongoDB Server, then you can create one for free under this link, which I also used for my tests.

# Test | Response Time & Results:
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

|BroadcastEval|Response Time|Response|
|`this.guilds.cache.size` 
