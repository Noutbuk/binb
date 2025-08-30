'use strict';

const express = require('express');
const { requireAdmin, addAdminStatus } = require('../lib/middleware/admin-auth');
const roomManager = require('../lib/services/room-manager');
const songManager = require('../lib/services/song-manager');
const appleMusicImporter = require('../lib/services/apple-music-importer');
const utils = require('../lib/utils');

const router = express.Router();

// Add admin status to all routes
router.use(addAdminStatus);

/**
 * Admin Dashboard
 */
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const rooms = await roomManager.getAllRooms();
    const totalSongs = rooms.reduce((sum, room) => sum + room.songCount, 0);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      rooms,
      totalRooms: rooms.length,
      totalSongs,
      activeRooms: rooms.filter(r => r.active).length,
      slogan: utils.randomSlogan()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Rooms Management
 */
router.get('/rooms', requireAdmin, async (req, res, next) => {
  try {
    const rooms = await roomManager.getAllRooms();
    res.render('admin/rooms', {
      title: 'Room Management',
      rooms,
      slogan: utils.randomSlogan()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Room Details and Song Management
 */
router.get('/rooms/:roomName', requireAdmin, async (req, res, next) => {
  try {
    const { roomName } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const roomExists = await roomManager.roomExists(roomName);
    if (!roomExists) {
      return res.status(404).send('Room not found');
    }

    const roomMetadata = await roomManager.getRoomMetadata(roomName);
    const songData = await songManager.getRoomSongs(roomName, page, limit);

    res.render('admin/room-details', {
      title: `Room: ${roomName}`,
      roomName,
      roomMetadata,
      songs: songData.songs,
      pagination: songData.pagination,
      slogan: utils.randomSlogan()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * API Routes
 */

// Get all rooms
router.get('/api/rooms', requireAdmin, async (req, res, next) => {
  try {
    const rooms = await roomManager.getAllRooms();
    res.json(rooms);
  } catch (error) {
    next(error);
  }
});

// Create new room
router.post('/api/rooms', requireAdmin, async (req, res, next) => {
  try {
    const { name, description, active = true } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const room = await roomManager.createRoom(
      name,
      { description, active },
      req.session.user
    );

    res.status(201).json(room);
  } catch (error) {
    if (error.message === 'Room already exists') {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
});

// Update room
router.put('/api/rooms/:roomName', requireAdmin, async (req, res, next) => {
  try {
    const { roomName } = req.params;
    const { description, active } = req.body;

    const room = await roomManager.updateRoom(
      roomName,
      { description, active },
      req.session.user
    );

    res.json(room);
  } catch (error) {
    if (error.message === 'Room does not exist') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// Delete room
router.delete('/api/rooms/:roomName', requireAdmin, async (req, res, next) => {
  try {
    const { roomName } = req.params;
    const result = await roomManager.deleteRoom(roomName);
    res.json(result);
  } catch (error) {
    if (error.message === 'Room does not exist') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// Activate/Deactivate room in game
router.post('/api/rooms/:roomName/activate', requireAdmin, async (req, res, next) => {
  try {
    const { roomName } = req.params;
    await roomManager.activateRoom(roomName);
    res.json({ success: true, message: 'Room activated' });
  } catch (error) {
    next(error);
  }
});

router.post('/api/rooms/:roomName/deactivate', requireAdmin, async (req, res, next) => {
  try {
    const { roomName } = req.params;
    await roomManager.deactivateRoom(roomName);
    res.json({ success: true, message: 'Room deactivated' });
  } catch (error) {
    next(error);
  }
});

// Get songs in room
router.get('/api/rooms/:roomName/songs', requireAdmin, async (req, res, next) => {
  try {
    const { roomName } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const songData = await songManager.getRoomSongs(roomName, page, limit);
    res.json(songData);
  } catch (error) {
    next(error);
  }
});

// Add song to room
router.post('/api/rooms/:roomName/songs', requireAdmin, async (req, res, next) => {
  try {
    const { roomName } = req.params;
    const { trackId, artistName, trackName, trackViewUrl, previewUrl, artworkUrl60, artworkUrl100 } = req.body;

    const song = await songManager.addSongToRoom(roomName, {
      trackId,
      artistName,
      trackName,
      trackViewUrl,
      previewUrl,
      artworkUrl60,
      artworkUrl100
    });

    res.status(201).json(song);
  } catch (error) {
    if (error.message.includes('Missing required song data') || error.message === 'Song already exists in room') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

// Remove song from room
router.delete('/api/rooms/:roomName/songs/:songId', requireAdmin, async (req, res, next) => {
  try {
    const { roomName, songId } = req.params;
    const result = await songManager.removeSongFromRoom(roomName, songId);
    res.json(result);
  } catch (error) {
    if (error.message === 'Song not found in room') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// Import from Apple Music playlist
router.post('/api/rooms/:roomName/import', requireAdmin, async (req, res, next) => {
  try {
    const { roomName } = req.params;
    const { playlistUrl, includeArtistSongs = false, songsPerArtist = 1, sortBy = 'popular' } = req.body;

    if (!playlistUrl) {
      return res.status(400).json({ error: 'Playlist URL is required' });
    }

    if (!appleMusicImporter.isValidAppleMusicUrl(playlistUrl)) {
      return res.status(400).json({ error: 'Invalid Apple Music URL' });
    }

    // Import songs from playlist
    const importResult = await appleMusicImporter.importFromPlaylist(playlistUrl, {
      includeArtistSongs,
      songsPerArtist,
      sortBy
    });

    // Add songs to room
    const addResult = await songManager.bulkAddSongsToRoom(roomName, importResult.songs);

    res.json({
      imported: importResult.songs.length,
      added: addResult.added.length,
      skipped: addResult.skipped.length,
      errors: addResult.errors.length,
      details: addResult
    });
  } catch (error) {
    next(error);
  }
});

// Search Apple Music
router.get('/api/search/songs', requireAdmin, async (req, res, next) => {
  try {
    const { q: query, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const songs = await appleMusicImporter.searchSongs(query, parseInt(limit));
    res.json(songs);
  } catch (error) {
    next(error);
  }
});

// Get song details from Apple Music
router.get('/api/songs/:trackId/details', requireAdmin, async (req, res, next) => {
  try {
    const { trackId } = req.params;
    const song = await appleMusicImporter.getSongById(trackId);
    res.json(song);
  } catch (error) {
    if (error.message === 'Song not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// Search songs in database
router.get('/api/search/database', requireAdmin, async (req, res, next) => {
  try {
    const { q: query, limit = 50 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const songs = await songManager.searchSongs(query, parseInt(limit));
    res.json(songs);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
