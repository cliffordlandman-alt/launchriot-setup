(function(){
'use strict';
var DOMAIN='145-241-118-107.sslip.io',WA='https://wa.me/971586444285',MAIL='mailto:hello@launchriot.online';
var app=document.getElementById('app'),S='',C='',API='',st=null,tr=null,team=null,trAt=0,locked=false,pollT=null,tickT=null,slowT=null,first=true,saving=false,pkgSel=null,RESET='',conn=null,upc=null,cxMsg={},pwAsked=false;
var cfg=window.LR_TEST_API||null;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function readHash(){
 var h=location.hash.replace(/^#/,''),p={};h.split('&').forEach(function(x){var i=x.indexOf('=');if(i>0)p[x.slice(0,i)]=decodeURIComponent(x.slice(i+1))});
 if(p.s){try{sessionStorage.setItem('lr_s',p.s)}catch(e){}}
 if(p.reset)RESET=p.reset;if(!p.c){var qc=/[?&]c=([a-z0-9-]{4,32})/.exec(location.search);if(qc)p.c=qc[1]}
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
var gmEmail='',wa={state:null,url:null,connected:false,phone:null,mode:null,code:null,codeAt:0,num:'',busy:false,err:''},waT=null,waOn=false;
function isPhone(){try{return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||window.matchMedia('(max-width:760px)').matches}catch(e){return false}}
function waMode(){if(!wa.mode)wa.mode=isPhone()?'code':'qr';return wa.mode}
function codeBody(){
 var h='';
 if(wa.code){var lft=Math.max(0,60-Math.floor((Date.now()-wa.codeAt)/1000));
  h+='<p>Your code:</p><div class="paircode" aria-label="Pairing code">'+esc(wa.code)+'</div>'+(lft>0?'<p class="mut">Type it within about a minute.</p>':'<p class="err">This code may have expired. Get a new one below.</p>')+
   '<ol><li>Open WhatsApp on this phone.</li><li>Go to Settings, then Linked devices.</li><li>Tap Link a device.</li><li>Tap <b>Link with phone number instead</b>.</li><li>Type the code above.</li></ol>'+
   '<p class="mut">Then come back to this page. It updates by itself once you are connected.</p>'+
   '<button class="btn alt" type="button" data-wa="new">Get a new code</button>';
 }else{
  h+='<p>Get a code to link WhatsApp on this phone. No scanning needed.</p><label for="wanum">Your WhatsApp number, with country code</label><input id="wanum" type="tel" inputmode="tel" autocomplete="tel" placeholder="+971 50 123 4567" value="'+esc(wa.num)+'">'+
   '<button class="btn wide" type="button" data-wa="get"'+(wa.busy?' disabled':'')+'>'+(wa.busy?'Getting your code...':'Get my code')+'</button><div class="err" role="status">'+esc(wa.err)+'</div>';
 }
 return h+'<p><button class="linkbtn" type="button" data-wa="qr">On a computer? Scan a QR code instead</button></p>';
}
function getCode(){
 var el=document.getElementById('wanum');if(el)wa.num=el.value;
 var d=String(wa.num||'').replace(/\D/g,'');if(/^00/.test(d))d=d.slice(2);
 if(d.length<8||d.length>15){wa.err='Enter your WhatsApp number with country code, e.g. +971 50 123 4567';updateWA(true);return}
 wa.busy=true;wa.err='';updateWA(true);
 req('/whatsapp/pair',{method:'POST',body:JSON.stringify({phone:'+'+d})}).then(function(r){
  wa.busy=false;if(r&&typeof r.code==='string'&&r.code){wa.code=r.code;wa.codeAt=Date.now()}else wa.err='Could not get a code. Please try again.';updateWA(true);
 }).catch(function(e){wa.busy=false;if(e.locked)return lockScreen();if(e.auth)return noAuth();wa.err=e.status===409?'This WhatsApp is already linked or busy. Please refresh the page.':'Could not get a code. Please try again in a moment.';updateWA(true)});
}
document.addEventListener('click',function(ev){var b=ev.target&&ev.target.closest&&ev.target.closest('[data-wa]');if(!b)return;var a=b.getAttribute('data-wa');
 if(a==='code'){wa.mode='code';updateWA(true)}else if(a==='qr'){wa.mode='qr';updateWA(true)}else if(a==='get')getCode();else if(a==='new'){wa.code=null;updateWA(true)}});
document.addEventListener('keydown',function(ev){if(ev.key==='Enter'&&ev.target&&ev.target.id==='wanum'){ev.preventDefault();getCode()}});
document.addEventListener('input',function(ev){if(ev.target&&ev.target.id==='wanum')wa.num=ev.target.value});
function waState(){var l=st&&st.links&&st.links.whatsapp;return wa.state||(l&&l.state)||null}
function waUrl(){var u=wa.url;if(u==null&&wa.state==null)u=linkFor('whatsapp');return typeof u==='string'&&/^(data:image\/(png|jpeg);base64,|https:\/\/)/.test(u)?u:null}
function waBody(){
 var u=waUrl(),sv=waState();
 if(sv!=='connecting'&&waMode()==='code')return codeBody();
 var alt='<p><button class="linkbtn" type="button" data-wa="code">On this phone? Use a code instead</button></p>';
 if(sv==='unavailable'&&!u)return '<div class="wait">Your LaunchRiot contact will send your QR code here shortly. You do not need to do anything yet.</div>';
 if(u)return '<ol><li>Open WhatsApp on your phone.</li><li>Go to Settings, then Linked devices.</li><li>Tap Link a device and scan the code below.</li></ol><img class="qr" alt="WhatsApp QR code" src="'+esc(u)+'"><p class="mut">The code refreshes by itself. If it stops working, wait a moment for a new one.</p>'+alt;
 if(sv==='connecting')return '<div class="wait">Connecting your WhatsApp... one moment.</div>';
 return '<div class="wait"><span class="dots">Preparing your code...</span></div>'+alt;
}
function waDoneBody(){return wa.phone?'<div class="body"><p class="mut">Connected phone: <b>'+esc(wa.phone)+'</b></p></div>':''}
function updateWA(force){if(!force&&waMode()==='code'&&waState()!=='connecting'&&!(wa.code&&Date.now()-wa.codeAt>61000&&!wa.expShown))return;if(wa.code&&Date.now()-wa.codeAt>61000)wa.expShown=true;var el=document.querySelector('[data-step=whatsapp] .body');if(el&&!locked)el.innerHTML=waBody()}
function waStop(){clearTimeout(waT);waT=null;waOn=false}
function waLoop(){
 if(locked||!st||st.whatsapp===true||wa.connected){waStop();return}
 waOn=true;
 req('/whatsapp/qr').then(function(r){
  wa.state=typeof r.state==='string'?r.state:null;wa.url=(typeof r.qr_url==='string'&&r.qr_url)?r.qr_url:null;
  if(r.connected===true||wa.state==='connected'){wa.connected=true;wa.url=null;return waDone()}
  updateWA();
 }).catch(function(e){if(e.locked)return lockScreen();if(e.auth)return noAuth()}).then(function(){if(!locked&&waOn&&!wa.connected&&st&&st.whatsapp!==true)waT=setTimeout(waLoop,4000)});
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
function formBusy(){var ae=document.activeElement;if(ae&&ae.tagName==='TEXTAREA')return true;var p=document.getElementById('gmpw'),e=document.getElementById('gmemail'),a=document.activeElement;return !!((p&&p.value)||(e&&e.value)||(a&&a.id&&/^(gmpw|gmemail|pkg|wanum|cx\w+)$/.test(a.id))||wa.busy)}
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
   saving=false;body=null;if(e.locked)return lockScreen();if(e.auth)return noAuth();
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
 }).catch(function(e){if(e.locked)lockScreen();else if(e.auth)noAuth()});
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
 h+=connHtml();
 h+=inboxHtml();
 var keep=document.activeElement&&document.activeElement.id;
 app.innerHTML=h;
 var sel=document.getElementById('pkg');if(sel){sel.onchange=function(){savePkg(sel.value)};if(keep==='pkg')sel.focus()}
 wireForms();wireInbox();wireConn();tick();waEnsure();inboxStart();
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
 if(RESET&&API)return resetScreen();
 if(!API)return badLink();
 if(!S)return signIn();
 loading();
 slowT=setTimeout(function(){loading('Still setting things up. Thank you for your patience.')},12000);
 retry(function(){return req('/trial')},8,3000).then(function(t){
  clearTimeout(slowT);
  if(t.locked||t.status==='locked')return lockScreen();
  tr=t;trAt=Date.now();
  return retry(function(){return req('/setup-status')},4,2000).then(function(s){st=s;
   return req('/team').then(function(x){team=x}).catch(function(e){if(e.locked)throw e;team=null})
  }).then(function(){render();tickT=setInterval(tick,1000);setInterval(function(){if(!locked)syncTrial()},60000);pollT=setTimeout(poll,5000);askPw();loadConn()});
 }).catch(function(e){clearTimeout(slowT);if(e.locked)return lockScreen();if(e.auth)return noAuth();failScreen()});
}
function noAuth(){S='';try{sessionStorage.removeItem('lr_s')}catch(e){}clearTimeout(pollT);clearInterval(inT);inT=null;return API?signIn():badLink()}
function pjson(path,b){return fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(function(r){return r.json().catch(function(){return {}}).then(function(j){j._s=r.status;return j})})}
function eye(id){return '<button type="button" class="linkbtn eye" data-eye="'+id+'" aria-label="Show password">Show</button>'}
function wireEyes(root){Array.prototype.forEach.call((root||document).querySelectorAll('[data-eye]'),function(b){b.onclick=function(){var ids=b.getAttribute('data-eye').split(',');var show=b.textContent==='Show';ids.forEach(function(i){var x=document.getElementById(i);if(x)x.type=show?'text':'password'});b.textContent=show?'Hide':'Show';b.setAttribute('aria-label',show?'Hide password':'Show password')}})}
function pwFields(){return '<label>New password<input id="cxp1" type="password" autocomplete="new-password" minlength="8" required></label><label>Confirm password<input id="cxp2" type="password" autocomplete="new-password" minlength="8" required></label><p>'+eye('cxp1,cxp2')+' <span class="mut">At least 8 characters.</span></p>'}
function pwCheck(){var a=document.getElementById('cxp1').value,b=document.getElementById('cxp2').value;if(a.length<8)return 'Use at least 8 characters.';if(a!==b)return 'The two passwords do not match.';return ''}
function signIn(msg){clearTimeout(slowT);
 app.innerHTML='<div class="card auth"><h1>Sign in</h1><p class="mut">'+esc(msg||'Sign in to your workspace.')+'</p><form id="lf" novalidate><label>Email<input id="cxem" type="email" autocomplete="username" required></label><label>Password<input id="cxpw" type="password" autocomplete="current-password" required></label><p>'+eye('cxpw')+'</p><button class="btn" type="submit">Sign in</button> <span class="mut" id="lmsg" role="status"></span></form><p><button class="linkbtn" id="fgo" type="button">Forgot password?</button></p><form id="ff" hidden><p class="mut">Enter your email and we will send you a link to set a new password. The link works once and for 30 minutes.</p><label>Email<input id="cxfe" type="email" autocomplete="email" required></label><button class="btn alt" type="submit">Send link</button> <span class="mut" id="fmsg" role="status"></span></form></div>';
 wireEyes(app);
 document.getElementById('fgo').onclick=function(){var f=document.getElementById('ff');f.hidden=false;document.getElementById('cxfe').value=document.getElementById('cxem').value;document.getElementById('cxfe').focus()};
 document.getElementById('lf').onsubmit=function(ev){ev.preventDefault();var m=document.getElementById('lmsg');m.textContent='Signing in...';
  pjson('/auth/login',{email:document.getElementById('cxem').value,password:document.getElementById('cxpw').value}).then(function(j){
   if(j._s===200&&j.session){S=j.session;try{sessionStorage.setItem('lr_s',S)}catch(e){}pwAsked=false;start()}
   else m.textContent=j._s===429?'Too many tries. Please wait 15 minutes.':'Email or password is not right.'}).catch(function(){m.textContent='Could not reach the server. Please try again.'})};
 document.getElementById('ff').onsubmit=function(ev){ev.preventDefault();var m=document.getElementById('fmsg');m.textContent='Sending...';
  pjson('/auth/forgot',{email:document.getElementById('cxfe').value}).then(function(j){m.textContent=j._s===429?'Too many requests. Please wait a few minutes.':"If that email exists, we've sent a link. Check your inbox."}).catch(function(){m.textContent='Could not reach the server. Please try again.'})};
}
function resetScreen(){
 app.innerHTML='<div class="card auth"><h1>Set a new password</h1><form id="rf" novalidate>'+pwFields()+'<button class="btn" type="submit">Save new password</button> <span class="mut" id="rmsg" role="status"></span></form></div>';wireEyes(app);
 document.getElementById('rf').onsubmit=function(ev){ev.preventDefault();var m=document.getElementById('rmsg'),bad=pwCheck();if(bad){m.textContent=bad;return}m.textContent='Saving...';
  pjson('/auth/reset',{token:RESET,password:document.getElementById('cxp1').value}).then(function(j){
   if(j._s===200){RESET='';S='';try{sessionStorage.removeItem('lr_s')}catch(e){}signIn('Your password is set. Sign in with your new password.');var e=document.getElementById('cxem');if(e&&j.email)e.value=j.email}
   else{m.textContent=j.error||'Something went wrong. Please try again.';if(/expired|not valid/.test(j.error||'')){RESET=''}}}).catch(function(){m.textContent='Could not reach the server. Please try again.'})};
}
function askPw(){if(pwAsked||locked)return;pwAsked=true;req('/account').then(function(a){if(!a.must_set_password)return;
 var d=document.createElement('div');d.className='modal';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','pwh');
 d.innerHTML='<div class="mbox"><h2 id="pwh">Set your own password</h2><p class="mut">Choose a password so you can sign in any time.</p><form id="mf" novalidate>'+pwFields()+'<button class="btn" type="submit">Save password</button>'+(a.can_snooze?' <button class="btn alt" type="button" id="mlater">Later</button>':'')+' <p class="mut" id="mmsg" role="status"></p></form></div>';
 document.body.appendChild(d);wireEyes(d);document.getElementById('cxp1').focus();
 var lt=document.getElementById('mlater');if(lt)lt.onclick=function(){req('/account/password-later',{method:'POST',body:'{}'}).catch(function(){});d.remove();render()};
 document.getElementById('mf').onsubmit=function(ev){ev.preventDefault();var m=document.getElementById('mmsg'),bad=pwCheck();if(bad){m.textContent=bad;return}m.textContent='Saving...';
  req('/account/password',{method:'POST',body:JSON.stringify({password:document.getElementById('cxp1').value,confirm:document.getElementById('cxp2').value})}).then(function(){m.textContent='Saved.';setTimeout(function(){d.remove();render()},700)}).catch(function(e){m.textContent=e.status===400?'Use at least 8 characters, and make both fields match.':'Could not save. Please try again.'})};
}).catch(function(){})}
function loadConn(){if(locked||!S)return;req('/connections').then(function(c){var ch=JSON.stringify(c)!==JSON.stringify(conn);conn=c;
 return (c.calendar&&c.calendar.accounts&&c.calendar.accounts.length?req('/calendar/upcoming?days=14').then(function(u){upc=arr(u)}):Promise.resolve(upc=null)).then(function(){if(ch&&!saving&&!formBusy())render()})}).catch(function(e){if(e.locked)lockScreen();else if(e.auth)noAuth()});
 clearTimeout(window.__cxT);window.__cxT=setTimeout(loadConn,30000)}
function pill(ok,txt){return '<span class="pill'+(ok?' ok':'')+'">'+esc(txt)+'</span>'}
function crow(name,status,ok,act){return '<div class="crow"><div><b>'+esc(name)+'</b><div class="mut">'+status+'</div></div><div class="cact">'+act+'</div></div>'}
function connHtml(){if(!conn)return '';var h='',c=conn;
 var w=c.whatsapp||{},wl=w.state==='connected'||(st&&st.whatsapp===true);
 h+=crow('WhatsApp',wl?('Connected'+(wa.phone?' &middot; '+esc(wa.phone):'')):'Not connected',wl,wl?'<button class="btn alt" data-cx="wadisc" type="button">Disconnect</button>':'<button class="btn alt" data-cx="wago" type="button">Connect</button>');
 if(wl)h+='<p class="mut small">One WhatsApp number per workspace. To use a different number, disconnect this one first.</p>';
 var g=(c.gmail&&c.gmail.accounts)||[],gmax=(c.gmail&&c.gmail.max)||3;
 g.forEach(function(a){h+=crow('Gmail',esc(a.label)+' &middot; '+(a.status==='connected'?'Connected':'Needs attention'),a.status==='connected','<button class="btn alt" data-cx="gmdisc" data-id="'+a.id+'" type="button">Disconnect</button>')});
 if(!g.length)h+=crow('Gmail','Not connected',false,'<button class="btn alt" data-cx="gmgo" type="button">Connect</button>');
 else if(g.length<gmax)h+='<details class="cadd"><summary>Add another Gmail</summary><form id="cxgf"><label>Gmail address<input id="cxge" type="email" autocomplete="off" required></label><label>App password<input id="cxgp" type="password" autocomplete="off" required></label>'+appLink()+'<button class="btn" type="submit">Connect</button> <span class="mut" data-m="gm" role="status">'+esc(cxMsg.gm||'')+'</span></form></details>';
 else h+='<p class="mut small">You have connected the most mailboxes allowed ('+gmax+').</p>';
 var o=c.outlook||{};h+=crow('Outlook',o.seen?'Forwarding is working':(o.set_up?'Set up, waiting for the first email':'Not set up'),!!o.seen,'');
 if(!o.seen)h+='<details class="cadd"><summary>How to connect Outlook</summary>'+(g.length?olist(['In Outlook, open Settings, then Mail, then Forwarding.','Turn on forwarding and enter your connected Gmail address: '+g[0].label+'.','Save. New Outlook mail will show up here within a few minutes.']):'<p class="mut">Connect Gmail first. Outlook mail is forwarded to it.</p>')+'</details>';
 var cal=c.calendar||{},cs=cal.accounts||[];
 cs.forEach(function(f){h+=crow('Calendar',esc(f.label)+' &middot; '+(f.status==='connected'?(f.event_count+' upcoming events'):'Could not read it: '+esc(f.error||'please check the address')),f.status==='connected','<button class="btn alt" data-cx="calsync" data-id="'+f.id+'" type="button">Refresh</button> <button class="btn alt" data-cx="caldel" data-id="'+f.id+'" type="button">Remove</button>')});
 if(cs.length<(cal.max||3))h+='<details class="cadd"'+(cs.length?'':' open')+'><summary>'+(cs.length?'Add another calendar':'Connect your Google Calendar')+'</summary>'+olist(cal.instructions||[])+'<form id="cxcf"><label>Secret address<input id="cxcu" type="url" autocomplete="off" placeholder="https://calendar.google.com/calendar/ical/.../basic.ics" required></label><label>Name (optional)<input id="cxcl" type="text" maxlength="60" placeholder="Work"></label><button class="btn" type="submit">Connect calendar</button> <span class="mut" data-m="cal" role="status">'+esc(cxMsg.cal||'')+'</span></form><p class="mut small">Your assistant can read your calendar but cannot change it. It refreshes about every 15 minutes.</p></details>';
 if(upc&&upc.length)h+='<h3>Coming up</h3><ul class="evs">'+upc.slice(0,8).map(function(e){return '<li><b>'+esc(e.title)+'</b> <span class="mut">'+(e.all_day?new Date(e.starts_at).toLocaleDateString([], {weekday:'short',day:'numeric',month:'short'}):fdate(e.starts_at))+(e.location?' &middot; '+esc(e.location):'')+'</span></li>'}).join('')+'</ul>';
 else if(cs.length)h+='<p class="mut small">No events in the next 14 days.</p>';
 return '<section class="card" data-sec="conn"><h2>Connections</h2><p class="mut">Everything your assistant can see. <span data-m="top" role="status">'+esc(cxMsg.top||'')+'</span></p>'+h+'</section>'}
function cxDo(key,p){cxMsg[key]='Working...';var m=document.querySelector('[data-m='+key+']');if(m)m.textContent=cxMsg[key];saving=true;
 return p.then(function(){cxMsg[key]='';saving=false;return req('/setup-status').then(function(s){st=s})}).catch(function(e){saving=false;if(e.locked)return lockScreen();if(e.auth)return noAuth();cxMsg[key]=e.msg||'That did not work. Please try again.'}).then(function(){conn=null;loadConn()})}
function req2(path,opt){opt=opt||{};return fetch(API+path,{method:opt.method||'GET',headers:{'Authorization':'Bearer '+S,'Content-Type':'application/json'},body:opt.body}).then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(r.status===401){var e=new Error('auth');e.auth=true;throw e}if(r.status===403&&j.locked){var l=new Error('locked');l.locked=true;throw l}if(!r.ok){var x=new Error('http');x.msg=j.error;throw x}return j})})}
function wireConn(){var sec=document.querySelector('[data-sec=conn]');if(!sec)return;
 Array.prototype.forEach.call(sec.querySelectorAll('[data-cx]'),function(b){b.onclick=function(){var k=b.getAttribute('data-cx'),id=b.getAttribute('data-id');
  if(k==='wago'||k==='gmgo'){var t=document.querySelector('[data-step='+(k==='wago'?'whatsapp':'gmail')+']');if(t)t.scrollIntoView({behavior:'smooth'});return}
  if((k==='wadisc'||k==='gmdisc'||k==='caldel')&&!confirm(k==='wadisc'?'Disconnect WhatsApp? Your assistant will stop seeing new WhatsApp messages until you connect again.':(k==='gmdisc'?'Disconnect this mailbox? Its stored mail will be removed.':'Remove this calendar?')))return;
  b.disabled=true;
  if(k==='wadisc'){wa.state=null;wa.url=null;wa.connected=false;wa.phone=null;wa.tried=false;wa.code=null;cxDo('top',req2('/whatsapp/disconnect',{method:'POST',body:'{}'}))}
  else if(k==='gmdisc')cxDo('top',req2('/mail/disconnect?account='+encodeURIComponent(id),{method:'DELETE'}));
  else if(k==='caldel')cxDo('top',req2('/calendar/ical/'+id,{method:'DELETE'}));
  else if(k==='calsync')cxDo('top',req2('/calendar/ical/'+id+'/sync',{method:'POST',body:'{}'}));
 }});
 var gf=document.getElementById('cxgf');if(gf)gf.onsubmit=function(ev){ev.preventDefault();var e=document.getElementById('cxge').value,pw=document.getElementById('cxgp').value;document.getElementById('cxgp').value='';cxDo('gm',req2('/mail/connect',{method:'PUT',body:JSON.stringify({email:e,app_password:pw,account:'new'})}))};
 var cf=document.getElementById('cxcf');if(cf)cf.onsubmit=function(ev){ev.preventDefault();var u=document.getElementById('cxcu').value,l=document.getElementById('cxcl').value;document.getElementById('cxcu').value='';cxDo('cal',req2('/calendar/ical',{method:'POST',body:JSON.stringify({url:u,label:l})}))};
}
readHash();start();
})();
