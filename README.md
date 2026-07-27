# Ecos do Subsolo

RPG 2D inspirado nos **sistemas de jogo** do Undertale: exploração top-down,
diálogos com efeito de máquina de escrever e batalhas por turno com uma
fase de **esquiva de projéteis** (o "battle box" com o coração/SOUL).

> **Nota sobre originalidade:** este projeto reimplementa os *mecanismos*
> do gênero (menu LUTAR/AGIR/ITEM/PIEDADE, caixa de batalha, esquiva de
> balas) do zero, com nome, personagens, história e arte 100% originais.
> Nenhum sprite, música, texto ou nome do Undertale foi copiado — isso é
> proposital, para respeitar os direitos autorais do jogo original.
> Use isso como base/estrutura para o **seu próprio** jogo.

## Stack (linguagens usadas)

| Camada          | Tecnologia              | Papel                                         |
|-----------------|--------------------------|------------------------------------------------|
| Backend         | **Python** + Flask       | Serve os arquivos e uma API opcional de save   |
| Lógica do jogo  | **JavaScript** (ES Modules) | Engine, estados, batalha, overworld        |
| Estrutura       | **HTML5**                | Página + `<canvas>`                           |
| Estilo          | **CSS3**                 | Layout responsivo, tema retrô, controles touch |
| Dados           | **JSON**                  | Mapas, inimigos, diálogos                     |
| Deploy          | **YAML** (render.yaml)   | Infra as code para o Render.com               |

Não há build step (sem webpack/bundler): o navegador carrega os módulos
JS diretamente, o que simplifica o deploy.

## Estrutura de pastas

```
undertale-like-game/
├── server/
│   ├── app.py              # Flask: serve o /public e a API de save
│   ├── requirements.txt
│   └── saves/              # save opcional na nuvem (efêmero no free tier)
├── public/
│   ├── index.html
│   ├── css/style.css       # responsivo + controles touch
│   └── js/
│       ├── main.js         # bootstrap (canvas responsivo + carga de dados)
│       ├── core/
│       │   ├── Game.js         # máquina de estados + loop principal
│       │   ├── InputManager.js # teclado + touch unificados
│       │   ├── SaveManager.js  # save em localStorage
│       │   └── Draw.js         # "sprites" desenhados via canvas
│       ├── overworld/
│       │   └── Overworld.js    # mapa, colisão, NPCs, portas, encontros
│       ├── battle/
│       │   ├── BattleSystem.js   # LUTAR/AGIR/ITEM/PIEDADE + esquiva
│       │   └── BulletPatterns.js # padrões de ataque (balas)
│       ├── dialogue/
│       │   └── DialogueBox.js  # texto com efeito de máquina de escrever
│       ├── ui/
│       │   └── TouchControls.js # D-pad e botões na tela
│       └── data/
│           ├── maps.json     # salas, layout, NPCs, portas, encontros
│           └── enemies.json  # stats e ações de cada inimigo
├── render.yaml              # Blueprint de deploy do Render
├── runtime.txt              # versão do Python (alternativa ao render.yaml)
└── .gitignore
```

## Como rodar localmente

Requisitos: Python 3.10+.

```bash
cd server
pip install -r requirements.txt
python3 app.py
```

Abra `http://localhost:5000` no navegador. Em outra máquina na mesma rede
(para testar no celular), use o IP da máquina: `http://SEU_IP:5000`.

## Deploy no Render.com

### Opção A — Blueprint (recomendado, usa o `render.yaml`)

