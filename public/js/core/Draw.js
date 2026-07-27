// Desenhos "programáticos": todo o visual do jogo é feito com formas do
// canvas (retângulos, elipses, curvas), sem depender de arquivos de imagem.
// Isso mantém o projeto 100% original e autocontido. Quando você tiver
// sprites/artes próprias, troque o conteúdo destas funções por
// ctx.drawImage(suaImagem, ...) mantendo a mesma assinatura de cada função.

export function drawPlayer(ctx, x, y, facing) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#f2f2f2";
  ctx.fillRect(-9, -9, 18, 18);
  ctx.fillStyle = "#20202a";
  const eyeOffsets = {
    down: [[-4, 2], [4, 2]],
    up: [[-4, -6], [4, -6]],
    left: [[-6, -1], [-2, -1]],
    right: [[2, -1], [6, -1]],
  };
  for (const [ex, ey] of eyeOffsets[facing] || eyeOffsets.down) {
    ctx.fillRect(ex - 1, ey - 1, 3, 3);
  }
  ctx.restore();
}

// NPC "Lampião": um espírito-lanterna flutuante que guia o jogador.
export function drawNPCShape(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
  glow.addColorStop(0, "rgba(255,214,120,0.85)");
  glow.addColorStop(1, "rgba(255,214,120,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-18, -18, 36, 36);
  ctx.fillStyle = "#ffcf6b";
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7a5a1e";
  ctx.fillRect(-2, -14, 4, 5);
  ctx.restore();
}

// Marcador do inimigo "Bolha" visível no mapa antes da batalha começar.
export function drawEncounterShape(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#8fd694";
  ctx.beginPath();
  ctx.ellipse(0, 3, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1c26";
  ctx.fillRect(-5, 0, 3, 3);
  ctx.fillRect(2, 0, 3, 3);
  ctx.restore();
}

// Versão grande do inimigo, usada na tela de batalha. "flash" pisca de
// branco quando o jogador é atingido (feedback visual de dano).
export function drawEnemyBig(ctx, x, y, flash) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = flash ? "#ffffff" : "#8fd694";
  ctx.beginPath();
  ctx.ellipse(0, 12, 36, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = flash ? "#ffffff" : "#16161d";
  ctx.fillRect(-17, -3, 8, 11);
  ctx.fillRect(9, -3, 8, 11);
  ctx.restore();
}

// A alma/coração (SOUL) controlada pelo jogador na fase de esquiva.
export function drawHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = size;
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s * 0.3);
  ctx.bezierCurveTo(x - s / 2, y + s * 0.65, x, y + s * 0.75, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.75, x + s / 2, y + s * 0.65, x + s / 2, y + s * 0.3);
  ctx.bezierCurveTo(x + s / 2, y, x, y, x, y + s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Quebra uma string em várias linhas para caber em maxWidth (pixels),
// usado tanto no textbox do overworld quanto no textbox da batalha.
export function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
