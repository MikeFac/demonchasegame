(function () {
    var Constants, LevelConfig, WaveConfig, WaveMonsterManager, SharedUtils;

    if (typeof module !== 'undefined' && module.exports) {
        Constants = require('./Constants');
        LevelConfig = require('./LevelConfig');
        WaveConfig = require('./WaveConfig');
        WaveMonsterManager = require('./entities/WaveMonsterManager');
        SharedUtils = require('./utils');
    } else if (typeof window !== 'undefined') {
        Constants = window.Constants;
        LevelConfig = window.LevelConfig;
        WaveConfig = window.WaveConfig;
        WaveMonsterManager = window.WaveMonsterManager;
        SharedUtils = window.SharedUtils;
    }

    var generateId = SharedUtils.generateId;

    /**
     * WaveGameEngine — standalone game loop for wave assault mode.
     *
     * Unlike the dungeon GameEngine, this operates in a fixed-size arena
     * with no walls/maze. Demons fly in formation and the player moves
     * horizontally at the bottom of the screen.
     *
     * @param {Object} emitter - Event emitter with .emit(event, data)
     * @param {Object} gameConfig - Optional config overrides
     */
    class WaveGameEngine {
        constructor(emitter, gameConfig) {
            this.emitter = emitter;
            this.shouldRun = false;
            this.gameConfig = gameConfig || {};

            // Player state
            var playerCode = generateId(4);
            this.playerCode = playerCode;
            this.player = {
                code: playerCode,
                x: WaveConfig.ARENA_WIDTH / 2,
                y: WaveConfig.PLAYER_Y,
                width: WaveConfig.PLAYER_WIDTH,
                height: WaveConfig.PLAYER_HEIGHT,
                health: 100,
                maxHealth: 100,
                score: 0,
                state: 'alive'
            };

            // Wave state
            this.currentWave = 0;
            this.totalWaves = this.gameConfig.totalWaves || WaveConfig.TOTAL_WAVES;
            this.waveState = 'idle'; // idle, active, intermission, victory, defeat
            this.intermissionTimer = 0;
            this.intermissionDuration = 3000; // ms

            // Monster manager
            this.monsterManager = new WaveMonsterManager(this.emitter);

            // Projectiles (player bullets going upward)
            this.projectiles = [];
            this._bulletIdCounter = 0;
            this._lastFireTime = 0;
            this._autoFire = false;

            // Quiz pause
            this._lastQuizTime = 0;
            this._quizPaused = false;
            this.quizPauseInterval = this.gameConfig.quizPauseInterval || WaveConfig.QUIZ_PAUSE_INTERVAL;
            this.initialQuizPauseDelay = this.gameConfig.initialQuizPauseDelay || WaveConfig.INITIAL_QUIZ_PAUSE_DELAY;

            // Stats
            this.stats = {
                monstersKilled: 0,
                wavesCleared: 0,
                accuracy: 0,
                shotsFired: 0,
                shotsHit: 0
            };

            // Input state (set by external input handler)
            this._moveLeft = false;
            this._moveRight = false;
            this._firing = false;

            // Tick management
            this._tickCount = 0;
            this.NETWORK_TICK_DIVISOR = 3; // emit game state every 3rd tick (~20fps)
            this.intervals = [];
        }

        start() {
            var self = this;
            this.shouldRun = true;
            this._lastQuizTime = Date.now() - Math.max(0, this.quizPauseInterval - this.initialQuizPauseDelay);

            // Start first wave
            this._startNextWave();

            // Main loop at 60fps
            this.intervals.push(setInterval(function () {
                if (!self.shouldRun || self._quizPaused) return;
                self.update();
            }, 1000 / 60));

            console.log('WaveGameEngine started');
        }

        stop() {
            this.shouldRun = false;
            for (var i = 0; i < this.intervals.length; i++) {
                clearInterval(this.intervals[i]);
            }
            this.intervals = [];
            console.log('WaveGameEngine stopped');
        }

        // ==================== INPUT ====================

        /**
         * Handle input events from the client.
         */
        handleInput(event, data) {
            if (event === 'moveLeft') {
                this._moveLeft = data;
            } else if (event === 'moveRight') {
                this._moveRight = data;
            } else if (event === 'fire') {
                this._firing = data;
            } else if (event === 'quizAnswer') {
                this._handleQuizAnswer(data);
            } else if (event === 'setPosition') {
                // Direct position set (for touch/mouse)
                if (data && typeof data.x === 'number') {
                    this.player.x = Math.max(
                        this.player.width / 2,
                        Math.min(WaveConfig.ARENA_WIDTH - this.player.width / 2, data.x)
                    );
                }
                this._firing = !!(data && data.firing);
            }
        }

        // ==================== GAME LOOP ====================

        update() {
            if (this.waveState === 'victory' || this.waveState === 'defeat') return;

            // Intermission countdown
            if (this.waveState === 'intermission') {
                if (Date.now() - this.intermissionTimer >= this.intermissionDuration) {
                    this._startNextWave();
                }
                this._emitState();
                return;
            }

            // Player movement
            this._updatePlayer();

            // Firing
            this._updateFiring();

            // Projectiles
            this._updateProjectiles();

            // Monsters
            this.monsterManager.update(this.player);

            // Collision: projectiles vs monsters
            this._checkProjectileCollisions();

            // Collision: monsters vs player
            this._checkMonsterPlayerCollisions();

            // Wave cleared?
            if (this.monsterManager.isWaveCleared() && this.waveState === 'active') {
                this.stats.wavesCleared++;
                if (this.currentWave >= this.totalWaves) {
                    this._victory();
                } else {
                    this.waveState = 'intermission';
                    this.intermissionTimer = Date.now();
                    this.emitter.emit('waveCleared', {
                        wave: this.currentWave,
                        totalWaves: this.totalWaves,
                        score: this.player.score
                    });
                }
            }

            // Quiz pause check
            if (this.waveState === 'active' && !this._quizPaused) {
                if (Date.now() - this._lastQuizTime >= this.quizPauseInterval) {
                    this._triggerQuizPause();
                }
            }

            // Emit state
            this._emitState();
        }

        _updatePlayer() {
            var speed = WaveConfig.PLAYER_SPEED;
            if (this._moveLeft) {
                this.player.x -= speed;
            }
            if (this._moveRight) {
                this.player.x += speed;
            }

            // Clamp to arena
            this.player.x = Math.max(
                this.player.width / 2,
                Math.min(WaveConfig.ARENA_WIDTH - this.player.width / 2, this.player.x)
            );
        }

        _updateFiring() {
            if (!this._firing) return;
            var now = Date.now();
            if (now - this._lastFireTime < WaveConfig.FIRE_COOLDOWN) return;

            this._lastFireTime = now;
            this.stats.shotsFired++;

            this.projectiles.push({
                id: ++this._bulletIdCounter,
                x: this.player.x,
                y: this.player.y - this.player.height / 2,
                width: WaveConfig.PROJECTILE_WIDTH,
                height: WaveConfig.PROJECTILE_HEIGHT,
                vy: -WaveConfig.PROJECTILE_SPEED,
                active: true
            });
        }

        _updateProjectiles() {
            for (var i = this.projectiles.length - 1; i >= 0; i--) {
                var p = this.projectiles[i];
                p.y += p.vy;

                // Remove if off screen
                if (p.y < -20) {
                    this.projectiles.splice(i, 1);
                }
            }
        }

        _checkProjectileCollisions() {
            var monsters = this.monsterManager.getMonsters();

            for (var pi = this.projectiles.length - 1; pi >= 0; pi--) {
                var proj = this.projectiles[pi];
                if (!proj.active) continue;

                for (var mi = 0; mi < monsters.length; mi++) {
                    var monster = monsters[mi];
                    if (this._rectsOverlap(
                        proj.x - proj.width / 2, proj.y - proj.height / 2, proj.width, proj.height,
                        monster.x - monster.width / 2, monster.y - monster.height / 2, monster.width, monster.height
                    )) {
                        // Hit!
                        var damage = Constants.BULLET_DAMAGE;
                        var killed = this.monsterManager.damageMonster(monster.id, damage, this.playerCode);

                        this.stats.shotsHit++;
                        this.emitter.emit('bulletHit', {
                            x: proj.x,
                            y: proj.y,
                            monsterId: monster.id,
                            damage: damage
                        });

                        if (killed) {
                            this.stats.monstersKilled++;
                            this.player.score += monster.isBoss ? 500 : 100;
                        }

                        this.projectiles.splice(pi, 1);
                        break;
                    }
                }
            }
        }

        _checkMonsterPlayerCollisions() {
            if (this.player.state !== 'alive') return;

            var monsters = this.monsterManager.getMonsters();
            var px = this.player.x;
            var py = this.player.y;
            var pw = this.player.width;
            var ph = this.player.height;

            for (var i = 0; i < monsters.length; i++) {
                var monster = monsters[i];
                // Only diving or entering-low monsters can hit the player
                if (monster.state !== 'dive') continue;

                if (this._rectsOverlap(
                    px - pw / 2, py - ph / 2, pw, ph,
                    monster.x - monster.width / 2, monster.y - monster.height / 2, monster.width, monster.height
                )) {
                    var damage = monster.maxDamage || DEFAULT_DEMON_DAMAGE;
                    this.player.health -= damage;

                    this.emitter.emit('playerHit', {
                        damage: damage,
                        health: this.player.health,
                        demonType: monster.demonType
                    });

                    // Remove the diving demon on collision
                    this.monsterManager.monsters.splice(i, 1);

                    if (this.player.health <= 0) {
                        this.player.health = 0;
                        this.player.state = 'dead';
                        this._defeat();
                        return;
                    }

                    break; // Only one collision per frame
                }
            }
        }

        _rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
            return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
        }

        // ==================== WAVE MANAGEMENT ====================

        _startNextWave() {
            this.currentWave++;
            if (this.currentWave > this.totalWaves) {
                this._victory();
                return;
            }

            this.waveState = 'active';
            this.monsterManager.spawnWave(this.currentWave);

            this.emitter.emit('waveStarted', {
                wave: this.currentWave,
                totalWaves: this.totalWaves,
                waveName: WaveConfig.getWave(this.currentWave).name
            });

            console.log('Wave ' + this.currentWave + ' started: ' + WaveConfig.getWave(this.currentWave).name);
        }

        _victory() {
            this.waveState = 'victory';
            this.emitter.emit('gameEnded', {
                result: 'victory',
                score: this.player.score,
                wavesCleared: this.stats.wavesCleared,
                monstersKilled: this.stats.monstersKilled
            });
            console.log('Wave Assault: VICTORY! Score: ' + this.player.score);
        }

        _defeat() {
            this.waveState = 'defeat';
            this.emitter.emit('gameEnded', {
                result: 'defeat',
                score: this.player.score,
                wave: this.currentWave,
                wavesCleared: this.stats.wavesCleared,
                monstersKilled: this.stats.monstersKilled
            });
            console.log('Wave Assault: DEFEAT at wave ' + this.currentWave);
        }

        // ==================== QUIZ PAUSE ====================

        _triggerQuizPause() {
            this._quizPaused = true;
            this.emitter.emit('quizPause', {
                wave: this.currentWave,
                score: this.player.score
            });
        }

        _handleQuizAnswer(data) {
            if (!this._quizPaused) return;

            this._quizPaused = false;
            this._lastQuizTime = Date.now();

            if (data && data.correct) {
                // Bonus: heal + score
                this.player.health = Math.min(this.player.maxHealth, this.player.health + 15);
                this.player.score += 250;

                this.emitter.emit('quizBonus', {
                    type: 'correct',
                    healthRestored: 15,
                    scoreBonus: 250
                });
            } else {
                // Penalty: speed up current wave monsters
                this.emitter.emit('quizBonus', {
                    type: 'incorrect',
                    penalty: 'speedBoost'
                });
            }
        }

        // ==================== STATE EMISSION ====================

        _emitState() {
            this._tickCount++;
            if (this._tickCount % this.NETWORK_TICK_DIVISOR !== 0) return;

            this.emitter.emit('waveGameState', {
                player: {
                    x: this.player.x,
                    y: this.player.y,
                    width: this.player.width,
                    height: this.player.height,
                    health: this.player.health,
                    maxHealth: this.player.maxHealth,
                    score: this.player.score,
                    state: this.player.state
                },
                monsters: this.monsterManager.getMonsters(),
                projectiles: this.projectiles.map(function (p) {
                    return { id: p.id, x: Math.round(p.x), y: Math.round(p.y) };
                }),
                wave: this.currentWave,
                totalWaves: this.totalWaves,
                waveState: this.waveState,
                stats: this.stats,
                arenaWidth: WaveConfig.ARENA_WIDTH,
                arenaHeight: WaveConfig.ARENA_HEIGHT
            });
        }

        // ==================== PUBLIC API ====================

        getState() {
            return {
                player: this.player,
                monsters: this.monsterManager.getMonsters(),
                projectiles: this.projectiles,
                wave: this.currentWave,
                totalWaves: this.totalWaves,
                waveState: this.waveState,
                stats: this.stats
            };
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = WaveGameEngine;
    } else if (typeof window !== 'undefined') {
        window.WaveGameEngine = WaveGameEngine;
    }
})();
