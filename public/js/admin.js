$(document).ready(function() {
  // Rooms page functionality
  if (window.location.pathname === '/admin/rooms') {
    initRoomsPage();
  }
  
  // Room details functionality
  if (window.location.pathname.startsWith('/admin/rooms/')) {
    initRoomDetails();
  }
});

function initRoomsPage() {
  // Search functionality
  $('#search-input').on('input', function() {
    var query = $(this).val().toLowerCase();
    filterRooms(query);
  });
  
  // Filter buttons
  $('#filter-all').click(function() {
    $('.btn-group .btn').removeClass('active');
    $(this).addClass('active');
    $('#rooms-table tbody tr').show();
  });
  
  $('#filter-active').click(function() {
    $('.btn-group .btn').removeClass('active');
    $(this).addClass('active');
    $('#rooms-table tbody tr').hide();
    $('#rooms-table tbody tr[data-active="true"]').show();
  });
  
  $('#filter-inactive').click(function() {
    $('.btn-group .btn').removeClass('active');
    $(this).addClass('active');
    $('#rooms-table tbody tr').hide();
    $('#rooms-table tbody tr[data-active="false"]').show();
  });
  
  // Create room
  $('#create-room-btn').click(function() {
    $('#createRoomModal').modal('show');
  });
  
  $('#createRoomSubmit').click(function() {
    createRoom();
  });
  
  // Edit room
  $('.edit-room-btn').click(function() {
    var roomName = $(this).data('room');
    editRoom(roomName);
  });
  
  $('#editRoomSubmit').click(function() {
    updateRoom();
  });
  
  // Activate/Deactivate room
  $('.activate-room-btn').click(function() {
    var roomName = $(this).data('room');
    toggleRoomStatus(roomName, true);
  });
  
  $('.deactivate-room-btn').click(function() {
    var roomName = $(this).data('room');
    toggleRoomStatus(roomName, false);
  });
  
  // Delete room
  $('.delete-room-btn').click(function() {
    var roomName = $(this).data('room');
    var songCount = $(this).closest('tr').find('.badge').text();
    confirmDeleteRoom(roomName, songCount);
  });
  
  $('#deleteRoomConfirm').click(function() {
    deleteRoom();
  });
}

// Global variable to track if songs were added in the current modal session
var songsAddedThisSession = false;

