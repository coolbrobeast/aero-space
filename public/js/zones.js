import * as THREE from 'three';

export const ZONES = [
  {
    id: 'aqua',
    name: 'Frutiger Aqua',
    subtitle: 'Resort Beach',
    center: new THREE.Vector2(0, 0),
    radius: 85,
    fogColor: 0x87ceeb,
    fogNear: 80,
    fogFar: 220,
    skyTop: 0x0077be,
    skyMid: 0x87ceeb,
    skyBottom: 0xe0f7fa,
  },
  {
    id: 'eco',
    name: 'Frutiger Eco',
    subtitle: 'Green Hills',
    center: new THREE.Vector2(-150, 0),
    radius: 75,
    fogColor: 0xa5d6a7,
    fogNear: 70,
    fogFar: 200,
    skyTop: 0x2e7d32,
    skyMid: 0x81c784,
    skyBottom: 0xe8f5e9,
  },
  {
    id: 'technozen',
    name: 'Technozen',
    subtitle: 'Serene Future',
    center: new THREE.Vector2(150, 0),
    radius: 75,
    fogColor: 0xe1bee7,
    fogNear: 70,
    fogFar: 200,
    skyTop: 0x6a1b9a,
    skyMid: 0xce93d8,
    skyBottom: 0xf3e5f5,
  },
  {
    id: 'sky',
    name: 'Sky Garden',
    subtitle: 'Cloud Platforms',
    center: new THREE.Vector2(0, -150),
    radius: 70,
    fogColor: 0xb3e5fc,
    fogNear: 60,
    fogFar: 180,
    skyTop: 0x0277bd,
    skyMid: 0x4fc3f7,
    skyBottom: 0xffffff,
  },
  {
    id: 'coral',
    name: 'Coral Lagoon',
    subtitle: 'Shallow Paradise',
    center: new THREE.Vector2(0, 150),
    radius: 75,
    fogColor: 0x80deea,
    fogNear: 70,
    fogFar: 200,
    skyTop: 0x00838f,
    skyMid: 0x4dd0e1,
    skyBottom: 0xe0f7fa,
  },
];

export function getZoneAt(x, z) {
  for (const zone of ZONES) {
    const dx = x - zone.center.x;
    const dz = z - zone.center.y;
    if (Math.sqrt(dx * dx + dz * dz) < zone.radius) return zone;
  }
  return ZONES[0];
}

export function getGroundHeight(x, z) {
  const zone = getZoneAt(x, z);
  if (zone.id === 'eco') {
    return Math.sin(x * 0.04 + 1) * 1.8 + Math.cos(z * 0.035) * 1.2 + Math.sin((x + z) * 0.02) * 0.8;
  }
  if (zone.id === 'sky') {
    const platforms = [
      [0, -150, 18], [-25, -140, 12], [25, -140, 12], [-15, -165, 10], [15, -165, 10],
    ];
    let maxH = -5;
    for (const [px, pz, r] of platforms) {
      const d = Math.sqrt((x - px) ** 2 + (z - pz) ** 2);
      if (d < r) maxH = Math.max(maxH, 3 + (1 - d / r) * 2);
    }
    return maxH;
  }
  if (zone.id === 'coral') {
    return Math.sin(x * 0.08) * 0.15;
  }
  return 0;
}

function glassMat(color, opacity = 0.4) {
  return new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0,
    transmission: 0.5,
    clearcoat: 1,
  });
}

function addSign(scene, x, z, text, sub) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
  );
  post.position.y = 1.5;
  g.add(post);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 512, 128);
  grd.addColorStop(0, '#4caf50');
  grd.addColorStop(0.5, '#2196f3');
  grd.addColorStop(1, '#0288d1');
  ctx.fillStyle = grd;
  ctx.roundRect(8, 8, 496, 112, 16);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 55);
  ctx.font = '22px Segoe UI';
  ctx.fillText(sub, 256, 90);

  const tex = new THREE.CanvasTexture(canvas);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  sign.position.y = 2.8;
  g.add(sign);
  scene.add(g);
}

function makePalm() {
  const palm = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.4, 5, 8),
    new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 })
  );
  trunk.position.y = 2.5;
  trunk.castShadow = true;
  palm.add(trunk);

  const leafMat = new THREE.MeshStandardMaterial({ color: 0x00c853, roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 4), leafMat);
    const angle = (i / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(angle) * 0.5, 5.2, Math.sin(angle) * 0.5);
    leaf.rotation.set(-0.6, angle, 0);
    palm.add(leaf);
  }
  palm.userData.swayOffset = Math.random() * Math.PI * 2;
  return palm;
}

