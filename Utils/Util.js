const fetch = require('node-fetch');
const {DefaultOptions, Endpoints} = require('./Constants.js')

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
class Util {
  //Discord.js v12 Code | Credits: https://github.com/discordjs/discord.js/blob/v12/src/util/Util.js#L287
  /**
  * Sets default properties on an object that aren't already specified.
  * @param {Object} def Default properties
  * @param {Object} given Object to assign defaults to
  * @returns {Object}
  * @private
  */
  static mergeDefault(def, given) {
    if (!given) return def;
    for (const key in def) {
      if (!has(given, key) || given[key] === undefined) {
        given[key] = def[key];
      } else if (given[key] === Object(given[key])) {
        given[key] = this.mergeDefault(def[key], given[key]);
      }
    }
    return given;
  }

  //Discord.js v12 Code | Credits: https://github.com/discordjs/discord.js/blob/v12/src/util/Util.js#L346
  /**
  * Makes a plain error info object from an Error.
  * @param {Error} err Error to get info from
  * @returns {Object}
  * @private
  */
  static makePlainError(err) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }

  //Discord.js v12 Code | Credits: https://github.com/discordjs/discord.js/blob/v12/src/util/Util.js#L333
  /**
   * Makes an Error from a plain info object.
   * @param {Object} obj Error info
   * @param {string} obj.name Error type
   * @param {string} obj.message Message for the error
   * @param {string} obj.stack Stack for the error
   * @returns {Error}
   * @private
   */
  static makeError(obj) {
    const err = new Error(obj.message);
    err.name = obj.name;
    err.stack = obj.stack;
    return err;
  }

  /**
  * A Promise, which will be resolved after a specified duration.
  * @param {number} ms Milliseconds to wait until Promise will be resolved
  * @returns {Promise<void>}
  * @private
  */
  static delayFor(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  //Discord.js V12 Code | Credits: https://github.com/discordjs/discord.js/blob/v12/src/util/Util.js#L239
  /**
   * Gets the recommended shard count from Discord.
   * @param {string} token Discord auth token
   * @param {number} [guildsPerShard=1000] Number of guilds per shard
   * @returns {Promise<number>} The recommended number of shards
   */
  static fetchRecommendedShards(token, guildsPerShard = 1000) {
    if (!token) throw new Error('DISCORD_TOKEN_MISSING');
    return fetch(`${DefaultOptions.http.api}/v${DefaultOptions.http.version}${Endpoints.botGateway}`, {
      method: 'GET',
      headers: { Authorization: `Bot ${token.replace(/^Bot\s*/i, '')}` },
    })
      .then(res => {
        if (res.ok) return res.json();
        if (res.status === 401) throw new Error('DISCORD_TOKEN_INVALID');
        throw res;
      })
      .then(data => data.shards * (1000 / guildsPerShard));
  }


  //Discord.js V13 Code | Credits: https://github.com/discordjs/discord.js/blob/stable/src/sharding/ShardClientUtil.js#L234
  /**
  * Get the shard id for a given guild id.
  * @param {Snowflake} guildId Snowflake guild id to get shard id for
  * @param {number} shardCount Number of shards
  * @returns {number}
  */
  static shardIdForGuildId(guildId, shardCount) {
      const shard = Number(BigInt(guildId) >> 22n) % shardCount;
      if (shard < 0) throw new Error('SHARDING_SHARD_MISCALCULATION', shard, guildId, shardCount);
      return shard;
  }
}
module.exports = Util;