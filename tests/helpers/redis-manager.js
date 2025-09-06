/**
 * Redis Manager for Jest Tests
 * Handles Redis lifecycle and data seeding for tests
 */

const { execSync } = require('child_process');
const { createClient } = require('redis');
const path = require('path');
const fs = require('fs');

class RedisManager {
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
      return;
    }

    try {
      execSync('docker compose -f docker-compose.test.yml up -d', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../..')
      });

      // Wait for Redis to be ready with retry logic
      await this.waitForRedis();
      this.isRedisRunning = true;
    } catch (error) {
      throw new Error(`Failed to start Redis: ${error.message}`);
    }
  }

  /**
   * Stop Redis and cleanup
   */
  async stopRedis() {
    if (!this.isRedisRunning) {
      return;
    }

    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
      }

      execSync('docker compose -f docker-compose.test.yml rm -fsv', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../..')
      });

      this.isRedisRunning = false;
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
          socket: { port: 6379, host: 'localhost' },
          legacyMode: true
        });
        
        testClient.on('error', () => {}); // Ignore connection errors during retry
        await testClient.connect();
        await testClient.ping();
        await testClient.quit();
        
        return; // Success
      } catch (error) {
        if (testClient) {
          try { await testClient.quit(); } catch (e) { /* ignore */ }
        }
        retries++;
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
  }

  /**
   * Seed test data using DataService (after it's available)
   */
  async seedData(DataService) {
    const data = this.loadTestData();
    
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

    for (const ip in data.bans) {
      const banData = data.bans[ip];
      await DataService.users.banUser(ip, banData.ttl, banData.bannedBy);
    }
  }

  /**
   * Reset data between tests
   */
  async reset(DataService) {
    await this.seedData(DataService);
  }
}

// Export singleton instance
module.exports = new RedisManager();