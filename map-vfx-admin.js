/* Editor admin de VFX persistentes do mapa. */
(function () {
    'use strict';
    var tipos = [
        ['lampada','Lampada quente'],['holofote','Holofote'],['fogo','Fogueira'],['tocha','Tocha'],['fumaça','Fumaca volumetrica'],['nuvem','Nuvem baixa'],['névoa','Nevoa rasteira'],['raios','Raios ramificados'],['relampago','Relampago'],['chuva','Chuva'],['tempestade','Tempestade'],['água','Agua corrente'],['ondas','Ondas'],['cachoeira','Cachoeira'],['folhas','Folhas ao vento'],['pétalas','Petalas'],['poeira','Poeira'],['cinzas','Cinzas'],['vaga-lumes','Vaga-lumes'],['borboletas','Borboletas'],['cristais','Cristais flutuantes'],['runas','Runas orbitais'],['portal','Portal magico'],['vórtice','Vortice'],['espinhos','Espinhos'],['grama','Grama balancando'],['neve','Neve'],['brasa','Brasas'],['bolhas','Bolhas'],['estrelas','Estrelas'],['aurora','Aurora'],['sombra','Sombra pulsante']
    ];
    var cores = {lampada:'#ffd166',holofote:'#fff3b0',fogo:'#ff6b35',tocha:'#ff9f1c',fumaça:'#aab7b8',nuvem:'#dce6ee','névoa':'#91b4c7',raios:'#e8f7ff',relampago:'#bde7ff',chuva:'#63b4e8',tempestade:'#7489b8','água':'#38bdf8',ondas:'#52d6e8',cachoeira:'#8be9fd',folhas:'#7abf45',pétalas:'#ff86b7',poeira:'#c6a77b',cinzas:'#9da3a8','vaga-lumes':'#f7e36d',borboletas:'#d99cff',cristais:'#7ee7ff',runas:'#75f0ca',portal:'#b56cff','vórtice':'#c084fc',espinhos:'#a7d129',grama:'#72b75b',neve:'#e8f7ff',brasa:'#ff9f43',bolhas:'#8de7ff',estrelas:'#fff4a3',aurora:'#65e6c0',sombra:'#171020'};
    var lista = [], selecionado = null, armado = false;
    function el(tag, props) { var e=document.createElement(tag); Object.keys(props||{}).forEach(function(k){e[k]=props[k];}); return e; }
    function montar() {
        var bar=document.getElementById('util-buttons'); if(!bar)return;
        var btn=el('button',{id:'btn-admin-vfx',className:'btn-util btn-admin-vfx',textContent:'✨'}); btn.title='Editor de VFX do mapa'; btn.onclick=function(){armado=!armado;btn.classList.toggle('ativo',armado);}; bar.appendChild(btn);
        var screen=el('div',{id:'map-vfx-screen'}), win=el('div',{id:'map-vfx-window'}); screen.appendChild(win);
        win.innerHTML='<div class="map-vfx-title">✨ VFX DO MAPA</div><label>EFEITO<select id="map-vfx-tipo"></select></label><label>ESCALA<input id="map-vfx-escala" type="range" min="0.3" max="4" step="0.1" value="1"></label><label>INTENSIDADE<input id="map-vfx-intensidade" type="range" min="0.1" max="2" step="0.1" value="1"></label><label>RAIO<input id="map-vfx-raio" type="range" min="20" max="260" step="5" value="80"></label><label>COR<input id="map-vfx-cor" type="color" value="#ffd166"></label><div id="map-vfx-pos"></div><div class="map-vfx-actions"><button id="map-vfx-save">SALVAR</button><button id="map-vfx-delete">EXCLUIR</button><button id="map-vfx-close">FECHAR</button></div>';
        document.body.appendChild(screen);
        var select=document.getElementById('map-vfx-tipo'); tipos.forEach(function(t){select.appendChild(el('option',{value:t[0],textContent:t[1]}));});
        document.getElementById('map-vfx-close').onclick=function(){fechar();};
        document.getElementById('map-vfx-save').onclick=salvar;
        document.getElementById('map-vfx-delete').onclick=excluir;
        select.onchange=function(){document.getElementById('map-vfx-cor').value=cores[select.value]||'#ffd166';};
    }
    window.mostrarBotaoVfxAdmin=function(){
        var btn=document.getElementById('btn-admin-vfx');
        if(btn) btn.style.display='flex';
    };
    function abrir(vfx){selecionado=vfx||{x:Math.round(window.mouseWorldX||window.meuX+12),y:Math.round(window.mouseWorldY||window.meuY+16),tipo:'lampada',escala:1,intensidade:1,raio:80,cor:'#ffd166'}; document.getElementById('map-vfx-tipo').value=selecionado.tipo;document.getElementById('map-vfx-escala').value=selecionado.escala||1;document.getElementById('map-vfx-intensidade').value=selecionado.intensidade||1;document.getElementById('map-vfx-raio').value=selecionado.raio||80;document.getElementById('map-vfx-cor').value=selecionado.cor||cores[selecionado.tipo]||'#ffd166';document.getElementById('map-vfx-pos').textContent='X: '+Math.round(selecionado.x)+' · Y: '+Math.round(selecionado.y);document.getElementById('map-vfx-delete').style.display=vfx?'block':'none';document.getElementById('map-vfx-screen').style.display='flex';}
    function fechar(){document.getElementById('map-vfx-screen').style.display='none';selecionado=null;}
    function salvar(){if(!window.ws||window.ws.readyState!==1)return;var novo={id:selecionado&&selecionado.id||('vfx_'+Date.now().toString(36)),x:selecionado.x,y:selecionado.y,tipo:document.getElementById('map-vfx-tipo').value,escala:Number(document.getElementById('map-vfx-escala').value),intensidade:Number(document.getElementById('map-vfx-intensidade').value),raio:Number(document.getElementById('map-vfx-raio').value),cor:document.getElementById('map-vfx-cor').value};window.ws.send(JSON.stringify({action:'admin_map_vfx',sub:selecionado.id?'editar':'criar',vfx:novo}));fechar();}
    function excluir(){if(!selecionado||!window.ws||window.ws.readyState!==1)return;window.ws.send(JSON.stringify({action:'admin_map_vfx_excluir',id:selecionado.id}));fechar();}
    function desenhar(v,t){
        var eLuz = (typeof window.isEfeitoLuz === 'function') 
            ? window.isEfeitoLuz(v.tipo) 
            : (v.tipo === 'lampada' || v.tipo === 'holofote' || v.tipo === 'tocha' || v.tipo === 'fogo' || v.tipo === 'brasa');
        var fatorLuz = 1.0;
        if (eLuz) {
            fatorLuz = (typeof window.obterFatorLuzDiaNoite === 'function') ? window.obterFatorLuzDiaNoite() : 1.0;
            // Efeitos de luz apagam de dia (06:00 às 19:00). Só desenham se a janela do editor estiver aberta.
            if (!window.mapVfxAberto && fatorLuz <= 0.001) return;
        }
        var c=window.ctx, x=v.x,y=v.y,r=(v.raio||80)*(v.escala||1),p=(v.intensidade||1)*(eLuz ? fatorLuz : 1.0),a=t/1000,seed=0;
        String(v.id||v.tipo).split('').forEach(function(ch){seed=(seed*31+ch.charCodeAt(0))%997;});
        var fase=(seed/997)*Math.PI*2; c.save();c.translate(x,y);c.globalAlpha=.75; c.fillStyle=v.cor; c.strokeStyle=v.cor;c.shadowColor=v.cor;c.shadowBlur=18*p;
        function aleatorio(i){return Math.abs(Math.sin(seed*12.9898+i*78.233));}
        function dot(i,n,size){var q=a*(.4+aleatorio(i)*.35)+i*7.3+fase, rr=r*(.25+.75*Math.abs(Math.sin(a*(.7+aleatorio(i)*.8)+i))), drift=Math.sin(a*.8+i+fase)*r*.08;c.beginPath();c.arc(Math.cos(q)*rr+drift,Math.sin(q)*rr,size*p*(.7+aleatorio(i+4)*.7),0,Math.PI*2);c.fill();}
        if(v.tipo==='lampada'||v.tipo==='holofote'||v.tipo==='sombra'){
            if(v.tipo!=='sombra'){
                c.globalAlpha=.22*p;c.beginPath();c.arc(0,0,r*.75,0,Math.PI*2);c.fill();
                c.globalAlpha=.45*p;c.beginPath();c.arc(0,0,r*.35,0,Math.PI*2);c.fill();
                c.globalAlpha=.95*Math.min(1,p);c.beginPath();c.arc(0,0,(6+Math.sin(a*4+fase)*0.8)*(v.escala||1),0,Math.PI*2);c.fill();
            } else {
                c.globalAlpha=.18*p;c.beginPath();c.arc(0,0,r*.55,0,Math.PI*2);c.fill();
                c.globalAlpha=.8;c.beginPath();c.arc(0,0,5*p,0,Math.PI*2);c.fill();
            }
        }
        else if(v.tipo==='fogo'||v.tipo==='tocha'||v.tipo==='brasa'){for(var i=0;i<18;i++)dot(i,18,3+(i%4));c.globalAlpha=.25*p;c.beginPath();c.arc(Math.sin(a+fase)*r*.12,-r*.2,r*.65,0,Math.PI*2);c.fill();}
        else if(v.tipo==='fumaça'||v.tipo==='nuvem'||v.tipo==='névoa'||v.tipo==='cinzas'||v.tipo==='poeira'){c.globalAlpha=.16*p;for(var j=0;j<10;j++){c.beginPath();c.arc(Math.sin(a+j)*r*.5,Math.cos(a*.7+j)*r*.3-j*2,8+(j%4)*4,0,Math.PI*2);c.fill();}}
        else if(v.tipo==='raios'||v.tipo==='relampago'||v.tipo==='tempestade'){c.lineWidth=2*p;for(var k=0;k<5;k++){c.beginPath();c.moveTo((k-2)*r*.25,-r);c.lineTo((k-2)*r*.25+Math.sin(a+k)*12,0);c.lineTo((k-2)*r*.25-8,r);c.stroke();}}
        else if(v.tipo==='chuva'||v.tipo==='neve'||v.tipo==='água'||v.tipo==='cachoeira'){c.lineWidth=2*p;for(var l=0;l<14;l++){var xx=(l-7)*r*.12+Math.sin(a+l)*8;c.beginPath();c.moveTo(xx,-r);c.lineTo(xx+6,r);c.stroke();}}
        else if(v.tipo==='ondas'){c.lineWidth=2*p;for(var w=0;w<5;w++){c.beginPath();for(var z=-r;z<=r;z+=6){var yy=Math.sin(z*.08+a+w)*5+w*8;z===-r?c.moveTo(z,yy):c.lineTo(z,yy);}c.stroke();}}
        else if(v.tipo==='folhas'||v.tipo==='pétalas'||v.tipo==='borboletas'||v.tipo==='grama'){for(var m=0;m<22;m++)dot(m,22,2+(m%3));}
        else if(v.tipo==='cristais'||v.tipo==='runas'||v.tipo==='portal'||v.tipo==='vórtice'||v.tipo==='estrelas'||v.tipo==='aurora'){c.lineWidth=2*p;c.rotate(a*.2);for(var n=0;n<8;n++){var an=n*Math.PI/4;c.beginPath();c.moveTo(Math.cos(an)*r*.25,Math.sin(an)*r*.25);c.lineTo(Math.cos(an)*r,Math.sin(an)*r);c.stroke();}}
        else if(v.tipo==='espinhos'){c.lineWidth=3*p;for(var h=0;h<8;h++){c.beginPath();c.moveTo(h*r/4-r,0);c.lineTo(h*r/4-r+12,-20);c.stroke();}}
        else {for(var q=0;q<24;q++)dot(q,24,2);}
        if(v.tipo==='vaga-lumes'||v.tipo==='estrelas'||v.tipo==='aurora'){c.globalAlpha=.9;for(var s=0;s<10;s++){var tw=.5+.5*Math.sin(a*2.5+s+fase);c.beginPath();c.arc(Math.cos(a*(.3+tw*.4)+s)*r*.8,Math.sin(a*(.4+tw*.3)+s)*r*.55,1+tw*2,0,Math.PI*2);c.fill();}}
        c.restore();
    }
    window.receberVfxMapa=function(vfx){lista=vfx||[];};
    window.desenharVfxMapa=function(){if(!window.ehAdmin&&(!window.vfxMapa||!window.vfxMapa.length))return;var mapa=window.currentMap||'cidade',agora=Date.now();(window.vfxMapa||[]).forEach(function(v){if(!v.mapa||v.mapa===mapa)desenhar(v,agora);});};
    window.tentarAbrirVfxMapa=function(wx,wy){if(!window.ehAdmin||!armado||window.spawnAdminAberto||window.mapVfxAberto)return false;window.mouseWorldX=wx;window.mouseWorldY=wy;armado=false;document.getElementById('btn-admin-vfx').classList.remove('ativo');abrir(null);return true;};
    window.selecionarVfxMapa=function(wx,wy){if(!window.ehAdmin||!window.vfxMapa)return false;var achado=null,dist=36;window.vfxMapa.forEach(function(v){if(!v.mapa||v.mapa===window.currentMap){var d=Math.hypot(v.x-wx,v.y-wy);if(d<dist){dist=d;achado=v;}}});if(achado){abrir(achado);return true;}return false;};
    window.mapVfxAberto=false;
    var oldAbrir=abrir; document.addEventListener('click',function(){window.mapVfxAberto=document.getElementById('map-vfx-screen').style.display==='flex';});
    montar();
})();