function makeTree() {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.35, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0x795548 })
  );
  trunk.position.y = 1.5;
  trunk.castShadow = true;
  tree.add(trunk);

  const foliage = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.7 })
  );
  foliage.position.y = 3.8;
  foliage.castShadow = true;
  tree.add(foliage);
  tree.userData.swayOffset = Math.random() * Math.PI * 2;
  return tree;
}

function scatter(scene, factory, cx, cz, count, spread, yFn = () => 0) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const obj = factory();
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * spread;
    obj.position.set(cx + Math.cos(angle) * dist, yFn(cx + Math.cos(angle) * dist, cz + Math.sin(angle) * dist), cz + Math.sin(angle) * dist);
    obj.rotation.y = Math.random() * Math.PI * 2;
    scene.add(obj);
    items.push(obj);
  }
  return items;
}

function buildAqua(scene, data) {
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xf5deb3, roughness: 0.9 });
  const beach = new THREE.Mesh(new THREE.CircleGeometry(80, 64), sandMat);
  beach.rotation.x = -Math.PI / 2;
  beach.receiveShadow = true;
  scene.add(beach);

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200, 48, 48),
    new THREE.MeshPhysicalMaterial({ color: 0x0288d1, transparent: true, opacity: 0.85, roughness: 0.05, clearcoat: 1 })
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -0.4, -60);
  ocean.receiveShadow = true;
  ocean.userData.isWater = true;
  scene.add(ocean);
  data.waters.push(ocean);

  const poolDeck = new THREE.Mesh(
    new THREE.BoxGeometry(28, 0.3, 18),
    new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.2 })
  );
  poolDeck.position.set(-10, 0.15, 8);
  poolDeck.receiveShadow = true;
  scene.add(poolDeck);

  const pool = new THREE.Mesh(
    new THREE.BoxGeometry(24, 0.5, 14),
    glassMat(0x00bcd4, 0.65)
  );
  pool.position.set(-10, 0.05, 8);
  scene.add(pool);

  const resort = new THREE.Group();
  resort.position.set(20, 0, -8);
  const bMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 });
  const building = new THREE.Mesh(new THREE.BoxGeometry(22, 14, 12), bMat);
  building.position.y = 7;
  building.castShadow = true;
  resort.add(building);

  for (let f = 0; f < 4; f++) {
    for (let w = 0; w < 5; w++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.2, 0.1), glassMat(0x87ceeb, 0.4));
      win.position.set(-7 + w * 3.5, 2.5 + f * 3.2, 6.05);
      resort.add(win);
    }
  }
  scene.add(resort);

  scatter(scene, makePalm, 0, 0, 18, 70);
  addSign(scene, 0, 35, 'Frutiger Aqua', 'Resort Beach Hub');
  data.kiosks.push({ x: 5, z: 15, type: 'orb_rush', label: 'Orb Rush' });
  data.kiosks.push({ x: -12, z: 18, type: 'bubble_pop', label: 'Bubble Pop' });
  data.kiosks.push({ x: -5, z: -2, type: 'tag_battle', label: 'Tag Battle' });
}

function buildEco(scene, data) {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(75, 48),
    new THREE.MeshStandardMaterial({ color: 0x66bb6a, roughness: 0.85 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(-150, 0, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  scatter(scene, makeTree, -150, 0, 35, 65, getGroundHeight);
  scatter(scene, () => {
    const flower = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4), new THREE.MeshStandardMaterial({ color: 0x388e3c }));
    stem.position.y = 0.2;
    flower.add(stem);
    const colors = [0xff4081, 0xffeb3b, 0x7c4dff, 0xff5722, 0x00bcd4];
    const bloom = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)], emissive: 0x222222, emissiveIntensity: 0.2 })
    );
    bloom.position.y = 0.45;
    flower.add(bloom);
    return flower;
  }, -150, 0, 60, 60, getGroundHeight);

  for (let i = 0; i < 4; i++) {
    const turbine = new THREE.Group();
    const angle = (i / 4) * Math.PI * 2;
    turbine.position.set(-150 + Math.cos(angle) * 50, getGroundHeight(-150 + Math.cos(angle) * 50, Math.sin(angle) * 50), Math.sin(angle) * 50);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    pole.position.y = 4;
    turbine.add(pole);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    hub.position.y = 8;
    turbine.add(hub);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.5, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      blade.position.y = 8;
      blade.rotation.z = (b / 3) * Math.PI * 2;
      blade.position.y += Math.cos(blade.rotation.z) * 1.75;
      blade.position.x += Math.sin(blade.rotation.z) * 1.75;
      turbine.add(blade);
    }
    turbine.userData.turbine = true;
    scene.add(turbine);
    data.turbines = data.turbines || [];
    data.turbines.push(turbine);
  }

  const ecoBuilding = new THREE.Group();
  ecoBuilding.position.set(-150, getGroundHeight(-150, -30), -30);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    glassMat(0x81c784, 0.35)
  );
  dome.position.y = 3;
  ecoBuilding.add(dome);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 2, 16), new THREE.MeshStandardMaterial({ color: 0xe8f5e9 }));
  base.position.y = 1;
  ecoBuilding.add(base);
  scene.add(ecoBuilding);

  addSign(scene, -150, 55, 'Frutiger Eco', 'Green Hills');
  data.kiosks.push({ x: -145, z: 20, type: 'fruit_frenzy', label: 'Fruit Frenzy' });
}

