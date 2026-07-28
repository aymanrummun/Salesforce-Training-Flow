/* =====================================================================
   Salesforce Process Automation — interactive learning site
   Vanilla JS, no dependencies. Spoon Consulting Newbies Bootcamp.
   ===================================================================== */
(function(){
'use strict';

/* safe storage (works offline; degrades if file:// blocks it) */
const store = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
};

/* ---------- theme ---------- */
const body = document.body;
if (store.get('pa_theme') === 'dark') body.classList.add('dark');
function setThemeIcon(){
  const dark = body.classList.contains('dark');
  document.getElementById('themeIcon').innerHTML = dark
    ? '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>'
    : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
}
setThemeIcon();
document.getElementById('themeToggle').addEventListener('click', () => {
  body.classList.toggle('dark');
  store.set('pa_theme', body.classList.contains('dark') ? 'dark' : 'light');
  setThemeIcon();
});

/* ---------- collect sections ---------- */
const sections = Array.from(document.querySelectorAll('.section[data-nav]'));

/* ---------- build sidebar nav (grouped) ---------- */
const navEl = document.getElementById('nav');
const groups = [];
sections.forEach(s => {
  const g = s.dataset.group || 'More';
  let grp = groups.find(x => x.name === g);
  if (!grp){ grp = {name:g, items:[]}; groups.push(grp); }
  grp.items.push(s);
});
groups.forEach(g => {
  const wrap = document.createElement('div'); wrap.className = 'nav-group';
  const lbl = document.createElement('div'); lbl.className = 'g-label'; lbl.textContent = g.name;
  wrap.appendChild(lbl);
  g.items.forEach(s => {
    const a = document.createElement('a');
    a.href = '#' + s.id; a.dataset.id = s.id;
    a.innerHTML = '<span class="dot"></span><span class="nl">' + s.dataset.nav + '</span>';
    wrap.appendChild(a);
  });
  navEl.appendChild(wrap);
});
const navLinks = Array.from(navEl.querySelectorAll('a'));

/* ---------- assign ids to h3 for TOC ---------- */
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,40);
sections.forEach(s => {
  s.querySelectorAll('h3').forEach(h => { if(!h.id) h.id = s.id + '--' + slug(h.textContent); });
});

/* ---------- progress + active tracking ---------- */
const visited = new Set(JSON.parse(store.get('pa_visited') || '[]'));
const navFill = document.getElementById('navFill');
const navPct  = document.getElementById('navPct');
function paint(){
  navLinks.forEach(a => a.classList.toggle('done', visited.has(a.dataset.id)));
  const pct = Math.round(visited.size / sections.length * 100);
  navFill.style.width = pct + '%'; navPct.textContent = pct + '%';
}
visited.forEach(()=>{}); paint();
function markVisited(id){ if(!visited.has(id)){ visited.add(id); store.set('pa_visited', JSON.stringify([...visited])); paint(); } }

const tocLinks = document.getElementById('tocLinks');
let activeId = null;
function buildTOC(section){
  const hs = Array.from(section.querySelectorAll('h3'));
  tocLinks.innerHTML = '';
  if (!hs.length){ document.getElementById('toc').style.visibility='hidden'; return; }
  document.getElementById('toc').style.visibility='visible';
  hs.forEach(h => {
    const a = document.createElement('a');
    a.href = '#' + h.id; a.textContent = h.textContent; a.dataset.h = h.id;
    tocLinks.appendChild(a);
  });
}
function setActive(id){
  if (id === activeId) return;
  activeId = id;
  navLinks.forEach(a => a.classList.toggle('active', a.dataset.id === id));
  const sec = document.getElementById(id);
  if (sec) buildTOC(sec);
}

const ratios = {};
const secObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    ratios[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0;
    if (e.isIntersecting && e.intersectionRatio > 0.25) markVisited(e.target.id);
  });
  let best=null, r=0;
  Object.keys(ratios).forEach(k => { if(ratios[k] > r){ r = ratios[k]; best = k; } });
  if (best) setActive(best);
}, {threshold:[0.1,0.25,0.5,0.8]});
sections.forEach(s => secObserver.observe(s));

