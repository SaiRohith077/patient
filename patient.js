/* MEDTRACE – Patient portal, unique patient QR codes and doctor QR scanner.
   Add-on module: loaded AFTER the main script in index.html. It reuses the existing
   globals (P, V, S, TITLES, ic, hydrate, dlg, dlg0, toast, go, render, $) and your CSS.
   FRONTEND DEMO ONLY – all data is fictional and all checks run in the browser. */
(()=>{
const PW='patient123';                       // demo patient password (all patients)
const PREFIX='MEDTRACE:v1:';                 // QR payload = prefix + opaque record reference
const PQ={p:null,cur:null,show:false,log:[]};

/* ---------- Fictional demo patients (QR holds ONLY the opaque tok, never medical data) ---------- */
const PTS=[
{id:P.id,tok:'MTQR-7K3F-92DA-X81P',pin:'4821',name:P.name,age:P.age,sex:P.sex,bg:P.bg,
 phone:'+91 90000 11245',email:'arjun.kumar@example.com',
 allergies:P.allergies,meds:P.meds,hist:P.hist,reps:P.reps,
 dx:['Type 2 diabetes mellitus','Atrial fibrillation','Hypertension'],
 em:['Sunita Kumar','Spouse','+91 90000 22245']},
{id:'MT-10388',tok:'MTQR-4B8N-61QC-M5ZT',pin:'3517',name:'Priya Sharma',age:32,sex:'Female',bg:'A+',
 phone:'+91 90000 11388',email:'priya.sharma@example.com',
 allergies:[['Latex','Contact dermatitis, mild'],['Ibuprofen','Wheezing, moderate']],
 meds:[['Salbutamol inhaler','100 mcg as needed','Asthma'],['Budesonide inhaler','200 mcg twice daily','Asthma'],['Levothyroxine','50 mcg every morning','Hypothyroidism']],
 hist:[['2016','Asthma diagnosed'],['2021','Hypothyroidism – levothyroxine started'],['Jan 2026','Asthma review – well controlled'],['Aug 2026','Vitamin D deficiency – supplement advised']],
 dx:['Bronchial asthma','Hypothyroidism','Vitamin D deficiency'],
 reps:[['Thyroid Profile (TSH)','12 Aug 2026','Dr. K. Rao · Lakeview Clinic','Lab report'],['Spirometry','20 Jan 2026','Dr. N. Pillai · City Chest Centre','Pulmonary'],['Vitamin D (25-OH)','12 Aug 2026','Dr. K. Rao · Lakeview Clinic','Lab report']],
 em:['Anil Sharma','Father','+91 90000 22388']},
{id:'MT-10471',tok:'MTQR-9H2D-C7LW-30RE',pin:'9064',name:'Rahul Verma',age:58,sex:'Male',bg:'B-',
 phone:'+91 90000 11471',email:'rahul.verma@example.com',
 allergies:[['Aspirin','Gastric irritation, mild']],
 meds:[['Ramipril','5 mg once daily','Hypertension'],['Clopidogrel','75 mg once daily','Coronary stent'],['Rosuvastatin','10 mg at night','High cholesterol'],['Pantoprazole','40 mg before breakfast','Gastric protection']],
 hist:[['2019','Myocardial infarction – coronary stent placed'],['2020','Hypertension diagnosed'],['2023','Cardiac rehabilitation completed'],['Jun 2026','Annual cardiology review – stable']],
 dx:['Coronary artery disease','Hypertension','Dyslipidaemia'],
 reps:[['ECG','18 Jun 2026','Dr. V. Nambiar · Heart Care Centre','Cardiology'],['Lipid Profile','18 Jun 2026','Dr. V. Nambiar · Heart Care Centre','Lab report'],['Echocardiogram','18 Jun 2026','Dr. T. Joseph · Heart Care Centre','Radiology']],
 em:['Meena Verma','Spouse','+91 90000 22471']}];
const payload=p=>PREFIX+p.tok;

/* ---------- Small helpers & styles ---------- */
const st=document.createElement('style');
st.textContent=`#pdash{display:none;min-height:100vh}.pmain{max-width:1040px;margin:0 auto;padding:0 20px 48px}
.qrbox{width:244px;max-width:100%;aspect-ratio:1;margin:14px auto;border-radius:16px;background:#fff;display:grid;place-items:center;border:1px solid var(--line);overflow:hidden}
.qrbox img{width:100%;height:100%;image-rendering:pixelated}.qrbox.off{background:var(--bg);color:var(--mute);padding:16px;font-size:14px;text-align:center}
#pform{display:none}.scan video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
@media(max-width:820px){.pmain{padding:0 16px 40px}}`;
document.head.append(st);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ini=n=>n.split(' ').map(w=>w[0]).join('').slice(0,2);

/* ---------- Shared record renderer (patient dashboard + doctor view) ---------- */
const idCard=(p,tag)=>`<div class="card"><div class="pt"><div class="av">${ini(p.name)}</div><div style="flex:1;min-width:180px"><h2>${esc(p.name)}</h2><span class="pill g">${ic('check')}${tag}</span></div></div>
<div class="facts"><div><small>Patient ID</small><b>${p.id}</b></div><div><small>Age</small><b>${p.age}</b></div><div><small>Gender</small><b>${p.sex}</b></div><div><small>Blood Group</small><b>${p.bg}</b></div></div></div>`;
const card=(t,i,b)=>`<div class="card"><h3 class="flex">${ic(i)}${t}</h3><div class="mt">${b}</div></div>`;
const sections=(p,own)=>`
<div class="grid2 mt">${card('Contact information','user',`<ul class="list"><li><div><small class="mute">Phone</small><br><b>${p.phone}</b></div></li><li><div><small class="mute">Email</small><br><b>${p.email}</b></div></li></ul>`)}
${card('Emergency contact','warn',`<ul class="list"><li><div><small class="mute">Name</small><br><b>${p.em[0]}</b> (${p.em[1]})</div></li><li><div><small class="mute">Phone</small><br><b>${p.em[2]}</b></div></li></ul>`)}</div>
<div class="grid2 mt">${card('Allergies','warn',`<ul class="list">${p.allergies.map(a=>`<li><div class="hl" style="flex:1"><b>${a[0]}</b><div class="mute">${a[1]}</div></div></li>`).join('')}</ul>`)}
${card('Current medications','pill',`<table><tr><th>Medication</th><th>Dose</th><th>For</th></tr>${p.meds.map(m=>`<tr><td><b>${m[0]}</b></td><td>${m[1]}</td><td>${m[2]}</td></tr>`).join('')}</table>`)}</div>
<div class="mt">${card('Medical history &amp; previous diagnoses','steth',`<div class="flex" style="margin-bottom:14px">${p.dx.map(d=>`<span class="pill">${d}</span>`).join('')}</div><ul class="list">${p.hist.map(h=>`<li><span class="pill" style="min-width:76px;justify-content:center">${h[0]}</span>${h[1]}</li>`).join('')}</ul>`)}</div>
<h2 class="mt" style="margin-top:28px">Recent medical reports</h2>
<div class="grid3 mt">${p.reps.map((r,i)=>`<div class="card rep"><div class="row"><span class="pill">${r[3]}</span><span class="mute" style="font-size:13px">${r[1]}</span></div><h3>${r[0]}</h3><div class="mute" style="font-size:14px">${r[2]}</div><button class="btn sec mt" data-pqrep="${p.id}|${i}">${ic('doc')}View Report</button></div>`).join('')}</div>
${own?`<div class="mt">${card('Who accessed my record','lock',(l=>l.length?`<ul class="list">${l.map(x=>`<li>${ic('shield')}<div><b>${x.who}</b><div class="mute" style="font-size:14px">${x.why} · ${x.at}</div></div></li>`).join('')}</ul>`:'<p class="mute" style="margin:0">No doctor has opened your record in this demo session.</p>')(PQ.log.filter(x=>x.pid===p.id)))}</div>`:''}`;

/* ---------- QR generation (payload = opaque reference only) ---------- */
function qrCanvas(p,scale){
 const q=qrcode(0,'M');q.addData(payload(p));q.make();
 const n=q.getModuleCount(),m=4,sz=(n+m*2)*scale,c=document.createElement('canvas');c.width=c.height=sz;
 const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,sz,sz);x.fillStyle='#000';
 for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))x.fillRect((k+m)*scale,(r+m)*scale,scale,scale);
 return c}
