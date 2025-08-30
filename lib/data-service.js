'use strict';

const { songsClient, usersClient } = require('./redis-clients');
const { promisify } = require('util');

/**
 * Base class for data managers that provides dual callback/async support
 */
class DataManager {
  constructor(client) {
    this.client = client;
  }

  /**
   * Helper method that supports both callback and async patterns
   * @param {Function} operation - The async operation to execute
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise|undefined} - Returns promise if no callback, undefined if callback provided
   */
  async _execute(operation, callback) {
    if (callback && typeof callback === 'function') {
      // Callback pattern
      try {
        const result = await operation();
        callback(null, result);
      } catch (err) {
        callback(err);
      }
      return;
    }
    
    // Promise/async pattern
    return operation();
  }
}

/**
 * Song data manager - handles all song and room related Redis operations
 */
class SongDataManager extends DataManager {
  constructor(client) {
    super(client);
    // Promisify client methods for async/await support
    this.clientAsync = {
      zCard: promisify(client.zCard).bind(client),
      zRange: promisify(client.zRange).bind(client),
      hGetAll: promisify(client.hGetAll).bind(client),
      hmGet: promisify(client.hmGet).bind(client),
      hSet: promisify(client.hSet).bind(client),
      hGet: promisify(client.hGet).bind(client),
      zAdd: promisify(client.zAdd).bind(client),
      zRem: promisify(client.zRem).bind(client),
      zScore: promisify(client.zScore).bind(client),
      exists: promisify(client.exists).bind(client),
      del: promisify(client.del).bind(client),
      keys: promisify(client.keys).bind(client)
    };
  }

  /**
   * Get the number of tracks in a room
   * @param {string} roomName - The room name
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<number>|undefined} - Number of tracks or undefined if callback used
   */
  getRoomTrackCount(roomName, callback) {
    return this._execute(async () => {
      return await this.clientAsync.zCard(roomName);
    }, callback);
  }

  /**
   * Get tracks from a room with range
   * @param {string} roomName - The room name
   * @param {number} start - Start index
   * @param {number} end - End index
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<Array>|undefined} - Array of track IDs or undefined if callback used
   */
  getRoomTracks(roomName, start, end, callback) {
    return this._execute(async () => {
      return await this.clientAsync.zRange(roomName, start, end);
    }, callback);
  }

  /**
   * Get a single track from a room by index
   * @param {string} roomName - The room name
   * @param {number} index - Track index
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<Array>|undefined} - Array with single track ID or undefined if callback used
   */
  getRoomTrackByIndex(roomName, index, callback) {
    return this._execute(async () => {
      return await this.client.zRange(roomName, index, index);
    }, callback);
  }

  /**
   * Get song metadata
   * @param {string} trackId - The track ID
   * @param {Array<string>} [fields] - Specific fields to retrieve, or all if not specified
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<Object|Array>|undefined} - Song metadata or undefined if callback used
   */
  getSongMetadata(trackId, fields, callback) {
    // Handle overloaded parameters (fields is optional)
    if (typeof fields === 'function') {
      callback = fields;
      fields = null;
    }

    return this._execute(async () => {
      const key = `song:${trackId}`;
      if (fields && Array.isArray(fields)) {
        return await this.client.hmGet(key, fields);
      } else {
        return await this.client.hGetAll(key);
      }
    }, callback);
  }

  /**
   * Set song metadata
   * @param {string} trackId - The track ID
   * @param {Object} metadata - Metadata object
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<string>|undefined} - Redis response or undefined if callback used
   */
  setSongMetadata(trackId, metadata, callback) {
    return this._execute(async () => {
      const key = `song:${trackId}`;
      return await this.client.hSet(key, metadata);
    }, callback);
  }

  /**
   * Check if a song exists
   * @param {string} trackId - The track ID
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<boolean>|undefined} - True if exists or undefined if callback used
   */
  songExists(trackId, callback) {
    return this._execute(async () => {
      const key = `song:${trackId}`;
      const result = await this.client.exists(key);
      return result === 1;
    }, callback);
  }

