/**
 * Test Data Loader
 * Central utility for loading and validating test data from test-data.json
 * Used by both Jest and Playwright test frameworks
 */

const path = require('path');
const fs = require('fs');

class TestDataLoader {
  constructor() {
    this.testData = null;
    this.testDataPath = path.resolve(__dirname, '../data/test-data.json');
  }

  /**
   * Load test data from JSON file
   * @returns {Object} Test data object
   */
  loadTestData() {
    if (!this.testData) {
      try {
        this.testData = JSON.parse(fs.readFileSync(this.testDataPath, 'utf8'));
        this.validateTestData();
      } catch (error) {
        throw new Error(`Failed to load test data from ${this.testDataPath}: ${error.message}`);
      }
    }
    return this.testData;
  }

  /**
   * Validate test data structure
   */
  validateTestData() {
    const requiredKeys = ['songs', 'rooms', 'users', 'emails', 'bans'];
    const data = this.testData;

    for (const key of requiredKeys) {
      if (!data[key]) {
        throw new Error(`Test data missing required key: ${key}`);
      }
    }

    // Validate songs
    if (!Array.isArray(data.songs) || data.songs.length === 0) {
      throw new Error('Test data must contain a non-empty songs array');
    }

    // Validate each song has required fields
    data.songs.forEach((song, index) => {
      const requiredSongFields = ['id', 'trackName', 'artistName'];
      requiredSongFields.forEach(field => {
        if (!song[field]) {
          throw new Error(`Song at index ${index} missing required field: ${field}`);
        }
      });
    });

    // Validate rooms
    if (typeof data.rooms !== 'object') {
      throw new Error('Test data rooms must be an object');
    }

    // Validate users
    if (typeof data.users !== 'object') {
      throw new Error('Test data users must be an object');
    }
  }

  /**
   * Get test songs array
   * @returns {Array} Array of song objects
   */
  getSongs() {
    return this.loadTestData().songs;
  }

  /**
   * Get test rooms object
   * @returns {Object} Rooms object
   */
  getRooms() {
    return this.loadTestData().rooms;
  }

  /**
   * Get test users object
   * @returns {Object} Users object
   */
  getUsers() {
    return this.loadTestData().users;
  }

  /**
   * Get email mappings
   * @returns {Object} Email to username mappings
   */
  getEmails() {
    return this.loadTestData().emails;
  }

  /**
   * Get ban data
   * @returns {Object} Ban data object
   */
  getBans() {
    return this.loadTestData().bans;
  }

  /**
   * Get a specific test room
   * @param {string} roomName - Name of the room
   * @returns {Object} Room object
   */
  getRoom(roomName) {
    const rooms = this.getRooms();
    return rooms[roomName];
  }

  /**
   * Get a specific test user
   * @param {string} username - Username
   * @returns {Object} User object
   */
  getUser(username) {
    const users = this.getUsers();
    return users[username];
  }

  /**
   * Reset cached data (useful for testing)
   */
  reset() {
    this.testData = null;
  }
}

// Export singleton instance
module.exports = new TestDataLoader();