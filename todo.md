# TODO List - Admin Interface Issues

## Outstanding Issues (Updated: September 4, 2025)

**Active issues requiring implementation:**

## Room Management Issues

### 1. Edit Song Button (No Function)
- [x] **Issue**: The edit button of a song in the admin room view has no function
- [x] **Test Result**: ❌ **CONFIRMED** - Button becomes active when clicked but no modal opens. Functionality not implemented.
- [ ] **Plan**:
  - Add click handler for `.edit-song-btn` in `admin.js`
  - Create edit song modal in `room-details.pug` with fields for:
    - Artist Name
    - Track Name
    - iTunes URL (optional)
    - Preview URL (optional)
  - Implement `editSong()` and `updateSong()` functions in `admin.js`
  - Add API endpoint in backend to handle song updates
  - Update Redis song data when changes are saved

### 2. Bulk Actions Button (Does Nothing)
- [x] **Issue**: The bulk action button in that view does nothing
- [x] **Test Result**: ❌ **CONFIRMED** - Button becomes active when clicked but no modal opens. Functionality not implemented.
- [ ] **Plan**:
  - Implement bulk actions modal with options:
    - Delete selected songs
    - Export selected songs to CSV
    - Move selected songs to another room
  - Add JavaScript to handle checkbox selection state
  - Implement `bulkDeleteSongs()` function in `admin.js`
  - Add backend API endpoints for bulk operations
  - Add confirmation dialogs for destructive actions

### 3. Modal Auto-Refresh Issue - Songs Not Visible After Adding
- [ ] **Issue**: When adding songs through the "Add Song" modal in room management, newly added songs are not visible after closing the modal (both X button and Cancel button). Page requires manual refresh to see new songs.
- [ ] **Test Result**: ❌ **CONFIRMED** - Both modal close methods fail to automatically refresh the page
  - ✅ Songs are successfully added to backend (confirmed by "Added!" button state)
  - ❌ X button close: Page does not auto-refresh, song count remains unchanged, new songs not visible
  - ❌ Cancel button close: Page does not auto-refresh, song count remains unchanged, new songs not visible
  - ❌ Bootstrap 2 modal `hidden` event handler not functioning correctly
- [ ] **Plan**:
  - Debug the Bootstrap 2 modal event binding in `admin.js`
  - Verify the `songsAddedThisSession` flag is being set correctly
  - Check if the modal `hidden` event is firing at all
  - Consider alternative approaches (e.g., success callback from AJAX, different event listeners)
  - Ensure `location.reload()` executes when songs are added and modal closes
  - Test with different Bootstrap 2 modal events if `hidden` doesn't work

## Implementation Priority

1. ❌ **High Priority**: Fix modal auto-refresh issue (affects user workflow) - **NEEDS IMPLEMENTATION**
2. ❌ **Medium Priority**: Edit song functionality (requires new modal and API) - **NEEDS IMPLEMENTATION**
3. ❌ **Low Priority**: Bulk actions (complex feature, may not be frequently used) - **NEEDS IMPLEMENTATION**

## Files to Modify

- `views/admin/room-details.pug` - Template changes for UI improvements
- `public/js/admin.js` - JavaScript functionality for all features
- `routes/admin.js` - Backend API endpoints for edit/bulk operations  
- `lib/services/room-manager.js` - Song update operations
- `public/css/style.css` - Styling fixes if needed



# HUMAN
* switch to new redis client without legacy mode
* solve issue, that the itunes url is deleted after a song edit
* solve some of the button issues on the admin uis page
* think about how/where to promote (the first) user to an admin
  * Should work with the script in /scripts! This is called verytime the container starts.
* Test user registration. Does it work without sendgrid?
* change/improve login captche mechanism
* add more/better playwright tests
* there is no way to delete a room
* look when/how this error occurs:
[WebServer] Error loading rooms for artworks: TypeError: Cannot read properties of undefined (reading 'trackscount')
[WebServer]     at /home/runner/work/binb/binb/routes/site.js:18:40
[WebServer]     at /home/runner/work/binb/binb/node_modules/async/internal/parallel.js:25:39
[WebServer]     at eachOfArrayLike (/home/runner/work/binb/binb/node_modules/async/eachOf.js:61:9)
[WebServer]     at eachOf (/home/runner/work/binb/binb/node_modules/async/eachOf.js:181:12)
[WebServer]     at awaitable (/home/runner/work/binb/binb/node_modules/async/internal/awaitify.js:14:28)
[WebServer]     at /home/runner/work/binb/binb/node_modules/async/internal/parallel.js:24:5
[WebServer]     at awaitable (/home/runner/work/binb/binb/node_modules/async/internal/awaitify.js:14:28)
[WebServer]     at parallel (/home/runner/work/binb/binb/node_modules/async/parallel.js:178:35)
[WebServer]     at tasks.<computed> (/home/runner/work/binb/binb/routes/site.js:50:9)
[WebServer]     at /home/runner/work/binb/binb/node_modules/async/internal/parallel.js:25:39
* Unifiy different tests (redis usage, test data, ...)
* do we need docker compose dev and local?
* redis cleanup could be useful for playwright tests as well
* cleanup .md files
* create a docker build workflow
  * Add that container to the docker-compose.yml as well as the main README