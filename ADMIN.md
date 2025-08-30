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
- Real-time preview of songs

### Apple Music Integration
- Search Apple Music catalog for songs
- Import songs from Apple Music playlists
- Support for artist-based imports with customizable song counts
- Automatic metadata extraction (artwork, preview URLs, etc.)

## Setup

1. **Install dependencies** (already included in main package.json)

2. **Set up admin user**:
   ```bash
   # Set up the admin system and create metadata for existing rooms
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
   - Navigate to `/admin` or click "Admin Panel" in the top navigation

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
   - Search Apple Music or enter song details manually
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
- **Song Limits**: No hard limits, but consider game performance

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

## Migration from Static Config

The system maintains backward compatibility with the existing `config.json` file:

1. Existing rooms continue to work
2. Room metadata is automatically created for existing rooms
3. Static config is gradually replaced by database-driven configuration
4. Fallback to static config if database fails

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

## Troubleshooting

### Common Issues

1. **Admin panel not accessible**:
   - Ensure user has admin role (use setup script)
   - Check browser console for JavaScript errors
   - Verify all admin files are uploaded correctly

2. **Apple Music import fails**:
   - Check playlist URL format
   - Verify internet connection
   - Check server logs for rate limiting issues

3. **Songs not appearing in game**:
   - Ensure room is marked as active
   - Restart server to reload room configuration
   - Check song data integrity in Redis

### Logs

Admin actions are logged to the console. Check server logs for:
- Room creation/deletion events
- Import progress and errors
- Authentication failures

## Performance Considerations

- Large playlist imports may take several minutes
- Consider song limits per room for optimal game performance
- Monitor Redis memory usage with large song databases
- Apple Music API has rate limits (handled automatically)

## Future Enhancements

- Scheduled imports
- Song popularity tracking
- Advanced search filters
- Bulk room operations
- User role management interface
- Activity logs and analytics