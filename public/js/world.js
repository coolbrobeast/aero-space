import * as THREE from 'three';
import { ZONES, getZoneAt, getGroundHeight, buildWorld } from './zones.js';
import { CollisionWorld } from './collision.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.data = buildWorld(scene);
    this.orbs = this.data.orbs;
    this.kiosks = this.data.kiosks;
    this.waters = this.data.waters;
    this.clouds = this.data.clouds;
    this.currentZone = ZONES[0];
    this.bubbleSystems = [];
    this.collision = new CollisionWorld();
    this.collision.load(this.data.colliders);
    this.createGlobalBubbles();
    this.createSky();
  }

  createSky() {
    const skyGeo = new THREE.SphereGeometry(350, 32, 32);
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077be) },
        midColor: { value: new THREE.Color(0x87ceeb) },
        bottomColor: { value: new THREE.Color(0xe0f7fa) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor, midColor, bottomColor;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          vec3 col = h > 0.0
            ? mix(midColor, topColor, smoothstep(0.0, 0.5, h))
            : mix(midColor, bottomColor, smoothstep(0.0, -0.3, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.sky = new THREE.Mesh(skyGeo, this.skyMat);
    this.scene.add(this.sky);
  }

  createGlobalBubbles() {
    for (let b = 0; b < 3; b++) {
      const count = 120;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 400;
        positions[i * 3 + 1] = Math.random() * 40;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: b === 0 ? 0xffffff : b === 1 ? 0xb3e5fc : 0xe1bee7,
        size: 0.4 + b * 0.15,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pts = new THREE.Points(geo, mat);
      this.scene.add(pts);
      this.bubbleSystems.push(pts);
    }
  }

  getZoneAt(x, z) {
    return getZoneAt(x, z);
  }

  getGroundHeight(x, z) {
    return getGroundHeight(x, z);
  }

  updateZoneAtmosphere(x, z, scene) {
    const zone = getZoneAt(x, z);
    if (zone.id === this.currentZone.id) return;
    this.currentZone = zone;

    scene.fog = new THREE.Fog(zone.fogColor, zone.fogNear, zone.fogFar);
    this.skyMat.uniforms.topColor.value.setHex(zone.skyTop);
    this.skyMat.uniforms.midColor.value.setHex(zone.skyMid);
    this.skyMat.uniforms.bottomColor.value.setHex(zone.skyBottom);
  }

  getNearestKiosk(x, z, maxDist = 4) {
    let nearest = null;
    let minD = maxDist;
    for (const k of this.kiosks) {
      const d = Math.sqrt((x - k.x) ** 2 + (z - k.z) ** 2);
      if (d < minD) {
        minD = d;
        nearest = k;
      }
    }
    return nearest;
  }

  update(time, delta) {
    for (const water of this.waters) {
      if (water.geometry?.attributes?.position) {
        const pos = water.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const z = pos.getZ(i);
          pos.setY(i, Math.sin(x * 0.12 + time * 0.9) * 0.25 + Math.cos(z * 0.1 + time * 0.7) * 0.2);
        }
        pos.needsUpdate = true;
      }
    }

    for (const sys of this.bubbleSystems) {
      const pos = sys.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + delta * (0.25 + Math.sin(time + i * 0.1) * 0.08);
        if (y > 45) y = 0;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(time * 0.4 + i) * delta * 0.15);
      }
      pos.needsUpdate = true;
    }

    for (const orb of this.orbs) {
      if (orb.userData.baseY !== undefined) {
        orb.position.y = orb.userData.baseY + Math.sin(time * 2 + orb.userData.phase) * 0.35;
        orb.rotation.y = time * 0.8;
        orb.rotation.x = Math.sin(time + orb.userData.phase) * 0.2;
      }
    }

    for (const cloud of this.clouds) {
      cloud.position.x += Math.sin(time * cloud.userData.floatSpeed + cloud.userData.floatOffset) * delta * 0.8;
      cloud.position.z += Math.cos(time * cloud.userData.floatSpeed * 0.7) * delta * 0.3;
    }

    for (const t of this.data.turbines || []) {
      t.rotation.y = time * 0.3;
      t.children.forEach((c, i) => {
        if (i > 1) c.rotation.y = time * 2;
      });
    }

    for (const k of this.kiosks) {
      const glow = k.object?.children.find(c => c.userData?.glow);
      if (glow) {
        glow.position.y = 3.8 + Math.sin(time * 3) * 0.15;
        glow.material.opacity = 0.5 + Math.sin(time * 4) * 0.3;
      }
    }

    this.scene.traverse(obj => {
      if (obj.userData.swayOffset !== undefined) {
        obj.rotation.z = Math.sin(time * 0.8 + obj.userData.swayOffset) * 0.04;
      }
    });
  }
}

export { ZONES, getZoneAt, getGroundHeight };
