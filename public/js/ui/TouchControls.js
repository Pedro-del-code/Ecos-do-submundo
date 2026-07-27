// Conecta os botões touch (D-pad + Confirmar/Cancelar) do index.html ao
// InputManager, usando Pointer Events (funciona com dedo, mouse e caneta).

export function setupTouchControls(input) {
  const bind = (id, action) => {
    const el = document.getElementById(id);
    if (!el) return;

    const start = (e) => {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignora */ }
      input.setTouch(action, true);
    };
    const end = (e) => {
      e.preventDefault();
      input.setTouch(action, false);
    };

    el.addEventListener("pointerdown", start);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("pointerleave", end);
  };

  bind("dpad-up", "up");
  bind("dpad-down", "down");
  bind("dpad-left", "left");
  bind("dpad-right", "right");
  bind("btn-confirm", "confirm");
  bind("btn-cancel", "cancel");
}