/* highlight TOC h3 while scrolling */
const h3Observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    const link = tocLinks.querySelector('a[data-h="'+e.target.id+'"]');
    if (link) link.classList.toggle('active', e.isIntersecting);
  });
}, {rootMargin:'-70px 0px -70% 0px'});
sections.forEach(s => s.querySelectorAll('h3').forEach(h => h3Observer.observe(h)));

/* ---------- mobile menu ---------- */
const menuToggle = document.getElementById('menuToggle');
const backdrop = document.getElementById('backdrop');
if (menuToggle){
  menuToggle.addEventListener('click', () => body.classList.toggle('nav-open'));
  backdrop.addEventListener('click', () => body.classList.remove('nav-open'));
  navLinks.forEach(a => a.addEventListener('click', () => body.classList.remove('nav-open')));
}

/* ---------- filter topics ---------- */
const filterInput = document.getElementById('filterInput');
filterInput.addEventListener('input', () => {
  const q = filterInput.value.trim().toLowerCase();
  navLinks.forEach(a => {
    const hit = a.textContent.toLowerCase().includes(q);
    a.style.display = hit ? '' : 'none';
  });
  document.querySelectorAll('.nav-group').forEach(g => {
    const anyVisible = Array.from(g.querySelectorAll('a')).some(a => a.style.display !== 'none');
    g.style.display = anyVisible ? '' : 'none';
  });
});
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== filterInput){ e.preventDefault(); filterInput.focus(); }
  if (e.key === 'Escape' && document.activeElement === filterInput){ filterInput.value=''; filterInput.dispatchEvent(new Event('input')); filterInput.blur(); }
});

/* =====================================================================
   SYNTAX HIGHLIGHTING (safe, span-aware)
   ===================================================================== */
