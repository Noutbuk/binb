'use strict';

/**
 * Script to set up the first admin user and migrate existing data
 * Fixed version that handles Redis connection properly
 */

const redis = require('redis');
const { songsClientOptions, usersClientOptions } = require('../redis-config');
const config = require('../config.json');

// Create separate clients for this script to avoid connection conflicts
const createClients = async () => {
  const usersClient = redis.createClient(usersClientOptions);
  const songsClient = redis.createClient(songsClientOptions);
  
  await usersClient.connect();
  await songsClient.connect();
  
  return { usersClient, songsClient };
};

async function setupAdmin() {
  let usersClient, songsClient;
  
  try {
    console.log('Setting up admin system...');
    
    // Create our own clients
    ({ usersClient, songsClient } = await createClients());

    // 1. Create default admin user if no admin exists
    const users = await usersClient.keys('user:*') || [];
    let hasAdmin = false;

    for (const userKey of users) {
      const role = await usersClient.hGet(userKey, 'role');
      if (parseInt(role) >= 2) {
        hasAdmin = true;
        break;
      }
    }

    if (!hasAdmin && users.length > 0) {
      // Make the first user an admin
      const firstUser = users[0];
      await usersClient.hSet(firstUser, 'role', '2');
      const username = firstUser.replace('user:', '');
      console.log(`✓ Made user "${username}" an admin`);
    } else if (!hasAdmin) {
      console.log('! No users found. Create a user account first, then run this script again.');
    } else {
      console.log('✓ Admin user already exists');
    }

    console.log('✓ Admin system setup complete!');
    console.log('\nNext steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Log in as an admin user');
    console.log('3. Visit /admin to access the admin panel');

  } catch (error) {
    console.error('Error setting up admin system:', error);
  } finally {
    if (usersClient) await usersClient.disconnect();
    if (songsClient) await songsClient.disconnect();
  }
}

async function listUsers() {
  let usersClient;
  
  try {
    ({ usersClient } = await createClients());
    
    const users = await usersClient.keys('user:*') || [];
    console.log('\nCurrent users:');
    
    for (const userKey of users) {
      const userData = await usersClient.hGetAll(userKey);
      const username = userKey.replace('user:', '');
      const role = parseInt(userData.role) || 0;
      const roleNames = ['User', 'Moderator', 'Admin'];
      
      console.log(`- ${username} (${roleNames[role] || 'Unknown'})`);
    }
    
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    try {
      if (usersClient) {
        await usersClient.disconnect();
      }
    } catch (disconnectError) {
      // Ignore disconnect errors silently
    }
  }
}

async function promoteUser(username) {
  let usersClient;
  
  try {
    ({ usersClient } = await createClients());
    
    const userKey = `user:${username}`;
    const exists = await usersClient.exists(userKey);
    
    if (!exists) {
      console.log(`User "${username}" not found`);
      return;
    }
    
    await usersClient.hSet(userKey, 'role', '2');
    console.log(`✓ Promoted "${username}" to admin`);
    
  } catch (error) {
    console.error('Error promoting user:', error);
  } finally {
    try {
      if (usersClient) {
        await usersClient.disconnect();
      }
    } catch (disconnectError) {
      // Ignore disconnect errors silently
    }
  }
}

// Command line interface
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'setup':
    setupAdmin();
    break;
  case 'list':
    listUsers();
    break;
  case 'promote':
    if (!arg) {
      console.log('Usage: node setup-admin.js promote <username>');
    } else {
      promoteUser(arg);
    }
    break;
  default:
    console.log('Usage:');
    console.log('  node setup-admin.js setup     - Set up admin system');
    console.log('  node setup-admin.js list      - List all users');
    console.log('  node setup-admin.js promote <username> - Promote user to admin');
}