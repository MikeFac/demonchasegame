## Song Library And Admin Delete Plan

Build this as a Learn Mode entry point first, with the data and permissions shaped so it can later move into a more general song management area.

### Phase 1: Read-only song library

1. Add a music icon entry point from Learn Mode.
- Show a two-quavers icon in the Learn Mode top bar.
- Clicking it opens a song library overlay.
- Keep this available in both presentation and learning phases.

2. Add a read API for browsing songs.
- Create a server endpoint such as `GET /api/verse-song/library`.
- Return completed active songs with audio, grouped by:
  - category
  - verse reference
  - version
- Include metadata needed for playback and display:
  - `_id`
  - `category`
  - `verseReference`
  - `verseReferenceFull`
  - `version`
  - `audioUrl`
  - `duration`
  - `generationStyle`
  - `createdAt`
- Sort consistently by category, then verse, then version.

3. Build a read-only library overlay.
- Render as an HTML overlay instead of drawing a full scrollable list on canvas.
- Group songs by category, then by verse reference.
- Show a play button beside each song version.
- Show verse reference, version, style, and duration where available.
- Highlight the currently playing row.

4. Playback behavior.
- Clicking play should play that exact song row, not random verse selection.
- Stop the previous library track when another row is played.
- Allow replay by pressing the same play button again after a track ends.
- Keep this library playback separate from the random quiz playback logic.

### Phase 2: Admin-only archive/delete

5. Add admin detection.
- If the logged-in user email is `michaelfackerell@gmail.com`, show a delete/archive icon in the library.
- Client-side visibility should be based on auth state.
- Server-side enforcement must be independent and authoritative.

6. Add a secure archive/delete API.
- Create a protected endpoint such as `POST /api/verse-song/:id/archive-delete`.
- Require a valid logged-in user whose email matches `michaelfackerell@gmail.com`.

7. Archive before deleting.
- Copy the MP3 into an archive folder first.
- Write a manifest entry with the full song document and deletion metadata.
- Only after backup succeeds:
  - remove the active file from `public/audio`
  - remove the MongoDB record

Recommended archive location:
- `archived/deleted-songs/YYYY-MM-DD/`

Recommended archive metadata:
- full song document
- original file path
- archived file path
- deletion timestamp
- deleting user email
- optional deletion reason

8. Safety guarantees.
- If archive copy fails, do not delete the database record.
- If DB deletion fails, do not remove the active file.
- Prefer leaving an extra file over losing a song.
- Log every delete operation into a persistent deletion log.

### Testing plan

9. Read-only testing.
- Verify the library opens from the Learn Mode music icon.
- Verify songs are grouped by category, then verse reference.
- Verify play buttons load the correct audio URLs.
- Verify switching songs stops the previous playback.

10. Admin-delete testing.
- Verify a normal user cannot see or call delete actions.
- Verify `michaelfackerell@gmail.com` can archive/delete.
- Verify the archive folder receives the MP3 and manifest before deletion completes.
- Verify the song disappears from the UI, MongoDB, and active audio directory.

### Implementation order

1. Read API
2. Learn Mode music icon
3. Read-only library overlay with playback
4. Admin detection
5. Archive/delete endpoint
6. Archive manifest and deletion logging
7. Manual deletion test with one sacrificial song