function drawQR(){
 const box=$('#pqbox'),b=$('#pq-show');if(!box)return;
 if(!PQ.show){box.className='qrbox off';box.innerHTML='Your QR code is hidden. Select “Show My QR Code”.';b.innerHTML=ic('qr')+'Show My QR Code';return}
 b.innerHTML=ic('qr')+'Hide My QR Code';
 if(typeof qrcode!=='function'){box.className='qrbox off';box.textContent='QR library could not be loaded. Check your internet connection and reload.';return}
 box.className='qrbox';box.innerHTML=`<img alt="Your MEDTRACE QR code" src="${qrCanvas(PQ.p,8).toDataURL('image/png')}">`}
function dlQR(){
 if(typeof qrcode!=='function'){toast('QR library not loaded');return}
 const a=document.createElement('a');a.download='MedTrace-QR-'+PQ.p.id+'.png';a.href=qrCanvas(PQ.p,10).toDataURL('image/png');
 document.body.append(a);a.click();a.remove();toast('QR code downloaded')}

/* ---------- Login: add Doctor / Patient toggle without touching the doctor form ---------- */
const lerr=$('#lerr'),dform=document.createElement('div');dform.id='dform';
for(let n=lerr.nextSibling;n;){const nx=n.nextSibling;dform.append(n);n=nx}   // move existing doctor fields, ids/handlers intact
lerr.after(dform);
const tabs=document.createElement('div');tabs.className='tabs';tabs.style.cssText='width:100%;margin:14px 0 2px';
tabs.innerHTML='<button class="tab on" style="flex:1" data-role="d">Doctor</button><button class="tab" style="flex:1" data-role="p">Patient</button>';
lerr.before(tabs);
const pform=document.createElement('div');pform.id='pform';
pform.innerHTML=`<div id="perr"></div><label for="pid">Patient ID</label><input id="pid" autocomplete="off" placeholder="e.g. MT-10245">
<label for="ppw">Password</label><input id="ppw" type="password" placeholder="Enter password">
<button class="btn" style="width:100%;margin-top:20px" id="plb">Patient Login</button>
<div class="hint">Prototype demo: IDs <b>MT-10245</b>, <b>MT-10388</b>, <b>MT-10471</b> · Password <b>${PW}</b></div>
<div class="sec-note">${ic('lock')}Patient access · Fictional data</div>`;
dform.after(pform);
pform.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')plogin()});   // don't trigger doctor login
function setRole(r){dform.style.display=r==='d'?'':'none';pform.style.display=r==='p'?'block':'none';
 tabs.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.role===r))}