function buildTechnozen(scene, data) {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(75, 48),
    new THREE.MeshStandardMaterial({ color: 0xf3e5f5, roughness: 0.4 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(150, 0, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  for (let i = 0; i < 6; i++) {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.5, 5 + Math.random() * 3, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.2 })
    );
    const angle = (i / 6) * Math.PI * 2;
    pillar.position.set(150 + Math.cos(angle) * 30, 2.5, Math.sin(angle) * 30);
    pillar.castShadow = true;
    scene.add(pillar);

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshPhysicalMaterial({ color: 0xce93d8, emissive: 0xce93d8, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 })
    );
    orb.position.copy(pillar.position);
    orb.position.y = 6 + Math.random() * 2;
    orb.userData.baseY = orb.position.y;
    orb.userData.collectible = true;
    orb.userData.phase = Math.random() * 6;
    scene.add(orb);
    data.orbs.push(orb);
  }

  const zenPool = new THREE.Mesh(
    new THREE.CircleGeometry(12, 32),
    glassMat(0xb39ddb, 0.5)
  );
  zenPool.rotation.x = -Math.PI / 2;
  zenPool.position.set(150, 0.05, 0);
  scene.add(zenPool);

  for (let i = 0; i < 8; i++) {
    const stone = new THREE.Mesh(
      new THREE.SphereGeometry(0.6 + Math.random() * 0.4, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.9 })
    );
    const angle = (i / 8) * Math.PI * 2;
    stone.position.set(150 + Math.cos(angle) * (8 + Math.random() * 4), 0.4, Math.sin(angle) * (8 + Math.random() * 4));
    stone.scale.y = 0.6;
    scene.add(stone);
  }

  const pavilion = new THREE.Group();
  pavilion.position.set(150, 0, -35);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(8, 3, 4),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
  );
  roof.position.y = 5;
  roof.rotation.y = Math.PI / 4;
  pavilion.add(roof);
  for (const [sx, sz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4, 8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    col.position.set(sx, 2, sz);
    pavilion.add(col);
  }
  scene.add(pavilion);

  addSign(scene, 150, 55, 'Technozen', 'Serene Future');
  data.kiosks.push({ x: 155, z: 15, type: 'zen_race', label: 'Zen Race' });
}

function buildSky(scene, data) {
  const platforms = [
    { x: 0, z: -150, r: 20, h: 3 },
    { x: -28, z: -138, r: 14, h: 5 },
    { x: 28, z: -138, r: 14, h: 5 },
    { x: -18, z: -168, r: 12, h: 7 },
    { x: 18, z: -168, r: 12, h: 7 },
    { x: 0, z: -175, r: 10, h: 9 },
  ];

  for (const p of platforms) {
    const plat = new THREE.Mesh(
      new THREE.CylinderGeometry(p.r, p.r * 1.05, 1.5, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.1 })
    );
    plat.position.set(p.x, p.h - 0.5, p.z);
    plat.receiveShadow = true;
    plat.castShadow = true;
    scene.add(plat);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(p.r, 0.08, 8, 32),
      glassMat(0x4fc3f7, 0.6)
    );
    rim.position.set(p.x, p.h + 0.2, p.z);
    rim.rotation.x = Math.PI / 2;
    scene.add(rim);
  }

  for (let i = 0; i < 5; i++) {
    const arch = new THREE.Group();
    arch.position.set((Math.random() - 0.5) * 40, 8 + i * 4, -150 + (Math.random() - 0.5) * 30);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2, 0.15, 8, 24),
      glassMat(0x81d4fa, 0.5)
    );
    arch.add(ring);
    arch.userData.ring = true;
    arch.userData.baseY = arch.position.y;
    scene.add(arch);
    data.rings = data.rings || [];
    data.rings.push(arch);
  }

  addSign(scene, 0, -115, 'Sky Garden', 'Cloud Platforms');
  data.kiosks.push({ x: 0, z: -135, type: 'dolphin_dash', label: 'Cloud Dash' });
}

