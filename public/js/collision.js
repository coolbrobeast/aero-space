const PLAYER_RADIUS = 0.55;

export class CollisionWorld {
  constructor() {
    this.boxes = [];
    this.circles = [];
    this.walls = [];
    this.worldLimit = 228;
  }

  load(colliders) {
    for (const c of colliders) {
      if (c.platform) continue;
      if (c.type === 'box' || c.type === 'wall') this.boxes.push(c);
      else if (c.type === 'circle') this.circles.push(c);
    }
  }

  moveWithCollision(px, pz, dx, dz) {
    let x = px + dx;
    let z = pz;
    ({ x, z } = this.resolveMovement(px, pz, x, pz));
    const midX = x;
    z = pz + dz;
    ({ x, z } = this.resolveMovement(midX, pz, midX, z));
    return { x, z };
  }

  resolveMovement(prevX, prevZ, nextX, nextZ) {
    let x = nextX;
    let z = nextZ;

    x = this.clampAxis(x, prevX, 'x');
    z = this.clampAxis(z, prevZ, 'z');

    for (const wall of this.walls) {
      const out = this.resolveCircleAABB(x, z, PLAYER_RADIUS, wall);
      x = out.x;
      z = out.z;
    }

    for (const box of this.boxes) {
      const out = this.resolveCircleAABB(x, z, PLAYER_RADIUS, box);
      x = out.x;
      z = out.z;
    }

    for (const circle of this.circles) {
      const out = this.resolveCircleCircle(x, z, PLAYER_RADIUS, circle);
      x = out.x;
      z = out.z;
    }

    x = Math.max(-this.worldLimit, Math.min(this.worldLimit, x));
    z = Math.max(-this.worldLimit, Math.min(this.worldLimit, z));

    return { x, z };
  }

  clampAxis(val, prev, axis) {
    if (Math.abs(val) <= this.worldLimit) return val;
    return prev;
  }

  resolveCircleAABB(px, pz, radius, box) {
    const cx = box.x;
    const cz = box.z;
    const hw = box.hw ?? box.w / 2;
    const hd = box.hd ?? box.d / 2;

    const closestX = Math.max(cx - hw, Math.min(px, cx + hw));
    const closestZ = Math.max(cz - hd, Math.min(pz, cz + hd));

    const dx = px - closestX;
    const dz = pz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq >= radius * radius || distSq === 0) return { x: px, z: pz };

    const dist = Math.sqrt(distSq);
    const overlap = radius - dist;
    return {
      x: px + (dx / dist) * overlap,
      z: pz + (dz / dist) * overlap,
    };
  }

  resolveCircleCircle(px, pz, radius, circle) {
    const dx = px - circle.x;
    const dz = pz - circle.z;
    const minDist = radius + circle.r;
    const distSq = dx * dx + dz * dz;

    if (distSq >= minDist * minDist || distSq === 0) return { x: px, z: pz };

    const dist = Math.sqrt(distSq);
    const overlap = minDist - dist;
    return {
      x: px + (dx / dist) * overlap,
      z: pz + (dz / dist) * overlap,
    };
  }

  checkPlayerOverlap(x, z, otherX, otherZ, otherRadius = 0.55) {
    const dx = x - otherX;
    const dz = z - otherZ;
    return dx * dx + dz * dz < (PLAYER_RADIUS + otherRadius) ** 2;
  }
}

export { PLAYER_RADIUS };
