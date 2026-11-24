# Documentação técnica — OKENA

Versão 1.7.0 · Single-Page Application em um único `index.html`, sem build e sem dependências além do Tailwind via CDN.

---

## 1. Visão geral

```
┌──────────┐   ┌──────────┐   ┌─────────────────┐   ┌──────────────────┐   ┌──────────┐
│ Cadastro │ → │  Início  │ → │ Câmera traseira │ → │ Câmera frontal   │ → │ Prévia + │
│ (setup)  │   │  (home)  │   │  captura manual │   │ 5 s → automática │   │ exportar │
└──────────┘   └──────────┘   └─────────────────┘   └──────────────────┘   └──────────┘
      ↑              │  ↘ Sobre / Instalar (modais)                              │
      └── Configurações ←────────────────────────────────────────────────────────┘
```

Todas as telas são `<section data-screen="…">` no mesmo documento. A função `show(name)` liga a classe `active`
em uma delas (o CSS exibe só a ativa). Modais (`Sobre`, `Instalar`) são painéis inferiores (`bottom sheet`).

| Tela | `data-screen` | Função |
|---|---|---|
| Cadastro / Configurações | `setup` | Foto, nome completo e nome de usuário |
| Início | `home` | Saudação, iniciar captura, Sobre, Instalar |
| Câmera | `camera` | Vídeo ao vivo, botão de captura, contagem |
| Pré-visualização | `preview` | Story, comentário, alinhamento, carimbo, exportação |
| Erro | `error` | Mensagens amigáveis + tentar novamente |

### Abertura e tela fixa

- Sem perfil → cadastro. **Com perfil → `startFlow()` direto na câmera** (o ✕ leva ao início). Se o app vai para
  segundo plano durante a captura, ela é cancelada e, ao voltar, a câmera reabre (`state.resumeCamera`).
- `html, body` ficam `position: fixed; overflow: hidden; overscroll-behavior: none; touch-action: manipulation`:
  a página nunca rola nem “quica” (sem puxar para atualizar). Cada tela ativa é `position: fixed; inset: 0` e só
  ela rola internamente (`overscroll-behavior: contain`); a câmera usa `touch-action: none`.
- Zoom bloqueado: `maximum-scale=1, user-scalable=no` no viewport, `preventDefault` em `gesturestart/change/end`
  (iOS) e em `touchmove` com mais de um dedo.

## 2. Estado

Um único objeto `state` no escopo do módulo (IIFE):

| Campo | Tipo | Uso |
|---|---|---|
| `profile` | `{ name, handle, photo, location }` | Perfil; `photo` é um data URL JPEG 320×320 ou `null` |
| `prefs` | `{ date, time, align, font, format, mode, camBack, camFront, color, moodAlign }` | Preferências do Story (persistidas) |
| `stream` | `MediaStream` | Stream ativo da câmera |
| `flow` | `number` | **Token de fluxo**: incrementa a cada início/cancelamento, invalidando operações assíncronas antigas |
| `back`, `front` | `HTMLCanvasElement` | Quadros capturados em resolução nativa |
| `capturedAt` | `Date` | Instante da foto traseira (usado no carimbo e no nome do arquivo) |
| `blob`, `url`, `fileName` | | PNG final e seu object URL |
| `installPrompt` | `BeforeInstallPromptEvent` | Guardado para o botão “Instalar agora” |

### Persistência (`localStorage`)

| Chave | Conteúdo |
|---|---|
| `okena:perfil` | `{"name": "...", "handle": "...", "photo": "data:image/jpeg;base64,...", "location": "Belém, PA"}` |
| `okena:prefs` | `{"date": true, "time": true, "align": "justify", "font": "padrao", "format": "story", "mode": "photo", "camBack": "", "camFront": "", "color": "branco", "moodAlign": "left"}` |

Leituras e gravações ficam em `try/catch`. Se o armazenamento falhar (modo privado, cota), o app segue com os
dados em memória e avisa o usuário.

## 3. Câmera