/* ---------- Patient dashboard ---------- */
const pd=document.createElement('section');pd.id='pdash';document.body.append(pd);
function plogin(){
 const p=PTS.find(x=>x.id===$('#pid').value.trim().toUpperCase());
 if(!p||$('#ppw').value!==PW){$('#perr').innerHTML=`<div class="err" role="alert">${ic('warn')}Invalid Patient ID or password</div>`;return}
 $('#perr').innerHTML='';PQ.p=p;PQ.show=false;$('#login').style.display='none';pd.style.display='block';drawP();window.scrollTo(0,0);toast('Welcome, '+p.name)}
function drawP(){
 const p=PQ.p;
 pd.innerHTML=`<div class="pmain"><header class="top"><div class="brand" style="margin:0"><div class="logo">${ic('shield')}</div><b>MEDTRACE</b></div>
 <div class="r"><span class="hide-m" style="text-align:right;line-height:1.2"><b>${esc(p.name)}</b><br><small class="mute">${p.id}</small></span><button class="ib" id="pq-lo" aria-label="Log out">${ic('out')}</button></div></header>
 <h1>Patient Dashboard</h1><p class="mute">Your health record at a glance.</p>
 <div class="secbar mt"><span>${ic('lock')}Secure Session</span><span>${ic('shield')}Your QR code is an identifier only</span></div>
 <div class="grid2">${idCard(p,'Patient record')}
 <div class="card center"><h3>My MEDTRACE QR Code</h3><p class="mute" style="margin:4px 0 0;font-size:14px">Contains only a reference to your record – no medical details.</p>
 <div id="pqbox" class="qrbox off"></div>
 <div class="flex" style="justify-content:center"><button class="btn" id="pq-show"></button><button class="btn sec" id="pq-dl">${ic('doc')}Download QR Code</button></div>
 <div class="hint">Consent PIN: <b>${p.pin}</b> – tell this only to the doctor treating you, to authorize access.</div></div></div>
 ${sections(p,true)}</div>`;
 drawQR()}
