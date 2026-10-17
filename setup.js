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
   if(r.status===401){var e2=new Error('auth');e2.auth=true;throw e2}
   if(!r.ok){throw new Error('http')}
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
function stepBody(key){
 var u=linkFor(key),pending='<div class="wait">Your LaunchRiot contact will send your '+(key==='whatsapp'?'QR code':'connect link')+' here shortly. You do not need to do anything yet.</div>';
 if(key==='whatsapp'){
  var h='<ol><li>Open WhatsApp on your phone.</li><li>Go to Settings, then Linked devices.</li><li>Tap Link a device and scan the code below.</li></ol>';
  return h+(u?'<img class="qr" alt="WhatsApp QR code" src="'+esc(u)+'">':pending);
 }
 if(key==='gmail')return '<p>Connect your Gmail so your assistant can see your mail and follow-ups.</p>'+(u?'<a class="btn" href="'+esc(u)+'">Connect Gmail</a>':pending);
 var fa=typeof (st||{}).forward_address==='string'&&/^[^\s@<>"]+@[^\s@<>"]+$/.test(st.forward_address)?st.forward_address:null;
 var h2='<p>Outlook connects with a simple forwarding rule:</p><ol><li>Open Outlook and go to Settings, then Mail, then Rules.</li><li>Choose Add new rule and name it "LaunchRiot".</li><li>Condition: Apply to all messages.</li><li>Action: Forward to '+(fa?'<span class="fwd">'+esc(fa)+'</span>':'the address your LaunchRiot contact gives you')+'.</li><li>Save the rule.</li></ol>';
 if(!fa)h2+='<div class="wait">Your LaunchRiot contact will send the forwarding address here shortly.</div>';
 if(u)h2+='<a class="btn" href="'+esc(u)+'">Connect Outlook</a>';
 return h2;
}
var STEPS=[['whatsapp','Connect WhatsApp'],['gmail','Connect Gmail'],['outlook','Connect Outlook']];
function render(){
 if(locked)return;
 var all=STEPS.every(function(s){return st&&st[s[0]]===true}),n=STEPS.filter(function(s){return st&&st[s[0]]===true}).length;
 var active=tr&&tr.status==='active',h='<h1>Set up your workspace</h1><p class="mut">Three quick steps. '+n+' of 3 done.</p>';
 if(!active)h+='<div class="timer" id="timer"><div><div class="mut">Trial time left</div><div class="t" id="clock">--:--:--</div></div><div class="mut">of your 48-hour trial</div></div>';
 if(all)h+='<div class="card alldone"><h2>All set</h2><p class="mut">Everything is connected. Your LaunchRiot contact will take it from here.</p></div>';
 STEPS.forEach(function(s,i){var d=st&&st[s[0]]===true;
  h+='<section class="card'+(d?' done':'')+'" data-step="'+s[0]+'"><div class="step '+(d?'done':'')+'"><span class="num">'+(d?'&#10003;':(i+1))+'</span><div class="tx"><h2>'+s[1]+'</h2></div><span class="pill">'+(d?'Done':'Not done')+'</span></div>'+(d?'':'<div class="body">'+stepBody(s[0])+'</div>')+'</section>'});
 var pl=pkgOptions();
 if(pl.length){
  h+='<section class="card"><h2>Your package</h2><p class="mut">Pick the one that suits you. You can change it later.</p><select id="pkg" aria-label="Package">'+pl.map(function(p){return '<option value="'+esc(p.id)+'"'+(p.id===curPkg()?' selected':'')+'>'+esc(p.label)+'</option>'}).join('')+'</select> <span class="mut" id="pkgmsg" role="status"></span></section>'}
 var keep=document.activeElement&&document.activeElement.id;
 app.innerHTML=h;
 var sel=document.getElementById('pkg');if(sel){sel.onchange=function(){savePkg(sel.value)};if(keep==='pkg')sel.focus()}
 tick();
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
 req('/setup-status').then(function(s){var changed=JSON.stringify(s)!==JSON.stringify(st);st=s;if(changed&&!(saving)&&!(document.activeElement&&document.activeElement.id==='pkg'))render();}).catch(function(e){if(e.locked)lockScreen()}).then(function(){if(!locked)pollT=setTimeout(poll,5000)});
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
