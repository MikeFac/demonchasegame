(function () {
    var Constants, LevelConfig, WaveConfig, SharedUtils;

    if (typeof module !== 'undefined' && module.exports) {
        Constants = require('../Constants');
        LevelConfig = require('../LevelConfig');
        WaveConfig = require('../WaveConfig');
        SharedUtils = require('../utils');
    } else if (typeof window !== 'undefined') {
        Constants = window.Constants;
        LevelConfig = window.LevelConfig;
        WaveConfig = window.WaveConfig;
        SharedUtils = window.SharedUtils;
    }

    var generateId = SharedUtils.generateId;

    var DEMON_MAX_DAMAGE = {
        Condemnation: 2, Fear: 3, Unbelief: 5, Ignorance: 2,
        Strife: 6, Confusion: 4, Depression: 3, Doubt: 4,
        Infirmity: 7, Deception: 4, Despair: 4, Temptation: 5,
        Pride: 6, Poverty: 3, Shame: 3, Slumber: 2,
        Jezebel: 8, SpiritSlumber: 2, Blindness: 2, Swarm: 5
    };
    var DEFAULT_DEMON_DAMAGE = 3;

    /**
     * WaveMonsterManager — manages demons in formation for wave mode.
     *
     * Demon states:
     *   'entering'   — flying in from top of screen to formation slot
     *   'formation'  — holding position in formation grid (swaying)
     *   'dive'       — diving toward the player
     *   'returning'  — flying back up to formation slot
     */
    class WaveMonsterManager {
        constructor(emitter) {
            this.emitter = emitter;
            this.monsters = [];
            this.formationOffset = 0;
            this.formationDirection = 1;
            this.currentWaveConfig = null;
            this._entryComplete = false;
        }

        /**
         * Spawn a new wave of demons in formation.
         * @param {number} waveNumber
         */
        spawnWave(waveNumber) {
            var waveDef = WaveConfig.getWave(waveNumber);
            if (!waveDef) return;

            this.currentWaveConfig = waveDef;
            this.monsters = [];
            this.formationOffset = 0;
            this.formationDirection = 1;
            this._entryComplete = false;

            var rows = waveDef.rows;
            var cols = waveDef.cols;
            var spacingX = WaveConfig.FORMATION_SPACING_X;
            var spacingY = WaveConfig.FORMATION_SPACING_Y;
            var startY = WaveConfig.FORMATION_START_Y;

            // Center the formation horizontally
            var totalWidth = cols * spacingX;
            var startX = (WaveConfig.ARENA_WIDTH - totalWidth) / 2 + spacingX / 2;

            for (var r = 0; r < rows; r++) {
                for (var c = 0; c < cols; c++) {
                    // Skip center slot if boss wave — we'll put the boss there
                    var isBossSlot = waveDef.boss &&
                        r === Math.floor(rows / 2) &&
                        c === Math.floor(cols / 2);

                    var demonType;
                    if (isBossSlot) {
                        demonType = waveDef.boss.demonType;
                    } else {
                        demonType = waveDef.demons[Math.floor(Math.random() * waveDef.demons.length)];
                    }

                    var slotX = startX + c * spacingX;
                    var slotY = startY + r * spacingY;
                    var baseHealth = 8 + waveNumber * 3;

                    var monster = this._createMonster(demonType, slotX, slotY, baseHealth, isBossSlot ? waveDef.boss : null);
                    monster.gridRow = r;
                    monster.gridCol = c;
                    monster.slotX = slotX;
                    monster.slotY = slotY;

                    // Entry animation: start from above screen, staggered
                    monster.x = slotX;
                    monster.y = -60 - (r * 40) - (c * 10);
                    monster.state = 'entering';
                    monster.entryDelay = (r * cols + c) * 50; // Stagger entry
                    monster.entryStartTime = Date.now();

                    this.monsters.push(monster);
                }
            }
        }

        _createMonster(demonType, x, y, baseHealth, bossConfig) {
            var isStronghold = Constants.STRONGHOLD_DEMONS.includes(demonType);
            var hpMult = isStronghold ? Constants.STRONGHOLD_HP_MULTIPLIER : 1.0;
            var sizeMult = 1.0;

            if (bossConfig) {
                hpMult *= bossConfig.healthMultiplier || 1.0;
                sizeMult = bossConfig.sizeMultiplier || 1.0;
            }

            var finalHealth = Math.round(baseHealth * hpMult);
            var width = Math.round(Constants.MONSTER_WIDTH * sizeMult);
            var height = Math.round(Constants.MONSTER_HEIGHT * sizeMult);

            return {
                id: generateId(4),
                x: x,
                y: y,
                width: width,
                height: height,
                demonType: demonType,
                monsterType: demonType,
                health: finalHealth,
                maxHealth: finalHealth,
                maxDamage: DEMON_MAX_DAMAGE[demonType] || DEFAULT_DEMON_DAMAGE,
                state: 'formation',
                isBoss: !!bossConfig,
                bossLabel: bossConfig ? (bossConfig.label || demonType + ' Lord') : null,
                isAttacked: false,
                showHealth: false,
                showHealthTimeout: null,
                healthBar: { x: 0, y: 0, width: 0, height: 5, color: 'green' },
                armorHits: demonType === 'Pride' ? Constants.PRIDE_ARMOR_HITS : 0,
                // Dive state
                diveTargetX: 0,
                diveReturnSlotX: 0,
                diveReturnSlotY: 0
            };
        }

        /**
         * Update all monsters: entry animation, formation sway, dive attacks.
         * @param {Object} playerState — { x, y } of the player
         */
        update(playerState) {
            if (!this.currentWaveConfig) return;

            var now = Date.now();
            var waveDef = this.currentWaveConfig;

            // Update formation sway
            this.formationOffset += this.formationDirection * waveDef.formationSpeed;
            if (Math.abs(this.formationOffset) > waveDef.swayRange) {
                this.formationDirection *= -1;
            }

            // Check if all entries are complete
            if (!this._entryComplete) {
                var allEntered = true;
                for (var ei = 0; ei < this.monsters.length; ei++) {
                    if (this.monsters[ei].state === 'entering') {
                        allEntered = false;
                        break;
                    }
                }
                this._entryComplete = allEntered;
            }

            // Count current divers
            var diverCount = 0;
            for (var di = 0; di < this.monsters.length; di++) {
                if (this.monsters[di].state === 'dive') diverCount++;
            }

            for (var i = 0; i < this.monsters.length; i++) {
                var monster = this.monsters[i];

                if (monster.state === 'entering') {
                    // Staggered entry from top
                    var elapsed = now - monster.entryStartTime;
                    if (elapsed < monster.entryDelay) continue;

                    var targetY = monster.slotY;
                    var dy = targetY - monster.y;
                    var entrySpeed = 5;

                    if (Math.abs(dy) < entrySpeed) {
                        monster.y = targetY;
                        monster.x = monster.slotX + this.formationOffset;
                        monster.state = 'formation';
                    } else {
                        monster.y += entrySpeed;
                        monster.x = monster.slotX + this.formationOffset;
                    }

                } else if (monster.state === 'formation') {
                    // Follow formation sway
                    monster.x = monster.slotX + this.formationOffset;
                    monster.y = monster.slotY;

                    // Maybe start a dive
                    if (this._entryComplete &&
                        diverCount < waveDef.maxDivers &&
                        !monster.isBoss &&
                        Math.random() < waveDef.diveChance) {
                        monster.state = 'dive';
                        monster.diveTargetX = playerState ? playerState.x : WaveConfig.ARENA_WIDTH / 2;
                        monster.diveReturnSlotX = monster.slotX;
                        monster.diveReturnSlotY = monster.slotY;
                        diverCount++;
                    }

                } else if (monster.state === 'dive') {
                    // Dive toward player
                    monster.y += waveDef.diveSpeed;
                    // Track player horizontally with gentle homing
                    if (playerState) {
                        monster.x += (playerState.x - monster.x) * waveDef.diveTrackingFactor;
                    }

                    // Past bottom of arena → start returning
                    if (monster.y > WaveConfig.ARENA_HEIGHT + 30) {
                        monster.y = -40;
                        monster.state = 'returning';
                    }

                } else if (monster.state === 'returning') {
                    // Fly back to formation slot
                    var returnTargetY = monster.diveReturnSlotY;
                    var returnTargetX = monster.diveReturnSlotX + this.formationOffset;

                    monster.y += 4;
                    monster.x += (returnTargetX - monster.x) * 0.08;

                    if (monster.y >= returnTargetY) {
                        monster.y = returnTargetY;
                        monster.x = returnTargetX;
                        monster.state = 'formation';
                    }
                }

                // Update health bar position
                monster.healthBar.x = monster.x - monster.width / 2;
                monster.healthBar.y = monster.y - monster.height / 2 - 8;
                monster.healthBar.width = (monster.health / monster.maxHealth) * monster.width;

                if (monster.showHealthTimeout && now > monster.showHealthTimeout) {
                    monster.showHealth = false;
                    monster.showHealthTimeout = null;
                }
            }
        }

        /**
         * Damage a monster by ID. Returns true if killed.
         */
        damageMonster(monsterId, damage, attackerCode) {
            var monsterIndex = -1;
            for (var i = 0; i < this.monsters.length; i++) {
                if (this.monsters[i].id === monsterId) {
                    monsterIndex = i;
                    break;
                }
            }
            if (monsterIndex === -1) return false;

            var monster = this.monsters[monsterIndex];

            // Armor absorption
            if (monster.armorHits > 0) {
                monster.armorHits--;
                monster.isAttacked = true;
                monster.showHealth = true;
                monster.showHealthTimeout = Date.now() + 3000;
                this.emitter.emit('armorAbsorb', { monsterId: monster.id, armorLeft: monster.armorHits });
                var armorMonster = monster;
                setTimeout(function () { armorMonster.isAttacked = false; }, 500);
                return false;
            }

            monster.health -= damage;
            monster.isAttacked = true;
            monster.showHealth = true;
            monster.showHealthTimeout = Date.now() + 3000;
            var hitMonster = monster;
            setTimeout(function () { hitMonster.isAttacked = false; }, 500);

            if (monster.health <= 0) {
                var deathX = monster.x;
                var deathY = monster.y;
                var isBoss = monster.isBoss;

                this.monsters.splice(monsterIndex, 1);

                this.emitter.emit('monsterKilled', {
                    monsterId: monsterId,
                    killer: attackerCode,
                    x: deathX,
                    y: deathY,
                    isBoss: isBoss,
                    bossLabel: monster.bossLabel || null,
                    demonType: monster.demonType
                });

                return true;
            }

            return false;
        }

        /**
         * Check if all monsters in the current wave are dead.
         */
        isWaveCleared() {
            return this.monsters.length === 0 && this.currentWaveConfig !== null;
        }

        /**
         * Get all living monsters.
         */
        getMonsters() {
            return this.monsters;
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = WaveMonsterManager;
    } else if (typeof window !== 'undefined') {
        window.WaveMonsterManager = WaveMonsterManager;
    }
})();