function plogout(){PQ.p=null;pd.style.display='none';pd.innerHTML='';$('#login').style.display='grid';$('#ppw').value='';toast('You have been logged out')}

/* ---------- Doctor: QR scanner view ---------- */
TITLES.scan='Scan Patient QR Code';TITLES.scanrec='Patient Record';
V.scan=()=>`<div class="card center" style="max-width:560px;margin:0 auto"><h1>Scan Patient QR Code</h1>
<p class="mute">Point the camera at the patient's MEDTRACE QR code, or upload a QR image.</p>
<div class="scan"><video id="pqv" playsinline muted style="display:none"></video><i class="c a"></i><i class="c b"></i><i class="c d"></i><i class="c e"></i><div class="line"></div><div id="pqph">${ic('qr')}</div></div>
<div id="pqmsg" aria-live="polite"></div>
<div class="flex" style="justify-content:center"><button class="btn" id="pq-cam">${ic('cam')}Start camera</button><button class="btn sec" id="pq-up">${ic('doc')}Upload QR image</button><input type="file" id="pqfile" accept="image/*" hidden></div>
<div class="disc mt" style="text-align:left">${ic('lock')}A QR code only identifies a record. Patient authorization is required before any medical information is shown.</div>
<div class="mt"><button class="btn ghost" data-go="dash">← Back to Doctor Dashboard</button></div></div>`;
V.scanrec=()=>{const p=PQ.cur;if(!p)return `<div class="card empty"><div class="ico">${ic('user')}</div><h3>No record open</h3><button class="btn" data-go="scan">${ic('qr')}Scan Patient QR Code</button></div>`;
 return `<div class="disc">${ic('shield')}Access authorized with patient consent and recorded in the access log. Fictional demo data.</div><div class="mt">${idCard(p,'Authorized by patient')}</div>${sections(p,false)}
 <div class="flex mt"><button class="btn" data-go="scan">${ic('qr')}Scan another patient</button><button class="btn ghost" data-go="dash">← Back to Doctor Dashboard</button></div>`};
const R0=window.render;
window.render=function(){R0();if(S.v!=='scan')stopCam();if(S.v!=='scanrec'&&S.v!=='scan')PQ.cur=null}

const msg=t=>{const m=$('#pqmsg');if(m)m.innerHTML=`<div class="err" role="alert">${ic('warn')}${t}</div>`};
const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});
let stream=null,raf=0,last=0;
function stopCam(){cancelAnimationFrame(raf);if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
async function startCam(){
 if(typeof jsQR!=='function'){msg('Scanner library could not be loaded. Check your internet connection.');return}
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){msg('Camera is not available in this browser (HTTPS is required). Please upload a QR image instead.');return}
 stopCam();
 try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false})}
 catch(e){msg('Camera unavailable or permission denied. Please upload a QR code image instead.');return}
 const v=$('#pqv');if(!v){stopCam();return}
 v.srcObject=stream;v.style.display='block';$('#pqph').style.display='none';$('#pqmsg').innerHTML='';
 try{await v.play()}catch(e){}
 tick()}
function tick(){
 raf=requestAnimationFrame(tick);
 const v=$('#pqv');if(!v||$('#app').style.display==='none'||S.v!=='scan'){stopCam();return}
 const now=performance.now();if(v.readyState<2||!v.videoWidth||now<last+120)return;last=now;
 const s=Math.min(1,640/v.videoWidth),w=Math.round(v.videoWidth*s),h=Math.round(v.videoHeight*s);
 cv.width=w;cv.height=h;cx.drawImage(v,0,0,w,h);
 const r=jsQR(cx.getImageData(0,0,w,h).data,w,h,{inversionAttempts:'dontInvert'});
 if(r&&r.data){if(handle(r.data))stopCam();else last=now+1500}}
