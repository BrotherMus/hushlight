// Short-lived visuals: footstep rings you can read through walls, and floating words.

export function addRing(world, x, y, maxRadius, color, life = 0.7) {
  world.rings.push({ x, y, maxRadius, color, life, age: 0 });
}

export function addFloatingText(world, x, y, text, color, life = 1.4) {
  world.floatingTexts.push({ x, y, text, color, life, age: 0 });
}

export function updateEffects(world, dt) {
  for (const ring of world.rings) ring.age += dt;
  for (const word of world.floatingTexts) {
    word.age += dt;
    word.y -= 18 * dt;
  }
  world.rings = world.rings.filter((ring) => ring.age < ring.life);
  world.floatingTexts = world.floatingTexts.filter((word) => word.age < word.life);
}
