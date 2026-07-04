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

// Modo descanso: precio por día (elige pagar con monedas o con vida)
const REST_COINS_PER_DAY = 15;
const REST_HP_PER_DAY = 4;
const REST_MAX_DAYS = 14;

// Multiplicador de racha: +10% por cada 7 días seguidos, tope +50%
function streakMult(streak) {
  return 1 + Math.min(0.5, Math.floor((streak || 0) / 7) * 0.1);
}

/* ---------- Logros ---------- */
const totalTimeAll = s => s.habits.reduce((t, h) => t + (h.totalMinutes || 0), 0);
const ACHIEVEMENTS = [
  { id: "primer-paso", title: "Primer paso", desc: "Completa tu primera actividad", icon: "sword", xp: 10, coins: 5, cond: s => s.player.totalCompleted >= 1 },
  { id: "racha-7", title: "Semana en llamas", desc: "Racha de 7 en un hábito", icon: "flame", xp: 20, coins: 10, cond: s => s.habits.some(h => (h.best || 0) >= 7) },
  { id: "racha-30", title: "Mes imparable", desc: "Racha de 30 en un hábito", icon: "flame", xp: 60, coins: 40, cond: s => s.habits.some(h => (h.best || 0) >= 30) },
  { id: "racha-100", title: "Voluntad de hierro", desc: "Racha de 100 en un hábito", icon: "trophy", xp: 150, coins: 100, cond: s => s.habits.some(h => (h.best || 0) >= 100) },
  { id: "horas-10", title: "Manos a la obra", desc: "10 horas registradas en total", icon: "clock", xp: 25, coins: 15, cond: s => totalTimeAll(s) >= 600 },
  { id: "horas-50", title: "Maratonista", desc: "50 horas registradas en total", icon: "clock", xp: 80, coins: 50, cond: s => totalTimeAll(s) >= 3000 },
  { id: "horas-100", title: "Cien horas", desc: "100 horas registradas en total", icon: "star", xp: 150, coins: 100, cond: s => totalTimeAll(s) >= 6000 },
  { id: "nivel-5", title: "Explorador", desc: "Alcanza el nivel 5", icon: "star", xp: 25, coins: 20, cond: s => s.player.level >= 5 },
  { id: "nivel-10", title: "Aventurero", desc: "Alcanza el nivel 10", icon: "star", xp: 60, coins: 50, cond: s => s.player.level >= 10 },
  { id: "nivel-20", title: "Héroe", desc: "Alcanza el nivel 20", icon: "trophy", xp: 120, coins: 100, cond: s => s.player.level >= 20 },
  { id: "contrato", title: "Contrato cumplido", desc: "Gana tu primer premio semanal o mensual", icon: "target", xp: 25, coins: 10, cond: s => (s.player.weeklyBonuses || 0) >= 1 },
  { id: "contratos-10", title: "Palabra de honor", desc: "Gana 10 premios de metas", icon: "target", xp: 80, coins: 40, cond: s => (s.player.weeklyBonuses || 0) >= 10 },
  { id: "rico", title: "Bolsillos llenos", desc: "Gana 500 monedas en total", icon: "coin", xp: 30, coins: 0, cond: s => s.player.coinsEarned >= 500 },
  { id: "magnate", title: "Tesoro del dragón", desc: "Gana 2000 monedas en total", icon: "coin", xp: 80, coins: 0, cond: s => s.player.coinsEarned >= 2000 },
  { id: "gustito", title: "Date un gusto", desc: "Canjea tu primera recompensa", icon: "gift", xp: 15, coins: 0, cond: s => s.player.rewardsBought >= 1 },
  { id: "meta", title: "Conquistador", desc: "Completa una meta con todos sus hitos", icon: "trophy", xp: 40, coins: 20, cond: s => s.goals.some(g => g.done) },
  { id: "cien-veces", title: "Constancia total", desc: "100 actividades completadas", icon: "check", xp: 60, coins: 30, cond: s => s.player.totalCompleted >= 100 },
  { id: "fenix", title: "Ave fénix", desc: "Cae en batalla y vuelve a levantarte", icon: "skull", xp: 15, coins: 0, cond: s => s.player.deaths >= 1 },
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
  history: I('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>'),
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
function addDays(s, n) {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + n);
  return todayStr(d);
}
// Lunes de la semana a la que pertenece la fecha
function weekStartStr(s) {
  const d = parseDateStr(s);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return todayStr(d);
}
function monthKey(s) { return s.slice(0, 7); }
function nextMonthKey(mk) {
  let [y, m] = mk.split("-").map(Number);
  m++;
  if (m > 12) { m = 1; y++; }
  return `${y}-${String(m).padStart(2, "0")}`;
}
// Suma del registro de un hábito en [desde, hasta) — check: días hechos · tiempo: minutos
function habitSumRange(h, from, toExcl) {
  let sum = 0;
  for (const [date, v] of Object.entries(h.log || {})) {
    if (date >= from && date < toExcl) sum += v;
  }
  return sum;
}

/* ---------- Estado ---------- */
// Crea un hábito con todos los campos; `o` pisa los valores por defecto.
// mode "check": payout = monedas al completar · mode "tiempo": payout = monedas por hora.
// flexible: sin exigencia diaria (no quita vida faltar un día); mandan sus metas semanales/mensuales.
// goalW/goalWMin/goalM/goalMMin: check = días · tiempo = minutos; 0 = sin objetivo.
// bonus: monedas del premio semanal (mensual ×4; null = 2×payout) · penalty: multa semanal (mensual ×4; null = payout).
function mkHabit(o) {
  return {
    id: uid(), title: "", notes: "", days: [1, 2, 3, 4, 5, 6, 0], difficulty: "normal",
    mode: "check", flexible: false, payout: 8, startDate: null, endDate: null,
    goalW: 0, goalWMin: 0, goalM: 0, goalMMin: 0, bonus: null, penalty: null,
    streak: 0, best: 0, completedToday: false, todayMinutes: 0, todayLogs: [],
    totalMinutes: 0, log: {}, createdAt: todayStr(), ...o,
  };
}
function mkGoal(title, hitos) {
  return { id: uid(), title, notes: "", milestones: hitos.map(t => ({ id: uid(), title: t, done: false })), done: false };
}

