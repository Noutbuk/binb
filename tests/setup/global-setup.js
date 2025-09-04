/**
 * Global Playwright setup for binb tests
 * Starts Redis, imports test data, minifies assets, and starts server
 */

const { execSync, spawn } = require('child_process');
const { createClient } = require('redis');
const path = require('path');
const fs = require('fs');

let redisProcess;
let serverProcess;

async function globalSetup() {
  console.log('🚀 Setting up test environment...');

  try {
    // 1. Wait for Redis to be ready (started by Playwright webServer)
    console.log('📡 Waiting for Redis to be ready...');
    await waitForRedis();

    // 2. Clear existing test data
    console.log('🧹 Clearing test data...');
    await clearTestData();

    // 3. Import minimal test data
    console.log('📊 Setting up test data...');
    await setupTestData();

    // 4. Minify JavaScript assets
    console.log('⚙️ Minifying assets...');
    execSync('npm run minify', { stdio: 'inherit', cwd: path.resolve(__dirname, '../..') });

    console.log('✅ Test environment setup complete!');

  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    throw error;
  }
}

async function waitForRedis() {
  const maxRetries = 30;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const client = createClient({ socket: { port: 6379 } });
      await client.connect();
      await client.ping();
      await client.disconnect();
      console.log('✅ Redis is ready');
      return;
    } catch (error) {
      retries++;
      console.log(`⏳ Waiting for Redis... (${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error('Redis failed to start');
}

async function clearTestData() {
  const client = createClient({ socket: { port: 6379 } });
  await client.connect();

  try {
    // Clear test-specific keys but preserve any existing data
    const testKeys = await client.keys('test:*');
    if (testKeys.length > 0) {
      await client.del(testKeys);
    }

    // Clear any existing sessions
    const sessionKeys = await client.keys('sess:*');
    if (sessionKeys.length > 0) {
      await client.del(sessionKeys);
    }

  } finally {
    await client.disconnect();
  }
}

async function setupTestData() {
  const client = createClient({ socket: { port: 6379 } });
  await client.connect();

  try {
    // Create test room with minimal songs
    const testRoom = 'test-room';
    const testSongs = [
      {
        id: "791354168",
        trackViewUrl: 'https://music.apple.com/us/album/royals/791354164?i=791354168&uo=4',
        trackName: 'Royals',
        previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/ba/62/0e/ba620ef3-9a93-c4e4-20d3-6ca01a0000b3/mzaf_229273744212069656.plus.aac.p.m4a',
        artworkUrl60: 'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/c9/af/58/c9af5813-7975-3644-d873-14983f05f767/075679948748.jpg/60x60bb.jpg',
        artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/c9/af/58/c9af5813-7975-3644-d873-14983f05f767/075679948748.jpg/100x100bb.jpg',
        artistName: 'Lorde',
      },
      {
        id: "566322365",
        trackViewUrl: "https://music.apple.com/us/album/skyfall/566322358?i=566322365&uo=4",
        artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/b3/fe/cf/b3fecf76-0359-8e14-0651-4b101fc68a3f/886443673632.jpg/100x100bb.jpg",
        trackName: "Skyfall",
        previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/a8/f3/65/a8f365f6-9046-8e0a-78ba-5fa964b57ab6/mzaf_8633278038526787975.plus.aac.p.m4a",
        artworkUrl60: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/b3/fe/cf/b3fecf76-0359-8e14-0651-4b101fc68a3f/886443673632.jpg/60x60bb.jpg",
        artistName: "Adele"
      },
      {
        id: "528437613",
        trackViewUrl: "https://music.apple.com/us/album/in-the-end/528436018?i=528437613&uo=4",
        artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Features115/v4/f0/31/b2/f031b2b2-bcf0-6102-426f-e0b2c7437415/dj.vrgpwamf.jpg/100x100bb.jpg",
        trackName: "In the End",
        previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview112/v4/6c/60/cf/6c60cf91-e098-84bc-79af-8f3615b57b19/mzaf_12714078272888357351.plus.aac.p.m4a",
        artworkUrl60: "https://is1-ssl.mzstatic.com/image/thumb/Features115/v4/f0/31/b2/f031b2b2-bcf0-6102-426f-e0b2c7437415/dj.vrgpwamf.jpg/60x60bb.jpg",
        artistName: "LINKIN PARK",
      }
    ];

    // Add songs to room
    for (let i = 0; i < testSongs.length; i++) {
      const song = testSongs[i];
      await client.zAdd(testRoom, {
        score: i,
        value: song.id
      });
      await client.hSet(`song:${song.id}`, song);
    }

    // Create room metadata
    await client.hSet(`room:metadata:${testRoom}`, {
      description: 'Test Room for Playwright Tests',
      active: 'true',
      createdAt: '2025-09-04T18:04:10.360Z',
      updatedAt: '2025-09-04T18:04:10.360Z',
      createdBy: "testuser1234567",
      updatedBy: "testuser1234567"
    });

    // Create test user
    await client.hSet('user:testuser', {
      username: 'testuser',
      password: '9b96147fb10db30103f3aa8a38e4db78ec28c7293594933f6cc886a2bc8c884f', // password: 'testuser1234567'
      salt: 'kPd06cK1',
      email: 'test@example.com',
      role: '2',
      created: Date.now(),
      wins: '0',
      games: '0'
    });

    await client.set('email:test@example.com', 'testuser');

    console.log(`✅ Created test room '${testRoom}' with ${testSongs.length} songs`);
    console.log('✅ Created test user: testuser/testuser1234567');

  } finally {
    await client.disconnect();
  }
}


module.exports = globalSetup;