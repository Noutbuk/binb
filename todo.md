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