function defaultState() {
  // Economía calibrada: una semana "normal" paga ~160-200 monedas.
  // Estudiar ~75 + meditar ~21 + gimnasio ~48 + clases ~40, más premios semanales/mensuales.
  return {
    player: {
      name: "", level: 1, xp: 0, hp: MAX_HP, coins: 0,
      totalCompleted: 0, coinsEarned: 0, coinsSpent: 0, rewardsBought: 0, deaths: 0,
      weeklyBonuses: 0,
      createdAt: todayStr(),
    },
    habits: [
      mkHabit({ title: "Estudiar", notes: "1 a 2 h por día · mínimo 30 min", days: [1, 2, 3, 4, 5], mode: "tiempo", payout: 10, goalW: 450, goalWMin: 150, bonus: 25, penalty: 15 }),
      mkHabit({ title: "Meditar", notes: "10 min al día · mínimo 5", difficulty: "facil", mode: "tiempo", payout: 18, goalW: 70, goalWMin: 35, bonus: 10, penalty: 5 }),
      mkHabit({ title: "Ir al gimnasio", notes: "Mínimo 3 por semana · 5 = excelente", difficulty: "dificil", flexible: true, payout: 12, goalW: 5, goalWMin: 3, bonus: 30, penalty: 20 }),
      mkHabit({ title: "Clase de Renta Fija", notes: "75% de asistencia o quedas libre", days: [1], payout: 10, goalM: 4, goalMMin: 3, bonus: 10, penalty: 15, startDate: "2026-08-03", endDate: "2026-11-30" }),
      mkHabit({ title: "Clase de Riesgo Crediticio", notes: "75% de asistencia o quedas libre", days: [2], payout: 10, goalM: 4, goalMMin: 3, bonus: 10, penalty: 15, startDate: "2026-08-04", endDate: "2026-11-24" }),
      mkHabit({ title: "Clase de Microeconomía", notes: "75% de asistencia o quedas libre", days: [3], payout: 10, goalM: 4, goalMMin: 3, bonus: 10, penalty: 15, startDate: "2026-08-05", endDate: "2026-12-02" }),
      mkHabit({ title: "Clase de Derivados I", notes: "75% de asistencia o quedas libre", days: [5], payout: 10, goalM: 4, goalMMin: 3, bonus: 10, penalty: 15, startDate: "2026-08-07", endDate: "2026-11-27" }),
    ],
    todos: [],    // {id,title,notes,due,difficulty,done,doneDate}
    // Metas del cuatrimestre: regularizar (2 parciales) y aprobar el final de cada materia
    goals: [
      mkGoal("Regularizar Renta Fija", ["Aprobar el 1er parcial", "Aprobar el 2do parcial"]),
      mkGoal("Regularizar Riesgo Crediticio", ["Aprobar el 1er parcial", "Aprobar el 2do parcial"]),
      mkGoal("Regularizar Microeconomía", ["Aprobar el 1er parcial", "Aprobar el 2do parcial"]),
      mkGoal("Regularizar Derivados I", ["Aprobar el 1er parcial", "Aprobar el 2do parcial"]),
      mkGoal("Aprobar el final de Renta Fija", ["Aprobar el final"]),
      mkGoal("Aprobar el final de Riesgo Crediticio", ["Aprobar el final"]),
      mkGoal("Aprobar el final de Microeconomía", ["Aprobar el final"]),
      mkGoal("Aprobar el final de Derivados I", ["Aprobar el final"]),
    ],
    // Jefes: enemigos con vida; el XP ganado con los hábitos enlazados les hace daño
    bosses: [],   // {id,title,maxHp,hp,habitIds:[] (vacío = todos),loot,done,createdAt,defeatedAt}
    // {id,title,cost,timesBought} — precios pensados para ~160-200 monedas/semana
    rewards: [
      { id: uid(), title: "Salir de fiesta", cost: 150, timesBought: 0 },
      { id: uid(), title: "Comer chocolate", cost: 25, timesBought: 0 },
      { id: uid(), title: "1 partida con team", cost: 25, timesBought: 0 },
      { id: uid(), title: "1 partida solo", cost: 50, timesBought: 0 },
      { id: uid(), title: "Maratón de series (2 h)", cost: 50, timesBought: 0 },
      { id: uid(), title: "Salida con amigos", cost: 80, timesBought: 0 },
      { id: uid(), title: "Compra caprichosa", cost: 200, timesBought: 0 },
    ],
    history: {},  // {fecha: xp ganado}
    achievements: {},  // {id: fecha en que se logró}
    rest: null,        // {from, until} modo descanso activo (se compra con monedas o vida)
    lastReviewShown: weekStartStr(todayStr()),  // lunes de la última revisión semanal mostrada
    lastCron: todayStr(),
    lastWeekEvaluated: weekStartStr(todayStr()),  // lunes de la última semana ya premiada/penalizada
    lastMonthEvaluated: monthKey(todayStr()),     // "YYYY-MM" del último mes ya evaluado
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
    h.flexible = !!h.flexible;
    h.todayMinutes = h.todayMinutes || 0;
    h.todayLogs = Array.isArray(h.todayLogs) ? h.todayLogs : [];
    h.totalMinutes = h.totalMinutes || 0;
    h.log = h.log && typeof h.log === "object" ? h.log : {};
    h.goalW = h.goalW || 0;
    h.goalWMin = h.goalWMin || 0;
    h.goalM = h.goalM || 0;
    h.goalMMin = h.goalMMin || 0;
    if (h.bonus == null || !Number.isFinite(Number(h.bonus))) h.bonus = null;
    if (h.penalty == null || !Number.isFinite(Number(h.penalty))) h.penalty = null;
    h.createdAt = h.createdAt || st.player?.createdAt || todayStr();
    h.startDate = h.startDate || null;
    h.endDate = h.endDate || null;
  }
  st.bosses = Array.isArray(st.bosses) ? st.bosses : [];
  for (const b of st.bosses) {
    b.habitIds = Array.isArray(b.habitIds) ? b.habitIds : [];
    b.maxHp = Math.max(1, Math.round(Number(b.maxHp) || 100));
    b.hp = Math.max(0, Math.min(b.hp ?? b.maxHp, b.maxHp));
    b.loot = Math.max(0, Math.round(Number(b.loot) || 0));
    b.done = !!b.done;
  }
  st.lastReviewShown = st.lastReviewShown || weekStartStr(todayStr());
  st.lastWeekEvaluated = st.lastWeekEvaluated || weekStartStr(todayStr());
  st.lastMonthEvaluated = st.lastMonthEvaluated || monthKey(todayStr());
  st.achievements = st.achievements && typeof st.achievements === "object" ? st.achievements : {};
  st.rest = st.rest && st.rest.from && st.rest.until ? st.rest : null;
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

// Revisa condiciones de logros y otorga los nuevos (idempotente)
function checkAchievements() {
  const p = state.player;
  let earned = false;
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.id] || !a.cond(state)) continue;
    state.achievements[a.id] = todayStr();
    p.xp += a.xp;
    p.coins += a.coins;
    p.coinsEarned += a.coins;
    if (a.xp) recordHistory(a.xp);
    earned = true;
    toast(`Logro: ${a.title} · +${a.xp} XP${a.coins ? ` +${a.coins} monedas` : ""}`, "gain", ICONS.trophy);
  }
  if (earned) {
    let leveled = false;
    while (p.xp >= xpNeeded(p.level)) {
      p.xp -= xpNeeded(p.level);
      p.level++;
      p.hp = MAX_HP;
      leveled = true;
    }
    save();
    if (leveled) celebrateLevelUp();
  }
  return earned;
}

/* ---------- Modo descanso ---------- */
function restActive(dateStr) {
  return !!(state.rest && state.rest.from <= dateStr && dateStr <= state.rest.until);
}

