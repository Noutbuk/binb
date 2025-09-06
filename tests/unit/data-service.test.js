/**
 * Data Service Tests
 * Jest-based comprehensive test suite for all DataService methods
 */

const DataService = require('../../lib/data-service');
const redisManager = require('../helpers/redis-manager');
const path = require('path');
const fs = require('fs');

// Load test data
function loadTestData() {
  const testDataPath = path.resolve(__dirname, '../data/test-data.json');
  return JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
}

const testData = loadTestData();

describe('DataService', () => {
  // Setup and teardown
  beforeAll(async () => {
    await redisManager.startRedis();
    await redisManager.seedData(DataService);
  });

  afterAll(async () => {
    await redisManager.stopRedis();
  });

  beforeEach(async () => {
    // Reset data between tests
    await redisManager.reset(DataService);
  });

  // Song Data Manager Tests
  describe('SongDataManager', () => {
    test('getRoomTrackCount should return correct count', async () => {
      const count = await DataService.songs.getRoomTrackCount('test-room');
      expect(count).toBeGreaterThan(0);
    });

    test('addTrackToRoom should add track successfully', async () => {
      const initialCount = await DataService.songs.getRoomTrackCount('test-room');
      await DataService.songs.addTrackToRoom('test-room', 'new-track-id', 100);
      const newCount = await DataService.songs.getRoomTrackCount('test-room');
      expect(newCount).toBe(initialCount + 1);
    });

    test('removeTrackFromRoom should remove track successfully', async () => {
      const trackId = testData.songs[0].id;
      const initialCount = await DataService.songs.getRoomTrackCount('test-room');
      await DataService.songs.removeTrackFromRoom('test-room', trackId);
      const newCount = await DataService.songs.getRoomTrackCount('test-room');
      expect(newCount).toBe(initialCount - 1);
    });

    test('getRoomTracks should return tracks from room', async () => {
      const tracks = await DataService.songs.getRoomTracks('test-room', 0, -1);
      expect(Array.isArray(tracks)).toBe(true);
      expect(tracks.length).toBeGreaterThan(0);
    });

    test('setSongMetadata should store metadata correctly', async () => {
      const songData = {
        id: 'test-song-123',
        trackName: 'Test Song',
        artistName: 'Test Artist',
        previewUrl: 'http://example.com/preview.mp3',
        artworkUrl100: 'http://example.com/artwork.jpg'
      };
      await DataService.songs.setSongMetadata('test-song-123', songData);
      
      const retrievedData = await DataService.songs.getSongMetadata('test-song-123');
      expect(retrievedData).toMatchObject(songData);
    });

    test('getSongMetadata should return existing metadata', async () => {
      const songId = testData.songs[0].id;
      const metadata = await DataService.songs.getSongMetadata(songId);
      expect(metadata).toBeDefined();
      expect(metadata.trackName).toBe(testData.songs[0].trackName);
    });

    test('deleteSong should remove song successfully', async () => {
      await DataService.songs.setSongMetadata('temp-song', { title: 'Temp' });
      await DataService.songs.deleteSong('temp-song');
      const metadata = await DataService.songs.getSongMetadata('temp-song');
      expect(metadata).toBeNull();
    });

    test('songExists should check song existence correctly', async () => {
      const songId = testData.songs[0].id;
      const exists = await DataService.songs.songExists(songId);
      expect(exists).toBe(true);
      
      const notExists = await DataService.songs.songExists('non-existent-song');
      expect(notExists).toBe(false);
    });

    test('setRoomMetadata should store room metadata', async () => {
      const roomData = {
        description: 'Test Room Description',
        active: 'true',
        created: Date.now().toString()
      };
      await DataService.songs.setRoomMetadata('test-room-meta', roomData);
      
      const metadata = await DataService.songs.getRoomMetadata('test-room-meta');
      expect(metadata).toMatchObject(roomData);
    });

    test('getRoomMetadata should return room metadata', async () => {
      const metadata = await DataService.songs.getRoomMetadata('test-room');
      expect(metadata).toBeDefined();
      expect(metadata.description).toBeDefined();
    });

    test('getAllRoomNames should return array of room names', async () => {
      const rooms = await DataService.songs.getAllRoomNames();
      expect(Array.isArray(rooms)).toBe(true);
      expect(rooms.length).toBeGreaterThan(0);
    });

    test('deleteRoom should remove room completely', async () => {
      await DataService.songs.setRoomMetadata('temp-room', { description: 'Temp' });
      await DataService.songs.deleteRoom('temp-room');
      const metadata = await DataService.songs.getRoomMetadata('temp-room');
      expect(metadata).toBeNull();
    });

    test('getRoomTrackByIndex should return track at index', async () => {
      const tracks = await DataService.songs.getRoomTrackByIndex('test-room', 0);
      expect(Array.isArray(tracks)).toBe(true);
      expect(tracks.length).toBe(1);
    });

    test('getTrackScore should return track score from room', async () => {
      const trackId = testData.songs[0].id;
      const score = await DataService.songs.getTrackScore('test-room', trackId);
      expect(typeof score).toBe('number');
    });

    test('getKeys should return keys matching pattern', async () => {
      const keys = await DataService.songs.getKeys('song:*');
      expect(Array.isArray(keys)).toBe(true);
    });
  });

  // User Data Manager Tests
  describe('UserDataManager', () => {
    test('userExists should check user existence correctly', async () => {
      const exists = await DataService.users.userExists('testuser');
      expect(exists).toBe(true);
      
      const notExists = await DataService.users.userExists('nonexistentuser');
      expect(notExists).toBe(false);
    });

    test('setUserFields should create user successfully', async () => {
      const userData = {
        username: 'newuser',
        password: 'hashedpassword123',
        salt: 'randomsalt',
        email: 'newuser@example.com',
        role: '1'
      };
      
      await DataService.users.setUserFields('newuser', userData);
      const exists = await DataService.users.userExists('newuser');
      expect(exists).toBe(true);
    });

    test('getUserCredentials should return user credentials', async () => {
      const creds = await DataService.users.getUserCredentials('testuser');
      expect(creds).toBeDefined();
      expect(creds.password).toBeDefined();
      expect(creds.salt).toBeDefined();
    });

    test('getUserRole should return user role', async () => {
      const role = await DataService.users.getUserRole('testuser');
      expect(role).toBe('2');
    });

    test('getUserFields should return specific user fields', async () => {
      const fields = await DataService.users.getUserFields('testuser', ['username', 'email']);
      expect(fields).toBeDefined();
      expect(fields.username).toBe('testuser');
      expect(fields.email).toBe('test@example.com');
    });

    test('setUserField should update user field correctly', async () => {
      await DataService.users.setUserField('testuser', 'role', '3');
      const role = await DataService.users.getUserRole('testuser');
      expect(role).toBe('3');
    });

    test('getUserData should return complete user data', async () => {
      const userData = await DataService.users.getUserData('testuser');
      expect(userData).toBeDefined();
      expect(userData.username).toBe('testuser');
    });

    test('isBanned should check if IP is banned', async () => {
      const banned = await DataService.users.isBanned('192.168.1.1');
      expect(typeof banned).toBe('boolean');
    });

    test('getBanTTL should return ban time to live', async () => {
      await DataService.users.banUser('192.168.1.200', 3600, 'admin');
      const ttl = await DataService.users.getBanTTL('192.168.1.200');
      expect(typeof ttl).toBe('number');
    });

    test('deleteBan should remove ban', async () => {
      await DataService.users.banUser('192.168.1.250', 3600, 'admin');
      await DataService.users.deleteBan('192.168.1.250');
      const banned = await DataService.users.isBanned('192.168.1.250');
      expect(banned).toBe(false);
    });

    test('setToken should store token with TTL', async () => {
      await DataService.users.setToken('test-token-123', 3600, 'testuser');
      const tokenData = await DataService.users.getToken('test-token-123');
      expect(tokenData).toBe('testuser');
    });

    test('getToken should return token data', async () => {
      const tokenData = await DataService.users.getToken('valid-token');
      expect(tokenData).toBe('testuser');
    });

    test('deleteToken should remove token', async () => {
      await DataService.users.setToken('temp-token', 3600, 'testuser');
      await DataService.users.deleteToken('temp-token');
      const tokenData = await DataService.users.getToken('temp-token');
      expect(tokenData).toBeNull();
    });

    test('banUser should create ban entry', async () => {
      await DataService.users.banUser('192.168.1.100', 3600, 'admin');
      const banKeys = await DataService.users.getBanKeys();
      expect(banKeys).toContain('ban:192.168.1.100');
    });

    test('getBanKeys should return array of ban keys', async () => {
      const banKeys = await DataService.users.getBanKeys();
      expect(Array.isArray(banKeys)).toBe(true);
      expect(banKeys.length).toBeGreaterThan(0);
    });

    test('getBanData should return ban information', async () => {
      const banData = await DataService.users.getBanData('192.168.1.1');
      expect(banData).toBeDefined();
      expect(banData.bannedBy).toBe('admin');
    });
  });

  // Dual pattern tests (callback vs async/await)
  describe('Dual Pattern Support', () => {
    test('getRoomTrackCount supports both callback and async patterns', async () => {
      // Test async pattern
      const asyncResult = await DataService.songs.getRoomTrackCount('test-room');
      
      // Test callback pattern
      const callbackResult = await new Promise((resolve, reject) => {
        DataService.songs.getRoomTrackCount('test-room', (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });
      
      expect(asyncResult).toBe(callbackResult);
    });

    test('userExists supports both callback and async patterns', async () => {
      // Test async pattern
      const asyncResult = await DataService.users.userExists('testuser');
      
      // Test callback pattern
      const callbackResult = await new Promise((resolve, reject) => {
        DataService.users.userExists('testuser', (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });
      
      expect(asyncResult).toBe(callbackResult);
    });
  });
});