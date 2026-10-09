# Modo Melhorado

Camada cosmética opcional para a versão web Canvas 2D. Não muda dano, vida,
movimento, IA, colisões, economia ou loot; não instala dependências nem adiciona
assets.

## Ativação

- **PC:** pressione `F8`.
- **PC e mobile:** Configurações → Visual → Modo Melhorado.
- **Inicialização no navegador:** acrescente `?enhanced=1` à URL.
- **Diagnóstico:** `?enhanced=1&enhancedOff=camera,combat` desliga os módulos
  listados, sem desligar os demais.
- **Acessibilidade:** “Reduzir tremor e movimento” desliga o shake e as faíscas
  adicionais; a preferência `prefers-reduced-motion` do navegador também é
  respeitada.

O modo começa desligado. Ao desligar, os módulos removem seus efeitos temporários
e não alteram parâmetros da simulação original.

## Módulos e limites

| Módulo | Implementação | Estimativa inicial (não medida) |
|---|---|---:|
| Câmera | Shake curto por impulso nos impactos já recebidos do servidor | < 0,1 ms/quadro |
| Combate | Faíscas em pool limitado de 64 partículas nos impactos suportados | 0,1–0,6 ms/quadro |
| Atmosfera | 18 partículas ambientes leves, sem alocação por quadro | 0,1–0,8 ms/quadro |
| Sombras | Elipses simples no chão sob jogadores | 0,1–0,5 ms/quadro |

As faixas são apenas hipóteses para orientar a medição; não representam
resultados de benchmark e não devem ser somadas como custo garantido. A meta é
manter o conjunto perto de 1 ms/quadro, removendo ou simplificando módulos se a
medição real não atender ao objetivo.

O Canvas 2D atual não fornece shader de pós-processamento nem leitura de tela.
Por isso, normal maps e distorção/bloom full-screen ficaram de fora. Também não
foram adicionados hitstop ou câmera lenta, para não interferir com a simulação
multiplayer e timers. Os sons existentes não foram duplicados nem roteados por
novos filtros. Nenhum asset externo foi usado; não há licença de asset nova a
registrar.

## Validação

Na execução da suíte completa (43 arquivos), 209 de 213 testes passaram. Os 4
que falharam cobrem renderizadores de classe, telegráfo da Druaase, objetos da
vila e steering de monstros — áreas fora dos módulos deste modo. Os testes
direcionados do modo, renderização, iluminação e reconexão passaram. A página local também foi
verificada com `F8`, Configurações e `?enhanced=1`.

O projeto não tem um executável nativo separado; a release é a versão web. Os
FPS médio, 1% low, pior quadro, custo por módulo e capturas A/B no trajeto fixo
**ainda não foram medidos**: esta sessão não tem um personagem autenticado nem
um dispositivo/jornada de referência. O HUD `?perf=1` pode ser usado na
medição antes/depois, em janela e tela cheia, no mesmo navegador e hardware.
