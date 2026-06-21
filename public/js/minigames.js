import * as THREE from 'three';

const GAME_INFO = {
  orb_rush: { desc: 'Race to collect glowing orbs!', solo: true, mp: true, icon: '✦' },
  bubble_pop: { desc: 'Pop every bubble you touch!', solo: true, mp: true, icon: '🫧' },
  fruit_frenzy: { desc: 'Catch falling tropical fruits!', solo: true, mp: false, icon: '🍊' },
  zen_race: { desc: 'Hit checkpoints in order!', solo: true, mp: false, icon: '🧘' },
  dolphin_dash: { desc: 'Fly through sky rings!', solo: true, mp: false, icon: '☁️' },
  tag_battle: { desc: 'Tag other Webiies to score! Multiplayer only.', solo: false, mp: true, icon: '⚡' },
};

export class MinigameManager {
  constructor(game) {
    this.game = game;
    this.active = null;
    this.mode = null;
    this.score = 0;
    this.timer = 0;
    this.tempObjects = [];
    this.objectMap = new Map();
    this.pendingKiosk = null;
    this.lobby = null;
    this.tagCooldown = 0;

    this.panel = document.getElementById('minigame-panel');
    this.arcadePanel = document.getElementById('arcade-panel');
    this.titleEl = document.getElementById('minigame-title');
    this.scoreEl = document.getElementById('minigame-score');
    this.timerEl = document.getElementById('minigame-timer');
    this.hintEl = document.getElementById('minigame-hint');
    this.leaderboardEl = document.getElementById('mg-leaderboard');
    this.bindEvents();
    this.setupNetwork();
  }

  bindEvents() {
    document.getElementById('minigame-quit')?.addEventListener('click', () => this.quit());
    document.getElementById('arcade-solo')?.addEventListener('click', () => this.startSolo());
    document.getElementById('arcade-multi')?.addEventListener('click', () => this.startMulti());
    document.getElementById('arcade-close')?.addEventListener('click', () => this.closeArcade());
    document.getElementById('arcade-start')?.addEventListener('click', () => this.game.network.mgStart());
  }

  setupNetwork() {
    this.game.network.on('mg_state', (lobby) => this.onLobbyState(lobby));
    this.game.network.on('mg_event', (ev) => this.onLobbyEvent(ev));
    this.game.network.on('mg_end', (msg) => this.onLobbyEnd(msg));
    this.game.network.on('mg_left', () => this.quit());
  }

  showArcade(kiosk) {
    if (this.active || this.mode === 'multi') return;
    this.pendingKiosk = kiosk;
    const info = GAME_INFO[kiosk.type] || { desc: 'Play a minigame!', solo: true, mp: true, icon: '🎮' };

    document.getElementById('arcade-title').textContent = kiosk.label;
    document.getElementById('arcade-desc').textContent = info.desc;
    document.getElementById('arcade-icon').textContent = info.icon;

    document.getElementById('arcade-solo').classList.toggle('hidden', !info.solo);
    document.getElementById('arcade-multi').classList.toggle('hidden', !info.mp);

    this.arcadePanel?.classList.remove('hidden');
    this.game.releasePointer();
  }

  closeArcade() {
    this.arcadePanel?.classList.add('hidden');
    this.pendingKiosk = null;
  }

  startSolo() {
    if (!this.pendingKiosk) return;
    const k = this.pendingKiosk;
    this.closeArcade();
    this.mode = 'solo';
    this.start(k.type, k.label);
    this.game.requestPointer();
  }

  startMulti() {
    if (!this.pendingKiosk) return;
    const k = this.pendingKiosk;
    this.closeArcade();
    this.mode = 'multi';
    this.panel?.classList.remove('hidden');
    if (this.titleEl) this.titleEl.textContent = `${k.label} — Multiplayer Lobby`;
    if (this.hintEl) this.hintEl.textContent = 'Waiting for players... (auto-starts with 2+)';
    this.game.network.mgJoin(`${k.x}_${k.z}`, k.type, k.label);
  }