function initRoomDetails() {
  var roomName = window.location.pathname.split('/').pop();
  
  // Add song
  $('#add-song-btn').click(function() {
    songsAddedThisSession = false; // Reset when opening modal
    $('#addSongModal').modal('show');
  });
  
  // Handle modal close events - refresh if songs were added
  // Bootstrap 2 uses 'hidden' instead of 'hidden.bs.modal'
  $('#addSongModal').on('hidden', function() {
    if (songsAddedThisSession) {
      location.reload();
    }
  });
  
  // Search songs
  $('#search-btn').click(function() {
    var query = $('#song-search').val();
    if (query.trim()) {
      searchAppleMusicSongs(query);
    }
  });
  
  $('#song-search').keypress(function(e) {
    if (e.which === 13) {
      $('#search-btn').click();
    }
  });
  
  // Import playlist
  $('#import-playlist-btn').click(function() {
    $('#importPlaylistModal').modal('show');
  });
  
  $('#include-artist-songs').change(function() {
    if ($(this).is(':checked')) {
      $('#artist-options').show();
    } else {
      $('#artist-options').hide();
    }
  });
  
  $('#import-submit').click(function() {
    importPlaylist(roomName);
  });

  // Import artist
  $('#import-artist-btn').click(function() {
    resetArtistModal();
    $('#importArtistModal').modal('show');
  });
  
  // Artist search
  $('#artist-search-btn').click(function() {
    var query = $('#artist-search-input').val();
    if (query.trim()) {
      searchArtists(query);
    }
  });
  
  $('#artist-search-input').keypress(function(e) {
    if (e.which === 13) {
      $('#artist-search-btn').click();
    }
  });
  
  // Step navigation
  $('#back-to-search-btn').click(function() {
    showArtistSearchStep();
  });
  
  $('#import-artist-submit').click(function() {
    importArtist(roomName);
  });
  
  // Song actions
  $('.preview-btn').click(function() {
    var previewUrl = $(this).data('preview');
    playPreview(previewUrl);
  });
  
  $('.delete-song-btn').click(function() {
    var songId = $(this).data('song-id');
    if (confirm('Are you sure you want to remove this song from the room?')) {
      deleteSong(roomName, songId);
    }
  });
  
  // Select all checkbox
  $('#select-all').change(function() {
    $('.song-checkbox').prop('checked', $(this).is(':checked'));
    updateBulkActionsState();
  });

  // Individual song checkboxes
  $(document).on('change', '.song-checkbox', function() {
    updateBulkActionsState();
    
    // Update select-all state
    var totalCheckboxes = $('.song-checkbox').length;
    var checkedCheckboxes = $('.song-checkbox:checked').length;
    
    if (checkedCheckboxes === totalCheckboxes) {
      $('#select-all').prop('checked', true);
      $('#select-all').prop('indeterminate', false);
    } else if (checkedCheckboxes === 0) {
      $('#select-all').prop('checked', false);
      $('#select-all').prop('indeterminate', false);
    } else {
      $('#select-all').prop('checked', false);
      $('#select-all').prop('indeterminate', true);
    }
  });

  // Bulk actions
  $('#bulk-actions-btn').click(function() {
    var selectedCount = $('.song-checkbox:checked').length;
    if (selectedCount === 0) {
      alert('Please select at least one song');
      return;
    }
    
    $('#selectedSongsCount').text(`${selectedCount} song(s) selected`);
    $('#bulkActionsModal').modal('show');
  });

  // Bulk action radio buttons
  $('input[name="bulkAction"]').change(function() {
    $('#bulkActionExecute').prop('disabled', false);
  });

  // Execute bulk action
  $('#bulkActionExecute').click(function() {
    executeBulkAction(roomName);
  });

  // Edit room info
  $('#edit-room-btn').click(function() {
    editRoomInfo(roomName);
  });

  $('#editRoomSubmit').click(function() {
    updateRoomInfo();
  });

  // Edit song
  $('.edit-song-btn').click(function() {
    var songId = $(this).data('song-id');
    editSong(roomName, songId);
  });

  $('#editSongSubmit').click(function() {
    updateSong(roomName);
  });
}

function filterRooms(query) {
  $('#rooms-table tbody tr').each(function() {
    var roomName = $(this).find('strong').text().toLowerCase();
    var description = $(this).find('td:nth-child(2)').text().toLowerCase();
    
    if (roomName.includes(query) || description.includes(query)) {
      $(this).show();
    } else {
      $(this).hide();
    }
  });
}

function createRoom() {
  var formData = {
    name: $('#roomName').val(),
    description: $('#roomDescription').val(),
    active: $('input[name="active"]').is(':checked')
  };
  
  $.ajax({
    url: '/admin/api/rooms',
    method: 'POST',
    data: JSON.stringify(formData),
    contentType: 'application/json',
    success: function(data) {
      $('#createRoomModal').modal('hide');
      location.reload();
    },
    error: function(xhr) {
      var error = xhr.responseJSON ? xhr.responseJSON.error : 'Error creating room';
      alert('Error: ' + error);
    }
  });
}

function editRoom(roomName) {
  // Get current room data
  var row = $(`tr[data-room-name="${roomName}"]`);
  var description = row.find('td:nth-child(2)').text();
  var active = row.data('active');
  
  $('#editRoomName').val(roomName);
  $('#editRoomDescription').val(description === 'No description' ? '' : description);
  $('#editRoomActive').prop('checked', active);
  
  $('#editRoomModal').modal('show');
}

function updateRoom() {
  var roomName = $('#editRoomName').val();
  var formData = {
    description: $('#editRoomDescription').val(),
    active: $('#editRoomActive').is(':checked')
  };
  
  $.ajax({
    url: `/admin/api/rooms/${roomName}`,
    method: 'PUT',
    data: JSON.stringify(formData),
    contentType: 'application/json',
    success: function(data) {
      $('#editRoomModal').modal('hide');
      location.reload();
    },
    error: function(xhr) {
      var error = xhr.responseJSON ? xhr.responseJSON.error : 'Error updating room';
      alert('Error: ' + error);
    }
  });
}

