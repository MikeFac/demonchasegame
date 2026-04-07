/**
 * SoundEffects - Generate sound effects using Web Audio API
 * Procedural sounds with variety and better attack/damage feedback
 */
const SoundEffects = (function() {
    let audioContext = null;
    let masterVolume = 0.5;

    function getAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContext;
    }

    function setMasterVolume(vol) {
        masterVolume = Math.max(0, Math.min(1, vol));
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

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.3 * masterVolume, ctx.currentTime);
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

    /**
     * Play a short airy shimmer for heavenly kill celebrations
     */
    function playHeavenlyKill() {
        const ctx = getAudioContext();
        const start = ctx.currentTime;
        const notes = [
            { freq: 784, delay: 0.00, type: 'sine', gain: 0.08 },
            { freq: 988, delay: 0.05, type: 'triangle', gain: 0.065 },
            { freq: 1175, delay: 0.10, type: 'sine', gain: 0.05 }
        ];

        notes.forEach((note) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = note.type;
            oscillator.frequency.setValueAtTime(note.freq, start + note.delay);
            oscillator.frequency.exponentialRampToValueAtTime(note.freq * 1.12, start + note.delay + 0.3);

            gainNode.gain.setValueAtTime(0.001, start + note.delay);
            gainNode.gain.exponentialRampToValueAtTime(note.gain * masterVolume, start + note.delay + 0.04);
            gainNode.gain.exponentialRampToValueAtTime(0.001, start + note.delay + 0.62);

            oscillator.start(start + note.delay);
            oscillator.stop(start + note.delay + 0.62);
        });
    }

    /**
     * Play attack sound with variation
     */
    function playAttack() {
        const ctx = getAudioContext();
        const variation = Math.random();
        
        if (variation < 0.33) {
            playSwordWhoosh(ctx);
        } else if (variation < 0.66) {
            playPunchImpact(ctx);
        } else {
            playEnergyBlast(ctx);
        }
    }

    function playSwordWhoosh(ctx) {
        const noise = ctx.createBufferSource();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (buffer.length * 0.3));
        }
        
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500 + Math.random() * 500, ctx.currentTime);
        filter.Q.setValueAtTime(2, ctx.currentTime);
        
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.4 * masterVolume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        noise.start(ctx.currentTime);
    }

    function playPunchImpact(ctx) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(150 + Math.random() * 50, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.08);
        
        gainNode.gain.setValueAtTime(0.5 * masterVolume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
    }

    function playEnergyBlast(ctx) {
        const oscillator1 = ctx.createOscillator();
        const oscillator2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator1.type = 'sawtooth';
        oscillator1.frequency.setValueAtTime(200 + Math.random() * 100, ctx.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
        
        oscillator2.type = 'square';
        oscillator2.frequency.setValueAtTime(400 + Math.random() * 100, ctx.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.12);
        
        gainNode.gain.setValueAtTime(0.2 * masterVolume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator1.start(ctx.currentTime);
        oscillator1.stop(ctx.currentTime + 0.15);
        oscillator2.start(ctx.currentTime);
        oscillator2.stop(ctx.currentTime + 0.12);
    }

    /**
     * Play damage sound with variation
     */
    function playDamage() {
        const ctx = getAudioContext();
        const variation = Math.random();
        
        if (variation < 0.5) {
            playHeavyHit(ctx);
        } else {
            playGrittyImpact(ctx);
        }
    }

    function playHeavyHit(ctx) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(100 + Math.random() * 30, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.6 * masterVolume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
    }

    function playGrittyImpact(ctx) {
        const noise = ctx.createBufferSource();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (buffer.length * 0.15));
        }
        
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
        
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.35 * masterVolume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        noise.start(ctx.currentTime);
    }

    /**
     * Play bullet/missile sound
     */
    function playBullet() {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(600 + Math.random() * 200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
        
        gainNode.gain.setValueAtTime(0.25 * masterVolume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.08);
    }

    /**
     * Play monster death explosion
     */
    function playMonsterDeath() {
        const ctx = getAudioContext();
        
        const noise = ctx.createBufferSource();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (buffer.length * 0.2));
        }
        
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);
        
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.5 * masterVolume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        noise.start(ctx.currentTime);
        
        const oscillator = ctx.createOscillator();
        const oscGain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
        oscGain.gain.setValueAtTime(0.3 * masterVolume, ctx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.connect(oscGain);
        oscGain.connect(ctx.destination);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
    }

    return {
        playDing,
        playFirstKill,
        playLevelComplete,
        playHeavenlyKill,
        playAttack,
        playDamage,
        playBullet,
        playMonsterDeath,
        setMasterVolume
    };
})();

window.SoundEffects = SoundEffects;
