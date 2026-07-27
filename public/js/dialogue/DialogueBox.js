// Lógica pura de "texto estilo máquina de escrever" (sem desenhar nada).
// Quem usa esta classe (Overworld.js, BattleSystem.js) é responsável por
// desenhar this.displayed dentro da sua própria caixa na tela.
//
// Comportamento: 1º toque em "confirmar" revela a linha inteira na hora;
// 2º toque avança para a próxima linha (ou fecha, se não houver mais).

export class DialogueBox {
  constructor(charsPerSecond = 32) {
    this.queue = [];
    this.current = "";
    this.displayed = "";
    this.charIndex = 0;
    this.timer = 0;
    this.speed = charsPerSecond;
    this.active = false;
    this.onComplete = null;
  }

  show(lines, onComplete = null) {
    this.queue = Array.isArray(lines) ? [...lines] : [lines];
    this.onComplete = onComplete;
    this.active = true;
    this._nextLine();
  }

  _nextLine() {
    if (this.queue.length === 0) {
      this.active = false;
      this.displayed = "";
      if (this.onComplete) this.onComplete();
      return;
    }
    this.current = this.queue.shift();
    this.displayed = "";
    this.charIndex = 0;
    this.timer = 0;
  }

  update(dt, confirmPressed) {
    if (!this.active) return;

    if (this.charIndex < this.current.length) {
      this.timer += dt;
      const revealCount = Math.floor(this.timer * this.speed);
      this.charIndex = confirmPressed
        ? this.current.length
        : Math.min(revealCount, this.current.length);
      this.displayed = this.current.slice(0, this.charIndex);
    } else if (confirmPressed) {
      this._nextLine();
    }
  }
}
