/**
 * MusicManager - Handles Scripture music playback for each player
 * Client-side only - no server sync needed
 */
(function () {
    // Music state
    let isPlaying = false;
    let isMuted = false;
    let currentTrackIndex = 0;
    let currentAudio = null;
    let tracks = [];
    let volume = 0.7;

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
            
            currentAudio.play()
                .then(() => {
                    isPlaying = true;
                    console.log('Playing:', track.name);
                })
                .catch((err) => {
                    console.error('Error playing track:', err);
                    isPlaying = false;
                });

            currentAudio.onended = function() {
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
    }

    /**
     * Toggle play/pause
     */
    function togglePlay() {
        if (isPlaying) {
            pause();
        } else {
            playTrack(currentTrackIndex);
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
     * Clean up resources
     */
    function destroy() {
        stop();
        tracks = [];
    }

    // Initialize on load
    init();

    // Public interface
    window.MusicManager = {
        init,
        playTrack,
        stop,
        pause,
        togglePlay,
        toggleMute,
        setVolume,
        getState,
        getTracks,
        getIsPlaying,
        getIsMuted,
        destroy
    };
})();