function restForm() {
  const p = state.player;
  const activo = restActive(todayStr());
  openModal(`
    <div class="modal-inner">
      <div class="modal-head"><h3>Modo descanso</h3>
        <button class="icon-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <p class="confirm-text">${activo
        ? `Estás descansando hasta el <strong>${fmtShortDate(state.rest.until)}</strong>. Puedes comprar más días (reemplaza el período desde hoy).`
        : "Vacaciones, viaje, enfermedad… Mientras descansas no pierdes vida ni rachas por hábitos sin completar, y no se cobran multas semanales/mensuales. Completar hábitos paga igual."}</p>
      <div class="field" id="f-restdays">
        <label for="inpRestDays">Días de descanso (desde hoy)</label>
        <input type="number" id="inpRestDays" value="3" min="1" max="${REST_MAX_DAYS}" inputmode="numeric">
        <div class="err">Entre 1 y ${REST_MAX_DAYS} días.</div>
      </div>
      <div class="field">
        <label>Pagar con</label>
        ${segHTML("restpay", [{ val: "coins", label: `Monedas (${REST_COINS_PER_DAY}/día)` }, { val: "hp", label: `Vida (${REST_HP_PER_DAY} HP/día)` }], "coins")}
        <div class="hint" id="restHint"></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="btnRest">Comprar descanso</button>
      </div>
    </div>`);
  wireSeg(modal);
  const inp = $("#inpRestDays", modal);
  const hint = $("#restHint", modal);
  const upd = () => {
    const d = Math.round(Number(inp.value));
    if (!Number.isFinite(d) || d < 1) { hint.textContent = ""; return; }
    const pay = segValue(modal, "restpay") || "coins";
    hint.textContent = pay === "coins"
      ? `Costo: ${d * REST_COINS_PER_DAY} monedas (tienes ${p.coins}).`
      : `Costo: ${d * REST_HP_PER_DAY} HP (tienes ${p.hp}; debe quedarte al menos 1).`;
  };
  upd();
  inp.addEventListener("input", upd);
  $(`.seg[data-seg="restpay"]`, modal).addEventListener("click", upd);
  $("#btnRest", modal).addEventListener("click", () => {
    const d = Math.round(Number(inp.value));
    if (!Number.isFinite(d) || d < 1 || d > REST_MAX_DAYS) { $("#f-restdays", modal).classList.add("has-err"); return; }
    const pay = segValue(modal, "restpay") || "coins";
    if (pay === "coins") {
      const cost = d * REST_COINS_PER_DAY;
      if (p.coins < cost) { toast(`Te faltan monedas: cuesta ${cost} y tienes ${p.coins}`, "hurt", ICONS.coin); return; }
      p.coins -= cost;
      p.coinsSpent += cost;
    } else {
      const cost = d * REST_HP_PER_DAY;
      if (p.hp - cost < 1) { toast(`No te alcanza la vida: cuesta ${cost} HP y tienes ${p.hp}`, "hurt", ICONS.heart); return; }
      p.hp -= cost;
    }
    state.rest = { from: todayStr(), until: addDays(todayStr(), d - 1) };
    toast(`Descanso hasta el ${fmtShortDate(state.rest.until)}. ¡Recarga energías!`, "info", ICONS.sparkles);
    save(); modal.close(); renderAll();
  });
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

/* ---------- Cron: cambio de día, semana y mes ---------- */
function habitBonus(h) { return h.bonus ?? habitPayout(h) * 2; }
function habitPenalty(h) { return h.penalty ?? habitPayout(h); }

// Evalúa un período terminado de un hábito: premio si alcanzó la meta, multa si no llegó al mínimo.
// mult: 1 = semana, 4 = mes (el mes premia/cobra 4× y duele el doble por HP).
function evalPeriod(h, from, toExcl, labelPeriodo, mult, events) {
  if (from < (h.createdAt || "")) return; // no evaluar períodos previos al hábito
  // Vigencia parcial (materia que empieza o termina a mitad del período): no se evalúa
  if (h.startDate && h.startDate > from) return;
  if (h.endDate && h.endDate < addDays(toExcl, -1)) return;
  const target = mult === 1 ? h.goalW : h.goalM;
  const min = mult === 1 ? h.goalWMin : h.goalMMin;
  if (!target && !min) return;
  const sum = habitSumRange(h, from, toExcl);
  const fmt = v => h.mode === "tiempo" ? fmtMin(v) : `${v} día${v === 1 ? "" : "s"}`;
  if (target && sum >= target) {
    const coins = habitBonus(h) * mult, xp = 20 * mult;
    events.push({ kind: "bonus", coins, xp, hp: 0, text: `${h.title}: ${fmt(sum)} ${labelPeriodo} (meta: ${fmt(target)}) → premio +${coins} monedas, +${xp} XP` });
  } else if (min && sum < min) {
    // Si el descanso tocó este período, se perdona la multa
    if (state.rest && state.rest.from < toExcl && state.rest.until >= from) return;
    // En hábitos flexibles, no llegar al mínimo rompe la racha (su "día fallado")
    if (h.flexible) h.streak = 0;
    const coins = habitPenalty(h) * mult, hp = 4 * mult;
    events.push({ kind: "penalty", coins: -coins, xp: 0, hp: -hp, text: `${h.title}: solo ${fmt(sum)} ${labelPeriodo} (mínimo: ${fmt(min)}) → multa −${coins} monedas, −${hp} HP` });
  }
}

// Premia/penaliza todas las semanas y meses que terminaron desde la última visita
function evaluatePeriods(events) {
  const today = todayStr();
  let ws = addDays(state.lastWeekEvaluated, 7);
  let guard = 0;
  while (addDays(ws, 7) <= today && guard++ < 60) {
    for (const h of state.habits) evalPeriod(h, ws, addDays(ws, 7), `la semana del ${fmtShortDate(ws)}`, 1, events);
    state.lastWeekEvaluated = ws;
    ws = addDays(ws, 7);
  }
  let mk = nextMonthKey(state.lastMonthEvaluated);
  guard = 0;
  while (`${nextMonthKey(mk)}-01` <= today && guard++ < 24) {
    const nombreMes = parseDateStr(`${mk}-01`).toLocaleDateString("es", { month: "long" });
    for (const h of state.habits) evalPeriod(h, `${mk}-01`, `${nextMonthKey(mk)}-01`, `en ${nombreMes}`, 4, events);
    state.lastMonthEvaluated = mk;
    mk = nextMonthKey(mk);
  }
}

function runCron() {
  const today = todayStr();
  if (state.lastCron === today) return;
  // Si la fecha guardada es futura (cambio de reloj), solo re-sincroniza.
  if (state.lastCron > today) { state.lastCron = today; save(); return; }
  const p = state.player;
  const events = [];

  // 1) Daño por hábitos diarios incumplidos
  let dmg = 0;
  let missed = 0;
  for (const d of datesBetween(state.lastCron, today)) {
    if (restActive(d)) continue; // día de descanso: no hay daño ni se rompen rachas
    const dow = parseDateStr(d).getDay();
    for (const h of state.habits) {
      if (h.flexible) continue; // sin exigencia diaria: solo mandan sus metas semanales/mensuales
      if (!h.days.includes(dow)) continue;
      if (!habitActiveOn(h, d) || (h.createdAt || "") > d) continue; // materia fuera de cursada
      const done = d === state.lastCron ? habitDoneToday(h) : false;
      if (!done) {
        dmg += DMG_MISSED_HABIT;
        missed++;
        h.streak = 0;
      }
    }
  }
  if (dmg > 0) {
    dmg = Math.min(dmg, DMG_CRON_CAP);
    events.push({ kind: "miss", coins: 0, xp: 0, hp: -dmg, text: `${missed} hábito${missed > 1 ? "s" : ""} sin completar → −${dmg} HP` });
  }

  // 2) Reset diario
  for (const h of state.habits) {
    h.completedToday = false;
    h.todayMinutes = 0;
    h.todayLogs = [];
  }

  // 3) Premios y multas de semanas/meses terminados
  evaluatePeriods(events);

  // 4) Aplicar todo al héroe — primero los premios, luego las multas,
  // para que una multa no se pierda contra el piso de 0 monedas
  let leveled = false;
  for (const ev of [...events].sort((a, b) => b.coins - a.coins)) {
    p.coins = Math.max(0, p.coins + ev.coins);
    if (ev.coins > 0) p.coinsEarned += ev.coins;
    if (ev.kind === "bonus") p.weeklyBonuses = (p.weeklyBonuses || 0) + 1;
    p.hp += ev.hp;
    if (ev.xp > 0) {
      p.xp += ev.xp;
      recordHistory(ev.xp);
      while (p.xp >= xpNeeded(p.level)) {
        p.xp -= xpNeeded(p.level);
        p.level++;
        p.hp = MAX_HP;
        leveled = true;
      }
    }
  }
  if (leveled) events.push({ kind: "level", text: `¡Subiste al nivel ${p.level}! Vida restaurada.` });
  if (p.hp <= 0) {
    p.deaths++;
    p.level = Math.max(1, p.level - 1);
    p.xp = 0;
    p.coins = 0;
    p.hp = MAX_HP;
    events.push({ kind: "death", text: "Tu vida llegó a 0: pierdes 1 nivel y tus monedas. Vida restaurada." });
  }

  // 5) Limpiar registros muy viejos (conservar ~13 meses)
  const cutoff = addDays(today, -400);
  for (const h of state.habits) {
    for (const k of Object.keys(h.log)) if (k < cutoff) delete h.log[k];
  }

  state.lastCron = today;
  save();
  checkAchievements();
  if (events.length) showCronSummary(events);
}

/* ---------- Revisión semanal ---------- */
function weeklyReviewModal() {
  const ws = weekStartStr(todayStr());     // lunes de esta semana
  const from = addDays(ws, -7);            // semana pasada
  const prevFrom = addDays(ws, -14);       // semana anterior a esa
  const trend = (cur, prev, fmtV) => {
    const cls = cur > prev ? "up" : cur < prev ? "down" : "flat";
    const arrow = cur > prev ? "▲" : cur < prev ? "▼" : "•";
    return `<span class="trend ${cls}">${arrow} ${fmtV(cur)}</span> <small>(antes ${fmtV(prev)})</small>`;
  };
  const rows = state.habits.map(h => {
    const cur = habitSumRange(h, from, ws);
    const prev = habitSumRange(h, prevFrom, from);
    if (!cur && !prev) return "";
    const fmtV = v => h.mode === "tiempo" ? fmtMin(v) : `${v} día${v === 1 ? "" : "s"}`;
    return `<div class="review-row"><span class="review-name">${esc(h.title)}</span>${trend(cur, prev, fmtV)}</div>`;
  }).filter(Boolean);
  const xpOf = (a, b) => Object.entries(state.history).reduce((s, [d, xp]) => d >= a && d < b ? s + xp : s, 0);
  const xpCur = xpOf(from, ws), xpPrev = xpOf(prevFrom, from);
  openModal(`
    <div class="modal-inner">
      <div class="modal-head"><h3>Revisión semanal</h3>
        <button class="icon-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <p class="confirm-text">Semana del ${fmtShortDate(from)} al ${fmtShortDate(addDays(ws, -1))}, comparada con la anterior.</p>
      ${rows.length ? `<div class="review-list">
        <div class="review-row total"><span class="review-name">XP ganado</span>${trend(xpCur, xpPrev, v => `${v} XP`)}</div>
        ${rows.join("")}
      </div>` : `<p class="confirm-text">Todavía no hay actividad registrada en esas semanas. ¡Esta semana empieza tu historia!</p>`}
      <div class="modal-actions"><button class="btn btn-primary" data-close>¡A por esta semana!</button></div>
    </div>`);
}

// Cada lunes (primera visita de la semana) se muestra sola la revisión
function maybeShowWeeklyReview() {
  const ws = weekStartStr(todayStr());
  if (ws <= (state.lastReviewShown || "")) return;
  state.lastReviewShown = ws;
  save();
  // hubo actividad la semana pasada o la anterior → vale la pena mostrarla
  const from = addDays(ws, -14);
  const anyActivity = state.habits.some(h => habitSumRange(h, from, ws) > 0);
  if (!anyActivity || !state.player.name) return;
  if (modal.open) modal.addEventListener("close", () => weeklyReviewModal(), { once: true });
  else weeklyReviewModal();
}

function showCronSummary(events) {
  const icon = { bonus: ICONS.trophy, penalty: ICONS.skull, miss: ICONS.heart, level: ICONS.star, death: ICONS.skull };
  openModal(`
    <div class="modal-inner">
      <div class="modal-head"><h3>Mientras no estabas…</h3>
        <button class="icon-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <div class="cron-list">
        ${events.map(e => `<div class="cron-item ${e.kind}">${icon[e.kind] || ICONS.star}<span>${esc(e.text)}</span></div>`).join("")}
      </div>
      <div class="modal-actions"><button class="btn btn-primary" data-close>Entendido</button></div>
    </div>`);
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
/* ---------- Render: barra del héroe ---------- */
function renderHero() {
  const p = state.player;
  const need = xpNeeded(p.level);
  const hpPct = clamp((p.hp / MAX_HP) * 100, 0, 100);
  const xpPct = clamp((p.xp / need) * 100, 0, 100);
  $("#heroBar").innerHTML = `
    <p class="hero-motto">increase sacrifice or reduce desire</p>
    <div class="hero-row">
      <div class="hero-info">
        <p class="hero-name">${esc(p.name || "Héroe")}
          <span class="hero-title">· ${esc(heroTitle(p.level))}</span>
          <span class="level-badge">Nv ${p.level}</span>
        </p>
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
// Qué falta hoy: hábitos check sin marcar + hábitos por tiempo atrasados vs. su ritmo semanal
function todayPending() {
  const today = todayStr();
  const dow = new Date().getDay();
  const wStart = weekStartStr(today);
  const parts = [];
  for (const h of state.habits) {
    if (!habitActiveOn(h, today)) continue; // materia fuera de cursada: no exige
    if (h.flexible && h.mode === "check") {
      // Flexible: lo que falta para el mínimo semanal (ej. gimnasio ×2 esta semana)
      const min = h.goalWMin || h.goalW;
      if (!min) continue;
      const falta = min - habitSumRange(h, wStart, addDays(wStart, 7));
      if (falta > 0) parts.push(`${esc(h.title)} ×${falta} esta semana`);
    } else if (h.mode === "check") {
      if (h.days.includes(dow) && !h.completedToday) parts.push(esc(h.title));
    } else if (h.goalW) {
      // objetivo diario = meta semanal repartida entre los días programados
      if (h.days.includes(dow)) {
        const dailyTarget = Math.round(h.goalW / Math.max(1, h.days.length));
        const falta = dailyTarget - (h.todayMinutes || 0);
        if (falta > 0) parts.push(`${fmtMin(falta)} de ${esc(h.title)}`);
      }
    } else if (h.days.includes(dow) && !h.todayMinutes) {
      parts.push(esc(h.title));
    }
  }
  return parts;
}

function renderHabitos() {
  const v = $("#view-habitos");
  const todayDow = new Date().getDay();
  const activos = state.habits.filter(h => habitActiveOn(h, todayStr()));
  const dormidos = state.habits.filter(h => !habitActiveOn(h, todayStr()));
  const isToday = h => h.days.includes(todayDow);
  const todayHabits = activos.filter(isToday);
  const otherHabits = activos.filter(h => !isToday(h));
  const pending = todayPending();
  const resting = restActive(todayStr());
  const banner = !state.habits.length ? "" : resting
    ? `<div class="today-banner rest">${ICONS.sparkles}<span>Modo descanso hasta el <strong>${fmtShortDate(state.rest.until)}</strong>: sin daño ni multas. ¡Disfruta!</span></div>`
    : pending.length
      ? `<div class="today-banner">${ICONS.sword}<span><strong>Hoy te falta:</strong> ${pending.join(" · ")}</span></div>`
      : `<div class="today-banner done">${ICONS.check}<span><strong>¡Todo listo por hoy!</strong> A disfrutar el botín.</span></div>`;

  const today = todayStr();
  const wStart = weekStartStr(today);
  const mStart = `${monthKey(today)}-01`;

  const card = (h, activeToday, sleeping = false) => {
    const d = DIFF[h.difficulty] || DIFF.normal;
    const done = habitDoneToday(h);
    const isTime = h.mode === "tiempo";
    const fmtV = v => isTime ? fmtMin(v) : v;
    const wSum = (h.goalW || h.goalWMin) ? habitSumRange(h, wStart, addDays(wStart, 7)) : 0;
    const mSum = (h.goalM || h.goalMMin) ? habitSumRange(h, mStart, `${nextMonthKey(monthKey(today))}-01`) : 0;
    const goalChip = (sum, target, min, lbl) => {
      if (!target && !min) return "";
      const hit = target && sum >= target;
      return `<span class="goal-chip ${hit ? "hit" : ""}" title="${hit ? "¡Meta cumplida!" : "Progreso"}">${ICONS.target}${fmtV(sum)}/${fmtV(target || min)} ${lbl}</span>`;
    };
    // Chip de vigencia (materias): próximo a comenzar, en curso o terminado
    const periodChip = () => {
      if (!h.startDate && !h.endDate) return "";
      const txt = sleeping
        ? (h.startDate && today < h.startDate ? `comienza el ${fmtShortDate(h.startDate)}` : `terminó el ${fmtShortDate(h.endDate)}`)
        : `${h.startDate ? fmtShortDate(h.startDate) : "…"} – ${h.endDate ? fmtShortDate(h.endDate) : "…"}`;
      return `<span class="due">${ICONS.calendar}${txt}</span>`;
    };
    const canBackfill = !isTime && !sleeping && missedRecentDays(h).length > 0;
    return `
    <div class="card ${!isTime && done ? "is-done" : ""} ${sleeping ? "is-sleeping" : ""}">
      ${sleeping ? `
      <div class="check-btn" style="opacity:.25" aria-hidden="true">${ICONS.calendar}</div>` : isTime ? `
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
          <span class="streak">${ICONS.flame}${h.streak} racha${streakMult(h.streak) > 1 ? ` ×${streakMult(h.streak).toFixed(1)}` : ""}</span>
          <span class="payout" aria-label="Paga ${habitPayout(h)} monedas${isTime ? " por hora" : ""}">${ICONS.coin}+${habitPayout(h)}${isTime ? "/h" : ""}</span>
          ${isTime && h.todayMinutes ? `<span class="mins">${ICONS.clock}${fmtMin(h.todayMinutes)} hoy</span>` : ""}
          ${goalChip(wSum, h.goalW, h.goalWMin, "sem")}
          ${goalChip(mSum, h.goalM, h.goalMMin, "mes")}
          ${h.flexible ? `<span class="due" title="Sin exigencia diaria: mandan sus metas">flexible</span>` : ""}
          ${periodChip()}
          <span><span class="diff-dot" style="background:${d.color}"></span>${d.label}</span>
        </div>
        <div class="day-pills" aria-label="Días programados">
          ${WEEK.map(w => `<span class="day-pill ${h.days.includes(w.dow) ? "on" : ""}">${w.l}</span>`).join("")}
        </div>
      </div>
      ${canBackfill ? `<button class="icon-btn" data-act="backfill" data-id="${h.id}" aria-label="Completar día pasado de ${esc(h.title)}">${ICONS.history}</button>` : ""}
      <button class="icon-btn" data-act="edit-habit" data-id="${h.id}" aria-label="Editar ${esc(h.title)}">${ICONS.pencil}</button>
    </div>`;
  };

  v.innerHTML = `
    <div class="view-head">
      <div><h2>Hábitos</h2><p class="sub">${todayHabits.length ? `${todayHabits.filter(habitDoneToday).length} de ${todayHabits.length} completados hoy` : "Construye tu rutina diaria"}</p></div>
      <button class="btn btn-primary btn-sm" data-act="new-habit">${ICONS.plus}Nuevo</button>
    </div>
    ${banner}
    ${state.habits.length === 0 ? `
      <div class="empty">${ICONS.calendar}
        <p>Aún no tienes hábitos</p>
        <small>Crea tu primer hábito diario: leer, ejercicio, meditar…</small>
      </div>` : `
      ${todayHabits.length ? `<div class="card-list">${todayHabits.map(h => card(h, true)).join("")}</div>` : ""}
      ${otherHabits.length ? `<p class="section-label">Otros días</p><div class="card-list">${otherHabits.map(h => card(h, false)).join("")}</div>` : ""}
      ${dormidos.length ? `<p class="section-label">Fuera de período</p><div class="card-list">${dormidos.map(h => card(h, false, true)).join("")}</div>` : ""}
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

// Vigencia: fuera de [startDate, endDate] el hábito duerme (no exige, no castiga).
// Sirve para materias/cursadas con fecha de inicio y fin.
function habitActiveOn(h, dateStr) {
  return (!h.startDate || dateStr >= h.startDate) && (!h.endDate || dateStr <= h.endDate);
}

// ¿El hábito exigía actividad ese día? (programado, vigente, sin descanso, no flexible)
function habitRequiredOn(h, dateStr) {
  return !h.flexible
    && habitActiveOn(h, dateStr)
    && (h.createdAt || "") <= dateStr
    && h.days.includes(parseDateStr(dateStr).getDay())
    && !restActive(dateStr);
}

// ¿Se podía hacer ese día? (para registrar días pasados de hábitos flexibles)
function habitDoableOn(h, dateStr) {
  return habitActiveOn(h, dateStr)
    && (h.createdAt || "") <= dateStr
    && h.days.includes(parseDateStr(dateStr).getDay());
}

// Días de esta semana (del lunes a ayer) en que se pudo hacer el hábito y quedaron sin registrar.
// Acotado a la semana en curso: las semanas pasadas ya fueron evaluadas (premio/multa) y no se retocan.
function missedRecentDays(h) {
  const today = todayStr();
  const wStart = weekStartStr(today);
  const out = [];
  let d = addDays(today, -1);
  let guard = 0;
  while (d >= wStart && guard++ < 8) {
    const posible = h.flexible ? habitDoableOn(h, d) : habitRequiredOn(h, d);
    if (posible && !(h.log && h.log[d])) out.push(d);
    d = addDays(d, -1);
  }
  return out;
}

// Recalcula la racha real desde el registro histórico (para completar días pasados)
function recalcStreak(h) {
  // Flexible: la racha no depende del calendario; se maneja al completar/deshacer
  if (h.flexible) return;
  const today = todayStr();
  let d = today;
  // hoy aún no hecho no corta la racha: empezar a contar desde ayer
  if (!(h.log && h.log[d])) d = addDays(d, -1);
  let streak = 0;
  let guard = 0;
  while (guard++ < 400 && d >= (h.createdAt || d)) {
    if (habitRequiredOn(h, d)) {
      if (h.log && h.log[d]) streak++;
      else break;
    }
    d = addDays(d, -1);
  }
  h.streak = streak;
  h.best = Math.max(h.best || 0, streak);
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
  if (!h.completedToday) {
    h.completedToday = true;
    h.log[todayStr()] = 1;
    h.streak++;
    h.best = Math.max(h.best || 0, h.streak);
    const m = streakMult(h.streak);
    const coins = Math.round(habitPayout(h) * m);
    state.player.totalCompleted++;
    grant(xp, coins, `racha ${h.streak}${m > 1 ? ` ×${m.toFixed(1)}` : ""}`);
    damageBosses(h.id, xp);
  } else {
    // deshacer con el mismo multiplicador con que se pagó
    const m = streakMult(h.streak);
    const coins = Math.round(habitPayout(h) * m);
    h.completedToday = false;
    delete h.log[todayStr()];
    h.streak = Math.max(0, h.streak - 1);
    state.player.totalCompleted = Math.max(0, state.player.totalCompleted - 1);
    ungrant(xp, coins);
    healBosses(h.id, xp);
  }
  checkAchievements();
  save();
  renderAll();
}

/* ---------- Hábitos por tiempo ---------- */
function logTime(id, minutes) {
  const h = state.habits.find(x => x.id === id);
  if (!h || h.mode !== "tiempo") return;
  const min = clamp(Math.round(Number(minutes)), 1, 24 * 60);
  const first = (h.todayMinutes || 0) === 0;
  // La racha solo cuenta en días programados; registrar en otros días paga igual
  const streakInc = first && h.days.includes(new Date().getDay());
  if (streakInc) {
    h.streak++;
    h.best = Math.max(h.best || 0, h.streak);
  }
  const m = streakMult(h.streak);
  const coins = Math.round(habitPayout(h) * min / 60 * m);
  const xp = Math.max(1, Math.round(rewardFor(REWARD_HABIT, h.difficulty).xp * min / 60));
  if (first) state.player.totalCompleted++;
  h.todayMinutes = (h.todayMinutes || 0) + min;
  h.totalMinutes = (h.totalMinutes || 0) + min;
  h.log[todayStr()] = h.todayMinutes;
  h.todayLogs.push({ min, xp, coins, streakInc });
  grant(xp, coins, `${fmtMin(h.todayMinutes)} hoy${m > 1 ? ` ×${m.toFixed(1)}` : ""}`);
  damageBosses(h.id, xp);
  checkAchievements();
  save();
  renderAll();
}

/* ---------- Registrar días pasados (hasta 2 días atrás) ---------- */
// Si el cron ya te castigó por ese día, se te devuelve la vida perdida
function refundMissedDamage(h, date) {
  if (!habitRequiredOn(h, date)) return;
  const p = state.player;
  p.hp = Math.min(MAX_HP, p.hp + DMG_MISSED_HABIT);
  toast(`+${DMG_MISSED_HABIT} HP recuperados: ese día sí cumpliste`, "info", ICONS.heart);
}

// Registra minutos en un día pasado (hábitos por tiempo)
function logTimePast(h, minutes, date) {
  const min = clamp(Math.round(Number(minutes)), 1, 24 * 60);
  const first = !(h.log && h.log[date]);
  const m = streakMult(h.streak);
  const coins = Math.round(habitPayout(h) * min / 60 * m);
  const xp = Math.max(1, Math.round(rewardFor(REWARD_HABIT, h.difficulty).xp * min / 60));
  h.log[date] = (h.log[date] || 0) + min;
  h.totalMinutes = (h.totalMinutes || 0) + min;
  if (first) {
    state.player.totalCompleted++;
    refundMissedDamage(h, date);
    if (h.flexible) { h.streak++; h.best = Math.max(h.best || 0, h.streak); }
  }
  recalcStreak(h);
  grant(xp, coins, `${fmtMin(min)} el ${fmtShortDate(date)}`);
  damageBosses(h.id, xp);
  checkAchievements();
  save();
  renderAll();
}

// Marca como completado un día pasado (hábitos al completar)
function completePast(h, date) {
  if (h.log && h.log[date]) return;
  const xp = rewardFor(REWARD_HABIT, h.difficulty).xp;
  h.log[date] = 1;
  state.player.totalCompleted++;
  refundMissedDamage(h, date);
  if (h.flexible) { h.streak++; h.best = Math.max(h.best || 0, h.streak); }
  recalcStreak(h);
  const m = streakMult(h.streak);
  grant(xp, Math.round(habitPayout(h) * m), `completado el ${fmtShortDate(date)}`);
  damageBosses(h.id, xp);
  checkAchievements();
  save();
  renderAll();
}

// Modal para registrar varios días pasados de esta semana que quedaron sin marcar (hábitos check)
function backfillForm(h) {
  const missed = missedRecentDays(h);
  if (!missed.length) return;
  const labels = { 1: "Ayer", 2: "Anteayer" };
  const dayLabel = d => {
    const diff = Math.round((parseDateStr(todayStr()) - parseDateStr(d)) / 86400000);
    const wd = parseDateStr(d).toLocaleDateString("es", { weekday: "short" }).replace(".", "");
    return labels[diff] || `${wd} ${fmtShortDate(d)}`;
  };
  openModal(`
    <div class="modal-inner">
      <div class="modal-head"><h3>Registrar días pasados</h3>
        <button class="icon-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <p class="confirm-text">Marca los días de esta semana en que hiciste <strong>${esc(h.title)}</strong> y olvidaste registrarlo. Recuperas la vida perdida y suma para tu meta semanal.</p>
      <div class="field" id="f-bfdays">
        <label>¿Qué días lo hiciste?</label>
        <div class="days-row wrap" id="bfDays">
          ${missed.map(d => `<button type="button" data-date="${d}" aria-pressed="false">${dayLabel(d)}</button>`).join("")}
        </div>
        <div class="err">Marca al menos un día.</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="btnBackfill">${ICONS.check}Registrar</button>
      </div>
    </div>`);
  $("#bfDays", modal).addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    b.classList.toggle("on");
    b.setAttribute("aria-pressed", b.classList.contains("on"));
  });
  $("#btnBackfill", modal).addEventListener("click", () => {
    const dates = $$("#bfDays button.on", modal).map(b => b.dataset.date);
    if (!dates.length) { $("#f-bfdays", modal).classList.add("has-err"); return; }
    modal.close();
    dates.sort().forEach(d => completePast(h, d));
  });
}

function undoTimeLog(id) {
  const h = state.habits.find(x => x.id === id);
  if (!h || !h.todayLogs?.length) return;
  const log = h.todayLogs.pop();
  h.todayMinutes = Math.max(0, h.todayMinutes - log.min);
  h.totalMinutes = Math.max(0, h.totalMinutes - log.min);
  if (h.todayMinutes > 0) h.log[todayStr()] = h.todayMinutes;
  else delete h.log[todayStr()];
  if (log.streakInc) h.streak = Math.max(0, h.streak - 1);
  if (h.todayMinutes === 0) state.player.totalCompleted = Math.max(0, state.player.totalCompleted - 1);
  ungrant(log.xp, log.coins);
  healBosses(h.id, log.xp);
  save();
  renderAll();
}

function timeLogForm(h) {
  if (!h) return;
  const rate = habitPayout(h);
  const today = todayStr();
  // Opciones de día: hoy y cada día anterior de esta semana (hasta el lunes)
  const wStart = weekStartStr(today);
  const dayOpts = [{ val: today, label: "Hoy" }];
  let d = addDays(today, -1), guard = 0;
  while (d >= wStart && guard++ < 8) {
    const wd = parseDateStr(d).toLocaleDateString("es", { weekday: "short" }).replace(".", "");
    const lbl = d === addDays(today, -1) ? "Ayer" : `${wd} ${parseDateStr(d).getDate()}`;
    dayOpts.push({ val: d, label: lbl });
    d = addDays(d, -1);
  }
  openModal(`
    <div class="modal-inner">
      <div class="modal-head"><h3>Registrar tiempo</h3>
        <button class="icon-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <p class="confirm-text"><strong>${esc(h.title)}</strong> · paga ${rate} monedas por hora${h.todayMinutes ? ` · hoy llevas ${fmtMin(h.todayMinutes)}` : ""}</p>
      <div class="field">
        <label>¿Qué día?</label>
        <div class="seg wrap" data-seg="qday">
          ${dayOpts.map((o, i) => `<button type="button" data-val="${o.val}" class="${i === 0 ? "on" : ""}">${o.label}</button>`).join("")}
        </div>
        <div class="hint" id="dayHint"></div>
      </div>
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
  const dayHint = $("#dayHint", modal);
  const updateHint = () => {
    const m = Math.round(Number(inp.value));
    hint.textContent = Number.isFinite(m) && m >= 1
      ? `${m} min te pagan ${Math.round(rate * m / 60)} monedas.` : "";
    const day = segValue(modal, "qday");
    dayHint.textContent = day !== today
      ? `Se registrará para el ${fmtShortDate(day)}${habitRequiredOn(h, day) && !(h.log && h.log[day]) ? " y recuperas la vida perdida ese día" : ""}.`
      : "";
  };
  updateHint();
  inp.addEventListener("input", updateHint);
  $(`.seg[data-seg="qday"]`, modal).addEventListener("click", updateHint);
  $(`.seg[data-seg="qmin"]`, modal).addEventListener("click", e => {
    const b = e.target.closest("button");
    if (b) { inp.value = b.dataset.val; updateHint(); }
  });
  $("#btnLog", modal).addEventListener("click", () => {
    const m = Math.round(Number(inp.value));
    if (!Number.isFinite(m) || m < 1) { $("#f-min", modal).classList.add("has-err"); inp.focus(); return; }
    const day = segValue(modal, "qday") || today;
    modal.close();
    if (day === today) logTime(h.id, m);
    else logTimePast(h, m, day);
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

/* ---------- Jefes ---------- */
// XP de botín al derrotar un jefe, proporcional a su tamaño
function bossXP(b) { return Math.round(b.maxHp * 0.25); }

function bossesFor(habitId) {
  return state.bosses.filter(b => !b.done && (!b.habitIds.length || b.habitIds.includes(habitId)));
}

// El esfuerzo (XP ganado) golpea a los jefes vinculados al hábito
function damageBosses(habitId, dmg) {
  if (dmg <= 0) return;
  for (const b of bossesFor(habitId)) {
    b.hp = Math.max(0, b.hp - dmg);
    if (b.hp === 0) defeatBoss(b);
    else toast(`${b.title}: −${dmg} de vida (queda ${b.hp}/${b.maxHp})`, "info", ICONS.sword);
  }
}

// Al deshacer una acción, los jefes aún vivos recuperan esa vida
function healBosses(habitId, amount) {
  if (amount <= 0) return;
  for (const b of state.bosses) {
    if (b.done || (b.habitIds.length && !b.habitIds.includes(habitId))) continue;
    b.hp = Math.min(b.maxHp, b.hp + amount);
  }
}

function defeatBoss(b) {
  b.done = true;
  b.defeatedAt = todayStr();
  grant(bossXP(b), b.loot || 0, `¡${b.title} derrotado!`);
  openModal(`
    <div class="modal-inner celebrate">
      <div class="big-ico" style="color:var(--gold)">${ICONS.skull}</div>
      <h3>¡Jefe derrotado!</h3>
      <p><strong>${esc(b.title)}</strong> cayó ante tu constancia.</p>
      <p class="gold-line">Botín: +${b.loot || 0} monedas · +${bossXP(b)} XP</p>
      <div class="modal-actions"><button class="btn btn-primary" data-close>¡A por el siguiente!</button></div>
    </div>`);
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
  checkAchievements();
  save();
  renderAll();
}

/* ---------- Render: Metas ---------- */
function bossCard(b) {
  const pct = clamp((b.hp / b.maxHp) * 100, 0, 100);
  const linked = b.habitIds.length
    ? b.habitIds.map(id => state.habits.find(h => h.id === id)?.title).filter(Boolean).join(", ")
    : "todos los hábitos";
  return `
  <div class="goal-card boss-card ${b.done ? "is-done" : ""}">
    <div class="goal-top">
      <div class="boss-ico ${b.done ? "beaten" : ""}">${b.done ? ICONS.trophy : ICONS.skull}</div>
      <div class="card-body">
        <div class="card-title">${esc(b.title)}</div>
        <div class="card-meta">
          <span class="payout">${ICONS.coin}botín: ${b.loot} + ${bossXP(b)} XP</span>
          <span>${ICONS.sword}${esc(linked)}</span>
        </div>
      </div>
      <button class="icon-btn" data-act="edit-boss" data-id="${b.id}" aria-label="Editar ${esc(b.title)}">${ICONS.pencil}</button>
    </div>
    ${b.done ? `<span class="goal-done-tag">${ICONS.trophy}Derrotado el ${fmtShortDate(b.defeatedAt)}</span>` : `
    <div class="goal-progress-row">
      <div class="goal-bar"><div class="goal-bar-fill boss-hp" style="width:${pct}%"></div></div>
      <span class="goal-pct boss-pct">${b.hp}/${b.maxHp}</span>
    </div>`}
  </div>`;
}

function renderMetas() {
  const v = $("#view-metas");
  const active = state.goals.filter(g => !g.done);
  const finished = state.goals.filter(g => g.done);
  const bossesAlive = state.bosses.filter(b => !b.done);
  const bossesDead = state.bosses.filter(b => b.done);

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
    <div class="subhead">
      <p class="section-label" style="margin:0">Jefes</p>
      <button class="btn btn-ghost btn-sm" data-act="new-boss">${ICONS.plus}Jefe</button>
    </div>
    ${state.bosses.length === 0 ? `
      <div class="empty small">${ICONS.skull}
        <p>Sin jefes que enfrentar</p>
        <small>Convierte un examen o desafío en un monstruo: tu esfuerzo (XP) le hace daño hasta derrotarlo.</small>
      </div>` : `
      <div class="card-list">${bossesAlive.map(bossCard).join("")}</div>
      ${bossesDead.length ? `<p class="section-label">Derrotados</p><div class="card-list">${bossesDead.map(bossCard).join("")}</div>` : ""}
    `}
    <div class="subhead" style="margin-top:22px">
      <p class="section-label" style="margin:0">Metas con hitos</p>
    </div>
    ${state.goals.length === 0 ? `
      <div class="empty small">${ICONS.target}
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
  checkAchievements();
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
  checkAchievements();
  save();
  renderAll();
}

/* ---------- Render: Perfil ---------- */
// Mapa de calor de cumplimiento: últimas 17 semanas, columnas = semanas, filas = L a D
function heatmapHTML() {
  const today = todayStr();
  const start = weekStartStr(addDays(today, -7 * 16));
  const dias = ["L", "M", "X", "J", "V", "S", "D"];
  let cells = "";
  for (let w = 0; w < 17; w++) {
    for (let r = 0; r < 7; r++) {
      const date = addDays(start, w * 7 + r);
      if (date > today) { cells += `<span class="hm-cell future"></span>`; continue; }
      const dow = parseDateStr(date).getDay();
      let scheduled = 0, done = 0;
      for (const h of state.habits) {
        if ((h.createdAt || "") > date) continue;
        if (!h.flexible && habitActiveOn(h, date) && h.days.includes(dow)) scheduled++;
        if (h.log && h.log[date]) done++;
      }
      let lv = 0;
      if (done > 0) {
        const ratio = done / Math.max(scheduled, done);
        lv = ratio >= 1 ? 4 : ratio > 0.66 ? 3 : ratio > 0.33 ? 2 : 1;
      }
      cells += `<span class="hm-cell lv${lv}" title="${fmtShortDate(date)}: ${done} de ${scheduled} hábitos"></span>`;
    }
  }
  return `
    <div class="chart-card">
      <h3>Mapa de constancia — últimas 17 semanas</h3>
      <div class="heatmap-row">
        <div class="hm-days">${dias.map(d => `<span>${d}</span>`).join("")}</div>
        <div class="heatmap">${cells}</div>
      </div>
      <div class="hm-legend"><span>Menos</span><span class="hm-cell lv0"></span><span class="hm-cell lv1"></span><span class="hm-cell lv2"></span><span class="hm-cell lv3"></span><span class="hm-cell lv4"></span><span>Más</span></div>
    </div>`;
}

function badgesHTML() {
  const earned = Object.keys(state.achievements).length;
  return `
    <p class="section-label">Logros · ${earned} de ${ACHIEVEMENTS.length}</p>
    <div class="badge-grid">
      ${ACHIEVEMENTS.map(a => {
        const got = state.achievements[a.id];
        return `
        <div class="badge ${got ? "earned" : ""}" ${got ? `title="Logrado el ${fmtShortDate(got)}"` : ""}>
          ${ICONS[a.icon] || ICONS.star}
          <span class="badge-title">${esc(a.title)}</span>
          <span class="badge-desc">${esc(a.desc)}</span>
        </div>`;
      }).join("")}
    </div>`;
}

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
    ${heatmapHTML()}
    ${badgesHTML()}
    ${state.habits.length ? `
    <p class="section-label">Récords por hábito</p>
    <div class="card-list" style="margin-bottom:18px">
      ${state.habits.map(h => {
        const isTime = h.mode === "tiempo";
        const fmtV = v => isTime ? fmtMin(v) : `${v} día${v === 1 ? "" : "s"}`;
        // mejor semana según el registro histórico
        const porSemana = {};
        for (const [date, val] of Object.entries(h.log || {})) {
          const w = weekStartStr(date);
          porSemana[w] = (porSemana[w] || 0) + val;
        }
        const mejorSemana = Math.max(0, ...Object.values(porSemana));
        const wNow = habitSumRange(h, weekStartStr(todayStr()), addDays(weekStartStr(todayStr()), 7));
        const total = isTime ? fmtMin(h.totalMinutes || 0) : `${Object.keys(h.log || {}).length} veces`;
        return `
        <div class="card record-card">
          <div class="card-body">
            <div class="card-title">${esc(h.title)}</div>
            <div class="card-meta">
              <span class="streak">${ICONS.flame}mejor racha: ${h.best || 0}</span>
              <span>esta semana: ${fmtV(wNow)}</span>
              <span>mejor semana: ${fmtV(mejorSemana)}</span>
              <span>total: ${total}</span>
            </div>
          </div>
        </div>`;
      }).join("")}
    </div>` : ""}
    <div class="profile-actions">
      <button class="btn btn-ghost" data-act="review">${ICONS.calendar}Revisión semanal</button>
      <button class="btn btn-ghost" data-act="rest">${ICONS.sparkles}${restActive(todayStr()) ? `Descansando hasta el ${fmtShortDate(state.rest.until)} — extender` : "Modo descanso (vacaciones)"}</button>
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

// Valor de objetivo para mostrar en el formulario: tiempo se edita en horas, check en días. 0 = vacío.
function goalVal(h, v) {
  if (!v) return "";
  return h.mode === "tiempo" ? Math.round((v / 60) * 10) / 10 : v;
}

function habitForm(habit) {
  const isNew = !habit;
  const h = habit || { title: "", notes: "", days: [1, 2, 3, 4, 5, 6, 0], difficulty: "normal", mode: "check", goalW: 0, goalWMin: 0, goalM: 0, goalMMin: 0, bonus: null, penalty: null };
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
        <div class="hint" id="daysHint">Si no lo completas un día programado, pierdes vida.</div>
      </div>
      <div class="field">
        <label>Exigencia diaria</label>
        ${segHTML("flex", [{ val: "strict", label: "Estricta" }, { val: "flex", label: "Flexible" }], h.flexible ? "flex" : "strict")}
        <div class="hint">Flexible: faltar un día no quita vida; solo mandan sus metas semanales/mensuales (ideal gimnasio: “3 veces por semana, el día que puedas”).</div>
      </div>
      <div class="goal-fields">
        <div class="field">
          <label for="inpStart">Comienza (opcional)</label>
          <input type="date" id="inpStart" value="${esc(h.startDate || "")}">
        </div>
        <div class="field" id="f-end">
          <label for="inpEnd">Termina (opcional)</label>
          <input type="date" id="inpEnd" value="${esc(h.endDate || "")}">
          <div class="err">Debe ser posterior al inicio.</div>
        </div>
      </div>
      <div class="hint" style="margin:-4px 0 12px">Para materias o cursadas: fuera de estas fechas el hábito duerme (no exige ni castiga). Vacío = siempre activo.</div>
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
      <p class="section-label" style="margin-top:18px">Objetivos y premio extra (opcional)</p>
      <div class="goal-fields">
        <div class="field">
          <label for="inpGoalW" id="lblGoalW">Días/semana para premio</label>
          <input type="number" id="inpGoalW" value="${goalVal(h, h.goalW)}" min="0" step="any" inputmode="decimal" placeholder="—">
        </div>
        <div class="field">
          <label for="inpGoalWMin" id="lblGoalWMin">Mínimo días/semana</label>
          <input type="number" id="inpGoalWMin" value="${goalVal(h, h.goalWMin)}" min="0" step="any" inputmode="decimal" placeholder="—">
        </div>
        <div class="field">
          <label for="inpGoalM" id="lblGoalM">Días/mes para premio</label>
          <input type="number" id="inpGoalM" value="${goalVal(h, h.goalM)}" min="0" step="any" inputmode="decimal" placeholder="—">
        </div>
        <div class="field">
          <label for="inpGoalMMin" id="lblGoalMMin">Mínimo días/mes</label>
          <input type="number" id="inpGoalMMin" value="${goalVal(h, h.goalMMin)}" min="0" step="any" inputmode="decimal" placeholder="—">
        </div>
      </div>
      <div class="hint" id="goalsHint" style="margin:-4px 0 12px">Vacío = sin objetivo. Si alcanzas la meta al cerrar la semana/mes, cobras el premio; si no llegas al mínimo, pagas la multa y pierdes vida (−4 HP semanal, −8 mensual).</div>
      <div class="goal-fields">
        <div class="field" id="f-bonus">
          <label for="inpBonus">Premio semanal (monedas)</label>
          <input type="number" id="inpBonus" value="${h.bonus ?? ""}" min="0" max="9999" inputmode="numeric" placeholder="${habitPayout(h) * 2} (auto)">
          <div class="err">Debe ser 0 o más.</div>
        </div>
        <div class="field" id="f-penalty">
          <label for="inpPenalty">Multa semanal (monedas)</label>
          <input type="number" id="inpPenalty" value="${h.penalty ?? ""}" min="0" max="9999" inputmode="numeric" placeholder="${habitPayout(h)} (auto)">
          <div class="err">Debe ser 0 o más.</div>
        </div>
      </div>
      <div class="hint" style="margin:-4px 0 12px">El premio y la multa mensuales valen 4× los semanales.</div>
      <div class="modal-actions">
        ${isNew ? "" : `<button class="btn btn-danger" id="btnDel">${ICONS.trash}</button>`}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="btnSave">Guardar</button>
      </div>
    </div>`);
  wireSeg(modal);
  // Las etiquetas de pago y objetivos cambian según el tipo elegido
  const updatePayoutLabel = () => {
    const time = segValue(modal, "mode") === "tiempo";
    const flex = segValue(modal, "flex") === "flex";
    $("#payoutLabel", modal).textContent = time ? "Monedas por hora" : "Pago en monedas al completar";
    $("#payoutHint", modal).textContent = time
      ? "Tarifa por hora: se paga proporcional (ej. 10/h → 30 min pagan 5)."
      : "Cuántas monedas te paga este hábito cada vez que lo completes.";
    $("#daysHint", modal).textContent = flex
      ? "Días en los que puede hacerse (faltar no quita vida)."
      : "Si no lo completas un día programado, pierdes vida.";
    const u = time ? "Horas" : "Días";
    $("#lblGoalW", modal).textContent = `${u}/semana para premio`;
    $("#lblGoalWMin", modal).textContent = `Mínimo ${u.toLowerCase()}/semana`;
    $("#lblGoalM", modal).textContent = `${u}/mes para premio`;
    $("#lblGoalMMin", modal).textContent = `Mínimo ${u.toLowerCase()}/mes`;
  };
  updatePayoutLabel();
  $(`.seg[data-seg="mode"]`, modal).addEventListener("click", updatePayoutLabel);
  $(`.seg[data-seg="flex"]`, modal).addEventListener("click", updatePayoutLabel);
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
    const mode = segValue(modal, "mode") || "check";
    // Objetivos: en modo tiempo se editan en horas y se guardan en minutos
    const readGoal = (sel) => {
      const raw = $(sel, modal).value.trim();
      if (!raw) return 0;
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return 0;
      return mode === "tiempo" ? Math.round(n * 60) : Math.round(n);
    };
    const readOpt = (sel, fld) => {
      const raw = $(sel, modal).value.trim();
      if (!raw) return null;
      const n = Math.round(Number(raw));
      if (!Number.isFinite(n) || n < 0) { $(fld, modal).classList.add("has-err"); return undefined; }
      return n;
    };
    const bonus = readOpt("#inpBonus", "#f-bonus");
    const penalty = readOpt("#inpPenalty", "#f-penalty");
    if (bonus === undefined || penalty === undefined) return;
    const startDate = $("#inpStart", modal).value || null;
    const endDate = $("#inpEnd", modal).value || null;
    if (startDate && endDate && endDate < startDate) { $("#f-end", modal).classList.add("has-err"); return; }
    const days = $$("#daysRow button.on", modal).map(b => Number(b.dataset.dow));
    const data = {
      title,
      notes: $("#inpNotes", modal).value.trim(),
      days: days.length ? days : [1, 2, 3, 4, 5, 6, 0],
      difficulty: segValue(modal, "diff") || "normal",
      mode,
      flexible: segValue(modal, "flex") === "flex",
      payout,
      startDate,
      endDate,
      goalW: readGoal("#inpGoalW"),
      goalWMin: readGoal("#inpGoalWMin"),
      goalM: readGoal("#inpGoalM"),
      goalMMin: readGoal("#inpGoalMMin"),
      bonus,
      penalty,
    };
    if (isNew) {
      state.habits.push({ id: uid(), ...data, streak: 0, best: 0, completedToday: false, todayMinutes: 0, todayLogs: [], totalMinutes: 0, log: {}, createdAt: todayStr() });
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

function bossForm(boss) {
  const isNew = !boss;
  const b = boss || { title: "", maxHp: 300, loot: 150, habitIds: [] };
  openModal(`
    <div class="modal-inner">
      <div class="modal-head"><h3>${isNew ? "Nuevo jefe" : "Editar jefe"}</h3>
        <button class="icon-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <div class="field" id="f-title">
        <label for="inpTitle">Nombre del jefe</label>
        <input type="text" id="inpTitle" value="${esc(b.title)}" placeholder="Ej: Final de Cálculo" maxlength="80" autocomplete="off">
        <div class="err">Ponle nombre a tu enemigo.</div>
      </div>
      <div class="goal-fields">
        <div class="field" id="f-bosshp">
          <label for="inpBossHp">Vida del jefe</label>
          <input type="number" id="inpBossHp" value="${b.maxHp}" min="10" max="99999" inputmode="numeric">
          <div class="err">Mínimo 10.</div>
        </div>
        <div class="field" id="f-loot">
          <label for="inpLoot">Botín (monedas)</label>
          <input type="number" id="inpLoot" value="${b.loot}" min="0" max="9999" inputmode="numeric">
          <div class="err">Debe ser 0 o más.</div>
        </div>
      </div>
      <div class="hint" style="margin:-4px 0 12px" id="bossHint"></div>
      <div class="field">
        <label>Hábitos que le hacen daño</label>
        <div class="habit-pick" id="habitPick">
          ${state.habits.map(h => `
            <button type="button" data-hid="${h.id}" class="${b.habitIds.includes(h.id) ? "on" : ""}" aria-pressed="${b.habitIds.includes(h.id)}">${esc(h.title)}</button>`).join("")}
        </div>
        <div class="hint">Sin selección = todos los hábitos le pegan. El daño es el XP que ganas.</div>
      </div>
      <div class="modal-actions">
        ${isNew ? "" : `<button class="btn btn-danger" id="btnDel">${ICONS.trash}</button>`}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="btnSave">Guardar</button>
      </div>
    </div>`);
  const hpInp = $("#inpBossHp", modal);
  const bossHint = $("#bossHint", modal);
  const updHint = () => {
    const hp = Math.round(Number(hpInp.value));
    if (!Number.isFinite(hp) || hp < 10) { bossHint.textContent = ""; return; }
    // referencia: 1 h de estudio normal ≈ 18 XP de daño
    bossHint.textContent = `Referencia: 1 h de un hábito normal pega ~18 de daño → este jefe cae con ~${Math.round(hp / 18)} h de esfuerzo. Al morir también suelta +${Math.round(hp * 0.25)} XP.`;
  };
  updHint();
  hpInp.addEventListener("input", updHint);
  $("#habitPick", modal).addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    btn.classList.toggle("on");
    btn.setAttribute("aria-pressed", btn.classList.contains("on"));
  });
  $("#btnSave", modal).addEventListener("click", () => {
    const title = $("#inpTitle", modal).value.trim();
    if (!title) { $("#f-title", modal).classList.add("has-err"); return; }
    const maxHp = Math.round(Number(hpInp.value));
    if (!Number.isFinite(maxHp) || maxHp < 10) { $("#f-bosshp", modal).classList.add("has-err"); return; }
    const loot = Math.round(Number($("#inpLoot", modal).value));
    if (!Number.isFinite(loot) || loot < 0) { $("#f-loot", modal).classList.add("has-err"); return; }
    const habitIds = $$("#habitPick button.on", modal).map(x => x.dataset.hid);
    if (isNew) {
      state.bosses.push({ id: uid(), title, maxHp, hp: maxHp, loot, habitIds, done: false, createdAt: todayStr(), defeatedAt: null });
      toast(`¡${title} te desafía! Derrótalo con constancia`, "info", ICONS.skull);
    } else {
      // conservar el daño ya hecho si cambia la vida total
      const dmgDone = boss.maxHp - boss.hp;
      Object.assign(boss, { title, maxHp, loot, habitIds });
      if (!boss.done) {
        boss.hp = Math.max(0, maxHp - dmgDone);
        if (boss.hp === 0) defeatBoss(boss);
      }
    }
    save();
    if (!modal.open || isNew) modal.close();
    else if (!$(".celebrate", modal)) modal.close(); // no cerrar la celebración de derrota
    renderAll();
  });
  if (!isNew) $("#btnDel", modal).addEventListener("click", () => {
    confirmDialog({
      title: "Eliminar jefe",
      text: `¿Retirar a “${boss.title}” del campo de batalla?`,
      onOk: () => {
        state.bosses = state.bosses.filter(x => x.id !== boss.id);
        save(); renderAll();
        toast("Jefe eliminado", "info", ICONS.trash);
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
    "backfill": () => backfillForm(state.habits.find(x => x.id === id)),
    "edit-habit": () => habitForm(state.habits.find(x => x.id === id)),
    "new-habit": () => habitForm(null),
    "new-boss": () => bossForm(null),
    "edit-boss": () => bossForm(state.bosses.find(x => x.id === id)),
    "review": () => weeklyReviewModal(),
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
    "rest": () => restForm(),
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
else maybeShowWeeklyReview();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
