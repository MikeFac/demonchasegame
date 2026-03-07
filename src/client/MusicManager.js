/**
 * MusicManager - Handles Scripture music playback for each player
 * Client-side only - no server sync needed
 *
 * Supports:
 * 1. Default background music (tracks)
 * 2. Educational verse-specific songs (via VerseSongService)
 */
(function () {
    // Music state
    let isPlaying = false;
    let isMuted = false;
    let userPaused = false;  // Track if user explicitly paused (vs never started)
    let currentTrackIndex = 0;
    let currentAudio = null;
    let tracks = [];
    let volume = 0.7;
    let currentVerseReference = null;  // Track current verse song
    let currentPlaybackType = null;    // 'track' | 'verse'

    // Available tracks (will be loaded from music folder)
    // Format: { name: "Display Name", file: "filename.mp3" }
    const availableTracks = [
        { name: "Mind of the Spirit", file: "mind-of-the-spirit-1768083329613.mp3" }
    ];

    /**
     * Initialize the music manager
     */
    function init() {
        // Scan for tracks (in future could dynamically load from server)
        tracks = [...availableTracks];
        console.log('MusicManager initialized with', tracks.length, 'tracks');
    }

    /**
     * Get the full path to a music file
     */
    function getTrackPath(track) {
        return 'music/' + track.file;
    }

    /**
     * Play a specific track by index
     */
    function playTrack(index) {
        if (index < 0 || index >= tracks.length) {
            console.warn('Invalid track index:', index);
            return;
        }

        // Stop current track if playing
        stop();

        currentTrackIndex = index;
        const track = tracks[index];

        try {
            currentAudio = new Audio(getTrackPath(track));
            currentAudio.volume = isMuted ? 0 : volume;
            currentAudio.loop = true;
            currentPlaybackType = 'track';

            currentAudio.play()
                .then(() => {
                    isPlaying = true;
                    console.log('Playing:', track.name);
                })
                .catch((err) => {
                    console.error('Error playing track:', err);
                    isPlaying = false;
                });

            currentAudio.onended = function () {
                // Loop is enabled, but just in case
                if (currentAudio && currentAudio.loop) {
                    currentAudio.currentTime = 0;
                    currentAudio.play();
                }
            };
        } catch (err) {
            console.error('Error creating audio:', err);
        }
    }

    /**
     * Stop current playback
     */
    function stop() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio = null;
        }
        isPlaying = false;
        currentPlaybackType = null;
    }

    /**
     * Toggle play/pause
     */
    function togglePlay() {
        if (isPlaying) {
            pause();
        } else {
            // Clear paused flag when user clicks play
            userPaused = false;
            // Prioritize Scripture-specific music over default tracks
            if (currentVerseReference) {
                // Try to play verse-specific music first
                playVerseTrack(currentVerseReference).then(wasPlayed => {
                    if (!wasPlayed) {
                        // Fall back to default track if verse music not available
                        playTrack(currentTrackIndex);
                    }
                }).catch(() => {
                    playTrack(currentTrackIndex);
                });
            } else {
                // No verse reference, use default track
                playTrack(currentTrackIndex);
            }
        }
    }

    /**
     * Pause playback (but remember position)
     */
    function pause() {
        if (currentAudio) {
            currentAudio.pause();
        }
        isPlaying = false;
        userPaused = true;  // Mark that user explicitly paused
    }

    /**
     * Toggle mute (volume 0 without stopping)
     */
    function toggleMute() {
        isMuted = !isMuted;
        if (currentAudio) {
            currentAudio.volume = isMuted ? 0 : volume;
        }
        console.log('Music muted:', isMuted);
        return isMuted;
    }

    /**
     * Set volume (0-1)
     */
    function setVolume(newVolume) {
        volume = Math.max(0, Math.min(1, newVolume));
        if (currentAudio && !isMuted) {
            currentAudio.volume = volume;
        }
    }

    /**
     * Get current state for UI rendering
     */
    function getState() {
        return {
            isPlaying: isPlaying,
            isMuted: isMuted,
            currentTrackIndex: currentTrackIndex,
            currentTrack: tracks[currentTrackIndex] || null,
            tracks: tracks,
            volume: volume
        };
    }

    /**
     * Get list of tracks for UI
     */
    function getTracks() {
        return tracks;
    }

    /**
     * Check if music is currently playing
     */
    function getIsPlaying() {
        return isPlaying;
    }

    /**
     * Check if music is muted
     */
    function getIsMuted() {
        return isMuted;
    }

    /**
     * Play a song for a specific verse (educational learning music)
     * Non-blocking: query happens in background
     * Returns false if song not ready yet; client should use default music
     * Respects pause state: won't auto-play if user explicitly paused
     */
    async function playVerseTrack(verseReference) {
        try {
            // Check if VerseSongService is available
            if (typeof window.VerseSongService === 'undefined') {
                console.warn('VerseSongService not loaded');
                return false;
            }

            const verseTrack = await window.VerseSongService.getSongForVerse(verseReference);

            if (verseTrack && verseTrack.status === 'ready' && verseTrack.audioUrl) {
                // Let the current verse song finish instead of restarting at each verse transition.
                if (currentPlaybackType === 'verse' && currentAudio && !currentAudio.paused) {
                    if (currentVerseReference !== verseReference) {
                        console.log(
                            `🎵 Keeping current verse song playing until completion: ${currentVerseReference} ` +
                            `(not interrupting for ${verseReference})`
                        );
                    }
                    return true;
                }

                // Song is ready—only pause if user explicitly paused (not just stopped)
                playTrackUrl(verseTrack.audioUrl, userPaused, {
                    loop: false,
                    playbackType: 'verse',
                    verseReference
                });
                currentVerseReference = verseReference;
                if (!userPaused) {
                    console.log(`🎵 Now playing verse song: ${verseReference}`);
                } else {
                    console.log(`🎵 Loaded verse song (paused): ${verseReference}`);
                }
                return true;
            } else {
                // Song not ready yet—use fallback
                if (verseTrack) {
                    console.log(`⏳ Verse song pending for ${verseReference}—using default music`);
                } else {
                    console.log(`No song found for ${verseReference}—using default music`);
                }
                return false;
            }
        } catch (err) {
            console.error(`Error playing verse track for ${verseReference}:`, err);
            return false;
        }
    }

    /**
     * Play URL directly (helper)
     * @param {string} audioUrl - URL of the audio to play
     * @param {boolean} shouldPause - If true, load but don't auto-play (respects pause state)
     */
    function playTrackUrl(audioUrl, shouldPause = false, options = {}) {
        const loop = options.loop !== undefined ? options.loop : true;
        const playbackType = options.playbackType || 'track';
        const verseReference = options.verseReference || null;

        stop();

        currentAudio = new Audio(audioUrl);
        currentAudio.volume = isMuted ? 0 : volume;
        currentAudio.loop = loop;
        currentPlaybackType = playbackType;
        currentVerseReference = playbackType === 'verse' ? verseReference : null;

        currentAudio.onended = () => {
            isPlaying = false;

            if (playbackType === 'verse') {
                currentAudio = null;
                currentPlaybackType = null;
                currentVerseReference = null;
                return;
            }

            if (currentAudio && currentAudio.loop) {
                currentAudio.currentTime = 0;
                currentAudio.play().catch((err) => {
                    console.error('Error replaying audio:', err);
                    isPlaying = false;
                });
            }
        };

        if (!shouldPause) {
            currentAudio.play()
                .then(() => {
                    isPlaying = true;
                })
                .catch((err) => {
                    console.error('Error playing audio:', err);
                    isPlaying = false;
                });
        } else {
            // Load but don't play (preserve paused state)
            isPlaying = false;
        }
    }

    /**
     * Report that player learned a verse (call after quiz success)
     * Records play duration and learning outcome
     */
    function recordVerseLearned(verseReference, wasLearned = true) {
        if (!currentVerseReference) {
            return; // No verse song is currently playing
        }

        if (currentVerseReference !== verseReference) {
            return; // Don't attribute a different verse's answer to the currently playing song
        }

        if (typeof window.VerseSongService === 'undefined') {
            console.warn('VerseSongService not loaded');
            return;
        }

        const duration = currentAudio ? currentAudio.currentTime * 1000 : 0;
        window.VerseSongService.recordPlay(currentVerseReference, duration, wasLearned);
    }

    /**
     * Clean up resources
     */
    function destroy() {
        stop();
        tracks = [];
        currentVerseReference = null;
        currentPlaybackType = null;
    }

    // Initialize on load
    init();

    // Public interface
    window.MusicManager = {
        init,
        playTrack,
        playVerseTrack,           // NEW: Play educational verse song
        playTrackUrl,             // Helper for direct URL playback
        stop,
        pause,
        togglePlay,
        toggleMute,
        setVolume,
        getState,
        getTracks,
        getIsPlaying,
        getIsMuted,
        recordVerseLearned,       // NEW: Track learning outcomes
        destroy
    };
})();
