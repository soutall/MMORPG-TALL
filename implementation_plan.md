# Plano: Banco de Dados de Itens e Forjador Avançado

## 1. Banco de Dados Persistente
- Criar `banco_itens.json` no servidor para salvar os itens criados.
- Ao reiniciar, o `server.js` carregará esses itens injetando-os na lista de possíveis drops do jogo, fazendo com que itens criados no Forjador passem a dropar de monstros!
- Logs com ID Único: Usar o sistema de UUID do `equipamentos.js` para garantir que o item forjado ganhe um UID real rastreável contra dupes.

## 2. Nova UI do Forjador
- **Seletor de Classe:** Dropdown listando todas as classes (Guerreiro, Sniper, Dronemaster, etc.).
- **Seletor de Slot:** Dropdown listando (Arma Primária, Arma Secundária, Capacete, Peitoral, etc.).
- **Preview Dinâmico:** Se for Arma Primária, o Canvas vai carregar o modelo certo (Espada para Guerreiro, Drone para Dronemaster, etc.). Precisaremos exportar as funções de desenho de cada classe (ex: `desenharDrone` do dronemaster.js).

## 3. Lógica de Inventário
- Reverter o auto-equipamento para que o item caia apenas na MOCHILA, permitindo que o Admin logue na classe certa para testar.
- Configurar o `classeRestrita` e `subTipo` do item forjado para que o jogo saiba de qual classe ele pertence (corrigindo o erro de "arma não é para minha classe").

Aguardando aprovação para prosseguir com a codificação.
