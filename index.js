const { Server } = require("net-ipc");
const Message = require("./Structures/Message.js");
const Client = require("./Structures/Client.js");
const handler = new (require("./Managers/MessageHandler.js"))();
const clients = new Map();

const server = new Server({
   path: "testipc", 
});

server.on("ready", url => {
    console.log(`server started on ${url}`);
});

server.on("error", console.error);

server.on("connect", (client, data) => {
    client = new Client(client, data)
    clients.set(client.id, client);
    console.log(`[CONNECT][CLIENT][${data.agent}] ID: ${client.id}`);
   //console.log(`[INITIAL_DATA] ${data}`);
});

server.on("disconnect", (client, reason) => {
    clients.delete(client.id);
    console.log(`[DISCONNECT][CLIENT] ID: ${client.id} | Reason: ${reason}`);
});

server.on("message", async (message, client) => {
    client = clients.get(client.id) || client;
    message = new Message(message, client);
    console.log(`[MESSAGE][CLIENT] ID: ${client.id} | Message: ${message}`);
    return handler.onMessage(message);
});

server.on("request", (req, res, client) => {
    console.log(`[REQUEST][CLIENT] ID: ${client.id} | Request: ${req}`);
    return handler.onRequest(req, res, client);
});




server.start().catch(console.error);

