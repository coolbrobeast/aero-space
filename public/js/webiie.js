import * as THREE from 'three';

export const COLORS = [
  '#4fc3f7', '#29b6f6', '#00bcd4', '#00e676', '#76ff03',
  '#ffeb3b', '#ff9800', '#ff5722', '#e91e63', '#9c27b0',
  '#673ab7', '#ffffff', '#ff4081', '#18ffff',
];

export const HATS = [
  { id: 'none', label: 'None', emoji: '✦' },
  { id: 'cap', label: 'Cap', emoji: '🧢' },
  { id: 'flower', label: 'Flower', emoji: '🌸' },
  { id: 'star', label: 'Star', emoji: '⭐' },
  { id: 'crown', label: 'Crown', emoji: '👑' },
  { id: 'shell', label: 'Shell', emoji: '🐚' },
  { id: 'bubble', label: 'Bubble', emoji: '🫧' },
  { id: 'visor', label: 'Visor', emoji: '🕶️' },
  { id: 'halo', label: 'Halo', emoji: '😇' },
];

function makeGlassMat(color, opacity = 0.78) {
  const c = new THREE.Color(color);
  return new THREE.MeshPhysicalMaterial({
    color: c,
    transparent: true,
    opacity,
    roughness: 0.02,
    metalness: 0.05,
    transmission: 0.55,
    thickness: 0.8,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    emissive: c,
    emissiveIntensity: 0.12,
    ior: 1.45,
  });
}

function makeLimb(name, mat, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(w, h, 8, 16), mat);
  mesh.castShadow = true;
  mesh.name = name;
  return mesh;
}

export function createWebiie(color = '#4fc3f7', opacity = 0.75, hat = 'none') {
  const root = new THREE.Group();
  const bodyMat = makeGlassMat(color, opacity);
  const innerMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.25,
  });

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  const rig = new THREE.Group();
  rig.name = 'rig';
  root.add(rig);

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38, 0.55, 12, 24),
    bodyMat
  );
  torso.position.y = 0.85;
  torso.castShadow = true;
  rig.add(torso);

  const innerCore = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), innerMat);
  innerCore.position.y = 0.9;
  rig.add(innerCore);

  const head = new THREE.Group();
  head.name = 'head';
  head.position.y = 1.55;
  rig.add(head);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 24), bodyMat.clone());
  headMesh.castShadow = true;
  head.add(headMesh);

  const cheekL = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
  );
  cheekL.position.set(-0.2, -0.05, 0.22);
  head.add(cheekL);

  const cheekR = cheekL.clone();
  cheekR.position.x = 0.2;
  head.add(cheekR);

  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const leftEye = new THREE.Group();
  leftEye.name = 'leftEye';
  leftEye.position.set(-0.12, 0.06, 0.26);
  const leftWhite = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), eyeWhiteMat);
  leftWhite.scale.z = 0.45;
  leftEye.add(leftWhite);
  const leftPupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x1a3a5c })
  );
  leftPupil.position.z = 0.04;
  leftEye.add(leftPupil);
  head.add(leftEye);

  const rightEye = leftEye.clone();
  rightEye.name = 'rightEye';
  rightEye.position.x = 0.12;
  head.add(rightEye);

  const leftArm = new THREE.Group();
  leftArm.name = 'leftArm';
  leftArm.position.set(-0.42, 1.05, 0);
  const leftArmMesh = makeLimb('leftArmMesh', bodyMat.clone(), 0.1, 0.35, 0.1);
  leftArmMesh.position.y = -0.28;
  leftArm.add(leftArmMesh);
  rig.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.name = 'rightArm';
  rightArm.position.set(0.42, 1.05, 0);
  const rightArmMesh = makeLimb('rightArmMesh', bodyMat.clone(), 0.1, 0.35, 0.1);
  rightArmMesh.position.y = -0.28;
  rightArm.add(rightArmMesh);
  rig.add(rightArm);

  const leftLeg = new THREE.Group();
  leftLeg.name = 'leftLeg';
  leftLeg.position.set(-0.18, 0.55, 0);
  const leftLegMesh = makeLimb('leftLegMesh', bodyMat.clone(), 0.12, 0.3, 0.12);
  leftLegMesh.position.y = -0.32;
  leftLeg.add(leftLegMesh);
  const leftFoot = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 12),
    bodyMat.clone()
  );
  leftFoot.position.set(0, -0.55, 0.06);
  leftFoot.scale.set(1, 0.6, 1.3);
  leftLeg.add(leftFoot);
  rig.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.name = 'rightLeg';
  rightLeg.position.set(0.18, 0.55, 0);
  const rightLegMesh = makeLimb('rightLegMesh', bodyMat.clone(), 0.12, 0.3, 0.12);
  rightLegMesh.position.y = -0.32;
  rightLeg.add(rightLegMesh);
  const rightFoot = leftFoot.clone();
  rightFoot.position.set(0, -0.55, 0.06);
  rightLeg.add(rightFoot);
  rig.add(rightLeg);

  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 16, 16),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  aura.position.y = 0.9;
  aura.name = 'aura';
  root.add(aura);

  addHat(root, hat, color);

  root.userData = {
    bodyMat,
    rig,
    torso,
    head,
    headMesh,
    leftEye,
    rightEye,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    shadow,
    aura,
    innerCore,
    animPhase: Math.random() * 10,
    blinkTimer: 2 + Math.random() * 3,
    baseY: { torso: 0.85, head: 1.55 },
  };

  return root;
}