```js
getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' | 'user' },
                                      width: { ideal: 1920 }, height: { ideal: 1080 } } })
```

- `facingMode` é **ideal**, não `exact`: em computadores com uma só webcam o fluxo continua funcionando.
- Em `OverconstrainedError` há nova tentativa com `{ video: true }`.
- O stream anterior é **sempre parado antes** de abrir o próximo (vários Android não abrem duas câmeras juntas).
- `attach()` espera `videoWidth > 0` e `readyState ≥ 2` (timeout de 8 s → `TimeoutError`).
- A selfie é espelhada (preview e captura) quando o `track.getSettings().facingMode` não é `environment`.
- `visibilitychange` → se a aba sai de foco durante a captura, o fluxo é cancelado e o stream liberado.

### Fluxo com token

```js
const token = ++state.flow;
const s = await openCamera('user');
if (token !== state.flow) { s.getTracks().forEach(t => t.stop()); return; } // usuário cancelou no meio
```

Isso evita corridas: se o usuário tocar em ✕ durante o `await`, o stream recém-aberto é descartado e a contagem
para.

### Erros tratados

| `error.name` | Mensagem |
|---|---|
| `InsecureContext` (sintético) | Conexão não segura (exige HTTPS/localhost) |
| `Unsupported` (sintético) | Navegador sem `getUserMedia` |
| `NotAllowedError`, `PermissionDeniedError`, `SecurityError` | Permissão negada + como liberar |
| `NotFoundError`, `DevicesNotFoundError`, `OverconstrainedError` | Nenhuma câmera |
| `NotReadableError`, `TrackStartError`, `AbortError` | Câmera ocupada |
| `TimeoutError` (sintético) | A câmera não respondeu |

## 4. Composição (Canvas — Story ou Feed)

Formatos em `FORMATS`, ambos em **retrato**, escolhidos em `prefs.format`:

| id | Tamanho | Topo (`top`) | Base (`bottom`) | Selfie | Altura máx. do comentário |
|---|---|---|---|---|---|
| `story` | 1080 × 1920 (9:16) | 150 px (fora da barra do Instagram) | 260 px | 342 × 456 | 360 px |
| `feed` | 1080 × 1350 (4:5) | 64 px | 72 px | 300 × 400 | 260 px |

Margem lateral `M = 64`. As vinhetas usam 1/3 da altura no topo e 40 % na base. O nome do arquivo leva o
formato: `okena-{story|feed}-{handle}-{AAAAMMDD}-{HHMM}.png`.

