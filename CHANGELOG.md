# Changelog

## [1.7.0] — 2026-11-24

- Depois do primeiro uso, o app **abre direto na câmera** (o ✕ leva à tela inicial) e reabre na câmera ao voltar de segundo plano.
- **Tela fixa:** sem arrastar a página para fora da área visível, sem zoom e sem “puxar para atualizar”; só o conteúdo de cada tela rola.

## [1.6.1] — 2026-11-23

- Carimbo de data/hora menor (altura de 58 px → 40 px).

## [1.6.0] — 2026-11-23

- Alinhamento do **MOOD**: esquerda, centro ou direita (centro/direita ganham linha própria acima do carimbo).
- Rótulo “Alinhar legenda” para diferenciar do alinhamento do MOOD.

## [1.5.0] — 2026-11-23

- Legenda sem caixa preta de fundo: só o texto, em **6 cores** (branco, amarelo com borda preta, preto com borda
  branca, rosa, ciano, verde-limão).
- Permissão da câmera pedida **uma vez só**: a troca entre câmeras abre a nova antes de desligar a anterior, e o
  aviso de permissão só aparece de novo se os dados do navegador forem limpos. Dica única para o iPhone.

## [1.4.0] — 2026-11-23

- **Localização estática** (até 20 caracteres, digitada; sem GPS): nas Configurações e na câmera, antes de
  fotografar. No Story aparece abaixo do @ com um pin vermelho pequeno.
- **Escolher câmeras:** lente da vista e da selfie (principal, ultra-angular, tele, frontal, externa).
- Correção: o MOOD não se sobrepõe mais à caixa de comentário quando data e hora estão desligadas.
- Ícone do Story translúcido (marca d'água).

## [1.3.0] — 2026-11-23

- **Vídeos de até 30 segundos** com som: modo Foto/Vídeo na câmera, cronômetro e anel de progresso, selfie em
  5 s em seguida, prévia em loop com todas as edições e geração do MP4 final no aparelho (Story ou Feed).
- **Atualização automática:** basta fechar e abrir o app para receber a versão nova.
- Modo demonstração (`#demo`) agora simula as câmeras com vídeo animado, testando o mesmo caminho do app real.

## [1.2.0] — 2026-11-23

- Escolha do formato na hora de postar: **Story** (9:16, 1080 × 1920) ou **Feed** (4:5, 1080 × 1350), sempre em retrato.
- Feed com margens próprias e selfie proporcional; nome do arquivo indica o formato.

## [1.1.0] — 2026-11-23

- 10 fontes para o comentário e o MOOD: Padrão, Elegante, Clássica, Máquina, Mono, Caneta, Pacifico, Pôster, Marcador e Retrô.
- “Baixar” virou **Salvar foto** e passa a chegar à galeria no iPhone (folha de compartilhamento → Salvar Imagem,
  com alternativa de toque longo › Adicionar às Fotos). Android e computador continuam com download.
- Avisos (toasts) no topo da tela, sem cobrir botões.
- README com botão “Acesse o OKENA aqui”.

## [1.0.0] — 2026-11-23

Primeira versão pública.

- Captura em duas etapas: vista (câmera traseira, manual) e selfie (câmera frontal, automática após 5 s).
- Story 1080 × 1920 em PNG: vista em tela cheia, selfie 3:4 com borda e sombra, @ abaixo da selfie, ícone como marca d'água.
- Comentário de até 100 caracteres com fonte adaptativa e alinhamento justificado, à esquerda, centralizado ou à direita.
- MOOD: campo “como você está se sentindo” que aparece no lugar de “Janela do Mundo Real”.
- Carimbo de data e/ou hora em estilo LED de câmera de filme.
- Perfil local com foto, nome completo e nome de usuário; tela de Configurações.
- Compartilhar (Web Share API) e baixar.
- Telas Sobre e Instalar no dispositivo (guia de PWA para iPhone, Android e computador).
- PWA instalável e offline; identidade visual, favicon e imagem social.