function buildCoral(scene, data) {
  const lagoon = new THREE.Mesh(
    new THREE.CircleGeometry(75, 48),
    new THREE.MeshStandardMaterial({ color: 0x4dd0e1, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.85 })
  );
  lagoon.rotation.x = -Math.PI / 2;
  lagoon.position.set(0, -0.2, 150);
  lagoon.receiveShadow = true;
  scene.add(lagoon);
  data.waters.push(lagoon);

  const sand = new THREE.Mesh(
    new THREE.RingGeometry(20, 75, 48),
    new THREE.MeshStandardMaterial({ color: 0xfff8e1, roughness: 0.9 })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.01, 150);
  scene.add(sand);

  const coralColors = [0xff4081, 0xff7043, 0xab47bc, 0x26c6da, 0xffca28];
  for (let i = 0; i < 25; i++) {
    const coral = new THREE.Group();
    const angle = Math.random() * Math.PI * 2;
    const dist = 25 + Math.random() * 45;
    coral.position.set(Math.cos(angle) * dist, 0, 150 + Math.sin(angle) * dist);
    const cMat = new THREE.MeshStandardMaterial({ color: coralColors[i % coralColors.length], roughness: 0.5 });
    for (let b = 0; b < 3 + Math.floor(Math.random() * 4); b++) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.15, 0.8 + Math.random(), 6), cMat);
      branch.position.y = 0.4;
      branch.rotation.set(Math.random(), Math.random(), Math.random());
      coral.add(branch);
    }
    scene.add(coral);
  }

  scatter(scene, makePalm, 0, 150, 10, 55);

  const dock = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.3, 20),
    new THREE.MeshStandardMaterial({ color: 0xd7ccc8 })
  );
  dock.position.set(0, 0.15, 115);
  scene.add(dock);

  addSign(scene, 0, 210, 'Coral Lagoon', 'Shallow Paradise');
  data.kiosks.push({ x: 8, z: 145, type: 'bubble_pop', label: 'Lagoon Bubbles' });
}

function buildPaths(scene) {
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.6 });
  const paths = [
    { x: -75, z: 0, sx: 150, sz: 12 },
    { x: 75, z: 0, sx: 150, sz: 12 },
    { x: 0, z: -75, sx: 12, sz: 150 },
    { x: 0, z: 75, sx: 12, sz: 150 },
  ];
  for (const p of paths) {
    const path = new THREE.Mesh(new THREE.BoxGeometry(p.sx, 0.1, p.sz), pathMat);
    path.position.set(p.x, 0.05, p.z);
    path.receiveShadow = true;
    scene.add(path);
  }

  for (const [x, z, label] of [
    [-55, 0, '→ Eco'], [55, 0, '→ Technozen'], [0, -55, '→ Sky'], [0, 55, '→ Coral'],
  ]) {
    addSign(scene, x, z, label, 'Follow the path');
  }
}

function buildKiosks(scene, kiosks) {
  for (const k of kiosks) {
    const g = new THREE.Group();
    g.position.set(k.x, 0, k.z);
    g.userData.kiosk = k;

    const booth = new THREE.Mesh(
      new THREE.BoxGeometry(3, 2.5, 2),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
    );
    booth.position.y = 1.25;
    booth.castShadow = true;
    g.add(booth);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.15, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x00c853 })
    );
    canopy.position.y = 2.6;
    g.add(canopy);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0288d1';
    ctx.roundRect(4, 4, 248, 56, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(k.label, 128, 38);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 0.6),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true })
    );
    sign.position.set(0, 3.2, 0);
    g.add(sign);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.8 })
    );
    glow.position.y = 3.8;
    glow.userData.glow = true;
    g.add(glow);

    scene.add(g);
    k.object = g;
  }
}

