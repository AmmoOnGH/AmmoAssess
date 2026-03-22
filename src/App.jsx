import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const SK = { questions:"_ac_q7x", exams:"_ac_e3k", users:"_ac_u9m", attempts:"_ac_a2p" };

function hashPw(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8,"0");
}

function makeToken() { return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function getSession() { try { return JSON.parse(sessionStorage.getItem("_ac_tok")||"null"); } catch { return null; } }
function setSession(u) { sessionStorage.setItem("_ac_tok", JSON.stringify({...u, tok:makeToken(), at:Date.now()})); }
function clearSession() { sessionStorage.removeItem("_ac_tok"); }

function shuffle(arr) {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

const RATE_WINDOW=60000; const MAX_ATTEMPTS=5;
function checkRate(uid) {
  try {
    const key=`_ac_rl_${hashPw(uid.toLowerCase())}`;
    const raw=sessionStorage.getItem(key);
    const now=Date.now();
    const attempts=raw?JSON.parse(raw).filter(t=>now-t<RATE_WINDOW):[];
    if(attempts.length>=MAX_ATTEMPTS){
      const wait=Math.ceil((RATE_WINDOW-(now-attempts[0]))/1000);
      return {blocked:true,wait};
    }
    attempts.push(now);
    sessionStorage.setItem(key,JSON.stringify(attempts));
    return {blocked:false};
  } catch { return {blocked:false}; }
}

function migrateUsers() {
  const users=ls(SK.users, null);
  if(!users) {
    lsSet(SK.users,[{uid:"ammodev",phx:hashPw("nicejobfindingthis"),role:"admin"}]);
    return;
  }
  const needsMigration=users.some(u=>u.password!==undefined||u.passwordHash!==undefined||u.username!==undefined);
  if(needsMigration){
    const migrated=users.map(u=>{
      const out={};
      out.uid = u.uid || u.username || "";
      out.phx = u.phx || u.passwordHash || (u.password ? hashPw(u.password) : hashPw("nicejobfindingthis"));
      out.role = u.role || "student";
      if(u.assignedExam !== undefined) out.assignedExam = u.assignedExam;
      return out;
    });
    lsSet(SK.users,migrated);
  }
}

const DEMO_QUESTIONS = [
  { id:"dq1", stem:"A 58-year-old man presents with 3 months of progressive dysphagia (solids then liquids) and 8 kg weight loss. He has a 30 pack-year smoking history and drinks 30 standard drinks/week. He appears cachectic. What is the MOST likely diagnosis?", options:{A:"Achalasia",B:"Oesophageal adenocarcinoma",C:"Oesophageal squamous cell carcinoma",D:"Diffuse oesophageal spasm",E:"Plummer-Vinson syndrome"}, answer:"C", explanation:"Progressive dysphagia (solids → liquids), significant weight loss, heavy smoking and high alcohol intake in an older male strongly favours oesophageal SCC. SCC is classically associated with smoking and alcohol; adenocarcinoma is more associated with GORD/Barrett's.", tags:["upper GI","oncology","difficulty-3"], dateAdded:"2026-03-20" },
  { id:"dq2", stem:"A 34-year-old woman has intermittent dysphagia to both solids and liquids for 2 years, with regurgitation of undigested food and nocturnal cough. A barium swallow shows a 'bird-beak' appearance at the GOJ. What is the PRIMARY pathophysiological mechanism?", options:{A:"Hypertrophy of the circular muscle increasing LOS pressure",B:"Loss of inhibitory myenteric neurons causing failure of LOS relaxation",C:"Metaplastic replacement of squamous by columnar epithelium",D:"Oesophageal wall fibrosis from chronic acid reflux",E:"Upper oesophageal sphincter dysfunction from CN X palsy"}, answer:"B", explanation:"This is achalasia. Loss of inhibitory (nitrergic) neurons in the myenteric plexus causes failure of LOS relaxation and absent peristalsis. The 'bird-beak' is pathognomonic.", tags:["upper GI","physiology","difficulty-3"], dateAdded:"2026-03-20" },
  { id:"dq3", stem:"A 45-year-old obese woman with a 5-year history of heartburn/regurgitation is on omeprazole 20 mg daily with partial relief. Endoscopy reveals salmon-coloured mucosa 3 cm above the GOJ; biopsy confirms intestinal metaplasia. What is the MOST appropriate next step?", options:{A:"Increase omeprazole to 40 mg BD and repeat endoscopy in 5 years",B:"Urgent surgical referral for oesophagectomy",C:"Endoscopic surveillance with biopsies every 2–3 years",D:"Immediate referral for endoscopic mucosal resection",E:"Cease omeprazole and trial H2 receptor antagonist"}, answer:"C", explanation:"Non-dysplastic Barrett's oesophagus is managed with high-dose PPI and endoscopic surveillance every 2–3 years per current guidelines.", tags:["upper GI","gastroenterology","difficulty-2"], dateAdded:"2026-03-21" },
];

const DEFAULT_USERS = [{ uid:"ammodev", phx:hashPw("nicejobfindingthis"), role:"admin" }];

function ls(key, fallback) {
  try { const v=localStorage.getItem(key); return v?JSON.parse(v):fallback; } catch { return fallback; }
}
function lsSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function genId() { return Date.now().toString(36)+Math.random().toString(36).slice(2); }
function fmt(s) {
  return `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}

// Run migration once at module load
migrateUsers();

// ─────────────────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────────────────
const Ic = {
  menu:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  finish:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  calc:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><circle cx="8" cy="11" r="1" fill="currentColor"/><circle cx="12" cy="11" r="1" fill="currentColor"/><circle cx="16" cy="11" r="1" fill="currentColor"/><circle cx="8" cy="15" r="1" fill="currentColor"/><circle cx="12" cy="15" r="1" fill="currentColor"/><circle cx="16" cy="15" r="1" fill="currentColor"/><circle cx="8" cy="19" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/><circle cx="16" cy="19" r="1" fill="currentColor"/></svg>,
  colour:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" opacity=".2"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>,
  lang:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  prev:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>,
  next:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>,
  plus:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  upload:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  download: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  check:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
  x:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  trash:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>,
  edit:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  eye:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  logout:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  user:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  exam:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  bank:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  shield:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
};

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=PT+Mono&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --teal:#1a3a4a;--tl:#234d62;--td:#0f2030;
  --green:#2e7d32;--gl:#4caf50;--gb:#e8f5e9;
  --amber:#e8a020;--al:#f5b942;
  --bg:#e8edf0;--panel:#fff;--border:#c8d4da;
  --text:#1a2530;--muted:#5a7080;
  --ob:#f0f4f6;--oh:#dde8ee;--os:#1a3a4a;
  --correct:#2e7d32;--cb:#e8f5e9;
  --wrong:#c62828;--wb:#ffebee;
  --sh:0 1px 3px rgba(0,0,0,.12);
}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text)}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#b0bec5;border-radius:3px}

/* LOGIN */
.lp{min-height:100vh;display:flex;flex-direction:column;background:#0d2233;position:relative;overflow:hidden}
.lp-bg{position:absolute;inset:0;background-image:url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1400&q=80');background-size:cover;background-position:center top;opacity:.25;filter:blur(1px) saturate(1.3) hue-rotate(160deg)}
.lp-hdr{position:relative;z-index:2;background:rgba(10,27,40,.9);padding:13px 24px;border-bottom:1px solid rgba(255,255,255,.07)}
.lp-logo{font-size:22px;font-weight:800;color:#fff;letter-spacing:-.4px;font-family:'DM Sans',sans-serif}
.lp-logo strong{font-family:'PT Mono',monospace;font-weight:400;letter-spacing:-.5px}
.lp-logo em{font-style:normal;color:#68e348;font-family:'DM Sans',sans-serif}
.lp-body{position:relative;z-index:2;flex:1;display:flex;align-items:center;padding:40px 24px}
.lp-card{background:rgba(255,255,255,.97);border-radius:6px;padding:30px 34px;width:100%;max-width:420px;box-shadow:0 8px 40px rgba(0,0,0,.45)}
.lp-card h2{font-size:17px;font-weight:700;color:var(--text);margin-bottom:20px}
.lp-f{display:flex;flex-direction:column;gap:4px;margin-bottom:13px}
.lp-f label{font-size:13px;font-weight:500;color:var(--text)}
.lp-f input{border:1.5px solid var(--border);border-radius:4px;padding:9px 11px;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--text);transition:border-color .15s}
.lp-f input:focus{outline:none;border-color:var(--teal)}
.lp-btn{width:100%;padding:11px;background:var(--teal);color:#fff;border:none;border-radius:4px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px;transition:background .15s}
.lp-btn:hover{background:var(--tl)}
.lp-err{color:#c62828;font-size:12px;margin-top:6px;font-weight:500}
.lp-foot{position:relative;z-index:2;text-align:center;font-size:11px;color:rgba(255,255,255,.35);padding:14px}

/* ADMIN */
.ash{display:flex;flex-direction:column;min-height:100vh}
.atb{background:var(--td);color:#fff;height:50px;display:flex;align-items:center;padding:0 18px;gap:12px;flex-shrink:0;border-bottom:2px solid #1a3a4a}
.a-logo{font-size:16px;font-weight:800;letter-spacing:-.3px;font-family:'DM Sans',sans-serif}
.a-logo strong{font-family:'PT Mono',monospace;font-weight:400}
.a-logo em{font-style:normal;color:#68e348;font-family:'DM Sans',sans-serif}
.a-nav{display:flex;gap:2px;flex:1;margin-left:12px}
.a-nb{display:flex;align-items:center;gap:6px;padding:6px 13px;border-radius:4px;background:none;border:none;color:rgba(255,255,255,.6);font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;cursor:pointer;text-transform:uppercase;letter-spacing:.05em;transition:all .15s}
.a-nb:hover{background:rgba(255,255,255,.1);color:#fff}
.a-nb.on{background:var(--tl);color:#fff}
.a-ui{display:flex;align-items:center;gap:8px;margin-left:auto;font-size:12px;color:rgba(255,255,255,.55)}
.a-ui strong{color:rgba(255,255,255,.9)}
.a-body{flex:1;padding:22px;display:flex;flex-direction:column;gap:14px}

/* CARDS */
.sr{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.sc{background:#fff;border-radius:6px;border:1px solid var(--border);padding:14px 18px;box-shadow:var(--sh)}
.sc .v{font-size:28px;font-weight:800;color:var(--teal);line-height:1}
.sc .l{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-top:3px}
.card{background:#fff;border-radius:6px;border:1px solid var(--border);box-shadow:var(--sh);overflow:hidden}
.ch{background:var(--teal);color:#fff;padding:9px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;display:flex;align-items:center;justify-content:space-between}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;gap:5px;padding:6px 13px;border-radius:4px;border:none;font-family:'DM Sans',sans-serif;font-size:11.5px;font-weight:600;cursor:pointer;transition:all .15s;letter-spacing:.02em;white-space:nowrap}
.bt{background:var(--teal);color:#fff}.bt:hover{background:var(--tl)}
.ba{background:var(--amber);color:#1a1200}.ba:hover{background:var(--al)}
.bg{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.25)}.bg:hover{background:rgba(255,255,255,.22)}
.bw{background:#fff;color:var(--teal);border:1px solid var(--border)}.bw:hover{background:var(--ob)}
.bd{background:#ffebee;color:var(--wrong);border:1px solid #ffcdd2}.bd:hover{background:#ffcdd2}
.sm{padding:4px 9px;font-size:10.5px}
.btn:disabled{opacity:.4;cursor:not-allowed}
.ib{background:none;border:none;cursor:pointer;padding:4px;border-radius:3px;color:var(--muted);display:flex;align-items:center;transition:all .12s}
.ib:hover{background:var(--ob);color:var(--text)}
.ib.dg:hover{color:var(--wrong);background:#ffebee}

/* TABLE */
.qth{display:grid;padding:8px 13px;background:var(--teal);color:#fff;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;gap:10px}
.qtr{display:grid;padding:10px 13px;border-bottom:1px solid var(--border);gap:10px;align-items:center;font-size:13px;cursor:pointer;transition:background .1s}
.qtr:hover{background:var(--ob)}
.qtr:last-child{border-bottom:none}
.qstem{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}
.qnum{font-weight:700;color:var(--teal);font-variant-numeric:tabular-nums}
.qtags{display:flex;gap:4px;flex-wrap:wrap}
.qtag{padding:2px 6px;background:var(--ob);border-radius:20px;font-size:9.5px;font-weight:600;color:var(--muted);border:1px solid var(--border)}
.qact{display:flex;gap:2px;justify-content:flex-end}
.qcc{grid-template-columns:36px 1fr 180px 72px 70px}
.ecc{grid-template-columns:36px 1fr 110px 90px 70px}

/* FILTER */
.fb{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.tc{padding:3px 9px;border-radius:20px;font-size:10.5px;font-weight:600;border:1.5px solid var(--border);background:#fff;cursor:pointer;color:var(--muted);transition:all .12s;font-family:'DM Sans',sans-serif}
.tc:hover{border-color:var(--teal);color:var(--teal)}
.tc.on{background:var(--teal);color:#fff;border-color:var(--teal)}

/* MODAL */
.ov{position:fixed;inset:0;background:rgba(0,0,0,.46);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
.mo{background:#fff;border-radius:8px;width:100%;max-width:700px;max-height:92vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.28)}
.mh{background:var(--teal);color:#fff;padding:12px 17px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;display:flex;align-items:center;justify-content:space-between;border-radius:8px 8px 0 0}
.mh .ib{color:rgba(255,255,255,.7)}.mh .ib:hover{color:#fff;background:rgba(255,255,255,.12)}
.mb{padding:17px;display:flex;flex-direction:column;gap:12px}
.mf{padding:13px 17px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px}
.fi{display:flex;flex-direction:column;gap:4px}
.fi label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--teal)}
.fi input,.fi textarea,.fi select{border:1.5px solid var(--border);border-radius:4px;padding:7px 10px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text);transition:border-color .12s;width:100%}
.fi input:focus,.fi textarea:focus,.fi select:focus{outline:none;border-color:var(--teal)}
.fi textarea{min-height:75px;resize:vertical;line-height:1.6}
.og{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.or{display:flex;align-items:flex-start;gap:6px}
.ol{font-weight:700;font-size:13px;padding-top:8px;color:var(--teal);min-width:14px}
.arr{display:flex;align-items:center;gap:8px;margin-top:3px}

/* BUILDER */
.bl{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start}
.bpool{max-height:480px;overflow-y:auto}
.bsel{max-height:480px;overflow-y:auto}
.si{display:flex;align-items:center;gap:7px;padding:8px 11px;border-bottom:1px solid var(--border);font-size:12px}
.si:last-child{border-bottom:none}
.sn{width:18px;font-weight:700;color:var(--teal);font-size:10.5px;flex-shrink:0}
.ss{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}

/* EXAM */
.ew{display:flex;flex-direction:column;height:100vh;overflow:hidden}
.tb{background:var(--teal);color:#fff;display:flex;align-items:center;padding:0 11px;height:52px;gap:2px;flex-shrink:0;border-bottom:2px solid var(--td)}
.tbb{display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 8px;border-radius:4px;background:none;border:none;color:#fff;cursor:pointer;font-size:8px;font-family:'DM Sans',sans-serif;letter-spacing:.06em;text-transform:uppercase;font-weight:700;transition:background .15s;white-space:nowrap}
.tbb:hover{background:var(--tl)}
.tbb svg{flex-shrink:0}
.ts{width:1px;background:rgba(255,255,255,.15);height:27px;margin:0 3px}
.tc2{flex:1;display:flex;align-items:center;justify-content:center;gap:28px}
.tt{display:flex;flex-direction:column;align-items:center;font-size:8px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.6)}
.tt .tv{font-size:18px;font-weight:800;color:#fff;letter-spacing:.02em;font-variant-numeric:tabular-nums}
.tt.w .tv{color:var(--al)}
.ti{display:flex;flex-direction:column;align-items:center;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.6)}
.ti .iv{font-size:13px;font-weight:700;color:#fff}
.tnav{display:flex}
.tnav button{display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:none;color:#fff;cursor:pointer;padding:5px 11px;font-size:8px;text-transform:uppercase;font-weight:700;letter-spacing:.06em;font-family:'DM Sans',sans-serif;border-radius:4px;transition:background .15s}
.tnav button:hover{background:var(--tl)}
.tnav button:disabled{opacity:.3;cursor:not-allowed}
.ab{background:var(--amber);text-align:center;font-size:12px;font-weight:700;color:#1a1200;padding:5px 0;letter-spacing:.04em;flex-shrink:0}
.eb{display:grid;grid-template-columns:152px 1fr 330px;flex:1;overflow:hidden}

/* Nav panel */
.np{background:var(--panel);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
.nh{background:var(--teal);color:#fff;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:7px 11px}
.nl{overflow-y:auto;flex:1;padding:6px 8px;display:flex;flex-direction:column;gap:3px}
.ni{display:flex;align-items:center;justify-content:center;width:100%;height:30px;border-radius:3px;cursor:pointer;font-size:12px;font-weight:600;transition:all .12s;color:var(--muted);border:1.5px solid var(--border);background:#fff}
.ni:hover{background:var(--oh);border-color:var(--tl)}
.ni.cur{background:var(--teal);color:#fff;border-color:var(--teal)}
.ni.ans{background:var(--green);color:#fff;border-color:var(--green);font-weight:700}
.ni.cur.ans{background:var(--green);color:#fff;border-color:var(--green);outline:2px solid var(--teal);outline-offset:1px}
.ni.fl{border-color:var(--amber)!important;box-shadow:inset 0 0 0 2px var(--amber)}

/* Stem panel */
.sp{background:var(--panel);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
.shd{background:var(--teal);color:#fff;font-size:9.5px;font-weight:700;padding:7px 16px;text-transform:uppercase;letter-spacing:.07em}
.sbody{flex:1;overflow-y:auto;padding:24px 28px}
.stxt{font-size:14.5px;line-height:1.78;color:var(--text)}

/* Answer panel */
.ap{background:var(--panel);display:flex;flex-direction:column;overflow:hidden}
.ahd{background:var(--teal);color:#fff;font-size:9.5px;font-weight:700;padding:7px 13px;text-transform:uppercase;letter-spacing:.07em;display:flex;align-items:center;justify-content:space-between}
.mb2{font-size:10.5px;font-weight:600;color:rgba(255,255,255,.6)}
.fsq{padding:3px 8px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:3px;cursor:pointer;display:flex;align-items:center;gap:5px;color:rgba(255,255,255,.8);transition:all .15s;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-family:'DM Sans',sans-serif}
.fsq:hover{background:rgba(255,255,255,.22)}
.fsq.fl{background:var(--amber);border-color:var(--amber);color:#1a1200}
.ab2{flex:1;overflow-y:auto;padding:13px;display:flex;flex-direction:column;gap:7px}
.ob{display:flex;align-items:flex-start;gap:8px;padding:9px 12px;background:var(--ob);border:1.5px solid var(--border);border-radius:4px;cursor:pointer;text-align:left;font-family:'DM Sans',sans-serif;font-size:13.5px;line-height:1.5;color:var(--text);transition:all .12s;width:100%}
.ob:hover:not(:disabled){background:var(--oh);border-color:var(--tl)}
.ob.sel{background:var(--os);border-color:var(--os);color:#fff}
.ob:disabled{cursor:default}
.ob.cor{background:var(--cb);border-color:var(--correct);color:var(--correct)}
.ob.inc{background:var(--wb);border-color:var(--wrong);color:var(--wrong)}
.olt{font-weight:700;min-width:16px;flex-shrink:0}
.oic{margin-left:auto;flex-shrink:0;padding-top:2px}

/* RESULTS */
.rw{min-height:100vh;background:var(--bg);display:flex;flex-direction:column}
.rb{background:var(--amber);padding:20px 36px;display:flex;align-items:center;gap:44px;flex-shrink:0}
.rs .v{font-size:32px;font-weight:800;color:var(--td);line-height:1}
.rs .l{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:rgba(0,0,0,.55);margin-top:3px}
.rl{padding:22px;display:flex;flex-direction:column;gap:16px;max-width:900px;margin:0 auto;width:100%}
.ri{background:#fff;border-radius:6px;border:1px solid var(--border);overflow:hidden;box-shadow:var(--sh)}
.rih{padding:9px 14px;display:flex;align-items:center;gap:9px;border-bottom:1px solid var(--border)}
.riqn{font-weight:700;font-size:13px;color:var(--teal)}
.rst{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 7px;border-radius:20px}
.rst.correct{background:var(--cb);color:var(--correct)}
.rst.incorrect{background:var(--wb);color:var(--wrong)}
.rst.unanswered{background:#fff3e0;color:#e65100}
.ristem{padding:11px 14px;font-size:13.5px;line-height:1.72;border-bottom:1px solid var(--border)}
.riopts{padding:10px 13px;display:flex;flex-direction:column;gap:5px;border-bottom:1px solid var(--border)}
.riexp{padding:11px 14px;font-size:13px;line-height:1.65}
.riel{font-weight:700;font-size:9.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--teal);margin-bottom:5px}

/* USERS */
.ug{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px;padding:14px}
.uc{border:1px solid var(--border);border-radius:6px;padding:13px 14px;display:flex;flex-direction:column;gap:7px}
.uct{display:flex;align-items:center;gap:9px}
.uav{width:34px;height:34px;border-radius:50%;background:var(--teal);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0}
.uav.adm{background:var(--amber);color:#1a1200}
.unm{font-weight:700;font-size:13.5px;color:var(--text)}
.urol{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 7px;border-radius:20px}
.urol.admin{background:rgba(232,160,32,.15);color:#b07800}
.urol.student{background:var(--gb);color:var(--green)}
.uex{font-size:11.5px;color:var(--muted);display:flex;align-items:center;gap:5px}

/* EMPTY */
.em{padding:44px;text-align:center;color:var(--muted);font-size:13.5px}
.em .t{font-size:17px;font-weight:700;color:var(--text);margin-bottom:7px}

/* STUDENT LANDING */
.sl-wrap{min-height:100vh;background:var(--bg);display:flex;flex-direction:column}
.sl-bar{background:var(--td);color:#fff;padding:13px 22px;display:flex;align-items:center;justify-content:space-between}
`;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED MODAL
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mo" style={wide?{maxWidth:920}:{}}>
        <div className="mh">
          <span>{title}</span>
          <button className="ib" onClick={onClose}>{Ic.x}</button>
        </div>
        <div className="mb">{children}</div>
        {footer&&<div className="mf">{footer}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [un,setUn]=useState(""); const [pw,setPw]=useState("");
  const [err,setErr]=useState(""); const [locked,setLocked]=useState(false); const [wait,setWait]=useState(0);

  // Countdown timer when locked
  useEffect(()=>{
    if(!locked) return;
    const t=setInterval(()=>{
      setWait(w=>{if(w<=1){setLocked(false);clearInterval(t);return 0;}return w-1;});
    },1000);
    return()=>clearInterval(t);
  },[locked]);

  function go() {
    if(locked) return;
    const rate=checkRate(un);
    if(rate.blocked){setLocked(true);setWait(rate.wait);setErr(`Too many attempts. Wait ${rate.wait}s.`);return;}
    const users=ls(SK.users,DEFAULT_USERS);
    const m=users.find(u=>u.uid.toLowerCase()===un.trim().toLowerCase()&&u.phx===hashPw(pw));
    if(!m){setErr("Incorrect credentials.");return;}
    setSession(m);
    onLogin(m);
  }
  const qs=ls(SK.questions,DEMO_QUESTIONS);
  return (
    <div className="lp">
      <style>{CSS}</style>
      <div className="lp-bg"/>
      <div className="lp-hdr"><div className="lp-logo"><strong>ammo</strong>/<em>assess</em></div></div>
      <div className="lp-body">
        <div className="lp-card">
          <h2>Enter your login credentials</h2>
          <div className="lp-f"><label>ID</label>
            <input value={un} onChange={e=>{setUn(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()} autoFocus/>
          </div>
          <div className="lp-f"><label>Key</label>
            <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()}/>
          </div>
          {err&&<div className="lp-err">{err}</div>}
          <button className="lp-btn" onClick={go} disabled={locked} style={locked?{opacity:.5,cursor:"not-allowed"}:{}}>
            {locked?`Locked (${wait}s)`:"Log in"}
          </button>
        </div>
      </div>
      <div className="lp-foot">{qs.length} question{qs.length!==1?"s":""} stored locally</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION MODAL
// ─────────────────────────────────────────────────────────────────────────────
const BQ = { stem:"", options:{A:"",B:"",C:"",D:"",E:""}, answer:"A", explanation:"", tags:"" };
function QModal({ initial, onSave, onClose }) {
  const [f,setF]=useState(initial?{...initial,tags:initial.tags.join(", ")}:BQ);
  const [showAns,setShowAns]=useState(false);
  const sf=(k,v)=>setF(p=>({...p,[k]:v}));
  const so=(k,v)=>setF(p=>({...p,options:{...p.options,[k]:v}}));
  function save() {
    if(!f.stem.trim())return alert("Stem required.");
    if(!["A","B","C","D","E"].every(l=>f.options[l].trim()))return alert("All 5 options required.");
    onSave({...f,id:initial?.id||genId(),tags:f.tags.split(",").map(t=>t.trim()).filter(Boolean),dateAdded:initial?.dateAdded||new Date().toISOString().slice(0,10)});
  }
  return (
    <Modal title={initial?"Edit Question":"Add Question"} onClose={onClose}
      footer={<><button className="btn bw" onClick={onClose}>Cancel</button><button className="btn ba" onClick={save}>Save Question</button></>}>
      <div className="fi"><label>Stem / Clinical Vignette</label>
        <textarea rows={5} value={f.stem} onChange={e=>sf("stem",e.target.value)} placeholder="A 45-year-old patient presents with..."/>
      </div>
      <div className="fi"><label>Options</label>
        <div className="og">
          {["A","B","C","D","E"].map(l=>(
            <div key={l} className="or"><span className="ol">{l}</span>
              <input value={f.options[l]} onChange={e=>so(l,e.target.value)} placeholder={`Option ${l}`}/>
            </div>
          ))}
        </div>
      </div>
      <div className="fi"><label>Correct Answer &amp; Explanation</label>
        <div className="arr">
          <select value={f.answer} onChange={e=>sf("answer",e.target.value)} style={{width:65,flexShrink:0}}>
            {["A","B","C","D","E"].map(l=><option key={l}>{l}</option>)}
          </select>
          <button className="btn bw sm" onClick={()=>setShowAns(s=>!s)}>
            {showAns?Ic.eyeOff:Ic.eye} {showAns?"Hide explanation":"Show explanation"}
          </button>
        </div>
        {showAns&&<textarea rows={4} style={{marginTop:6}} value={f.explanation} onChange={e=>sf("explanation",e.target.value)} placeholder="Explanation..."/>}
      </div>
      <div className="fi"><label>Tags (comma separated)</label>
        <input value={f.tags} onChange={e=>sf("tags",e.target.value)} placeholder="upper GI, physiology, difficulty-3"/>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER MODAL
// ─────────────────────────────────────────────────────────────────────────────
function UModal({ onSave, onClose, exams }) {
  const [un,setUn]=useState(""); const [pw,setPw]=useState(""); const [role,setRole]=useState("student"); const [ae,setAe]=useState("");
  function save() {
    if(!un.trim()||!pw.trim())return alert("ID and key required.");
    onSave({uid:un.trim(),phx:hashPw(pw),role,assignedExam:role==="student"?ae:""});
  }
  return (
    <Modal title="Add Login" onClose={onClose}
      footer={<><button className="btn bw" onClick={onClose}>Cancel</button><button className="btn ba" onClick={save}>Create Login</button></>}>
      <div className="fi"><label>ID</label><input value={un} onChange={e=>setUn(e.target.value)} placeholder="e.g. Mock1"/></div>
      <div className="fi"><label>Key</label><input value={pw} onChange={e=>setPw(e.target.value)} placeholder="e.g. ILoveExams"/></div>
      <div className="fi"><label>Role</label>
        <select value={role} onChange={e=>setRole(e.target.value)}>
          <option value="student">Student (exam only)</option>
          <option value="admin">Admin (full access)</option>
        </select>
      </div>
      {role==="student"&&(
        <div className="fi"><label>Assign Exam</label>
          <select value={ae} onChange={e=>setAe(e.target.value)}>
            <option value="">— No exam assigned —</option>
            {exams.map(ex=><option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
        </div>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAM BUILDER MODAL
// ─────────────────────────────────────────────────────────────────────────────
function BuilderModal({ questions, initial, onSave, onClose }) {
  const [name,setName]=useState(initial?.name||"");
  const [dur,setDur]=useState(initial?.duration||150);
  const [sel,setSel]=useState(initial?.questionIds||[]);
  const [search,setSearch]=useState("");
  const [tagF,setTagF]=useState(null);
  const allTags=[...new Set(questions.flatMap(q=>q.tags))].sort();
  const pool=questions.filter(q=>{
    const tok=!tagF||q.tags.includes(tagF);
    const stok=!search||q.stem.toLowerCase().includes(search.toLowerCase());
    return tok&&stok;
  });
  const toggle=id=>setSel(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  function save() {
    if(!name.trim())return alert("Exam name required.");
    if(sel.length===0)return alert("Select at least one question.");
    onSave({id:initial?.id||genId(),name:name.trim(),duration:dur,questionIds:sel,createdAt:initial?.createdAt||new Date().toISOString().slice(0,10)});
  }
  return (
    <div className="ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mo" style={{maxWidth:920,maxHeight:"94vh"}}>
        <div className="mh"><span>{initial?"Edit Exam":"New Exam"}</span><button className="ib" onClick={onClose}>{Ic.x}</button></div>
        <div className="mb" style={{gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 150px",gap:10}}>
            <div className="fi"><label>Exam Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Mock Exam 1 – Upper GI"/></div>
            <div className="fi"><label>Duration (min)</label><input type="number" min={5} max={360} value={dur} onChange={e=>setDur(Number(e.target.value))}/></div>
          </div>
          <div className="bl">
            <div className="card">
              <div className="ch">Question Pool ({pool.length})
                <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}
                  style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:3,padding:"3px 7px",color:"#fff",fontSize:10.5,width:130,fontFamily:"inherit"}}/>
              </div>
              {allTags.length>0&&(
                <div style={{padding:"7px 10px",display:"flex",gap:4,flexWrap:"wrap",borderBottom:"1px solid var(--border)"}}>
                  <button className={`tc${!tagF?" on":""}`} onClick={()=>setTagF(null)}>All</button>
                  {allTags.map(t=><button key={t} className={`tc${tagF===t?" on":""}`} onClick={()=>setTagF(tagF===t?null:t)}>{t}</button>)}
                </div>
              )}
              <div className="bpool">
                {pool.map(q=>{
                  const inS=sel.includes(q.id);
                  return (
                    <div key={q.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 11px",borderBottom:"1px solid var(--border)",fontSize:12,cursor:"pointer",background:inS?"var(--gb)":"#fff",transition:"background .1s"}}
                      onClick={()=>toggle(q.id)}>
                      <div style={{width:16,height:16,borderRadius:3,border:`1.5px solid ${inS?"var(--green)":"var(--border)"}`,background:inS?"var(--green)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#fff"}}>
                        {inS&&Ic.check}
                      </div>
                      <span style={{flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:inS?"var(--green)":"var(--text)"}}>{q.stem}</span>
                    </div>
                  );
                })}
                {pool.length===0&&<div className="em"><div className="t">No matches</div></div>}
              </div>
            </div>
            <div className="card">
              <div className="ch">Selected ({sel.length})</div>
              <div className="bsel">
                {sel.length===0?<div className="em"><div className="t" style={{fontSize:13}}>None selected</div><p>Click questions from the pool</p></div>
                  :sel.map((id,i)=>{const q=questions.find(x=>x.id===id);if(!q)return null;return(
                    <div key={id} className="si">
                      <span className="sn">{i+1}</span>
                      <span className="ss">{q.stem}</span>
                      <button className="ib dg" onClick={()=>toggle(id)}>{Ic.x}</button>
                    </div>
                  );})}
              </div>
            </div>
          </div>
        </div>
        <div className="mf"><button className="btn bw" onClick={onClose}>Cancel</button><button className="btn ba" onClick={save}>Save Exam</button></div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — QUESTIONS TAB
// ─────────────────────────────────────────────────────────────────────────────
function AdminQ({ questions, setQuestions }) {
  const [tagF,setTagF]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [editing,setEditing]=useState(null);
  const [showAns,setShowAns]=useState(false);
  const fileRef=useRef();
  const allTags=[...new Set(questions.flatMap(q=>q.tags))].sort();
  const filtered=tagF?questions.filter(q=>q.tags.includes(tagF)):questions;
  function saveQ(q){
    setQuestions(prev=>{const ex=prev.find(p=>p.id===q.id);const next=ex?prev.map(p=>p.id===q.id?q:p):[q,...prev];lsSet(SK.questions,next);return next;});
    setShowAdd(false);setEditing(null);
  }
  function delQ(id){if(!window.confirm("Delete question?"))return;setQuestions(prev=>{const n=prev.filter(q=>q.id!==id);lsSet(SK.questions,n);return n;});}
  function expJSON(){const b=new Blob([JSON.stringify(questions,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`sba-${new Date().toISOString().slice(0,10)}.json`;a.click();}
  function impJSON(e){const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(!Array.isArray(d))return alert("Expected array.");setQuestions(prev=>{const ids=new Set(prev.map(q=>q.id));const n=[...prev,...d.filter(q=>!ids.has(q.id))];lsSet(SK.questions,n);return n;});alert(`Imported ${d.length} questions.`);}catch{alert("Invalid JSON.");}};r.readAsText(file);e.target.value="";}
  const domains=[...new Set(questions.flatMap(q=>q.tags.filter(t=>!t.startsWith("difficulty"))))].length;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:13}}>
      <div className="sr">
        <div className="sc"><div className="v">{questions.length}</div><div className="l">Total Questions</div></div>
        <div className="sc"><div className="v">{domains}</div><div className="l">Clinical Domains</div></div>
        <div className="sc"><div className="v">{allTags.length}</div><div className="l">Unique Tags</div></div>
        <div className="sc"><div className="v">{filtered.length}</div><div className="l">Showing</div></div>
      </div>
      <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
        <input ref={fileRef} type="file" accept=".json" style={{display:"none"}} onChange={impJSON}/>
        <button className="btn bw" onClick={()=>fileRef.current.click()}>{Ic.upload} Import JSON</button>
        <button className="btn bw" onClick={expJSON}>{Ic.download} Export JSON</button>
        <button className="btn bw" onClick={()=>setShowAns(s=>!s)}>{showAns?Ic.eyeOff:Ic.eye} {showAns?"Hide answers":"Show answers"}</button>
        <button className="btn ba" style={{marginLeft:"auto"}} onClick={()=>setShowAdd(true)}>{Ic.plus} Add Question</button>
      </div>
      {allTags.length>0&&(
        <div className="fb">
          <button className={`tc${!tagF?" on":""}`} onClick={()=>setTagF(null)}>All</button>
          {allTags.map(t=><button key={t} className={`tc${tagF===t?" on":""}`} onClick={()=>setTagF(tagF===t?null:t)}>{t}</button>)}
        </div>
      )}
      <div className="card">
        <div className="qth qcc"><span>#</span><span>Stem</span><span>Tags</span><span>Answer</span><span></span></div>
        {filtered.length===0?<div className="em"><div className="t">No questions yet</div><p>Add a question or import a JSON bank.</p></div>
          :filtered.map((q,i)=>(
            <div key={q.id} className="qtr qcc" onClick={()=>setEditing(q)}>
              <span className="qnum">{i+1}</span>
              <span className="qstem">{q.stem}</span>
              <span className="qtags">{q.tags.map(t=><span key={t} className="qtag">{t}</span>)}</span>
              <span style={{fontSize:12}}>
                {showAns?<span style={{fontWeight:700,color:"var(--teal)"}}>{q.answer}</span>
                  :<span style={{color:"var(--muted)",fontSize:10.5,display:"flex",alignItems:"center",gap:3}}>{Ic.eyeOff} hidden</span>}
              </span>
              <span className="qact" onClick={e=>e.stopPropagation()}>
                <button className="ib" onClick={()=>setEditing(q)}>{Ic.edit}</button>
                <button className="ib dg" onClick={()=>delQ(q.id)}>{Ic.trash}</button>
              </span>
            </div>
          ))}
      </div>
      {(showAdd||editing)&&<QModal initial={editing} onSave={saveQ} onClose={()=>{setShowAdd(false);setEditing(null);}}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — EXAMS TAB
// ─────────────────────────────────────────────────────────────────────────────
function AdminEx({ questions, exams, setExams }) {
  const [showB,setShowB]=useState(false);
  const [editEx,setEditEx]=useState(null);
  function saveEx(ex){setExams(prev=>{const e=prev.find(x=>x.id===ex.id);const n=e?prev.map(x=>x.id===ex.id?ex:x):[ex,...prev];lsSet(SK.exams,n);return n;});setShowB(false);setEditEx(null);}
  function delEx(id){if(!window.confirm("Delete exam?"))return;setExams(prev=>{const n=prev.filter(e=>e.id!==id);lsSet(SK.exams,n);return n;});}
  return (
    <div style={{display:"flex",flexDirection:"column",gap:13}}>
      <div><button className="btn ba" onClick={()=>{setEditEx(null);setShowB(true);}}>{Ic.plus} New Exam</button></div>
      <div className="card">
        <div className="ch">Saved Exams ({exams.length})</div>
        <div className="qth ecc"><span>#</span><span>Name</span><span>Questions</span><span>Duration</span><span></span></div>
        {exams.length===0?<div className="em"><div className="t">No exams yet</div><p>Create an exam by selecting questions from the bank.</p></div>
          :exams.map((ex,i)=>(
            <div key={ex.id} className="qtr ecc" onClick={()=>{setEditEx(ex);setShowB(true);}}>
              <span className="qnum">{i+1}</span>
              <span className="qstem" style={{fontWeight:600}}>{ex.name}</span>
              <span style={{fontSize:12}}>{ex.questionIds.length} Q</span>
              <span style={{fontSize:12}}>{ex.duration} min</span>
              <span className="qact" onClick={e=>e.stopPropagation()}>
                <button className="ib" onClick={()=>{setEditEx(ex);setShowB(true);}}>{Ic.edit}</button>
                <button className="ib dg" onClick={()=>delEx(ex.id)}>{Ic.trash}</button>
              </span>
            </div>
          ))}
      </div>
      {showB&&<BuilderModal questions={questions} initial={editEx} onSave={saveEx} onClose={()=>{setShowB(false);setEditEx(null);}}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — USERS TAB
// ─────────────────────────────────────────────────────────────────────────────
function AdminUsers({ exams }) {
  const [users,setUsers]=useState(()=>ls(SK.users,DEFAULT_USERS));
  const [showAdd,setShowAdd]=useState(false);
  function addU(u){const all=ls(SK.users,DEFAULT_USERS);if(all.find(x=>x.uid.toLowerCase()===u.uid.toLowerCase()))return alert("ID already exists.");const n=[...all,u];lsSet(SK.users,n);setUsers(n);setShowAdd(false);}
  function delU(uid){if(uid==="ammodev"){alert("Cannot delete primary admin.");return;}if(!window.confirm(`Delete "${uid}"?`))return;const n=users.filter(u=>u.uid!==uid);lsSet(SK.users,n);setUsers(n);}
  return (
    <div style={{display:"flex",flexDirection:"column",gap:13}}>
      <div><button className="btn ba" onClick={()=>setShowAdd(true)}>{Ic.plus} Add Login</button></div>
      <div className="card">
        <div className="ch">Active Logins ({users.length})</div>
        <div className="ug">
          {users.map(u=>{const ex=u.assignedExam?exams.find(e=>e.id===u.assignedExam):null;return(
            <div key={u.uid} className="uc">
              <div className="uct">
                <div className={`uav${u.role==="admin"?" adm":""}`}>{u.uid[0].toUpperCase()}</div>
                <div><div className="unm">{u.uid}</div><span className={`urol ${u.role}`}>{u.role}</span></div>
                <button className="ib dg" style={{marginLeft:"auto"}} onClick={()=>delU(u.uid)}>{Ic.trash}</button>
              </div>
              {u.role==="student"&&<div className="uex">{Ic.exam}{ex?ex.name:<em>No exam assigned</em>}</div>}
              <div style={{fontSize:11,color:"var(--muted)"}}>Password stored securely</div>
            </div>
          );})}
        </div>
      </div>
      {showAdd&&<UModal exams={exams} onSave={addU} onClose={()=>setShowAdd(false)}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN SHELL
// ─────────────────────────────────────────────────────────────────────────────
function AdminShell({ user, onLogout }) {
  const [tab,setTab]=useState("questions");
  const [questions,setQuestions]=useState(()=>ls(SK.questions,DEMO_QUESTIONS));
  const [exams,setExams]=useState(()=>ls(SK.exams,[]));
  const tabs=[{id:"questions",label:"Question Bank",ic:Ic.bank},{id:"exams",label:"Exams",ic:Ic.exam},{id:"users",label:"Users",ic:Ic.shield}];
  return (
    <div className="ash">
      <style>{CSS}</style>
      <div className="atb">
        <div className="a-logo"><strong>ammo</strong>/<em>assess</em></div>
        <nav className="a-nav">
          {tabs.map(t=><button key={t.id} className={`a-nb${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}>{t.ic}{t.label}</button>)}
        </nav>
        <div className="a-ui">{Ic.user}<strong>{user.uid}</strong>
          <button className="btn bg sm" style={{marginLeft:4}} onClick={onLogout}>{Ic.logout} Logout</button>
        </div>
      </div>
      <div className="a-body">
        {tab==="questions"&&<AdminQ questions={questions} setQuestions={setQuestions}/>}
        {tab==="exams"&&<AdminEx questions={questions} exams={exams} setExams={setExams}/>}
        {tab==="users"&&<AdminUsers exams={exams}/>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAM MODE
// ─────────────────────────────────────────────────────────────────────────────
function getAmberMsg(timeLeft, totalTime) {
  if (totalTime - timeLeft <= 3) return `Exam time: ${Math.round(totalTime/60)} minutes`;
  if (timeLeft <= 60  && timeLeft > 57)   return "1 minute remaining";
  if (timeLeft <= 600 && timeLeft > 597)  return "10 minutes remaining";
  if (timeLeft <= 3600 && timeLeft > 3597) return "1 hour remaining";
  return null;
}

function ExamMode({ questions, totalTime, username, onFinish, onExit }) {
  const [cur,setCur]=useState(0);
  const [ans,setAns]=useState({});
  const [flags,setFlags]=useState({});
  const [tLeft,setTLeft]=useState(totalTime);
  const [amberMsg,setAmberMsg]=useState(`Exam time: ${Math.round(totalTime/60)} minutes`);
  const timerR=useRef(); const amberR=useRef();

  useEffect(()=>{
    amberR.current=setTimeout(()=>setAmberMsg(null),30000);
    timerR.current=setInterval(()=>{
      setTLeft(t=>{
        if(t<=1){clearInterval(timerR.current);return 0;}
        const n=t-1;
        const msg=getAmberMsg(n,totalTime);
        if(msg){setAmberMsg(msg);clearTimeout(amberR.current);amberR.current=setTimeout(()=>setAmberMsg(null),30000);}
        return n;
      });
    },1000);
    return()=>{clearInterval(timerR.current);clearTimeout(amberR.current);};
  },[]);

  useEffect(()=>{if(tLeft===0)onFinish(ans,flags);},[tLeft]);

  const q=questions[cur];
  const warn=tLeft<300;

  return (
    <div className="ew">
      <style>{CSS}</style>
      <div className="tb">
        <button className="tbb" onClick={()=>{if(window.confirm("Exit exam? Progress will be lost."))onExit();}}>
          {Ic.menu}<span>Overview</span>
        </button>
        <div className="ts"/>
        <button className="tbb" onClick={()=>onFinish(ans,flags)}>
          {Ic.finish}<span>Finish</span>
        </button>
        <div className="ts"/>
        <button className="tbb">{Ic.lang}<span>Language</span></button>
        <div className="ts"/>
        <button className="tbb">{Ic.calc}<span>Calculator</span></button>
        <div className="ts"/>
        <button className="tbb">{Ic.colour}<span>Colour</span></button>
        <div className="tc2">
          <div className={`tt${warn?" w":""}`}>Time Remaining<span className="tv">{fmt(tLeft)}</span></div>
        </div>
        <div className="ti" style={{marginRight:14}}>User ID<span className="iv">{username}</span></div>
        <div className="tnav">
          <button onClick={()=>setCur(c=>c-1)} disabled={cur===0}>{Ic.prev}<span>Previous</span></button>
          <button onClick={()=>setCur(c=>c+1)} disabled={cur===questions.length-1}>{Ic.next}<span>Next</span></button>
        </div>
      </div>

      {amberMsg&&<div className="ab">{amberMsg}</div>}

      <div className="eb" style={{flex:1,overflow:"hidden",display:"grid"}}>
        {/* Navigator */}
        <div className="np">
          <div className="nh">Overview</div>
          <div className="nl">
            {questions.map((q,i)=>(
              <div key={q.id}
                className={`ni${i===cur?" cur":""}${ans[q.id]?" ans":""}${flags[q.id]?" fl":""}`}
                onClick={()=>setCur(i)}>{i+1}</div>
            ))}
          </div>
        </div>
        {/* Stem */}
        <div className="sp">
          <div className="shd">{cur+1}</div>
          <div className="sbody"><p className="stxt">{q.stem}</p></div>
        </div>
        {/* Answer */}
        <div className="ap">
          <div className="ahd">
            <span>Answer</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span className="mb2">[1 mark]</span>
              <button className={`fsq${flags[q.id]?" fl":""}`} onClick={()=>setFlags(f=>({...f,[q.id]:!f[q.id]}))}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill={flags[q.id]?"currentColor":"none"} stroke="currentColor" strokeWidth="2.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                {flags[q.id]?"Flagged":"Flag"}
              </button>
            </div>
          </div>
          <div className="ab2">
            {["A","B","C","D","E"].map(l=>(
              <button key={l} className={`ob${ans[q.id]===l?" sel":""}`}
                onClick={()=>setAns(a=>({...a,[q.id]:l}))}>
                <span className="olt">{l}</span><span>{q.options[l]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────
function Results({ questions, answers, flags, onReturn, onLogout }) {
  const correct=questions.filter(q=>answers[q.id]===q.answer).length;
  const unanswered=questions.filter(q=>!answers[q.id]).length;
  const pct=Math.round((correct/questions.length)*100);
  return (
    <div className="rw">
      <style>{CSS}</style>
      <div style={{background:"var(--td)",color:"#fff",padding:"11px 22px",fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em"}}>Exam Review — Results</div>
      <div className="rb">
        <div className="rs"><div className="v">{correct}/{questions.length}</div><div className="l">Score</div></div>
        <div className="rs"><div className="v">{pct}%</div><div className="l">Percentage</div></div>
        <div className="rs"><div className="v">{unanswered}</div><div className="l">Unanswered</div></div>
        <div className="rs"><div className="v">{Object.values(flags).filter(Boolean).length}</div><div className="l">Flagged</div></div>
      </div>
      <div style={{overflowY:"auto",flex:1}}>
        <div className="rl">
          {questions.map((q,i)=>{
            const ua=answers[q.id];const ok=ua===q.answer;
            const st=!ua?"unanswered":ok?"correct":"incorrect";
            return(
              <div key={q.id} className="ri">
                <div className="rih">
                  <span className="riqn">Q{i+1}</span>
                  <span className={`rst ${st}`}>{st}</span>
                  {flags[q.id]&&<span style={{fontSize:9.5,color:"var(--amber)",fontWeight:700}}>⚑ Flagged</span>}
                </div>
                <div className="ristem">{q.stem}</div>
                <div className="riopts">
                  {["A","B","C","D","E"].map(l=>{
                    let cls="";
                    if(l===q.answer)cls="cor";
                    else if(l===ua&&!ok)cls="inc";
                    return(
                      <button key={l} disabled className={`ob${cls?" "+cls:""}`}>
                        <span className="olt">{l}</span>
                        <span style={{flex:1}}>{q.options[l]}</span>
                        {l===q.answer&&<span className="oic">{Ic.check}</span>}
                        {l===ua&&!ok&&<span className="oic">{Ic.x}</span>}
                      </button>
                    );
                  })}
                </div>
                {q.explanation&&<div className="riexp"><div className="riel">Explanation</div>{q.explanation}</div>}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{padding:"18px",display:"flex",justifyContent:"center",gap:10,borderTop:"1px solid var(--border)"}}>
        <button className="btn bw" onClick={onLogout}>{Ic.logout} Log Out</button>
        <button className="btn ba" onClick={onReturn}>Review Answers</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT LANDING
// ─────────────────────────────────────────────────────────────────────────────
function StudentLanding({ user, exam, onStart, onLogout }) {
  const questions=ls(SK.questions,DEMO_QUESTIONS);
  const examQs=exam.questionIds.map(id=>questions.find(q=>q.id===id)).filter(Boolean);
  return (
    <div className="sl-wrap">
      <style>{CSS}</style>
      <div className="sl-bar">
        <div className="a-logo"><strong>ammo</strong>/<em>assess</em></div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:12,color:"rgba(255,255,255,.55)"}}>{user.uid}</span>
          <button className="btn bg sm" onClick={onLogout}>{Ic.logout} Logout</button>
        </div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:40}}>
        <div style={{background:"#fff",borderRadius:8,border:"1px solid var(--border)",padding:"34px 38px",maxWidth:440,width:"100%",boxShadow:"0 4px 20px rgba(0,0,0,.1)"}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:"var(--muted)",marginBottom:7}}>Your Exam</div>
          <h2 style={{fontSize:21,fontWeight:800,color:"var(--teal)",marginBottom:18}}>{exam.name}</h2>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:26}}>
            <div className="sc"><div className="v">{examQs.length}</div><div className="l">Questions</div></div>
            <div className="sc"><div className="v">{exam.duration}</div><div className="l">Minutes</div></div>
          </div>
          <button className="btn ba" style={{width:"100%",padding:"12px",fontSize:14}} onClick={()=>onStart(examQs,exam.duration*60)}>Begin Exam →</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // Restore session if tab is still open
  const existingSession = getSession();
  const [user,setUser]=useState(existingSession);
  const [screen,setScreen]=useState(existingSession?(existingSession.role==="admin"?"admin":"student"):"login");
  const [examQs,setExamQs]=useState([]);
  const [examTime,setExamTime]=useState(0);
  const [results,setResults]=useState(null);

  function login(u){setUser(u);setScreen(u.role==="admin"?"admin":"student");}
  function logout(){clearSession();setUser(null);setScreen("login");setResults(null);}
  function startExam(qs,time){setExamQs(shuffle(qs));setExamTime(time);setScreen("exam");}
  function finish(a,f){setResults({a,f});setScreen("results");}
  function returnHome(){setResults(null);setScreen(user?.role==="admin"?"admin":"student");}

  if(screen==="login") return <LoginPage onLogin={login}/>;
  if(screen==="admin") return <AdminShell user={user} onLogout={logout}/>;

  if(screen==="student") {
    const exams=ls(SK.exams,[]);
    const ex=user.assignedExam?exams.find(e=>e.id===user.assignedExam):null;
    if(!ex) return (
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"var(--bg)",gap:14}}>
        <style>{CSS}</style>
        <div style={{fontSize:17,fontWeight:700,color:"var(--teal)"}}>No exam assigned</div>
        <div style={{fontSize:13,color:"var(--muted)"}}>Contact your administrator.</div>
        <button className="btn bw" onClick={logout}>Logout</button>
      </div>
    );
    return <StudentLanding user={user} exam={ex} onStart={startExam} onLogout={logout}/>;
  }

  if(screen==="exam") return <ExamMode questions={examQs} totalTime={examTime} username={user?.uid||""} onFinish={finish} onExit={returnHome}/>;
  if(screen==="results") return <Results questions={examQs} answers={results.a} flags={results.f} onReturn={returnHome} onLogout={logout}/>;
  return null;
}
