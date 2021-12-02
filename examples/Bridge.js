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