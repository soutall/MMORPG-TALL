const fs = require('fs');

let content = fs.readFileSync('e:/Jogo CELULAR/classes/pikeman.js', 'utf-8');

// 1. Update _foice signature
content = content.replace(
    /function _foice\(ctx, rot, carga, foiceCurta\) \{/,
    'function _foice(ctx, rot, carga, foiceCurta, x, y) {'
);

// 2. Update _foiceCurta signature
content = content.replace(
    /function _foiceCurta\(ctx, rot, carga\) \{\s*_foice\(ctx, rot, carga, true\);\s*\}/,
    'function _foiceCurta(ctx, rot, carga, x, y) {\n        _foice(ctx, rot, carga, true, x, y);\n    }'
);

// 3. Update _foiceNascostas
content = content.replace(
    /function _foiceNascostas\(ctx\) \{([\s\S]*?)_foice\(ctx, -0\.9, 0, false\);([\s\S]*?)\}/,
    'function _foiceNascostas(ctx, x, y) {$1_foice(ctx, -0.9, 0, false, x, y);$2}'
);

// 4. Update calls in window.desenharPikeman
// Only replace if they have exactly 3 args and end with )
content = content.replace(/_foice\(ctx,\s*([^,]+),\s*([^,)]+)\)/g, '_foice(ctx, $1, $2, false, posX, posY)');
content = content.replace(/_foiceCurta\(ctx,\s*([^,]+),\s*([^,)]+)\)/g, '_foiceCurta(ctx, $1, $2, posX, posY)');

// 5. Extract drawing block from _foice and replace
const startMarker = '// haste longa (madeira escura com metal)';
const endMarker = 'ctx.restore();\n        ctx.rotate(-rot);';

let foiceStart = content.indexOf(startMarker);
let foiceEnd = content.indexOf('ctx.restore();', content.indexOf('// runas sombrias na lâmina'));

if (foiceStart > -1 && foiceEnd > -1) {
    let block = content.substring(foiceStart, foiceEnd + 14); // include ctx.restore();

    // Map colors
    block = block.replace(/'rgba\(35,22,12,0\.95\)'/g, 'cBase');
    block = block.replace(/'rgba\(20,18,26,0\.98\)'/g, 'cMeio');
    block = block.replace(/'rgba\(225,225,235,0\.95\)'/g, 'cFio');
    
    // Gema has alpha, we can set globalAlpha before drawing it
    block = block.replace(
        /ctx\.fillStyle = 'rgba\(200,30,60,' \+ Math\.min\(1, brilhoGema\) \+ '\)';/,
        'ctx.save();\n        ctx.globalAlpha = Math.min(1, brilhoGema);\n        ctx.fillStyle = cPonta;'
    );
    // and close save after fill
    block = block.replace(
        /ctx\.fill\(\);\n\s*ctx\.shadowColor = 'rgba\(255,40,110,0\.9\)';/,
        'ctx.fill();\n        ctx.restore();\n        ctx.shadowColor = cPonta;'
    );

    // Runas has alpha
    block = block.replace(
        /ctx\.strokeStyle = 'rgba\(255,40,80,' \+ Math\.min\(0\.95, 0\.25 \+ \(carga \|\| 0\) \* 0\.7\) \+ '\)';/,
        'ctx.save();\n        ctx.globalAlpha = Math.min(0.95, 0.25 + (carga || 0) * 0.7);\n        ctx.strokeStyle = cPonta;'
    );
    // end of block is ctx.restore(); we need to add another ctx.restore() before it
    block = block.replace(/ctx\.restore\(\);$/, 'ctx.restore();\n        ctx.restore();');
    block = block.replace(/ctx\.shadowColor = 'rgba\(255,30,90,0\.9\)';/, 'ctx.shadowColor = cPonta;');

    const newFunction = `
window.desenharFoiceExposta = function(ctx, armaVisualCustom, tam, carga) {
    tam = tam || 1;
    let cv = (armaVisualCustom && armaVisualCustom.customVisual) ? armaVisualCustom.customVisual : {};
    let t = cv.tamanho || 1;
    let l = cv.largura || 1;

    let cBase = cv.cBase || 'rgba(35,22,12,0.95)';
    let cMeio = cv.cMeio || 'rgba(20,18,26,0.98)';
    let cPonta = cv.cPonta || 'rgba(200,30,60,1)';
    let cFio = cv.cFio || 'rgba(225,225,235,0.95)';

    ctx.save();
    ctx.scale(t, l);

    function _agora() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

    ${block}

    ctx.restore();
};
`;
    // Replace the block in _foice with the user snippet
    const replacement = `    let wp = window.inventario ? window.inventario.arma : null;
    let armaV = null;
    if (x === window.meuX && y === window.meuY) { 
        if (wp && wp.customVisual) armaV = wp;
    }
    if (typeof window.desenharFoiceExposta === 'function') window.desenharFoiceExposta(ctx, armaV, tam, carga);`;
    
    content = content.substring(0, foiceStart) + replacement + '\n' + content.substring(foiceEnd + 14);
    
    // Append the new function to the end
    content += newFunction;
    
    fs.writeFileSync('e:/Jogo CELULAR/classes/pikeman.js', content, 'utf-8');
    console.log('SUCCESS');
} else {
    console.log('FAILED TO FIND MARKERS');
}