  /**
   * Add a track to a room
   * @param {string} roomName - The room name
   * @param {string} trackId - The track ID
   * @param {number} score - The score for sorting
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<number>|undefined} - Number of elements added or undefined if callback used
   */
  addTrackToRoom(roomName, trackId, score, callback) {
    return this._execute(async () => {
      return await this.client.zAdd(roomName, [{ score, value: trackId }]);
    }, callback);
  }

  /**
   * Remove a track from a room
   * @param {string} roomName - The room name
   * @param {string} trackId - The track ID
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<number>|undefined} - Number of elements removed or undefined if callback used
   */
  removeTrackFromRoom(roomName, trackId, callback) {
    return this._execute(async () => {
      return await this.client.zRem(roomName, trackId);
    }, callback);
  }

  /**
   * Get all room names
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<Array>|undefined} - Array of room names or undefined if callback used
   */
  getAllRoomNames(callback) {
    return this._execute(async () => {
      const allKeys = await this.client.keys('*');
      return allKeys.filter(key => 
        !key.startsWith('song:') && 
        !key.startsWith('room:metadata:') &&
        !key.startsWith('user:') &&
        !key.startsWith('email:') &&
        !key.startsWith('ban:') &&
        !key.startsWith('token:') &&
        !key.startsWith('sess:')
      );
    }, callback);
  }

  /**
   * Delete a room
   * @param {string} roomName - The room name
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<number>|undefined} - Number of keys deleted or undefined if callback used
   */
  deleteRoom(roomName, callback) {
    return this._execute(async () => {
      return await this.client.del(roomName);
    }, callback);
  }

  /**
   * Get score of a track in a room 
   * @param {string} roomName - The room name
   * @param {string} trackId - The track ID
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<number|null>|undefined} - Score or null if not found, undefined if callback used
   */
  getTrackScore(roomName, trackId, callback) {
    return this._execute(async () => {
      return await this.client.zScore(roomName, trackId);
    }, callback);
  }

  /**
   * Delete a song by key
   * @param {string} key - The key to delete
   * @param {Function} [callback] - Optional callback function  
   * @returns {Promise<number>|undefined} - Number of keys deleted or undefined if callback used
   */
  deleteSong(key, callback) {
    return this._execute(async () => {
      return await this.client.del(key);
    }, callback);
  }

  /**
   * Get all keys matching pattern
   * @param {string} pattern - The pattern to match
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<Array>|undefined} - Array of keys or undefined if callback used
   */
  getKeys(pattern, callback) {
    return this._execute(async () => {
      return await this.client.keys(pattern);
    }, callback);
  }

  /**
   * Create multi transaction for songs
   * @returns {Object} Multi object that supports chained operations
   */
  multi() {
    const operations = [];
    const self = this;
    return {
      hSet: (key, field, value) => {
        operations.push({ op: 'hset', key, field, value });
        return this;
      },
      zAdd: (key, score, member) => {
        operations.push({ op: 'zadd', key, score, member });
        return this;
      },
      del: (key) => {
        operations.push({ op: 'del', key });
        return this;
      },
      exec: async (callback) => {
        // Execute operations sequentially for now
        const results = [];
        for (const op of operations) {
          try {
            let result;
            if (op.op === 'hset') {
              result = await self.client.hSet(op.key, op.field, op.value);
            } else if (op.op === 'zadd') {
              result = await self.client.zAdd(op.key, [{ score: op.score, value: op.member }]);
            } else if (op.op === 'del') {
              result = await self.client.del(op.key);
            }
            results.push(result);
          } catch (err) {
            if (callback) return callback(err);
            throw err;
          }
        }
        if (callback) callback(null, results);
        return results;
      }
    };
  }
}

/**
 * User data manager - handles all user related Redis operations
 */
class UserDataManager extends DataManager {
  constructor(client) {
    super(client);
    // Promisify client methods for async/await support
    this.clientAsync = {
      hmGet: promisify(client.hmGet).bind(client),
      hGetAll: promisify(client.hGetAll).bind(client),
      hGet: promisify(client.hGet).bind(client),
      hSet: promisify(client.hSet).bind(client),
      hIncrBy: promisify(client.hIncrBy).bind(client),
      exists: promisify(client.exists).bind(client),
      setEx: promisify(client.setEx).bind(client),
      ttl: promisify(client.ttl).bind(client),
      del: promisify(client.del).bind(client),
      keys: promisify(client.keys).bind(client),
      get: promisify(client.get).bind(client),
      zRange: promisify(client.zRange).bind(client),
      zIncrBy: promisify(client.zIncrBy).bind(client)
    };
  }

