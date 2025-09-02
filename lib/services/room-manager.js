'use strict';

const config = require('../../config');
const dataService = require('../data-service');

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  /**
   * Get all rooms with their metadata and song counts
   */
  async getAllRooms() {
    try {
      // Get only rooms with metadata
      const metadataRooms = await dataService.songs.getAllRoomNamesFromMetadata();
      const rooms = [];

      for (const roomName of metadataRooms) {
        const metadata = await this.getRoomMetadata(roomName);
        const songCount = await dataService.songs.getRoomTrackCount(roomName);

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
      const metadata = await dataService.songs.getRoomMetadata(roomName);

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
      const metadataExists = await dataService.songs.roomMetadataExists(roomName);
      if (metadataExists) {
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
        updatedBy: createdBy
      };

      // Create room metadata
      await dataService.songs.setRoomMetadata(roomName, roomMetadata);

      // Sorted set will be created automatically when songs are added
      
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
      const metadataExists = await dataService.songs.roomMetadataExists(roomName);
      if (!metadataExists) {
        throw new Error('Room does not exist');
      }

      const currentMetadata = await dataService.songs.getRoomMetadata(roomName);
      const currentDescription = currentMetadata.description || '';

      const updatedMetadata = {
        ...currentMetadata,
        description: metadata.description !== undefined ? metadata.description : currentDescription,
        active: "" + (metadata.active !== undefined ? metadata.active : currentMetadata.active),
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy
      };

      await dataService.songs.setRoomMetadata(roomName, updatedMetadata);

      return {
        name: roomName,
        ...updatedMetadata,
        songCount: await dataService.songs.getRoomTrackCount(roomName)
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
      const metadataExists = await dataService.songs.roomMetadataExists(roomName);
      if (!metadataExists) {
        throw new Error('Room does not exist');
      }

      // Get all song IDs in the room
      const songIds = await dataService.songs.getRoomTracks(roomName, 0, -1);

      // Delete individual song data
      const pipeline = dataService.songs.multi();
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
   * Check if room exists (checks metadata only)
   */
  async roomExists(roomName) {
    try {
      return await dataService.songs.roomMetadataExists(roomName);
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
