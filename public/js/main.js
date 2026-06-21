import * as THREE from 'three';
import { World } from './world.js';
import { Network } from './network.js';
import { Customizer } from './customizer.js';
import { Messenger } from './messenger.js';
import { MinigameManager } from './minigames.js';
import { Effects, Minimap } from './effects.js';
import {
  createWebiie, updateWebiieAppearance, animateWebiie, createNameTag, lerpAngle,
} from './webiie.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.clock = new THREE.Clock();
    this.keys = {};
    this.remotePlayers = new Map();
    this.playerData = null;
    this.animState = 'idle';
    this.isSitting = false;
    this.isFloating = false;
    this.orbsCollected = 0;
    this.emoteTimer = 0;
    this.velocity = new THREE.Vector3();
    this.onGround = true;
    this.inWorld = false;
    this.pointerLocked = false;
    this.paused = false;

    this.cameraYaw = Math.PI;
    this.cameraPitch = 0.35;
    this.cameraDistance = 12;
    this.cameraMinDist = 5;
    this.cameraMaxDist = 22;

    this.initRenderer();
    this.initScene();
    this.customizer = new Customizer(this);
    this.messenger = new Messenger(this);
    this.network = new Network();
    this.minigames = new MinigameManager(this);
    this.minimap = new Minimap(this);
    this.setupNetwork();
    this.setupInput();
    this.setupSplash();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 80, 220);
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
    this.world = new World(this.scene);
    this.setupLighting();
    this.effects = new Effects(this.renderer, this.scene, this.camera);
  }

  setupLighting() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    this.sun = new THREE.DirectionalLight(0xfff5e0, 1.6);
    this.sun.position.set(80, 120, 60);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 400;
    this.sun.shadow.camera.left = -120;
    this.sun.shadow.camera.right = 120;
    this.sun.shadow.camera.top = 120;
    this.sun.shadow.camera.bottom = -120;
    this.scene.add(this.sun);
    this.scene.add(new THREE.HemisphereLight(0x87ceeb, 0xf5deb3, 0.45));
    const fill = new THREE.DirectionalLight(0xb3e5fc, 0.35);
    fill.position.set(-60, 40, -40);
    this.scene.add(fill);
  }

  setupSplash() {
    const bubblesContainer = document.getElementById('splash-bubbles');
    for (let i = 0; i < 30; i++) {
      const b = document.createElement('div');
      b.className = 'splash-bubble';
      const size = 10 + Math.random() * 40;
      b.style.width = `${size}px`;
      b.style.height = `${size}px`;
      b.style.left = `${Math.random() * 100}%`;
      b.style.animationDuration = `${4 + Math.random() * 6}s`;
      b.style.animationDelay = `${Math.random() * 5}s`;
      bubblesContainer.appendChild(b);
    }
    document.getElementById('enter-world-btn').addEventListener('click', () => this.enterWorld());
    document.getElementById('player-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.enterWorld();
    });
    const names = ['Blaze', 'Aqua', 'Sky', 'Bubbles', 'Coral', 'Wave', 'Zen', 'Meadow'];
    document.getElementById('player-name').placeholder = names[Math.floor(Math.random() * names.length)];
  }

  enterWorld() {
    const name = document.getElementById('player-name').value.trim() || 'Webiie';
    const status = document.getElementById('player-status').value.trim() || 'Chilling in paradise~';

    this.playerData = {
      name,
      color: this.customizer.state.color,
      opacity: this.customizer.state.opacity,
      hat: this.customizer.state.hat,
      status,
    };
    this.customizer.state.status = status;

    document.getElementById('splash-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('click-to-play').classList.remove('hidden');
    this.messenger.show();
    this.messenger.setProfile(name, this.playerData.color, status);

    this.localPlayer = createWebiie(this.playerData.color, this.playerData.opacity, this.playerData.hat);
    this.localPlayer.position.set(0, 0, 8);
    this.nameTag = createNameTag(name);
    this.localPlayer.add(this.nameTag);
    this.scene.add(this.localPlayer);

    this.inWorld = true;
    this.network.connect(this.playerData);
    this.animate();
  }

  requestPointer() {
    if (!this.inWorld || this.isTyping() || this.paused) return;
    this.canvas.requestPointerLock();
  }

  releasePointer() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  showPause() {
    if (!this.inWorld || this.isTyping()) return;
    this.paused = true;
    document.getElementById('pause-menu')?.classList.remove('hidden');
  }

  hidePause() {
    this.paused = false;
    document.getElementById('pause-menu')?.classList.add('hidden');
    this.requestPointer();
  }

  setupNetwork() {
    this.network.on('welcome', (msg) => {
      for (const p of msg.players) {
        this.addRemotePlayer(p);
        this.messenger.addFriend(p);
      }
    });
    this.network.on('player_join', (p) => {
      this.addRemotePlayer(p);
      this.messenger.addFriend(p);
      this.messenger.addWorldMessage('System', `${p.name} joined the hangout! ✦`);
    });
    this.network.on('player_leave', (msg) => {
      this.removeRemotePlayer(msg.id);
      this.messenger.removeFriend(msg.id);
    });
    this.network.on('player_update', (msg) => this.updateRemotePlayer(msg));
    this.network.on('player_customize', (msg) => {
      const remote = this.remotePlayers.get(msg.id);
      if (remote) {
        updateWebiieAppearance(remote.mesh, msg.color, msg.opacity, msg.hat);
        Object.assign(remote.data, msg);
      }
      this.messenger.updateFriend(msg.id, msg);
    });
    this.network.on('chat', (msg) => this.messenger.onChat(msg));
    this.network.on('nudge', (msg) => this.messenger.onNudge(msg));
    this.network.on('emote', (msg) => {
      const remote = this.remotePlayers.get(msg.id);
      if (remote) { remote.emote = msg.emote; remote.emoteTimer = 3; }
    });
  }

  addRemotePlayer(p) {
    if (this.remotePlayers.has(p.id)) return;
    const mesh = createWebiie(p.color, p.opacity, p.hat);
    mesh.position.set(p.x, p.y, p.z);
    mesh.rotation.y = p.rotY;
    mesh.add(createNameTag(p.name));
    this.scene.add(mesh);
    this.remotePlayers.set(p.id, { mesh, data: p, emote: null, emoteTimer: 0 });
  }

  removeRemotePlayer(id) {
    const remote = this.remotePlayers.get(id);
    if (remote) {
      this.scene.remove(remote.mesh);
      this.remotePlayers.delete(id);
    }
  }

  updateRemotePlayer(msg) {
    const remote = this.remotePlayers.get(msg.id);
    if (!remote) return;
    remote.mesh.position.lerp(new THREE.Vector3(msg.x, msg.y, msg.z), 0.25);
    remote.mesh.rotation.y = lerpAngle(remote.mesh.rotation.y, msg.rotY, 0.25);
    remote.data.anim = msg.anim;
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Escape') {
        if (this.pointerLocked) this.releasePointer();
        else if (!this.paused && this.inWorld) this.showPause();
        return;
      }
      if (this.isTyping() || this.paused) return;
      if (e.code === 'KeyC') { this.releasePointer(); this.customizer.toggle(); }
      if (e.code === 'KeyM') { this.releasePointer(); this.messenger.toggle(); }
      if (e.code === 'KeyE') this.toggleSit();
      if (e.code === 'KeyF') this.tryInteract();
      if (e.code === 'Tab') { e.preventDefault(); this.minimap.toggle(); }
      if (e.code === 'Enter') { e.preventDefault(); this.releasePointer(); document.getElementById('world-chat-input').focus(); }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    this.canvas.addEventListener('click', () => {
      if (this.inWorld && !this.paused && !this.isTyping()) this.requestPointer();
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      document.getElementById('click-to-play')?.classList.toggle('hidden', this.pointerLocked);
      if (!this.pointerLocked && this.inWorld && !this.paused && !this.isTyping()) {
        const arcadeOpen = !document.getElementById('arcade-panel')?.classList.contains('hidden');
        const customOpen = !document.getElementById('customizer-panel')?.classList.contains('hidden');
        if (!arcadeOpen && !customOpen) this.showPause();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.cameraYaw -= e.movementX * 0.002;
      this.cameraPitch = Math.max(0.1, Math.min(1.2, this.cameraPitch + e.movementY * 0.002));
});

    this.canvas.addEventListener('wheel', (e) => {
      this.cameraDistance = Math.max(this.cameraMinDist, Math.min(this.cameraMaxDist, this.cameraDistance + e.deltaY * 0.01));
    }, { passive: true });

    document.getElementById('pause-resume')?.addEventListener('click', () => this.hidePause());
    document.getElementById('pause-customize')?.addEventListener('click', () => {
      this.hidePause();
      this.customizer.show();
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.effects.resize(window.innerWidth, window.innerHeight);
    });
  }

  isTyping() {
    const active = document.activeElement;
    return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
  }

  tryInteract() {
    if (!this.localPlayer || this.minigames.active) return;
    const pos = this.localPlayer.position;
    const kiosk = this.world.getNearestKiosk(pos.x, pos.z);
    if (kiosk) this.minigames.tryStart(kiosk);
  }

  toggleSit() {
    if (this.isTyping()) return;
    this.isSitting = !this.isSitting;
    this.isFloating = false;
    this.animState = this.isSitting ? 'sit' : 'idle';
  }

  doEmote(emote) {
    if (this.isSitting) this.isSitting = false;
    this.isFloating = emote === 'float';
    this.animState = emote;
    this.emoteTimer = emote === 'float' ? 999 : 3;
    this.network.emote(emote);
  }

  applyCustomization(state) {
    Object.assign(this.playerData, state);
    updateWebiieAppearance(this.localPlayer, state.color, state.opacity, state.hat);
    this.messenger.setProfile(this.playerData.name, state.color, state.status);
    this.network.customize(state);
  }

  getCameraDirections() {
    const forward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw)).normalize();
    return { forward, right };
  }

  updateMovement(delta) {
    if (!this.localPlayer || this.isTyping() || this.paused) return;

    const speed = this.keys['ShiftLeft'] || this.keys['ShiftRight'] ? 10 : 5.5;
    const { forward, right } = this.getCameraDirections();
    const moveDir = new THREE.Vector3();
    const px = this.localPlayer.position.x;
    const pz = this.localPlayer.position.z;

    if (this.isSitting || (this.isFloating && this.emoteTimer > 0)) {
      if (this.isSitting) this.animState = 'sit';
      this.snapToGround();
      return;
    }

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.sub(forward);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.add(right);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.sub(right);

    const moving = moveDir.lengthSq() > 0;

    if (moving) {
      moveDir.normalize();
      const dx = moveDir.x * speed * delta;
      const dz = moveDir.z * speed * delta;
      const resolved = this.world.collision.moveWithCollision(px, pz, dx, dz);
      this.localPlayer.position.x = resolved.x;
      this.localPlayer.position.z = resolved.z;

      const targetRot = Math.atan2(moveDir.x, moveDir.z);
      this.localPlayer.rotation.y = lerpAngle(this.localPlayer.rotation.y, targetRot, 12 * delta);
      this.animState = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) ? 'run' : 'walk';
    } else if (this.emoteTimer <= 0 && !this.isFloating) {
      this.animState = 'idle';
    }

    if (this.keys['Space'] && this.onGround && !this.isFloating) {
      this.velocity.y = 7;
      this.onGround = false;
      this.animState = 'jump';
    }

    if (this.isFloating && this.emoteTimer > 0) {
      const ground = this.world.getGroundHeight(this.localPlayer.position.x, this.localPlayer.position.z);
      this.localPlayer.position.y = THREE.MathUtils.lerp(this.localPlayer.position.y, ground + 2, 4 * delta);
      this.velocity.y = 0;
    } else if (!this.isFloating) {
      this.velocity.y -= 22 * delta;
      this.localPlayer.position.y += this.velocity.y * delta;
    }

    this.snapToGround();
    this.checkOrbCollection();
    this.updateZoneUI();
    this.updateInteractPrompt();

    this.network.updatePosition(
      this.localPlayer.position.x, this.localPlayer.position.y, this.localPlayer.position.z,
      this.localPlayer.rotation.y, this.animState
    );
  }

  snapToGround() {
    const x = this.localPlayer.position.x;
    const z = this.localPlayer.position.z;
    const ground = this.world.getGroundHeight(x, z);
    if (this.isFloating && this.emoteTimer > 0) return;
    if (ground < -2 && this.localPlayer.position.y <= 0) {
      this.localPlayer.position.set(0, 0, 8);
      this.velocity.y = 0;
      this.messenger.addWorldMessage('System', '💫 Fell off the sky! Teleported back~');
      return;
    }
    if (this.localPlayer.position.y <= ground + 0.01) {
      this.localPlayer.position.y = ground;
      this.velocity.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }

  updateZoneUI() {
    const zone = this.world.getZoneAt(this.localPlayer.position.x, this.localPlayer.position.z);
    this.world.updateZoneAtmosphere(this.localPlayer.position.x, this.localPlayer.position.z, this.scene);
    const badge = document.getElementById('location-badge');
    if (badge) badge.textContent = `${zone.name} · ${zone.subtitle}`;
    const orbCount = document.getElementById('orb-count');
    if (orbCount) orbCount.textContent = this.orbsCollected;
  }

  updateInteractPrompt() {
    const prompt = document.getElementById('interact-prompt');
    if (!prompt) return;
    const kiosk = this.world.getNearestKiosk(this.localPlayer.position.x, this.localPlayer.position.z);
    if (kiosk && !this.minigames.active && !this.minigames.mode) {
      prompt.textContent = `[F] ${kiosk.label}`;
      prompt.classList.remove('hidden');
    } else {
      prompt.classList.add('hidden');
    }
  }

  checkOrbCollection() {
    if (this.minigames.active) return;
    const pos = this.localPlayer.position;
    for (let i = this.world.orbs.length - 1; i >= 0; i--) {
      const orb = this.world.orbs[i];
      if (orb.position.distanceTo(pos) < 1.8) {
        this.scene.remove(orb);
        this.world.orbs.splice(i, 1);
        this.orbsCollected++;
        this.messenger.addWorldMessage('System', `✦ Frutiger Orb! (${this.orbsCollected} total)`);
        const ox = orb.position.x, oz = orb.position.z;
        setTimeout(() => {
          const newOrb = orb.clone();
          newOrb.position.set(ox, this.world.getGroundHeight(ox, oz) + 1.5, oz);
          newOrb.userData = { ...orb.userData, baseY: newOrb.position.y };
          this.scene.add(newOrb);
          this.world.orbs.push(newOrb);
        }, 12000);
      }
    }
  }

  updateCamera() {
    if (!this.localPlayer) return;
    const target = this.localPlayer.position.clone();
    target.y += 1.8;
    const horizDist = this.cameraDistance * Math.cos(this.cameraPitch);
    const vertDist = this.cameraDistance * Math.sin(this.cameraPitch);
    const offset = new THREE.Vector3(
      Math.sin(this.cameraYaw) * horizDist,
      vertDist + 2,
      Math.cos(this.cameraYaw) * horizDist
    );
    this.camera.position.lerp(target.clone().add(offset), 0.08);
    this.camera.lookAt(target);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.getElapsedTime();

    this.world.update(time, delta);
    this.updateMovement(delta);
    this.updateCamera();
    this.minigames.update(delta, time);
    this.minimap.draw();

    if (this.localPlayer) {
      if (this.emoteTimer > 0) {
        this.emoteTimer -= delta;
        if (this.emoteTimer <= 0 && !this.isFloating) { this.isFloating = false; this.animState = 'idle'; }
      }
      animateWebiie(this.localPlayer, this.animState, time, delta);
    }

    for (const [, remote] of this.remotePlayers) {
      const anim = remote.emoteTimer > 0 ? remote.emote : remote.data.anim;
      animateWebiie(remote.mesh, anim, time, delta);
      if (remote.emoteTimer > 0) remote.emoteTimer -= delta;
    }

    this.customizer.updatePreview(time);
    this.effects.render();
  }
}

new Game();
