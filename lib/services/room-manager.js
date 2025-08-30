'use strict';

const { songsClient } = require('../redis-clients');
const config = require('../../config');
const { promisify } = require("util");

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.keys = promisify(songsClient.keys).bind(songsClient);
    this.zCard = promisify(songsClient.zCard).bind(songsClient);
    this.hGetAll = promisify(songsClient.hGetAll).bind(songsClient);
    this.exists = promisify(songsClient.exists).bind(songsClient);
    this.zAdd = promisify(songsClient.zAdd).bind(songsClient);
    this.zRem = promisify(songsClient.zRem).bind(songsClient);
    this.hSet = promisify(songsClient.hSet).bind(songsClient);
    this.zRange = promisify(songsClient.zRange).bind(songsClient);
  }

  /**
   * Get all rooms with their metadata and song counts
   */
  async getAllRooms() {
    try {
      // Get all existing room keys (excluding metadata keys)
      const allKeys = await this.keys('*');
      const roomKeys = allKeys.filter(key =>
        !key.startsWith('song:') &&
        !key.startsWith('room:metadata:') &&
        !key.startsWith('user:') &&
        !key.startsWith('email:') &&
        !key.startsWith('ban:') &&
        !key.startsWith('token:') &&
        !key.startsWith('sess:')
      );

      const rooms = [];

      for (const roomName of roomKeys) {
        const metadata = await this.getRoomMetadata(roomName);
        const songCount = await this.zCard(roomName);

        rooms.push({
          name: roomName,
          ...metadata,
          songCount: songCount
        });
      }

      return rooms.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error getting all rooms:', error);
      throw error;
    }
  }

  /**
   * Get room metadata
   */
  async getRoomMetadata(roomName) {
    try {
      const metadataKey = `room:metadata:${roomName}`;
      const metadata = await this.hGetAll(metadataKey);

      return {
        description: metadata.description || '',
        active: metadata.active === 'true',
        createdAt: metadata.createdAt || new Date().toISOString(),
        updatedAt: metadata.updatedAt || new Date().toISOString(),
        createdBy: metadata.createdBy || 'system',
        updatedBy: metadata.updatedBy || 'system'
      };
    } catch (error) {
      console.error(`Error getting room metadata for ${roomName}:`, error);
      return {
        description: '',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system'
      };
    }
  }

  /**
   * Create a new room
   */
  async createRoom(roomName, metadata, createdBy) {
    try {
      // Check if room already exists
      const exists = await this.exists(roomName);
      if (exists) {
        throw new Error('Room already exists');
      }

      // Validate room name
      if (!/^[a-zA-Z0-9-_]+$/.test(roomName)) {
        throw new Error('Room name can only contain alphanumeric characters, hyphens, and underscores');
      }

      const now = new Date().toISOString();
      const roomMetadata = {
        description: metadata.description || '',
        active: 'true',// + metadata.active !== false,
        createdAt: now,
        updatedAt: now,
        createdBy: createdBy,
        updatedBy: updatedBy
      };

      // Create room metadata
      const metadataKey = `room:metadata:${roomName}`;
      const flatArgs = Object.entries(roomMetadata).flat();
      await this.hSet(metadataKey, ...flatArgs);

      // Initialize empty room (sorted set for songs)
      await this.zAdd(roomName, 0, 'placeholder');
      //await this.zRem(roomName, 'placeholder');

      return {
        name: roomName,
        ...roomMetadata,
        songCount: 0
      };
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  /**
   * Update room metadata
   */
  async updateRoom(roomName, metadata, updatedBy) {
    try {
      const exists = await this.exists(roomName);
      if (!exists) {
        throw new Error('Room does not exist');
      }

      const metadataKey = `room:metadata:${roomName}`;
      const currentMetadata = await this.hGetAll(metadataKey);
      const currentDescription = currentMetadata.description || '';

      const updatedMetadata = {
        ...currentMetadata,
        description: metadata.description !== undefined ? metadata.description : currentDescription,
        active: "" + (metadata.active !== undefined ? metadata.active : currentMetadata.active),
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy
      };

      const flatArgs = Object.entries(updatedMetadata).flat();
      await this.hSet(metadataKey, ...flatArgs);

      return {
        name: roomName,
        ...updatedMetadata,
        songCount: await this.zCard(roomName)
      };
    } catch (error) {
      console.error('Error updating room:', error);
      throw error;
    }
  }

  /**
   * Delete a room and all its songs
   */
  async deleteRoom(roomName) {
    try {
      const exists = await this.exists(roomName);
      if (!exists) {
        throw new Error('Room does not exist');
      }

      // Get all song IDs in the room
      const songIds = await this.zRange(roomName, 0, -1);

      // Delete individual song data
      const pipeline = songsClient.multi();
      songIds.forEach(songId => {
        pipeline.del(`song:${songId}`);
      });

      // Delete room and metadata
      pipeline.del(roomName);
      pipeline.del(`room:metadata:${roomName}`);

      await pipeline.exec();

      return { deleted: true, songsDeleted: songIds.length };
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
  }

  /**
   * Check if room exists
   */
  async roomExists(roomName) {
    try {
      return await this.exists(roomName) === 1;
    } catch (error) {
      console.error('Error checking room existence:', error);
      throw error;
    }
  }

  /**
   * Get rooms that are currently active in the game
   */
  getActiveGameRooms() {
    return config.rooms || [];
  }

  /**
   * Add room to active game rooms (updates config)
   */
  async activateRoom(roomName) {
    try {
      const exists = await this.roomExists(roomName);
      if (!exists) {
        throw new Error('Room does not exist');
      }

      if (!config.rooms.includes(roomName)) {
        config.rooms.push(roomName);
      }

      // Update room metadata
      await this.updateRoom(roomName, { active: true }, 'system');

      return true;
    } catch (error) {
      console.error('Error activating room:', error);
      throw error;
    }
  }

  /**
   * Remove room from active game rooms (updates config)
   */
  async deactivateRoom(roomName) {
    try {
      const index = config.rooms.indexOf(roomName);
      if (index > -1) {
        config.rooms.splice(index, 1);
      }

      // Update room metadata
      await this.updateRoom(roomName, { active: false }, 'system');

      return true;
    } catch (error) {
      console.error('Error deactivating room:', error);
      throw error;
    }
  }
}

module.exports = new RoomManager();