  /**
   * Get user credentials (salt and password)
   * @param {string} username - The username
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<Array>|undefined} - [salt, password] or undefined if callback used
   */
  getUserCredentials(username, callback) {
    return this._execute(async () => {
      const key = `user:${username}`;
      return await this.client.hmGet(key, ['salt', 'password']);
    }, callback);
  }

  /**
   * Check if user exists
   * @param {string} username - The username
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<boolean>|undefined} - True if exists or undefined if callback used
   */
  userExists(username, callback) {
    return this._execute(async () => {
      const key = `user:${username}`;
      const result = await this.clientAsync.exists(key);
      return result === 1;
    }, callback);
  }

  /**
   * Get user role
   * @param {string} username - The username
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<string>|undefined} - User role or undefined if callback used
   */
  getUserRole(username, callback) {
    return this._execute(async () => {
      const key = `user:${username}`;
      return await this.clientAsync.hGet(key, 'role');
    }, callback);
  }

  /**
   * Check if IP is banned
   * @param {string} ip - The IP address
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<boolean>|undefined} - True if banned or undefined if callback used
   */
  isBanned(ip, callback) {
    return this._execute(async () => {
      const key = `ban:${ip}`;
      const result = await this.clientAsync.exists(key);
      return result === 1;
    }, callback);
  }

  /**
   * Ban an IP address
   * @param {string} ip - The IP address
   * @param {number} duration - Duration in seconds
   * @param {string} bannedBy - Who issued the ban
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<string>|undefined} - Redis response or undefined if callback used
   */
  banUser(ip, duration, bannedBy, callback) {
    return this._execute(async () => {
      const key = `ban:${ip}`;
      return await this.clientAsync.setEx(key, duration, bannedBy);
    }, callback);
  }

  /**
   * Get ban TTL (time to live)
   * @param {string} ip - The IP address
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<number>|undefined} - TTL in seconds or undefined if callback used
   */
  getBanTTL(ip, callback) {
    return this._execute(async () => {
      const key = `ban:${ip}`;
      return await this.clientAsync.ttl(key);
    }, callback);
  }

  /**
   * Delete ban for IP
   * @param {string} ip - The IP address
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<number>|undefined} - Number of keys deleted or undefined if callback used
   */
  deleteBan(ip, callback) {
    return this._execute(async () => {
      const key = `ban:${ip}`;
      return await this.client.del(key);
    }, callback);
  }

  /**
   * Get all ban keys
   * @param {string} prefix - The prefix to search for (can be empty string)
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<Array>|undefined} - Array of ban keys or undefined if callback used
   */
  getBanKeys(prefix, callback) {
    return this._execute(async () => {
      // If prefix is provided, use it, otherwise search for ban keys without prefix
      const pattern = prefix ? `${prefix}ban:*` : 'ban:*';
      return await this.client.keys(pattern);
    }, callback);
  }

  /**
   * Get ban data
   * @param {string} key - The ban key
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<string>|undefined} - Ban data or undefined if callback used
   */
  getBanData(key, callback) {
    return this._execute(async () => {
      return await this.client.get(key);
    }, callback);
  }

  /**
   * Get user data fields
   * @param {string} username - The username
   * @param {Array<string>} fields - Fields to retrieve
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<Array>|undefined} - Array of field values or undefined if callback used
   */
  getUserFields(username, fields, callback) {
    return this._execute(async () => {
      const key = `user:${username}`;
      return await this.client.hmGet(key, fields);
    }, callback);
  }

  /**
   * Get single user field
   * @param {string} username - The username
   * @param {string} field - Field to retrieve
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<string>|undefined} - Field value or undefined if callback used
   */
  getUserField(username, field, callback) {
    return this._execute(async () => {
      const key = `user:${username}`;
      return await this.client.hGet(key, field);
    }, callback);
  }

  /**
   * Set user field
   * @param {string} username - The username
   * @param {string} field - Field name
   * @param {string|number} value - Field value
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<number>|undefined} - Number of fields set or undefined if callback used
   */
  setUserField(username, field, value, callback) {
    return this._execute(async () => {
      const key = `user:${username}`;
      return await this.client.hSet(key, field, value);
    }, callback);
  }

