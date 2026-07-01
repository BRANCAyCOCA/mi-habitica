/* ============================================================
   Mi Aventura — gestor de hábitos, tareas y metas gamificado
   Todo se guarda localmente en tu dispositivo (localStorage).
   ============================================================ */
"use strict";

/* ---------- Constantes del juego ---------- */
const STORAGE_KEY = "mi-aventura-v1";
const MAX_HP = 50;
const DIFF = {
  facil:   { label: "Fácil",   mult: 1,   color: "#4ade80" },
  normal:  { label: "Normal",  mult: 1.5, color: "#facc15" },
  dificil: { label: "Difícil", mult: 2,   color: "#f87171" },
};
const REWARD_HABIT = { xp: 12, coins: 5 };
// Pago en monedas por defecto si el hábito no define el suyo
const DEFAULT_PAYOUT = { facil: 5, normal: 8, dificil: 10 };
const REWARD_TODO  = { xp: 15, coins: 8 };
const REWARD_MILESTONE = { xp: 25, coins: 12 };
const REWARD_GOAL  = { xp: 100, coins: 50 };
const DMG_MISSED_HABIT = 3;   // HP perdido por hábito incumplido por día
const DMG_CRON_CAP = 25;      // tope de daño por ausencia prolongada

// Orden visual de la semana: L M X J V S D  (valores de Date.getDay())
const WEEK = [
  { dow: 1, l: "L" }, { dow: 2, l: "M" }, { dow: 3, l: "X" }, { dow: 4, l: "J" },
  { dow: 5, l: "V" }, { dow: 6, l: "S" }, { dow: 0, l: "D" },
];

const TITLES = [
  [30, "Leyenda"], [20, "Héroe"], [10, "Aventurero"], [5, "Explorador"], [1, "Aprendiz"],
];

