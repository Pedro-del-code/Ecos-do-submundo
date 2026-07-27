import { DialogueBox } from "../dialogue/DialogueBox.js";
import { drawHeart, drawEnemyBig, wrapText } from "../core/Draw.js";
import { wavePattern, circlePattern } from "./BulletPatterns.js";

// Área onde a alma (SOUL) se move esquivando de projéteis.
const BOX = { x: 90, y: 108, w: 300, h: 88 };
const MENU_LABELS = ["LUTAR", "AGIR", "ITEM", "PIEDADE"];
const PATTERNS = { wave: wavePattern, circle: circlePattern };

// Máquina de estados de uma batalha:
// ENTER -> MENU -> (FIGHT_BAR | ACT_MENU | ITEM_MENU | MERCY_MENU)
//       -> MESSAGE -> DODGE -> MENU (repete) ou END (vitória/fuga/derrota)
export class BattleSystem {
  constructor(enemyDef, player, size) {
    this.enemyDef = enemyDef;
    this.enemy = { hp: enemyDef.maxHp, maxHp: enemyDef.maxHp, talkedTo: false };
    this.player = player; // referência direta: mudanças de HP/itens refletem no jogo
    this.size = size;

    this.text = new DialogueBox(36);
    this.phase = "ENTER";
    this.menuIndex = 0;
    this.subIndex = 0;

    this.soul = { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h * 0.75, r: 6, invuln: 0 };
    this.bullets = [];
    this.pattern = null;
    this.dodgeTimer = 0;
    this.dodgeDuration = 6.5;

    this.fightBar = { pos: 0, dir: 1, speed: 1.6 };

    this.finished = false;
    this.result = null; // "victory" | "fled" | "gameover"
    this._nextAfterMessage = null;

    this.text.show([`${enemyDef.name.toUpperCase()} apareceu!`], () => {
      this.phase = "MENU";
    });
  }

  update(dt, input) {
    switch (this.phase) {
      case "ENTER":
        this.text.update(dt, input.justPressed("confirm"));
        break;
      case "MENU":
        this._updateMenu(input);
        break;
      case "ACT_MENU":
        this._updateActMenu(input);
        break;
      case "ITEM_MENU":
        this._updateItemMenu(input);
        break;
      case "MERCY_MENU":
        this._updateMercyMenu(input);
        break;
      case "FIGHT_BAR":
        this._updateFightBar(dt, input);
        break;
      case "MESSAGE":
        this.text.update(dt, input.justPressed("confirm"));
        if (!this.text.active) this._afterMessage();
        break;
      case "DODGE":
        this._updateDodge(dt, input);
        break;
      case "END":
        this.text.update(dt, input.justPressed("confirm"));
        if (!this.text.active && input.justPressed("confirm")) this.finished = true;
        break;
    }
  }

  _updateMenu(input) {
    if (input.justPressed("left")) this.menuIndex = (this.menuIndex + 3) % 4;
    if (input.justPressed("right")) this.menuIndex = (this.menuIndex + 1) % 4;
    if (input.justPressed("confirm")) {
      const choice = MENU_LABELS[this.menuIndex];
      if (choice === "LUTAR") {
        this.phase = "FIGHT_BAR";
        this.fightBar.pos = 0;
        this.fightBar.dir = 1;
      } else if (choice === "AGIR") {
        this.phase = "ACT_MENU";
        this.subIndex = 0;
      } else if (choice === "ITEM") {
        this.phase = "ITEM_MENU";
        this.subIndex = 0;
      } else if (choice === "PIEDADE") {
        this.phase = "MERCY_MENU";
        this.subIndex = 0;
      }
    }
  }

  _updateActMenu(input) {
    const acts = this.enemyDef.acts;
    if (input.justPressed("up")) this.subIndex = (this.subIndex + acts.length - 1) % acts.length;
    if (input.justPressed("down")) this.subIndex = (this.subIndex + 1) % acts.length;
    if (input.justPressed("cancel")) { this.phase = "MENU"; return; }
    if (input.justPressed("confirm")) {
      const act = acts[this.subIndex];
      if (act.id === "talk") this.enemy.talkedTo = true;
      this._queueMessage(act.text, "ENEMY_TURN_START");
    }
  }