function toggleRoomStatus(roomName, activate) {
  var action = activate ? 'activate' : 'deactivate';
  
  $.ajax({
    url: `/admin/api/rooms/${roomName}/${action}`,
    method: 'POST',
    success: function(data) {
      location.reload();
    },
    error: function(xhr) {
      var error = xhr.responseJSON ? xhr.responseJSON.error : `Error ${action}ing room`;
      alert('Error: ' + error);
    }
  });
}

function confirmDeleteRoom(roomName, songCount) {
  $('#deleteRoomName').text(roomName);
  $('#deleteRoomSongs').text(songCount);
  $('#deleteRoomConfirm').data('room', roomName);
  $('#deleteRoomModal').modal('show');
}

function deleteRoom() {
  var roomName = $('#deleteRoomConfirm').data('room');
  
  $.ajax({
    url: `/admin/api/rooms/${roomName}`,
    method: 'DELETE',
    success: function(data) {
      $('#deleteRoomModal').modal('hide');
      location.reload();
    },
    error: function(xhr) {
      var error = xhr.responseJSON ? xhr.responseJSON.error : 'Error deleting room';
      alert('Error: ' + error);
    }
  });
}

function searchAppleMusicSongs(query) {
  $('#search-results').html('<div class="text-center"><i class="icon-spinner icon-spin"></i> Searching...</div>');
  
  $.ajax({
    url: '/admin/api/search/songs',
    data: { q: query, limit: 20 },
    success: function(songs) {
      displaySearchResults(songs);
    },
    error: function(xhr) {
      $('#search-results').html('<div class="alert alert-error">Error searching songs</div>');
    }
  });
}