function addHat(group, hat, color) {
  const existing = group.getObjectByName('hat');
  if (existing) group.remove(existing);
  if (hat === 'none') return;

  const hatGroup = new THREE.Group();
  hatGroup.name = 'hat';
  hatGroup.position.y = 1.55;

  switch (hat) {
    case 'cap': {
      const mat = new THREE.MeshPhysicalMaterial({ color: 0xff5722, roughness: 0.2, clearcoat: 1 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 24), mat);
      brim.position.y = 0.35;
      hatGroup.add(brim);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        mat
      );
      dome.position.y = 0.35;
      hatGroup.add(dome);
      break;
    }
    case 'flower': {
      const petalMat = new THREE.MeshPhysicalMaterial({ color: 0xff80ab, clearcoat: 1, roughness: 0.1 });
      for (let i = 0; i < 6; i++) {
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), petalMat);
        const a = (i / 6) * Math.PI * 2;
        petal.position.set(Math.cos(a) * 0.14, 0.42, Math.sin(a) * 0.14);
        hatGroup.add(petal);
      }
      const center = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffeb3b })
      );
      center.position.y = 0.42;
      hatGroup.add(center);
      break;
    }
    case 'star': {
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14, 0),
        new THREE.MeshPhysicalMaterial({ color: 0xffeb3b, emissive: 0xffeb3b, emissiveIntensity: 0.6 })
      );
      star.position.y = 0.48;
      hatGroup.add(star);
      break;
    }
    case 'crown': {
      const cm = new THREE.MeshPhysicalMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.15 });
      for (let i = 0; i < 5; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), cm);
        spike.position.set((i - 2) * 0.11, 0.42, 0);
        hatGroup.add(spike);
      }
      break;
    }
    case 'shell': {
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshPhysicalMaterial({ color: 0xffab91, clearcoat: 0.8 })
      );
      shell.position.set(0.15, 0.3, 0);
      hatGroup.add(shell);
      break;
    }
    case 'bubble': {
      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 16),
        makeGlassMat(color, 0.45)
      );
      bubble.position.y = 0.48;
      hatGroup.add(bubble);
      break;
    }
    case 'visor': {
      const visor = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.04, 8, 24, Math.PI),
        new THREE.MeshPhysicalMaterial({ color: 0x18ffff, transmission: 0.7, transparent: true, opacity: 0.8 })
      );
      visor.position.set(0, 0.08, 0.18);
      visor.rotation.x = 0.3;
      hatGroup.add(visor);
      break;
    }
    case 'halo': {
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.025, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0xffeb3b, transparent: true, opacity: 0.9 })
      );
      halo.position.y = 0.52;
      halo.rotation.x = Math.PI / 2;
      hatGroup.add(halo);
      break;
    }
  }

  group.add(hatGroup);
}

export function updateWebiieAppearance(group, color, opacity, hat) {
  const ud = group.userData;
  const c = new THREE.Color(color);
  ud.bodyMat.color.copy(c);
  ud.bodyMat.emissive.copy(c);
  ud.bodyMat.opacity = opacity;
  ud.aura.material.color.copy(c);
  ud.innerCore.material.color.copy(c);

  group.traverse(child => {
    if (child.isMesh && child.material?.emissive && child !== ud.aura && child !== ud.innerCore) {
      if (child.material.transmission !== undefined) {
        child.material.color.copy(c);
        child.material.emissive?.copy(c);
        child.material.opacity = opacity;
      }
    }
  });

  addHat(group, hat, color);
}

function resetPose(ud) {
  const { rig, torso, head, leftArm, rightArm, leftLeg, rightLeg, baseY } = ud;
  rig.position.y = 0;
  rig.rotation.set(0, 0, 0);
  torso.position.y = baseY.torso;
  torso.rotation.set(0, 0, 0);
  torso.scale.set(1, 1, 1);
  head.position.y = baseY.head;
  head.rotation.set(0, 0, 0);
  leftArm.rotation.set(0, 0, 0);
  rightArm.rotation.set(0, 0, 0);
  leftLeg.rotation.set(0, 0, 0);
  rightLeg.rotation.set(0, 0, 0);
  leftArm.position.set(-0.42, 1.05, 0);
  rightArm.position.set(0.42, 1.05, 0);
}

