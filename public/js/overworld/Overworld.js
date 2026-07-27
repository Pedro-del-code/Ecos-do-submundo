import { drawPlayer, drawNPCShape, drawEncounterShape, wrapText } from "../core/Draw.js";

const TILE = 32;

// Controla o "mundo aberto": mapas em grade (# = parede, . = chão),
// movimento livre em pixels com colisão AABB, NPCs com diálogo,
// portas que trocam de sala, e áreas de encontro que iniciam batalhas.
export class Overworld {
  constructor(mapsData, dialogueBox, size) {
    this.maps = mapsData;
    this.dialogue = dialogueBox;
    this.size = size;

    this.currentRoomId = null;
    this.room = null;
    this.player = { x: 0, y: 0, w: 18, h: 18, speed: 110, facing: "down" };
    this.camera = { x: 0, y: 0 };

    this.pendingBattle = null;
    this.talking = false;
    this.justEnteredRoom = false;
  }

  loadRoom(roomId, entryPoint) {
    this.currentRoomId = roomId;
    this.room = this.maps[roomId];
    const start = entryPoint || this.room.playerStart;
    this.player.x = start.x * TILE + TILE / 2;
    this.player.y = start.y * TILE + TILE / 2;
    this._recomputeCamera();
    this.justEnteredRoom = true;
  }

  update(dt, input) {
    if (this.talking) {
      this.dialogue.update(dt, input.justPressed("confirm"));
      if (!this.dialogue.active) this.talking = false;
      return;
    }
    if (this.pendingBattle) return; // aguardando o Game.js consumir o encontro

    let dx = 0, dy = 0;
    if (input.isDown("left")) { dx -= 1; this.player.facing = "left"; }
    if (input.isDown("right")) { dx += 1; this.player.facing = "right"; }
    if (input.isDown("up")) { dy -= 1; this.player.facing = "up"; }
    if (input.isDown("down")) { dy += 1; this.player.facing = "down"; }

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      this._tryMove((dx / len) * this.player.speed * dt, (dy / len) * this.player.speed * dt);
    }

    this._recomputeCamera();
    this._checkDoors();
    this._checkEncounters();

    if (input.justPressed("confirm")) this._checkInteract();
  }

  _tryMove(dx, dy) {
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    if (!this._collides(nx, this.player.y)) this.player.x = nx;
    if (!this._collides(this.player.x, ny)) this.player.y = ny;
  }

  _collides(px, py) {
    const hw = this.player.w / 2, hh = this.player.h / 2;
    const corners = [
      [px - hw, py - hh], [px + hw, py - hh],
      [px - hw, py + hh], [px + hw, py + hh],
    ];
    for (const [cx, cy] of corners) {
      const tx = Math.floor(cx / TILE);
      const ty = Math.floor(cy / TILE);
      if (this._tileAt(tx, ty) === "#") return true;
    }
    return false;
  }

  _tileAt(tx, ty) {
    const row = this.room.layout[ty];
    if (!row) return "#";
    return row[tx] ?? "#";
  }

  _checkInteract() {
    for (const npc of this.room.npcs || []) {
      const npx = npc.x * TILE + TILE / 2;
      const npy = npc.y * TILE + TILE / 2;
      const dist = Math.hypot(this.player.x - npx, this.player.y - npy);
      if (dist < TILE * 1.2) {
        this.dialogue.show(npc.lines);
        this.talking = true;
        return;
      }
    }
  }

  _checkEncounters() {
    for (const enc of this.room.encounters || []) {
      if (enc.done) continue;
      const ex = enc.x * TILE + TILE / 2;
      const ey = enc.y * TILE + TILE / 2;
      const dist = Math.hypot(this.player.x - ex, this.player.y - ey);
      if (dist < TILE * 0.75) {
        enc.done = true;
        this.pendingBattle = enc.enemy;
      }
    }
  }

  _checkDoors() {
    const tx = Math.floor(this.player.x / TILE);
    const ty = Math.floor(this.player.y / TILE);
    for (const door of this.room.doors || []) {
      if (door.x === tx && door.y === ty) {
        this.loadRoom(door.target, { x: door.entryX, y: door.entryY });
        return;
      }
    }
  }

  _recomputeCamera() {
    const viewW = this.size.width, viewH = this.size.height;
    const mapW = this.room.width * TILE, mapH = this.room.height * TILE;

    this.camera.x = mapW <= viewW
      ? -(viewW - mapW) / 2
      : Math.max(0, Math.min(this.player.x - viewW / 2, mapW - viewW));

    this.camera.y = mapH <= viewH
      ? -(viewH - mapH) / 2
      : Math.max(0, Math.min(this.player.y - viewH / 2, mapH - viewH));
  }

  render(ctx) {
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    for (let ty = 0; ty < this.room.height; ty++) {
      for (let tx = 0; tx < this.room.width; tx++) {
        const t = this._tileAt(tx, ty);
        ctx.fillStyle = t === "#" ? "#1c1c26" : "#101018";
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        if (t !== "#") {
          ctx.strokeStyle = "rgba(255,255,255,0.03)";
          ctx.strokeRect(tx * TILE, ty * TILE, TILE, TILE);
        }
      }
    }

    for (const npc of this.room.npcs || []) {
      drawNPCShape(ctx, npc.x * TILE + TILE / 2, npc.y * TILE + TILE / 2);
    }
    for (const enc of this.room.encounters || []) {
      if (!enc.done) drawEncounterShape(ctx, enc.x * TILE + TILE / 2, enc.y * TILE + TILE / 2);
    }

    drawPlayer(ctx, this.player.x, this.player.y, this.player.facing);

    ctx.restore();

    if (this.talking) this._renderDialogue(ctx);
  }

  _renderDialogue(ctx) {
    const w = this.size.width, h = this.size.height;
    const boxH = 64;
    const boxY = h - boxH - 10;
    ctx.fillStyle = "rgba(5,5,10,0.94)";
    ctx.fillRect(20, boxY, w - 40, boxH);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, boxY, w - 40, boxH);
    ctx.fillStyle = "#fff";
    ctx.font = "13px monospace";
    ctx.textAlign = "left";
    const lines = wrapText(ctx, this.dialogue.displayed, w - 70);
    lines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, 34, boxY + 22 + i * 18);
    });
  }
}
