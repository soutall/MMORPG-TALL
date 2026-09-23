INTEGRAÇÃO — HUD NOVA DO INVENTÁRIO

1) Substitua:
   inventario.js  -> seu inventario.js
   inventario.css -> seu inventario.css
   dragdrop.css   -> seu dragdrop.css

2) Garanta que a imagem fique em:
   imagem/HUD/iventario.png

3) NÃO é necessário alterar o index.html para esta integração, desde que ele já
   contenha os IDs/classes do inventário atual:
   #inventory-screen
   #inv-window
   #inv-title
   #btn-inv-fechar
   #equip-body
   .inv-slot[data-slot]
   #inv-info
   #inv-botoes
   #mochila-abas
   .mochila-aba
   #mochila-grade
   #inv-comparacao

4) A lógica dos 9 slots do servidor continua preservada.
   O HUD visual tem 8 molduras: a arma secundária aparece como mini-slot
   dentro do slot da arma principal.

5) A mochila passa a usar 30 slots visuais (6x5).
   Quest e cosméticos continuam acessíveis dentro da aba ITENS.

6) O sistema Drag & Drop existente continua sendo usado.
