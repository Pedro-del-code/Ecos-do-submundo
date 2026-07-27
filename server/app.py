"""
Servidor backend do jogo "Ecos do Subsolo".

Responsabilidades:
1. Servir os arquivos estáticos do jogo (HTML/CSS/JS/JSON) da pasta ../public
2. Expor uma API REST simples e opcional de save na nuvem (/api/save)
3. Expor /health para o health check do Render

Sobre o plano gratuito do Render: o disco é efêmero (arquivos gravados aqui
podem sumir a cada novo deploy ou quando o serviço "dorme" e acorda). Por
isso o jogo usa localStorage do navegador como save principal — esta API
é um extra para quem quiser evoluir para um save na nuvem de verdade
(trocando o armazenamento em arquivo abaixo por um banco de dados).
"""

import json
import os

from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "public"))
SAVE_DIR = os.path.join(BASE_DIR, "saves")
os.makedirs(SAVE_DIR, exist_ok=True)

app = Flask(__name__)


@app.route("/")
def index():
    return send_from_directory(PUBLIC_DIR, "index.html")


@app.route("/health")
def health():
    """Usado pelo health check do Render (healthCheckPath no render.yaml)."""
    return jsonify({"status": "ok"})


@app.route("/api/save", methods=["POST"])
def save_game():
    """Salva o estado do jogo em um arquivo JSON no slot informado."""
    data = request.get_json(force=True, silent=True) or {}
    slot = str(data.get("slot", "1"))
    if not slot.isalnum():
        return jsonify({"ok": False, "error": "slot_invalido"}), 400

    path = os.path.join(SAVE_DIR, f"slot_{slot}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    return jsonify({"ok": True})


@app.route("/api/save/<slot>", methods=["GET"])
def load_game(slot):
    """Carrega o estado salvo de um slot, se existir."""
    if not slot.isalnum():
        return jsonify({"ok": False, "error": "slot_invalido"}), 400

    path = os.path.join(SAVE_DIR, f"slot_{slot}.json")
    if not os.path.exists(path):
        return jsonify({"ok": False, "error": "nao_encontrado"}), 404

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return jsonify({"ok": True, "data": data})


@app.route("/<path:filename>")
def static_files(filename):
    """Serve qualquer outro arquivo estático dentro de /public (css, js, json...)."""
    return send_from_directory(PUBLIC_DIR, filename)


if __name__ == "__main__":
    # Execução local: python3 server/app.py
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