/* ---------- Iconos SVG (estilo Lucide) ---------- */
const I = (paths, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra} aria-hidden="true">${paths}</svg>`;
const ICONS = {
  check: I('<path d="M20 6 9 17l-5-5"/>'),
  plus: I('<path d="M5 12h14M12 5v14"/>'),
  pencil: I('<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'),
  trash: I('<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
  x: I('<path d="M18 6 6 18M6 6l12 12"/>'),
  flame: I('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'),
  coin: I('<circle cx="12" cy="12" r="9"/><path d="M14.8 9.2a3.5 3.5 0 0 0-5.6 2.8 3.5 3.5 0 0 0 5.6 2.8"/>'),
  star: I('<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>'),
  heart: I('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'),
  skull: I('<circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v2h8v-2"/><path d="m12.5 17-.5-1-.5 1h1z"/><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"/>'),
  trophy: I('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>'),
  target: I('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  calendar: I('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  clock: I('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  gift: I('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>'),
  download: I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  upload: I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>'),
  sparkles: I('<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>'),
  sword: I('<path d="m14.5 17.5 3 3 3-3-3-3"/><path d="M6.5 6.5 3 3l3.5-.5L18 14"/><path d="m3 21 6-6"/><path d="M14 4l6 6"/>'),
};

/* ---------- Utilidades ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function todayStr(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseDateStr(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
// Fechas desde `a` (inclusive) hasta `b` (exclusivo)
function datesBetween(a, b) {
  const out = [];
  let d = parseDateStr(a);
  const end = parseDateStr(b);
  let guard = 0;
  while (d < end && guard < 400) {
    out.push(todayStr(d));
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return out;
}
function fmtShortDate(s) {
  return parseDateStr(s).toLocaleDateString("es", { day: "numeric", month: "short" });
}

/* ---------- Estado ---------- */
function defaultState() {
  return {
    player: {
      name: "", level: 1, xp: 0, hp: MAX_HP, coins: 0,
      totalCompleted: 0, coinsEarned: 0, coinsSpent: 0, rewardsBought: 0, deaths: 0,
      createdAt: todayStr(),
    },
    // {id,title,notes,days:[dow],difficulty,mode:"check"|"tiempo",payout,streak,best,completedToday,todayMinutes,todayLogs,totalMinutes}
    // mode "check": payout = monedas al completar · mode "tiempo": payout = monedas por hora
    habits: [
      { id: uid(), title: "Estudiar", notes: "", days: [1, 2, 3, 4, 5], difficulty: "normal", mode: "tiempo", payout: 10, streak: 0, best: 0, completedToday: false, todayMinutes: 0, todayLogs: [], totalMinutes: 0 },
      { id: uid(), title: "Meditar", notes: "", days: [1, 2, 3, 4, 5, 6, 0], difficulty: "facil", mode: "tiempo", payout: 12, streak: 0, best: 0, completedToday: false, todayMinutes: 0, todayLogs: [], totalMinutes: 0 },
      { id: uid(), title: "Ir al gimnasio", notes: "", days: [1, 3, 5], difficulty: "dificil", mode: "check", payout: 12, streak: 0, best: 0, completedToday: false, todayMinutes: 0, todayLogs: [], totalMinutes: 0 },
      { id: uid(), title: "Ir a clase", notes: "", days: [1, 2, 3, 4, 5], difficulty: "normal", mode: "check", payout: 8, streak: 0, best: 0, completedToday: false, todayMinutes: 0, todayLogs: [], totalMinutes: 0 },
    ],
    todos: [],    // {id,title,notes,due,difficulty,done,doneDate}
    goals: [],    // {id,title,notes,milestones:[{id,title,done}],done}
    // {id,title,cost,timesBought}
    rewards: [
      { id: uid(), title: "Salir de fiesta", cost: 120, timesBought: 0 },
      { id: uid(), title: "Comer chocolate", cost: 20, timesBought: 0 },
    ],
    history: {},  // {fecha: xp ganado}
    lastCron: todayStr(),
  };
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return normalizeState({ ...defaultState(), ...parsed, player: { ...defaultState().player, ...parsed.player } });
  } catch {
    return defaultState();
  }
}

// Completa campos que no existían en versiones anteriores de los datos
function normalizeState(st) {
  for (const h of st.habits) {
    h.mode = h.mode === "tiempo" ? "tiempo" : "check";
    h.todayMinutes = h.todayMinutes || 0;
    h.todayLogs = Array.isArray(h.todayLogs) ? h.todayLogs : [];
    h.totalMinutes = h.totalMinutes || 0;
  }
  return st;
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ---------- Mecánicas del juego ---------- */
function xpNeeded(level) { return 50 + (level - 1) * 25; }

function heroTitle(level) {
  for (const [min, t] of TITLES) if (level >= min) return t;
  return "Aprendiz";
}

function recordHistory(xp) {
  const t = todayStr();
  state.history[t] = Math.max(0, (state.history[t] || 0) + xp);
  // conservar solo los últimos 60 días
  const keys = Object.keys(state.history).sort();
  while (keys.length > 60) delete state.history[keys.shift()];
}

function grant(xp, coins, msg) {
  const p = state.player;
  p.xp += xp;
  p.coins += coins;
  p.coinsEarned += coins;
  recordHistory(xp);
  let leveled = false;
  while (p.xp >= xpNeeded(p.level)) {
    p.xp -= xpNeeded(p.level);
    p.level++;
    p.hp = MAX_HP;
    leveled = true;
  }
  toast(`+${xp} XP · +${coins} monedas${msg ? " · " + msg : ""}`, "gain", ICONS.star);
  if (leveled) celebrateLevelUp();
}

function ungrant(xp, coins) {
  const p = state.player;
  p.xp = Math.max(0, p.xp - xp);
  p.coins = Math.max(0, p.coins - coins);
  p.coinsEarned = Math.max(0, p.coinsEarned - coins);
  recordHistory(-xp);
  toast(`Deshecho: −${xp} XP · −${coins} monedas`, "info", ICONS.clock);
}

function damage(n, reason) {
  const p = state.player;
  p.hp -= n;
  toast(`−${n} HP${reason ? " · " + reason : ""}`, "hurt", ICONS.heart);
  if (p.hp <= 0) {
    p.deaths++;
    p.level = Math.max(1, p.level - 1);
    p.xp = 0;
    p.coins = 0;
    p.hp = MAX_HP;
    showDeathModal();
  }
}

function celebrateLevelUp() {
  const p = state.player;
  openModal(`
    <div class="modal-inner celebrate">
      <div class="big-ico" style="color:var(--gold)">${ICONS.trophy}</div>
      <h3>¡Nivel ${p.level}!</h3>
      <p>Ahora eres <strong>${esc(heroTitle(p.level))}</strong>. Tu vida se restauró por completo.</p>
      <p class="gold-line">¡Sigue así, ${esc(p.name)}!</p>
      <div class="modal-actions"><button class="btn btn-primary" data-close>¡Genial!</button></div>
    </div>`);
}

function showDeathModal() {
  openModal(`
    <div class="modal-inner celebrate">
      <div class="big-ico" style="color:var(--hp)">${ICONS.skull}</div>
      <h3>Has caído en batalla…</h3>
      <p>Tu vida llegó a 0. Pierdes <strong>1 nivel</strong> y todas tus monedas, pero tu vida se restaura.</p>
      <p class="gold-line">Toda leyenda tiene tropiezos. ¡Levántate!</p>
      <div class="modal-actions"><button class="btn btn-primary" data-close>Continuar</button></div>
    </div>`);
}

/* ---------- Cron: cambio de día ---------- */
function runCron() {
  const today = todayStr();
  if (state.lastCron === today) return;
  // Si la fecha guardada es futura (cambio de reloj), solo re-sincroniza.
  if (state.lastCron > today) { state.lastCron = today; save(); return; }

  let dmg = 0;
  let missed = 0;
  for (const d of datesBetween(state.lastCron, today)) {
    const dow = parseDateStr(d).getDay();
    for (const h of state.habits) {
      if (!h.days.includes(dow)) continue;
      const done = d === state.lastCron ? habitDoneToday(h) : false;
      if (!done) {
        dmg += DMG_MISSED_HABIT;
        missed++;
        h.streak = 0;
      }
    }
  }
  for (const h of state.habits) {
    h.completedToday = false;
    h.todayMinutes = 0;
    h.todayLogs = [];
  }
  state.lastCron = today;
  save();
  if (dmg > 0) {
    damage(Math.min(dmg, DMG_CRON_CAP), `${missed} hábito${missed > 1 ? "s" : ""} sin completar`);
    save();
  }
}

/* ---------- Toasts ---------- */
function toast(msg, type = "info", icon = "") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `${icon}<span>${esc(msg)}</span>`;
  $("#toasts").appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

/* ---------- Modal ---------- */
const modal = $("#modal");
function openModal(html, { locked = false } = {}) {
  modal.innerHTML = html;
  modal.dataset.locked = locked ? "1" : "";
  if (!modal.open) modal.showModal();
  $$("[data-close]", modal).forEach(b => b.addEventListener("click", () => modal.close()));
}
modal.addEventListener("click", (e) => {
  if (e.target === modal && !modal.dataset.locked) modal.close();
});
modal.addEventListener("cancel", (e) => {
  if (modal.dataset.locked) e.preventDefault();
});

function confirmDialog({ title, text, okLabel = "Eliminar", onOk }) {
  openModal(`
    <div class="modal-inner">
      <div class="modal-head"><h3>${esc(title)}</h3>
        <button class="icon-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <p class="confirm-text">${esc(text)}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-danger" id="confirmOk">${esc(okLabel)}</button>
      </div>
    </div>`);
  $("#confirmOk", modal).addEventListener("click", () => { modal.close(); onOk(); });
}

/* ---------- Avatar ---------- */
function avatarSVG(level) {
  const tier = level >= 20 ? "#67e8f9" : level >= 10 ? "#fbbf24" : level >= 5 ? "#cbd5e1" : "#d97706";
  return `<svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="10" y="14" width="28" height="26" rx="9" fill="#fcd9b8"/>
    <path d="M10 24 Q10 8 24 8 Q38 8 38 24 L38 21 Q38 16 33 16 L15 16 Q10 16 10 21 Z" fill="${tier}"/>
    <rect x="8" y="20" width="4" height="8" rx="2" fill="${tier}"/>
    <rect x="36" y="20" width="4" height="8" rx="2" fill="${tier}"/>
    <circle cx="18.5" cy="27" r="2.4" fill="#2b2350"/>
    <circle cx="29.5" cy="27" r="2.4" fill="#2b2350"/>
    <path d="M19 33 Q24 37 29 33" stroke="#b4552d" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  </svg>`;
}

/* ---------- Render: barra del héroe ---------- */
function renderHero() {
  const p = state.player;
  const need = xpNeeded(p.level);
  const hpPct = clamp((p.hp / MAX_HP) * 100, 0, 100);
  const xpPct = clamp((p.xp / need) * 100, 0, 100);
  $("#heroBar").innerHTML = `
    <div class="hero-row">
      <div class="avatar-wrap">
        <div class="avatar">${avatarSVG(p.level)}</div>
        <span class="level-badge">Nv ${p.level}</span>
      </div>
      <div class="hero-info">
        <p class="hero-name">${esc(p.name || "Héroe")} <span class="hero-title">· ${esc(heroTitle(p.level))}</span></p>
        <div class="bars">
          <div class="bar" role="meter" aria-label="Vida" aria-valuenow="${p.hp}" aria-valuemin="0" aria-valuemax="${MAX_HP}">
            <div class="bar-fill hp" style="width:${hpPct}%"></div>
            <span class="bar-label">${p.hp} / ${MAX_HP} HP</span>
          </div>
          <div class="bar" role="meter" aria-label="Experiencia" aria-valuenow="${p.xp}" aria-valuemin="0" aria-valuemax="${need}">
            <div class="bar-fill xp" style="width:${xpPct}%"></div>
            <span class="bar-label">${p.xp} / ${need} XP</span>
          </div>
        </div>
      </div>
      <div class="coins-chip" aria-label="${p.coins} monedas">${ICONS.coin}<span>${p.coins}</span></div>
    </div>`;
}

/* ---------- Render: Hábitos ---------- */
function renderHabitos() {
  const v = $("#view-habitos");
  const todayDow = new Date().getDay();
  const isToday = h => h.days.includes(todayDow);
  const todayHabits = state.habits.filter(isToday);
  const otherHabits = state.habits.filter(h => !isToday(h));

  const card = (h, activeToday) => {
    const d = DIFF[h.difficulty] || DIFF.normal;
    const done = habitDoneToday(h);
    const isTime = h.mode === "tiempo";
    return `
    <div class="card ${!isTime && done ? "is-done" : ""}">
      ${isTime ? `
      <button class="check-btn time-btn ${done ? "is-checked" : ""}" data-act="log-time" data-id="${h.id}"
        aria-label="Registrar tiempo de ${esc(h.title)}">
        ${ICONS.clock}
      </button>` : activeToday ? `
      <button class="check-btn ${done ? "is-checked" : ""}" data-act="toggle-habit" data-id="${h.id}"
        aria-label="${done ? "Desmarcar" : "Completar"} ${esc(h.title)}" aria-pressed="${done}">
        ${ICONS.check}
      </button>` : `
      <div class="check-btn" style="opacity:.25" aria-hidden="true">${ICONS.check}</div>`}
      <div class="card-body">
        <div class="card-title">${esc(h.title)}</div>
        ${h.notes ? `<div class="card-notes">${esc(h.notes)}</div>` : ""}
        <div class="card-meta">
          <span class="streak">${ICONS.flame}${h.streak} racha</span>
          <span class="payout" aria-label="Paga ${habitPayout(h)} monedas${isTime ? " por hora" : ""}">${ICONS.coin}+${habitPayout(h)}${isTime ? "/h" : ""}</span>
          ${isTime && h.todayMinutes ? `<span class="mins">${ICONS.clock}${fmtMin(h.todayMinutes)} hoy</span>` : ""}
          <span><span class="diff-dot" style="background:${d.color}"></span>${d.label}</span>
        </div>
        <div class="day-pills" aria-label="Días programados">
          ${WEEK.map(w => `<span class="day-pill ${h.days.includes(w.dow) ? "on" : ""}">${w.l}</span>`).join("")}
        </div>
      </div>
      <button class="icon-btn" data-act="edit-habit" data-id="${h.id}" aria-label="Editar ${esc(h.title)}">${ICONS.pencil}</button>
    </div>`;
  };

  v.innerHTML = `
    <div class="view-head">
      <div><h2>Hábitos</h2><p class="sub">${todayHabits.length ? `${todayHabits.filter(habitDoneToday).length} de ${todayHabits.length} completados hoy` : "Construye tu rutina diaria"}</p></div>
      <button class="btn btn-primary btn-sm" data-act="new-habit">${ICONS.plus}Nuevo</button>
    </div>
    ${state.habits.length === 0 ? `
      <div class="empty">${ICONS.calendar}
        <p>Aún no tienes hábitos</p>
        <small>Crea tu primer hábito diario: leer, ejercicio, meditar…</small>
      </div>` : `
      ${todayHabits.length ? `<div class="card-list">${todayHabits.map(h => card(h, true)).join("")}</div>` : ""}
      ${otherHabits.length ? `<p class="section-label">Otros días</p><div class="card-list">${otherHabits.map(h => card(h, false)).join("")}</div>` : ""}
    `}`;
}

// Monedas que paga un hábito: su payout propio o, si no tiene, el de su dificultad.
// En hábitos "check" es el pago por completar; en "tiempo" es la tarifa por hora.
function habitPayout(h) {
  const n = Math.round(Number(h.payout));
  if (Number.isFinite(n) && n >= 0) return n;
  return DEFAULT_PAYOUT[h.difficulty] ?? DEFAULT_PAYOUT.normal;
}

function habitDoneToday(h) {
  return h.mode === "tiempo" ? (h.todayMinutes || 0) > 0 : h.completedToday;
}

function fmtMin(min) {
  if (min < 60) return `${min} min`;
  const hs = Math.floor(min / 60), m = min % 60;
  return m ? `${hs} h ${m} min` : `${hs} h`;
}

function toggleHabit(id) {
  const h = state.habits.find(x => x.id === id);
  if (!h || h.mode === "tiempo") return;
  const xp = rewardFor(REWARD_HABIT, h.difficulty).xp;
  const coins = habitPayout(h);
  if (!h.completedToday) {
    h.completedToday = true;
    h.streak++;
    h.best = Math.max(h.best || 0, h.streak);
    state.player.totalCompleted++;
    grant(xp, coins, `racha ${h.streak}`);
  } else {
    h.completedToday = false;
    h.streak = Math.max(0, h.streak - 1);
    state.player.totalCompleted = Math.max(0, state.player.totalCompleted - 1);
    ungrant(xp, coins);
  }
  save();
  renderAll();
}

/* ---------- Hábitos por tiempo ---------- */
function logTime(id, minutes) {
  const h = state.habits.find(x => x.id === id);
  if (!h || h.mode !== "tiempo") return;
  const min = clamp(Math.round(Number(minutes)), 1, 24 * 60);
  const coins = Math.round(habitPayout(h) * min / 60);
  const xp = Math.max(1, Math.round(rewardFor(REWARD_HABIT, h.difficulty).xp * min / 60));
  const first = (h.todayMinutes || 0) === 0;
  // La racha solo cuenta en días programados; registrar en otros días paga igual
  const streakInc = first && h.days.includes(new Date().getDay());
  if (streakInc) {
    h.streak++;
    h.best = Math.max(h.best || 0, h.streak);
  }
  if (first) state.player.totalCompleted++;
  h.todayMinutes = (h.todayMinutes || 0) + min;
  h.totalMinutes = (h.totalMinutes || 0) + min;
  h.todayLogs.push({ min, xp, coins, streakInc });
  grant(xp, coins, `${fmtMin(h.todayMinutes)} hoy`);
  save();
  renderAll();
}

function undoTimeLog(id) {
  const h = state.habits.find(x => x.id === id);
  if (!h || !h.todayLogs?.length) return;
  const log = h.todayLogs.pop();
  h.todayMinutes = Math.max(0, h.todayMinutes - log.min);
  h.totalMinutes = Math.max(0, h.totalMinutes - log.min);
  if (log.streakInc) h.streak = Math.max(0, h.streak - 1);
  if (h.todayMinutes === 0) state.player.totalCompleted = Math.max(0, state.player.totalCompleted - 1);
  ungrant(log.xp, log.coins);
  save();
  renderAll();
}

function timeLogForm(h) {
  if (!h) return;
  const rate = habitPayout(h);
  openModal(`
    <div class="modal-inner">
      <div class="modal-head"><h3>Registrar tiempo</h3>
        <button class="icon-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <p class="confirm-text"><strong>${esc(h.title)}</strong> · paga ${rate} monedas por hora${h.todayMinutes ? ` · hoy llevas ${fmtMin(h.todayMinutes)}` : ""}</p>
      <div class="field">
        <label>Rápido</label>
        ${segHTML("qmin", [{ val: "15", label: "15 min" }, { val: "30", label: "30 min" }, { val: "45", label: "45 min" }, { val: "60", label: "1 h" }], "")}
      </div>
      <div class="field" id="f-min">
        <label for="inpMin">Minutos</label>
        <input type="number" id="inpMin" value="30" min="1" max="1440" inputmode="numeric">
        <div class="err">Ingresa los minutos (mínimo 1).</div>
        <div class="hint" id="minHint"></div>
      </div>
      <div class="modal-actions">
        ${h.todayLogs?.length ? `<button class="btn btn-ghost" id="btnUndoLog">Deshacer último</button>` : ""}
        <button class="btn btn-primary" id="btnLog">${ICONS.clock}Registrar</button>
      </div>
    </div>`);
  wireSeg(modal);
  const inp = $("#inpMin", modal);
  const hint = $("#minHint", modal);
  const updateHint = () => {
    const m = Math.round(Number(inp.value));
    hint.textContent = Number.isFinite(m) && m >= 1
      ? `${m} min te pagan ${Math.round(rate * m / 60)} monedas.` : "";
  };
  updateHint();
  inp.addEventListener("input", updateHint);
  $(`.seg[data-seg="qmin"]`, modal).addEventListener("click", e => {
    const b = e.target.closest("button");
    if (b) { inp.value = b.dataset.val; updateHint(); }
  });
  $("#btnLog", modal).addEventListener("click", () => {
    const m = Math.round(Number(inp.value));
    if (!Number.isFinite(m) || m < 1) { $("#f-min", modal).classList.add("has-err"); inp.focus(); return; }
    modal.close();
    logTime(h.id, m);
  });
  $("#btnUndoLog", modal)?.addEventListener("click", () => {
    modal.close();
    undoTimeLog(h.id);
  });
}

function rewardFor(base, difficulty) {
  const m = (DIFF[difficulty] || DIFF.normal).mult;
  return { xp: Math.round(base.xp * m), coins: Math.round(base.coins * m) };
}

/* ---------- Render: Tareas ---------- */
function renderTareas() {
  const v = $("#view-tareas");
  const t = todayStr();
  const pending = state.todos.filter(x => !x.done)
    .sort((a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : 1);
  const done = state.todos.filter(x => x.done);

  const card = (todo) => {
    const d = DIFF[todo.difficulty] || DIFF.normal;
    const overdue = todo.due && !todo.done && todo.due < t;
    return `
    <div class="card ${todo.done ? "is-done" : ""}">
      <button class="check-btn ${todo.done ? "is-checked" : ""}" data-act="toggle-todo" data-id="${todo.id}"
        aria-label="${todo.done ? "Desmarcar" : "Completar"} ${esc(todo.title)}" aria-pressed="${todo.done}">
        ${ICONS.check}
      </button>
      <div class="card-body">
        <div class="card-title">${esc(todo.title)}</div>
        ${todo.notes ? `<div class="card-notes">${esc(todo.notes)}</div>` : ""}
        <div class="card-meta">
          ${todo.due ? `<span class="due ${overdue ? "overdue" : ""}">${ICONS.clock}${overdue ? "Venció" : "Vence"}: ${fmtShortDate(todo.due)}</span>` : ""}
          <span><span class="diff-dot" style="background:${d.color}"></span>${d.label}</span>
        </div>
      </div>
      <button class="icon-btn" data-act="edit-todo" data-id="${todo.id}" aria-label="Editar ${esc(todo.title)}">${ICONS.pencil}</button>
    </div>`;
  };

  v.innerHTML = `
    <div class="view-head">
      <div><h2>Tareas</h2><p class="sub">${pending.length ? `${pending.length} pendiente${pending.length > 1 ? "s" : ""}` : "Pendientes de una sola vez"}</p></div>
      <button class="btn btn-primary btn-sm" data-act="new-todo">${ICONS.plus}Nueva</button>
    </div>
    ${state.todos.length === 0 ? `
      <div class="empty">${ICONS.check}
        <p>Sin tareas pendientes</p>
        <small>Agrega pendientes puntuales con fecha límite opcional.</small>
      </div>` : `
      <div class="card-list">${pending.map(card).join("")}</div>
      ${done.length ? `<p class="section-label">Completadas</p><div class="card-list">${done.map(card).join("")}</div>` : ""}
    `}`;
}

function toggleTodo(id) {
  const todo = state.todos.find(x => x.id === id);
  if (!todo) return;
  const r = rewardFor(REWARD_TODO, todo.difficulty);
  if (!todo.done) {
    todo.done = true;
    todo.doneDate = todayStr();
    state.player.totalCompleted++;
    grant(r.xp, r.coins);
  } else {
    todo.done = false;
    todo.doneDate = null;
    state.player.totalCompleted = Math.max(0, state.player.totalCompleted - 1);
    ungrant(r.xp, r.coins);
  }
  save();
  renderAll();
}

/* ---------- Render: Metas ---------- */
function renderMetas() {
  const v = $("#view-metas");
  const active = state.goals.filter(g => !g.done);
  const finished = state.goals.filter(g => g.done);

  const card = (g) => {
    const total = g.milestones.length;
    const doneCount = g.milestones.filter(m => m.done).length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    return `
    <div class="goal-card ${g.done ? "is-done" : ""}">
      <div class="goal-top">
        <div class="card-body">
          <div class="card-title">${esc(g.title)}</div>
          ${g.notes ? `<div class="card-notes">${esc(g.notes)}</div>` : ""}
        </div>
        <button class="icon-btn" data-act="edit-goal" data-id="${g.id}" aria-label="Editar ${esc(g.title)}">${ICONS.pencil}</button>
      </div>
      <div class="goal-progress-row">
        <div class="goal-bar"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
        <span class="goal-pct">${pct}%</span>
      </div>
      ${g.done ? `<span class="goal-done-tag">${ICONS.trophy}¡Meta conquistada!</span>` : `
      <div class="milestones">
        ${g.milestones.map(m => `
          <div class="milestone ${m.done ? "is-done" : ""}">
            <button class="check-btn ${m.done ? "is-checked" : ""}" data-act="toggle-mile" data-id="${g.id}" data-mid="${m.id}"
              aria-label="${m.done ? "Desmarcar" : "Completar"} ${esc(m.title)}" aria-pressed="${m.done}">${ICONS.check}</button>
            <span>${esc(m.title)}</span>
          </div>`).join("")}
      </div>`}
    </div>`;
  };

  v.innerHTML = `
    <div class="view-head">
      <div><h2>Metas</h2><p class="sub">Objetivos grandes, paso a paso</p></div>
      <button class="btn btn-primary btn-sm" data-act="new-goal">${ICONS.plus}Nueva</button>
    </div>
    ${state.goals.length === 0 ? `
      <div class="empty">${ICONS.target}
        <p>Sin metas todavía</p>
        <small>Define un objetivo grande y divídelo en hitos: cada hito da XP.</small>
      </div>` : `
      <div class="card-list">${active.map(card).join("")}</div>
      ${finished.length ? `<p class="section-label">Conquistadas</p><div class="card-list">${finished.map(card).join("")}</div>` : ""}
    `}`;
}

function toggleMilestone(goalId, mid) {
  const g = state.goals.find(x => x.id === goalId);
  if (!g) return;
  const m = g.milestones.find(x => x.id === mid);
  if (!m) return;
  if (!m.done) {
    m.done = true;
    state.player.totalCompleted++;
    grant(REWARD_MILESTONE.xp, REWARD_MILESTONE.coins, "hito logrado");
    if (g.milestones.every(x => x.done)) {
      g.done = true;
      grant(REWARD_GOAL.xp, REWARD_GOAL.coins, "¡META COMPLETA!");
    }
  } else {
    m.done = false;
    state.player.totalCompleted = Math.max(0, state.player.totalCompleted - 1);
    if (g.done) { g.done = false; ungrant(REWARD_GOAL.xp, REWARD_GOAL.coins); }
    ungrant(REWARD_MILESTONE.xp, REWARD_MILESTONE.coins);
  }
  save();
  renderAll();
}

/* ---------- Render: Tienda ---------- */
function renderTienda() {
  const v = $("#view-tienda");
  const p = state.player;
  v.innerHTML = `
    <div class="view-head">
      <div><h2>Tienda</h2><p class="sub">Canjea tus monedas por gustos reales</p></div>
      <button class="btn btn-primary btn-sm" data-act="new-reward">${ICONS.plus}Nueva</button>
    </div>
    ${state.rewards.length === 0 ? `
      <div class="empty">${ICONS.gift}
        <p>La tienda está vacía</p>
        <small>Crea recompensas: “ver una película”, “pedir comida”, “1 hora de videojuegos”…</small>
      </div>` : `
      <div class="card-list">
        ${state.rewards.map(r => `
          <div class="card reward-card">
            <div class="reward-icon">${ICONS.gift}</div>
            <div class="card-body">
              <div class="card-title">${esc(r.title)}</div>
              <div class="card-meta">${r.timesBought ? `<span>Canjeada ${r.timesBought} ${r.timesBought === 1 ? "vez" : "veces"}</span>` : ""}</div>
            </div>
            <button class="buy-btn" data-act="buy-reward" data-id="${r.id}" ${p.coins < r.cost ? "disabled" : ""}
              aria-label="Comprar ${esc(r.title)} por ${r.cost} monedas">${ICONS.coin}${r.cost}</button>
            <button class="icon-btn" data-act="edit-reward" data-id="${r.id}" aria-label="Editar ${esc(r.title)}">${ICONS.pencil}</button>
          </div>`).join("")}
      </div>
    `}`;
}

function buyReward(id) {
  const r = state.rewards.find(x => x.id === id);
  if (!r || state.player.coins < r.cost) return;
  state.player.coins -= r.cost;
  state.player.coinsSpent += r.cost;
  state.player.rewardsBought++;
  r.timesBought = (r.timesBought || 0) + 1;
  toast(`¡Disfruta: ${r.title}!`, "gain", ICONS.gift);
  save();
  renderAll();
}

/* ---------- Render: Perfil ---------- */
function renderPerfil() {
  const v = $("#view-perfil");
  const p = state.player;
  const bestStreak = Math.max(0, ...state.habits.map(h => h.best || 0));
  const totalMin = state.habits.reduce((s, h) => s + (h.totalMinutes || 0), 0);

  // gráfico: últimos 7 días de XP
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = todayStr(d);
    days.push({ key, xp: state.history[key] || 0, lbl: d.toLocaleDateString("es", { weekday: "narrow" }), isToday: i === 0 });
  }
  const maxXp = Math.max(10, ...days.map(d => d.xp));

  v.innerHTML = `
    <div class="view-head">
      <div><h2>Perfil</h2><p class="sub">${esc(p.name)} · ${esc(heroTitle(p.level))} · desde ${fmtShortDate(p.createdAt)}</p></div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="num">${p.level}</div><div class="lbl">Nivel</div></div>
      <div class="stat-card"><div class="num">${p.totalCompleted}</div><div class="lbl">Completados</div></div>
      <div class="stat-card"><div class="num">${bestStreak}</div><div class="lbl">Mejor racha</div></div>
      <div class="stat-card"><div class="num">${p.rewardsBought}</div><div class="lbl">Recompensas</div></div>
      <div class="stat-card"><div class="num">${fmtMin(totalMin)}</div><div class="lbl">Tiempo registrado</div></div>
      <div class="stat-card"><div class="num">${p.coinsEarned}</div><div class="lbl">Monedas ganadas</div></div>
    </div>
    <div class="chart-card">
      <h3>XP ganado — últimos 7 días</h3>
      <div class="chart" role="img" aria-label="Gráfico de XP de los últimos 7 días">
        ${days.map(d => `
          <div class="col ${d.isToday ? "today" : ""}">
            <span class="val-lbl">${d.xp || ""}</span>
            <div class="bar-v" style="height:${Math.max(3, (d.xp / maxXp) * 100)}%"></div>
            <span class="day-lbl">${d.lbl.toUpperCase()}</span>
          </div>`).join("")}
      </div>
    </div>
    <div class="profile-actions">
      <button class="btn btn-ghost" data-act="rename">${ICONS.pencil}Cambiar nombre de héroe</button>
      <button class="btn btn-ghost" data-act="export">${ICONS.download}Exportar mis datos</button>
      <button class="btn btn-ghost" data-act="import">${ICONS.upload}Importar datos</button>
      <button class="btn btn-danger" data-act="reset">${ICONS.trash}Reiniciar aventura</button>
      <input type="file" id="importFile" accept="application/json" hidden>
    </div>`;
}

/* ---------- Formularios ---------- */
function segHTML(name, options, current) {
  return `<div class="seg" data-seg="${name}">
    ${options.map(o => `<button type="button" data-val="${o.val}" class="${o.val === current ? "on" : ""}">${esc(o.label)}</button>`).join("")}
  </div>`;
}
function wireSeg(root) {
  $$(".seg", root).forEach(seg => {
    seg.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      $$("button", seg).forEach(x => x.classList.remove("on"));
      b.classList.add("on");
    });
  });
}
function segValue(root, name) {
  return $(`.seg[data-seg="${name}"] button.on`, root)?.dataset.val;
}

function habitForm(habit) {
  const isNew = !habit;
  const h = habit || { title: "", notes: "", days: [1, 2, 3, 4, 5, 6, 0], difficulty: "normal", mode: "check" };
  openModal(`
    <div class="modal-inner">
      <div class="modal-head"><h3>${isNew ? "Nuevo hábito" : "Editar hábito"}</h3>
        <button class="icon-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <div class="field" id="f-title">
        <label for="inpTitle">Nombre</label>
        <input type="text" id="inpTitle" value="${esc(h.title)}" placeholder="Ej: Leer 20 minutos" maxlength="80" autocomplete="off">
        <div class="err">Escribe un nombre para el hábito.</div>
      </div>
      <div class="field">
        <label for="inpNotes">Notas (opcional)</label>
        <input type="text" id="inpNotes" value="${esc(h.notes)}" placeholder="Detalle o motivación" maxlength="120" autocomplete="off">
      </div>
      <div class="field">
        <label>Días de la semana</label>
        <div class="days-row" id="daysRow">
          ${WEEK.map(w => `<button type="button" data-dow="${w.dow}" class="${h.days.includes(w.dow) ? "on" : ""}" aria-pressed="${h.days.includes(w.dow)}">${w.l}</button>`).join("")}
        </div>
        <div class="hint">Si no lo completas un día programado, pierdes vida.</div>
      </div>
      <div class="field">
        <label>Dificultad</label>
        ${segHTML("diff", [{ val: "facil", label: "Fácil" }, { val: "normal", label: "Normal" }, { val: "dificil", label: "Difícil" }], h.difficulty)}
        <div class="hint">Más difícil = más XP.</div>
      </div>
      <div class="field">
        <label>Tipo de pago</label>
        ${segHTML("mode", [{ val: "check", label: "Al completar" }, { val: "tiempo", label: "Por tiempo" }], h.mode || "check")}
        <div class="hint">“Por tiempo”: registras los minutos que le dedicaste y te paga proporcional.</div>
      </div>
      <div class="field" id="f-payout">
        <label for="inpPayout" id="payoutLabel">Pago en monedas al completar</label>
        <input type="number" id="inpPayout" value="${habitPayout(h)}" min="0" max="999" inputmode="numeric">
        <div class="err">El pago debe ser un número de 0 o más.</div>
        <div class="hint" id="payoutHint">Cuántas monedas te paga este hábito cada vez que lo completes.</div>
      </div>
      <div class="modal-actions">
        ${isNew ? "" : `<button class="btn btn-danger" id="btnDel">${ICONS.trash}</button>`}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="btnSave">Guardar</button>
      </div>
    </div>`);
  wireSeg(modal);
  // La etiqueta del pago cambia según el tipo elegido
  const updatePayoutLabel = () => {
    const time = segValue(modal, "mode") === "tiempo";
    $("#payoutLabel", modal).textContent = time ? "Monedas por hora" : "Pago en monedas al completar";
    $("#payoutHint", modal).textContent = time
      ? "Tarifa por hora: se paga proporcional (ej. 10/h → 30 min pagan 5)."
      : "Cuántas monedas te paga este hábito cada vez que lo completes.";
  };
  updatePayoutLabel();
  $(`.seg[data-seg="mode"]`, modal).addEventListener("click", updatePayoutLabel);
  $("#daysRow", modal).addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    b.classList.toggle("on");
    b.setAttribute("aria-pressed", b.classList.contains("on"));
  });
  $("#btnSave", modal).addEventListener("click", () => {
    const title = $("#inpTitle", modal).value.trim();
    if (!title) { $("#f-title", modal).classList.add("has-err"); $("#inpTitle", modal).focus(); return; }
    const payout = Math.round(Number($("#inpPayout", modal).value));
    if (!Number.isFinite(payout) || payout < 0) { $("#f-payout", modal).classList.add("has-err"); $("#inpPayout", modal).focus(); return; }
    const days = $$("#daysRow button.on", modal).map(b => Number(b.dataset.dow));
    const data = {
      title,
      notes: $("#inpNotes", modal).value.trim(),
      days: days.length ? days : [1, 2, 3, 4, 5, 6, 0],
      difficulty: segValue(modal, "diff") || "normal",
      mode: segValue(modal, "mode") || "check",
      payout,
    };
    if (isNew) {
      state.habits.push({ id: uid(), ...data, streak: 0, best: 0, completedToday: false, todayMinutes: 0, todayLogs: [], totalMinutes: 0 });
      toast("Hábito creado", "info", ICONS.sparkles);
    } else {
      Object.assign(habit, data);
    }
    save(); modal.close(); renderAll();
  });
  if (!isNew) $("#btnDel", modal).addEventListener("click", () => {
    confirmDialog({
      title: "Eliminar hábito",
      text: `¿Eliminar “${habit.title}”? Perderás su racha de ${habit.streak}.`,
      onOk: () => {
        state.habits = state.habits.filter(x => x.id !== habit.id);
        save(); renderAll();
        toast("Hábito eliminado", "info", ICONS.trash);
      },
    });
  });
}

function todoForm(todo) {
  const isNew = !todo;
  const t = todo || { title: "", notes: "", due: "", difficulty: "normal" };
  openModal(`
    <div class="modal-inner">
      <div class="modal-head"><h3>${isNew ? "Nueva tarea" : "Editar tarea"}</h3>
        <button class="icon-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <div class="field" id="f-title">
        <label for="inpTitle">Nombre</label>
        <input type="text" id="inpTitle" value="${esc(t.title)}" placeholder="Ej: Renovar el pasaporte" maxlength="80" autocomplete="off">
        <div class="err">Escribe un nombre para la tarea.</div>
      </div>
      <div class="field">
        <label for="inpNotes">Notas (opcional)</label>
        <input type="text" id="inpNotes" value="${esc(t.notes)}" placeholder="Detalle" maxlength="120" autocomplete="off">
      </div>
      <div class="field">
        <label for="inpDue">Fecha límite (opcional)</label>
        <input type="date" id="inpDue" value="${esc(t.due || "")}">
      </div>
      <div class="field">
        <label>Dificultad</label>
        ${segHTML("diff", [{ val: "facil", label: "Fácil" }, { val: "normal", label: "Normal" }, { val: "dificil", label: "Difícil" }], t.difficulty)}
      </div>
      <div class="modal-actions">
        ${isNew ? "" : `<button class="btn btn-danger" id="btnDel">${ICONS.trash}</button>`}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="btnSave">Guardar</button>
      </div>
    </div>`);
  wireSeg(modal);
  $("#btnSave", modal).addEventListener("click", () => {
    const title = $("#inpTitle", modal).value.trim();
    if (!title) { $("#f-title", modal).classList.add("has-err"); $("#inpTitle", modal).focus(); return; }
    const data = {
      title,
      notes: $("#inpNotes", modal).value.trim(),
      due: $("#inpDue", modal).value || null,
      difficulty: segValue(modal, "diff") || "normal",
    };
    if (isNew) {
      state.todos.push({ id: uid(), ...data, done: false, doneDate: null });
      toast("Tarea creada", "info", ICONS.sparkles);
    } else {
      Object.assign(todo, data);
    }
    save(); modal.close(); renderAll();
  });
  if (!isNew) $("#btnDel", modal).addEventListener("click", () => {
    confirmDialog({
      title: "Eliminar tarea",
      text: `¿Eliminar “${todo.title}”?`,
      onOk: () => {
        state.todos = state.todos.filter(x => x.id !== todo.id);
        save(); renderAll();
        toast("Tarea eliminada", "info", ICONS.trash);
      },
    });
  });
}

function goalForm(goal) {
  const isNew = !goal;
  const g = goal || { title: "", notes: "", milestones: [] };
  const mileRow = (m = { id: "", title: "" }) => `
    <div class="mile-edit-row" data-mid="${m.id}">
      <input type="text" value="${esc(m.title)}" placeholder="Ej: Correr 5K sin parar" maxlength="80" autocomplete="off">
      <button type="button" class="icon-btn" data-removemile aria-label="Quitar hito">${ICONS.x}</button>
    </div>`;
  openModal(`
    <div class="modal-inner">
      <div class="modal-head"><h3>${isNew ? "Nueva meta" : "Editar meta"}</h3>
        <button class="icon-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <div class="field" id="f-title">
        <label for="inpTitle">Meta</label>
        <input type="text" id="inpTitle" value="${esc(g.title)}" placeholder="Ej: Correr 10K" maxlength="80" autocomplete="off">
        <div class="err">Escribe un nombre para la meta.</div>
      </div>
      <div class="field">
        <label for="inpNotes">Notas (opcional)</label>
        <input type="text" id="inpNotes" value="${esc(g.notes)}" placeholder="Por qué te importa" maxlength="120" autocomplete="off">
      </div>
      <div class="field" id="f-miles">
        <label>Hitos (pasos hacia la meta)</label>
        <div class="mile-edit-list" id="mileList">
          ${g.milestones.length ? g.milestones.map(mileRow).join("") : mileRow()}
        </div>
        <div class="err">Agrega al menos un hito.</div>
        <button type="button" class="btn btn-ghost btn-sm" id="btnAddMile" style="margin-top:8px">${ICONS.plus}Agregar hito</button>
      </div>
      <div class="modal-actions">
        ${isNew ? "" : `<button class="btn btn-danger" id="btnDel">${ICONS.trash}</button>`}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="btnSave">Guardar</button>
      </div>
    </div>`);
  const list = $("#mileList", modal);
  $("#btnAddMile", modal).addEventListener("click", () => {
    list.insertAdjacentHTML("beforeend", mileRow());
    list.lastElementChild.querySelector("input").focus();
  });
  list.addEventListener("click", e => {
    const b = e.target.closest("[data-removemile]");
    if (b && list.children.length > 1) b.closest(".mile-edit-row").remove();
  });
  $("#btnSave", modal).addEventListener("click", () => {
    const title = $("#inpTitle", modal).value.trim();
    if (!title) { $("#f-title", modal).classList.add("has-err"); $("#inpTitle", modal).focus(); return; }
    const rows = $$(".mile-edit-row", list)
      .map(r => ({ mid: r.dataset.mid, title: r.querySelector("input").value.trim() }))
      .filter(r => r.title);
    if (!rows.length) { $("#f-miles", modal).classList.add("has-err"); return; }
    const milestones = rows.map(r => {
      const prev = g.milestones.find(m => m.id === r.mid);
      return prev ? { ...prev, title: r.title } : { id: uid(), title: r.title, done: false };
    });
    const data = { title, notes: $("#inpNotes", modal).value.trim(), milestones };
    if (isNew) {
      state.goals.push({ id: uid(), ...data, done: false });
      toast("Meta creada", "info", ICONS.sparkles);
    } else {
      Object.assign(goal, data);
      goal.done = milestones.length > 0 && milestones.every(m => m.done);
    }
    save(); modal.close(); renderAll();
  });
  if (!isNew) $("#btnDel", modal).addEventListener("click", () => {
    confirmDialog({
      title: "Eliminar meta",
      text: `¿Eliminar “${goal.title}” y todos sus hitos?`,
      onOk: () => {
        state.goals = state.goals.filter(x => x.id !== goal.id);
        save(); renderAll();
        toast("Meta eliminada", "info", ICONS.trash);
      },
    });
  });
}

function rewardForm(reward) {
  const isNew = !reward;
  const r = reward || { title: "", cost: 25 };
  openModal(`
    <div class="modal-inner">
      <div class="modal-head"><h3>${isNew ? "Nueva recompensa" : "Editar recompensa"}</h3>
        <button class="icon-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <div class="field" id="f-title">
        <label for="inpTitle">Recompensa</label>
        <input type="text" id="inpTitle" value="${esc(r.title)}" placeholder="Ej: 1 hora de videojuegos" maxlength="80" autocomplete="off">
        <div class="err">Escribe el nombre de la recompensa.</div>
      </div>
      <div class="field" id="f-cost">
        <label for="inpCost">Precio en monedas</label>
        <input type="number" id="inpCost" value="${r.cost}" min="1" max="9999" inputmode="numeric">
        <div class="err">El precio debe ser un número mayor a 0.</div>
        <div class="hint">Referencia: cada hábito paga las monedas definidas en su “pago al completar”.</div>
      </div>
      <div class="modal-actions">
        ${isNew ? "" : `<button class="btn btn-danger" id="btnDel">${ICONS.trash}</button>`}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="btnSave">Guardar</button>
      </div>
    </div>`);
  $("#btnSave", modal).addEventListener("click", () => {
    const title = $("#inpTitle", modal).value.trim();
    const cost = Math.round(Number($("#inpCost", modal).value));
    let ok = true;
    if (!title) { $("#f-title", modal).classList.add("has-err"); ok = false; }
    if (!cost || cost < 1) { $("#f-cost", modal).classList.add("has-err"); ok = false; }
    if (!ok) return;
    if (isNew) {
      state.rewards.push({ id: uid(), title, cost, timesBought: 0 });
      toast("Recompensa agregada a la tienda", "info", ICONS.gift);
    } else {
      Object.assign(reward, { title, cost });
    }
    save(); modal.close(); renderAll();
  });
  if (!isNew) $("#btnDel", modal).addEventListener("click", () => {
    confirmDialog({
      title: "Eliminar recompensa",
      text: `¿Quitar “${reward.title}” de la tienda?`,
      onOk: () => {
        state.rewards = state.rewards.filter(x => x.id !== reward.id);
        save(); renderAll();
        toast("Recompensa eliminada", "info", ICONS.trash);
      },
    });
  });
}

/* ---------- Onboarding / nombre ---------- */
function nameForm({ firstTime = false } = {}) {
  openModal(`
    <div class="modal-inner ${firstTime ? "celebrate" : ""}">
      ${firstTime ? `<div class="big-ico" style="color:var(--violet)">${ICONS.sword}</div>
      <h3>¡Bienvenido a tu aventura!</h3>
      <p>Convierte tus hábitos, tareas y metas en un juego: gana XP, sube de nivel, cuida tu vida y canjea monedas por recompensas reales.</p>` : `
      <div class="modal-head"><h3>Cambiar nombre</h3>
        <button class="icon-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>`}
      <div class="field" id="f-name" style="text-align:left">
        <label for="inpName">Nombre de tu héroe</label>
        <input type="text" id="inpName" value="${esc(state.player.name)}" placeholder="Ej: Toto la Valiente" maxlength="30" autocomplete="off">
        <div class="err">Tu héroe necesita un nombre.</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="btnName">${firstTime ? "¡Comenzar aventura!" : "Guardar"}</button>
      </div>
    </div>`, { locked: firstTime });
  const inp = $("#inpName", modal);
  inp.focus();
  const submit = () => {
    const name = inp.value.trim();
    if (!name) { $("#f-name", modal).classList.add("has-err"); inp.focus(); return; }
    state.player.name = name;
    save(); modal.close(); renderAll();
    if (firstTime) toast(`¡Que comience la aventura, ${name}!`, "gain", ICONS.sword);
  };
  $("#btnName", modal).addEventListener("click", submit);
  inp.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
}

/* ---------- Exportar / importar / reiniciar ---------- */
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mi-aventura-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Datos exportados", "info", ICONS.download);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.player || !Array.isArray(parsed.habits)) throw new Error("formato");
      confirmDialog({
        title: "Importar datos",
        text: `Se reemplazará tu progreso actual por el del archivo (héroe: ${parsed.player.name || "sin nombre"}, nivel ${parsed.player.level || 1}). ¿Continuar?`,
        okLabel: "Importar",
        onOk: () => {
          state = normalizeState({ ...defaultState(), ...parsed, player: { ...defaultState().player, ...parsed.player } });
          save(); runCron(); renderAll();
          toast("Datos importados con éxito", "gain", ICONS.upload);
        },
      });
    } catch {
      toast("El archivo no es una copia válida de Mi Aventura", "hurt", ICONS.x);
    }
  };
  reader.readAsText(file);
}

function resetAll() {
  confirmDialog({
    title: "Reiniciar aventura",
    text: "Se borrará TODO tu progreso: héroe, hábitos, tareas, metas y recompensas. Esta acción no se puede deshacer.",
    okLabel: "Borrar todo",
    onOk: () => {
      state = defaultState();
      save(); renderAll();
      nameForm({ firstTime: true });
    },
  });
}

/* ---------- Navegación ---------- */
let currentTab = "habitos";
function switchTab(tab) {
  currentTab = tab;
  $$(".view").forEach(v => v.hidden = v.id !== `view-${tab}`);
  $$(".nav-btn").forEach(b => {
    const on = b.dataset.tab === tab;
    b.classList.toggle("is-active", on);
    if (on) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  renderAll();
  window.scrollTo({ top: 0 });
}

/* ---------- Render global ---------- */
function renderAll() {
  renderHero();
  ({ habitos: renderHabitos, tareas: renderTareas, metas: renderMetas, tienda: renderTienda, perfil: renderPerfil })[currentTab]();
}

/* ---------- Eventos delegados ---------- */
document.addEventListener("click", (e) => {
  const nav = e.target.closest(".nav-btn");
  if (nav) { switchTab(nav.dataset.tab); return; }

  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const { act, id, mid } = btn.dataset;
  const actions = {
    "toggle-habit": () => toggleHabit(id),
    "log-time": () => timeLogForm(state.habits.find(x => x.id === id)),
    "edit-habit": () => habitForm(state.habits.find(x => x.id === id)),
    "new-habit": () => habitForm(null),
    "toggle-todo": () => toggleTodo(id),
    "edit-todo": () => todoForm(state.todos.find(x => x.id === id)),
    "new-todo": () => todoForm(null),
    "toggle-mile": () => toggleMilestone(id, mid),
    "edit-goal": () => goalForm(state.goals.find(x => x.id === id)),
    "new-goal": () => goalForm(null),
    "buy-reward": () => buyReward(id),
    "edit-reward": () => rewardForm(state.rewards.find(x => x.id === id)),
    "new-reward": () => rewardForm(null),
    "rename": () => nameForm(),
    "export": () => exportData(),
    "import": () => $("#importFile").click(),
    "reset": () => resetAll(),
  };
  actions[act]?.();
});

document.addEventListener("change", (e) => {
  if (e.target.id === "importFile" && e.target.files[0]) {
    importData(e.target.files[0]);
    e.target.value = "";
  }
});

// Al volver a la app (ej. PWA reabierta al día siguiente), revisar el cambio de día
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) { runCron(); renderAll(); }
});

/* ---------- Arranque ---------- */
runCron();
renderAll();
if (!state.player.name) nameForm({ firstTime: true });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