function freeText(str, fn){
  const out = []; let i = 0;
  while (i < str.length){
    const s = str.indexOf('<span', i);
    if (s === -1){ out.push(fn(str.slice(i))); break; }
    if (s > i) out.push(fn(str.slice(i, s)));
    let depth = 1, j = s + 5;
    while (j < str.length && depth > 0){
      if (str.startsWith('<span', j)){ depth++; j += 5; }
      else if (str.startsWith('</span>', j)){ depth--; if(!depth) break; j += 7; }
      else j++;
    }
    const end = j + 7; out.push(str.slice(s, end)); i = end;
  }
  return out.join('');
}
function hl(raw){
  let code = raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  code = code.replace(/"(?:[^"\\]|\\.)*"/g, m => '<span class="tok-str">'+m+'</span>');
  code = code.replace(/'(?:[^'\\]|\\.)*'/g, m => '<span class="tok-str">'+m+'</span>');
  code = code.replace(/\/\/[^\n]*/g, m => '<span class="tok-com">'+m+'</span>');
  code = freeText(code, s => s.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>'));
  code = freeText(code, s => s.replace(/\b([A-Za-z_$][A-Za-z0-9_$]*)(?=\s*\()/g, '<span class="tok-fn">$1</span>'));
  code = freeText(code, s => s.replace(/\b(trigger|on|before|after|insert|update|delete|undelete|Resource|Operator|Value)\b/g, '<span class="tok-key">$1</span>'));
  return code;
}
document.querySelectorAll('.code[data-code] pre').forEach(pre => { pre.innerHTML = hl(pre.textContent); });
/* copy buttons */
document.querySelectorAll('.code .cp').forEach(btn => {
  btn.addEventListener('click', () => {
    const pre = btn.closest('.code').querySelector('pre');
    if (navigator.clipboard) navigator.clipboard.writeText(pre.textContent);
    const t = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(() => btn.textContent = t, 1200);
  });
});

/* =====================================================================
   INTERACTIVE: Flow Builder element palette
   ===================================================================== */
const PALETTE = [
  {name:'Start', ico:'▶', c:'#12a9bb', purpose:'Defines how the flow begins.', usage:'Screen launch, record create/update/delete, schedule, platform event, or autolaunched call.', best:'On triggered starts, set tight entry criteria.', mistake:'Triggering on every update instead of only when relevant.'},
  {name:'Screen', ico:'🖥️', c:'#0d6b7a', purpose:'Shows fields and choices to a user.', usage:'Collect input, confirm an action, display a summary.', best:'Use component visibility & input validation to keep the path simple.', mistake:'Putting DML after the last screen — it may never run.'},
  {name:'Assignment', ico:'=', c:'#e6a13a', purpose:'Changes variables or record-variable fields.', usage:'Set values before a DML element.', best:'Do all your value-setting here, then one DML.', mistake:'Assigning inside a loop but forgetting to move DML outside it.'},
  {name:'Decision', ico:'◆', c:'#ef7a52', purpose:'Routes the flow like IF/ELSE.', usage:'New vs updated? bypass? ready to update?', best:'Name outcomes clearly and check for null/empty first.', mistake:'Deeply nested decisions instead of grouped conditions or a formula.'},
  {name:'Loop', ico:'↻', c:'#7a5cd6', purpose:'Iterates over a collection.', usage:'Process each record in a list.', best:'Assign inside the loop; do a single DML outside it.', mistake:'Performing Get/Create/Update/Delete inside the loop (governor limits).'},
  {name:'Get Records', ico:'🔎', c:'#e05a86', purpose:'Fetches Salesforce data.', usage:'Load the record(s) the flow needs.', best:'Get only the fields you need; decide what happens if zero rows return.', mistake:'Assuming a record was found without a null check.'},
  {name:'Create Records', ico:'＋', c:'#e05a86', purpose:'Inserts new records.', usage:'Create a child, a task, a log.', best:'Bulk-create from a collection outside a loop.', mistake:'Creating one record per loop iteration.'},
  {name:'Update Records', ico:'✎', c:'#e05a86', purpose:'Commits record changes.', usage:'Save edits to one or many records.', best:'Keep outside loops; attach a fault path.', mistake:'No fault path, so failures are silent.'},
  {name:'Delete Records', ico:'🗑', c:'#e05a86', purpose:'Removes records.', usage:'Clean-up and archival.', best:'Filter carefully; confirm scope before activating.', mistake:'Deleting more than intended due to loose criteria.'},
  {name:'Action', ico:'⚡', c:'#0d6b7a', purpose:'Calls a built-in or Apex action.', usage:'Send email, submit for approval, call Apex/callout.', best:'Add a fault path; move callouts to an async path.', mistake:'Running a callout in a synchronous, save-blocking path.'},
  {name:'Subflow', ico:'⧉', c:'#0d6b7a', purpose:'Calls another (autolaunched) flow.', usage:'Reuse common logic across flows.', best:'Extract repeated logic once and call it everywhere.', mistake:'Copy-pasting the same logic into many flows instead.'},
  {name:'Fault Path', ico:'⚠', c:'#c23a2b', purpose:'Handles errors gracefully.', usage:'Branches off DML, actions, subflows, Apex, callouts.', best:'Show the user what failed and what to do next.', mistake:'Leaving DML without a fault path.'}
];
(function(){
  const pal = document.getElementById('palette');
  const det = document.getElementById('palDetail');
  if (!pal) return;
  PALETTE.forEach((el, i) => {
    const b = document.createElement('button'); b.className = 'pel'; b.dataset.i = i;
    b.innerHTML = '<span class="pico" style="background:'+el.c+'">'+el.ico+'</span><span class="pname">'+el.name+'</span>';
    b.addEventListener('click', () => {
      pal.querySelectorAll('.pel').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      det.innerHTML = '<h4>'+el.name+'</h4>'+
        '<div class="row"><b>Purpose · </b>'+el.purpose+'</div>'+
        '<div class="row"><b>Typical use · </b>'+el.usage+'</div>'+
        '<div class="row"><b>Best practice · </b>'+el.best+'</div>'+
        '<div class="row"><b>Common mistake · </b>'+el.mistake+'</div>';
    });
    pal.appendChild(b);
  });
})();

/* =====================================================================
   INTERACTIVE: Record-triggered flow diagram
   ===================================================================== */
const RT_NODES = [
  {t:'Record event', k:'Start', ico:'⚡', d:'A record is created, updated, or deleted. This event launches the flow in the background — no user involved.'},
  {t:'Entry criteria', k:'Filter', ico:'🚦', d:'Conditions that decide whether the flow runs at all — e.g. only when Status changes to Assigned. Tight criteria prevent unnecessary runs and recursion.'},
  {t:'Decision', k:'Logic', ico:'◆', dec:true, d:'Routes the flow. Common outcomes: is this new or updated (ISNEW)? does the user have a bypass? Name every outcome clearly.'},
  {t:'Get / Assign', k:'Prepare', ico:'🔎', d:'Fetch any related data, then set values on variables or on $Record — before touching the database.'},
  {t:'Update records', k:'DML', ico:'✎', d:'Commit the change. Keep DML outside loops and attach a fault path so failures are visible.'},
  {t:'End', k:'Finish', ico:'■', d:'The flow completes. An after-save flow can also start scheduled or asynchronous paths from here.'}
];
(function(){
  const canvas = document.getElementById('rtDiagram');
  const det = document.getElementById('rtDetail');
  if (!canvas) return;
  RT_NODES.forEach((n, i) => {
    if (i>0){ const ar = document.createElement('div'); ar.className='farrow'; ar.innerHTML='→'; canvas.appendChild(ar); }
    const node = document.createElement('button');
    node.className = 'fnode' + (n.dec ? ' decision' : ''); node.dataset.i = i;
    node.innerHTML = '<div class="fi">'+n.ico+'</div><div class="ft">'+n.t+'</div><div class="fk">'+n.k+'</div>';
    node.addEventListener('click', () => {
      canvas.querySelectorAll('.fnode').forEach(x => x.classList.remove('sel'));
      node.classList.add('sel');
      det.innerHTML = '<h4>'+n.t+'</h4><p>'+n.d+'</p>';
    });
    canvas.appendChild(node);
  });
})();

/* =====================================================================
   INTERACTIVE: Order of Execution stepper
   ===================================================================== */
const OOE = [
  {t:'Load the original record from the database'},
  {t:'Overwrite old values with the new field values'},
  {t:'Flow: Before-Save updates run', key:true},
  {t:'Before Apex triggers run'},
  {t:'Validation rules run', key:true},
  {t:'Duplicate rules run'},
  {t:'Record saved to the database (not yet committed)'},
  {t:'After Apex triggers run'},
  {t:'Flow: After-Save runs', key:true},
  {t:'Workflow, assignment, escalation & roll-up rules'},
  {t:'Commit DML to the database'}
];
(function(){
  const list = document.getElementById('ooeList');
  const playBtn = document.getElementById('ooePlay');
  const resetBtn = document.getElementById('ooeReset');
  const label = document.getElementById('ooeLabel');
  if (!list) return;
  OOE.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'ooe-step' + (s.key ? ' key' : ''); row.dataset.i = i;
    row.innerHTML = '<div class="idx">'+(i+1)+'</div><div class="ob"><b>'+(s.key ? s.t.split(':')[0] : '')+(s.key?': ':'')+'</b><span>'+(s.key ? s.t.split(': ')[1] : s.t)+'</span></div>';
    list.appendChild(row);
  });
  const rows = Array.from(list.children);
  let timer = null, cur = -1;
  function reset(){ if(timer) clearInterval(timer); timer=null; cur=-1; rows.forEach(r=>r.classList.remove('active','past')); label.textContent='Insert / update / upsert statement'; playBtn.textContent='▶ Play the save'; }
  function play(){
    reset();
    playBtn.textContent='Running…';
    timer = setInterval(() => {
      if (cur >= 0) rows[cur].classList.replace('active','past');
      cur++;
      if (cur >= rows.length){ clearInterval(timer); timer=null; label.textContent='Transaction committed ✓'; playBtn.textContent='▶ Play again'; return; }
      rows[cur].classList.add('active');
      rows[cur].scrollIntoView({block:'nearest', behavior:'smooth'});
      label.textContent = 'Step ' + (cur+1) + ' of ' + rows.length;
    }, 750);
  }
  playBtn.addEventListener('click', play);
  resetBtn.addEventListener('click', reset);
})();