| Ordem | Camada | Detalhes |
|---|---|---|
| 1 | Fundo | Foto traseira em *cover* (`drawCover`: escala = `max(dw/iw, dh/ih)`, recorte centralizado) |
| 2 | Vinhetas | Gradiente preto no topo (0→640 px) e na base (últimos 760 px) para legibilidade |
| 3 | Selfie 3:4 | 342 × 456 px em `(W − M − 342, 150)`, raio 40, sombra (blur 50, offset 18), borda branca 5 px |
| 4 | Ícone | Logo (moldura branca + selfie âmbar) 96 px em `(M, top)`, `globalAlpha 0.5`, sem sombra (marca d'água translúcida). **Sem o nome escrito.** |
| 5 | @ do usuário | Abaixo da selfie, alinhado à direita dela, 40 px, peso 700; trunca com “…” |
| 5b | Localização | `profile.location` (≤ 20 caracteres): texto 32 px alinhado à direita da selfie, 50 px abaixo do @, com pin vermelho `#EF4444` (gota com furo branco, `drawPin`) à esquerda |
| 6 | Carimbo retrô | Display de 7 segmentos desenhado à mão, base em `H − bottom`, altura 40 px, alinhado à direita |
| 7 | Comentário (posição) | A linha de base (MOOD + carimbo) sempre existe; altura = `max(carimbo 40 px, MOOD × 1,15)`. A caixa termina 40 px acima dela, com ou sem carimbo |
| 7b | Legenda (cor) | Sem caixa de fundo. 6 cores em `COLORS` (`prefs.color`): com contorno (`amarelo` `#FFE14D`/preto, `preto`/branco — `strokeText` com `lineWidth` = 16 % da fonte, todas as linhas antes do preenchimento) ou com sombra dupla (`branco`, `rosa` `#FF5CAA`, `ciano` `#4FE3FF`, `verde` `#B6F23A`) |
| 7c | Comentário | Caixa translúcida acima do carimbo, largura `W − 2M`, borda fina |
| 8a | MOOD (alinhamento) | `prefs.moodAlign` = `left` / `center` / `right`. À esquerda divide a linha com o carimbo; centralizado/à direita com carimbo ligado ganha linha própria 22 px acima do carimbo (a altura reservada da base cresce para `carimbo + 22 + MOOD × 1,15`) |
| 8 | MOOD | Texto do campo MOOD (até 40 caracteres), 36 px peso 600, canto inferior esquerdo, truncado antes do carimbo. Vazio → “Janela do Mundo Real”, 28 px, 72 % de opacidade |

### Comentário: fonte adaptativa + alinhamento

```
para size de 62 até 34 (passo 2):
    quebrar palavras em linhas que caibam em maxW
    se linhas × (size × 1.28) ≤ 360 px → usar esse size
```

- Palavras maiores que a linha são quebradas por caractere.
- Alinhamentos (`state.prefs.align`):
  - `justify`: distribui o espaço restante entre as palavras em todas as linhas, exceto a última;
  - `left`, `center`, `right`: `textAlign` correspondente.
- Limite de 100 caracteres no `<textarea maxlength>` e também no `compose()` (`slice(0, 100)`).

### Carimbo retrô de 7 segmentos

Sem fontes externas: cada dígito é um conjunto de segmentos `a–g` desenhados com `lineCap: round`, com leve
itálico (`setTransform(1, 0, −0.1, 1, …)`) e brilho em quatro passadas:

1. duas passadas de halo laranja (`shadowBlur` = 45 % da altura);
2. núcleo `#FF9A3C`;
3. filete claro `rgba(255,230,190,.85)` no centro, imitando LED.

Formato: `DD MM 'AA` e `HH:MM`, separados por dois espaços. Cada parte é opcional (`prefs.date`, `prefs.time`).

### Fontes

Dez famílias, definidas em `FONTS` (`id`, `name`, `family`, `weight`, `scale`, `lh`). `scale` compensa fontes que
parecem menores ou maiores no mesmo tamanho (Caneta ×1,32; Pôster ×1,28; Mono ×0,9) e `lh` ajusta a entrelinha
(Pacifico 1,55; Pôster 1,06). As nove fontes externas vêm de um único CSS do Google Fonts com `display=swap`;
antes de cada render, `ensureFont()` chama `document.fonts.load()` (limite de 4 s). Sem rede, o canvas usa a
fonte do sistema. A escolha fica em `prefs.font`.

| id | Nome no app | Família |
|---|---|---|
| `padrao` | Padrão | fonte do sistema |
| `playfair` | Elegante | Playfair Display 700 |
| `dmserif` | Clássica | DM Serif Display |
| `elite` | Máquina | Special Elite |
| `mono` | Mono | Space Mono 700 |
| `caveat` | Caneta | Caveat 700 |
| `pacifico` | Pacifico | Pacifico |
| `bebas` | Pôster | Bebas Neue |
| `marker` | Marcador | Permanent Marker |
| `righteous` | Retrô | Righteous |

### Exportação

- `canvas.toBlob(..., 'image/png')` → `File` → `navigator.canShare({ files })` → `navigator.share({ files })`.
- **Salvar foto** (`saveToGallery`):
  - iOS/iPadOS: `<a download>` grava em Arquivos (e não faz nada em PWA instalada), então o app abre a folha de
    compartilhamento (opção “Salvar Imagem” → Fotos). Se ela não existir ou falhar, abre `#saveSheet` com a imagem
    em tela cheia e `-webkit-touch-callout: default` para o toque longo “Adicionar às Fotos”.
  - Android e computador: `<a download>` (no Android vai para Download, indexado pela Galeria).
- **Compartilhar** sem suporte a arquivos recorre ao mesmo `saveToGallery`.
- Nome: `okena-{handle}-{AAAAMMDD}-{HHMM}.png`.
- Re-renderização com *debounce* de 250 ms ao digitar; `renderSeq` descarta renders obsoletos.

## 4.1 Vídeo (até 30 s)

**Captura.** No modo Vídeo o stream traseiro é aberto com `audio: true` (sem permissão de microfone, cai para
só vídeo). `MediaRecorder` grava o stream direto, com o primeiro tipo suportado de
`video/mp4;codecs=avc1.42E01E,mp4a.40.2 → video/mp4;codecs=avc1 → video/mp4 → video/webm;codecs=vp9,opus → …`,
8 Mbps, `timeslice` 250 ms. Um intervalo de 100 ms atualiza o cronômetro e o anel (SVG `stroke-dashoffset`)
e para em 30 s. A duração é medida pelo relógio (`performance.now()`), porque WebM gravado no Chrome não traz
duração. Depois vem a selfie normal (`goFront`).

**Camada fixa.** `composeOverlay()` desenha, num canvas transparente, tudo o que não é o fundo (vinhetas,
selfie, ícone, @, comentário, MOOD, carimbo). A foto usa `compose(overlay)` = fundo + camada; o vídeo sobrepõe a
mesma camada a cada quadro. Editar texto, fonte ou formato só refaz a camada.

**Prévia.** `<video id="previewVid">` mudo em loop + `requestAnimationFrame` desenhando `drawCover(vídeo)` +
camada no `<canvas id="storyCanvas">`. O loop de WebM sem duração é refeito no evento `ended`.

**Exportação.** Toque em Salvar/Compartilhar → `prepareVideo()`:
1. `AudioContext` criado/retomado ainda dentro do toque (`createMediaElementSource(exportVid)` →
   `MediaStreamDestination`);
2. `canvas.captureStream(30)` + a faixa de áudio → `MediaRecorder` (10 Mbps);
3. reprodução do clipe em tempo real, desenhando quadro + camada até `ended`;
4. o blob final fica em `state.videoOut` (invalidado a cada nova renderização).

Como a geração leva o tempo do vídeo, o navegador perde a "ativação do usuário" exigida por `navigator.share`.
Por isso o resultado aparece numa janela (**Vídeo pronto!**) com novos botões Compartilhar/Salvar. Nome:
`okena-{story|feed}-{handle}-{AAAAMMDD}-{HHMM}.mp4`.

## 4.2 Permissão da câmera (uma vez só)

- Ao trocar de câmera, `openCamera()` abre a nova **antes** de parar a anterior. Com uma captura ativa, o Safari
  do iPhone não repete o pedido de permissão. Se o aparelho não abre duas câmeras ao mesmo tempo
  (`NotReadableError`/`AbortError`), a anterior é liberada e a abertura é repetida.
- `okena:camera-ok` (localStorage) registra que a permissão já foi dada. Se não existir (primeiro uso ou dados
  limpos), a tela de carregamento explica que o pedido aparece só desta vez.
- No primeiro uso no iPhone, uma dica única (`okena:camera-dica`) ensina a marcar **Permitir** em Ajustes do Site.
- A permissão em si é guardada pelo navegador para o site e só volta a ser pedida se os dados do navegador
  forem limpos ou a permissão for revogada.

## 4.2.1 Escolha de câmeras

`prefs.camBack` / `prefs.camFront` guardam o `deviceId` escolhido (vazio = automática por `facingMode`). A lista
vem de `enumerateDevices()` (rótulos disponíveis depois da permissão de câmera). `openCamera` usa
`deviceId: { exact }`; se a câmera não existir mais (`OverconstrainedError`/`NotFoundError`/`NotReadableError`),
limpa a preferência e repete com `facingMode`. Trocar a câmera da vista reabre o stream na hora; a da selfie vale
na etapa 2.

## 4.3 Atualização automática

- `sw.js` busca **HTML e arquivos do próprio app sempre da rede** (`cache: 'no-store'`). O cache só serve
  offline. Tailwind e Google Fonts continuam cache-first.
- O service worker é registrado com `updateViaCache: 'none'` e `reg.update()` roda a cada `pageshow` e retorno
  ao app (`visibilitychange`).
- `skipWaiting()` + `clients.claim()`: a versão nova assume na hora; no evento `controllerchange` a página
  recarrega se o usuário estiver no início, no cadastro ou numa tela de erro (nunca no meio de captura/edição).

Resultado: **fechar e abrir o app** já traz a versão publicada.

## 5. Foto de perfil

`<input type="file" accept="image/*">` → `Image` → recorte quadrado central → canvas 320 × 320 →
`toDataURL('image/jpeg', 0.85)` (≈ 15–30 KB) → salvo no perfil. A foto é usada só na interface do app (avatar); ela **não** entra no Story.

## 6. PWA

| Arquivo | Papel |
|---|---|
| `manifest.webmanifest` | Nome, cores, `display: standalone`, `orientation: portrait`, ícones `any` e `maskable`, screenshots |
| `sw.js` | Pré-cache do núcleo; **rede primeiro** para HTML (sempre a versão nova), **cache primeiro com atualização em segundo plano** para assets, Tailwind e Google Fonts |
| `index.html` | Registra o SW apenas em `https:`; guarda `beforeinstallprompt` para o botão “Instalar agora”; detecta `display-mode: standalone` |

Ao publicar uma versão nova, altere `CACHE` em `sw.js` (ex.: `okena-v1.0.1`) e `VERSION` em `index.html`.

## 7. SEO e descoberta

- `<title>`, `description`, `keywords`, `canonical`.
- Open Graph e Twitter Card com `assets/og-image.png` (1200 × 630).
- JSON-LD `WebApplication` (gratuito, categoria fotografia).
- `robots.txt` e `sitemap.xml` na raiz.
- Tópicos no repositório do GitHub.

## 8. Modo demonstração

`index.html#demo` substitui as câmeras por cenas sintéticas desenhadas no canvas e expõe `window.__okena`
para testes. É assim que os prints da pasta `docs/screenshots/` são gerados (Chrome headless via DevTools
Protocol). Não afeta o uso normal.

## 9. Compatibilidade

| Recurso | Safari iOS | Chrome Android | Desktop |
|---|---|---|---|
| `getUserMedia` com `facingMode` | 11+ | ✓ | ✓ (webcam única) |
| Web Share com arquivos | 15+ | ✓ | Edge/Chrome no Windows/ChromeOS, Safari macOS |
| Instalação PWA | “Adicionar à Tela de Início” | prompt nativo | Chrome/Edge, Safari 17+ |
| `ctx.letterSpacing` | não usado | — | — |

## 10. Estrutura de arquivos

```
okena/
├── index.html
├── manifest.webmanifest
├── sw.js
├── robots.txt · sitemap.xml · .nojekyll
├── assets/
│   ├── logo.svg                 ícone do app (fundo escuro)
│   ├── logo-mark.svg            só o símbolo, fundo transparente
│   ├── logo-wordmark.svg        símbolo + OKENA + slogan (para fundo escuro)
│   ├── logo-wordmark-light.svg  idem para fundo claro
│   ├── favicon.svg · favicon-32.png · apple-touch-icon.png
│   ├── icon-192.png · icon-512.png · icon-maskable(.svg / -512.png)
│   └── og-image.png             imagem para redes sociais
└── docs/
    ├── MANUAL-DE-USO.md
    ├── DOCUMENTACAO-TECNICA.md
    ├── PRIVACIDADE.md
    ├── IDENTIDADE-VISUAL.md
    └── screenshots/
```
