/**
 * Unified Redis Manager
 * Handles Redis lifecycle and data seeding for both Jest and Playwright tests
 * Uses npm run scripts for Redis management
 */

const { execSync, spawn } = require('child_process');
const { createClient } = require('redis');
const path = require('path');
const testDataLoader = require('./test-data-loader');

class UnifiedRedisManager {
  constructor() {
    this.client = null;
    this.isRedisRunning = false;
    this.redisProcess = null;
  }

  /**
   * Start Redis using npm run test:redis
   */
  async startRedis() {
    if (this.isRedisRunning) {
      console.log('📡 Redis is already running');
      return;
    }

    console.log('🚀 Starting Redis with npm run test:redis...');

    try {
      // Start Redis in background using spawn to avoid blocking
      this.redisProcess = spawn('npm', ['run', 'test:redis'], {
        cwd: path.resolve(__dirname, '../..'),
        detached: true,
        stdio: 'pipe'
      });

      // Wait for Redis to be ready with retry logic
      await this.waitForRedis();
      this.isRedisRunning = true;
      console.log('✅ Redis started successfully');
    } catch (error) {
      throw new Error(`Failed to start Redis: ${error.message}`);
    }
  }

  /**
   * Stop Redis using npm run test:cleanup
   */
  async stopRedis() {
    if (!this.isRedisRunning) {
      console.log('📡 Redis is not running');
      return;
    }

    console.log('🛑 Stopping Redis...');

    try {
      if (this.client) {
        try {
          await this.client.quit();
        } catch (error) {
          // Ignore quit errors
        }
        this.client = null;
      }

      // Kill the Redis process if it's still running
      if (this.redisProcess) {
        this.redisProcess.kill();
        this.redisProcess = null;
      }

      // Clean up using npm script
      execSync('npm run test:cleanup', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../..')
      });

      this.isRedisRunning = false;
      console.log('✅ Redis stopped and cleaned up');
    } catch (error) {
      console.warn(`Warning: Failed to stop Redis cleanly: ${error.message}`);
    }
  }

  /**
   * Wait for Redis to be ready
   */
  async waitForRedis() {
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      let testClient = null;
      try {
        testClient = createClient({ 
          socket: { port: 6379, host: 'localhost' }
        });
        
        testClient.on('error', () => {}); // Ignore connection errors during retry
        await testClient.connect();
        await testClient.ping();
        await testClient.disconnect();
        
        console.log('✅ Redis is ready');
        return; // Success
      } catch (error) {
        if (testClient) {
          try { await testClient.disconnect(); } catch (e) { /* ignore */ }
        }
        retries++;
        if (retries % 5 === 0) { // Log every 5th attempt to reduce noise
          console.log(`⏳ Waiting for Redis... (${retries}/${maxRetries})`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Redis failed to start within timeout period');
  }

  /**
   * Get connected Redis client
   */
  async getClient() {
    if (!this.client) {
      this.client = createClient({ 
        socket: { port: 6379, host: 'localhost' }
      });
      
      this.client.on('error', (err) => {
        console.error('Redis client error:', err.message);
      });
      
      await this.client.connect();
    }
    return this.client;
  }

  /**
   * Clear all Redis data
   */
  async clearData() {
    const client = await this.getClient();
    await client.flushDb();
    console.log('🧹 Redis data cleared');
  }

  /**
   * Seed test data using DataService (for Jest compatibility)
   * @param {Object} DataService - The DataService instance
   */
  async seedDataWithService(DataService) {
    const data = testDataLoader.loadTestData();
    
    console.log('📊 Seeding test data via DataService...');
    
    // Clear existing data first
    await this.clearData();
    
    // Seed songs
    for (const song of data.songs) {
      await DataService.songs.setSongMetadata(song.id, song);
    }

    // Seed rooms and add songs to test-room
    for (const roomName in data.rooms) {
      const room = data.rooms[roomName];
      await DataService.songs.setRoomMetadata(roomName, room.metadata);
      
      if (roomName === 'test-room') {
        for (let i = 0; i < data.songs.length; i++) {
          await DataService.songs.addTrackToRoom(roomName, data.songs[i].id, i);
        }
      }
    }

    // Seed users using direct client (to ensure correct Redis keys)
    const client = await this.getClient();
    for (const username in data.users) {
      const user = data.users[username];
      user.created = Date.now().toString();
      await client.hSet(`user:${username}`, user);
    }

    // Seed email mappings
    for (const email in data.emails) {
      await client.set(`email:${email}`, data.emails[email]);
    }

    // Seed bans
    for (const ip in data.bans) {
      const banData = data.bans[ip];
      await DataService.users.banUser(ip, banData.ttl, banData.bannedBy);
    }

    console.log(`✅ Seeded via DataService: ${data.songs.length} songs, ${Object.keys(data.rooms).length} rooms, ${Object.keys(data.users).length} users`);
  }

  /**
   * Seed test data using direct Redis client (for Playwright compatibility)
   */
  async seedDataDirect() {
    const client = await this.getClient();
    const data = testDataLoader.loadTestData();

    console.log('📊 Seeding test data directly...');

    // Clear existing data first
    await this.clearData();

    // Seed songs
    for (const song of data.songs) {
      await client.hSet(`song:${song.id}`, song);
    }

    // Seed rooms and their songs
    for (const roomName in data.rooms) {
      const room = data.rooms[roomName];
      
      // Add room metadata
      await client.hSet(`room:metadata:${roomName}`, room.metadata);
      
      // Add songs to test-room (only the main test room gets songs)
      if (roomName === 'test-room') {
        for (let i = 0; i < data.songs.length; i++) {
          const song = data.songs[i];
          await client.zAdd(roomName, {
            score: i,
            value: song.id
          });
        }
      }
    }

    // Seed users
    for (const username in data.users) {
      const user = { ...data.users[username] };
      user.created = Date.now(); // Set current timestamp
      await client.hSet(`user:${username}`, user);
    }

    // Seed email mappings
    for (const email in data.emails) {
      await client.set(`email:${email}`, data.emails[email]);
    }

    // Seed bans
    for (const ip in data.bans) {
      const banData = data.bans[ip];
      await client.setEx(`ban:${ip}`, banData.ttl, banData.bannedBy);
    }

    console.log(`✅ Seeded directly: ${data.songs.length} songs, ${Object.keys(data.rooms).length} rooms, ${Object.keys(data.users).length} users`);
  }

  /**
   * Setup test environment
   * @param {Object} DataService - Optional DataService for Jest tests
   */
  async setup(DataService = null) {
    await this.startRedis();
    if (DataService) {
      await this.seedDataWithService(DataService);
    } else {
      await this.seedDataDirect();
    }
  }

  /**
   * Teardown test environment
   */
  async teardown() {
    await this.stopRedis();
  }

  /**
   * Reset data between tests
   * @param {Object} DataService - Optional DataService for Jest tests
   */
  async reset(DataService = null) {
    if (DataService) {
      await this.seedDataWithService(DataService);
    } else {
      await this.seedDataDirect();
    }
  }

  /**
   * Jest-compatible methods (for backward compatibility)
   */
  async seedData(DataService) {
    return this.seedDataWithService(DataService);
  }
}

// Export singleton instance
module.exports = new UnifiedRedisManager();