// Cada padrão é uma "fábrica": recebe a caixa de batalha (box) e devolve
// um objeto com update(state, dt), chamado a cada frame durante a fase
// DODGE do BattleSystem. state.bullets é o array compartilhado de balas.
//
// Para criar um novo padrão, copie um destes e ajuste posição/velocidade/
// intervalo de disparo. Depois registre-o em PATTERNS, em BattleSystem.js.

export function wavePattern(box) {
  let spawnTimer = 0;
  return {
    update(state, dt) {
      spawnTimer += dt;
      if (spawnTimer > 0.35) {
        spawnTimer = 0;
        state.bullets.push({
          x: box.x + Math.random() * box.w,
          y: box.y - 8,
          vx: 0,
          vy: 90 + Math.random() * 50,
          r: 5,
          color: "#ff9642",
        });
      }
      for (const b of state.bullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
    },
  };
}

export function circlePattern(box) {
  let spawnTimer = 0;
  let angle = 0;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return {
    update(state, dt) {
      spawnTimer += dt;
      if (spawnTimer > 0.55) {
        spawnTimer = 0;
        const count = 10;
        for (let i = 0; i < count; i++) {
          const a = (Math.PI * 2 / count) * i + angle;
          state.bullets.push({
            x: cx,
            y: cy,
            vx: Math.cos(a) * 55,
            vy: Math.sin(a) * 55,
            r: 4,
            color: "#4fa8ff",
          });
        }
        angle += 0.35;
      }
      for (const b of state.bullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
    },
  };
}