/* =====================================================================
   INTERACTIVE: Validation simulator
   ===================================================================== */
(function(){
  const sim = document.getElementById('valSim'); if(!sim) return;
  const status = document.getElementById('vsStatus');
  const worker = document.getElementById('vsWorker');
  const template = document.getElementById('vsTemplate');
  const res = document.getElementById('vsResult');
  document.getElementById('vsSave').addEventListener('click', () => {
    const blank = v => !v || !v.trim();
    const isAssigned = status.value === 'Assigned';
    if (isAssigned && blank(worker.value)){ res.className='result no'; res.textContent='❌ "Select a Worker before setting the job to Assigned."'; return; }
    if (isAssigned && blank(template.value)){ res.className='result no'; res.textContent='❌ "Choose or create a named Job Template before assigning this job."'; return; }
    res.className='result ok'; res.textContent='✅ Record saved — it passes both validation rules.';
  });
  document.getElementById('vsReset').addEventListener('click', () => {
    status.value='Draft'; worker.value=''; template.value=''; res.className='result'; res.textContent='';
  });
})();

/* =====================================================================
   INTERACTIVE: Screen flow mock (component validation + visibility)
   ===================================================================== */
(function(){
  const sim = document.getElementById('screenSim'); if(!sim) return;
  const name = document.getElementById('ssName'), email = document.getElementById('ssEmail');
  const phone = document.getElementById('ssPhone'), phoneField = document.getElementById('ssPhoneField');
  const wants = document.getElementById('ssWantsCall'), res = document.getElementById('ssResult');
  const show = (id,on) => document.getElementById(id).classList.toggle('show', on);
  wants.addEventListener('change', () => { phoneField.style.display = wants.checked ? 'block' : 'none'; });
  document.getElementById('ssNext').addEventListener('click', () => {
    let ok = true;
    show('ssNameErr', false); show('ssEmailErr', false); show('ssPhoneErr', false); res.className='result';
    if (!name.value.trim()){ show('ssNameErr', true); ok=false; }
    if (email.value.indexOf('@') === -1){ show('ssEmailErr', true); ok=false; }
    if (wants.checked && !phone.value.trim()){ show('ssPhoneErr', true); ok=false; }
    if (ok){ res.className='result ok'; res.textContent='✅ Validation passed — the flow moves to the next screen.'; }
  });
  document.getElementById('ssReset').addEventListener('click', () => {
    name.value=''; email.value=''; phone.value=''; wants.checked=false; phoneField.style.display='none';
    show('ssNameErr',false); show('ssEmailErr',false); show('ssPhoneErr',false); res.className='result';
  });
})();