1. Suba este projeto para um repositório no GitHub/GitLab.
2. No [dashboard do Render](https://dashboard.render.com), clique em
   **New** → **Blueprint**.
3. Conecte o repositório. O Render vai ler `render.yaml` automaticamente
   e propor o serviço `ecos-do-subsolo`.
4. Clique em **Apply**. O primeiro build leva de 2 a 3 minutos.
5. Quando terminar, o jogo estará em `https://ecos-do-subsolo.onrender.com`
   (ou o subdomínio que o Render atribuir).

### Opção B — Manual pelo dashboard

1. **New** → **Web Service** → conecte o repositório.
2. **Language/Runtime:** Python 3.
3. **Build Command:** `pip install -r server/requirements.txt`
4. **Start Command:** `gunicorn --chdir server app:app --bind 0.0.0.0:$PORT`
5. **Plan:** Free (ou o plano desejado).
6. Crie o serviço e aguarde o deploy.

### Limitações do plano gratuito (importante)

- **Cold start:** o serviço "dorme" após ~15 minutos sem tráfego e leva
  cerca de 60 segundos para acordar na próxima visita.
- **Disco efêmero:** arquivos gravados em `server/saves/` podem ser
  apagados a cada novo deploy/reinício. Por isso o **save principal do
  jogo usa `localStorage` do navegador** (feito automaticamente ao trocar
  de sala e ao vencer/fugir de uma batalha) — a API `/api/save` é só um
  extra opcional, ótimo ponto de partida caso você conecte um banco de
  dados de verdade (Postgres, por exemplo) mais adiante.

## Controles

| Ação        | Teclado          | Touch (celular)        |
|-------------|-------------------|--------------------------|
| Mover        | Setas / WASD      | D-pad na tela            |
| Confirmar    | Z / Enter / Espaço| Botão redondo azul (Z)   |
| Cancelar/voltar | X / Shift      | Botão redondo vermelho (X)|
| Foco (esquiva mais devagar) | segurar X | segurar o botão vermelho |

Os controles touch aparecem automaticamente em telas sem mouse (detecção
via CSS `@media (hover: none)`), então o mesmo `index.html` funciona em
desktop e celular sem nenhuma configuração extra.

## Como estender

O projeto foi feito para ser um **esqueleto** fácil de crescer:

- **Nova sala/mapa:** adicione uma entrada em `maps.json` (layout em
  `#`/`.`, lista de `npcs`, `encounters` e `doors`). Nenhum código novo
  é necessário.
- **Novo inimigo:** adicione uma entrada em `enemies.json` com `maxHp`,
  `atk`, `attackPattern` (`"wave"` ou `"circle"`) e a lista de `acts`.
- **Novo padrão de ataque:** copie uma função em `BulletPatterns.js`,
  ajuste o padrão de disparo e registre-a no objeto `PATTERNS` dentro de
  `BattleSystem.js`.
- **Sprites de verdade:** troque o conteúdo das funções em `Draw.js` por
  chamadas a `ctx.drawImage(...)` — a assinatura de cada função
  (`drawPlayer`, `drawEnemyBig` etc.) já recebe posição e estado prontos.
- **Sistema de nível/EXP:** hoje o jogador só tem HP/inventário; dá para
  adicionar `exp`/`lv` no objeto `player` em `Game.js` e aumentar
  `maxHp`/`atk` ao vencer batalhas.
- **Mais músicas/efeitos sonoros:** adicione arquivos em `public/assets/`
  e toque-os com a Web Audio API ou `<audio>` a partir do `Game.js`.

## Testes já feitos neste ambiente

- ✅ `enemies.json` e `maps.json` validados como JSON.
- ✅ `server/app.py` compilado sem erros (`py_compile`).
- ✅ Todos os módulos `.js` verificados com `node --check` (sintaxe OK).
- ✅ Servidor Flask iniciado localmente e todas as rotas testadas com
  `curl` (`/`, `/health`, `/css/style.css`, `/js/main.js`,
  `/js/data/*.json`, `POST /api/save`, `GET /api/save/<slot>`) — todas
  retornaram HTTP 200 com o conteúdo esperado.

O que **não** foi testado aqui (recomendo testar após o deploy): a
renderização visual do canvas e os toques na tela, pois este ambiente
não tem navegador gráfico disponível.
