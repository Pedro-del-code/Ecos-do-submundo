// Unifica teclado e toque em um único conjunto de "ações" lógicas:
// up / down / left / right / confirm / cancel.
// Assim, o resto do jogo nunca precisa saber se o jogador está usando
// teclado ou os botões touch na tela.

const KEY_MAP = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
  KeyZ: "confirm", Enter: "confirm", Space: "confirm",
  KeyX: "cancel", ShiftLeft: "cancel", Escape: "cancel",
};

const PREVENT_DEFAULT_CODES = new Set([
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space",
]);

export class InputManager {
  constructor() {
    this.current = { up: false, down: false, left: false, right: false, confirm: false, cancel: false };
    this.previous = { ...this.current };

    window.addEventListener("keydown", (e) => {
      const action = KEY_MAP[e.code];
      if (action) {
        this.current[action] = true;
        if (PREVENT_DEFAULT_CODES.has(e.code)) e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e) => {
      const action = KEY_MAP[e.code];
      if (action) this.current[action] = false;
    });
  }

  // Chamado pelos controles touch.
  setTouch(action, value) {
    this.current[action] = value;
  }

  // Verdadeiro enquanto o botão/tecla estiver pressionado.
  isDown(action) {
    return !!this.current[action];
  }

  // Verdadeiro só no primeiro frame em que o botão foi pressionado.
  justPressed(action) {
    return !!this.current[action] && !this.previous[action];
  }

  // Deve ser chamado uma vez por frame, depois que toda a lógica de
  // update() já leu justPressed() para este frame.
  endFrame() {
    this.previous = { ...this.current };
  }
}
