import { COLORS, HATS, createWebiie, updateWebiieAppearance } from './webiie.js';
import * as THREE from 'three';

export class Customizer {
  constructor(game) {
    this.game = game;
    this.state = {
      color: '#4fc3f7',
      opacity: 0.75,
      hat: 'none',
      status: 'Chilling in paradise~',
    };
    this.previewRenderer = null;
    this.previewScene = null;
    this.previewCamera = null;
    this.previewMesh = null;
    this.init();
  }

  init() {
    this.panel = document.getElementById('customizer-panel');
    this.previewEl = document.getElementById('customizer-preview');
    this.opacitySlider = document.getElementById('opacity-slider');
    this.opacityVal = document.getElementById('opacity-val');
    this.customColor = document.getElementById('custom-color');
    this.customStatus = document.getElementById('custom-status');

    this.buildColorSwatches();
    this.buildHatOptions();
    this.setupPreview();
    this.bindEvents();
  }

  buildColorSwatches() {
    const container = document.getElementById('color-swatches');
    for (const color of COLORS) {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch' + (color === this.state.color ? ' active' : '');
      swatch.style.background = color;
      swatch.addEventListener('click', () => {
        this.state.color = color;
        this.customColor.value = color;
        this.updateActiveSwatch(color);
        this.refreshPreview();
      });
      container.appendChild(swatch);
    }
  }

  updateActiveSwatch(color) {
    document.querySelectorAll('.color-swatch').forEach(s => {
      s.classList.toggle('active', s.style.background === color || rgbToHex(s.style.background) === color.toLowerCase());
    });
  }

  buildHatOptions() {
    const container = document.getElementById('hat-options');
    for (const hat of HATS) {
      const btn = document.createElement('button');
      btn.className = 'hat-btn' + (hat.id === this.state.hat ? ' active' : '');
      btn.textContent = `${hat.emoji} ${hat.label}`;
      btn.addEventListener('click', () => {
        this.state.hat = hat.id;
        document.querySelectorAll('.hat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.refreshPreview();
      });
      container.appendChild(btn);
    }
  }

  setupPreview() {
    this.previewScene = new THREE.Scene();
    this.previewScene.background = new THREE.Color(0x87ceeb);
    this.previewCamera = new THREE.PerspectiveCamera(40, 140 / 180, 0.1, 100);
    this.previewCamera.position.set(0, 1.2, 3.5);
    this.previewCamera.lookAt(0, 0.9, 0);

    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(2, 4, 3);
    this.previewScene.add(light);
    this.previewScene.add(new THREE.AmbientLight(0xffffff, 0.5));

    this.previewMesh = createWebiie(this.state.color, this.state.opacity, this.state.hat);
    this.previewScene.add(this.previewMesh);

    this.previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.previewRenderer.setSize(140, 180);
    this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.previewEl.appendChild(this.previewRenderer.domElement);
  }

  refreshPreview() {
    updateWebiieAppearance(this.previewMesh, this.state.color, this.state.opacity, this.state.hat);
  }

  bindEvents() {
    document.getElementById('customizer-close').addEventListener('click', () => this.hide());
    document.getElementById('apply-customizer').addEventListener('click', () => this.apply());

    this.opacitySlider.addEventListener('input', () => {
      this.state.opacity = this.opacitySlider.value / 100;
      this.opacityVal.textContent = `${this.opacitySlider.value}%`;
      this.refreshPreview();
    });

    this.customColor.addEventListener('input', () => {
      this.state.color = this.customColor.value;
      this.refreshPreview();
    });

    this.customStatus.addEventListener('input', () => {
      this.state.status = this.customStatus.value;
    });
  }

  show() {
    this.customStatus.value = this.state.status;
    this.opacitySlider.value = Math.round(this.state.opacity * 100);
    this.opacityVal.textContent = `${this.opacitySlider.value}%`;
    this.customColor.value = this.state.color;
    this.panel.classList.remove('hidden');
  }

  hide() {
    this.panel.classList.add('hidden');
  }

  toggle() {
    this.panel.classList.contains('hidden') ? this.show() : this.hide();
  }

  apply() {
    this.state.status = this.customStatus.value;
    this.game.applyCustomization(this.state);
    this.hide();
  }

  setFromPlayer(data) {
    this.state.color = data.color;
    this.state.opacity = data.opacity;
    this.state.hat = data.hat;
    this.state.status = data.status;
  }

  updatePreview(time) {
    if (this.previewMesh && !this.panel.classList.contains('hidden')) {
      this.previewMesh.rotation.y = time * 0.8;
      this.previewRenderer.render(this.previewScene, this.previewCamera);
    }
  }

  getState() {
    return { ...this.state };
  }
}

function rgbToHex(rgb) {
  if (rgb.startsWith('#')) return rgb.toLowerCase();
  const match = rgb.match(/\d+/g);
  if (!match) return rgb;
  return '#' + match.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}
