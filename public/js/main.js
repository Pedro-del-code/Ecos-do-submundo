import { Game, LOGICAL_WIDTH, LOGICAL_HEIGHT } from "./core/Game.js";
import { setupTouchControls } from "./ui/TouchControls.js";

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Falha ao carregar ${path}`);
  return res.json();
}

function setupResponsiveCanvas(canvas) {
  canvas.width = LOGICAL_WIDTH;
  canvas.height = LOGICAL_HEIGHT;

  function fitCanvas() {
    const ratio = LOGICAL_WIDTH / LOGICAL_HEIGHT;
    const availW = window.innerWidth;
    const availH = window.innerHeight;
    let cssW, cssH;
    if (availW / availH > ratio) {
      cssH = availH;
      cssW = availH * ratio;
    } else {
      cssW = availW;
      cssH = availW / ratio;
    }
    canvas.style.width = `${Math.floor(cssW)}px`;
    canvas.style.height = `${Math.floor(cssH)}px`;
  }

  window.addEventListener("resize", fitCanvas);
  window.addEventListener("orientationchange", fitCanvas);
  fitCanvas();
}

async function boot() {
  const canvas = document.getElementById("game-canvas");
  setupResponsiveCanvas(canvas);

  const [maps, enemies] = await Promise.all([
    loadJSON("js/data/maps.json"),
    loadJSON("js/data/enemies.json"),
  ]);

  const game = new Game(canvas, maps, enemies);
  setupTouchControls(game.input);
  game.start();
}

boot();