/* =====================================================================
   INTERACTIVE: Comparison tabs
   ===================================================================== */
const CMP = [
  {label:'Workflow/PB vs Flow', head:['Aspect','Workflow & Process Builder','Flow'], rows:[
    ['Status','Retired 31 Dec 2025','The standard, actively developed'],
    ['Capability','Limited actions','Create/update/delete/query, screens, callouts, Apex'],
    ['Performance','Older engine','Faster; before-save option'],
    ['New builds','Not allowed','All new automation']
  ]},
  {label:'Before vs After save', head:['Aspect','Before save','After save'], rows:[
    ['Speed','Fastest','Slower (full transaction)'],
    ['Best for','Same-record field updates','Related records, emails, subflows, async'],
    ['Record Id','Not yet on insert','Available'],
    ['Sets fields via','$Record assignment','Update Records element']
  ]},
  {label:'Screen vs Autolaunched', head:['Aspect','Screen flow','Autolaunched flow'], rows:[
    ['User interaction','Yes — shows an interface','None — runs in background'],
    ['Launch independently','No (needs a launch point)','No (invoked/called)'],
    ['Typical use','Registration, guided steps','Subflow, reusable logic'],
    ['Rollback in debug','Not in rollback','n/a']
  ]},
  {label:'Record-triggered vs Scheduled', head:['Aspect','Record-triggered','Scheduled'], rows:[
    ['Fires on','A record event','A clock (date/time + frequency)'],
    ['Timing','Immediate','Once / Daily / Weekly'],
    ['Best for','React to a change','Batch clean-up, reminders'],
    ['Scope','The triggering record','A set of records']
  ]},
  {label:'Flow vs Apex', head:['Aspect','Flow (low-code)','Apex (code)'], rows:[
    ['Build speed','Fast, visual','Slower, developer skill'],
    ['Best for','Clicks, updates, screens, orchestration','Complex logic, integration, advanced transactions'],
    ['Callouts','Via async path/action','Full control (queueable)'],
    ['Rule of thumb','Smallest tool that fits','When Flow genuinely can\'t']
  ]}
];
(function(){
  const btns = document.getElementById('cmpBtns');
  const panels = document.getElementById('cmpPanels');
  if (!btns) return;
  CMP.forEach((c, i) => {
    const b = document.createElement('button'); b.textContent = c.label; b.dataset.i = i;
    if (i===0) b.classList.add('active');
    btns.appendChild(b);
    const p = document.createElement('div'); p.className = 'tab-panel' + (i===0?' active':''); p.dataset.i = i;
    let html = '<div class="table-wrap"><table class="cmp"><thead><tr>';
    c.head.forEach(h => html += '<th>'+h+'</th>'); html += '</tr></thead><tbody>';
    c.rows.forEach(r => { html += '<tr>'; r.forEach(cell => html += '<td>'+cell+'</td>'); html += '</tr>'; });
    html += '</tbody></table></div>';
    p.innerHTML = html; panels.appendChild(p);
    b.addEventListener('click', () => {
      btns.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      panels.querySelectorAll('.tab-panel').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); p.classList.add('active');
    });
  });
})();

