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
 locked=true;clearTimeout(pollT);clearInterval(tickT);waStop();
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
function linkify(t){return esc(t)}
function olist(a){return a.length?'<ol>'+a.map(function(x){return '<li>'+linkify(x)+'</li>'}).join('')+'</ol>':''}
var gmEmail='',wa={state:null,url:null,connected:false,phone:null},waT=null,waOn=false;
function waState(){var l=st&&st.links&&st.links.whatsapp;return wa.state||(l&&l.state)||null}
function waUrl(){var u=wa.url;if(u==null&&wa.state==null)u=linkFor('whatsapp');return typeof u==='string'&&/^(data:image\/(png|jpeg);base64,|https:\/\/)/.test(u)?u:null}
function waBody(){
 var u=waUrl(),sv=waState();
 if(sv==='unavailable'&&!u)return '<div class="wait">Your LaunchRiot contact will send your QR code here shortly. You do not need to do anything yet.</div>';
 if(u)return '<ol><li>Open WhatsApp on your phone.</li><li>Go to Settings, then Linked devices.</li><li>Tap Link a device and scan the code below.</li></ol><img class="qr" alt="WhatsApp QR code" src="'+esc(u)+'"><p class="mut">The code refreshes by itself. If it stops working, wait a moment for a new one.</p>';
 if(sv==='connecting')return '<div class="wait">Connecting your WhatsApp... one moment.</div>';
 return '<div class="wait"><span class="dots">Preparing your code...</span></div>';
}
function waDoneBody(){return wa.phone?'<div class="body"><p class="mut">Connected phone: <b>'+esc(wa.phone)+'</b></p></div>':''}
function updateWA(){var el=document.querySelector('[data-step=whatsapp] .body');if(el&&!locked)el.innerHTML=waBody()}
function waStop(){clearTimeout(waT);waT=null;waOn=false}
function waLoop(){
 if(locked||!st||st.whatsapp===true||wa.connected){waStop();return}
 waOn=true;
 req('/whatsapp/qr').then(function(r){
  wa.state=typeof r.state==='string'?r.state:null;wa.url=(typeof r.qr_url==='string'&&r.qr_url)?r.qr_url:null;
  if(r.connected===true||wa.state==='connected'){wa.connected=true;wa.url=null;return waDone()}
  updateWA();
 }).catch(function(e){if(e.locked)return lockScreen();if(e.auth)return badLink()}).then(function(){if(!locked&&waOn&&!wa.connected&&st&&st.whatsapp!==true)waT=setTimeout(waLoop,4000)});
}
function waDone(){waStop();
 return req('/whatsapp/status').then(function(r){wa.phone=typeof r.phone==='string'?r.phone:null}).catch(function(e){if(e.locked)throw e}).then(function(){return refresh()}).catch(function(e){if(e.locked)lockScreen()})}
function waEnsure(){if(locked||!st)return;if(st.whatsapp===true){waStop();if(!wa.phone&&!wa.fetching&&!wa.tried){wa.fetching=true;wa.tried=true;req('/whatsapp/status').then(function(r){wa.phone=typeof r.phone==='string'?r.phone:null;wa.fetching=false;render()}).catch(function(e){wa.fetching=false;if(e.locked)lockScreen()})}return}
 wa.connected=false;if(!waOn)waLoop()}

