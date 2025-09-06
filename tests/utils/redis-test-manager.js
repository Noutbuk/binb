'use strict';

const { execSync } = require('child_process');
const { createClient } = require('redis');
const path = require('path');
const fs = require('fs');

/**
 * Redis Test Manager
 * Handles Redis lifecycle management and test data setup for unit tests
 */
class RedisTestManager {
  constructor() {
    this.client = null;
    this.isRedisRunning = false;
    this.testData = null;
  }

  /**
   * Load test data from JSON file
   */
  loadTestData() {
    if (!this.testData) {
      const testDataPath = path.resolve(__dirname, '../data/test-data.json');
      this.testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
    }
    return this.testData;
  }

  /**
   * Start Redis using docker-compose.test.yml
   */
  async startRedis() {
    if (this.isRedisRunning) {
      console.log('📡 Redis is already running');
      return;
    }

    console.log('🚀 Starting Redis with docker-compose.test.yml...');
    
    try {
      // Start Redis in detached mode
      execSync('docker compose -f docker-compose.test.yml up -d', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../..')
      });

      // Wait for Redis to be ready
      await this.waitForRedis();
      this.isRedisRunning = true;
      console.log('✅ Redis started successfully');
    } catch (error) {
      throw new Error(`Failed to start Redis: ${error.message}`);
    }
  }

  /**
   * Stop Redis and clean up containers
   */
  async stopRedis() {
    if (!this.isRedisRunning) {
      console.log('📡 Redis is not running');
      return;
    }

    console.log('🛑 Stopping Redis...');
    
    try {
      // Disconnect client if connected
      if (this.client) {
        try {
          await this.client.quit();
        } catch (error) {
          // Ignore quit errors
        }
        this.client = null;
      }

      // Stop and remove containers with force and volumes
      execSync('docker compose -f docker-compose.test.yml rm -fsv', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../..')
      });

      this.isRedisRunning = false;
      console.log('✅ Redis stopped and cleaned up');
    } catch (error) {
      console.error(`Warning: Failed to stop Redis cleanly: ${error.message}`);
    }
  }

  /**
   * Wait for Redis to be ready with retry logic
   */
  async waitForRedis() {
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      let testClient = null;
      try {
        testClient = createClient({ 
          socket: { port: 6379, host: 'localhost' },
          legacyMode: true
        });
        await testClient.connect();
        await testClient.ping();
        await testClient.quit(); // Use quit instead of disconnect
        console.log('✅ Redis is ready');
        return;
      } catch (error) {
        if (testClient) {
          try {
            await testClient.quit();
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
        }
        retries++;
        console.log(`⏳ Waiting for Redis... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Redis failed to start within timeout period');
  }

  /**
   * Get a connected Redis client
   */
  async getClient() {
    if (!this.client) {
      this.client = createClient({ 
        socket: { port: 6379, host: 'localhost' },
        legacyMode: true
      });
      
      // Add error handler to prevent unhandled errors
      this.client.on('error', (err) => {
        console.error('Redis client error:', err.message);
      });
      
      await this.client.connect();
    }
    return this.client;
  }

  /**
   * Clear all test data from Redis
   */
  async clearTestData() {
    const client = await this.getClient();
    
    try {
      console.log('🧹 Clearing test data...');
      
      // Clear all keys - this is a test environment so it's safe
      await client.flushDb();
      
      console.log('✅ Test data cleared');
    } catch (error) {
      throw new Error(`Failed to clear test data: ${error.message}`);
    }
  }

  /**
   * Seed test data from the JSON file
   */
  async seedTestData() {
    const client = await this.getClient();
    const data = this.loadTestData();
    
    try {
      console.log('📊 Seeding test data...');
      
      // Seed songs
      for (let i = 0; i < data.songs.length; i++) {
        const song = data.songs[i];
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
        const user = data.users[username];
        user.created = Date.now(); // Set current timestamp
        await client.hSet(`user:${username}`, user);
      }

      // Seed email mappings
      for (const email in data.emails) {
        await client.set(`email:${email}`, data.emails[email]);
      }

      // Seed tokens
      for (const token in data.tokens) {
        const tokenData = data.tokens[token];
        await client.setEx(`token:${token}`, tokenData.ttl, tokenData.value);
      }

      // Seed bans
      for (const ip in data.bans) {
        const banData = data.bans[ip];
        await client.setEx(`ban:${ip}`, banData.ttl, banData.bannedBy);
      }

      console.log(`✅ Seeded test data: ${data.songs.length} songs, ${Object.keys(data.rooms).length} rooms, ${Object.keys(data.users).length} users`);
    } catch (error) {
      throw new Error(`Failed to seed test data: ${error.message}`);
    }
  }

  /**
   * Setup test environment (start Redis, clear data, seed test data)
   */
  async setup() {
    await this.startRedis();
    await this.clearTestData();
    await this.seedTestData();
  }

  /**
   * Teardown test environment (stop Redis, clean up)
   */
  async teardown() {
    await this.stopRedis();
  }

  /**
   * Reset test data between test suites
   */
  async reset() {
    await this.clearTestData();
    await this.seedTestData();
  }
}

module.exports = RedisTestManager;