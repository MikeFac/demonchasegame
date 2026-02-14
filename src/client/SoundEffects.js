/**
 * SoundEffects - Generate simple sound effects using Web Audio API
 * No external files needed - all sounds are procedurally generated
 */
const SoundEffects = (function() {
    let audioContext = null;

    // Initialize audio context on first use (user gesture required)
    function getAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContext;
    }

    /**
     * Play a "ding" sound for correct quiz answers
     */
    function playDing() {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Bright ding tone
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, ctx.currentTime); // High pitch
        oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);

        // Quick fade out
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
    }

    /**
     * Play an epic victory sound for first kill
     */
    function playFirstKill() {
        const ctx = getAudioContext();

        // Rising power chord
        const frequencies = [220, 330, 440]; // A minor chord
        frequencies.forEach((freq, i) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.3);

            gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

            oscillator.start(ctx.currentTime + i * 0.05);
            oscillator.stop(ctx.currentTime + 0.5);
        });
    }

    /**
     * Play a fanfare for level completion
     */
    function playLevelComplete() {
        const ctx = getAudioContext();

        // Triumphant melody: C-E-G-C (major chord arpeggio)
        const notes = [
            { freq: 523, time: 0 },    // C5
            { freq: 659, time: 0.15 },  // E5
            { freq: 784, time: 0.3 },   // G5
            { freq: 1047, time: 0.45 }  // C6
        ];

        notes.forEach(note => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);

            gainNode.gain.setValueAtTime(0.2, ctx.currentTime + note.time);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + note.time + 0.3);

            oscillator.start(ctx.currentTime + note.time);
            oscillator.stop(ctx.currentTime + note.time + 0.3);
        });
    }

    return {
        playDing,
        playFirstKill,
        playLevelComplete
    };
})();

window.SoundEffects = SoundEffects;
