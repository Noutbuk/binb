'use strict';

const dataService = require('../data-service');

class SongManager {
  constructor() {
    // All methods now use dataService
  }

  /**
   * Get all songs in a room with pagination
   */
  async getRoomSongs(roomName, page = 1, limit = 50) {
    try {
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      // Get song IDs from sorted set
      const songIds = await dataService.songs.getRoomTracks(roomName, start, end);
      const total = await dataService.songs.getRoomTrackCount(roomName);

      // Get song details
      const songs = [];
      for (const songId of songIds) {
        const songData = await dataService.songs.getSongMetadata(songId);
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
      const score = await dataService.songs.getTrackScore(roomName, trackId.toString());
      if (score !== null) {
        throw new Error('Song already exists in room');
      }

      // Store song metadata
      await dataService.songs.setSongMetadata(trackId, {
        artistName,
        trackName,
        trackViewUrl: trackViewUrl || '',
        previewUrl: previewUrl || '',
        artworkUrl60: artworkUrl60 || '',
        artworkUrl100: artworkUrl100 || ''
      });

      // Add song to room (use current timestamp as score for chronological ordering)
      const scoreValue = Date.now();
      // TODO: calculate currect scoreValue
      await dataService.songs.addTrackToRoom(roomName, trackId.toString(), 0);

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
      const score = await dataService.songs.getTrackScore(roomName, songId.toString());
      if (score === null) {
        throw new Error('Song not found in room');
      }

      // Remove song from room
      await dataService.songs.removeTrackFromRoom(roomName, songId.toString());

      // Check if song exists in other rooms before deleting metadata
      const roomKeys = await dataService.songs.getAllRoomNames();

      let songExistsInOtherRooms = false;
      for (const room of roomKeys) {
        if (room !== roomName) {
          const existsInRoom = await dataService.songs.getTrackScore(room, songId.toString());
          if (existsInRoom !== null) {
            songExistsInOtherRooms = true;
            break;
          }
        }
      }

      // If song doesn't exist in other rooms, delete its metadata
      if (!songExistsInOtherRooms) {
        await dataService.songs.deleteSong(`song:${songId}`);
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
      const songData = await dataService.songs.getSongMetadata(songId);
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
      const exists = await dataService.songs.songExists(songId);
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

      await dataService.songs.setSongMetadata(songId, filteredUpdates);

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
      const allSongKeys = await dataService.songs.getKeys('song:*');
      const songs = [];

      for (const songKey of allSongKeys.slice(0, limit * 2)) { // Get more than limit to account for filtering
        const songData = await dataService.songs.getSongMetadata(songKey.replace('song:', ''));
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
      return await dataService.songs.getRoomTrackCount(roomName);
    } catch (error) {
      console.error(`Error getting song count for room ${roomName}:`, error);
      throw error;
    }
  }
}

module.exports = new SongManager();
