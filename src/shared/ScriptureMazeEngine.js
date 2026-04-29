(function () {
    'use strict';

    var ScriptureMazeConfigApi;

    if (typeof module !== 'undefined' && module.exports) {
        ScriptureMazeConfigApi = require('./ScriptureMazeConfig');
    } else if (typeof window !== 'undefined') {
        ScriptureMazeConfigApi = window.ScriptureMazeConfig;
    }

    var DIRS = {
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 }
    };

    var DIR_KEYS = ['left', 'right', 'up', 'down'];
    var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    function shuffle(list) {
        var arr = list.slice();
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        return arr;
    }

    function cloneDir(dirName) {
        return dirName ? { x: DIRS[dirName].x, y: DIRS[dirName].y, name: dirName } : { x: 0, y: 0, name: null };
    }

    function distanceSq(ax, ay, bx, by) {
        var dx = ax - bx;
        var dy = ay - by;
        return dx * dx + dy * dy;
    }

    function cleanWord(word) {
        return String(word || '').replace(/[^A-Za-z']/g, '');
    }

    class ScriptureMazeEngine {
        constructor(emitter, mission) {
            this.emitter = emitter;
            this.config = ScriptureMazeConfigApi.createMissionConfig(mission);
            this.layout = this.config.layout;
            this.tileSize = this.config.tileSize;
            this.width = this.config.width;
            this.height = this.config.height;
            this.loopId = null;
            this.shouldRun = false;
            this.lastUpdateAt = 0;
            this.keys = { left: false, right: false, up: false, down: false };
            this.currentPrompt = null;
            this.promptCooldownMs = 0;
            this.lastPromptTileKey = null;
            this.gameStatus = 'playing';
            this.gameOverReason = null;
            this.score = 0;
            this.missionProgress = 0;
            this.message = 'Click a floor tile to move. Reach a rune to enter eat mode.';
            this.stateTick = 0;
            this.powerModeUntil = 0;
            this.availableVerses = this._buildVersePool();
            this.player = this._createPlayer();
            this.demons = this._createDemons();
            this.promptNode = this._choosePromptNode();
        }

        start() {
            var self = this;
            this.shouldRun = true;
            this.lastUpdateAt = Date.now();
            this.loopId = setInterval(function () {
                if (!self.shouldRun) return;
                var now = Date.now();
                var dtMs = Math.min(50, now - self.lastUpdateAt || 16);
                self.lastUpdateAt = now;
                self.update(dtMs / 1000);
            }, 1000 / 60);
            this._emitState();
        }

        stop() {
            this.shouldRun = false;
            if (this.loopId) {
                clearInterval(this.loopId);
                this.loopId = null;
            }
        }

        advanceTime(ms) {
            var remaining = Math.max(0, ms || 0);
            while (remaining > 0) {
                var step = Math.min(1000 / 60, remaining);
                this.update(step / 1000);
                remaining -= step;
            }
            this._emitState();
        }

        handleInput(event, data) {
            if (event === 'move') {
                data = data || {};
                if (typeof data.left === 'boolean') this.keys.left = data.left;
                if (typeof data.right === 'boolean') this.keys.right = data.right;
                if (typeof data.up === 'boolean') this.keys.up = data.up;
                if (typeof data.down === 'boolean') this.keys.down = data.down;
                if (this.keys.left || this.keys.right || this.keys.up || this.keys.down) {
                    this.player.path = [];
                    this.player.pathTarget = null;
                }
            } else if (event === 'moveTo') {
                if (!data) return;
                this._setPathToTile(data.col, data.row);
            } else if (event === 'answerPrompt') {
                this._resolvePrompt(typeof data === 'number' ? data : (data && data.index));
            }
        }

        update(dt) {
            if (this.gameStatus !== 'playing') return;

            if (this.promptCooldownMs > 0) {
                this.promptCooldownMs = Math.max(0, this.promptCooldownMs - dt * 1000);
            }

            if (this.currentPrompt) {
                this._emitState();
                return;
            }

            this._updatePlayer(dt);
            this._updateDemons(dt);
            this._checkPromptPickup();
            this._checkCollisions();
            this._emitState();
        }

        _createPlayer() {
            var spawn = this._tileCenter(this.config.playerSpawn.col, this.config.playerSpawn.row);
            return {
                x: spawn.x,
                y: spawn.y,
                radius: this.tileSize * 0.32,
                width: 42,
                height: 42,
                currentDir: cloneDir(null),
                desiredDir: cloneDir(null),
                lastFacing: 'right',
                speed: this.config.playerSpeed,
                alive: true,
                moving: false,
                currentFrame: 0,
                animClock: 0,
                path: [],
                pathTarget: null
            };
        }

        _createDemons() {
            var spawnTiles = this.config.demonSpawnTiles;
            var roster = this.config.demonRoster;
            var behaviors = ['chaser', 'ambusher', 'wanderer', 'flanker'];
            var demons = [];
            for (var i = 0; i < roster.length; i++) {
                var tile = spawnTiles[i % spawnTiles.length];
                var center = this._tileCenter(tile.col, tile.row);
                demons.push({
                    id: 'demon-' + i,
                    demonType: roster[i],
                    behavior: behaviors[i % behaviors.length],
                    x: center.x,
                    y: center.y,
                    radius: this.tileSize * 0.34,
                    speed: this.config.demonSpeed + (i % 3 === 0 ? 6 : 0),
                    currentDir: cloneDir(i % 2 === 0 ? 'left' : 'right'),
                    spawnTile: { col: tile.col, row: tile.row },
                    active: true,
                    respawnAt: 0
                });
            }
            return demons;
        }

        _buildVersePool() {
            var categories = this.config.missionQualities || [];
            var pool = [];
            var organized = (typeof window !== 'undefined' && window.organizedVerses) ? window.organizedVerses : null;
            if (organized) {
                for (var i = 0; i < categories.length; i++) {
                    if (organized[categories[i]] && organized[categories[i]].length) {
                        pool = pool.concat(organized[categories[i]]);
                    }
                }
                if (!pool.length) {
                    var keys = Object.keys(organized);
                    for (var k = 0; k < keys.length && pool.length < 24; k++) {
                        pool = pool.concat(organized[keys[k]].slice(0, 4));
                    }
                }
            }
            return pool;
        }

        _tileCenter(col, row) {
            return {
                x: col * this.tileSize + this.tileSize / 2,
                y: row * this.tileSize + this.tileSize / 2
            };
        }

        _gridAt(col, row) {
            if (row < 0 || row >= this.layout.length) return '#';
            var line = this.layout[row];
            if (col < 0 || col >= line.length) return '#';
            return line[col];
        }

        _positionToTile(x, y) {
            return {
                col: Math.floor(x / this.tileSize),
                row: Math.floor(y / this.tileSize)
            };
        }

        _isWallTile(col, row) {
            return this._gridAt(col, row) === '#';
        }

        _atTileCenter(entity) {
            var tile = this._positionToTile(entity.x, entity.y);
            var center = this._tileCenter(tile.col, tile.row);
            return Math.abs(entity.x - center.x) <= 2 && Math.abs(entity.y - center.y) <= 2;
        }

        _snapToTileCenter(entity) {
            var tile = this._positionToTile(entity.x, entity.y);
            var center = this._tileCenter(tile.col, tile.row);
            entity.x = center.x;
            entity.y = center.y;
        }

        _canMove(entity, dirName) {
            if (!dirName) return false;
            var dir = DIRS[dirName];
            var tile = this._positionToTile(entity.x, entity.y);
            return !this._isWallTile(tile.col + dir.x, tile.row + dir.y);
        }

        _setPathToTile(col, row) {
            if (this.gameStatus !== 'playing' || this.currentPrompt) return;
            if (typeof col !== 'number' || typeof row !== 'number') return;
            if (this._isWallTile(col, row)) return;

            this.keys.left = false;
            this.keys.right = false;
            this.keys.up = false;
            this.keys.down = false;
            this.player.desiredDir = cloneDir(null);

            var path = this._findPath(this._positionToTile(this.player.x, this.player.y), { col: col, row: row });
            if (!path || path.length <= 1) return;

            this.player.path = path.slice(1);
            this.player.pathTarget = { col: col, row: row };
        }

        _findPath(startTile, endTile) {
            if (!startTile || !endTile) return null;
            var startKey = startTile.col + ',' + startTile.row;
            var endKey = endTile.col + ',' + endTile.row;
            var queue = [startTile];
            var visited = {};
            var prev = {};
            visited[startKey] = true;

            while (queue.length) {
                var tile = queue.shift();
                var key = tile.col + ',' + tile.row;
                if (key === endKey) break;
                for (var i = 0; i < DIR_KEYS.length; i++) {
                    var dir = DIRS[DIR_KEYS[i]];
                    var next = { col: tile.col + dir.x, row: tile.row + dir.y };
                    var nextKey = next.col + ',' + next.row;
                    if (visited[nextKey] || this._isWallTile(next.col, next.row)) continue;
                    visited[nextKey] = true;
                    prev[nextKey] = tile;
                    queue.push(next);
                }
            }

            if (!visited[endKey]) return null;
            var path = [];
            var cursor = endTile;
            while (cursor) {
                path.push({ col: cursor.col, row: cursor.row });
                var cursorKey = cursor.col + ',' + cursor.row;
                cursor = prev[cursorKey] || null;
            }
            path.reverse();
            return path;
        }

        _updatePlayer(dt) {
            var desired = this._getDesiredDirection();
            if (desired) {
                this.player.path = [];
                this.player.pathTarget = null;
                this.player.desiredDir = cloneDir(desired);
                this._updatePlayerByDirection(dt);
            } else {
                this._updatePlayerByPath(dt);
            }

            this.player.moving = !!this.player.currentDir.name;
            if (this.player.moving) {
                this.player.animClock += dt;
                if (this.player.animClock >= 0.16) {
                    this.player.currentFrame = (this.player.currentFrame + 1) % 2;
                    this.player.animClock = 0;
                }
            } else {
                this.player.currentFrame = 0;
                this.player.animClock = 0;
            }
        }

        _updatePlayerByDirection(dt) {
            if (this._atTileCenter(this.player)) {
                this._snapToTileCenter(this.player);
                if (this.player.desiredDir.name && this._canMove(this.player, this.player.desiredDir.name)) {
                    this.player.currentDir = cloneDir(this.player.desiredDir.name);
                    this.player.lastFacing = this.player.currentDir.name;
                } else if (this.player.currentDir.name && !this._canMove(this.player, this.player.currentDir.name)) {
                    this.player.currentDir = cloneDir(null);
                }
            }

            if (!this.player.currentDir.name) return;
            var dir = this.player.currentDir;
            this.player.x += dir.x * this.player.speed * dt;
            this.player.y += dir.y * this.player.speed * dt;
            this.player.lastFacing = dir.name;
        }

        _updatePlayerByPath(dt) {
            if (this._atTileCenter(this.player)) {
                this._snapToTileCenter(this.player);
            }

            while (this.player.path.length) {
                var currentTile = this._positionToTile(this.player.x, this.player.y);
                var nextTile = this.player.path[0];
                if (currentTile.col === nextTile.col && currentTile.row === nextTile.row) {
                    this.player.path.shift();
                    continue;
                }
                break;
            }

            if (!this.player.path.length) {
                this.player.currentDir = cloneDir(null);
                return;
            }

            var targetTile = this.player.path[0];
            var originTile = this._positionToTile(this.player.x, this.player.y);
            var dx = targetTile.col - originTile.col;
            var dy = targetTile.row - originTile.row;
            var dirName = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : dy < 0 ? 'up' : null;
            if (!dirName || this._isWallTile(targetTile.col, targetTile.row)) {
                this.player.path = [];
                this.player.currentDir = cloneDir(null);
                return;
            }

            var targetCenter = this._tileCenter(targetTile.col, targetTile.row);
            var travel = this.player.speed * dt;
            this.player.currentDir = cloneDir(dirName);
            this.player.lastFacing = dirName;

            if (dirName === 'left') {
                this.player.x = Math.max(targetCenter.x, this.player.x - travel);
            } else if (dirName === 'right') {
                this.player.x = Math.min(targetCenter.x, this.player.x + travel);
            } else if (dirName === 'up') {
                this.player.y = Math.max(targetCenter.y, this.player.y - travel);
            } else if (dirName === 'down') {
                this.player.y = Math.min(targetCenter.y, this.player.y + travel);
            }

            if (Math.abs(this.player.x - targetCenter.x) <= 0.5 && Math.abs(this.player.y - targetCenter.y) <= 0.5) {
                this.player.x = targetCenter.x;
                this.player.y = targetCenter.y;
                this.player.path.shift();
                if (!this.player.path.length) {
                    this.player.currentDir = cloneDir(null);
                }
            }
        }

        _getDesiredDirection() {
            if (this.keys.left) return 'left';
            if (this.keys.right) return 'right';
            if (this.keys.up) return 'up';
            if (this.keys.down) return 'down';
            return null;
        }

        _updateDemons(dt) {
            for (var i = 0; i < this.demons.length; i++) {
                var demon = this.demons[i];
                if (!demon.active) {
                    if (demon.respawnAt && Date.now() >= demon.respawnAt) {
                        this._respawnDemon(demon);
                    }
                    continue;
                }
                if (!demon.currentDir.name || !this._canMove(demon, demon.currentDir.name)) {
                    demon.currentDir = cloneDir(this._pickDemonDirection(demon));
                }
                if (this._atTileCenter(demon)) {
                    this._snapToTileCenter(demon);
                    demon.currentDir = cloneDir(this._pickDemonDirection(demon));
                }
                if (demon.currentDir.name) {
                    demon.x += demon.currentDir.x * demon.speed * dt;
                    demon.y += demon.currentDir.y * demon.speed * dt;
                }
            }
        }

        _pickDemonDirection(demon) {
            var tile = this._positionToTile(demon.x, demon.y);
            var possible = [];
            for (var i = 0; i < DIR_KEYS.length; i++) {
                var dirName = DIR_KEYS[i];
                var dir = DIRS[dirName];
                if (this._isWallTile(tile.col + dir.x, tile.row + dir.y)) continue;
                possible.push(dirName);
            }
            if (!possible.length) return null;

            var reverse = demon.currentDir.name === 'left' ? 'right'
                : demon.currentDir.name === 'right' ? 'left'
                : demon.currentDir.name === 'up' ? 'down'
                : demon.currentDir.name === 'down' ? 'up'
                : null;
            var filtered = possible.filter(function (dirName) {
                return dirName !== reverse;
            });
            if (filtered.length) possible = filtered;

            if (demon.behavior === 'wanderer') {
                if (demon.currentDir.name && possible.indexOf(demon.currentDir.name) !== -1 && Math.random() < 0.68) {
                    return demon.currentDir.name;
                }
                return shuffle(possible)[0];
            }

            var target = this._getDemonTarget(demon);
            var bestDir = possible[0];
            var bestScore = Infinity;
            for (var j = 0; j < possible.length; j++) {
                var candidate = possible[j];
                var dirStep = DIRS[candidate];
                var center = this._tileCenter(tile.col + dirStep.x, tile.row + dirStep.y);
                var score = distanceSq(center.x, center.y, target.x, target.y);
                if (this._isPoweredUp()) {
                    score *= -1;
                }
                if (candidate === demon.currentDir.name) score -= this.tileSize * 0.5;
                if (demon.behavior === 'flanker') score += Math.abs(center.x - this.player.x) * 0.15;
                if (score < bestScore) {
                    bestScore = score;
                    bestDir = candidate;
                }
            }
            return bestDir;
        }

        _getDemonTarget(demon) {
            if (this._isPoweredUp()) {
                return {
                    x: demon.x + (demon.x - this.player.x),
                    y: demon.y + (demon.y - this.player.y)
                };
            }
            var playerTile = this._positionToTile(this.player.x, this.player.y);
            if (demon.behavior === 'ambusher') {
                var facing = this.player.lastFacing || 'right';
                var dir = DIRS[facing];
                return this._tileCenter(playerTile.col + dir.x * 2, playerTile.row + dir.y * 2);
            }
            if (demon.behavior === 'flanker') {
                return this._tileCenter(playerTile.col + 2, playerTile.row - 1);
            }
            return { x: this.player.x, y: this.player.y };
        }

        _checkPromptPickup() {
            if (!this.promptNode || this.currentPrompt || this.promptCooldownMs > 0 || this._isPoweredUp()) return;
            if (distanceSq(this.player.x, this.player.y, this.promptNode.x, this.promptNode.y) <= Math.pow(this.player.radius + 10, 2)) {
                this._openPrompt();
            }
        }

        _openPrompt() {
            if (!this.availableVerses.length) return;
            var shuffled = shuffle(this.availableVerses);
            var prompt = null;
            for (var i = 0; i < shuffled.length; i++) {
                prompt = this._buildTwoLetterPrompt(shuffled[i]);
                if (prompt) break;
            }
            if (!prompt) return;
            this.currentPrompt = prompt;
            this.player.currentDir = cloneDir(null);
            this.player.path = [];
            this.player.pathTarget = null;
            this.message = 'Pass the 2-letter test to eat demons.';
        }

        _buildTwoLetterPrompt(verse) {
            var rawWords = String(verse && verse.Text || '').split(/\s+/);
            var candidates = [];
            for (var i = 0; i < rawWords.length; i++) {
                var cleaned = cleanWord(rawWords[i]);
                if (cleaned.length >= 4) {
                    candidates.push({
                        index: i,
                        word: cleaned
                    });
                }
            }
            if (candidates.length < 2) return null;

            candidates = shuffle(candidates).slice(0, 2).sort(function (a, b) {
                return a.index - b.index;
            });

            var questionWords = rawWords.slice();
            for (var j = 0; j < candidates.length; j++) {
                questionWords[candidates[j].index] = '_____';
            }

            var answers = candidates.map(function (item) {
                return item.word.charAt(0).toUpperCase();
            });

            return {
                verseText: questionWords.join(' '),
                reference: verse.Reference,
                questionLabel: 'Tap the first letters of the 2 missing words',
                answers: answers,
                answerWords: candidates.map(function (item) { return item.word; }),
                currentIndex: 0,
                revealedLetters: [],
                options: this._buildLetterOptions(answers[0])
            };
        }

        _buildLetterOptions(correctLetter) {
            var distractors = LETTERS.filter(function (letter) {
                return letter !== correctLetter;
            });
            distractors = shuffle(distractors).slice(0, 3);
            return shuffle([correctLetter].concat(distractors));
        }

        _resolvePrompt(index) {
            if (!this.currentPrompt || typeof index !== 'number') return;
            if (index < 0 || index >= this.currentPrompt.options.length) return;

            var selected = this.currentPrompt.options[index];
            var correctLetter = this.currentPrompt.answers[this.currentPrompt.currentIndex];
            var correct = selected === correctLetter;

            if (correct) {
                this.currentPrompt.revealedLetters.push(selected);
                this.currentPrompt.currentIndex += 1;
                this.score += 40;
                if (this.currentPrompt.currentIndex >= this.currentPrompt.answers.length) {
                    this.powerModeUntil = Date.now() + this.config.powerModeMs;
                    this.message = 'Eat mode active. Run through demons.';
                    this.currentPrompt = null;
                    this.promptCooldownMs = this.config.promptRespawnMs;
                    this.promptNode = this._choosePromptNode();
                    return;
                }
                this.currentPrompt.options = this._buildLetterOptions(this.currentPrompt.answers[this.currentPrompt.currentIndex]);
                this.message = 'One more letter.';
                return;
            }

            this.currentPrompt = null;
            this.promptCooldownMs = Math.max(600, this.config.promptRespawnMs * 0.7);
            this.promptNode = this._choosePromptNode();
            this.message = 'Wrong letters. Find the next rune.';
        }

        _choosePromptNode() {
            if (!this.config.promptTiles.length) return null;
            var candidates = shuffle(this.config.promptTiles);
            for (var i = 0; i < candidates.length; i++) {
                var tile = candidates[i];
                var key = tile.col + ',' + tile.row;
                if (key === this.lastPromptTileKey && candidates.length > 1) continue;
                this.lastPromptTileKey = key;
                var center = this._tileCenter(tile.col, tile.row);
                return {
                    tile: { col: tile.col, row: tile.row },
                    x: center.x,
                    y: center.y,
                    pulse: 0
                };
            }
            return null;
        }

        _checkCollisions() {
            for (var i = 0; i < this.demons.length; i++) {
                var demon = this.demons[i];
                if (!demon.active) continue;
                if (distanceSq(this.player.x, this.player.y, demon.x, demon.y) > Math.pow(this.player.radius + demon.radius - 4, 2)) {
                    continue;
                }
                if (this._isPoweredUp()) {
                    this._defeatDemon(demon);
                    continue;
                }
                this._loseGame('caught');
                return;
            }
        }

        _defeatDemon(demon) {
            demon.active = false;
            demon.respawnAt = Date.now() + this.config.respawnMs;
            demon.currentDir = cloneDir(null);
            this.missionProgress += 1;
            this.score += this.config.demonEatScore;
            this.message = demon.demonType + ' eaten.';
            if (this.missionProgress >= this.config.targetDemonsToEat) {
                this._winGame();
            }
            if (this.emitter && typeof this.emitter.emit === 'function') {
                this.emitter.emit('monsterKilled', {
                    x: demon.x,
                    y: demon.y,
                    demonType: demon.demonType
                });
            }
        }

        _respawnDemon(demon) {
            var center = this._tileCenter(demon.spawnTile.col, demon.spawnTile.row);
            demon.x = center.x;
            demon.y = center.y;
            demon.active = true;
            demon.respawnAt = 0;
            demon.currentDir = cloneDir(Math.random() < 0.5 ? 'left' : 'right');
        }

        _isPoweredUp() {
            return Date.now() < this.powerModeUntil;
        }

        _winGame() {
            this.gameStatus = 'victory';
            this.gameOverReason = 'victory';
            this.message = 'Mission complete.';
            if (this.emitter && typeof this.emitter.emit === 'function') {
                this.emitter.emit('gameEnded', { result: 'victory', score: this.score, progress: this.missionProgress });
            }
        }

        _loseGame(reason) {
            this.gameStatus = 'defeat';
            this.gameOverReason = reason || 'caught';
            this.player.alive = false;
            this.player.currentDir = cloneDir(null);
            this.message = 'Caught by a demon.';
            if (this.emitter && typeof this.emitter.emit === 'function') {
                this.emitter.emit('gameEnded', { result: 'defeat', reason: this.gameOverReason, score: this.score, progress: this.missionProgress });
            }
        }

        _emitState() {
            this.stateTick += 1;
            if (this.promptNode) {
                this.promptNode.pulse = (this.promptNode.pulse || 0) + 0.18;
            }
            if (this.emitter && typeof this.emitter.emit === 'function') {
                this.emitter.emit('scriptureMazeState', {
                    tick: this.stateTick,
                    width: this.width,
                    height: this.height,
                    tileSize: this.tileSize,
                    layout: this.layout,
                    player: {
                        x: this.player.x,
                        y: this.player.y,
                        radius: this.player.radius,
                        width: this.player.width,
                        height: this.player.height,
                        facing: this.player.lastFacing,
                        alive: this.player.alive,
                        moving: this.player.moving,
                        currentFrame: this.player.currentFrame
                    },
                    demons: this.demons.map(function (demon) {
                        return {
                            id: demon.id,
                            x: demon.x,
                            y: demon.y,
                            radius: demon.radius,
                            demonType: demon.demonType,
                            behavior: demon.behavior,
                            active: demon.active
                        };
                    }),
                    bullets: [],
                    promptNode: this.promptNode ? {
                        x: this.promptNode.x,
                        y: this.promptNode.y,
                        pulse: this.promptNode.pulse || 0
                    } : null,
                    prompt: this.currentPrompt ? {
                        verseText: this.currentPrompt.verseText,
                        reference: this.currentPrompt.reference,
                        questionLabel: this.currentPrompt.questionLabel,
                        options: this.currentPrompt.options,
                        currentIndex: this.currentPrompt.currentIndex,
                        answerWords: this.currentPrompt.answerWords,
                        revealedLetters: this.currentPrompt.revealedLetters.slice()
                    } : null,
                    ammo: 0,
                    score: this.score,
                    progress: this.missionProgress,
                    target: this.config.targetDemonsToEat,
                    status: this.gameStatus,
                    message: this.message,
                    missionName: this.config.name,
                    missionQualities: this.config.missionQualities.slice(),
                    poweredUp: this._isPoweredUp(),
                    powerModeMsLeft: Math.max(0, this.powerModeUntil - Date.now()),
                    pathTarget: this.player.pathTarget ? {
                        col: this.player.pathTarget.col,
                        row: this.player.pathTarget.row
                    } : null
                });
            }
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ScriptureMazeEngine;
    } else if (typeof window !== 'undefined') {
        window.ScriptureMazeEngine = ScriptureMazeEngine;
    }
})();