  /**
   * Set multiple user fields
   * @param {string} username - The username
   * @param {Object} fields - Object with field-value pairs
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<number>|undefined} - Number of fields set or undefined if callback used
   */
  setUserFields(username, fields, callback) {
    return this._execute(async () => {
      const key = `user:${username}`;
      return await this.client.hSet(key, fields);
    }, callback);
  }

  /**
   * Get all user data
   * @param {string} username - The username
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<Object>|undefined} - User data object or undefined if callback used
   */
  getUserData(username, callback) {
    return this._execute(async () => {
      const key = `user:${username}`;
      return await this.client.hGetAll(key);
    }, callback);
  }

  /**
   * Get sorted range from leaderboard
   * @param {string} key - The sorted set key
   * @param {number} start - Start index
   * @param {number} stop - Stop index
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<Array>|undefined} - Array of members or undefined if callback used
   */
  getSortedRange(key, start, stop, callback) {
    return this._execute(async () => {
      return await this.client.zRange(key, start, stop);
    }, callback);
  }

  /**
   * Sort keys with parameters
   * @param {string} _key - The key to sort (unused in simplified implementation)
   * @param {Object} _params - Sort parameters (unused in simplified implementation)
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<Array>|undefined} - Sorted results or undefined if callback used
   */
  sortKeys(_key, _params, callback) {
    return this._execute(async () => {
      // Note: Redis sort is complex, for now return empty array
      // This would need proper implementation based on the specific sort params used
      return [];
    }, callback);
  }

  /**
   * Create multi transaction
   * @returns {Object} Multi object that supports chained operations
   */
  multi() {
    const operations = [];
    const self = this;
    return {
      hset: (key, field, value) => {
        operations.push({ op: 'hset', key, field, value });
        return this;
      },
      hincrby: (key, field, increment) => {
        operations.push({ op: 'hincrby', key, field, increment });
        return this;
      },
      zincrby: (key, increment, member) => {
        operations.push({ op: 'zincrby', key, increment, member });
        return this;
      },
      del: (key) => {
        operations.push({ op: 'del', key });
        return this;
      },
      exec: async (callback) => {
        // Execute operations sequentially for now
        const results = [];
        for (const op of operations) {
          try {
            let result;
            if (op.op === 'hset') {
              result = await self.client.hSet(op.key, op.field, op.value);
            } else if (op.op === 'hincrby') {
              result = await self.client.hIncrBy(op.key, op.field, op.increment);
            } else if (op.op === 'zincrby') {
              result = await self.client.zIncrBy(op.key, op.increment, op.member);
            } else if (op.op === 'del') {
              result = await self.client.del(op.key);
            }
            results.push(result);
          } catch (err) {
            if (callback) return callback(err);
            throw err;
          }
        }
        if (callback) callback(null, results);
        return results;
      }
    };
  }

  /**
   * Get token data
   * @param {string} token - The token
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<string>|undefined} - Token data or undefined if callback used
   */
  getToken(token, callback) {
    return this._execute(async () => {
      const key = `token:${token}`;
      return await this.client.get(key);
    }, callback);
  }

  /**
   * Set token with expiration
   * @param {string} token - The token
   * @param {number} ttl - Time to live in seconds
   * @param {string} data - Token data
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<string>|undefined} - Redis response or undefined if callback used
   */
  setToken(token, ttl, data, callback) {
    return this._execute(async () => {
      const key = `token:${token}`;
      return await this.client.setEx(key, ttl, data);
    }, callback);
  }

  /**
   * Delete token
   * @param {string} token - The token
   * @param {Function} [callback] - Optional callback function
   * @returns {Promise<number>|undefined} - Number of keys deleted or undefined if callback used
   */
  deleteToken(token, callback) {
    return this._execute(async () => {
      const key = `token:${token}`;
      return await this.client.del(key);
    }, callback);
  }
}

/**
 * Main data service that provides access to both song and user data managers
 */
class DataService {
  constructor() {
    this.songs = new SongDataManager(songsClient);
    this.users = new UserDataManager(usersClient);
  }
}

// Export singleton instance
module.exports = new DataService();