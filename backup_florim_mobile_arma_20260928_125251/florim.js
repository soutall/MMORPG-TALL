// classes/florim.js — Florim: criatura vegetal, sem braços, com pernas-raiz curtas
(function(){
'use strict';
function corDano(normal,flash){return (window.danoFlashTimer||0)>0?flash:normal;}
window.desenharFlorim=function(x,y,isMoving,angulo,hp,maxHp){
 if(hp<=0||!window.ctx)return;
 const ctx=window.ctx,t=Date.now()/1000,a=angulo||0,passo=isMoving?Math.sin(window.walkCycle||0):0;
 const verde=corDano('#315f2a','#a43f38'),verde2=corDano('#24471f','#7d2f2b'),folha=corDano('#4d8a36','#c64c43'),raiz=corDano('#6b4a2c','#a85b50');
 ctx.save();ctx.translate(x,y+Math.sin(t*2.2)*.5);
 ctx.globalAlpha=.18;ctx.fillStyle='#172b16';ctx.beginPath();ctx.ellipse(12,31,15,4,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 ctx.strokeStyle=raiz;ctx.lineWidth=3.2;ctx.lineCap='round';
 ctx.beginPath();ctx.moveTo(9,27);ctx.quadraticCurveTo(8,30,7+passo*1.2,31);ctx.moveTo(15,27);ctx.quadraticCurveTo(16,30,17-passo*1.2,31);ctx.stroke();
 ctx.strokeStyle='#3d2a1b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(7,31);ctx.lineTo(5,32);ctx.moveTo(17,31);ctx.lineTo(19,32);ctx.stroke();
 const corpo=ctx.createLinearGradient(4,10,20,29);corpo.addColorStop(0,'#568d3b');corpo.addColorStop(.5,verde);corpo.addColorStop(1,verde2);
 ctx.fillStyle=corpo;ctx.strokeStyle='#172f18';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(7,10);ctx.quadraticCurveTo(4,17,5,27);ctx.quadraticCurveTo(12,31,19,27);ctx.quadraticCurveTo(20,17,17,10);ctx.quadraticCurveTo(12,7,7,10);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle=folha;ctx.strokeStyle='#24451f';ctx.lineWidth=.7;
 [[3.8,15,-.55],[20.2,15,.55],[5,22,-.3],[19,22,.3]].forEach(q=>{ctx.beginPath();ctx.ellipse(q[0],q[1],4.2,1.7,q[2],0,Math.PI*2);ctx.fill();ctx.stroke();});
 ctx.fillStyle=corDano('#805332','#b64b43');ctx.beginPath();ctx.arc(12,7.5,4.7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#35251a';ctx.lineWidth=.8;ctx.stroke();
 ctx.fillStyle='#152217';ctx.fillRect(9.7,7,1.3,1.2);ctx.fillRect(13,7,1.3,1.2);
 ctx.fillStyle=folha;ctx.beginPath();ctx.ellipse(8,3.7,3,1.3,-.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(16,3.7,3,1.3,.5,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#c85fb8';for(let i=0;i<5;i++){let q=i*Math.PI*.4+t*.12;ctx.beginPath();ctx.arc(12+Math.cos(q)*3.5,2.7+Math.sin(q)*1.8,1.7,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#f2d25a';ctx.beginPath();ctx.arc(12,2.8,1,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.translate(14,16);ctx.rotate(a);ctx.strokeStyle='#684324';ctx.lineWidth=2.2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,5);ctx.lineTo(0,-12);ctx.stroke();
 ctx.strokeStyle='#a56d39';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-1,-1);ctx.quadraticCurveTo(-5,-4,-2,-8);ctx.stroke();
 ctx.fillStyle='#78a83d';ctx.beginPath();ctx.ellipse(0,-13,3.5,1.6,-.4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d06ac0';ctx.beginPath();ctx.arc(0,-15,2.4,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.restore();if(typeof window.desenharBarraHp==='function')window.desenharBarraHp(x-3,y-8,hp,maxHp);
};
window.enviarAtaqueFlorim=function(anguloForcado,alvoTipo,alvoId){if(window.estaMorto||!window.ws||window.ws.readyState!==WebSocket.OPEN)return;const msg={action:'ataque_florim',angulo:(anguloForcado!==undefined?anguloForcado:window.meuAngulo)};if(alvoTipo&&alvoId){msg.alvoTipo=alvoTipo;msg.alvoId=alvoId;}window.ws.send(JSON.stringify(msg));};
})();