// efeitos/florim_efeitos.js — VFX Florim: raízes, flores, pólen e veneno
(function(){
'use strict';
window.florimSementesVfx=[];window.florimCorrentesVfx=[];window.florimAneisVfx=[];window.florimDebuffsVfx=[];window.florimBasicVfx=[];
function push(a,o){a.push(Object.assign({tempo:0},o));}
window.criarAnimacaoAtaqueBasicoFlorim=function(x,y,ang){push(window.florimBasicVfx,{x:x,y:y,ang:ang||0,vida:260});};
window.criarAnimacaoSementeFlorim=function(id,x,y,raio){push(window.florimSementesVfx,{id:id,x:x,y:y,raio:raio||34,vida:7000,armed:true});};
window.criarAnimacaoSementeFlorimAtivada=function(x,y,aliado){push(window.florimSementesVfx,{x:x,y:y,raio:42,vida:650,ativada:true,aliado:!!aliado});};
window.criarAnimacaoCorrenteFlorim=function(id,x,y,alvoX,alvoY,dur){push(window.florimCorrentesVfx,{id:id,x:x,y:y,alvoX:alvoX,alvoY:alvoY,vida:dur||3000,durMs:dur||3000});};
window.criarAnimacaoAnelFlorim=function(id,x,y,raio,dur){push(window.florimAneisVfx,{id:id,x:x,y:y,raio:raio||85,vida:dur||5000,durMs:dur||5000});};
window.criarAnimacaoDebuffFlorim=function(x,y,raio,dur){push(window.florimDebuffsVfx,{x:x,y:y,raio:raio||170,vida:dur||1000,durMs:dur||1000});};
function atualizar(a,dt){for(let i=a.length-1;i>=0;i--){a[i].tempo+=dt;a[i].vida-=dt;if(a[i].vida<=0)a.splice(i,1);}}
function espinho(ctx,x,y,a,t){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle='#315d27';ctx.strokeStyle='#152d18';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(0,-t);ctx.lineTo(t*.5,t*.35);ctx.lineTo(0,t*.15);ctx.lineTo(-t*.5,t*.35);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
function petala(ctx,x,y,r,cor){ctx.save();ctx.translate(x,y);ctx.rotate(r);ctx.fillStyle=cor;ctx.beginPath();ctx.ellipse(0,-4,2.5,5,0,0,Math.PI*2);ctx.fill();ctx.restore();}
window.desenharEfeitosFlorim=function(){
 if(!window.ctx)return;const ctx=window.ctx,now=performance.now(),dt=Math.min(40,Math.max(1,now-(window._florimVfxTs||now)));window._florimVfxTs=now;
 atualizar(window.florimBasicVfx,dt);atualizar(window.florimSementesVfx,dt);atualizar(window.florimCorrentesVfx,dt);atualizar(window.florimAneisVfx,dt);atualizar(window.florimDebuffsVfx,dt);
 // mira PC
 const mira=typeof window.obterInfoMiraAtiva==='function'?window.obterInfoMiraAtiva():null;
 if(mira&&mira.cfg&&(mira.skill||'').indexOf('florim_')===0){
  ctx.save();ctx.globalAlpha=.9;ctx.strokeStyle=mira.cfg.cor;ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.beginPath();ctx.arc(mira.tx,mira.ty,mira.cfg.raio,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='rgba(210,255,170,.75)';ctx.beginPath();ctx.moveTo(mira.tx-10,mira.ty);ctx.lineTo(mira.tx+10,mira.ty);ctx.moveTo(mira.tx,mira.ty-10);ctx.lineTo(mira.tx,mira.ty+10);ctx.stroke();
  ctx.globalAlpha=.16;ctx.fillStyle=mira.cfg.cor;ctx.beginPath();ctx.arc(mira.tx,mira.ty,mira.cfg.raio,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 // ataque básico: projétil de espinho/semente com rastro
 for(const b of window.florimBasicVfx){const q=1-b.vida/260,dist=20+q*120,px=b.x+Math.cos(b.ang)*dist,py=b.y+Math.sin(b.ang)*dist;ctx.save();ctx.translate(px,py);ctx.rotate(b.ang);ctx.shadowColor='#78b94d';ctx.shadowBlur=12;ctx.fillStyle='#6fae42';ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-5,-3);ctx.lineTo(-2,0);ctx.lineTo(-5,3);ctx.closePath();ctx.fill();ctx.restore();for(let k=0;k<4;k++){ctx.globalAlpha=.5*(1-q);ctx.fillStyle='#b9ec70';ctx.beginPath();ctx.arc(b.x+Math.cos(b.ang)*dist*(k/4),b.y+Math.sin(b.ang)*dist*(k/4),1.5,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
 // sementes armadas/ativadas
 for(const s of window.florimSementesVfx){if(s.ativada){const q=1-s.vida/650;ctx.globalAlpha=.85*(1-q);ctx.strokeStyle=s.aliado?'#79ff9a':'#c96bea';ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x,s.y,10+q*48,0,Math.PI*2);ctx.stroke();for(let k=0;k<14;k++){const a=k*Math.PI*2/14;espinho(ctx,s.x+Math.cos(a)*q*34,s.y+Math.sin(a)*q*20,a,4+q*5);}for(let k=0;k<18;k++){ctx.fillStyle=k%2?'#d7f88b':'#ef8bd9';ctx.beginPath();ctx.arc(s.x+Math.cos(k*2.4)*q*38,s.y+Math.sin(k*2.4)*q*24,1.8,0,Math.PI*2);ctx.fill();}}else{const pulse=1+Math.sin(s.tempo*.008)*.12;ctx.globalAlpha=.9;ctx.shadowColor='#8fd95a';ctx.shadowBlur=12;ctx.fillStyle='#6d9f3d';ctx.beginPath();ctx.ellipse(s.x,s.y+2,7*pulse,4*pulse,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;for(let k=0;k<5;k++)petala(ctx,s.x+Math.cos(k*1.256)*4,s.y-7+Math.sin(k*1.256)*2,k*1.256,'#d66ac7');ctx.fillStyle='#f1d05d';ctx.beginPath();ctx.arc(s.x,s.y-7,2,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
 // corrente de raízes
 for(const c of window.florimCorrentesVfx){const q=Math.min(1,c.vida/450),dx=c.alvoX-c.x,dy=c.alvoY-c.y,d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d;ctx.save();ctx.globalAlpha=q;for(let r=0;r<3;r++){ctx.strokeStyle=r===0?'#365f2b':r===1?'#638f3b':'#9bc65a';ctx.lineWidth=r===0?5:r===1?2.5:1;ctx.beginPath();for(let k=0;k<=18;k++){const u=k/18,wig=Math.sin(u*25+c.tempo*.02+r)*((1-u)*8+2);const px=c.x+dx*u+nx*wig,py=c.y+dy*u+ny*wig;k?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();}for(let k=0;k<10;k++){const u=(k+.5)/10;espinho(ctx,c.x+dx*u,c.y+dy*u,Math.atan2(dy,dx)+Math.sin(c.tempo*.02+k),5);}ctx.globalAlpha=q*.7;ctx.strokeStyle='#b9e76b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(c.alvoX,c.alvoY,20+Math.sin(c.tempo*.02)*4,0,Math.PI*2);ctx.stroke();ctx.restore();}
 // anel de flores e espinhos
 for(const a of window.florimAneisVfx){const q=Math.min(1,a.vida/450),p=1+Math.sin(a.tempo*.012)*.06;ctx.save();ctx.globalAlpha=q*.2;ctx.fillStyle='#5a9b37';ctx.beginPath();ctx.ellipse(a.x,a.y,a.raio*p,a.raio*.5*p,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=q;ctx.strokeStyle='#3f7b2e';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(a.x,a.y,a.raio*p,a.raio*.5*p,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#b5e66e';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(a.x,a.y,a.raio*.82,a.raio*.39,0,0,Math.PI*2);ctx.stroke();for(let k=0;k<18;k++){const u=k/18*Math.PI*2,px=a.x+Math.cos(u)*a.raio*p,py=a.y+Math.sin(u)*a.raio*.5*p;espinho(ctx,px,py,u,6);}for(let k=0;k<10;k++){const u=k/10*Math.PI*2+a.tempo*.001,px=a.x+Math.cos(u)*(a.raio+4),py=a.y+Math.sin(u)*(a.raio+4)*.5;petala(ctx,px,py,u,k%2?'#e78bd7':'#f1d25f');}for(let k=0;k<20;k++){ctx.fillStyle=k%2?'#c8f38b':'#e9a4db';ctx.globalAlpha=q*.65;ctx.beginPath();ctx.arc(a.x+Math.cos(k*2.4+a.tempo*.002)*(a.raio*.65),a.y+Math.sin(k*2.4+a.tempo*.002)*(a.raio*.32),1.5,0,Math.PI*2);ctx.fill();}ctx.restore();}
 // praga: círculo de pólen/folhas/veneno
 for(const d of window.florimDebuffsVfx){const q=Math.min(1,d.vida/350),pulse=1+Math.sin(d.tempo*.01)*.06;ctx.save();ctx.globalAlpha=q*.12;ctx.fillStyle='#587f2e';ctx.beginPath();ctx.arc(d.x,d.y,d.raio*pulse,0,Math.PI*2);ctx.fill();ctx.globalAlpha=q*.55;ctx.strokeStyle='#8fbd4a';ctx.lineWidth=2;ctx.setLineDash([5,8]);ctx.beginPath();ctx.arc(d.x,d.y,d.raio*.88,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);for(let k=0;k<30;k++){const ang=k*2.399+d.tempo*.002,rr=(k%11)/11*d.raio*.82,px=d.x+Math.cos(ang)*rr,py=d.y+Math.sin(ang)*rr*.55;ctx.fillStyle=k%3?'#c5ed75':'#d985c7';ctx.beginPath();ctx.arc(px,py,1.7,0,Math.PI*2);ctx.fill();}ctx.restore();}
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.setLineDash([]);
};
})();