export function animateWebiie(group, anim, time, delta = 0.016) {
  const ud = group.userData;
  if (!ud.rig) return;

  resetPose(ud);
  ud.animPhase += delta;

  const t = time + ud.animPhase;
  const { rig, torso, head, leftArm, rightArm, leftLeg, rightLeg, leftEye, rightEye, shadow, aura, innerCore } = ud;

  ud.blinkTimer -= delta;
  const blink = ud.blinkTimer < 0;
  if (blink) {
    leftEye.scale.y = 0.1;
    rightEye.scale.y = 0.1;
    if (ud.blinkTimer < -0.12) {
      ud.blinkTimer = 2.5 + Math.random() * 4;
      leftEye.scale.y = 1;
      rightEye.scale.y = 1;
    }
  }

  shadow.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
  aura.scale.setScalar(1 + Math.sin(t * 1.5) * 0.08);
  innerCore.rotation.y = t * 0.5;

  switch (anim) {
    case 'walk': {
      const s = 9;
      const swing = Math.sin(t * s);
      leftLeg.rotation.x = swing * 0.65;
      rightLeg.rotation.x = -swing * 0.65;
      leftArm.rotation.x = -swing * 0.45;
      rightArm.rotation.x = swing * 0.45;
      rig.position.y = Math.abs(Math.sin(t * s)) * 0.07;
      torso.rotation.z = swing * 0.04;
      break;
    }
    case 'run': {
      const s = 14;
      const swing = Math.sin(t * s);
      leftLeg.rotation.x = swing * 0.9;
      rightLeg.rotation.x = -swing * 0.9;
      leftArm.rotation.x = -swing * 0.7;
      rightArm.rotation.x = swing * 0.7;
      rig.position.y = Math.abs(Math.sin(t * s)) * 0.12;
      torso.rotation.x = 0.15;
      torso.rotation.z = swing * 0.06;
      break;
    }
    case 'jump': {
      leftLeg.rotation.x = -0.5;
      rightLeg.rotation.x = -0.4;
      leftArm.rotation.x = -1.2;
      rightArm.rotation.x = -1.2;
      rig.position.y = 0.3;
      break;
    }
    case 'sit': {
      rig.position.y = -0.35;
      leftLeg.rotation.x = -1.4;
      rightLeg.rotation.x = -1.4;
      leftArm.rotation.x = 0.3;
      rightArm.rotation.x = 0.3;
      torso.rotation.x = 0.15;
      break;
    }
    case 'float': {
      const hover = Math.sin(t * 2) * 0.35 + 1.5;
      rig.position.y = hover;
      leftArm.rotation.z = -0.8;
      rightArm.rotation.z = 0.8;
      leftArm.rotation.x = -0.3;
      rightArm.rotation.x = -0.3;
      rig.rotation.y = Math.sin(t * 0.6) * 0.15;
      leftLeg.rotation.x = 0.3;
      rightLeg.rotation.x = -0.2;
      break;
    }
    case 'dance': {
      const s = 8;
      rig.position.y = Math.abs(Math.sin(t * s)) * 0.2;
      torso.rotation.y = Math.sin(t * 4) * 0.3;
      torso.rotation.z = Math.sin(t * s) * 0.12;
      leftArm.rotation.z = -1.2 + Math.sin(t * s) * 0.5;
      rightArm.rotation.z = 1.2 - Math.sin(t * s) * 0.5;
      leftLeg.rotation.x = Math.sin(t * s) * 0.4;
      rightLeg.rotation.x = -Math.sin(t * s) * 0.4;
      head.rotation.z = Math.sin(t * s + 1) * 0.15;
      break;
    }
    case 'wave': {
      rightArm.rotation.x = -2.2 + Math.sin(t * 6) * 0.4;
      rightArm.rotation.z = 0.3;
      leftArm.rotation.x = 0.2;
      torso.rotation.z = 0.05;
      head.rotation.z = -0.1;
      break;
    }
    default: {
      rig.position.y = Math.sin(t * 2) * 0.025;
      leftArm.rotation.x = Math.sin(t * 1.5) * 0.05;
      rightArm.rotation.x = -Math.sin(t * 1.5) * 0.05;
      head.rotation.y = Math.sin(t * 0.8) * 0.08;
    }
  }
}

export function createNameTag(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.92)');
  grad.addColorStop(1, 'rgba(200,240,255,0.92)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(16, 12, 480, 56, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(100,180,255,0.6)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#1a3a5c';
  ctx.font = 'bold 28px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, 256, 50);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(2.4, 0.38, 1);
  sprite.position.y = 2.35;
  return sprite;
}

export function lerpAngle(current, target, t) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * Math.min(t, 1);
}
