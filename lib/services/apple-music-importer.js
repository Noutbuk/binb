'use strict';

const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const limiter = require('limiter');
const { RateLimiter } = limiter;

class AppleMusicImporter {
  constructor() {
    this.limiterITunes = new RateLimiter({ tokensPerInterval: 1, interval: 500 });
    this.limiterAppleMusic = new RateLimiter({
      tokensPerInterval: 1,
      interval: 'second'
    });
  }

  extractId(url) {
    return Number(url.split('/').at(-1));
  }

  dedup(list) {
    return Array.from(new Set(list));
  }

  async scrapeLinksFromPage(pageUrl, selector) {
    await this.limiterAppleMusic.removeTokens(1);
    const response = await fetch(pageUrl);
    const body = await response.text();
    const dom = new JSDOM(body);
    const playlistSchema = Array.from(dom.window.document.querySelectorAll("#schema\\:music-playlist"));
    const albumSchema = Array.from(dom.window.document.querySelectorAll("#schema\\:music-album"));
    const groupSchema = Array.from(dom.window.document.querySelectorAll("#schema\\:music-group"));
    if (playlistSchema.length > 0) {
      const schema = JSON.parse(playlistSchema[0].textContent);
      const links = schema.track.map((elem) => elem.url);
      return links;
    } else if (albumSchema.length > 0) {
      const schema = JSON.parse(albumSchema[0].textContent);
      const links = schema.tracks.map((elem) => elem.url);
      return links;
    } else if (groupSchema.length > 0) {
      const schema = JSON.parse(groupSchema[0].textContent);
      const links = schema.tracks.map((elem) => elem.url);
      return links;
    } else {
      throw new Error('No valid Apple Music playlist, album, or group schema found on page');
    }
  }

  async getArtistUrlsFromPlaylistUrls(playlistUrls) {
    const artistsFromPlaylistsPromises = playlistUrls.map(
      this.getArtistUrlsFromPlaylistUrl.bind(this)
    );
    return (await Promise.all(artistsFromPlaylistsPromises)).flat();
  }

  async getArtistUrlsFromPlaylistUrl(playlistUrl) {
    return this.scrapeLinksFromPage(playlistUrl, '.songs-list__col--secondary a');
  }

  async getSongUrlsFromPlaylistUrls(playlistUrls) {
    const songUrlsFromPlaylistsPromises = playlistUrls.map(
      this.getSongUrlsFromPlaylistUrl.bind(this)
    );
    return (await Promise.all(songUrlsFromPlaylistsPromises)).flat();
  }

  async getSongUrlsFromPlaylistUrl(playlistUrl) {
    return this.scrapeLinksFromPage(playlistUrl, 'a[data-testid="track-seo-link"]');
  }

  async getSongsByEntityUrl(entityUrls, limit = 1, sort = 'popular') {
    await this.limiterITunes.removeTokens(1);

    const url = new URL('https://itunes.apple.com/lookup');
    url.searchParams.set('id', entityUrls.map(this.extractId));
    url.searchParams.set('entity', 'song');
    url.searchParams.set('limit', limit);
    url.searchParams.set('sort', sort);

    const response = await fetch(url);
    const { results } = await response.json();
    const songs = results.filter((result) => result.wrapperType === 'track');
    return songs;
  }

  async getSongsByEntityUrlInBatches(entityUrls, limit, sort) {
    const batchSize = 50;

    let batches = [];
    for (let i = 0; i < entityUrls.length; i += batchSize) {
      batches.push(entityUrls.slice(i, i + batchSize));
    }

    const promises = batches.map((batch) => {
      return this.getSongsByEntityUrl(batch, limit, sort);
    });

    return (await Promise.all(promises)).flat();
  }

