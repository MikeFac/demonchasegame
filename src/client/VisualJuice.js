/**
 * VisualJuice - procedural, visual-only combat feedback.
 *
 * Nothing here touches game state, the server, or input timestamps. All
 * functions are pure timing helpers or lightweight effect descriptors; the
 * renderer owns the actual drawing.
 *
 * Respects the OS "reduce motion" preference: when set, transforms collapse,
 * hit-stop is disabled and the low-health vignette stops pulsing. Screen shake
 * is gated by the renderer via isEnabled().
 */
const VisualJuice = (function () {
    const HIT_STOP_MIN_MS = 50;
    const HIT_STOP_MAX_MS = 80;

    const motionQuery = (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    let prefersReducedMotion = !!(motionQuery && motionQuery.matches);
    let manuallyEnabled = true;
    let hitStopUntil = 0;

    if (motionQuery) {
        const onChange = (event) => {
            prefersReducedMotion = !!event.matches;
            if (prefersReducedMotion) hitStopUntil = 0;
        };
        if (typeof motionQuery.addEventListener === 'function') {
            motionQuery.addEventListener('change', onChange);
        } else if (typeof motionQuery.addListener === 'function') {
            motionQuery.addListener(onChange);
        }
    }

    function isEnabled() {
        return manuallyEnabled && !prefersReducedMotion;
    }

    function setEnabled(enabled) {
        manuallyEnabled = !!enabled;
        if (!manuallyEnabled) hitStopUntil = 0;
    }

    function nowMs(now) {
        return typeof now === 'number' ? now : Date.now();
    }

    /** Idle bob + breathing. `seed` is 0..1. */
    function idle(now, seed) {
        if (!isEnabled()) return { dy: 0, sx: 1, sy: 1 };
        const phase = (nowMs(now) / 1000) * 2.1 + (seed || 0) * Math.PI * 2;
        const breath = Math.sin(phase * 0.5);
        return {
            dy: Math.sin(phase) * 1.1,
            sx: 1 + breath * 0.012,
            sy: 1 - breath * 0.012
        };
    }

    /** Walk bob + lean. `speed` is roughly pixels per frame. */
    function walk(now, speed, seed) {
        if (!isEnabled()) return { dy: 0, lean: 0, sx: 1, sy: 1 };
        const phase = (nowMs(now) / 1000) * 11 + (seed || 0) * Math.PI * 2;
        const intensity = Math.min(1, Math.max(0.3, (speed || 2) / 4));
        return {
            dy: -Math.abs(Math.sin(phase)) * 1.8 * intensity,
            lean: Math.sin(phase) * 0.045 * intensity,
            sx: 1,
            sy: 1
        };
    }

    /** Attack lunge: anticipation (0-25%), lunge (25-55%), recover (55-100%). */
    function attack(elapsedMs) {
        if (!isEnabled()) return { dx: 0, dy: 0, sx: 1, sy: 1 };
        const p = Math.min(1, Math.max(0, (elapsedMs || 0) / 240));
        if (p < 0.25) {
            const a = p / 0.25;
            return { dx: -3.5 * a, dy: -1.5 * a, sx: 1 + 0.04 * a, sy: 1 - 0.03 * a };
        }
        if (p < 0.55) {
            const a = (p - 0.25) / 0.3;
            return { dx: -3.5 + 11 * a, dy: -1.5 + 2 * a, sx: 0.98, sy: 1.03 };
        }
        const a = (p - 0.55) / 0.45;
        return { dx: 7.5 * (1 - a), dy: 0.5 * (1 - a), sx: 1, sy: 1 };
    }

    /** White-hit flash alpha, 0..1. `state.lastHitAt` is a Date.now() timestamp. */
    function hitFlash(state, now) {
        if (!isEnabled() || !state || !state.lastHitAt) return 0;
        const elapsed = nowMs(now) - state.lastHitAt;
        const duration = 130;
        if (elapsed < 0 || elapsed >= duration) return 0;
        return (1 - elapsed / duration) * 0.9;
    }

    /** Decaying visual knockback offset. Never changes authoritative position. */
    function knockback(state, now) {
        if (!isEnabled() || !state || !state.knockAt) return { dx: 0, dy: 0 };
        const elapsed = nowMs(now) - state.knockAt;
        const duration = 160;
        if (elapsed < 0 || elapsed >= duration) return { dx: 0, dy: 0 };
        const decay = 1 - elapsed / duration;
        return {
            dx: (state.knockX || 0) * decay * decay,
            dy: (state.knockY || 0) * decay * decay
        };
    }

    function spawnScale(state, now, durationMs) {
        if (!state || !state.spawnAt) return 1;
        if (!isEnabled()) return 1;
        const duration = durationMs || 260;
        const t = Math.min(1, Math.max(0, (nowMs(now) - state.spawnAt) / duration));
        // Ease-out back: slightly overshoots then settles at 1.
        return Math.max(0.05, 1.18 * t - 0.18 * t * t);
    }

    /** Red edge vignette alpha for low HP. Static (no pulse) with reduced motion. */
    function lowHealthVignette(hpFraction, now) {
        if (!isFinite(hpFraction) || hpFraction >= 0.3) return 0;
        const urgency = 1 - Math.max(0, hpFraction) / 0.3;
        if (!isEnabled()) return 0.16 + urgency * 0.12;
        const pulse = 0.55 + 0.45 * Math.sin(nowMs(now) / 240);
        return Math.min(0.55, 0.16 + urgency * 0.24 + pulse * 0.1);
    }

    function makeEffect(type, x, y, now, duration, extra) {
        return Object.assign({
            type,
            x,
            y,
            start: nowMs(now),
            duration,
            seed: Math.random()
        }, extra || {});
    }

    function spawnRing(x, y, now) {
        return makeEffect('ring', x, y, now, 420, { radius: 30, color: '#b48cff' });
    }

    function dust(x, y, now) {
        return makeEffect('dust', x, y, now, 460, { color: '#c9b89a' });
    }

    function hitSpark(x, y, now, opts) {
        return makeEffect('spark', x, y, now, 340, {
            color: (opts && opts.color) || '#ffd36b',
            count: (opts && opts.count) || 7
        });
    }

    function deathBurst(x, y, now) {
        return makeEffect('death', x, y, now, 520, { color: '#ff6a5e' });
    }

    function soulWisp(x, y, now) {
        return makeEffect('soul', x, y, now, 900, { color: '#bfe3ff' });
    }

    function correctBurst(x, y, now) {
        return makeEffect('correct', x, y, now, 720, { color: '#ffd666' });
    }

    function muzzleFlash(x, y, now) {
        return makeEffect('muzzle', x, y, now, 120, { color: '#ffe08a' });
    }

    /** Drop expired effects. Returns a new array. */
    function pruneEffects(effects, now) {
        if (!Array.isArray(effects)) return [];
        const t = nowMs(now);
        return effects.filter((effect) => effect && (t - effect.start) < effect.duration);
    }

    /** Visual-only freeze. Never pauses the engine, input, or server. */
    function hitStop(ms) {
        if (!isEnabled()) return;
        const duration = Math.max(HIT_STOP_MIN_MS, Math.min(HIT_STOP_MAX_MS, ms || 60));
        const until = Date.now() + duration;
        if (until > hitStopUntil) hitStopUntil = until;
    }

    function isHitStopped(now) {
        return isEnabled() && nowMs(now) < hitStopUntil;
    }

    function clear() {
        hitStopUntil = 0;
    }

    return {
        isEnabled,
        setEnabled,
        prefersReducedMotion: () => prefersReducedMotion,
        idle,
        walk,
        attack,
        hitFlash,
        knockback,
        spawnScale,
        lowHealthVignette,
        spawnRing,
        dust,
        hitSpark,
        deathBurst,
        soulWisp,
        correctBurst,
        muzzleFlash,
        pruneEffects,
        hitStop,
        isHitStopped,
        clear
    };
})();

window.VisualJuice = VisualJuice;
