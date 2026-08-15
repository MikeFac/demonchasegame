class RendererThreeJS extends Renderer3D {
    static isSupported() {
        if (!window.THREE || !document.getElementById('worldCanvas3D')) return false;
        try {
            const probe = document.createElement('canvas');
            return !!(probe.getContext('webgl2') || probe.getContext('webgl'));
        } catch (error) {
            return false;
        }
    }

    constructor(canvas, ctx, assets) {
        super(canvas, ctx, assets);
        if (!RendererThreeJS.isSupported()) {
            throw new Error('Three.js/WebGL runtime is unavailable');
        }

        this.viewMode = '3d';
        this.worldCanvas = document.getElementById('worldCanvas3D');
        this.three = window.THREE;
        this.scene = new this.three.Scene();
        this.scene.background = new this.three.Color(0x91cce8);
        this.scene.fog = new this.three.Fog(0x91cce8, 620, 1450);
        this.camera3D = new this.three.PerspectiveCamera(58, 4 / 3, 4, 1800);
        this.webgl = new this.three.WebGLRenderer({
            canvas: this.worldCanvas,
            antialias: false,
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.webgl.setPixelRatio(1);
        this.webgl.outputColorSpace = this.three.SRGBColorSpace;
        this.webgl.toneMapping = this.three.ACESFilmicToneMapping;
        this.webgl.toneMappingExposure = 1.3;
        this.webgl.shadowMap.enabled = false;

        this.wallMesh = null;
        this.wallSource = null;
        this.wallTheme = null;
        this.cameraWallCells = new Set();
        this.cameraWallCellSize = 25;
        this.floor = null;
        this.entityMaps = {
            players: new Map(),
            monsters: new Map(),
            bullets: new Map(),
            healing: new Map(),
            collectibles: new Map(),
            npcs: new Map()
        };
        this.materials = new Map();
        this.geometries = new Map();
        this.elapsed = 0;
        this.lastFrameAt = performance.now();
        this.cameraInitialized = false;
        this.lastCameraPlayerPosition = null;

        this._createEnvironment();
        this._installVisibilityBridge();
        this._syncCanvasLayers();

        this.gltfLoader = window.GLTFLoader ? new window.GLTFLoader() : null;
        window.lowPoly3DRenderer = this;
        window.render_game_to_text = () => JSON.stringify(this.debugState || {
            mode: 'low-poly-3d',
            status: 'initializing',
            coordinates: 'game x maps to world x; game y maps to world z'
        });
    }

    drawGame(gameState, player, playerCode, monsters, healingPoints, camera, uiState, inventoryState, walls, screenShake = { x: 0, y: 0 }, damageNumbers = [], deathParticles = [], mouseX = null, mouseY = null) {
        this._syncCanvasLayers();
        this.clear();

        const now = performance.now();
        const dt = Math.min(0.05, Math.max(0, (now - this.lastFrameAt) / 1000));
        this.lastFrameAt = now;
        this.elapsed += dt;

        this._syncWorld({
            gameState: gameState || {},
            player,
            playerCode,
            monsters: monsters || [],
            healingPoints: healingPoints || [],
            walls: walls || [],
            uiState: uiState || {},
            screenShake: screenShake || { x: 0, y: 0 }
        });
        this.webgl.render(this.scene, this.camera3D);
        this._publishStats();
        this._publishDebugState(gameState, player, monsters, healingPoints);

        if (uiState.startHereSummaryVisible) {
            this.drawStartHereSummaryModal(uiState.startHereSummaryState);
            return;
        }
        if (uiState.gameOverModalVisible) {
            this.drawGameOverModal(this.canvas, uiState.finalStats, uiState.restartButtonRect);
            return;
        }

        this._drawInterface(gameState, player, monsters, camera, uiState, inventoryState, mouseX, mouseY);
    }

    _createEnvironment() {
        const THREE = this.three;
        const ambient = new THREE.AmbientLight(0xffffff, 1.15);
        this.scene.add(ambient);

        const hemisphere = new THREE.HemisphereLight(0xe8f8ff, 0x8a7652, 3.1);
        this.scene.add(hemisphere);

        const sun = new THREE.DirectionalLight(0xffe4b0, 3.2);
        sun.position.set(-350, 650, -250);
        this.scene.add(sun);

        const floorGeometry = new THREE.BoxGeometry(3000, 4, 3000);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x8c805f,
            emissive: 0x201b10,
            emissiveIntensity: 0.22,
            roughness: 0.96,
            metalness: 0,
            flatShading: true
        });
        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.position.set(1500, -4, 1500);
        this.scene.add(this.floor);

        const grid = new THREE.GridHelper(3000, 60, 0xc5b98e, 0x6e654d);
        grid.position.set(1500, 0, 1500);
        grid.material.opacity = 0.16;
        grid.material.transparent = true;
        this.scene.add(grid);
    }

    _installVisibilityBridge() {
        const worldCanvas = this.worldCanvas;
        window.setLowPolyWorldVisible = function (visible) {
            worldCanvas.style.display = visible ? 'block' : 'none';
        };
    }

    _syncCanvasLayers() {
        const rect = this.canvas.getBoundingClientRect();
        const width = Math.max(1, this.canvas.width);
        const height = Math.max(1, this.canvas.height);

        if (this.worldCanvas.width !== width || this.worldCanvas.height !== height) {
            this.webgl.setSize(width, height, false);
        }
        this.camera3D.aspect = width / height;
        this.camera3D.updateProjectionMatrix();

        this.worldCanvas.style.display = 'block';
        this.worldCanvas.style.left = '0';
        this.worldCanvas.style.top = '0';
        this.worldCanvas.style.width = `${rect.width}px`;
        this.worldCanvas.style.height = `${rect.height}px`;
        this.canvas.style.background = 'transparent';
    }

    _syncWorld(snapshot) {
        this._syncTheme(snapshot.gameState.terrainTheme || 'stone');
        this._syncWalls(snapshot.walls, snapshot.gameState.terrainTheme || 'stone');
        this._syncPlayers(snapshot.gameState.players || {}, snapshot.player, snapshot.playerCode);
        this._syncMonsters(snapshot.monsters, snapshot.player);
        this._syncBullets(snapshot.gameState.bullets || []);
        this._syncHealing(snapshot.healingPoints);
        this._syncCollectibles(snapshot.gameState.collectibles || []);
        this._syncNpcs(snapshot.uiState.npcInteractions || []);
        this._updateCamera(snapshot.player, snapshot.screenShake);
    }

    _syncTheme(theme) {
        const themes = {
            stone: { sky: 0x91cce8, fog: 0x91cce8, floor: 0x8c805f },
            earth: { sky: 0xe8bd82, fog: 0xd6a76d, floor: 0x72513b },
            crystal: { sky: 0xa8a2df, fog: 0x8179bf, floor: 0x544a75 }
        };
        const selected = themes[theme] || themes.stone;
        this.scene.background.setHex(selected.sky);
        this.scene.fog.color.setHex(selected.fog);
        this.floor.material.color.setHex(selected.floor);
    }

    _syncWalls(walls, theme) {
        if (walls === this.wallSource && theme === this.wallTheme) return;
        const THREE = this.three;
        this.wallSource = walls;
        this.wallTheme = theme;
        this._rebuildCameraWallGrid(walls);

        if (this.wallMesh) {
            this.scene.remove(this.wallMesh);
            this.wallMesh.geometry.dispose();
            this.wallMesh.material.dispose();
            this.wallMesh = null;
        }
        if (!walls.length) return;

        const colors = {
            stone: 0x8e9bac,
            earth: 0x76543e,
            crystal: 0x6e5a94
        };
        const emissiveColors = {
            stone: 0x3b434b,
            earth: 0x342318,
            crystal: 0x2c2240
        };
        const mergedWalls = this._mergeWallRects(walls);
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: emissiveColors[theme] || emissiveColors.stone,
            emissiveIntensity: 0.65,
            roughness: 0.9,
            metalness: theme === 'crystal' ? 0.12 : 0,
            flatShading: true,
            vertexColors: true
        });
        const mesh = new THREE.InstancedMesh(geometry, material, mergedWalls.length);
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        const tint = new THREE.Color();
        const wallHeight = 72;

        mergedWalls.forEach((wall, index) => {
            const width = wall.width || 25;
            const depth = wall.height || 25;
            position.set(wall.x + width / 2, wallHeight / 2, wall.y + depth / 2);
            scale.set(width, wallHeight, depth);
            matrix.compose(position, quaternion, scale);
            mesh.setMatrixAt(index, matrix);

            const variation = (((wall.x * 13 + wall.y * 7 + index * 3) % 17) - 8) / 100;
            tint.setHex(colors[theme] || colors.stone).offsetHSL(0, 0, variation);
            mesh.setColorAt(index, tint);
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.frustumCulled = true;
        mesh.userData.sourceWallCount = walls.length;
        mesh.userData.mergedWallCount = mergedWalls.length;
        this.wallMesh = mesh;
        this.scene.add(mesh);
    }

    _rebuildCameraWallGrid(walls) {
        const cellSize = this.cameraWallCellSize;
        const cells = new Set();
        walls.forEach((wall) => {
            const minCol = Math.floor(wall.x / cellSize);
            const maxCol = Math.floor((wall.x + (wall.width || cellSize) - 0.01) / cellSize);
            const minRow = Math.floor(wall.y / cellSize);
            const maxRow = Math.floor((wall.y + (wall.height || cellSize) - 0.01) / cellSize);
            for (let row = minRow; row <= maxRow; row++) {
                for (let col = minCol; col <= maxCol; col++) cells.add(`${col}:${row}`);
            }
        });
        this.cameraWallCells = cells;
    }

    _cameraPointBlocked(x, z) {
        const cellSize = this.cameraWallCellSize;
        const col = Math.floor(x / cellSize);
        const row = Math.floor(z / cellSize);
        return this.cameraWallCells.has(`${col}:${row}`);
    }

    _safeCameraDistance(player, forwardX, forwardZ, maximum) {
        let safe = 14;
        for (let distance = 22; distance <= maximum; distance += 8) {
            const x = player.x - forwardX * distance;
            const z = player.y - forwardZ * distance;
            if (this._cameraPointBlocked(x, z)) break;
            safe = distance;
        }
        return safe;
    }

    _mergeWallRects(walls) {
        const sorted = walls.map((wall) => ({
            x: wall.x,
            y: wall.y,
            width: wall.width || 25,
            height: wall.height || 25
        })).sort((a, b) => a.y - b.y || a.height - b.height || a.x - b.x);
        const merged = [];
        const epsilon = 0.01;

        sorted.forEach((wall) => {
            const previous = merged[merged.length - 1];
            const sameRow = previous
                && Math.abs(previous.y - wall.y) <= epsilon
                && Math.abs(previous.height - wall.height) <= epsilon;
            const touches = sameRow && Math.abs((previous.x + previous.width) - wall.x) <= epsilon;
            if (touches) previous.width += wall.width;
            else merged.push(wall);
        });
        return merged;
    }

    _syncPlayers(players, localPlayer, playerCode) {
        const list = Object.keys(players).map((code) => ({
            id: code,
            data: code === playerCode && localPlayer ? localPlayer : players[code]
        }));
        if (localPlayer && playerCode && !list.some((entry) => entry.id === playerCode)) {
            list.push({ id: playerCode, data: localPlayer });
        }
        this._syncEntityMap(this.entityMaps.players, list, (entry) => entry.id,
            () => this._createPlayerMesh(),
            (group, entry) => this._updatePlayerMesh(group, entry.data, entry.id === playerCode));
    }

    _syncMonsters(monsters, player) {
        this._syncEntityMap(this.entityMaps.monsters, monsters, (monster, index) => monster.id ?? `monster-${index}`,
            (monster) => this._createMonsterMesh(monster),
            (group, monster) => this._updateMonsterMesh(group, monster, player));
    }

    _syncBullets(bullets) {
        this._syncEntityMap(this.entityMaps.bullets, bullets, (bullet, index) => bullet.id ?? `bullet-${index}`,
            () => {
                const mesh = new this.three.Mesh(
                    this._geometry('bullet', () => new this.three.OctahedronGeometry(5, 0)),
                    this._material('bullet', () => new this.three.MeshBasicMaterial({ color: 0xffe06b }))
                );
                mesh.scale.set(0.65, 0.65, 1.8);
                return mesh;
            },
            (mesh, bullet) => {
                mesh.position.set(bullet.x, 28, bullet.y);
                if (typeof bullet.vx === 'number' && typeof bullet.vy === 'number') {
                    mesh.rotation.y = -Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2;
                }
            });
    }

    _syncHealing(points) {
        this._syncEntityMap(this.entityMaps.healing, points, (point, index) => point.id ?? `heal-${index}`,
            () => this._createHealingMesh(),
            (group, point, index) => {
                group.position.set(point.x, 24 + Math.sin(this.elapsed * 2 + index) * 4, point.y);
                group.rotation.y = this.elapsed * 1.2;
            });
    }

    _syncCollectibles(items) {
        this._syncEntityMap(this.entityMaps.collectibles, items, (item, index) => item.id ?? item.storyObjectId ?? `${item.type}-${index}`,
            (item) => this._createCollectibleMesh(item.type),
            (group, item, index) => {
                group.position.set(item.x, 22 + Math.sin(this.elapsed * 1.8 + index) * 4, item.y);
                group.rotation.y = this.elapsed * 0.9 + index;
            });
    }

    _syncNpcs(interactions) {
        const visible = interactions.filter((entry) => entry && entry.position);
        this._syncEntityMap(this.entityMaps.npcs, visible, (entry, index) => entry.id ?? `npc-${index}`,
            () => this._createNpcMesh(),
            (group, entry) => group.position.set(entry.position.x, 0, entry.position.y));
    }

    _syncEntityMap(map, items, keyFor, create, update) {
        const live = new Set();
        items.forEach((item, index) => {
            const key = String(keyFor(item, index));
            live.add(key);
            let object = map.get(key);
            if (!object) {
                object = create(item, index);
                object.userData.entityKey = key;
                map.set(key, object);
                this.scene.add(object);
            }
            update(object, item, index);
        });

        for (const [key, object] of map.entries()) {
            if (!live.has(key)) {
                this.scene.remove(object);
                map.delete(key);
            }
        }
    }

    _createPlayerMesh() {
        const THREE = this.three;
        const group = new THREE.Group();
        const blue = this._material('player-blue', () => new THREE.MeshStandardMaterial({ color: 0x2878b8, roughness: 0.78, flatShading: true }));
        const skin = this._material('player-skin', () => new THREE.MeshStandardMaterial({ color: 0xd8a372, roughness: 0.9, flatShading: true }));
        const gold = this._material('player-gold', () => new THREE.MeshStandardMaterial({ color: 0xe2b13c, roughness: 0.55, metalness: 0.18, flatShading: true }));

        const torso = new THREE.Mesh(this._geometry('player-torso', () => new THREE.BoxGeometry(24, 30, 13)), blue);
        torso.position.y = 35;
        const head = new THREE.Mesh(this._geometry('player-head', () => new THREE.DodecahedronGeometry(10, 0)), skin);
        head.position.y = 58;
        group.add(torso, head);

        [-1, 1].forEach((side) => {
            const arm = new THREE.Mesh(this._geometry('player-limb', () => new THREE.BoxGeometry(7, 25, 7)), blue);
            arm.position.set(side * 16, 35, 0);
            arm.rotation.z = side * -0.16;
            const leg = new THREE.Mesh(this._geometry('player-leg', () => new THREE.BoxGeometry(8, 26, 9)), blue);
            leg.position.set(side * 7, 13, 0);
            group.add(arm, leg);
        });

        const sword = new THREE.Mesh(this._geometry('player-sword', () => new THREE.BoxGeometry(3, 32, 3)), gold);
        sword.position.set(21, 31, -5);
        sword.rotation.z = -0.35;
        group.add(sword);

        const shadow = this._createBlobShadow(22);
        group.add(shadow);
        return group;
    }

    _updatePlayerMesh(group, player, isLocal) {
        if (!player) return;
        group.position.set(player.x, 0, player.y);
        const angle = typeof player.viewAngle === 'number'
            ? player.viewAngle
            : (player.facingDirection === 'left' ? Math.PI : 0);
        group.rotation.y = -angle + Math.PI / 2;
        const stride = player.isMoving ? Math.sin(this.elapsed * 11) * 0.04 : 0;
        group.rotation.z = stride;
        group.visible = player.state !== 'disconnected';
        group.scale.setScalar(isLocal ? 1.06 : 0.96);
    }

    _createMonsterMesh(monster) {
        const THREE = this.three;
        const type = String(monster.demonType || monster.monsterType || 'Fear');
        const palette = this._monsterPalette(type);
        const bodyMaterial = this._material(`monster-body-${palette.key}`, () => new THREE.MeshStandardMaterial({
            color: palette.body,
            roughness: 0.82,
            metalness: 0.04,
            flatShading: true
        }));
        const accentMaterial = this._material(`monster-accent-${palette.key}`, () => new THREE.MeshStandardMaterial({
            color: palette.accent,
            roughness: 0.65,
            flatShading: true
        }));
        const eyeMaterial = this._material(`monster-eye-${palette.key}`, () => new THREE.MeshBasicMaterial({ color: palette.eye }));
        const group = new THREE.Group();

        const body = new THREE.Mesh(this._geometry('monster-body', () => new THREE.ConeGeometry(18, 42, 6, 1)), bodyMaterial);
        body.position.y = 25;
        const shoulders = new THREE.Mesh(this._geometry('monster-shoulders', () => new THREE.OctahedronGeometry(17, 0)), accentMaterial);
        shoulders.scale.set(1.35, 0.55, 0.72);
        shoulders.position.y = 39;
        const head = new THREE.Mesh(this._geometry('monster-head', () => new THREE.DodecahedronGeometry(12, 0)), bodyMaterial);
        head.position.y = 53;
        group.add(body, shoulders, head);

        [-1, 1].forEach((side) => {
            const horn = new THREE.Mesh(this._geometry('monster-horn', () => new THREE.ConeGeometry(4, 18, 5, 1)), accentMaterial);
            horn.position.set(side * 8, 67, 0);
            horn.rotation.z = side * -0.42;
            const eye = new THREE.Mesh(this._geometry('monster-eye', () => new THREE.OctahedronGeometry(2.2, 0)), eyeMaterial);
            eye.position.set(side * 4.5, 55, -10);
            group.add(horn, eye);
        });

        const aura = new THREE.Mesh(
            this._geometry('aura-ring', () => new THREE.RingGeometry(28, 31, 20)),
            this._material('freeze-aura', () => new THREE.MeshBasicMaterial({ color: 0x7ebcff, transparent: true, opacity: 0.34, side: THREE.DoubleSide }))
        );
        aura.rotation.x = -Math.PI / 2;
        aura.position.y = 1.2;
        aura.visible = false;
        aura.name = 'freezeAura';
        group.add(aura, this._createBlobShadow(23));

        const armor = new THREE.Mesh(
            this._geometry('armor-ring', () => new THREE.TorusGeometry(22, 2.2, 4, 12)),
            this._material('armor-gold', () => new THREE.MeshBasicMaterial({ color: 0xffd34f }))
        );
        armor.rotation.x = Math.PI / 2;
        armor.position.y = 35;
        armor.visible = false;
        armor.name = 'armorRing';
        group.add(armor);
        return group;
    }

    _updateMonsterMesh(group, monster, player) {
        const bob = Math.sin(this.elapsed * 3.2 + this._hashString(String(monster.id || monster.demonType))) * 2.5;
        group.position.set(monster.x, bob, monster.y);
        if (player) group.rotation.y = Math.atan2(player.x - monster.x, player.y - monster.y);
        const baseScale = Math.max(0.8, (monster.width || 48) / 48);
        const dashScale = monster.isDashing ? 1.13 : 1;
        group.scale.set(baseScale * dashScale, baseScale, baseScale * dashScale);
        const aura = group.getObjectByName('freezeAura');
        const armor = group.getObjectByName('armorRing');
        if (aura) {
            aura.visible = !!monster.freezeAura;
            aura.rotation.z = this.elapsed * 0.55;
        }
        if (armor) {
            armor.visible = monster.armorHits > 0;
            armor.rotation.z = this.elapsed * 1.4;
        }
        group.visible = monster.health === undefined || monster.health > 0;
    }

    _createHealingMesh() {
        const THREE = this.three;
        const group = new THREE.Group();
        const material = this._material('healing', () => new THREE.MeshStandardMaterial({ color: 0x42e879, emissive: 0x0b6b32, emissiveIntensity: 0.9, flatShading: true }));
        const vertical = new THREE.Mesh(this._geometry('heal-v', () => new THREE.BoxGeometry(7, 31, 7)), material);
        const horizontal = new THREE.Mesh(this._geometry('heal-h', () => new THREE.BoxGeometry(25, 7, 7)), material);
        group.add(vertical, horizontal);
        return group;
    }

    _createCollectibleMesh(type) {
        const THREE = this.three;
        const colors = { sword: 0xffd54f, belt: 0xd9a52e, helmet: 0xc7d1dc, breastplate: 0xb87842, sandals: 0x7fd7f1, shield: 0xf1c84d, smoothStone: 0xc9b18b };
        const material = new THREE.MeshStandardMaterial({ color: colors[type] || 0xf1c84d, roughness: 0.52, metalness: 0.22, flatShading: true });
        let geometry;
        if (type === 'smoothStone') geometry = new THREE.DodecahedronGeometry(11, 0);
        else if (type === 'sword') geometry = new THREE.BoxGeometry(5, 34, 5);
        else geometry = new THREE.OctahedronGeometry(14, 0);
        return new THREE.Mesh(geometry, material);
    }

    _createNpcMesh() {
        const THREE = this.three;
        const group = new THREE.Group();
        const robe = this._material('npc-robe', () => new THREE.MeshStandardMaterial({ color: 0x4da9d6, roughness: 0.9, flatShading: true }));
        const skin = this._material('npc-skin', () => new THREE.MeshStandardMaterial({ color: 0xd7a77b, roughness: 0.9, flatShading: true }));
        const body = new THREE.Mesh(this._geometry('npc-body', () => new THREE.ConeGeometry(17, 45, 6)), robe);
        body.position.y = 23;
        const head = new THREE.Mesh(this._geometry('npc-head', () => new THREE.DodecahedronGeometry(10, 0)), skin);
        head.position.y = 53;
        group.add(body, head, this._createBlobShadow(20));
        return group;
    }

    _createBlobShadow(radius) {
        const THREE = this.three;
        const shadow = new THREE.Mesh(
            this._geometry(`shadow-${radius}`, () => new THREE.CircleGeometry(radius, 16)),
            this._material('blob-shadow', () => new THREE.MeshBasicMaterial({ color: 0x161b22, transparent: true, opacity: 0.23, depthWrite: false }))
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.4;
        return shadow;
    }

    _updateCamera(player, screenShake) {
        if (!player) return;
        const THREE = this.three;
        const angle = typeof player.viewAngle === 'number'
            ? player.viewAngle
            : (player.facingDirection === 'left' ? Math.PI : 0);
        const forwardX = Math.cos(angle);
        const forwardZ = Math.sin(angle);
        const cameraDistance = this._safeCameraDistance(player, forwardX, forwardZ, 120);
        const shakeX = screenShake && screenShake.duration > 0 ? screenShake.x * 0.7 : 0;
        const shakeY = screenShake && screenShake.duration > 0 ? screenShake.y * 0.45 : 0;
        const desired = new THREE.Vector3(
            player.x - forwardX * cameraDistance + shakeX,
            240 + shakeY,
            player.y - forwardZ * cameraDistance
        );
        const target = new THREE.Vector3(
            player.x + forwardX * 45,
            24,
            player.y + forwardZ * 45
        );
        const currentPlayerPosition = new THREE.Vector2(player.x, player.y);
        const spawnCorrection = this.lastCameraPlayerPosition
            && this.lastCameraPlayerPosition.distanceToSquared(currentPlayerPosition) > 40000;
        if (!this.cameraInitialized || spawnCorrection) {
            this.camera3D.position.copy(desired);
            this.cameraInitialized = true;
        } else {
            this.camera3D.position.lerp(desired, 0.2);
        }
        this.lastCameraPlayerPosition = currentPlayerPosition;
        this.camera3D.lookAt(target);
    }

    _drawInterface(gameState, player, monsters, camera, uiState, inventoryState, mouseX, mouseY) {
        this.drawTopBar(uiState);
        this.drawHUD(player, gameState);
        this.drawMissionTaskCard(uiState);
        this.drawOnboardingGuide(uiState, player, camera);
        this.drawInventoryHUD(inventoryState || { inventory: {}, activeBuffs: {}, inventoryOpen: false });
        this.drawVerseTestButton();
        this.drawMessages(uiState);
        this.drawFrozenIndicator(uiState.movementFrozen);
        this._drawControlsOverlay();

        if (uiState.currentVerse) {
            this.displayBibleVerse(uiState.currentVerse.text, uiState.currentVerse.reference, uiState.quiz);
        }
        this.drawFlashMessages(uiState.flashMessages);
        if (uiState.menuState && uiState.menuState.menuOpen) this.drawMenuPanel(uiState.menuState);
        if (uiState.goalsOverlayVisible) this.drawGoalsPanel(uiState);
        this.drawCategoryPicker(uiState);
        if (uiState.speedPromptVisible && !uiState.storyPause && !uiState.goalsOverlayVisible) this.drawSpeedPrompt();
        if (uiState.storyPause && uiState.storyPause.type === 'questHub') this.drawQuestHubOverlay(uiState.storyPause);
        else this.drawStoryPauseOverlay(uiState.storyPause);
    }

    _monsterPalette(type) {
        const known = {
            fear: { body: 0x3f315e, accent: 0x8057a6, eye: 0xffdf6b },
            doubt: { body: 0x31536a, accent: 0x4e8ca0, eye: 0xbff8ff },
            condemnation: { body: 0x672f35, accent: 0x9d4a3b, eye: 0xffbc66 },
            pride: { body: 0x6d5427, accent: 0xd09b39, eye: 0xffed8a },
            anger: { body: 0x762d24, accent: 0xd34b2f, eye: 0xfff0a0 },
            deception: { body: 0x245847, accent: 0x4e9d72, eye: 0xb6ffbd }
        };
        const key = type.toLowerCase();
        if (known[key]) return { key, ...known[key] };
        const hue = (this._hashString(key) % 360) / 360;
        const body = new this.three.Color().setHSL(hue, 0.34, 0.31).getHex();
        const accent = new this.three.Color().setHSL(hue, 0.48, 0.52).getHex();
        return { key, body, accent, eye: 0xffe98c };
    }

    _geometry(key, factory) {
        if (!this.geometries.has(key)) this.geometries.set(key, factory());
        return this.geometries.get(key);
    }

    _material(key, factory) {
        if (!this.materials.has(key)) this.materials.set(key, factory());
        return this.materials.get(key);
    }

    _hashString(value) {
        let hash = 2166136261;
        for (let i = 0; i < value.length; i++) {
            hash ^= value.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return Math.abs(hash >>> 0);
    }

    _publishStats() {
        const info = this.webgl.info.render;
        window.lowPoly3DStats = {
            renderer: 'three',
            revision: this.three.REVISION,
            calls: info.calls,
            triangles: info.triangles,
            points: info.points,
            lines: info.lines,
            walls: this.wallMesh ? {
                source: this.wallMesh.userData.sourceWallCount,
                merged: this.wallMesh.userData.mergedWallCount
            } : { source: 0, merged: 0 },
            entities: {
                players: this.entityMaps.players.size,
                monsters: this.entityMaps.monsters.size,
                bullets: this.entityMaps.bullets.size,
                healing: this.entityMaps.healing.size,
                collectibles: this.entityMaps.collectibles.size,
                npcs: this.entityMaps.npcs.size
            }
        };
    }

    _publishDebugState(gameState, player, monsters, healingPoints) {
        const projectedPlayer = player
            ? new this.three.Vector3(player.x, 30, player.y).project(this.camera3D)
            : null;
        this.debugState = {
            mode: 'low-poly-3d',
            coordinates: 'top-down game coordinates: +x right/east, +y down/south; rendered as +x and +z',
            player: player ? {
                x: Math.round(player.x),
                y: Math.round(player.y),
                viewAngle: Number((player.viewAngle || 0).toFixed(3)),
                health: player.health,
                ammo: player.ammo,
                moving: !!player.isMoving
            } : null,
            camera: {
                x: Math.round(this.camera3D.position.x),
                y: Math.round(this.camera3D.position.y),
                z: Math.round(this.camera3D.position.z),
                projectedPlayer: projectedPlayer ? {
                    x: Number(projectedPlayer.x.toFixed(3)),
                    y: Number(projectedPlayer.y.toFixed(3)),
                    z: Number(projectedPlayer.z.toFixed(3))
                } : null
            },
            monsters: (monsters || []).slice(0, 20).map((monster) => ({
                id: monster.id,
                type: monster.demonType || monster.monsterType,
                x: Math.round(monster.x),
                y: Math.round(monster.y),
                health: monster.health,
                boss: !!monster.isBoss
            })),
            healingPoints: (healingPoints || []).length,
            bullets: (gameState.bullets || []).length,
            monstersKilled: gameState.monstersKilled,
            monstersToKill: gameState.monstersToKill,
            performance: window.lowPoly3DStats
        };
    }
}

window.RendererThreeJS = RendererThreeJS;
