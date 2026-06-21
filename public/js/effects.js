import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class Effects {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.45,
      0.5,
      0.85
    );
    this.composer.addPass(bloom);
    this.bloom = bloom;
  }

  resize(w, h) {
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w, h);
  }

  render() {
    this.composer.render();
  }
}

export class Minimap {
  constructor(game) {
    this.game = game;
    this.canvas = document.getElementById('minimap-canvas');
    this.ctx = this.canvas?.getContext('2d');
    this.visible = false;
    this.mapScale = 0.35;
    this.mapOffset = { x: 0, y: 0 };
  }

  toggle() {
    this.visible = !this.visible;
    document.getElementById('minimap')?.classList.toggle('hidden', !this.visible);
  }

  draw() {
    if (!this.visible || !this.ctx || !this.game.localPlayer) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(135,206,235,0.4)');
    grad.addColorStop(1, 'rgba(0,100,180,0.2)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const zones = [
      { x: 0, z: 0, r: 18, color: '#f5deb3', label: 'Aqua' },
      { x: -150, z: 0, r: 16, color: '#66bb6a', label: 'Eco' },
      { x: 150, z: 0, r: 16, color: '#ce93d8', label: 'Zen' },
      { x: 0, z: -150, r: 14, color: '#ffffff', label: 'Sky' },
      { x: 0, z: 150, r: 16, color: '#4dd0e1', label: 'Coral' },
    ];

    for (const z of zones) {
      const mx = w / 2 + z.x * this.mapScale;
      const my = h / 2 + z.z * this.mapScale;
      ctx.beginPath();
      ctx.arc(mx, my, z.r * this.mapScale, 0, Math.PI * 2);
      ctx.fillStyle = z.color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#1a3a5c';
      ctx.font = '9px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(z.label, mx, my + 3);
    }

    const px = w / 2 + this.game.localPlayer.position.x * this.mapScale;
    const pz = h / 2 + this.game.localPlayer.position.z * this.mapScale;

    ctx.fillStyle = '#00e676';
    ctx.beginPath();
    ctx.arc(px, pz, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (const [, remote] of this.game.remotePlayers) {
      const rx = w / 2 + remote.mesh.position.x * this.mapScale;
      const rz = h / 2 + remote.mesh.position.z * this.mapScale;
      ctx.fillStyle = remote.data.color || '#4fc3f7';
      ctx.beginPath();
      ctx.arc(rx, rz, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
