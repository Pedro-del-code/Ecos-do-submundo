import { InputManager } from "./InputManager.js";
import { SaveManager } from "./SaveManager.js";
import { Overworld } from "../overworld/Overworld.js";
import { BattleSystem } from "../battle/BattleSystem.js";
import { DialogueBox } from "../dialogue/DialogueBox.js";

export const LOGICAL_WIDTH = 480;
export const LOGICAL_HEIGHT = 270;

const GameState = {
  TITLE: "title",
  OVERWORLD: "overworld",
  BATTLE: "battle",
  GAMEOVER: "gameover",
};

const starterInventory = () => [
  { name: "Lanche", heal: 15 },
  { name: "Lanche", heal: 15 },
];

export class Game {
  constructor(canvas, mapsData, enemiesData) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.mapsData = mapsData;
    this.enemiesData = enemiesData;

    this.input = new InputManager();
    this.state = GameState.TITLE;
    this.lastTime = 0;

    this.player = {
      hp: 30,
      maxHp: 30,
      atk: 5,
      inventory: starterInventory(),
    };

    this.overworldDialogue = new DialogueBox();
    this.overworld = new Overworld(mapsData, this.overworldDialogue, {
      width: LOGICAL_WIDTH,
      height: LOGICAL_HEIGHT,
    });
    this.battle = null;
    this.hasSave = !!SaveManager.load();
  }

  start() {
    requestAnimationFrame((ts) => this.loop(ts));
  }

  loop(ts) {
    const dt = Math.min((ts - (this.lastTime || ts)) / 1000, 0.05);
    this.lastTime = ts;
    this.update(dt);
    this.render();
    this.input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    switch (this.state) {
      case GameState.TITLE:
        if (this.input.justPressed("confirm")) this._loadFromSaveOrNew(false);
        break;

      case GameState.OVERWORLD:
        this.overworld.update(dt, this.input);

        if (this.overworld.justEnteredRoom) {
          this.overworld.justEnteredRoom = false;
          SaveManager.save(this._buildSaveData());
        }

        if (this.overworld.pendingBattle) {
          const enemyId = this.overworld.pendingBattle;
          this.overworld.pendingBattle = null;
          this.battle = new BattleSystem(this.enemiesData[enemyId], this.player, {
            width: LOGICAL_WIDTH,
            height: LOGICAL_HEIGHT,
          });
          this.state = GameState.BATTLE;
        }
        break;

      case GameState.BATTLE:
        this.battle.update(dt, this.input);
        if (this.battle.finished) {
          const result = this.battle.result;
          this.battle = null;
          if (result === "gameover") {
            this.state = GameState.GAMEOVER;
          } else {
            this.state = GameState.OVERWORLD;
            SaveManager.save(this._buildSaveData());
          }
        }
        break;

      case GameState.GAMEOVER:
        if (this.input.justPressed("confirm")) this._loadFromSaveOrNew(true);
        break;
    }
  }

  _buildSaveData() {
    return {
      player: {
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        inventory: this.player.inventory,
      },
      roomId: this.overworld.currentRoomId,
    };
  }

  // fullHeal=true é usado ao "renascer" depois de um game over.
  _loadFromSaveOrNew(fullHeal) {
    const saved = SaveManager.load();
    if (saved) {
      this.player.maxHp = saved.player.maxHp;
      this.player.hp = fullHeal ? this.player.maxHp : saved.player.hp;
      this.player.inventory = saved.player.inventory;
      this.overworld.loadRoom(saved.roomId || "starting_room");
    } else {
      this.player.hp = this.player.maxHp;
      this.player.inventory = starterInventory();
      this.overworld.loadRoom("starting_room");
    }
    this.state = GameState.OVERWORLD;
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    switch (this.state) {
      case GameState.TITLE:
        this._renderTitle(ctx);
        break;
      case GameState.OVERWORLD:
        this.overworld.render(ctx);
        this._renderHUD(ctx);
        break;
      case GameState.BATTLE:
        this.battle.render(ctx);
        break;
      case GameState.GAMEOVER:
        this._renderGameOver(ctx);
        break;
    }
  }

  _renderTitle(ctx) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "20px monospace";
    ctx.fillText("ECOS DO SUBSOLO", LOGICAL_WIDTH / 2, 100);
    ctx.font = "12px monospace";
    ctx.fillText("Pressione Z / toque em Confirmar para iniciar", LOGICAL_WIDTH / 2, 140);
    if (this.hasSave) ctx.fillText("(continuando o último save)", LOGICAL_WIDTH / 2, 160);
    ctx.textAlign = "left";
  }

  _renderGameOver(ctx) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.fillStyle = "#ff4d4d";
    ctx.textAlign = "center";
    ctx.font = "18px monospace";
    ctx.fillText("VOCÊ CAIU...", LOGICAL_WIDTH / 2, 120);
    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";
    ctx.fillText("Pressione Z para recomeçar", LOGICAL_WIDTH / 2, 150);
    ctx.textAlign = "left";
  }

  _renderHUD(ctx) {
    ctx.fillStyle = "#fff";
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`HP ${this.player.hp}/${this.player.maxHp}`, 8, LOGICAL_HEIGHT - 8);
  }
}