  _updateItemMenu(input) {
    const items = this.player.inventory;
    if (items.length === 0) {
      if (input.justPressed("confirm") || input.justPressed("cancel")) this.phase = "MENU";
      return;
    }
    if (input.justPressed("up")) this.subIndex = (this.subIndex + items.length - 1) % items.length;
    if (input.justPressed("down")) this.subIndex = (this.subIndex + 1) % items.length;
    if (input.justPressed("cancel")) { this.phase = "MENU"; return; }
    if (input.justPressed("confirm")) {
      const item = items[this.subIndex];
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + item.heal);
      items.splice(this.subIndex, 1);
      this._queueMessage(`Você usou ${item.name} e recuperou HP!`, "ENEMY_TURN_START");
    }
  }

  _updateMercyMenu(input) {
    const options = ["POUPAR", "FUGIR"];
    if (input.justPressed("up") || input.justPressed("down")) {
      this.subIndex = this.subIndex === 0 ? 1 : 0;
    }
    if (input.justPressed("cancel")) { this.phase = "MENU"; return; }
    if (input.justPressed("confirm")) {
      const choice = options[this.subIndex];
      if (choice === "POUPAR") {
        if (this.enemy.talkedTo) {
          this._queueMessage(`Você poupou ${this.enemyDef.name}.`, "VICTORY");
        } else {
          this._queueMessage(`${this.enemyDef.name} ainda não parece pronto para ser poupado.`, "ENEMY_TURN_START");
        }
      } else {
        const success = Math.random() < 0.5;
        if (success) this._queueMessage("Você fugiu!", "FLED");
        else this._queueMessage("Você não conseguiu fugir!", "ENEMY_TURN_START");
      }
    }
  }

  _updateFightBar(dt, input) {
    this.fightBar.pos += this.fightBar.dir * this.fightBar.speed * dt;
    if (this.fightBar.pos >= 1) { this.fightBar.pos = 1; this.fightBar.dir = -1; }
    if (this.fightBar.pos <= 0) { this.fightBar.pos = 0; this.fightBar.dir = 1; }

    if (input.justPressed("confirm")) {
      const accuracy = 1 - Math.abs(this.fightBar.pos - 0.5) * 2; // 1 = centro perfeito
      const dmg = Math.max(1, Math.round(4 + accuracy * 10));
      this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
      if (this.enemy.hp <= 0) {
        this._queueMessage(`Você derrotou ${this.enemyDef.name}!`, "VICTORY");
      } else {
        this._queueMessage(`Você causou ${dmg} de dano!`, "ENEMY_TURN_START");
      }
    }
  }

  _queueMessage(text, next) {
    this.phase = "MESSAGE";
    this._nextAfterMessage = next;
    this.text.show([text], null);
  }

  _afterMessage() {
    const next = this._nextAfterMessage;
    if (next === "ENEMY_TURN_START") {
      this._startDodge();
    } else if (next === "VICTORY") {
      this.result = "victory";
      this.phase = "END";
      this.text.show(["Pressione Z para continuar."], null);
    } else if (next === "FLED") {
      this.result = "fled";
      this.phase = "END";
      this.text.show(["Pressione Z para continuar."], null);
    }
  }

  _startDodge() {
    this.phase = "DODGE";
    this.bullets = [];
    this.dodgeTimer = 0;
    this.soul.x = BOX.x + BOX.w / 2;
    this.soul.y = BOX.y + BOX.h * 0.75;
    this.soul.invuln = 0;
    const generator = PATTERNS[this.enemyDef.attackPattern] || wavePattern;
    this.pattern = generator(BOX);
  }

  _updateDodge(dt, input) {
    this.dodgeTimer += dt;

    const state = { bullets: this.bullets };
    this.pattern.update(state, dt);

    let dx = 0, dy = 0;
    if (input.isDown("left")) dx -= 1;
    if (input.isDown("right")) dx += 1;
    if (input.isDown("up")) dy -= 1;
    if (input.isDown("down")) dy += 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      const focusMode = input.isDown("cancel"); // segurar cancelar = movimento de precisão
      const speed = (focusMode ? 55 : 110) * dt;
      this.soul.x += (dx / len) * speed;
      this.soul.y += (dy / len) * speed;
    }
    this.soul.x = Math.max(BOX.x + this.soul.r, Math.min(BOX.x + BOX.w - this.soul.r, this.soul.x));
    this.soul.y = Math.max(BOX.y + this.soul.r, Math.min(BOX.y + BOX.h - this.soul.r, this.soul.y));

    if (this.soul.invuln > 0) this.soul.invuln -= dt;

    this.bullets = this.bullets.filter((b) =>
      b.x > BOX.x - 20 && b.x < BOX.x + BOX.w + 20 &&
      b.y > BOX.y - 20 && b.y < BOX.y + BOX.h + 20
    );

    if (this.soul.invuln <= 0) {
      for (const b of this.bullets) {
        const d = Math.hypot(b.x - this.soul.x, b.y - this.soul.y);
        if (d < b.r + this.soul.r) {
          this.player.hp = Math.max(0, this.player.hp - this.enemyDef.atk);
          this.soul.invuln = 1.0;
          break;
        }
      }
    }

    if (this.player.hp <= 0) {
      this.result = "gameover";
      this.phase = "END";
      this.text.show(["Você caiu..."], null);
      return;
    }

    if (this.dodgeTimer >= this.dodgeDuration) {
      this.phase = "MENU";
      this.menuIndex = 0;
    }
  }

  render(ctx) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.size.width, this.size.height);

    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(this.enemyDef.name.toUpperCase(), this.size.width / 2, 34);

    const flashing = this.phase === "DODGE" && this.soul.invuln > 0 && Math.floor(this.soul.invuln * 20) % 2 === 0;
    drawEnemyBig(ctx, this.size.width / 2, 70, flashing);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(BOX.x, BOX.y, BOX.w, BOX.h);

    if (this.phase === "DODGE") {
      for (const b of this.bullets) {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      const showHeart = this.soul.invuln <= 0 || Math.floor(this.soul.invuln * 20) % 2 === 0;
      if (showHeart) drawHeart(ctx, this.soul.x - 5, this.soul.y - 6, 10, "#ff4d4d");
    } else if (this.phase === "ENTER" || this.phase === "MESSAGE" || this.phase === "END") {
      ctx.textAlign = "left";
      ctx.fillStyle = "#fff";
      ctx.font = "12px monospace";
      const lines = wrapText(ctx, this.text.displayed, BOX.w - 30);
      lines.slice(0, 4).forEach((line, i) => ctx.fillText(line, BOX.x + 15, BOX.y + 24 + i * 18));
    } else if (this.phase === "FIGHT_BAR") {
      const barX = BOX.x + 20, barY = BOX.y + BOX.h / 2, barW = BOX.w - 40;
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(barX, barY - 6, barW, 12);
      ctx.fillStyle = "#ffdd55";
      const markerX = barX + this.fightBar.pos * barW;
      ctx.fillRect(markerX - 2, barY - 6, 4, 12);
      ctx.fillStyle = "#aaa";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Pressione Z no centro!", this.size.width / 2, barY + 26);
    } else if (this.phase === "ACT_MENU") {
      this._renderList(ctx, this.enemyDef.acts.map((a) => a.label));
    } else if (this.phase === "ITEM_MENU") {
      const items = this.player.inventory;
      this._renderList(ctx, items.length ? items.map((i) => `${i.name} (+${i.heal} HP)`) : ["(sem itens)"]);
    } else if (this.phase === "MERCY_MENU") {
      this._renderList(ctx, ["POUPAR", "FUGIR"]);
    }

    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.font = "11px monospace";
    ctx.fillText(`HP ${this.player.hp}/${this.player.maxHp}`, BOX.x, BOX.y + BOX.h + 22);

    if (this.phase === "MENU") {
      const colors = { LUTAR: "#ff9642", AGIR: "#4fa8ff", ITEM: "#5cd65c", PIEDADE: "#ffe14f" };
      const bw = 96, gap = 8;
      const startX = this.size.width / 2 - (bw * 4 + gap * 3) / 2;
      MENU_LABELS.forEach((label, i) => {
        const bx = startX + i * (bw + gap);
        const by = BOX.y + BOX.h + 30;
        const selected = i === this.menuIndex;
        ctx.fillStyle = selected ? colors[label] : "#2a2a34";
        ctx.fillRect(bx, by, bw, 26);
        ctx.fillStyle = selected ? "#0a0a0f" : "#fff";
        ctx.textAlign = "center";
        ctx.font = "11px monospace";
        ctx.fillText(label, bx + bw / 2, by + 17);
      });
      ctx.textAlign = "left";
    }
  }

  _renderList(ctx, items) {
    ctx.textAlign = "left";
    ctx.font = "12px monospace";
    items.forEach((label, i) => {
      const y = BOX.y + 22 + i * 18;
      ctx.fillStyle = i === this.subIndex ? "#ffdd55" : "#fff";
      ctx.fillText((i === this.subIndex ? "» " : "  ") + label, BOX.x + 16, y);
    });
  }
}
