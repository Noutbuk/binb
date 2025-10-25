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
    var queryParamIndex = url.indexOf('?');
    var urlWithoutQueryParams = url.substring(0, queryParamIndex != -1 ? queryParamIndex : url.length);
    return Number(urlWithoutQueryParams.split('/').at(-1));
  }

  dedup(list) {
    return Array.from(new Set(list));
  }

  async scrapeLinksFromPage(pageUrl, selector) {
    await this.limiterAppleMusic.removeTokens(1);
    const response = await fetch(pageUrl);
    const body = await response.text();
    const dom = new JSDOM(body);
    let page = JSON.parse(Array.from(dom.window.document.querySelectorAll("#schema\\:music-playlist"))[0].textContent);
    let links = page.track.map((elem) => elem.url);
    return links;
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
   * Import songs from Apple Music playlist
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

      onProgress({ stage: 'Fetching playlist songs', progress: 0 });

      // Get direct songs from playlist
      const songUrls = await this.getSongUrlsFromPlaylistUrl(playlistUrl);
      onProgress({ stage: 'Fetching song metadata', progress: 25 });

      const directSongs = await this.getSongsByEntityUrlInBatches(songUrls);
      result.songs = [...directSongs];
      result.totalProcessed += directSongs.length;

      if (includeArtistSongs) {
        onProgress({ stage: 'Fetching artists from playlist', progress: 50 });
        
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
      console.error('Error importing from playlist:', error);
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
   * Search iTunes for artists by name
   */
  async searchArtists(artistName, limit = 10) {
    try {
      await this.limiterITunes.removeTokens(1);

      const url = new URL('https://itunes.apple.com/search');
      url.searchParams.set('term', artistName);
      url.searchParams.set('entity', 'musicArtist');
      url.searchParams.set('limit', limit);

      const response = await fetch(url);
      const { results } = await response.json();
      
      return results.filter((result) => result.wrapperType === 'artist');
    } catch (error) {
      console.error('Error searching artists:', error);
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
             (url.includes('/playlist/') || url.includes('/song/') || url.includes('/artist/'));
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

  /**
   * Import songs from Apple Music artist
   */
  async importFromArtist(artistUrlOrId, options = {}) {
    try {
      const { 
        songsToImport = 5, 
        sortBy = 'popular'
      } = options;

      const result = {
        songs: [],
        totalProcessed: 0,
        errors: []
      };

      // Handle both URL and direct ID input
      let artistId;
      if (typeof artistUrlOrId === 'string' && artistUrlOrId.includes('music.apple.com')) {
        // It's a URL, extract the ID
        artistId = this.extractAppleMusicId(artistUrlOrId);
      } else if (typeof artistUrlOrId === 'string' && /^\d+$/.test(artistUrlOrId)) {
        // It's a direct ID
        artistId = parseInt(artistUrlOrId);
      } else if (typeof artistUrlOrId === 'number') {
        // It's already a number
        artistId = artistUrlOrId;
      } else {
        throw new Error('Invalid artist URL or ID format');
      }

      // Get songs from artist - getSongsByEntityUrl expects URLs, so we need to build the iTunes API call directly
      await this.limiterITunes.removeTokens(1);

      const url = new URL('https://itunes.apple.com/lookup');
      url.searchParams.set('id', artistId);
      url.searchParams.set('entity', 'song');
      url.searchParams.set('limit', songsToImport);
      url.searchParams.set('sort', sortBy);

      const response = await fetch(url);
      const { results } = await response.json();
      const artistSongs = results.filter((result) => result.wrapperType === 'track');
      
      result.songs = artistSongs;
      result.totalProcessed = artistSongs.length;

      return result;
    } catch (error) {
      console.error('Error importing from artist:', error);
      throw error;
    }
  }
}

module.exports = new AppleMusicImporter();