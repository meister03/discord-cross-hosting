class ShardClient {
    constructor(shard) {
        this.shard = shard;
    }

    /**
    * Evaluates a script or function on all machine, or a given shard, in the context of the {@link Client}s.
    * @param {string|Function} script JavaScript to run on each cluster
    * @param {number} [shard] Shard to run script on, all if undefined
    * @returns {Promise<*>|Promise<Array<*>>} Results of the script execution
    * @example
    * client.crosshost.broadcastEval('this.guilds.cache.size')
    *   .then(results => console.log(`${results.reduce((prev, val) => prev + val, 0)} total guilds`))
    *   .catch(console.error);
    * @see {@link CrosshostManager#broadcastEval}
    */
    async broadcastEval(script, options){
        if (!script) throw new Error('Script for BroadcastEvaling has not been provided!');
        script = typeof script === 'function' ? `(${script})(this)` : script;
        return this.shard.evalOnManager(`this.netipc.broadcastEval('${script}', ${options})`);
    }

    /**
    * Sends a message to all connected Machines.
    * @param {*} message The message, which should be sent.
    * @returns {Promise<request>}
    */
    async send(message) {
        return this.shard.evalOnManager(`this.netipc.send('${message}')`);
    }
}
module.exports = ShardClient;