/* =====================================================================
   INTERACTIVE: Quiz
   ===================================================================== */
const QUIZ = [
  {q:'A formula field should be used when…', opts:['The value is derived and users should not edit it','The user must be stopped before clicking Next','A REST API must be called'], a:0, e:'Formula fields calculate read-only values from record data.'},
  {q:'Which automation updates Status on the same record fastest, before save?', opts:['After-save flow','Before-save record-triggered flow','Scheduled flow'], a:1, e:'Before-save flows are optimized for same-record field updates and run before validation.'},
  {q:'Where do validation rules run in the order of execution?', opts:['After the record commits','Before before-save flows','After before-save flows & before triggers, before the save completes'], a:2, e:'Before-save flow and before triggers run first, then validation rules, then the save.'},
  {q:'Which functions exist ONLY in record-triggered flows?', opts:['ISBLANK & ISPICKVAL','ISNEW & ISCHANGED','TEXT & VALUE'], a:1, e:'ISNEW() and ISCHANGED() need the record context only record-triggered flows have.'},
  {q:'An external API callout after a record is saved should use…', opts:['A before-save flow','An asynchronous path or Apex queueable','A formula field'], a:1, e:'Callouts must not block the save — run them after the transaction, asynchronously.'}
];
(function(){
  const wrap = document.getElementById('quizWrap'); if(!wrap) return;
  QUIZ.forEach((item, qi) => {
    const box = document.createElement('div'); box.className = 'quiz';
    let opts = '<div class="opts">';
    item.opts.forEach((o, oi) => opts += '<button class="opt" data-q="'+qi+'" data-o="'+oi+'">'+o+'</button>');
    opts += '</div>';
    box.innerHTML = '<div class="q">'+(qi+1)+'. '+item.q+'</div>'+opts+'<div class="explain" id="qx'+qi+'"></div>';
    wrap.appendChild(box);
    box.querySelectorAll('.opt').forEach(btn => {
      btn.addEventListener('click', () => {
        if (box.dataset.done) return;
        box.dataset.done = '1';
        const chosen = +btn.dataset.o;
        box.querySelectorAll('.opt').forEach((b, i) => {
          b.classList.add('disabled');
          if (i === item.a) b.classList.add('correct');
          else if (i === chosen) b.classList.add('wrong');
        });
        const x = document.getElementById('qx'+qi);
        x.innerHTML = (chosen === item.a ? '<b>Correct.</b> ' : '<b>Not quite.</b> ') + item.e;
        x.classList.add('show');
      });
    });
  });
})();

