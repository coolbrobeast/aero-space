const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

const players = new Map();
const lobbies = new Map();
let nextId = 1;
let nextLobbyId = 1;
let nextObjectId = 1;

function broadcast(data, excludeId = null) {
  const msg = JSON.stringify(data);
  for (const [id, p] of players) {
    if (id !== excludeId && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(msg);
    }
  }
}

function sendTo(id, data) {
  const p = players.get(id);
  if (p?.ws.readyState === WebSocket.OPEN) {
    p.ws.send(JSON.stringify(data));
  }
}

function playerSnapshot(id, p) {
  return {
    id, name: p.name, color: p.color, opacity: p.opacity, hat: p.hat,
    status: p.status, x: p.x, y: p.y, z: p.z, rotY: p.rotY, anim: p.anim,
  };
}

function allPlayers(excludeId = null) {
  const list = [];
  for (const [id, p] of players) {
    if (id !== excludeId) list.push(playerSnapshot(id, p));
  }
  return list;
}

function lobbySnapshot(lobby) {
  return {
    id: lobby.id,
    gameType: lobby.gameType,
    label: lobby.label,
    state: lobby.state,
    timer: lobby.timer,
    scores: Object.fromEntries(lobby.scores),
    players: [...lobby.playerIds],
    objects: lobby.objects,
  };
}

function broadcastLobby(lobby) {
  const snap = lobbySnapshot(lobby);
  for (const pid of lobby.playerIds) {
    sendTo(pid, { type: 'mg_state', lobby: snap });
  }
}

function generateOrbs(count, cx, cz) {
  const objects = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random();
    const dist = 6 + Math.random() * 14;
    objects.push({
      id: nextObjectId++,
      kind: 'orb',
      x: cx + Math.cos(angle) * dist,
      z: cz + Math.sin(angle) * dist,
      taken: false,
    });
  }
  return objects;
}

function generateBubbles(count, cx, cz) {
  const objects = [];
  for (let i = 0; i < count; i++) {
    objects.push({
      id: nextObjectId++,
      kind: 'bubble',
      x: cx + (Math.random() - 0.5) * 28,
      z: cz + (Math.random() - 0.5) * 28,
      y: 1 + Math.random() * 4,
      taken: false,
    });
  }
  return objects;
}

function startLobby(lobby) {
  lobby.state = 'playing';
  lobby.timer = lobby.duration;
  lobby.scores = new Map();
  for (const pid of lobby.playerIds) lobby.scores.set(pid, 0);

  const host = players.get(lobby.hostId);
  const cx = host?.x ?? 0;
  const cz = host?.z ?? 0;

  if (lobby.gameType === 'orb_rush') {
    lobby.objects = generateOrbs(24, cx, cz);
  } else if (lobby.gameType === 'bubble_pop') {
    lobby.objects = generateBubbles(30, cx, cz);
  } else if (lobby.gameType === 'tag_battle') {
    lobby.objects = [];
  } else {
    lobby.objects = generateOrbs(20, cx, cz);
  }

  broadcastLobby(lobby);
}

function endLobby(lobby) {
  lobby.state = 'ended';
  const scores = [...lobby.scores.entries()]
    .map(([id, score]) => ({
      id,
      name: players.get(id)?.name || 'Webiie',
      score,
    }))
    .sort((a, b) => b.score - a.score);

  for (const pid of lobby.playerIds) {
    sendTo(pid, { type: 'mg_end', scores, lobbyId: lobby.id });
    const p = players.get(pid);
    if (p) p.lobbyId = null;
  }

  lobbies.delete(lobby.id);
}

function leaveLobby(playerId) {
  const p = players.get(playerId);
  if (!p?.lobbyId) return;
  const lobby = lobbies.get(p.lobbyId);
  if (!lobby) { p.lobbyId = null; return; }

  lobby.playerIds.delete(playerId);
  lobby.scores.delete(playerId);
  p.lobbyId = null;

  if (lobby.playerIds.size === 0) {
    lobbies.delete(lobby.id);
  } else {
    if (lobby.hostId === playerId) {
      lobby.hostId = [...lobby.playerIds][0];
    }
    broadcastLobby(lobby);
  }
}