function decodeFile(f){
 if(!f)return;if(typeof jsQR!=='function'){msg('Scanner library could not be loaded. Check your internet connection.');return}
 if(!/^image\//.test(f.type)){msg('Please choose an image file.');return}
 const img=new Image(),url=URL.createObjectURL(f);
 img.onload=()=>{URL.revokeObjectURL(url);const s=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.round(img.naturalWidth*s),h=Math.round(img.naturalHeight*s);
  cv.width=w;cv.height=h;cx.fillStyle='#fff';cx.fillRect(0,0,w,h);cx.drawImage(img,0,0,w,h);
  const r=jsQR(cx.getImageData(0,0,w,h).data,w,h,{inversionAttempts:'attemptBoth'});
  r&&r.data?handle(r.data):msg('No QR code could be read from this image. Try a clearer, well-lit image.')};
 img.onerror=()=>{URL.revokeObjectURL(url);msg('This file could not be opened as an image.')};img.src=url}

/* Validate payload -> look up record -> require patient consent. Returns true if a record matched. */
function handle(text){
 const m=/^MEDTRACE:v1:(MTQR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})$/.exec(String(text).trim());
 if(!m){msg('Invalid QR code. This is not a MEDTRACE patient QR code.');return false}
 const p=PTS.find(x=>x.tok===m[1]);
 if(!p){msg('No patient record was found for this QR code.');return false}
 $('#pqmsg').innerHTML='';consent(p);return true}
function consent(p){
 let tries=0;
 dlg(`<h3>Patient authorization required</h3><p class="mute">A record was found for <b>${p.id}</b>. The QR code only identifies the record – it does not authorize access. Confirm the patient's consent to continue.</p>
 <div id="cerr"></div><label for="cpur">Purpose of access</label><select id="cpur"><option>Treatment / consultation</option><option>Follow-up review</option><option>Medication review</option></select>
 <label style="display:flex;gap:10px;align-items:flex-start;font-weight:500"><input type="checkbox" id="cck" style="width:20px;min-height:20px;flex:none;margin-top:2px">The patient is present and has agreed to share their record with me.</label>
 <label for="cpin">Patient consent PIN</label><input id="cpin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="4-digit PIN from patient">
 <div class="flex mt"><button class="btn" id="cok">Authorize &amp; open record</button><button class="btn ghost" id="cno">Cancel</button></div>`,()=>{
  const err=t=>$('#cerr').innerHTML=`<div class="err" role="alert">${ic('warn')}${t}</div>`;
  $('#cno').onclick=dlg0;
  $('#cok').onclick=()=>{
   if(!$('#cck').checked)return err('Patient consent must be confirmed.');
   if($('#cpin').value!==p.pin){tries++;if(tries>=3){dlg0();msg('Too many incorrect consent PINs. Access denied.');return}return err('Incorrect consent PIN ('+(3-tries)+' attempt(s) left).')}
   PQ.log.unshift({pid:p.id,who:'Dr. Meera Nair (NMR 12345)',why:$('#cpur').value,at:new Date().toLocaleString()});
   PQ.cur=p;dlg0();go('scanrec')}})}

/* ---------- Event wiring ---------- */
// Doctor dashboard "Scan Patient QR Code" now opens the real scanner (capture phase = runs before the old handler).
document.addEventListener('click',e=>{const t=e.target.closest('button');
 if(t&&t.dataset.vt==='qr'&&S.v==='dash'){e.stopImmediatePropagation();go('scan')}},true);
document.addEventListener('click',e=>{
 const t=e.target.closest('button');if(!t)return;
 if(t.dataset.role)setRole(t.dataset.role);
 else if(t.id==='plb')plogin();
 else if(t.id==='pq-show'){PQ.show=!PQ.show;drawQR()}
 else if(t.id==='pq-dl')dlQR();
 else if(t.id==='pq-lo')plogout();
 else if(t.id==='pq-cam')startCam();
 else if(t.id==='pq-up')$('#pqfile').click();
 else if(t.dataset.pqrep){const [id,i]=t.dataset.pqrep.split('|'),r=PTS.find(x=>x.id===id).reps[+i];
  dlg(`<span class="pill">${r[3]}</span><h3 style="margin-top:8px">${r[0]}</h3><p class="mute">${r[1]} · ${r[2]}</p><div class="hl mt">Sample report preview. Report contents are fictional and not included in this demo.</div><button class="btn mt" onclick="dlg0()">Close</button>`)}
});
document.addEventListener('change',e=>{if(e.target.id==='pqfile'){decodeFile(e.target.files[0]);e.target.value=''}});
window.__medtracePQ={PTS,payload,handle};   // exposed only to help with manual testing
})();