  onLobbyState(lobby) {
    this.lobby = lobby;
    if (this.mode !== 'multi') return;

    if (lobby.state === 'waiting') {
      const names = lobby.players.map(id => {
        if (Number(id) === this.game.network.id) return `${this.game.playerData?.name} (you)`;
        const r = this.game.remotePlayers.get(Number(id));
        return r?.data.name || `Webiie ${id}`;
      });
      if (this.hintEl) {
        this.hintEl.textContent = lobby.countdown != null
          ? `Starting in ${lobby.countdown}s...`
          : `Players: ${names.join(', ') || 'Waiting...'}`;
      }
      const isHost = lobby.players[0] === this.game.network.id;
      document.getElementById('arcade-start')?.classList.toggle('hidden', !isHost || lobby.countdown != null);
      this.renderLeaderboard(lobby.scores);
    }

    if (lobby.state === 'playing') {
      this.active = lobby.gameType;
      this.timer = lobby.timer;
      if (this.hintEl) {
        this.hintEl.textContent = lobby.gameType === 'tag_battle'
          ? 'Run into other Webiies to tag them!'
          : 'Collect objects before time runs out!';
      }
      document.getElementById('arcade-start')?.classList.add('hidden');
      this.syncObjects(lobby.objects);
      this.renderLeaderboard(lobby.scores);
      this.game.requestPointer();
    }

    this.updateUI();
  }

  onLobbyEvent(ev) {
    if (ev.event === 'collect') {
      const obj = this.objectMap.get(ev.objectId);
      if (obj) {
        this.game.scene.remove(obj);
        this.objectMap.delete(ev.objectId);
      }
      if (ev.playerId === this.game.network.id) {
        this.game.messenger.addWorldMessage('System', `✦ +${ev.points} points!`);
      } else {
        const r = this.game.remotePlayers.get(ev.playerId);
        this.game.messenger.addWorldMessage('System', `${r?.data.name || 'Someone'} scored +${ev.points}!`);
      }
      this.renderLeaderboard(ev.scores);
    }
    if (ev.event === 'tag') {
      this.game.messenger.addWorldMessage('System', `⚡ ${ev.fromName} tagged a Webiie! +15`);
      this.renderLeaderboard(ev.scores);
    }
  }

  onLobbyEnd(msg) {
    const top = msg.scores[0];
    this.game.messenger.addWorldMessage(
      'System',
      `🏆 ${top?.name || 'Nobody'} wins with ${top?.score || 0} pts!`
    );
    this.game.orbsCollected += Math.floor((msg.scores.find(s => s.id === this.game.network.id)?.score || 0) / 5);
    this.quit();
  }

