# Admin System for binb

This document describes the new dynamic room and song management system for binb.

## Features

### Room Management
- Create, edit, and delete rooms dynamically
- Set room descriptions and active status
- View song counts and metadata for each room
- Activate/deactivate rooms without server restart

### Song Management
- Add individual songs to rooms via Apple Music search
- Import entire playlists from Apple Music
- Remove songs from rooms
- Bulk operations for managing multiple songs

### Apple Music Integration
- Search Apple Music catalog for songs
- Import songs from Apple Music playlists
- Automatic metadata extraction (artwork, preview URLs, etc.)

## Setup

1. **Install dependencies** (already included in main package.json)

2. **Set up admin user**:
   ```bash
   # Set up the admin system
   node scripts/setup-admin.js setup
   
   # List all users and their roles
   node scripts/setup-admin.js list
   
   # Promote a specific user to admin
   node scripts/setup-admin.js promote <username>
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Access admin panel**:
   - Log in as an admin user
   - Navigate to `/admin`

## Usage

### Creating a Room

1. Go to Admin Dashboard or Rooms page
2. Click "Create New Room"
3. Enter room name (alphanumeric, hyphens, underscores only)
4. Add optional description
5. Set active status
6. Click "Create Room"

### Managing Songs

1. Navigate to a room's detail page
2. **Add individual songs**:
   - Click "Add Song"
   - Search Apple Music
   - Click "Add" for desired songs

3. **Import from playlist**:
   - Click "Import Playlist"
   - Enter Apple Music playlist URL
   - Optionally include additional songs from artists in playlist
   - Configure import options (songs per artist, sorting)
   - Click "Import Songs"

4. **Remove songs**:
   - Click "Delete" next to individual songs
   - Use bulk actions for multiple songs

### Room Configuration

- **Active Status**: Only active rooms appear in the game
- **Descriptions**: Help identify room content and theme

## File Structure

```
lib/
├── middleware/
│   └── admin-auth.js          # Admin authentication middleware
├── services/
│   ├── room-manager.js        # Room CRUD operations
│   ├── song-manager.js        # Song CRUD operations
│   └── apple-music-importer.js # Apple Music integration
└── rooms.js                   # Updated with dynamic management

routes/
└── admin.js                   # Admin routes and API endpoints

views/admin/
├── layout.pug                 # Admin layout template
├── dashboard.pug              # Admin dashboard
├── rooms.pug                  # Room management page
└── room-details.pug           # Individual room management

public/
├── js/admin.js                # Admin frontend JavaScript
└── css/admin.css              # Admin styling

scripts/
└── setup-admin.js             # Admin setup and user management
```

## Security

- Admin access requires role level 2
- Session-based authentication
- CSRF protection on all admin actions
- Input validation for all forms
- Rate limiting on Apple Music API calls

## API Endpoints

### Rooms
- `GET /admin/api/rooms` - List all rooms
- `POST /admin/api/rooms` - Create room
- `PUT /admin/api/rooms/:name` - Update room
- `DELETE /admin/api/rooms/:name` - Delete room
- `POST /admin/api/rooms/:name/activate` - Activate room
- `POST /admin/api/rooms/:name/deactivate` - Deactivate room

### Songs
- `GET /admin/api/rooms/:name/songs` - List room songs
- `POST /admin/api/rooms/:name/songs` - Add song to room
- `DELETE /admin/api/rooms/:name/songs/:id` - Remove song
- `POST /admin/api/rooms/:name/import` - Import from playlist

### Search
- `GET /admin/api/search/songs?q=query` - Search Apple Music
- `GET /admin/api/search/database?q=query` - Search local songs
- `GET /admin/api/songs/:id/details` - Get song details