function appLink(){var l=st&&st.links&&st.links.gmail,u=l&&l.connect_url;return (typeof u==='string'&&/^https:\/\//.test(u))?'<p><a class="btn alt" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">Create an app password</a></p>':''}
function stepBody(key){
 var u=linkFor(key),pending='<div class="wait">Your LaunchRiot contact will send your QR code here shortly. You do not need to do anything yet.</div>';
 if(key==='whatsapp')return waBody();
 if(key==='gmail'){
  return '<p>Connect your Gmail so your assistant can see your mail and follow-ups.</p>'+olist(steps('gmail'))+appLink()+
  '<form id="gmform" autocomplete="off" novalidate><label for="gmemail">Gmail address</label><input id="gmemail" name="e" type="email" inputmode="email" autocomplete="off" autocapitalize="off" value="'+esc(gmEmail)+'" placeholder="you@gmail.com">'+
  '<label for="gmpw">App password</label><input id="gmpw" name="p" type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false" placeholder="16-character password">'+
  '<div class="err" id="gmerr" role="alert"></div><button class="btn" id="gmgo" type="submit">Connect Gmail</button></form>';
 }
 return '<p>Outlook connects with a simple forwarding rule, sending your Outlook mail to your Gmail.</p>'+olist(steps('outlook'))+'<button class="btn alt" id="oldone" type="button">I\'ve set this up</button> <span class="mut" id="olmsg" role="status"></span>';
}
function formBusy(){var ae=document.activeElement;if(ae&&ae.tagName==='TEXTAREA')return true;var p=document.getElementById('gmpw'),e=document.getElementById('gmemail'),a=document.activeElement;return !!((p&&p.value)||(e&&e.value)||(a&&a.id&&/^(gmpw|gmemail|pkg)$/.test(a.id)))}
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

/* ---- inbox sections: To do / Replies to approve / Needs your attention ---- */
var inb={todo:null,drafts:null,attn:null,ok:false},dirty={},inT=null,inMsg={};
function usable(){return !!(st&&(st.whatsapp===true||st.gmail===true||st.outlook===true))}
function fdate(v){if(!v)return '';var d=new Date(v);return isNaN(d)?'':d.toLocaleString([], {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
function chan(c){return c==='whatsapp'?'WhatsApp':(c==='email'?'Email':'Message')}
function arr(x){return x&&Array.isArray(x.items)?x.items:[]}
function loadInbox(){
 if(locked||!usable())return Promise.resolve();
 function g(p){return req(p).catch(function(e){if(e.locked||e.auth)throw e;return null})}
 return Promise.all([g('/tasks?status=open'),g('/followups?status=open_all'),g('/drafts?status=pending'),g('/inbox/messages?needs_owner=true')]).then(function(r){
  var n={todo:r[0]===null&&r[1]===null?null:{tasks:arr(r[0]).filter(function(t){return t.status!=='done'&&t.source==='message'}),fups:arr(r[1]).filter(function(t){return t.status!=='done'&&t.source==='message'})},drafts:r[2]===null?null:arr(r[2]).filter(function(d){return d.status==='pending'}),attn:r[3]===null?null:arr(r[3]).filter(function(m){return m.status!=='resolved'})};
  var ch=JSON.stringify(n)!==JSON.stringify({todo:inb.todo,drafts:inb.drafts,attn:inb.attn});inb.todo=n.todo;inb.drafts=n.drafts;inb.attn=n.attn;inb.ok=true;
  if(ch&&!formBusy()&&!saving)render();
 }).catch(function(e){if(e.locked)lockScreen();else if(e.auth)badLink()});
}
function inboxStart(){if(inT||!usable())return;inT=setInterval(loadInbox,20000);loadInbox()}
function sec(title,id,inner){return '<section class="card" data-sec="'+id+'"><h2>'+title+'</h2>'+inner+'</section>'}
function inboxHtml(){
 if(!usable())return '';
 var h='<h1 class="sech">Your assistant</h1>';
 var t=inb.todo,todo;
 if(!inb.ok)todo='<p class="mut">Loading...</p>';else if(!t)todo='<p class="mut">We could not load this just now. It will retry.</p>';
 else if(!t.tasks.length&&!t.fups.length)todo='<p class="mut">Nothing to do from messages right now.</p>';
 else todo='<ul class="list">'+t.tasks.map(function(x){return '<li><b>'+esc(x.title)+'</b>'+(x.deadline?'<span class="mut"> &middot; due '+esc(fdate(x.deadline))+'</span>':'')+(x.priority&&x.priority!=='normal'?' <span class="pill">'+esc(x.priority)+'</span>':'')+'</li>'}).join('')+t.fups.map(function(x){return '<li><b>Follow up: '+esc(x.person)+'</b> <span class="mut">'+esc(x.subject||'')+(x.follow_up_date?' &middot; '+esc(fdate(x.follow_up_date)):'')+'</span></li>'}).join('')+'</ul>';
 h+=sec('To do from messages','todo',todo);
 var d=inb.drafts,dh;
 if(!inb.ok)dh='<p class="mut">Loading...</p>';else if(d===null)dh='<p class="mut">We could not load this just now. It will retry.</p>';
 else if(!d.length)dh='<p class="mut">No replies waiting.</p>';
 else dh=d.map(function(x){var v=dirty[x.id]!=null?dirty[x.id]:x.body;
  return '<div class="draft" data-d="'+esc(x.id)+'"><div class="mut">'+chan(x.channel)+' reply to '+esc(x.to)+(x.subject?' &middot; '+esc(x.subject):'')+'</div><textarea aria-label="Reply text" rows="4" data-ta="'+esc(x.id)+'">'+esc(v)+'</textarea><div class="btns2"><button class="btn" data-act="approve" type="button">Approve</button><button class="btn alt" data-act="save" type="button">Save changes</button><button class="btn alt" data-act="reject" type="button">Reject</button></div><div class="err" role="status" data-msg="'+esc(x.id)+'">'+esc(inMsg[x.id]||'')+'</div></div>'}).join('');
 h+=sec('Replies to approve','drafts','<p class="notice">Approving only queues the reply. Nothing is sent automatically.</p>'+dh);
 var a=inb.attn,ah;
 if(!inb.ok)ah='<p class="mut">Loading...</p>';else if(a===null)ah='<p class="mut">We could not load this just now. It will retry.</p>';
 else if(!a.length)ah='<p class="mut">Nothing needs your attention.</p>';
 else ah=a.map(function(m){return '<div class="draft" data-m="'+esc(m.id)+'"><div><b>'+esc(m.sender_name||m.sender)+'</b> <span class="mut">'+chan(m.source)+' &middot; '+esc(fdate(m.received_at))+'</span></div><p>'+esc(String(m.text||'').slice(0,400))+'</p>'+((m.flag_reasons||[]).length?'<p class="mut">Why: '+esc(m.flag_reasons.join(', '))+'</p>':'')+'<button class="btn alt" data-act="resolve" type="button">Mark as handled</button><div class="err" role="status" data-msg="'+esc(m.id)+'">'+esc(inMsg[m.id]||'')+'</div></div>'}).join('');
 return h+sec('Needs your attention','attn',ah);
}
function wireInbox(){
 Array.prototype.forEach.call(document.querySelectorAll('[data-ta]'),function(t){t.oninput=function(){dirty[t.getAttribute('data-ta')]=t.value}});
 Array.prototype.forEach.call(document.querySelectorAll('[data-act]'),function(b){b.onclick=function(){
  var box=b.closest('[data-d],[data-m]'),id=box.getAttribute('data-d')||box.getAttribute('data-m'),act=b.getAttribute('data-act'),ta=box.querySelector('textarea');
  function msg(x){inMsg[id]=x;var m=box.querySelector('[data-msg]');if(m)m.textContent=x}
  function fail(e){if(e.locked)return lockScreen();b.disabled=false;Array.prototype.forEach.call(box.querySelectorAll('button'),function(x){x.disabled=false});
   msg(e.status===409?'This reply was already decided.':'Could not save, please try again.');if(e.status===409){delete dirty[id];loadInbox()}}
  Array.prototype.forEach.call(box.querySelectorAll('button'),function(x){x.disabled=true});msg('');
  var edit=function(){return ta&&dirty[id]!=null&&dirty[id]!==undefined?req('/drafts/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({body:ta.value})}):Promise.resolve()};
  var done=function(text){delete dirty[id];delete inMsg[id];if(text)inMsg[id]=text;return loadInbox().then(function(){render()})};
  if(act==='save')edit().then(function(){delete dirty[id];return loadInbox()}).then(function(){inMsg[id]='Saved';render()}).catch(fail);
  else if(act==='approve')edit().then(function(){return req('/drafts/'+encodeURIComponent(id)+'/approve',{method:'POST',body:'{}'})}).then(function(){return done()}).catch(fail);
  else if(act==='reject')req('/drafts/'+encodeURIComponent(id)+'/reject',{method:'POST',body:'{}'}).then(function(){return done()}).catch(fail);
  else if(act==='resolve')req('/inbox/messages/'+encodeURIComponent(id)+'/resolve',{method:'POST',body:'{}'}).then(function(){return done()}).catch(fail);
 }});
}
var STEPS=[['whatsapp','Connect WhatsApp'],['gmail','Connect Gmail'],['outlook','Connect Outlook']];
function render(){
 if(locked)return;
 var all=STEPS.every(function(s){return st&&st[s[0]]===true}),n=STEPS.filter(function(s){return st&&st[s[0]]===true}).length;
 var active=tr&&tr.status==='active',h='<h1>Set up your workspace</h1><p class="mut">Three quick steps. '+n+' of 3 done.</p>';
 if(!active)h+='<div class="timer" id="timer"><div><div class="mut">Trial time left</div><div class="t" id="clock">--:--:--</div></div><div class="mut">of your 48-hour trial</div></div>';
 if(all)h+='<div class="card alldone"><h2>All set</h2><p class="mut">Everything is connected. Your LaunchRiot contact will take it from here.</p></div>';
 STEPS.forEach(function(s,i){var d=st&&st[s[0]]===true;
  h+='<section class="card'+(d?' done':'')+'" data-step="'+s[0]+'"><div class="step '+(d?'done':'')+'"><span class="num">'+(d?'&#10003;':(i+1))+'</span><div class="tx"><h2>'+s[1]+'</h2></div><span class="pill">'+(d?'Done':'Not done')+'</span></div>'+(d?(s[0]==='gmail'?discBody():(s[0]==='whatsapp'?waDoneBody():'')):'<div class="body">'+stepBody(s[0])+'</div>')+'</section>'});
 var pl=pkgOptions();
 if(pl.length){
  h+='<section class="card"><h2>Your package</h2><p class="mut">Pick the one that suits you. You can change it later.</p><select id="pkg" aria-label="Package">'+pl.map(function(p){return '<option value="'+esc(p.id)+'"'+(p.id===curPkg()?' selected':'')+'>'+esc(p.label)+'</option>'}).join('')+'</select> <span class="mut" id="pkgmsg" role="status"></span></section>'}
 h+=inboxHtml();
 var keep=document.activeElement&&document.activeElement.id;
 app.innerHTML=h;
 var sel=document.getElementById('pkg');if(sel){sel.onchange=function(){savePkg(sel.value)};if(keep==='pkg')sel.focus()}
 wireForms();wireInbox();tick();waEnsure();inboxStart();
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