  /**
   * Import songs from Apple Music playlist or album
   */
  async importFromPlaylist(playlistUrl, options = {}) {
    try {
      const { 
        includeArtistSongs = false, 
        songsPerArtist = 1, 
        sortBy = 'popular',
        onProgress = () => {} 
      } = options;

      const result = {
        songs: [],
        artists: [],
        totalProcessed: 0,
        errors: []
      };

      onProgress({ stage: 'Fetching songs', progress: 0 });

      // Get direct songs from playlist
      const songUrls = await this.getSongUrlsFromPlaylistUrl(playlistUrl);
      onProgress({ stage: 'Fetching song metadata', progress: 25 });

      const directSongs = await this.getSongsByEntityUrlInBatches(songUrls);
      result.songs = [...directSongs];
      result.totalProcessed += directSongs.length;

      if (includeArtistSongs) {
        onProgress({ stage: 'Fetching artists', progress: 50 });
        
        // Get artists from playlist
        const artistUrls = await this.getArtistUrlsFromPlaylistUrl(playlistUrl);
        const deduplicatedArtistUrls = this.dedup(artistUrls);
        
        onProgress({ stage: 'Fetching artist songs', progress: 75 });
        
        // Get songs from artists
        const artistSongs = await this.getSongsByEntityUrlInBatches(
          deduplicatedArtistUrls,
          songsPerArtist,
          sortBy
        );
        
        result.songs = this.dedup([...result.songs, ...artistSongs]);
        result.artists = deduplicatedArtistUrls;
        result.totalProcessed += artistSongs.length;
      }

      onProgress({ stage: 'Complete', progress: 100 });

      return result;
    } catch (error) {
      console.error('Error importing:', error);
      throw error;
    }
  }

  /**
   * Import songs from multiple playlists
   */
  async importFromMultiplePlaylists(playlistUrls, options = {}) {
    try {
      const results = {
        songs: [],
        artists: [],
        totalProcessed: 0,
        playlistResults: [],
        errors: []
      };

      const { onProgress = () => {} } = options;

      for (let i = 0; i < playlistUrls.length; i++) {
        const playlistUrl = playlistUrls[i];
        
        try {
          onProgress({ 
            stage: `Processing playlist ${i + 1} of ${playlistUrls.length}`, 
            progress: (i / playlistUrls.length) * 100,
            currentPlaylist: playlistUrl
          });

          const playlistResult = await this.importFromPlaylist(playlistUrl, {
            ...options,
            onProgress: (subProgress) => {
              onProgress({
                stage: `Playlist ${i + 1}: ${subProgress.stage}`,
                progress: ((i + subProgress.progress / 100) / playlistUrls.length) * 100,
                currentPlaylist: playlistUrl
              });
            }
          });

          results.playlistResults.push({
            url: playlistUrl,
            ...playlistResult
          });

          results.songs = this.dedup([...results.songs, ...playlistResult.songs]);
          results.artists = this.dedup([...results.artists, ...playlistResult.artists]);
          results.totalProcessed += playlistResult.totalProcessed;

        } catch (error) {
          console.error(`Error processing playlist ${playlistUrl}:`, error);
          results.errors.push({
            playlist: playlistUrl,
            error: error.message
          });
        }
      }

      onProgress({ stage: 'Complete', progress: 100 });

      return results;
    } catch (error) {
      console.error('Error importing from multiple playlists:', error);
      throw error;
    }
  }

  /**
   * Search Apple Music for songs
   */
  async searchSongs(query, limit = 20) {
    try {
      await this.limiterITunes.removeTokens(1);

      const url = new URL('https://itunes.apple.com/search');
      url.searchParams.set('term', query);
      url.searchParams.set('entity', 'song');
      url.searchParams.set('limit', limit);
      url.searchParams.set('media', 'music');

      const response = await fetch(url);
      const { results } = await response.json();
      
      return results.filter((result) => result.wrapperType === 'track');
    } catch (error) {
      console.error('Error searching songs:', error);
      throw error;
    }
  }

  /**
   * Get song details by iTunes ID
   */
  async getSongById(trackId) {
    try {
      await this.limiterITunes.removeTokens(1);

      const url = new URL('https://itunes.apple.com/lookup');
      url.searchParams.set('id', trackId);
      url.searchParams.set('entity', 'song');

      const response = await fetch(url);
      const { results } = await response.json();
      
      const song = results.find((result) => result.wrapperType === 'track');
      if (!song) {
        throw new Error('Song not found');
      }

      return song;
    } catch (error) {
      console.error('Error getting song by ID:', error);
      throw error;
    }
  }

  /**
   * Validate Apple Music URL
   */
  isValidAppleMusicUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'music.apple.com' && 
             (url.includes('/playlist/') || url.includes('/album/') || url.includes('/artist/'));
    } catch {
      return false;
    }
  }

  /**
   * Extract Apple Music ID from URL
   */
  extractAppleMusicId(url) {
    try {
      if (!this.isValidAppleMusicUrl(url)) {
        throw new Error('Invalid Apple Music URL');
      }
      return this.extractId(url);
    } catch (error) {
      console.error('Error extracting Apple Music ID:', error);
      throw error;
    }
  }
}

module.exports = new AppleMusicImporter();