function spawnOrbs(scene, data) {
  const orbMat = () => new THREE.MeshPhysicalMaterial({
    color: 0x00e5ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.85,
    roughness: 0,
    clearcoat: 1,
  });

  for (const zone of ZONES) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * zone.radius * 0.7;
      const x = zone.center.x + Math.cos(angle) * dist;
      const z = zone.center.y + Math.sin(angle) * dist;
      const y = getGroundHeight(x, z) + 1 + Math.random() * 1.5;

      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), orbMat());
      orb.position.set(x, y, z);
      orb.userData.collectible = true;
      orb.userData.baseY = y;
      orb.userData.phase = Math.random() * Math.PI * 2;
      orb.userData.zone = zone.id;
      scene.add(orb);
      data.orbs.push(orb);
    }
  }
}

export function buildWorld(scene) {
  const data = {
    orbs: [],
    waters: [],
    kiosks: [],
    turbines: [],
    rings: [],
    clouds: [],
    colliders: [],
  };

  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshStandardMaterial({ color: 0x8bc34a, roughness: 0.9 })
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = -0.5;
  base.receiveShadow = true;
  scene.add(base);

  buildPaths(scene);
  buildAqua(scene, data);
  buildEco(scene, data);
  buildTechnozen(scene, data);
  buildSky(scene, data);
  buildCoral(scene, data);
  spawnOrbs(scene, data);
  buildKiosks(scene, data.kiosks);
  buildColliders(data);

  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });
  for (let i = 0; i < 30; i++) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 4 + Math.floor(Math.random() * 3); j++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(2 + Math.random() * 3, 10, 10),
        cloudMat
      );
      puff.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 5
      );
      cloud.add(puff);
    }
    cloud.position.set((Math.random() - 0.5) * 400, 35 + Math.random() * 25, (Math.random() - 0.5) * 400);
    cloud.userData.floatSpeed = 0.1 + Math.random() * 0.2;
    cloud.userData.floatOffset = Math.random() * 10;
    scene.add(cloud);
    data.clouds.push(cloud);
  }

  return data;
}

function buildColliders(data) {
  const c = (col) => data.colliders.push(col);

  // Aqua — buildings & pool
  c({ type: 'box', x: 20, z: -8, w: 24, d: 14 });
  c({ type: 'box', x: -10, z: 8, w: 30, d: 20 });
  c({ type: 'circle', x: -20, z: -15, r: 5.5 });
  c({ type: 'wall', x: 0, z: -28, w: 160, d: 3 });

  // Eco
  c({ type: 'circle', x: -150, z: -30, r: 8 });
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    c({ type: 'circle', x: -150 + Math.cos(angle) * 50, z: Math.sin(angle) * 50, r: 1.5 });
  }

  // Technozen
  c({ type: 'box', x: 150, z: -35, w: 14, d: 14 });
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    c({ type: 'circle', x: 150 + Math.cos(angle) * 30, z: Math.sin(angle) * 30, r: 1.2 });
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    c({ type: 'circle', x: 150 + Math.cos(angle) * 10, z: Math.sin(angle) * 10, r: 0.9 });
  }

  // Coral dock
  c({ type: 'box', x: 0, z: 115, w: 6, d: 22 });

  // Kiosks
  for (const k of data.kiosks) {
    c({ type: 'box', x: k.x, z: k.z, w: 3.5, d: 2.5 });
  }

  // Trees & palms (seeded for consistency)
  let seed = 42;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  for (let i = 0; i < 35; i++) {
    const angle = rnd() * Math.PI * 2;
    const dist = rnd() * 65;
    c({ type: 'circle', x: -150 + Math.cos(angle) * dist, z: Math.sin(angle) * dist, r: 0.9 });
  }
  for (let i = 0; i < 22; i++) {
    const angle = rnd() * Math.PI * 2;
    const dist = rnd() * 68;
    c({ type: 'circle', x: Math.cos(angle) * dist, z: Math.sin(angle) * dist, r: 0.55 });
  }
  for (let i = 0; i < 12; i++) {
    const angle = rnd() * Math.PI * 2;
    const dist = 20 + rnd() * 50;
    c({ type: 'circle', x: Math.cos(angle) * dist, z: 150 + Math.sin(angle) * dist, r: 0.55 });
  }

  // Sky platform railings (keep players on platforms)
  const platforms = [
    { x: 0, z: -150, r: 19 }, { x: -28, z: -138, r: 13 }, { x: 28, z: -138, r: 13 },
    { x: -18, z: -168, r: 11 }, { x: 18, z: -168, r: 11 }, { x: 0, z: -175, r: 9 },
  ];
  for (const p of platforms) {
    c({ type: 'circle', x: p.x, z: p.z, r: p.r, platform: true });
  }
}
