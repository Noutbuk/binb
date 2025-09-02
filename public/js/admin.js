$(document).ready(function() {
  // Dashboard functionality
  if (window.location.pathname === '/admin') {
    initDashboard();
  }
  
  // Rooms page functionality
  if (window.location.pathname === '/admin/rooms') {
    initRoomsPage();
  }
  
  // Room details functionality
  if (window.location.pathname.startsWith('/admin/rooms/')) {
    initRoomDetails();
  }
});

function initDashboard() {
  // Create room button
  $('#create-room-btn').click(function() {
    $('#createRoomModal').modal('show');
  });
  
  // Create room form submission
  $('#createRoomSubmit').click(function() {
    createRoom();
  });
}

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

function initRoomDetails() {
  var roomName = window.location.pathname.split('/').pop();
  
  // Add song
  $('#add-song-btn').click(function() {
    $('#addSongModal').modal('show');
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
      setTimeout(function() {
        button.prop('disabled', false).removeClass('btn-success').addClass('btn-primary').text(originalText);
      }, 2000);
    },
    error: function(xhr) {
      button.prop('disabled', false).text(originalText);
      var error = xhr.responseJSON ? xhr.responseJSON.error : 'Error adding song';
      if (error.includes('already exists')) {
        button.removeClass('btn-primary').addClass('btn-warning').text('Already added');
        setTimeout(function() {
          button.removeClass('btn-warning').addClass('btn-primary').text(originalText);
        }, 2000);
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