wss.on('connection', (ws) => {
  const id = nextId++;
  let player = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'join':
        player = {
          ws, name: msg.name || 'Webiie', color: msg.color || '#4fc3f7',
          opacity: msg.opacity ?? 0.75, hat: msg.hat || 'none',
          status: msg.status || 'Chilling in paradise~',
          x: 0, y: 0, z: 8, rotY: 0, anim: 'idle', lobbyId: null,
        };
        players.set(id, player);
        ws.send(JSON.stringify({ type: 'welcome', id, players: allPlayers(id) }));
        broadcast({ type: 'player_join', player: playerSnapshot(id, player) }, id);
        break;

      case 'update':
        if (!player) return;
        if (typeof msg.x === 'number') player.x = msg.x;
        if (typeof msg.y === 'number') player.y = msg.y;
        if (typeof msg.z === 'number') player.z = msg.z;
        if (typeof msg.rotY === 'number') player.rotY = msg.rotY;
        if (msg.anim) player.anim = msg.anim;
        broadcast({ type: 'player_update', id, ...playerSnapshot(id, player) }, id);
        break;

      case 'customize':
        if (!player) return;
        if (msg.color) player.color = msg.color;
        if (typeof msg.opacity === 'number') player.opacity = msg.opacity;
        if (msg.hat !== undefined) player.hat = msg.hat;
        if (msg.status) player.status = msg.status;
        broadcast({ type: 'player_customize', id, color: player.color, opacity: player.opacity, hat: player.hat, status: player.status });
        break;

      case 'chat':
        if (!player) return;
        broadcast({ type: 'chat', id, name: player.name, text: msg.text, channel: msg.channel || 'world', targetId: msg.targetId, time: Date.now() });
        break;

      case 'nudge':
        if (!player) return;
        if (msg.targetId && players.has(msg.targetId)) {
          sendTo(msg.targetId, { type: 'nudge', fromId: id, fromName: player.name });
        }
        break;

      case 'emote':
        if (!player) return;
        broadcast({ type: 'emote', id, emote: msg.emote }, id);
        break;

      case 'mg_join': {
        if (!player) return;
        leaveLobby(id);
        const key = `${msg.kioskId}_${msg.gameType}`;
        let lobby = [...lobbies.values()].find(l => l.key === key && l.state === 'waiting');
        if (!lobby) {
          lobby = {
            id: nextLobbyId++,
            key,
            gameType: msg.gameType,
            label: msg.label || msg.gameType,
            kioskId: msg.kioskId,
            state: 'waiting',
            hostId: id,
            playerIds: new Set(),
            scores: new Map(),
            objects: [],
            duration: msg.gameType === 'tag_battle' ? 90 : 60,
            timer: 0,
            countdown: null,
          };
          lobbies.set(lobby.id, lobby);
        }
        lobby.playerIds.add(id);
        lobby.scores.set(id, 0);
        player.lobbyId = lobby.id;
        broadcastLobby(lobby);

        if (lobby.playerIds.size >= 2 && !lobby.countdown) {
          lobby.countdown = 8;
          broadcastLobby(lobby);
        }
        break;
      }

      case 'mg_start': {
        if (!player?.lobbyId) return;
        const lobby = lobbies.get(player.lobbyId);
        if (!lobby || lobby.hostId !== id || lobby.state !== 'waiting') return;
        startLobby(lobby);
        break;
      }

      case 'mg_leave':
        leaveLobby(id);
        sendTo(id, { type: 'mg_left' });
        break;

      case 'mg_collect': {
        if (!player?.lobbyId) return;
        const lobby = lobbies.get(player.lobbyId);
        if (!lobby || lobby.state !== 'playing') return;
        const obj = lobby.objects.find(o => o.id === msg.objectId && !o.taken);
        if (!obj) return;
        const dx = player.x - obj.x;
        const dz = player.z - obj.z;
        if (Math.sqrt(dx * dx + dz * dz) > 3) return;
        obj.taken = true;
        const pts = obj.kind === 'orb' ? 10 : 5;
        lobby.scores.set(id, (lobby.scores.get(id) || 0) + pts);
        for (const pid of lobby.playerIds) {
          sendTo(pid, { type: 'mg_event', event: 'collect', objectId: obj.id, playerId: id, points: pts, scores: Object.fromEntries(lobby.scores) });
        }
        break;
      }

      case 'mg_tag': {
        if (!player?.lobbyId) return;
        const lobby = lobbies.get(player.lobbyId);
        if (!lobby || lobby.state !== 'playing' || lobby.gameType !== 'tag_battle') return;
        if (!msg.targetId || !lobby.playerIds.has(msg.targetId)) return;
        const target = players.get(msg.targetId);
        if (!target) return;
        const dx = player.x - target.x;
        const dz = player.z - target.z;
        if (Math.sqrt(dx * dx + dz * dz) > 2.5) return;
        const now = Date.now();
        if (player.lastTag && now - player.lastTag < 1500) return;
        player.lastTag = now;
        lobby.scores.set(id, (lobby.scores.get(id) || 0) + 15);
        for (const pid of lobby.playerIds) {
          sendTo(pid, {
            type: 'mg_event', event: 'tag', fromId: id, targetId: msg.targetId,
            fromName: player.name, scores: Object.fromEntries(lobby.scores),
          });
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    leaveLobby(id);
    if (player) {
      players.delete(id);
      broadcast({ type: 'player_leave', id });
    }
  });
});

setInterval(() => {
  for (const lobby of lobbies.values()) {
    if (lobby.state === 'waiting' && lobby.countdown != null) {
      lobby.countdown -= 1;
      broadcastLobby(lobby);
      if (lobby.countdown <= 0) startLobby(lobby);
    }
    if (lobby.state === 'playing') {
      lobby.timer -= 1;
      broadcastLobby(lobby);
      if (lobby.timer <= 0) endLobby(lobby);
    }
  }
}, 1000);

const PORT = process.env.PORT || 3847;
server.listen(PORT, () => {
  console.log(`\n  ✦ Frutiger Hangout ✦`);
  console.log(`  Open http://localhost:${PORT} in your browser\n`);
});
