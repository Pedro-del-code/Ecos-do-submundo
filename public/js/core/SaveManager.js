// Save principal do jogo: localStorage do navegador.
// É local ao dispositivo/navegador, mas funciona 100% offline e não
// depende do backend — importante porque discos do plano gratuito do
// Render são efêmeros. Veja server/app.py para um save opcional na nuvem.

const SAVE_KEY = "ecos_do_subsolo_save_v1";

export const SaveManager = {
  save(state) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.warn("Não foi possível salvar o jogo:", e);
      return false;
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn("Não foi possível carregar o save:", e);
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      // ignora
    }
  },
};
