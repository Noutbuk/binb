#!/usr/bin/env node

/**
 * Test script to verify binb setup
 */

'use strict';

const redis = require('redis');
const { songsClientOptions, usersClientOptions } = require('../redis-config');

async function testSetup() {
  console.log('🧪 Testing binb setup...\n');
  
  // Create our own clients to avoid connection conflicts
  const songsClient = redis.createClient(songsClientOptions);
  const usersClient = redis.createClient(usersClientOptions);

  try {
    // Test Redis connection
    console.log('📡 Testing Redis connection...');
    await songsClient.connect();
    await usersClient.connect();
    
    await songsClient.ping();
    await usersClient.ping();
    console.log('✅ Redis connection successful\n');

    // Test data
    console.log('📊 Checking data...');
    const songKeys = await songsClient.keys('*');
    const userKeys = await usersClient.keys('user:*');
    
    console.log(`📀 Songs/Rooms: ${songKeys.length} keys found`);
    console.log(`👥 Users: ${userKeys.length} users found`);

    // List rooms
    const roomKeys = songKeys.filter(key => 
      !key.startsWith('song:') && 
      !key.startsWith('room:metadata:') && 
      !key.startsWith('user:') && 
      !key.startsWith('email:') &&
      !key.startsWith('ban:') &&
      !key.startsWith('token:')
    );

    if (roomKeys.length > 0) {
      console.log('\n🏠 Available rooms:');
      for (const room of roomKeys.slice(0, 10)) {
        const songCount = await songsClient.zCard(room);
        console.log(`  - ${room}: ${songCount} songs`);
      }
      if (roomKeys.length > 10) {
        console.log(`  ... and ${roomKeys.length - 10} more rooms`);
      }
    } else {
      console.log('⚠️  No rooms found. Run data import first: npm run import-data');
    }

    // Check admin users
    console.log('\n👑 Admin users:');
    let adminCount = 0;
    for (const userKey of userKeys) {
      const role = await usersClient.hGet(userKey, 'role');
      if (parseInt(role) >= 2) {
        const username = userKey.replace('user:', '');
        console.log(`  - ${username} (admin)`);
        adminCount++;
      }
    }

    if (adminCount === 0) {
      console.log('⚠️  No admin users found. Run: npm run admin:setup');
    }

    console.log('\n🎮 Server readiness:');
    
    // Check required files
    const fs = require('fs');
    const requiredFiles = [
      'app.js',
      'lib/rooms.js',
      'routes/admin.js',
      'views/admin/dashboard.pug',
      'public/js/admin.js'
    ];

    let missingFiles = 0;
    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
      } else {
        console.log(`❌ ${file} - MISSING`);
        missingFiles++;
      }
    }

    if (missingFiles === 0) {
      console.log('\n🚀 Setup looks good! Ready to start server.');
      console.log('\n📋 Next steps:');
      console.log('  1. Start server: npm start (or docker-compose up)');
      console.log('  2. Visit: http://localhost:8138');
      console.log('  3. Admin panel: http://localhost:8138/admin');
      
      if (adminCount === 0) {
        console.log('\n⚠️  Remember to set up admin user first!');
      }
    } else {
      console.log(`\n❌ ${missingFiles} files missing. Setup incomplete.`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Redis connection failed. Make sure Redis is running:');
      console.log('  - Local: redis-server');
      console.log('  - Docker: docker-compose up redis');
    }
  } finally {
    await songsClient.disconnect();
    await usersClient.disconnect();
  }
}

// Run the test
if (require.main === module) {
  testSetup();
}

module.exports = testSetup;