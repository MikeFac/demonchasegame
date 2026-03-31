const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { io } = require('socket.io-client');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3500';
const OUTPUT_DIR = path.join(process.cwd(), 'output', 'web-game', 'multiplayer-regression');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function writeJson(name, data) {
  await fs.promises.writeFile(
    path.join(OUTPUT_DIR, name),
    JSON.stringify(data, null, 2)
  );
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return response.json();
}

function onceWithTimeout(socket, eventName, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(eventName, onEvent);
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);

    const onEvent = (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    };

    socket.once(eventName, onEvent);
  });
}

function emitAck(socket, eventName, payload, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ack: ${eventName}`)), timeoutMs);
    socket.emit(eventName, payload, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

async function setupRoom() {
  const stamp = Date.now();
  const hostUser = await postJson(`${BASE_URL}/api/register`, { username: `Host${stamp}` });
  const guestUser = await postJson(`${BASE_URL}/api/register`, { username: `Guest${stamp}` });

  if (!hostUser.success || !guestUser.success) {
    throw new Error(`Registration failed: ${JSON.stringify({ hostUser, guestUser })}`);
  }

  const hostSocket = io(BASE_URL, { transports: ['websocket'] });
  const guestSocket = io(BASE_URL, { transports: ['websocket'] });

  await Promise.all([
    onceWithTimeout(hostSocket, 'connect'),
    onceWithTimeout(guestSocket, 'connect')
  ]);

  const hostAuth = await emitAck(hostSocket, 'authenticate', hostUser.user.sessionToken);
  const guestAuth = await emitAck(guestSocket, 'authenticate', guestUser.user.sessionToken);
  if (!hostAuth.success || !guestAuth.success) {
    throw new Error(`Auth failed: ${JSON.stringify({ hostAuth, guestAuth })}`);
  }

  const createRoom = await emitAck(hostSocket, 'createRoom', {
    name: 'Regression Room',
    maxPlayers: 2,
    preset: 'normal',
    mapStyle: 'classic'
  });
  if (!createRoom.success) {
    throw new Error(`createRoom failed: ${JSON.stringify(createRoom)}`);
  }

  const roomId = createRoom.room.id;
  const joinRoom = await emitAck(guestSocket, 'joinRoom', roomId);
  if (!joinRoom.success) {
    throw new Error(`joinRoom failed: ${JSON.stringify(joinRoom)}`);
  }

  const readyGuest = await emitAck(guestSocket, 'setReady', { roomId, ready: true });
  if (!readyGuest.success) {
    throw new Error(`setReady failed: ${JSON.stringify(readyGuest)}`);
  }

  const startAckPromise = emitAck(hostSocket, 'startGame', roomId);
  const startedPayloadPromise = onceWithTimeout(hostSocket, 'gameStarted');
  const [startGame, gameStarted] = await Promise.all([startAckPromise, startedPayloadPromise]);
  if (!startGame.success) {
    throw new Error(`startGame failed: ${JSON.stringify(startGame)}`);
  }

  hostSocket.disconnect();
  guestSocket.disconnect();

  return {
    roomId,
    hostUsername: hostUser.user.username,
    guestUsername: guestUser.user.username,
    gameStarted
  };
}

async function waitForGameReady(page, label) {
  await page.waitForFunction(() => {
    return typeof playerCode !== 'undefined' &&
      !!playerCode &&
      typeof gameState !== 'undefined' &&
      !!gameState &&
      !!gameState.players &&
      Object.keys(gameState.players).length >= 1;
  }, { timeout: 15000 });

  const state = await page.evaluate(() => {
    const players = (typeof gameState !== 'undefined' && gameState && gameState.players) ? gameState.players : {};
    return {
      label: null,
      playerCode: typeof playerCode !== 'undefined' ? playerCode : null,
      gameMode: window.gameMode,
      connectedPlayers: (typeof gameState !== 'undefined' && gameState) ? gameState.connectedPlayers : null,
      playerCount: Object.keys(players).length,
      players: Object.fromEntries(
        Object.entries(players).map(([code, player]) => [code, {
          x: player.x,
          y: player.y,
          health: player.health,
          state: player.state || null,
          username: player.username || null
        }])
      )
    };
  });
  state.label = label;
  return state;
}

async function waitForRemoteMovement(page, remoteCode, baselineX, baselineY) {
  await page.waitForFunction(
    ({ remoteCode, baselineX, baselineY }) => {
      const players = (typeof gameState !== 'undefined' && gameState && gameState.players) ? gameState.players : {};
      const remote = players[remoteCode];
      if (!remote) return false;
      return Math.abs(remote.x - baselineX) > 20 || Math.abs(remote.y - baselineY) > 20;
    },
    { remoteCode, baselineX, baselineY },
    { timeout: 8000 }
  );
}

async function main() {
  await ensureDir(OUTPUT_DIR);

  const room = await setupRoom();
  await writeJson('room.json', room);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  const logs = { pageA: [], pageB: [], errors: [] };
  for (const [page, label] of [[pageA, 'pageA'], [pageB, 'pageB']]) {
    page.on('console', (msg) => logs[label].push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => logs.errors.push({ page: label, message: err.message, stack: err.stack }));
  }

  await Promise.all([
    pageA.goto(`${BASE_URL}/?room=${room.roomId}`, { waitUntil: 'networkidle' }),
    pageB.goto(`${BASE_URL}/?room=${room.roomId}`, { waitUntil: 'networkidle' })
  ]);

  await pageA.waitForTimeout(2000);
  await pageB.waitForTimeout(2000);

  const initialA = await waitForGameReady(pageA, 'pageA');
  const initialB = await waitForGameReady(pageB, 'pageB');
  await writeJson('initial-state.json', { initialA, initialB });

  await pageA.waitForFunction(() => typeof gameState !== 'undefined' && Object.keys((gameState && gameState.players) || {}).length >= 2, { timeout: 15000 });
  await pageB.waitForFunction(() => typeof gameState !== 'undefined' && Object.keys((gameState && gameState.players) || {}).length >= 2, { timeout: 15000 });

  const preMove = await Promise.all([
    pageA.evaluate(() => {
      const players = (typeof gameState !== 'undefined' && gameState && gameState.players) ? gameState.players : {};
      return {
        localCode: typeof playerCode !== 'undefined' ? playerCode : null,
        players: Object.fromEntries(Object.entries(players).map(([code, p]) => [code, { x: p.x, y: p.y, health: p.health, state: p.state || null }]))
      };
    }),
    pageB.evaluate(() => {
      const players = (typeof gameState !== 'undefined' && gameState && gameState.players) ? gameState.players : {};
      return {
        localCode: typeof playerCode !== 'undefined' ? playerCode : null,
        players: Object.fromEntries(Object.entries(players).map(([code, p]) => [code, { x: p.x, y: p.y, health: p.health, state: p.state || null }]))
      };
    })
  ]);
  await writeJson('pre-move-state.json', { pageA: preMove[0], pageB: preMove[1] });

  const pageALocalCode = preMove[0].localCode;
  const pageBRemoteViewOfA = preMove[1].players[pageALocalCode];
  if (!pageBRemoteViewOfA) {
    throw new Error(`pageB does not see pageA player ${pageALocalCode}`);
  }

  await pageA.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const localCode = typeof playerCode !== 'undefined' ? playerCode : null;
    const localPlayer = localCode && gameState && gameState.players ? gameState.players[localCode] : null;
    if (!localPlayer || !network || typeof network.sendPosition !== 'function') {
      throw new Error('Missing local player or network.sendPosition');
    }
    const targetX = localPlayer.x + 240;
    const targetY = localPlayer.y;
    for (let i = 0; i < 5; i += 1) {
      network.sendPosition(targetX, targetY);
      await sleep(120);
    }
  });
  await pageA.waitForTimeout(800);

  await waitForRemoteMovement(pageB, pageALocalCode, pageBRemoteViewOfA.x, pageBRemoteViewOfA.y);

  const postMove = await Promise.all([
    pageA.evaluate(() => {
      const players = (typeof gameState !== 'undefined' && gameState && gameState.players) ? gameState.players : {};
      return {
        localCode: typeof playerCode !== 'undefined' ? playerCode : null,
        players: Object.fromEntries(Object.entries(players).map(([code, p]) => [code, { x: p.x, y: p.y, health: p.health, state: p.state || null }]))
      };
    }),
    pageB.evaluate(() => {
      const players = (typeof gameState !== 'undefined' && gameState && gameState.players) ? gameState.players : {};
      return {
        localCode: typeof playerCode !== 'undefined' ? playerCode : null,
        players: Object.fromEntries(Object.entries(players).map(([code, p]) => [code, { x: p.x, y: p.y, health: p.health, state: p.state || null }]))
      };
    })
  ]);
  await writeJson('post-move-state.json', { pageA: postMove[0], pageB: postMove[1] });

  const pageBLocalCode = preMove[1].localCode;
  await pageB.close();
  await pageA.waitForFunction(() => {
    const players = (typeof gameState !== 'undefined' && gameState && gameState.players) ? gameState.players : {};
    const remoteCodes = Object.keys(players).filter((code) => code !== playerCode);
    return remoteCodes.some((code) => players[code] && players[code].state === 'disconnected');
  }, { timeout: 15000 });

  const disconnectState = await pageA.evaluate((expectedRemoteCode) => {
    const players = (typeof gameState !== 'undefined' && gameState && gameState.players) ? gameState.players : {};
    return {
      connectedPlayers: (typeof gameState !== 'undefined' && gameState) ? gameState.connectedPlayers : null,
      playerCount: Object.keys(players).length,
      expectedRemoteCode,
      remotePlayerState: players[expectedRemoteCode] ? players[expectedRemoteCode].state || null : null,
      players: Object.fromEntries(Object.entries(players).map(([code, p]) => [code, { x: p.x, y: p.y, health: p.health, state: p.state || null }]))
    };
  }, pageBLocalCode);
  await writeJson('disconnect-state.json', disconnectState);

  await pageA.screenshot({ path: path.join(OUTPUT_DIR, 'pageA-final.png') });
  await writeJson('logs.json', logs);

  await browser.close();
}

main().catch(async (error) => {
  try {
    await ensureDir(OUTPUT_DIR);
    await writeJson('fatal-error.json', { message: error.message, stack: error.stack });
  } catch (_) {
    // ignore secondary failure
  }
  console.error(error);
  process.exit(1);
});
