(function(){
'use strict';
var DOMAIN='145-241-118-107.sslip.io',WA='https://wa.me/971586444285',MAIL='mailto:hello@launchriot.online';
var app=document.getElementById('app'),S='',C='',API='',st=null,tr=null,team=null,trAt=0,locked=false,pollT=null,tickT=null,slowT=null,first=true,saving=false,pkgSel=null;
var cfg=window.LR_TEST_API||null;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function readHash(){
 var h=location.hash.replace(/^#/,''),p={};h.split('&').forEach(function(x){var i=x.indexOf('=');if(i>0)p[x.slice(0,i)]=decodeURIComponent(x.slice(i+1))});
 if(p.s){try{sessionStorage.setItem('lr_s',p.s)}catch(e){}}
 if(p.c){try{sessionStorage.setItem('lr_c',p.c)}catch(e){}}
 if(location.hash){try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}}
 try{S=p.s||sessionStorage.getItem('lr_s')||'';C=p.c||sessionStorage.getItem('lr_c')||''}catch(e){S=p.s||'';C=p.c||''}
 C=/^[a-z0-9-]{4,32}$/.test(C)?C:'';
 API=cfg||(C?'https://api-'+C+'.'+DOMAIN:'');
}
function req(path,opt){
 opt=opt||{};var h={'Authorization':'Bearer '+S};if(opt.body)h['Content-Type']='application/json';
 return fetch(API+path,{method:opt.method||'GET',headers:h,body:opt.body}).then(function(r){
  return r.text().then(function(t){var j=null;try{j=JSON.parse(t)}catch(e){}
   if(r.status===403&&j&&j.locked){var e=new Error('locked');e.locked=true;throw e}
   if(r.status===401&&!opt.own401){var e2=new Error('auth');e2.auth=true;throw e2}
   if(!r.ok){var e3=new Error('http');e3.status=r.status;throw e3}
   return j||{}})});
}
function retry(fn,tries,delay){return fn().catch(function(e){if(e.locked||e.auth||tries<=1)throw e;return new Promise(function(ok){setTimeout(ok,delay)}).then(function(){return retry(fn,tries-1,delay)})})}
function fmt(sec){sec=Math.max(0,Math.floor(sec));var h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;function p(n){return n<10?'0'+n:''+n}return p(h)+':'+p(m)+':'+p(s)}
function left(){return tr&&tr.seconds_remaining!=null?Math.max(0,tr.seconds_remaining-(Date.now()-trAt)/1000):null}
function loading(msg){app.innerHTML='<div class="center"><div class="spin"></div><h1>Getting your workspace ready</h1><p class="mut">'+esc(msg||'This can take up to 20 seconds the first time. Please keep this page open.')+'</p></div>'}
function lockScreen(){
 locked=true;clearTimeout(pollT);clearInterval(tickT);
 app.innerHTML='<div class="center lock"><h1>Contact LaunchRiot to continue</h1><p class="mut">Your trial access has ended. Your information is safe and kept.</p><div class="btns"><a class="btn" href="'+WA+'">Book a demo on WhatsApp</a><a class="btn alt" href="'+MAIL+'">hello@launchriot.online</a></div></div>';
}
function badLink(){app.innerHTML='<div class="center"><h1>This link is not complete</h1><p class="mut">Please ask your LaunchRiot contact for a new setup link.</p><div class="btns"><a class="btn" href="'+WA+'">Message us on WhatsApp</a><a class="btn alt" href="'+MAIL+'">hello@launchriot.online</a></div></div>'}
function failScreen(){app.innerHTML='<div class="center"><h1>We could not load your setup</h1><p class="mut">Please try again in a moment.</p><div class="btns"><button class="btn" id="again">Try again</button><a class="btn alt" href="'+WA+'">Contact LaunchRiot</a></div></div>';document.getElementById('again').onclick=start}
/* ---- connect wiring: the ONLY place that reads QR / connect links from the status ---- */
function linkFor(key){
 var o=st||{},l=o.links&&o.links[key];var u=null;
 if(l&&typeof l==='object')u=l.qr_url||l.connect_url||l.url;else if(typeof l==='string')u=l;
 u=u||o[key+'_qr_url']||o[key+'_connect_url']||(key==='whatsapp'?o.qr_url:o.connect_url&&o.connect_url[key]);
 return typeof u==='string'&&(/^https:\/\//.test(u)||/^data:image\/(png|jpeg|svg\+xml);/.test(u))?u:null;
}
function steps(key){var o=st||{},l=o.links&&o.links[key],a=(l&&l.instructions)||o[key+'_instructions'];return Array.isArray(a)?a.filter(function(x){return typeof x==='string'&&x}).slice(0,10):[]}
function linkify(t){return esc(t).replace(/https:\/\/[^\s<"]+/g,function(u){return '<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+u.replace(/^https:\/\//,'')+'</a>'})}
function olist(a){return a.length?'<ol>'+a.map(function(x){return '<li>'+linkify(x)+'</li>'}).join('')+'</ol>':''}
var gmEmail='';
function stepBody(key){
 var u=linkFor(key),pending='<div class="wait">Your LaunchRiot contact will send your QR code here shortly. You do not need to do anything yet.</div>';
 if(key==='whatsapp'){
  if(!u)return pending;
  return '<ol><li>Open WhatsApp on your phone.</li><li>Go to Settings, then Linked devices.</li><li>Tap Link a device and scan the code below.</li></ol><img class="qr" alt="WhatsApp QR code" src="'+esc(u)+'">';
 }
 if(key==='gmail'){
  return '<p>Connect your Gmail so your assistant can see your mail and follow-ups.</p>'+olist(steps('gmail'))+
  '<form id="gmform" autocomplete="off" novalidate><label for="gmemail">Gmail address</label><input id="gmemail" name="e" type="email" inputmode="email" autocomplete="off" autocapitalize="off" value="'+esc(gmEmail)+'" placeholder="you@gmail.com">'+
  '<label for="gmpw">App password</label><input id="gmpw" name="p" type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false" placeholder="16-character password">'+
  '<div class="err" id="gmerr" role="alert"></div><button class="btn" id="gmgo" type="submit">Connect Gmail</button></form>';
 }
 return '<p>Outlook connects with a simple forwarding rule, sending your Outlook mail to your Gmail.</p>'+olist(steps('outlook'))+'<button class="btn alt" id="oldone" type="button">I\'ve set this up</button> <span class="mut" id="olmsg" role="status"></span>';
}
function formBusy(){var p=document.getElementById('gmpw'),e=document.getElementById('gmemail'),a=document.activeElement;return !!((p&&p.value)||(e&&e.value)||(a&&a.id&&/^(gmpw|gmemail|pkg)$/.test(a.id)))}
var MSG={401:"That password didn't work, please check and try again",429:'Too many tries, please wait a few minutes',400:'Please enter your Gmail address and the app password',502:'We could not reach Gmail just now, please try again in a moment'};
function wireForms(){
 var f=document.getElementById('gmform');
 if(f)f.onsubmit=function(ev){ev.preventDefault();
  var em=document.getElementById('gmemail'),pw=document.getElementById('gmpw'),er=document.getElementById('gmerr'),go=document.getElementById('gmgo');
  gmEmail=em.value.trim();er.textContent='';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmEmail)||!pw.value.trim()){er.textContent=MSG[400];return}
  go.disabled=true;go.textContent='Connecting...';saving=true;
  var body=JSON.stringify({email:gmEmail,app_password:pw.value});pw.value='';
  retryNet(function(){return req('/mail/connect',{method:'PUT',body:body,own401:true})}).then(function(){saving=false;body=null;return refresh()}).catch(function(e){
   saving=false;body=null;if(e.locked)return lockScreen();if(e.auth)return badLink();
   var er2=document.getElementById('gmerr'),g2=document.getElementById('gmgo');
   if(er2)er2.textContent=MSG[e.status]||'Something went wrong, please try again';if(g2){g2.disabled=false;g2.textContent='Connect Gmail'}});
 };
 var o=document.getElementById('oldone');
 if(o)o.onclick=function(){o.disabled=true;var m=document.getElementById('olmsg');
  req('/mail/outlook',{method:'PUT',body:JSON.stringify({done:true})}).then(refresh).catch(function(e){if(e.locked)return lockScreen();o.disabled=false;if(m)m.textContent='Could not save, please try again'})};
 var d=document.getElementById('disc'),dc=document.getElementById('disc2');
 if(d)d.onclick=function(){document.getElementById('discbox').hidden=false;d.hidden=true};
 var dn=document.getElementById('discno');if(dn)dn.onclick=function(){document.getElementById('discbox').hidden=true;d.hidden=false};
 var dy=document.getElementById('discyes');if(dy)dy.onclick=function(){dy.disabled=true;
  req('/mail/disconnect',{method:'DELETE'}).then(function(){gmEmail='';return refresh()}).catch(function(e){if(e.locked)return lockScreen();dy.disabled=false;var m=document.getElementById('discmsg');if(m)m.textContent='Could not disconnect, please try again'})};
}
function refresh(){return req('/setup-status').then(function(s){st=s;render()})}
function retryNet(fn){return fn().catch(function(e){if(e.status||e.locked||e.auth)throw e;return new Promise(function(ok){setTimeout(ok,3000)}).then(function(){return retry(fn,6,3000)})})}
function discBody(){return '<div class="body"><button class="linkbtn" id="disc" type="button">Disconnect Gmail</button><div id="discbox" hidden><p>Disconnect Gmail? Your assistant will stop seeing your mail and stored mail will be removed.</p><button class="btn alt" id="discyes" type="button">Yes, disconnect</button> <button class="btn alt" id="discno" type="button">Keep it</button> <span class="mut" id="discmsg" role="status"></span></div></div>'}
var STEPS=[['whatsapp','Connect WhatsApp'],['gmail','Connect Gmail'],['outlook','Connect Outlook']];
function render(){
 if(locked)return;
 var all=STEPS.every(function(s){return st&&st[s[0]]===true}),n=STEPS.filter(function(s){return st&&st[s[0]]===true}).length;
 var active=tr&&tr.status==='active',h='<h1>Set up your workspace</h1><p class="mut">Three quick steps. '+n+' of 3 done.</p>';
 if(!active)h+='<div class="timer" id="timer"><div><div class="mut">Trial time left</div><div class="t" id="clock">--:--:--</div></div><div class="mut">of your 48-hour trial</div></div>';
 if(all)h+='<div class="card alldone"><h2>All set</h2><p class="mut">Everything is connected. Your LaunchRiot contact will take it from here.</p></div>';
 STEPS.forEach(function(s,i){var d=st&&st[s[0]]===true;
  h+='<section class="card'+(d?' done':'')+'" data-step="'+s[0]+'"><div class="step '+(d?'done':'')+'"><span class="num">'+(d?'&#10003;':(i+1))+'</span><div class="tx"><h2>'+s[1]+'</h2></div><span class="pill">'+(d?'Done':'Not done')+'</span></div>'+(d?(s[0]==='gmail'?discBody():''):'<div class="body">'+stepBody(s[0])+'</div>')+'</section>'});
 var pl=pkgOptions();
 if(pl.length){
  h+='<section class="card"><h2>Your package</h2><p class="mut">Pick the one that suits you. You can change it later.</p><select id="pkg" aria-label="Package">'+pl.map(function(p){return '<option value="'+esc(p.id)+'"'+(p.id===curPkg()?' selected':'')+'>'+esc(p.label)+'</option>'}).join('')+'</select> <span class="mut" id="pkgmsg" role="status"></span></section>'}
 var keep=document.activeElement&&document.activeElement.id;
 app.innerHTML=h;
 var sel=document.getElementById('pkg');if(sel){sel.onchange=function(){savePkg(sel.value)};if(keep==='pkg')sel.focus()}
 wireForms();tick();
}
function curPkg(){return pkgSel!=null?pkgSel:(st&&st.package)||(team&&team.package)}
function pkgOptions(){var L=st&&st.package_labels,ids=(st&&st.package_types)||[],out=[];
 if(!Array.isArray(L))return out;
 L.forEach(function(x){if(x&&typeof x.id==='string'&&typeof x.label==='string'&&x.label&&x.label!==x.id&&(!ids.length||ids.indexOf(x.id)>=0))out.push(x)});return out}
function savePkg(v){var m=document.getElementById('pkgmsg');if(m)m.textContent='Saving...';saving=true;
 req('/package',{method:'PUT',body:JSON.stringify({package:v})}).then(function(){pkgSel=v;saving=false;var m2=document.getElementById('pkgmsg');if(m2)m2.textContent='Saved'}).catch(function(e){saving=false;if(e.locked)return lockScreen();var m3=document.getElementById('pkgmsg');if(m3)m3.textContent='Could not save, please try again'})}
function tick(){var c=document.getElementById('clock');if(!c)return;var l=left();if(l==null)return;c.textContent=fmt(l);var t=document.getElementById('timer');if(t)t.className='timer'+(l<6*3600?' low':'');if(l<=0&&tr&&tr.status==='trial'){syncTrial()}}
function syncTrial(){return req('/trial').then(function(t){if(t.locked||t.status==='locked')return lockScreen();tr=t;trAt=Date.now();tick()}).catch(function(e){if(e.locked)lockScreen()})}
function poll(){
 if(locked)return;
 req('/setup-status').then(function(s){var changed=JSON.stringify(s)!==JSON.stringify(st);st=s;if(changed&&!saving&&!formBusy())render();}).catch(function(e){if(e.locked)lockScreen()}).then(function(){if(!locked)pollT=setTimeout(poll,5000)});
}
function start(){
 clearTimeout(pollT);clearInterval(tickT);clearTimeout(slowT);
 if(!S||!API)return badLink();
 loading();
 slowT=setTimeout(function(){loading('Still setting things up. Thank you for your patience.')},12000);
 retry(function(){return req('/trial')},8,3000).then(function(t){
  clearTimeout(slowT);
  if(t.locked||t.status==='locked')return lockScreen();
  tr=t;trAt=Date.now();
  return retry(function(){return req('/setup-status')},4,2000).then(function(s){st=s;
   return req('/team').then(function(x){team=x}).catch(function(e){if(e.locked)throw e;team=null})
  }).then(function(){render();tickT=setInterval(tick,1000);setInterval(function(){if(!locked)syncTrial()},60000);pollT=setTimeout(poll,5000)});
 }).catch(function(e){clearTimeout(slowT);if(e.locked)return lockScreen();if(e.auth)return badLink();failScreen()});
}
readHash();start();
})();
