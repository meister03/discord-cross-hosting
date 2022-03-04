const { Client } = require('discord-cross-hosting');
const client = new Client({ agent: 'dashboard', host: 'localhost', port: 4423, authToken: 'xxx-auth-token' });

client.on('debug', console.log);
client.connect();
client.on('ready', () => {
    console.log('Client is ready');
});

///My Express stuff- custom code
/* Pseudo Code*/
const express = require('express');
const app = express();
app.listen(3000, () => {
    console.log('Listening on port 3000');
});
///listen to express event:
app.get('/guild/:id', async function (req, res) {
    const guildId = req.params.id;
    client
        .requestToGuild({ guildId })
        .then(e => res.send(e))
        .catch(e => res.send(e));
});