  syncObjects(objects) {
    for (const [id, obj] of this.objectMap) {
      if (!objects.find(o => o.id === id)) {
        this.game.scene.remove(obj);
        this.objectMap.delete(id);
      }
    }
    for (const o of objects) {
      if (o.taken || this.objectMap.has(o.id)) continue;
      let mesh;
      if (o.kind === 'orb') {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 16, 16),
          new THREE.MeshPhysicalMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1, transparent: true, opacity: 0.9 })
        );
        mesh.position.set(o.x, this.game.world.getGroundHeight(o.x, o.z) + 1.2, o.z);
      } else {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.7, 16, 16),
          new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, transmission: 0.8, roughness: 0 })
        );
        mesh.position.set(o.x, o.y || 2, o.z);
        mesh.userData.baseY = mesh.position.y;
        mesh.userData.phase = Math.random() * 6;
      }
      mesh.userData.minigame = o.kind;
      mesh.userData.objectId = o.id;
      mesh.userData.mp = true;
      this.game.scene.add(mesh);
      this.objectMap.set(o.id, mesh);
      this.tempObjects.push(mesh);
    }
  }

  renderLeaderboard(scores) {
    if (!this.leaderboardEl || !scores) return;
    const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    this.leaderboardEl.innerHTML = entries.map(([id, score]) => {
      const name = id == this.game.network.id
        ? this.game.playerData?.name
        : this.game.remotePlayers.get(Number(id))?.data.name || `P${id}`;
      return `<div class="mg-lb-row"><span>${name}</span><span>${score}</span></div>`;
    }).join('');
  }

  tryStart(kiosk) {
    this.showArcade(kiosk);
  }

  start(type, label) {
    this.active = type;
    this.score = 0;
    this.panel?.classList.remove('hidden');
    if (this.titleEl) this.titleEl.textContent = label;
    if (this.leaderboardEl) this.leaderboardEl.innerHTML = '';

    switch (type) {
      case 'orb_rush': this.startOrbRush(45); break;
      case 'bubble_pop': this.startBubblePop(60); break;
      case 'fruit_frenzy': this.startFruitFrenzy(50); break;
      case 'zen_race': this.startZenRace(40); break;
      case 'dolphin_dash': this.startCloudDash(45); break;
      default: this.quit();
    }
  }

  startOrbRush(duration) {
    this.timer = duration;
    this.hintEl.textContent = 'Collect glowing orbs! Walk through them.';
    const pos = this.game.localPlayer.position;
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const dist = 8 + Math.random() * 12;
      this.spawnTempOrb(pos.x + Math.cos(angle) * dist, pos.z + Math.sin(angle) * dist);
    }
    this.updateUI();
  }

  startBubblePop(duration) {
    this.timer = duration;
    this.hintEl.textContent = 'Pop bubbles by walking through them!';
    const pos = this.game.localPlayer.position;
    for (let i = 0; i < 30; i++) {
      this.spawnTempBubble(pos.x + (Math.random() - 0.5) * 30, 1 + Math.random() * 4, pos.z + (Math.random() - 0.5) * 30);
    }
    this.updateUI();
  }

  startFruitFrenzy(duration) {
    this.timer = duration;
    this.hintEl.textContent = 'Catch falling fruits!';
    this.fruitTimer = 0;
    this.updateUI();
  }

  startZenRace(duration) {
    this.timer = duration;
    this.hintEl.textContent = 'Touch all checkpoints in order!';
    this.checkpoints = [];
    this.checkpointIndex = 0;
    const pos = this.game.localPlayer.position;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.checkpoints.push(this.spawnCheckpoint(pos.x + Math.cos(angle) * (10 + i * 2), pos.z + Math.sin(angle) * (10 + i * 2), i));
    }
    this.updateUI();
  }

  startCloudDash(duration) {
    this.timer = duration;
    this.hintEl.textContent = 'Fly through the floating rings!';
    this.rings = [];
    const pos = this.game.localPlayer.position;
    for (let i = 0; i < 10; i++) {
      this.rings.push(this.spawnRing(pos.x + (Math.random() - 0.5) * 40, 2 + Math.random() * 5, pos.z + (Math.random() - 0.5) * 40, i));
    }
    this.updateUI();
  }

  spawnTempOrb(x, z) {
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshPhysicalMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1, transparent: true, opacity: 0.9 })
    );
    orb.position.set(x, this.game.world.getGroundHeight(x, z) + 1.2, z);
    orb.userData.minigame = 'orb';
    this.game.scene.add(orb);
    this.tempObjects.push(orb);
    return orb;
  }

  spawnTempBubble(x, y, z) {
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.6 + Math.random() * 0.5, 16, 16),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, transmission: 0.8, roughness: 0 })
    );
    bubble.position.set(x, y, z);
    bubble.userData.minigame = 'bubble';
    bubble.userData.baseY = y;
    bubble.userData.phase = Math.random() * 6;
    this.game.scene.add(bubble);
    this.tempObjects.push(bubble);
    return bubble;
  }

  spawnFruit(x, z) {
    const colors = [0xff5722, 0xffeb3b, 0x4caf50, 0xe91e63, 0xff9800];
    const fruit = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 12, 12),
      new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)], roughness: 0.3 })
    );
    fruit.position.set(x, 8, z);
    fruit.userData.minigame = 'fruit';
    fruit.userData.vy = -2 - Math.random();
    this.game.scene.add(fruit);
    this.tempObjects.push(fruit);
    return fruit;
  }

  spawnCheckpoint(x, z, index) {
    const cp = new THREE.Group();
    cp.position.set(x, this.game.world.getGroundHeight(x, z) + 1.5, z);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.12, 8, 24),
      new THREE.MeshBasicMaterial({ color: index === 0 ? 0x00e676 : 0x9c27b0, transparent: true, opacity: index === 0 ? 1 : 0.4 })
    );
    ring.rotation.x = Math.PI / 2;
    cp.add(ring);
    cp.userData.minigame = 'checkpoint';
    cp.userData.index = index;
    cp.userData.collected = false;
    this.game.scene.add(cp);
    this.tempObjects.push(cp);
    return cp;
  }

  spawnRing(x, y, z, index) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.15, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.8 })
    );
    ring.position.set(x, y, z);
    ring.userData.minigame = 'ring';
    ring.userData.index = index;
    ring.userData.collected = false;
    this.game.scene.add(ring);
    this.tempObjects.push(ring);
    return ring;
  }

  update(delta, time) {
    if (this.mode === 'multi' && this.lobby?.state === 'playing') {
      this.timer = this.lobby.timer;
      this.updateMulti(delta, time);
      this.updateUI();
      return;
    }

    if (!this.active || this.mode !== 'solo') return;

    this.timer -= delta;
    if (this.timer <= 0) { this.end(true); return; }

    const pos = this.game.localPlayer.position;

    if (this.active === 'fruit_frenzy') {
      this.fruitTimer -= delta;
      if (this.fruitTimer <= 0) {
        this.fruitTimer = 0.6;
        this.spawnFruit(pos.x + (Math.random() - 0.5) * 20, pos.z + (Math.random() - 0.5) * 20);
      }
    }

    for (let i = this.tempObjects.length - 1; i >= 0; i--) {
      const obj = this.tempObjects[i];
      const type = obj.userData.minigame;

      if (type === 'bubble') obj.position.y = obj.userData.baseY + Math.sin(time * 2 + obj.userData.phase) * 0.5;
      if (type === 'fruit') {
        obj.userData.vy -= 6 * delta;
        obj.position.y += obj.userData.vy * delta;
        obj.rotation.y += delta * 3;
        if (obj.position.y < this.game.world.getGroundHeight(obj.position.x, obj.position.z) - 1) {
          this.removeObject(i); continue;
        }
      }

      const dist = obj.position.distanceTo(pos);
      if (type === 'orb' && dist < 1.5) { this.score += 10; this.removeObject(i); }
      if (type === 'bubble' && dist < 1.8) { this.score += 5; this.removeObject(i); }
      if (type === 'fruit' && dist < 1.2) { this.score += 15; this.removeObject(i); }
      if (type === 'checkpoint' && !obj.userData.collected && dist < 2 && obj.userData.index === this.checkpointIndex) {
        obj.userData.collected = true;
        obj.children[0].material.color.setHex(0x00e676);
        this.checkpointIndex++;
        this.score += 25;
        if (this.checkpointIndex < this.checkpoints.length) {
          this.checkpoints[this.checkpointIndex].children[0].material.opacity = 1;
        }
      }
      if (type === 'ring' && !obj.userData.collected && dist < 2) {
        obj.userData.collected = true;
        obj.material.opacity = 0.15;
        this.score += 20;
      }
    }
    this.updateUI();
  }

  updateMulti(delta, time) {
    const pos = this.game.localPlayer.position;
    this.tagCooldown -= delta;

    for (const [, mesh] of this.objectMap) {
      if (mesh.userData.minigame === 'bubble') {
        mesh.position.y = mesh.userData.baseY + Math.sin(time * 2 + mesh.userData.phase) * 0.5;
      }
      const dist = mesh.position.distanceTo(pos);
      if (dist < 1.8 && mesh.userData.objectId) {
        this.game.network.mgCollect(mesh.userData.objectId);
      }
    }

    if (this.active === 'tag_battle' && this.tagCooldown <= 0) {
      for (const [id, remote] of this.game.remotePlayers) {
        if (pos.distanceTo(remote.mesh.position) < 2.2) {
          this.game.network.mgTag(id);
          this.tagCooldown = 1.5;
          break;
        }
      }
    }
  }

  removeObject(index) {
    this.game.scene.remove(this.tempObjects[index]);
    this.tempObjects.splice(index, 1);
  }

  cleanup() {
    for (const obj of this.tempObjects) this.game.scene.remove(obj);
    for (const [, obj] of this.objectMap) this.game.scene.remove(obj);
    this.tempObjects = [];
    this.objectMap.clear();
    this.checkpoints = [];
    this.rings = [];
  }

  quit() {
    if (this.mode === 'multi') this.game.network.mgLeave();
    this.cleanup();
    this.active = null;
    this.mode = null;
    this.lobby = null;
    this.panel?.classList.add('hidden');
    this.closeArcade();
  }

  end(completed) {
    if (!this.active) return;
    const finalScore = this.score;
    const name = this.game.playerData?.name || 'Webiie';
    if (completed) {
      this.game.messenger.addWorldMessage('System', `🎮 ${name} scored ${finalScore}! +${Math.floor(finalScore / 5)} Orbs!`);
      this.game.orbsCollected += Math.floor(finalScore / 5);
    }
    this.cleanup();
    this.active = null;
    this.mode = null;
    this.panel?.classList.add('hidden');
  }

  updateUI() {
    if (this.scoreEl) {
      const mpScore = this.lobby?.scores?.[this.game.network.id];
      this.scoreEl.textContent = this.mode === 'multi' ? (mpScore ?? 0) : this.score;
    }
    if (this.timerEl) this.timerEl.textContent = Math.ceil(Math.max(0, this.timer));
  }
}
