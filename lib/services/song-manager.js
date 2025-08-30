'use strict';

const { songsClient } = require('../redis-clients');
const { promisify } = require("util");

class SongManager {
  constructor() {
    this.zRange = promisify(songsClient.zRange).bind(songsClient);
    this.zCard = promisify(songsClient.zCard).bind(songsClient);
    this.hGetAll = promisify(songsClient.hGetAll).bind(songsClient);
    this.zScore = promisify(songsClient.zScore).bind(songsClient);
    this.hSet = promisify(songsClient.hSet).bind(songsClient);
    this.zAdd = promisify(songsClient.zAdd).bind(songsClient);
    this.zRem = promisify(songsClient.zRem).bind(songsClient);
    this.keys = promisify(songsClient.keys).bind(songsClient);
    this.del = promisify(songsClient.del).bind(songsClient);
    this.exists = promisify(songsClient.exists).bind(songsClient);
  }

  /**
   * Get all songs in a room with pagination
   */
  async getRoomSongs(roomName, page = 1, limit = 50) {
    try {
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      // Get song IDs from sorted set
      const songIds = await this.zRange(roomName, start, end);
      const total = await this.zCard(roomName);

      // Get song details
      const songs = [];
      for (const songId of songIds) {
        const songData = await this.hGetAll(`song:${songId}`);
        if (songData && Object.keys(songData).length > 0) {
          songs.push({
            id: songId,
            ...songData
          });
        }
      }

      return {
        songs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error(`Error getting songs for room ${roomName}:`, error);
      throw error;
    }
  }

  /**
   * Add a song to a room
   */
  async addSongToRoom(roomName, songData) {
    try {
      const { trackId, artistName, trackName, trackViewUrl, previewUrl, artworkUrl60, artworkUrl100 } = songData;

      if (!trackId || !artistName || !trackName) {
        throw new Error('Missing required song data: trackId, artistName, trackName');
      }

      // Check if song already exists in room
      const score = await this.zScore(roomName, trackId.toString());
      if (score !== null) {
        throw new Error('Song already exists in room');
      }

      // Store song metadata
      await this.hSet(`song:${trackId}`, ...Object.entries({
        artistName,
        trackName,
        trackViewUrl: trackViewUrl || '',
        previewUrl: previewUrl || '',
        artworkUrl60: artworkUrl60 || '',
        artworkUrl100: artworkUrl100 || ''
      }).flat());

      // Add song to room (use current timestamp as score for chronological ordering)
      const scoreValue = Date.now();
      // TODO: calculate currect scoreValue
      await this.zAdd(roomName, 0, trackId.toString());

      return {
        id: trackId,
        artistName,
        trackName,
        trackViewUrl,
        previewUrl,
        artworkUrl60,
        artworkUrl100,
        addedAt: new Date(scoreValue).toISOString()
      };
    } catch (error) {
      console.error('Error adding song to room:', error);
      throw error;
    }
  }

  /**
   * Remove a song from a room
   */
  async removeSongFromRoom(roomName, songId) {
    try {
      // Check if song exists in room
      const score = await this.zScore(roomName, songId.toString());
      if (score === null) {
        throw new Error('Song not found in room');
      }

      // Remove song from room
      await this.zRem(roomName, songId.toString());

      // Check if song exists in other rooms before deleting metadata
      const allRooms = await this.keys('*');
      const roomKeys = allRooms.filter(key => !key.startsWith('song:') && !key.startsWith('room:metadata:') && !key.startsWith('user:') && !key.startsWith('email:'));

      let songExistsInOtherRooms = false;
      for (const room of roomKeys) {
        if (room !== roomName) {
          const existsInRoom = await this.zScore(room, songId.toString());
          if (existsInRoom !== null) {
            songExistsInOtherRooms = true;
            break;
          }
        }
      }

      // If song doesn't exist in other rooms, delete its metadata
      if (!songExistsInOtherRooms) {
        await this.del(`song:${songId}`);
      }

      return { removed: true, metadataDeleted: !songExistsInOtherRooms };
    } catch (error) {
      console.error('Error removing song from room:', error);
      throw error;
    }
  }

  /**
   * Get song details
   */
  async getSongDetails(songId) {
    try {
      const songData = await this.hGetAll(`song:${songId}`);
      if (!songData || Object.keys(songData).length === 0) {
        throw new Error('Song not found');
      }

      return {
        id: songId,
        ...songData
      };
    } catch (error) {
      console.error(`Error getting song details for ${songId}:`, error);
      throw error;
    }
  }

  /**
   * Update song metadata
   */
  async updateSongMetadata(songId, updates) {
    try {
      const exists = await this.exists(`song:${songId}`);
      if (!exists) {
        throw new Error('Song not found');
      }

      const allowedFields = ['artistName', 'trackName', 'trackViewUrl', 'previewUrl', 'artworkUrl60', 'artworkUrl100'];
      const filteredUpdates = {};

      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      await this.hSet(`song:${songId}`, filteredUpdates);

      return await this.getSongDetails(songId);
    } catch (error) {
      console.error('Error updating song metadata:', error);
      throw error;
    }
  }

  /**
   * Bulk add songs to a room
   */
  async bulkAddSongsToRoom(roomName, songs) {
    try {
      const results = {
        added: [],
        skipped: [],
        errors: []
      };

      for (const songData of songs) {
        try {
          const addedSong = await this.addSongToRoom(roomName, songData);
          results.added.push(addedSong);
        } catch (error) {
          if (error.message === 'Song already exists in room') {
            results.skipped.push({
              trackId: songData.trackId,
              reason: 'Already exists'
            });
          } else {
            results.errors.push({
              trackId: songData.trackId,
              error: error.message
            });
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error bulk adding songs:', error);
      throw error;
    }
  }

  /**
   * Search songs across all rooms
   */
  async searchSongs(query, limit = 50) {
    try {
      const allSongKeys = await this.keys('song:*');
      const songs = [];

      for (const songKey of allSongKeys.slice(0, limit * 2)) { // Get more than limit to account for filtering
        const songData = await this.hGetAll(songKey);
        if (songData && Object.keys(songData).length > 0) {
          const songId = songKey.replace('song:', '');
          const searchText = `${songData.artistName} ${songData.trackName}`.toLowerCase();

          if (searchText.includes(query.toLowerCase())) {
            songs.push({
              id: songId,
              ...songData
            });
          }
        }

        if (songs.length >= limit) break;
      }

      return songs.slice(0, limit);
    } catch (error) {
      console.error('Error searching songs:', error);
      throw error;
    }
  }

  /**
   * Get song count for a room
   */
  async getRoomSongCount(roomName) {
    try {
      return await this.zCard(roomName);
    } catch (error) {
      console.error(`Error getting song count for room ${roomName}:`, error);
      throw error;
    }
  }
}

module.exports = new SongManager();