/* =====================================================================
   INTERACTIVE: Decision engine (final challenge)
   ===================================================================== */
const ENGINE = [
  {text:'Set Status to "Assigned" on the same Job when a Worker is selected.', opts:['Before-save flow','Screen flow','Scheduled flow'], a:0, why:'Same-record field update, no related records, no external action — before-save is the cleanest, fastest choice.'},
  {text:'Let an admin reassign a Worker from the record page, with a confirmation step.', opts:['Screen flow','Before-save flow','Platform-event flow'], a:0, why:'The user must review and provide input, so a screen flow launched from the record page fits.'},
  {text:'Call an external contractor API after a Job is saved.', opts:['Before-save flow','Async path / Apex queueable','Formula field'], a:1, why:'External callouts should never block the main save — run them asynchronously.'},
  {text:'Show admins, in a list view, whether a Job is ready for sync.', opts:['Formula field','Validation rule','Scheduled flow'], a:0, why:'A read-only derived label is exactly what a formula field is for.'},
  {text:'Prevent saving a Job as "Assigned" with no Worker.', opts:['Validation rule','After-save flow','Subflow'], a:0, why:'Blocking an invalid state on save is the definition of a validation rule.'},
  {text:'Delete obsolete records every night at 02:00.', opts:['Scheduled flow','Record-triggered flow','Screen flow'], a:0, why:'Recurring, time-based, batched work is a scheduled flow.'}
];
(function(){
  const root = document.getElementById('engine'); if(!root) return;
  const textEl = document.getElementById('engText');
  const choicesEl = document.getElementById('engChoices');
  const verdict = document.getElementById('engVerdict');
  const nextBtn = document.getElementById('engNext');
  const prog = document.getElementById('engProg');
  let idx = 0, score = 0;
  function render(){
    const item = ENGINE[idx];
    textEl.textContent = item.text;
    verdict.className = 'verdict'; verdict.textContent = '';
    nextBtn.style.display = 'none';
    prog.textContent = 'Requirement ' + (idx+1) + ' of ' + ENGINE.length + ' · Score ' + score;
    choicesEl.innerHTML = '';
    item.opts.forEach((o, oi) => {
      const b = document.createElement('button'); b.className='choice'; b.textContent = o;
      b.addEventListener('click', () => {
        if (root.dataset.done) return; root.dataset.done = '1';
        choicesEl.querySelectorAll('.choice').forEach((c, i) => {
          if (i === item.a) c.classList.add('right');
          else if (i === oi) c.classList.add('wrongpick');
        });
        if (oi === item.a){ score++; verdict.className='verdict ok show'; verdict.innerHTML = '<b>Correct — '+item.opts[item.a]+'.</b> '+item.why; }
        else { verdict.className='verdict no show'; verdict.innerHTML = '<b>Recommended: '+item.opts[item.a]+'.</b> '+item.why; }
        prog.textContent = 'Requirement ' + (idx+1) + ' of ' + ENGINE.length + ' · Score ' + score;
        nextBtn.style.display = idx < ENGINE.length-1 ? 'inline-flex' : 'none';
        if (idx === ENGINE.length-1){ verdict.innerHTML += '<br><br>🎉 That\'s the last one — final score <b>'+score+' / '+ENGINE.length+'</b>.'; }
      });
      choicesEl.appendChild(b);
    });
  }
  nextBtn.addEventListener('click', () => { idx++; delete root.dataset.done; render(); });
  render();
})();

})();