function displaySearchResults(songs) {
  if (songs.length === 0) {
    $('#search-results').html('<div class="alert alert-info">No songs found</div>');
    return;
  }
  
  var html = '<div class="search-results-list">';
  songs.forEach(function(song) {
    html += `
      <div class="search-result-item well well-small">
        <div class="row-fluid">
          <div class="span2">
            ${song.artworkUrl60 ? `<img src="${song.artworkUrl60}" width="40" height="40">` : '<div class="artwork-placeholder">🎵</div>'}
          </div>
          <div class="span7">
            <strong>${escapeHtml(song.artistName)}</strong><br>
            ${escapeHtml(song.trackName)}
          </div>
          <div class="span3 text-right">
            <button class="btn btn-mini btn-primary add-song-result" 
                    data-track-id="${song.trackId}"
                    data-artist="${escapeHtml(song.artistName)}"
                    data-track="${escapeHtml(song.trackName)}"
                    data-view-url="${song.trackViewUrl || ''}"
                    data-preview-url="${song.previewUrl || ''}"
                    data-artwork-60="${song.artworkUrl60 || ''}"
                    data-artwork-100="${song.artworkUrl100 || ''}">
              Add
            </button>
          </div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  
  $('#search-results').html(html);
  
  // Add click handlers for add buttons
  $('.add-song-result').click(function() {
    var roomName = window.location.pathname.split('/').pop();
    var songData = {
      trackId: $(this).data('track-id'),
      artistName: $(this).data('artist'),
      trackName: $(this).data('track'),
      trackViewUrl: $(this).data('view-url'),
      previewUrl: $(this).data('preview-url'),
      artworkUrl60: $(this).data('artwork-60'),
      artworkUrl100: $(this).data('artwork-100')
    };
    
    addSongToRoom(roomName, songData);
  });
}

function addSongToRoom(roomName, songData) {
  var button = $(`.add-song-result[data-track-id="${songData.trackId}"]`);
  var originalText = button.text();
  
  button.prop('disabled', true).text('Adding...');
  
  $.ajax({
    url: `/admin/api/rooms/${roomName}/songs`,
    method: 'POST',
    data: JSON.stringify(songData),
    contentType: 'application/json',
    success: function(data) {
      button.removeClass('btn-primary').addClass('btn-success').text('Added!');
      songsAddedThisSession = true; // Mark that a song was successfully added
    },
    error: function(xhr) {
      button.prop('disabled', false).text(originalText);
      var error = xhr.responseJSON ? xhr.responseJSON.error : 'Error adding song';
      if (error.includes('already exists')) {
        button.removeClass('btn-primary').addClass('btn-warning').text('Already added');
      } else {
        alert('Error: ' + error);
      }
    }
  });
}

function importPlaylist(roomName) {
  var playlistUrl = $('#playlist-url').val();
  var includeArtistSongs = $('#include-artist-songs').is(':checked');
  var songsPerArtist = parseInt($('#songs-per-artist').val());
  var sortBy = $('#sort-by').val();
  
  if (!playlistUrl) {
    alert('Please enter a playlist URL');
    return;
  }
  
  // Show progress
  $('#import-progress').show();
  $('#import-submit').prop('disabled', true);
  
  var importData = {
    playlistUrl: playlistUrl,
    includeArtistSongs: includeArtistSongs,
    songsPerArtist: songsPerArtist,
    sortBy: sortBy
  };
  
  $.ajax({
    url: `/admin/api/rooms/${roomName}/import`,
    method: 'POST',
    data: JSON.stringify(importData),
    contentType: 'application/json',
    success: function(data) {
      $('#import-progress').hide();
      $('#import-submit').prop('disabled', false);
      $('#importPlaylistModal').modal('hide');
      
      alert(`Import completed!\nImported: ${data.imported} songs\nAdded: ${data.added}\nSkipped: ${data.skipped}\nErrors: ${data.errors}`);
      location.reload();
    },
    error: function(xhr) {
      $('#import-progress').hide();
      $('#import-submit').prop('disabled', false);
      var error = xhr.responseJSON ? xhr.responseJSON.error : 'Error importing playlist';
      alert('Error: ' + error);
    }
  });
}

function resetArtistModal() {
  // Reset to step 1
  showArtistSearchStep();
  
  // Clear inputs
  $('#artist-search-input').val('');
  $('#selected-artist-url').val('');
  $('#songs-to-import').val('5');
  $('#artist-sort-by').val('popular');
  
  // Hide results
  $('#artist-search-results').hide();
  $('#artist-results-list').empty();
}

function showArtistSearchStep() {
  $('#artist-search-step').show();
  $('#artist-import-step').hide();
  $('#search-footer').show();
  $('#import-footer').hide();
  $('#import-artist-title').text('Import from Apple Music Artist - Search');
}

function showArtistImportStep() {
  $('#artist-search-step').hide();
  $('#artist-import-step').show();
  $('#search-footer').hide();
  $('#import-footer').show();
  $('#import-artist-title').text('Import from Apple Music Artist - Settings');
}

function searchArtists(query) {
  $('#artist-search-results').show();
  $('#artist-results-list').html('<div class="text-center"><i class="icon-spinner icon-spin"></i> Searching for artists...</div>');
  
  $.ajax({
    url: '/admin/api/search/artists',
    data: { q: query, limit: 10 },
    success: function(artists) {
      displayArtistResults(artists);
    },
    error: function(xhr) {
      $('#artist-results-list').html('<div class="alert alert-error">Error searching artists</div>');
    }
  });
}

function displayArtistResults(artists) {
  if (artists.length === 0) {
    $('#artist-results-list').html('<div class="alert alert-info">No artists found</div>');
    return;
  }
  
  var html = '<div class="artist-results-list">';
  artists.forEach(function(artist) {
    html += `
      <div class="artist-result-item well well-small">
        <div class="row-fluid">
          <div class="span8">
            <strong>${escapeHtml(artist.artistName)}</strong><br>
            <small class="text-muted">Genre: ${escapeHtml(artist.primaryGenreName || 'Unknown')}</small>
            ${artist.artistLinkUrl ? `<br><a href="${artist.artistLinkUrl}" target="_blank" class="text-info">View on Apple Music</a>` : ''}
          </div>
          <div class="span4 text-right">
            <button class="btn btn-mini btn-primary select-artist-btn" 
                    data-artist-url="${artist.artistLinkUrl || ''}"
                    data-artist-name="${escapeHtml(artist.artistName)}"
                    data-artist-id="${artist.artistId}">
              Select
            </button>
          </div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  
  $('#artist-results-list').html(html);
  
  // Add click handlers for select buttons
  $('.select-artist-btn').click(function() {
    var artistUrl = $(this).data('artist-url');
    var artistName = $(this).data('artist-name');
    var artistId = $(this).data('artist-id');
    
    selectArtist(artistUrl || artistId, artistName);
  });
}

function selectArtist(artistUrlOrId, artistName) {
  $('#selected-artist-url').val(artistUrlOrId);
  $('#selected-artist-url').attr('placeholder', `Selected: ${artistName}`);
  showArtistImportStep();
}

function importArtist(roomName) {
  var artistUrlOrId = $('#selected-artist-url').val();
  var songsToImport = parseInt($('#songs-to-import').val());
  var sortBy = $('#artist-sort-by').val();
  
  if (!artistUrlOrId) {
    alert('Please select an artist first');
    return;
  }
  
  if (!songsToImport || songsToImport < 1 || songsToImport > 50) {
    alert('Please enter a valid number of songs (1-50)');
    return;
  }
  
  // Disable submit button
  $('#import-artist-submit').prop('disabled', true).text('Importing...');
  
  var importData = {
    artistUrlOrId: artistUrlOrId,
    songsToImport: songsToImport,
    sortBy: sortBy
  };
  
  $.ajax({
    url: `/admin/api/rooms/${roomName}/import-artist`,
    method: 'POST',
    data: JSON.stringify(importData),
    contentType: 'application/json',
    success: function(data) {
      $('#import-artist-submit').prop('disabled', false).text('Import Songs');
      $('#importArtistModal').modal('hide');
      
      alert(`Artist import completed!\nImported: ${data.imported} songs\nAdded: ${data.added}\nSkipped: ${data.skipped}\nErrors: ${data.errors}`);
      location.reload();
    },
    error: function(xhr) {
      $('#import-artist-submit').prop('disabled', false).text('Import Songs');
      var error = xhr.responseJSON ? xhr.responseJSON.error : 'Error importing artist songs';
      alert('Error: ' + error);
    }
  });
}

function deleteSong(roomName, songId) {
  $.ajax({
    url: `/admin/api/rooms/${roomName}/songs/${songId}`,
    method: 'DELETE',
    success: function(data) {
      location.reload();
    },
    error: function(xhr) {
      var error = xhr.responseJSON ? xhr.responseJSON.error : 'Error deleting song';
      alert('Error: ' + error);
    }
  });
}

function playPreview(previewUrl) {
  var audio = $('#preview-audio')[0];
  audio.src = previewUrl;
  audio.play();
}

function editRoomInfo(roomName) {
  // Get current room data from the page
  var description = $('.hero-unit p').text();
  if (description === 'No description') {
    description = '';
  }
  var active = $('.label-success').length > 0;
  
  $('#editRoomName').val(roomName);
  $('#editRoomDescription').val(description);
  $('#editRoomActive').prop('checked', active);
  
  $('#editRoomModal').modal('show');
}

function updateRoomInfo() {
  var roomName = $('#editRoomName').val();
  var formData = {
    description: $('#editRoomDescription').val(),
    active: $('#editRoomActive').is(':checked')
  };
  
  $.ajax({
    url: `/admin/api/rooms/${roomName}`,
    method: 'PUT',
    data: JSON.stringify(formData),
    contentType: 'application/json',
    success: function(data) {
      $('#editRoomModal').modal('hide');
      location.reload();
    },
    error: function(xhr) {
      var error = xhr.responseJSON ? xhr.responseJSON.error : 'Error updating room';
      alert('Error: ' + error);
    }
  });
}

function editSong(roomName, songId) {
  // Get current song data from the table row
  var row = $(`tr[data-song-id="${songId}"]`);
  var artist = row.find('td:nth-child(3)').text(); // Artist column
  var track = row.find('td:nth-child(4)').text();  // Track column
  
  // Get URLs from buttons if they exist
  var trackViewUrl = '';
  var previewUrl = '';
  
  var iTunesBtn = row.find('a[href*="itunes.apple.com"]');
  if (iTunesBtn.length > 0) {
    trackViewUrl = iTunesBtn.attr('href');
  }
  
  var previewBtn = row.find('.preview-btn');
  if (previewBtn.length > 0) {
    previewUrl = previewBtn.data('preview');
  }
  
  // Populate the modal
  $('#editSongId').val(songId);
  $('#editSongArtist').val(artist);
  $('#editSongTrack').val(track);
  $('#editSongViewUrl').val(trackViewUrl);
  $('#editSongPreviewUrl').val(previewUrl);
  
  $('#editSongModal').modal('show');
}

function updateSong(roomName) {
  var songId = $('#editSongId').val();
  var formData = {
    artistName: $('#editSongArtist').val(),
    trackName: $('#editSongTrack').val(),
    trackViewUrl: $('#editSongViewUrl').val(),
    previewUrl: $('#editSongPreviewUrl').val()
  };
  
  $.ajax({
    url: `/admin/api/rooms/${roomName}/songs/${songId}`,
    method: 'PUT',
    data: JSON.stringify(formData),
    contentType: 'application/json',
    success: function(data) {
      $('#editSongModal').modal('hide');
      location.reload();
    },
    error: function(xhr) {
      var error = xhr.responseJSON ? xhr.responseJSON.error : 'Error updating song';
      alert('Error: ' + error);
    }
  });
}

function updateBulkActionsState() {
  var selectedCount = $('.song-checkbox:checked').length;
  var bulkButton = $('#bulk-actions-btn');
  
  if (selectedCount > 0) {
    bulkButton.removeClass('btn-warning').addClass('btn-warning');
    bulkButton.text(`Bulk Actions (${selectedCount})`);
  } else {
    bulkButton.removeClass('btn-warning').addClass('btn-warning');
    bulkButton.text('Bulk Actions');
  }
}

function executeBulkAction(roomName) {
  var selectedAction = $('input[name="bulkAction"]:checked').val();
  var selectedSongIds = [];
  
  $('.song-checkbox:checked').each(function() {
    selectedSongIds.push($(this).val());
  });
  
  if (selectedSongIds.length === 0) {
    alert('No songs selected');
    return;
  }
  
  if (selectedAction === 'delete') {
    if (confirm(`Are you sure you want to delete ${selectedSongIds.length} song(s)? This action cannot be undone.`)) {
      bulkDeleteSongs(roomName, selectedSongIds);
    }
  } else if (selectedAction === 'export') {
    exportSongsToCSV(roomName, selectedSongIds);
  }
}

function bulkDeleteSongs(roomName, songIds) {
  $('#bulkActionsModal').modal('hide');
  
  // Show progress
  var progress = 0;
  var total = songIds.length;
  
  alert(`Deleting ${total} songs...`);
  
  // Delete songs one by one (could be optimized with bulk API endpoint)
  var deletePromises = songIds.map(function(songId) {
    return $.ajax({
      url: `/admin/api/rooms/${roomName}/songs/${songId}`,
      method: 'DELETE'
    });
  });
  
  Promise.all(deletePromises)
    .then(function() {
      alert(`Successfully deleted ${total} songs`);
      location.reload();
    })
    .catch(function(error) {
      alert(`Error deleting songs: ${error.responseJSON ? error.responseJSON.error : 'Unknown error'}`);
      location.reload();
    });
}

function exportSongsToCSV(roomName, songIds) {
  var csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Artist,Track,iTunes URL,Preview URL\n";
  
  // Get data from table rows
  songIds.forEach(function(songId) {
    var row = $(`tr[data-song-id="${songId}"]`);
    var artist = row.find('td:nth-child(3)').text().replace(/"/g, '""');
    var track = row.find('td:nth-child(4)').text().replace(/"/g, '""');
    
    var iTunesBtn = row.find('a[href*="itunes.apple.com"]');
    var iTunesUrl = iTunesBtn.length > 0 ? iTunesBtn.attr('href') : '';
    
    var previewBtn = row.find('.preview-btn');
    var previewUrl = previewBtn.length > 0 ? previewBtn.data('preview') : '';
    
    csvContent += `"${artist}","${track}","${iTunesUrl}","${previewUrl}"\n`;
  });
  
  var encodedUri = encodeURI(csvContent);
  var link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${roomName}-songs-export.csv`);
  document.body.appendChild(link);
  
  link.click();
  document.body.removeChild(link);
  
  $('#bulkActionsModal').modal('hide');
}

function escapeHtml(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}