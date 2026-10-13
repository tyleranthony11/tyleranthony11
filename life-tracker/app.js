/* Life Tracker — all data lives in this browser's localStorage. Use Settings → Export to back up. */
'use strict';

const KEY = 'lifeTracker.v1';
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Pre-gym', 'Dinner', 'Bedtime'];
const MEAL_INFO = { // slot -> [time, icon, timeline title]
  Breakfast: ['09:45', '🥤', 'Smoothie'], Lunch: ['13:30', '🍱', 'Lunch'], 'Pre-gym': ['17:00', '🍌', 'Pre-gym snack'],
  Dinner: ['20:15', '🍽️', 'Dinner'], Bedtime: ['23:00', '🍨', 'Bedtime snack'],
};
const STORES = ['Sobeys', 'Costco', 'Other'];
const STORE_LABEL = { Sobeys: 'Sobeys', Costco: 'Costco', Other: 'Pharmacy / other' };
const ROUTINE_CATS = {
  morning: { label: 'Shower & skin', icon: '🚿' },
  meds: { label: 'Hair & meds', icon: '💊' },
  cleaning: { label: 'Cleaning', icon: '🧽' },
  laundry: { label: 'Laundry', icon: '🧺' },
  other: { label: 'Other', icon: '📌' },
};
const SUPPLY_CATS = { food: 'Food', cleaning: 'Cleaning', laundry: 'Laundry', care: 'Skin, hair & meds' };
const WEEK_MODES = { all: 'Every week', off: 'Normal weeks', hockey: 'Hockey weeks' };
const EVENT_TYPES = {
  game: { label: 'Hockey game', icon: '🏒' },
  practice: { label: 'Hockey practice', icon: '🥅' },
  skate: { label: 'Skate / stick & puck', icon: '⛸️' },
  conditioning: { label: 'Hockey conditioning', icon: '⚡' },
  cardio: { label: 'Cardio', icon: '🚴' },
};
const TABS = [
  ['today', 'Today', '🏠'], ['food', 'Food', '🍽️'], ['gym', 'Gym', '🏋️'], ['cardio', 'Hockey', '🏒'],
  ['meals', 'Shop', '🛒'], ['routines', 'Routines', '🧼'], ['progress', 'Weight', '📈'],
];
const STREAK_DEFAULTS = { food: true, water: true, train: true, routines: true };
const BUILD = 'v5';
const DATA_VERSION = 3;

/* ---------- date helpers (local dates as YYYY-MM-DD) ---------- */
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => iso(new Date());
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
const diffDays = (a, b) => Math.round((parseISO(a) - parseISO(b)) / 86400000); // a - b
const dowOf = s => parseISO(s).getDay();
const fmtDate = (s, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => parseISO(s).toLocaleDateString(undefined, opts);
const startOfWeek = s => addDays(s, -((dowOf(s) + 6) % 7)); // Monday

/* ---------- misc helpers ---------- */
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const sum = arr => arr.reduce((a, b) => a + b, 0);
const $ = sel => document.querySelector(sel);

/* ---------- default data ---------- */
function defaults() {
  const ex = (name, sets, repMin, repMax, inc = 5) => ({ id: uid(), name, sets, repMin, repMax, inc });
  const r = (cat, time, name, opts = {}) => ({ id: uid(), cat, time, name, days: [], weeks: 'all', monthly: false, streak: true, ...opts });
  const sup = (name, cat, store) => ({ id: uid(), name, cat, store, status: 'ok', inCart: false });
  const f = (name, qty, cal, protein, carbs, fat) => ({ name, qty, meal: 'Breakfast', cal, protein, carbs, fat });
  const out = 'Eating out: Subway footlong, or sushi + an extra roll (aim 800+ kcal)';
  return {
    version: DATA_VERSION,
    settings: {
      unit: 'lb', calories: 3200, gameCalories: 3500, protein: 165, carbs: 430, fat: 90,
      waterTarget: 3500, bottleMl: 700, goalWeight: 170, weeklyGain: 0.75, theme: 'auto', wake: '09:00',
      streakCats: { ...STREAK_DEFAULTS },
    },
    hockey: { ranges: [{ start: '2026-11-07', end: '2026-12-05' }, { start: '2027-01-09', end: '2027-01-31' }], preseasonEnd: '2026-11-06' },
    nutrition: {},   // date -> {cal, protein, carbs, fat, src, items[]}
    water: {},       // date -> ml
    weights: [],     // [{date, value}]
    checks: {},      // date -> {itemKey: true}
    gym: {
      split: [
        { id: 'push', name: 'Push', exercises: [
          ex('DB flat bench press', 3, 6, 10), ex('Incline press machine (plates added)', 3, 8, 12, 10),
          ex('Seated DB shoulder press', 3, 8, 10), ex('Cable chest fly', 2, 10, 15), ex('Lateral raise', 3, 12, 20),
          ex('Tricep pushdown', 2, 10, 15), ex('Skull crusher', 2, 8, 12)] },
        { id: 'pull', name: 'Pull', exercises: [
          ex('Lat pulldown', 3, 8, 12), ex('Barbell row', 3, 6, 10), ex('Seated cable row', 3, 10, 12),
          ex('Face pull', 3, 12, 20), ex('Seated DB curl', 3, 8, 12), ex('Rope hammer curl', 2, 10, 15)] },
        { id: 'legs', name: 'Legs', exercises: [
          ex('Leg press', 3, 8, 12, 10), ex('Romanian deadlift', 3, 6, 10, 10), ex('Leg extension', 3, 10, 15),
          ex('Lying leg curl', 3, 10, 15), ex('Calf raise', 4, 10, 15, 10), ex('Hip adduction', 2, 12, 15), ex('Hip abduction', 2, 12, 15)] },
      ],
      schedule: { 1: 'push', 2: 'pull', 3: 'legs', 4: 'push', 5: 'pull' },
      logs: {}, // `${date}|${dayId}` -> {date, dayId, entries: {exId: [{w, r}]}}
    },
    events: [], // extra sessions: {id, date, time, type, title, mins, done}
    routines: [
      r('morning', '09:05', 'Shower: shampoo + conditioner, face cleanser, SA Lotion on body'),
      r('meds', '09:30', 'Felix combo gel: 2 pumps on a dry scalp, then SPF moisturizer on face'),
      r('cleaning', '10:00', 'Garbage + recycling out', { days: [3] }),
      r('cleaning', '21:00', 'Dishes done or dishwasher running'),
      r('cleaning', '21:00', 'Wipe counters + stovetop'),
      r('cleaning', '21:05', '5-minute reset: put things back'),
      // normal weeks: small focus each weekday, big reset Sunday
      r('cleaning', '21:10', 'Quick wipe: both bathrooms (sinks, mirrors, toilets)', { days: [1], weeks: 'off' }),
      r('cleaning', '21:10', 'Sweep + vacuum main floor', { days: [2], weeks: 'off' }),
      r('cleaning', '21:10', 'Kitchen: microwave, sink, appliance fronts', { days: [3], weeks: 'off' }),
      r('cleaning', '21:10', 'Bedroom tidy + vacuum stairs and upstairs', { days: [4], weeks: 'off' }),
      r('cleaning', '21:10', 'Office + laundry room tidy', { days: [5], weeks: 'off' }),
      r('cleaning', '13:00', 'Fridge clean-out, then check supplies', { days: [0], weeks: 'off' }),
      r('cleaning', '13:20', 'Full clean: both bathrooms', { days: [0], weeks: 'off' }),
      r('cleaning', '13:50', 'Sweep, vacuum + mop all floors', { days: [0], weeks: 'off' }),
      r('cleaning', '14:30', 'Dust all rooms', { days: [0], weeks: 'off' }),
      r('cleaning', '14:45', 'Empty all garbage + recycling', { days: [0], weeks: 'off' }),
      r('cleaning', '14:50', 'Monthly: oven, inside fridge, baseboards, vacuum filter', { days: [0], weeks: 'off', monthly: true }),
      // hockey weeks: the Sunday reset is spread over weekdays
      r('cleaning', '21:10', 'Full clean: both bathrooms', { days: [1], weeks: 'hockey' }),
      r('cleaning', '21:10', 'Sweep, vacuum + mop main floor', { days: [2], weeks: 'hockey' }),
      r('cleaning', '21:40', 'Empty all garbages', { days: [2], weeks: 'hockey' }),
      r('cleaning', '20:40', 'Kitchen + fridge clean-out, then check supplies', { days: [3], weeks: 'hockey' }),
      r('cleaning', '21:10', 'Upstairs: sweep, vacuum + mop (bedroom, stairs, bathroom floor)', { days: [4], weeks: 'hockey' }),
      r('cleaning', '21:10', 'Dust all rooms + office and laundry room tidy', { days: [5], weeks: 'hockey' }),
      r('cleaning', '21:40', 'Monthly: oven, inside fridge, baseboards, vacuum filter', { days: [5], weeks: 'hockey', monthly: true }),
      // laundry: one load an evening
      r('laundry', '21:00', 'Whites: wash, dry, fold', { days: [1] }),
      r('laundry', '21:00', 'Darks (tees + underwear): wash, dry, fold', { days: [2] }),
      r('laundry', '20:35', 'Delicates (Lulu, hoodies, pants, linen): wash + hang dry', { days: [3] }),
      r('laundry', '21:00', 'Towels: wash, dry, fold', { days: [4], weeks: 'off' }),
      r('laundry', '21:00', 'Towels: wash, dry, fold', { days: [5], weeks: 'hockey' }),
      r('laundry', '13:00', 'Bedsheets: wash, dry, back on the bed', { days: [0], weeks: 'off' }),
      r('laundry', '21:00', 'Bedsheets: wash, dry, back on the bed', { days: [4], weeks: 'hockey' }),
      r('morning', '23:30', 'Night skin: cleanser + moisturizer'),
    ],
    supplies: [
      ...['Kirkland three berry blend', 'ON Gold Standard whey', 'Peanut butter', 'Chicken breast', 'Ground beef', 'Eggs', 'Rice', 'Bagels', 'Granola'].map(n => sup(n, 'food', 'Costco')),
      ...['Bananas', 'Milk', 'Oikos Greek yogurt', 'Bread', 'Pasta + sauce', 'Potatoes', 'Vegetables'].map(n => sup(n, 'food', 'Sobeys')),
      sup('PVL creatine', 'food', 'Other'),
      ...['Paper towels', 'Toilet paper', 'Dishwasher pods', 'Garbage bags', 'Disinfecting wipes'].map(n => sup(n, 'cleaning', 'Costco')),
      ...['Dish soap', 'All-purpose spray', 'Glass cleaner', 'Bathroom + shower cleaner', 'Toilet bowl cleaner', 'Sponges + scrub brushes', 'Floor cleaner (mop)', 'Mop head', 'Vacuum bags / filter'].map(n => sup(n, 'cleaning', 'Sobeys')),
      sup('Laundry detergent', 'laundry', 'Costco'), sup('Dryer sheets', 'laundry', 'Sobeys'), sup('Stain remover', 'laundry', 'Sobeys'),
      ...['CeraVe cleanser', 'CeraVe moisturizer', 'CeraVe AM SPF moisturizer', 'CeraVe SA Lotion', 'Native shampoo', 'Native conditioner', 'Felix combo gel (refill)'].map(n => sup(n, 'care', 'Other')),
    ],
    groceries: { extras: [], last: { Sobeys: '', Costco: '', Other: '' }, costcoAnchor: '2026-10-12' },
    favorites: [{ id: uid(), name: 'My smoothie', items: [
      f('Kirkland three berry blend', '½ cup', 45, 0, 11, 0), f('Banana', '1 medium', 105, 1, 27, 0),
      f('ON Gold Standard whey (Extreme Milk Chocolate)', '1 scoop', 120, 24, 4, 2), f('Kraft smooth peanut butter', '2 tbsp', 180, 7, 7, 15),
      f('PVL creatine', '5 g', 0, 0, 0, 0), f('Central Dairies low-fat milk', '½ cup', 55, 4, 6, 1), f('Oikos Greek yogurt', '1 container', 100, 15, 7, 0)] }],
    meals: {
      plan: {
        1: ['My smoothie', out, 'Bagel + PB', 'Ground beef pasta + garlic bread', 'PB toast ×2 + big glass of milk'],
        2: ['My smoothie', out, 'Greek yogurt + granola + banana', 'Chicken, rice & veg', 'Greek yogurt + granola + PB'],
        3: ['My smoothie', out, 'Bagel + PB', 'Steak or salmon, potatoes & veg', 'PB toast ×2 + big glass of milk'],
        4: ['My smoothie', out, 'Greek yogurt + granola + banana', 'Turkey chili + rice', 'Greek yogurt + granola + PB'],
        5: ['My smoothie', out, 'Bagel + PB', 'Homemade burgers + fries', 'PB toast ×2 + big glass of milk'],
        6: ['My smoothie', 'Leftovers or a sandwich + fruit', 'Bagel + PB', 'Chicken pasta', 'Greek yogurt + granola + PB'],
        0: ['My smoothie', 'Leftovers or a sandwich + fruit', 'Bagel + PB', 'Roast chicken, potatoes & veg (+ meal prep)', 'PB toast ×2 + big glass of milk'],
      },
      kcal: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].flatMap(d => [[`${d}|Breakfast`, 605], [`${d}|Lunch`, 800], [`${d}|Pre-gym`, 350], [`${d}|Dinner`, 900], [`${d}|Bedtime`, 550]])),
    },
    created: todayISO(),
  };
}

function migrate(s) {
  const d = defaults();
  if (!s.version || s.version < 2) {
    // v2 rebuilds the plan around the real routine; logged food, water, weights and lifts are kept
    const keep = { unit: (s.settings && s.settings.unit) || 'lb', theme: (s.settings && s.settings.theme) || 'auto' };
    s.settings = { ...d.settings, ...keep };
    s.gym = { ...d.gym, logs: (s.gym && s.gym.logs) || {} };
    s.events = (s.events || []).filter(e => !e.block);
    for (const k of ['hockey', 'routines', 'supplies', 'groceries', 'favorites', 'meals', 'checks']) s[k] = d[k];
    delete s.tasks;
    s.created = d.created; s.version = 2;
  }
  if (s.version < 3) {
    // prescription is one topical gel (finasteride 0.25% + minoxidil 5%), 2 pumps once a day
    s.routines = (s.routines || []).filter(r => r.name !== 'Finasteride' && r.name !== 'Minoxidil (2nd dose)');
    s.routines.forEach(r => { if (/^Minoxidil on a dry scalp/.test(r.name)) r.name = 'Felix combo gel: 2 pumps on a dry scalp, then SPF moisturizer on face'; });
    s.supplies = (s.supplies || []).filter(x => x.name !== 'Finasteride refill');
    s.supplies.forEach(x => { if (x.name === 'Minoxidil') x.name = 'Felix combo gel (refill)'; });
    s.supplies = s.supplies.filter((x, i, all) => all.findIndex(y => y.name === x.name) === i);
    s.version = 3;
  }
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.settings = { ...d.settings, ...s.settings };
  s.settings.streakCats = { ...STREAK_DEFAULTS, ...(s.settings.streakCats || {}) };
  s.gym = { ...d.gym, ...s.gym };
  s.groceries = { ...d.groceries, ...s.groceries };
  s.groceries.last = { ...d.groceries.last, ...(s.groceries.last || {}) };
  s.hockey = { ...d.hockey, ...s.hockey };
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw); const old = (parsed.version || 1) < DATA_VERSION; const s = migrate(parsed);
      if (old) try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage blocked */ }
      return s;
    }
  } catch (e) { /* fall through */ }
  return defaults();
}
function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } }
function save() { saveLocal(); scheduleCloud(); }

/* ---------- cloud sync: when opened as a claude.ai Artifact, data is kept in your private per-user store ---------- */
const cloud = { col: null, status: 'local', saved: {}, timer: null, writing: false, pending: false, dirty: false };
function sections(s) {
  const out = { meta: { v: { version: s.version, created: s.created } }, gym: { v: { split: s.gym.split, schedule: s.gym.schedule } } };
  for (const k of Object.keys(s)) if (!['version', 'created', 'gym', 'checks'].includes(k)) out[k] = { v: s[k] };
  for (const [k, l] of Object.entries(s.gym.logs)) {
    const id = 'gymlogs-' + l.date.slice(0, 7);
    (out[id] = out[id] || { v: {} }).v[k] = l;
  }
  for (const [d, c] of Object.entries(s.checks || {})) {
    const id = 'checks-' + d.slice(0, 7);
    (out[id] = out[id] || { v: {} }).v[d] = c;
  }
  return out;
}
function fromSections(docs) {
  const s = { gym: { logs: {} }, checks: {} };
  for (const [id, v] of Object.entries(docs)) {
    if (id.startsWith('gymlogs-')) Object.assign(s.gym.logs, v);
    else if (id.startsWith('checks-')) Object.assign(s.checks, v);
    else if (id === 'gym') Object.assign(s.gym, v);
    else if (id === 'meta') Object.assign(s, v);
    else s[id] = v;
  }
  return migrate(s);
}
const SYNC_LABEL = { local: 'Saved on this device', saving: 'Saving…', synced: 'Synced', error: 'Not synced — retrying on next change', full: 'Cloud storage full' };
function setSync(st) { cloud.status = st; const el = $('#sync'); if (el) { el.title = SYNC_LABEL[st]; el.className = 'sync-dot ' + st; } if (st === 'error' || st === 'full') toast(SYNC_LABEL[st]); }
function scheduleCloud() { if (!cloud.col) return; cloud.dirty = true; clearTimeout(cloud.timer); cloud.timer = setTimeout(cloudFlush, 800); }
async function cloudFlush() {
  if (!cloud.col) return;
  if (cloud.writing) { cloud.pending = true; return; }
  cloud.writing = true; cloud.pending = false; setSync('saving');
  try {
    const secs = sections(S);
    for (const [id, body] of Object.entries(secs)) {
      const json = JSON.stringify(body);
      if (cloud.saved[id] === json) continue;
      await cloud.col.doc(id).set(body); cloud.saved[id] = json;
    }
    for (const id of Object.keys(cloud.saved)) if (!secs[id]) { await cloud.col.doc(id).delete(); delete cloud.saved[id]; }
    setSync('synced');
  } catch (e) { setSync(e && e.code === 'quota_exceeded' ? 'full' : 'error'); }
  cloud.writing = false;
  if (cloud.pending) cloudFlush(); else cloud.dirty = false;
}
async function cloudPull(first) {
  if (cloud.dirty || cloud.writing) return;
  const snap = await cloud.col.limit(1000).get();
  if (snap.empty) { if (first) await cloudFlush(); return; }
  const docs = {}; cloud.saved = {};
  for (const d of snap.docs) { const body = d.data(); docs[d.id] = body.v; cloud.saved[d.id] = JSON.stringify(body); }
  const old = !docs.meta || (docs.meta.version || 1) < DATA_VERSION;
  S = fromSections(docs); saveLocal(); render(); setSync('synced');
  if (old) scheduleCloud(); // write the upgraded plan back to the cloud
}
async function cloudInit() {
  if (!window.claude || !window.claude.use) return;
  try {
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    const id = db && user ? await user.id() : null;
    if (!id) return;
    cloud.col = db.collection('data/users/' + id); // private to you, even if the page is shared
    await cloudPull(true);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') cloudPull(false).catch(() => {}); });
  } catch (e) { setSync('error'); }
}
function prefGet(k, d) { try { return localStorage.getItem('lifeTracker.ui.' + k) ?? d; } catch (e) { return d; } }
function prefSet(k, v) { try { localStorage.setItem('lifeTracker.ui.' + k, v); } catch (e) { /* ignore */ } }

let S = load();
const ui = { tab: prefGet('tab', 'today'), date: todayISO(), gymDay: null, editRoutine: false, chartDays: 90,
  shopTab: 'lists', supCat: 'all', rtCat: 'morning', outText: '', outBusy: false,
  ai: { available: !!(window.claude && window.claude.use), images: false, text: '', photo: null, busy: false, pending: null, note: '', error: '', meal: '' } };

/* ---------- domain logic ---------- */
const U = () => S.settings.unit;
const nut = d => S.nutrition[d] || { cal: 0, protein: 0, carbs: 0, fat: 0 };

/* ---------- schedule: hockey weeks, routines, cardio, groceries ---------- */
function isHockeyDay(d) {
  const w = dowOf(d);
  return (w === 0 || w === 6) && S.hockey.ranges.some(r => r.start && r.end && d >= r.start && d <= r.end);
}
// A week (Mon–Sun) is a hockey week when its weekend has games
function isHockeyWeek(d) { const mon = startOfWeek(d); return isHockeyDay(addDays(mon, 5)) || isHockeyDay(addDays(mon, 6)); }
const calTarget = d => (isHockeyDay(d) ? S.settings.gameCalories : S.settings.calories);
function costcoWeek(d) {
  const w = Math.round(diffDays(startOfWeek(d), startOfWeek(S.groceries.costcoAnchor)) / 7);
  return ((w % 2) + 2) % 2 === 0;
}
function routineApplies(r, d) {
  if (r.days && r.days.length && !r.days.includes(dowOf(d))) return false;
  const hw = isHockeyWeek(d);
  if ((r.weeks === 'off' && hw) || (r.weeks === 'hockey' && !hw)) return false;
  if (r.monthly && parseISO(d).getDate() > 7) return false;
  return true;
}
function cardioFor(d) {
  if (d < S.created || isHockeyDay(d)) return null;
  const dw = dowOf(d), pre = d <= S.hockey.preseasonEnd, wk = Math.max(0, Math.floor(diffDays(d, S.created) / 7));
  if (dw === 2) { const n = Math.min(6 + wk, 12); return { time: '19:50', title: 'Bike intervals', sub: `Right after lifting: ${n} × 30 s hard / 90 s easy (about ${n * 2 + 4} min)` }; }
  if (dw === 5 && pre) return { time: '19:50', title: 'Easy cardio', sub: `${Math.min(20 + wk * 2, 30)} min at a pace where you can still talk` };
  if (dw === 6 && !pre && !isHockeyWeek(d)) return { time: '12:00', title: 'Easy cardio', sub: '25 min bike, jog or skate (no games this weekend)' };
  return null;
}
// Sobeys weekly, Costco every other week; both move to weeknights in hockey weeks
function tripsOn(d) {
  const dw = dowOf(d), hw = isHockeyWeek(d), out = [];
  if (hw ? dw === 3 : dw === 0) out.push({ store: 'Sobeys', time: hw ? '21:00' : '15:00' });
  if (costcoWeek(d) && (hw ? dw === 4 : dw === 6)) out.push({ store: 'Costco', time: hw ? '20:45' : '12:00' });
  return out;
}
function nextTripDate(store, from) {
  for (let i = 0; i < 21; i++) { const d = addDays(from, i); if (tripsOn(d).some(t => t.store === store)) return d; }
  return null;
}
const liftedOn = d => Object.values(S.gym.logs).some(l => l.date === d && Object.values(l.entries).some(sets => sets.some(x => num(x.r) > 0)));
const isDone = (d, k) => !!(S.checks[d] && S.checks[d][k]);
const mealPlanFor = (d, slot) => (S.meals.plan[dowOf(d)] || [])[MEAL_SLOTS.indexOf(slot)] || '';
const bottles = ml => round(ml / (S.settings.bottleMl || 700), 1);
const fmtTime = t => { const [h, m] = String(t || '00:00').split(':').map(Number); return `${((h + 11) % 12) + 1}:${pad(m || 0)} ${h < 12 ? 'am' : 'pm'}`; };

function dayPlan(d) {
  const dw = dowOf(d), hd = isHockeyDay(d), rows = [];
  rows.push({ key: 'wake', time: S.settings.wake || '09:00', icon: '⏰', title: 'Wake up', kind: 'info' });
  if (dw >= 1 && dw <= 5) rows.push({ key: 'work', time: '10:30', icon: '💼', title: 'Work', sub: '10:30 am – 6:30 pm', kind: 'info' });
  for (const r of S.routines) {
    if (routineApplies(r, d)) rows.push({ key: r.id, time: r.time, icon: (ROUTINE_CATS[r.cat] || ROUTINE_CATS.other).icon, title: r.name, cat: r.cat, kind: 'check', done: isDone(d, r.id), streak: r.streak !== false });
  }
  const items = (S.nutrition[d] && S.nutrition[d].items) || [];
  for (const slot of MEAL_SLOTS) {
    const [time, icon, title] = MEAL_INFO[slot];
    const logged = items.filter(i => i.meal === slot);
    rows.push({ key: 'meal-' + slot, time, icon, title, slot, kind: 'meal', done: logged.length > 0,
      sub: logged.length ? `${sum(logged.map(i => num(i.cal)))} kcal logged` : mealPlanFor(d, slot) });
  }
  if (hd) rows.push({ key: 'hockey', time: '10:00', icon: '🏒', title: 'Hockey', sub: `Game day: eat big (${calTarget(d).toLocaleString()} kcal) and drink extra water`, kind: 'check', cat: 'train', done: isDone(d, 'hockey'), streak: true });
  const gd = hd ? null : gymDayFor(d);
  if (gd) {
    const day = splitById(gd);
    rows.push({ key: 'gym', time: '18:45', icon: '🏋️', title: `${day ? day.name : 'Workout'} day`, sub: day ? day.exercises.map(e => e.name).slice(0, 3).join(', ') + '…' : '', kind: 'gym', cat: 'train', dayId: gd, done: liftedOn(d), streak: true });
  }
  const c = cardioFor(d);
  if (c) rows.push({ key: 'cardio', time: c.time, icon: '🚴', title: c.title, sub: c.sub, kind: 'check', cat: 'train', done: isDone(d, 'cardio'), streak: true });
  for (const t of tripsOn(d)) {
    rows.push({ key: 'shop-' + t.store, time: t.time, icon: '🛒', title: `${t.store} run`, kind: 'shop', store: t.store, done: S.groceries.last[t.store] === d || isDone(d, 'shop-' + t.store), streak: false });
  }
  return rows.sort((a, b) => a.time.localeCompare(b.time));
}

// Gym: sessions for an exercise before a given date, newest first.
function exerciseHistory(exId, beforeDate) {
  return Object.values(S.gym.logs)
    .filter(l => l.date < beforeDate && l.entries[exId] && l.entries[exId].some(s => num(s.r) > 0))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(l => ({ date: l.date, sets: l.entries[exId].filter(s => num(s.r) > 0) }));
}
const e1rm = (w, r) => w * (1 + r / 30); // Epley
function bestE1rm(sets) { return Math.max(0, ...sets.map(s => e1rm(num(s.w), num(s.r)))); }
function overloadSuggestion(ex, date) {
  const hist = exerciseHistory(ex.id, date);
  if (!hist.length) return { kind: 'new', text: `First session: pick a weight you could do for ~${ex.repMax + 2} reps, stop at ${ex.repMax}.` };
  const sets = hist[0].sets;
  const topW = Math.max(...sets.map(s => num(s.w)));
  const working = sets.filter(s => num(s.w) === topW);
  const hitTop = working.length >= ex.sets && working.every(s => num(s.r) >= ex.repMax);
  if (hitTop) {
    if (!ex.inc) return { kind: 'up', w: topW, text: `⬆ Top of range hit on every set — add a rep, a set, or make it harder.` };
    return { kind: 'up', w: topW + ex.inc, r: ex.repMin, text: `⬆ Add weight: ${topW + ex.inc} ${U()} × ${ex.repMin}+ (hit ${ex.repMax} on all sets)` };
  }
  const missed = working.some(s => num(s.r) < ex.repMin);
  if (missed && hist[1]) {
    const prev = hist[1].sets; const prevTop = Math.max(...prev.map(s => num(s.w)));
    const prevMissed = prevTop === topW && prev.filter(s => num(s.w) === prevTop).some(s => num(s.r) < ex.repMin);
    if (prevMissed && topW > 0) {
      const step = ex.inc || 5; const dl = Math.round((topW * 0.9) / step) * step;
      return { kind: 'deload', w: dl, text: `↘ Stalled 2 sessions — deload to ${dl} ${U()}, build back up.` };
    }
  }
  const total = sum(working.map(s => num(s.r)));
  return { kind: 'same', w: topW, text: `→ Stay at ${topW} ${U()}, beat ${total} total reps (aim ${ex.repMax} on each set).` };
}
function gymDayFor(date) { return S.gym.schedule[dowOf(date)] || null; }
const splitById = id => S.gym.split.find(d => d.id === id);

// Groceries: what's on a store's list = supplies marked low + one-off extras
function groceryList(store) {
  return [
    ...S.supplies.filter(s => s.store === store && s.status === 'low').map(s => ({ ...s, kind: 'supply', checked: !!s.inCart })),
    ...S.groceries.extras.filter(x => x.store === store).map(x => ({ ...x, kind: 'extra' })),
  ];
}

// Weight
function sortedWeights() { return [...S.weights].sort((a, b) => a.date.localeCompare(b.date)); }
function rollingAvg(ws, date, days = 7) {
  const win = ws.filter(w => w.date <= date && diffDays(date, w.date) < days);
  return win.length ? sum(win.map(w => w.value)) / win.length : null;
}
function weeklyRate(ws, endDate, days = 21) {
  const pts = ws.filter(w => w.date <= endDate && diffDays(endDate, w.date) < days);
  if (pts.length < 3) return null;
  const xs = pts.map(p => diffDays(p.date, pts[0].date)); const ys = pts.map(p => p.value);
  const mx = sum(xs) / xs.length, my = sum(ys) / ys.length;
  const den = sum(xs.map(x => (x - mx) ** 2)); if (!den) return null;
  return (sum(xs.map((x, i) => (x - mx) * (ys[i] - my))) / den) * 7;
}

/* ---------- rendering ---------- */
/* ---------- daily progress & streak ---------- */
const DAY_BONUS = 20;
function dayInfo(d) {
  const plan = dayPlan(d), s = S.settings, cats = { ...STREAK_DEFAULTS, ...s.streakCats };
  const n = nut(d), ct = calTarget(d), water = S.water[d] || 0;
  const train = plan.filter(r => r.cat === 'train');
  const rt = plan.filter(r => r.kind === 'check' && r.cat !== 'train' && r.streak);
  const trainDone = train.filter(r => r.done).length, rtDone = rt.filter(r => r.done).length;
  const groups = [
    { k: 'food', icon: '🍽️', label: 'Food', done: n.cal >= ct * 0.9 && n.protein >= s.protein * 0.9, text: `${round(n.cal, 0).toLocaleString()} / ${ct.toLocaleString()} kcal · ${round(n.protein, 0)} / ${s.protein} g protein`, pct: Math.min(n.cal / ct, n.protein / s.protein), go: 'food' },
    { k: 'water', icon: '💧', label: 'Water', done: water >= s.waterTarget, text: `${bottles(water)} / ${bottles(s.waterTarget)} shakers`, pct: water / s.waterTarget },
    { k: 'train', icon: '🏋️', label: 'Training', done: trainDone >= train.length, text: train.length ? `${trainDone} / ${train.length} done` : 'Rest day', pct: train.length ? trainDone / train.length : 1, rest: !train.length },
    { k: 'routines', icon: '✅', label: 'Routines', done: rtDone >= rt.length, text: `${rtDone} / ${rt.length} done`, pct: rt.length ? rtDone / rt.length : 1 },
  ];
  groups.forEach(g => { g.required = !!cats[g.k]; g.pct = Math.max(0, Math.min(1, g.pct || 0)); });
  const req = groups.filter(g => g.required);
  const complete = req.length > 0 && req.every(g => g.done);
  const xp = plan.filter(r => r.done && r.kind !== 'info').length * 5 + groups.filter(g => g.done && !g.rest).length * 10 + (complete ? DAY_BONUS : 0);
  return { plan, groups, complete, xp, doneCount: req.filter(g => g.done).length, reqCount: req.length };
}
function streakStats() {
  const today = todayISO(); const start = S.created && S.created < today ? S.created : today;
  const memo = {}; const info = d => memo[d] || (memo[d] = dayInfo(d));
  let streak = info(today).complete ? 1 : 0; let d = addDays(today, -1);
  while (d >= start && info(d).complete) { streak++; d = addDays(d, -1); }
  let best = 0, run = 0, total = 0;
  for (let x = start; x <= today; x = addDays(x, 1)) { const i = info(x); total += i.xp; run = i.complete ? run + 1 : 0; best = Math.max(best, run); }
  return { streak, best: Math.max(best, streak), totalXp: total, todayDone: info(today).complete, info };
}
function weekStrip(st) {
  const today = todayISO(); const mon = startOfWeek(today);
  return `<div class="week">${Array.from({ length: 7 }, (_, i) => {
    const d = addDays(mon, i); const c = d <= today && d >= S.created && st.info(d).complete;
    const cls = c ? 'on' : d === today ? 'today' : d > today ? 'future' : 'miss';
    return `<div class="wd ${cls}"><span>${DOW[dowOf(d)][0]}</span><i>${c ? '✓' : ''}</i></div>`;
  }).join('')}</div>`;
}
function progressTile(g, d) {
  const water = g.k === 'water' ? `<div class="row tile-act"><button class="btn primary sm" data-act="water" data-n="${S.settings.bottleMl}">+1 shaker</button><button class="btn ghost sm" data-act="water" data-n="-${S.settings.bottleMl}" aria-label="Remove a shaker">−</button></div>` : '';
  const go = g.go && !g.done ? `<button class="btn sm tile-act" data-act="go" data-go="${g.go}">Log</button>` : '';
  return `<div class="ptile ${g.done ? 'done' : ''}">
    <div class="ptile-head"><span class="ptile-icon">${g.icon}</span><b>${g.label}</b>${g.done ? '<span class="tl-ok">✓</span>' : g.required ? '' : '<span class="pill">Not counted</span>'}</div>
    <div class="ptile-text">${esc(g.text)}</div>
    ${g.rest ? '' : `<div class="qbar"><span style="width:${g.pct * 100}%"></span></div>`}
    ${water}${go}</div>`;
}
function timelineRow(r, isToday, nowT) {
  const late = isToday && !r.done && r.kind !== 'info' && r.time < nowT;
  const sub = r.kind === 'shop' && !r.done ? `${groceryList(r.store).length} on the list` : r.sub;
  const body = `<div class="tl-time">${fmtTime(r.time)}</div><div class="tl-icon">${r.icon}</div>
    <div class="tl-body"><div class="tl-title">${esc(r.title)}</div>${sub ? `<div class="tl-sub">${esc(sub)}</div>` : ''}</div>`;
  const cls = `tl-row ${r.kind} ${r.done ? 'done' : ''} ${late ? 'late' : ''}`;
  if (r.kind === 'check') {
    return `<label class="${cls}">${body}<div class="tl-ctl"><input type="checkbox" class="tl-check" data-act="chk" data-key="${r.key}" ${r.done ? 'checked' : ''} aria-label="Done: ${esc(r.title)}"></div></label>`;
  }
  let ctl = '';
  if (r.done && r.kind !== 'info') ctl = '<span class="tl-ok">✓</span>';
  else if (r.kind === 'meal') {
    const fav = r.slot === 'Breakfast' && S.favorites[0];
    ctl = fav ? `<button class="btn primary sm" data-act="fav" data-id="${fav.id}" data-meal="Breakfast">Log</button>` : `<button class="btn sm" data-act="logMeal" data-meal="${r.slot}">Log</button>`;
  } else if (r.kind === 'gym') ctl = `<button class="btn primary sm" data-act="go" data-go="gym" data-day="${r.dayId}">Start</button>`;
  else if (r.kind === 'shop') ctl = '<button class="btn sm" data-act="go" data-go="meals">List</button>';
  return `<div class="${cls}">${body}<div class="tl-ctl">${ctl}</div></div>`;
}
function timeline(d, plan) {
  const isToday = d === todayISO(); const now = new Date(); const nowT = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const parts = [['Morning', '00:00'], ['Afternoon', '12:00'], ['Evening', '17:00'], ['Night', '21:30']];
  let html = ''; let nowShown = !isToday;
  parts.forEach(([label, from], i) => {
    const to = parts[i + 1] ? parts[i + 1][1] : '99:99';
    const rows = plan.filter(r => r.time >= from && r.time < to);
    if (!rows.length) return;
    html += `<h3 class="tl-part">${label}</h3>`;
    for (const r of rows) {
      if (!nowShown && r.time > nowT) { html += `<div class="tl-now"><span>Now · ${fmtTime(nowT)}</span></div>`; nowShown = true; }
      html += timelineRow(r, isToday, nowT);
    }
  });
  return html;
}
function celebrate(n) {
  const el = document.createElement('div'); el.className = 'celebrate'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Day complete');
  el.innerHTML = `<div class="cel-inner"><div class="cel-flame">🔥</div><div class="cel-num">${n}</div>
    <div class="cel-label">day streak!</div><p>You finished today's plan. Come back tomorrow to keep it going.</p>
    ${weekStrip(streakStats())}<button class="btn primary big-btn" id="celClose">Continue</button></div>`;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.querySelector('#celClose').addEventListener('click', close);
  el.addEventListener('click', e => { if (e.target === el) close(); });
}

function render() {
  document.documentElement.dataset.theme = S.settings.theme === 'auto' ? '' : S.settings.theme;
  if (S.settings.theme === 'auto') delete document.documentElement.dataset.theme;
  const isToday = ui.date === todayISO();
  const st = ui.stats = streakStats();
  const todayXp = st.info(todayISO()).xp;
  $('#app').innerHTML = `
    <nav class="bnav" aria-label="Sections">
      <div class="side-brand">life<span>tracker</span></div>
      ${TABS.map(([k, l, ic]) => `<button data-act="tab" data-tab="${k}" class="${ui.tab === k ? 'on' : ''}" aria-label="${l}"><span class="ic">${ic}</span><span class="tl">${l}</span></button>`).join('')}
      <button data-act="tab" data-tab="settings" class="side-only ${ui.tab === 'settings' ? 'on' : ''}"><span class="ic">⚙️</span><span class="tl">Settings</span></button>
    </nav>
    <header class="top">
      <div class="top-row">
        <div class="stats">
          <button class="chip flame ${st.todayDone ? 'lit' : ''}" data-act="tab" data-tab="today" title="${st.todayDone ? 'Streak extended today' : 'Finish today\'s quests to extend your streak'}">🔥 <b>${st.streak}</b></button>
          <span class="chip xp" title="XP earned today">⚡ <b>${todayXp}</b></span>
        </div>
        <div class="datenav">
          <button class="icon-btn" data-act="day" data-n="-1" aria-label="Previous day">‹</button>
          <button class="label" data-act="day" data-n="0" title="Jump to today">${isToday ? 'Today' : fmtDate(ui.date, { weekday: 'short', month: 'short', day: 'numeric' })}</button>
          <button class="icon-btn" data-act="day" data-n="1" aria-label="Next day">›</button>
        </div>
        <button class="icon-btn gear ${ui.tab === 'settings' ? 'on' : ''}" data-act="tab" data-tab="settings" aria-label="Settings">⚙️<span id="sync" class="sync-dot ${cloud.status}" title="${SYNC_LABEL[cloud.status]}"></span></button>
      </div>
    </header>
    <main>${VIEWS[ui.tab]()}</main>`;
  if (ui.tab === 'progress') mountChart();
  if (ui.todayDone === false && st.todayDone) celebrate(st.streak);
  ui.todayDone = st.todayDone;
}

function meter(label, val, target, unit = '', cls = '') {
  const pct = target ? Math.min(100, (val / target) * 100) : 0;
  const state = cls || (target && val >= target * 0.95 ? 'good' : '');
  return `<div class="meter"><div class="lbl"><span>${label}</span><span><b>${round(val, 0)}</b> / ${round(target, 0)}${unit}</span></div>
    <div class="bar ${state}"><span style="width:${pct}%"></span></div></div>`;
}

function waterCard() {
  const ml = S.water[ui.date] || 0; const s = S.settings;
  return `<div class="card"><h2>💧 Water <span class="muted small">${bottles(ml)} / ${bottles(s.waterTarget)} shakers · ${round(ml / 1000, 1)} L</span></h2>
    ${meter('Today', ml, s.waterTarget, ' ml')}
    <div class="row">
      <button class="btn primary" data-act="water" data-n="${s.bottleMl}">+1 shaker</button>
      <button class="btn" data-act="water" data-n="250">+250 ml</button>
      <button class="btn ghost" data-act="water" data-n="-${s.bottleMl}">−1 shaker</button>
    </div>
    <p class="muted small">One shaker = ${s.bottleMl} ml. On hockey days add one or two extra.</p></div>`;
}

function macroCard(compact) {
  const n = nut(ui.date), s = S.settings, ct = calTarget(ui.date);
  return `<div class="card"><h2>🍽️ Calories & macros ${isHockeyDay(ui.date) ? '<span class="pill warn">Game day</span>' : ''}</h2>
    ${meter('Calories', n.cal, ct, ' kcal')}
    ${meter('Protein', n.protein, s.protein, ' g')}
    ${meter('Carbs', n.carbs, s.carbs, ' g')}
    ${meter('Fat', n.fat, s.fat, ' g')}
    ${n.cal < ct ? `<p class="small">Still need <b>${round(ct - n.cal, 0).toLocaleString()} kcal</b> and <b>${round(Math.max(0, s.protein - n.protein), 0)} g protein</b>.</p>` : ''}
    ${compact ? '<button class="btn sm" data-act="tab" data-tab="food">Food log</button>' : ''}</div>`;
}

function eventRow(e, showDate = true) {
  const t = EVENT_TYPES[e.type] || EVENT_TYPES.cardio;
  return `<div class="event ${e.done ? 'done' : ''}">
    <input type="checkbox" data-act="eventDone" data-id="${e.id}" ${e.done ? 'checked' : ''} aria-label="Done">
    <div class="when">${showDate ? fmtDate(e.date) : ''}${e.time ? `<br>${esc(e.time)}` : ''}</div>
    <div class="what"><div>${t.icon} <b>${esc(t.label)}</b>${e.mins ? ` <span class="muted small">· ${e.mins} min</span>` : ''}</div>
      ${e.title ? `<div class="small">${esc(e.title)}</div>` : ''}</div>
    <button class="icon-btn" data-act="eventDel" data-id="${e.id}" aria-label="Delete">✕</button></div>`;
}

/* ---------- AI food logging (claude.ai "sample" capability: asks Claude on your own account) ---------- */
const MACROS = ['cal', 'protein', 'carbs', 'fat'];
const MACRO_LABEL = { cal: 'kcal', protein: 'Protein g', carbs: 'Carbs g', fat: 'Fat g' };
let sampleFn = null;
async function aiInit() {
  if (!ui.ai.available) return;
  try {
    sampleFn = await window.claude.use('sample');
    if (!sampleFn) { ui.ai.available = false; render(); return; }
    const caps = await sampleFn.limits().catch(() => null);
    ui.ai.images = !!(caps && caps.images);
    render();
  } catch (e) { ui.ai.available = false; render(); }
}
function recentFoods() {
  const seen = new Map();
  for (const d of Object.keys(S.nutrition).sort().reverse()) {
    for (const it of S.nutrition[d].items || []) if (!seen.has(it.name.toLowerCase())) seen.set(it.name.toLowerCase(), it);
    if (seen.size >= 25) break;
  }
  return [...seen.values()].map(i => `${i.name} (${i.qty || '1 serving'}): ${i.cal} kcal, P${i.protein} C${i.carbs} F${i.fat}`).join('\n');
}
async function aiEstimate() {
  const text = ui.ai.text.trim();
  if (!text && !ui.ai.photo) return toast('Describe what you ate first');
  if (!sampleFn) return;
  ui.ai.busy = true; ui.ai.error = ''; render();
  const now = new Date(); const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const refs = recentFoods();
  const prompt = `You log food for a calorie and macro tracker. Estimate calories and macros for what the person ate.
Rules:
- Split it into separate food items. Use the amounts given; otherwise assume a typical single serving and say what you assumed in "qty".
- The person lives in Canada and shops at Sobeys and Costco (Kirkland Signature), so use Canadian products and portions when a brand matters.
- "meal" is one of ${MEAL_SLOTS.join(', ')}. Their day: Breakfast is a smoothie around 9:45 am, Lunch around 1:30 pm (usually eaten out), Pre-gym is a snack around 5 pm, Dinner around 8:15 pm, Bedtime is a late-night snack. ${ui.ai.meal ? `Put every item in "${ui.ai.meal}".` : `Use what the person says; otherwise infer it from the time now (${hhmm}).`}
- Numbers are whole numbers: cal in kcal; protein, carbs and fat in grams.
- If a photo is attached it shows the food or a nutrition label; read the label values when visible.
${refs ? `- The person has logged these foods before. When the same food appears, reuse these values:\n${refs}\n` : ''}
Reply with only JSON in this shape:
{"items":[{"name":"Large eggs","qty":"2 eggs","meal":"Breakfast","cal":144,"protein":12,"carbs":1,"fat":10}],"note":"one short sentence on any big assumption, or empty"}

What they ate: ${text || '(see photo)'}`;
  try {
    const opts = { modelTier: 'quick' };
    if (ui.ai.photo) opts.images = ui.ai.photo;
    const res = await sampleFn.json(prompt, opts);
    const items = (res && Array.isArray(res.items) ? res.items : []).map(i => ({
      id: uid(), name: String(i.name || 'Food').slice(0, 80), qty: String(i.qty || '').slice(0, 60),
      meal: ui.ai.meal || (MEAL_SLOTS.includes(i.meal) ? i.meal : 'Bedtime'),
      cal: Math.max(0, Math.round(num(i.cal))), protein: Math.max(0, Math.round(num(i.protein))),
      carbs: Math.max(0, Math.round(num(i.carbs))), fat: Math.max(0, Math.round(num(i.fat))),
    }));
    if (!items.length) ui.ai.error = "Couldn't find any food in that. Try listing what you ate and how much.";
    else { ui.ai.pending = items; ui.ai.note = String((res && res.note) || '').slice(0, 200); }
  } catch (e) {
    const c = e && e.code;
    if (c === 'not_granted' || c === 'sampling_disabled' || c === 'not_declared') { ui.ai.available = false; toast('AI logging is turned off for this page'); }
    else if (c === 'rate_limited') ui.ai.error = 'Too many requests right now. Wait a minute and try again.';
    else if (c === 'cancelled') ui.ai.error = '';
    else if (c === 'image_rejected' || c === 'images_unavailable') ui.ai.error = "That photo couldn't be used. Try a JPEG or PNG, or describe the food instead.";
    else ui.ai.error = "Couldn't estimate that. Try rephrasing, e.g. “2 eggs, 1 bagel with 2 tbsp peanut butter”.";
  }
  ui.ai.busy = false; render();
}
async function aiOut() {
  const text = String(ui.outText || '').trim();
  if (!text) return toast("Type what you're out of first");
  if (!sampleFn) return;
  ui.outBusy = true; render();
  const list = S.supplies.map(x => `${x.id}: ${x.name} (${x.store})`).join('\n');
  const prompt = `Match what the person says they're out of to their household supplies list.
Supplies (id: name (store)):
${list}

Reply with only JSON: {"low":["id"],"add":[{"name":"...","cat":"food|cleaning|laundry|care","store":"Sobeys|Costco|Other"}]}
- "low": ids of supplies that match what they said.
- "add": things that aren't on the list. Bulk paper goods and big packs go to Costco, fresh food and everyday items to Sobeys, pharmacy items to Other.

They said: ${text}`;
  try {
    const res = await sampleFn.json(prompt, { modelTier: 'quick' });
    let n = 0;
    for (const id of (res && res.low) || []) { const x = S.supplies.find(v => v.id === id); if (x && x.status !== 'low') { x.status = 'low'; x.inCart = false; n++; } }
    for (const a of (res && res.add) || []) {
      if (!a || !a.name) continue;
      S.supplies.push({ id: uid(), name: String(a.name).slice(0, 60), cat: SUPPLY_CATS[a.cat] ? a.cat : 'food', store: STORES.includes(a.store) ? a.store : 'Sobeys', status: 'low', inCart: false }); n++;
    }
    ui.outText = ''; ui.outBusy = false;
    commit(n ? `Added ${n} to your grocery lists` : 'Nothing matched. Try naming the item.');
  } catch (e) {
    ui.outBusy = false; render();
    toast(e && e.code === 'rate_limited' ? 'Too many requests. Try again in a minute.' : "Couldn't do that. Try again.");
  }
}
function addFoodItems(date, items, src) {
  const n = S.nutrition[date] || (S.nutrition[date] = { cal: 0, protein: 0, carbs: 0, fat: 0 });
  n.items = n.items || [];
  for (const it of items) { n.items.push(it); for (const k of MACROS) n[k] = Math.round(num(n[k]) + num(it[k])); }
  n.src = n.src && n.src !== src ? 'Mixed' : src;
}
function aiCard() {
  if (!ui.ai.available) return '';
  const a = ui.ai; const p = a.pending;
  const tot = p ? Object.fromEntries(MACROS.map(k => [k, sum(p.map(i => num(i[k])))])) : null;
  return `<div class="card ai-card"><h2>✨ Log food with AI <span class="muted small">${ui.date === todayISO() ? 'today' : fmtDate(ui.date)}</span></h2>
    ${a.meal ? `<div class="row" style="margin-bottom:8px"><span class="pill accent">Logging: ${esc(MEAL_INFO[a.meal] ? MEAL_INFO[a.meal][2] : a.meal)}</span><button class="btn ghost sm" data-act="aiMealClear">Any meal</button></div>` : ''}
    ${p ? `<p class="small">Check the estimate, fix any numbers, then add it.</p>
      <div class="ai-items">
        ${p.map(i => `<div class="ai-item">
          <div class="ai-head"><span><b>${esc(i.name)}</b> <span class="muted small">${esc(i.qty)} · ${esc(i.meal)}</span></span>
            <button class="icon-btn" data-act="aiItemDel" data-id="${i.id}" aria-label="Remove ${esc(i.name)}">✕</button></div>
          <div class="ai-fields">${MACROS.map(k => `<label class="field">${MACRO_LABEL[k]}<input type="number" min="0" inputmode="numeric" id="ai_${i.id}_${k}" data-act="aiField" data-id="${i.id}" data-k="${k}" value="${i[k]}"></label>`).join('')}</div>
        </div>`).join('')}
        <div class="ai-total">Total: <b>${round(tot.cal, 0)} kcal</b> · P ${round(tot.protein, 0)} g · C ${round(tot.carbs, 0)} g · F ${round(tot.fat, 0)} g</div>
      </div>
      ${a.note ? `<p class="muted small">${esc(a.note)}</p>` : ''}
      <div class="row"><button class="btn primary" data-act="aiAdd">Add to ${ui.date === todayISO() ? 'today' : fmtDate(ui.date)}</button>
        <button class="btn ghost" data-act="aiDiscard">Discard</button></div>
      <div class="row" style="margin-top:10px"><input type="text" id="favName" placeholder="Favourite name (e.g. Subway footlong)" style="flex:1;min-width:150px"><button class="btn sm" data-act="favSave">★ Save as favourite</button></div>`
    : `<textarea id="aiText" class="w-full" rows="2" placeholder="e.g. 3 eggs, 2 slices toast with butter, 500 ml chocolate milk" ${a.busy ? 'disabled' : ''}>${esc(a.text)}</textarea>
      <div class="row" style="margin-top:8px">
        <button class="btn primary" data-act="aiEstimate" ${a.busy ? 'disabled' : ''}>${a.busy ? 'Estimating…' : 'Estimate'}</button>
        ${a.images ? `<label class="btn">${a.photo ? '📷 Photo added' : '📷 Add photo'}<input type="file" id="aiPhoto" accept="image/jpeg,image/png,image/webp" hidden></label>
          ${a.photo ? '<button class="btn ghost sm" data-act="aiPhotoClear">Remove photo</button>' : ''}` : ''}
      </div>
      ${a.error ? `<p class="small" style="color:var(--bad)">${esc(a.error)}</p>` : ''}
      <p class="muted small">Tip: tap the microphone on your phone keyboard to say it instead of typing. Estimates use your Claude account.</p>`}
  </div>`;
}
function foodLogCard() {
  const items = (S.nutrition[ui.date] && S.nutrition[ui.date].items) || [];
  if (!items.length) return '';
  return `<div class="card"><h2>🧾 Food logged ${ui.date === todayISO() ? 'today' : fmtDate(ui.date)}</h2>
    ${MEAL_SLOTS.map(m => { const list = items.filter(i => (MEAL_SLOTS.includes(i.meal) ? i.meal : 'Bedtime') === m); if (!list.length) return '';
      return `<h3>${MEAL_INFO[m][2]} <span class="muted">· ${sum(list.map(i => i.cal))} kcal</span></h3>${list.map(i => `<div class="check">
        <span class="name">${esc(i.name)} <span class="muted small">${esc(i.qty)}</span><br><span class="muted small">${i.cal} kcal · P${i.protein} C${i.carbs} F${i.fat}</span></span>
        <button class="icon-btn" data-act="foodDel" data-id="${i.id}" aria-label="Delete ${esc(i.name)}">✕</button></div>`).join('')}`; }).join('')}
  </div>`;
}

const VIEWS = {
  today() {
    const d = ui.date, isToday = d === todayISO();
    const st = ui.stats; const di = (d >= S.created && d <= todayISO()) ? st.info(d) : dayInfo(d);
    const left = di.reqCount - di.doneCount;
    const msg = isToday
      ? (di.complete ? 'Streak extended! See you tomorrow.' : st.streak > 0 ? `${left} left to keep your ${st.streak}-day streak.` : 'Finish today\'s plan to start a streak.')
      : (di.complete ? 'Day complete.' : `${di.doneCount} of ${di.reqCount} done.`);
    const hw = isHockeyWeek(d);
    const w = S.weights.find(x => x.date === d);
    return `<div class="grid">
      <section class="card wide hero ${di.complete ? 'complete' : ''}">
        <div class="hero-top">
          <div class="hero-flame ${st.todayDone ? 'lit' : ''}">🔥</div>
          <div class="hero-text"><div class="hero-num">${st.streak}</div><div class="hero-label">day streak</div></div>
          <div class="hero-side"><div><b>${st.best}</b><span>best</span></div><div><b>${st.totalXp.toLocaleString()}</b><span>total XP</span></div></div>
        </div>
        <p class="hero-msg">${esc(msg)}</p>
        ${weekStrip(st)}
      </section>
      <section class="card wide">
        <h2>${isToday ? 'Today' : fmtDate(d, { weekday: 'long', month: 'short', day: 'numeric' })} <span class="pill ${hw ? 'warn' : 'accent'}">${hw ? '🏒 Hockey week' : 'Normal week'}</span></h2>
        <div class="ptiles">${di.groups.map(g => progressTile(g, d)).join('')}</div>
      </section>
      <section class="card wide tl-card">
        <h2>Your schedule <button class="btn ghost sm" data-act="tab" data-tab="routines">Edit</button></h2>
        ${timeline(d, di.plan)}
      </section>
      ${aiCard()}
      ${macroCard(true)}
      <div class="card"><h2>⚖️ Weigh-in <span class="pill">Bonus</span></h2>
        <div class="row"><input type="number" step="0.1" inputmode="decimal" id="todayWeight" placeholder="${U()}" value="${w ? w.value : ''}">
          <button class="btn primary" data-act="logWeight" data-src="todayWeight">Save</button></div>
        <p class="muted small">Weigh in after you wake up, before the smoothie. The 7-day average is what matters.</p></div>
    </div>`;
  },

  food() {
    const n = nut(ui.date), s = S.settings;
    const days = Array.from({ length: 14 }, (_, i) => addDays(ui.date, -i));
    const logged = days.filter(d => S.nutrition[d] && S.nutrition[d].cal);
    const avg = k => logged.length ? sum(logged.slice(0, 7).map(d => S.nutrition[d][k])) / Math.min(7, logged.length) : 0;
    return `<div class="grid">
      ${aiCard()}
      ${macroCard(false)}
      ${foodLogCard()}
      <div class="card"><h2>✏️ Enter totals for ${fmtDate(ui.date)}</h2>
        <p class="muted small">Copy the daily totals from MyFitnessPal's Diary (bottom of the day), or import a CSV below. Saving here replaces the day's totals; your AI-logged items stay listed.</p>
        <div class="row">
          <label class="field">Calories<input type="number" id="n_cal" value="${n.cal || ''}"></label>
          <label class="field">Protein g<input type="number" id="n_protein" value="${n.protein || ''}"></label>
          <label class="field">Carbs g<input type="number" id="n_carbs" value="${n.carbs || ''}"></label>
          <label class="field">Fat g<input type="number" id="n_fat" value="${n.fat || ''}"></label>
        </div>
        <div class="row" style="margin-top:8px"><button class="btn primary" data-act="saveNut">Save</button>
          ${S.nutrition[ui.date] ? '<button class="btn ghost danger" data-act="clearNut">Clear day</button>' : ''}</div></div>
      <div class="card"><h2>📥 Import from MyFitnessPal</h2>
        <ol class="small" style="padding-left:18px;margin:0 0 8px">
          <li>In MyFitnessPal (Premium): <b>Settings → Export Data</b>. You'll get an email with a zip of CSV files.</li>
          <li>Unzip it and pick the <b>Nutrition Summary</b> CSV.</li>
          <li>Import it here — rows are summed per day (all meals), existing days are overwritten.</li>
        </ol>
        <input type="file" id="mfpFile" accept=".csv,text/csv">
        <p class="muted small">No Premium? Use the totals form — it takes 10 seconds a day. MyFitnessPal doesn't offer a public API, so a live sync isn't possible from a personal app.</p></div>
      <div class="card"><h2>📊 Last 7 logged days (avg)</h2>
        <div class="stat-row">
          <div class="stat"><div class="k">Calories</div><div class="v">${round(avg('cal'), 0)}</div><div class="k">target ${s.calories}</div></div>
          <div class="stat"><div class="k">Protein</div><div class="v">${round(avg('protein'), 0)}g</div><div class="k">target ${s.protein}g</div></div>
          <div class="stat"><div class="k">Carbs</div><div class="v">${round(avg('carbs'), 0)}g</div><div class="k">target ${s.carbs}g</div></div>
          <div class="stat"><div class="k">Fat</div><div class="v">${round(avg('fat'), 0)}g</div><div class="k">target ${s.fat}g</div></div>
        </div></div>
      <div class="card wide"><h2>🗓️ Last 14 days</h2><div class="table-wrap"><table>
        <tr><th>Date</th><th class="num">kcal</th><th class="num">P</th><th class="num">C</th><th class="num">F</th><th class="num">Water L</th><th></th></tr>
        ${days.map(d => { const x = S.nutrition[d]; const hit = x && x.cal >= s.calories * 0.95 && x.protein >= s.protein * 0.95;
          return `<tr><td>${fmtDate(d)}</td><td class="num">${x ? x.cal : '—'}</td><td class="num">${x ? x.protein : '—'}</td><td class="num">${x ? x.carbs : '—'}</td><td class="num">${x ? x.fat : '—'}</td>
          <td class="num">${S.water[d] ? round(S.water[d] / 1000, 1) : '—'}</td><td>${x ? (hit ? '<span class="pill good">Hit</span>' : '<span class="pill warn">Under</span>') : ''}</td></tr>`; }).join('')}
      </table></div></div>
    </div>`;
  },

  gym() {
    const d = ui.date;
    const dayId = ui.gymDay || gymDayFor(d) || S.gym.split[0]?.id;
    const day = splitById(dayId);
    const key = `${d}|${dayId}`; const log = S.gym.logs[key];
    if (ui.editRoutine) return gymEditor();
    return `<div class="grid">
      <div class="card wide">
        <h2><span>🏋️ ${fmtDate(d, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          <button class="btn sm" data-act="editRoutine">Edit routine</button></h2>
        <div class="row"><select id="gymDaySel" data-act="gymDay">${S.gym.split.map(x => `<option value="${x.id}" ${x.id === dayId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
          ${gymDayFor(d) === dayId ? '<span class="pill accent">Scheduled today</span>' : '<span class="pill">Not scheduled today</span>'}
          ${log ? '<span class="pill good">Saved</span>' : ''}</div>
        <p class="muted small">Double progression: work in the rep range; when every set hits the top, add weight and drop to the bottom of the range. Weights in ${U()}.</p>
        ${day ? day.exercises.map(ex => {
          const sug = overloadSuggestion(ex, d);
          const hist = exerciseHistory(ex.id, d);
          const sets = (log && log.entries[ex.id]) || [];
          const trend = hist.slice(0, 5).reverse().map(h => round(bestE1rm(h.sets), 0));
          return `<div class="ex"><div class="head"><span class="name">${esc(ex.name)}</span>
              <span class="muted small">${ex.sets} × ${ex.repMin}${ex.repMax !== ex.repMin ? '–' + ex.repMax : ''}${ex.inc ? ` · +${ex.inc} ${U()}` : ''}</span></div>
            <div class="small"><span class="pill tip-pill ${sug.kind === 'up' ? 'good' : sug.kind === 'deload' ? 'warn' : 'accent'}">${esc(sug.text)}</span></div>
            ${hist[0] ? `<div class="muted small">Last (${fmtDate(hist[0].date)}): ${hist[0].sets.map(s => `${num(s.w)}×${num(s.r)}`).join(', ')}${trend.length > 1 ? ` · est. 1RM ${trend.join(' → ')}` : ''}</div>` : ''}
            <div class="sets"><span></span><span class="muted small">Weight</span><span class="muted small">Reps</span>
              ${Array.from({ length: ex.sets }, (_, i) => { const s = sets[i] || {};
                return `<span class="n">${i + 1}</span>
                <input type="number" step="any" inputmode="decimal" data-act="set" data-ex="${ex.id}" data-i="${i}" data-f="w" value="${s.w ?? ''}" placeholder="${sug.w ?? ''}">
                <input type="number" inputmode="numeric" data-act="set" data-ex="${ex.id}" data-i="${i}" data-f="r" value="${s.r ?? ''}" placeholder="${sug.r ?? ex.repMax}">`; }).join('')}
            </div></div>`;
        }).join('') : '<p>No split days yet — add one in Edit routine.</p>'}
        ${log ? '<button class="btn ghost danger" data-act="gymClear">Delete this session</button>' : ''}
      </div>
      <div class="card"><h2>📅 Weekly schedule</h2>
        ${[1, 2, 3, 4, 5, 6, 0].map(i => `<div class="row small" style="padding:3px 0"><span style="width:40px">${DOW[i]}</span><span>${esc(splitById(S.gym.schedule[i])?.name || 'Rest / hockey')}</span></div>`).join('')}</div>
      <div class="card"><h2>📈 Recent sessions</h2>
        ${Object.values(S.gym.logs).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map(l =>
          `<div class="row small between" style="padding:3px 0"><span>${fmtDate(l.date)}</span><span class="muted">${esc(splitById(l.dayId)?.name || l.dayId)}</span></div>`).join('') || '<p class="muted small">No sessions yet.</p>'}</div>
    </div>`;
  },

  cardio() {
    const d = ui.date, today = todayISO();
    const weekends = [];
    for (let x = startOfWeek(today), i = 0; i < 20 && weekends.length < 6; i++, x = addDays(x, 7)) {
      const sat = addDays(x, 5); if (isHockeyDay(sat) || isHockeyDay(addDays(sat, 1))) weekends.push(sat);
    }
    const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(d), i));
    const upcoming = S.events.filter(e => e.date >= d && diffDays(e.date, d) <= 35).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    return `<div class="grid">
      <div class="card"><h2>🏒 Hockey weekends</h2>
        <p class="small">Hockey takes the whole Saturday and Sunday on these dates. Those weeks switch to hockey mode: the Sunday clean-up is spread over weeknights, groceries move to Wednesday (Sobeys) and Thursday (Costco), and game days get a ${S.settings.gameCalories.toLocaleString()} kcal target.</p>
        ${S.hockey.ranges.map((r, i) => `<div class="row between range-row"><span><b>${fmtDate(r.start, { month: 'short', day: 'numeric' })} – ${fmtDate(r.end, { month: 'short', day: 'numeric', year: 'numeric' })}</b></span>
          <button class="icon-btn" data-act="rangeDel" data-i="${i}" aria-label="Remove these dates">✕</button></div>`).join('') || '<p class="muted">No hockey dates yet.</p>'}
        <h3>Add dates (e.g. playoffs)</h3>
        <div class="row"><input type="date" id="rangeStart" aria-label="First day"><span class="muted">to</span><input type="date" id="rangeEnd" aria-label="Last day">
          <button class="btn primary" data-act="rangeAdd">Add</button></div></div>
      <div class="card"><h2>📅 Next hockey weekends</h2>
        ${weekends.map(sat => `<div class="row between small" style="padding:4px 0"><span>Sat ${fmtDate(sat, { month: 'short', day: 'numeric' })} + Sun ${fmtDate(addDays(sat, 1), { month: 'short', day: 'numeric' })}</span><span class="pill warn">Games</span></div>`).join('') || '<p class="muted">None coming up.</p>'}</div>
      <div class="card"><h2>🚴 Cardio plan</h2>
        <ul class="small plan-list">
          <li><b>Until ${fmtDate(S.hockey.preseasonEnd, { month: 'short', day: 'numeric' })} (getting ready):</b> bike intervals after Tuesday's lift (30 s hard / 90 s easy, one more round each week) and easy cardio after Friday's lift.</li>
          <li><b>Hockey weeks:</b> games are your cardio. Keep just the Tuesday intervals.</li>
          <li><b>Weekends without games:</b> 25 min easy cardio on Saturday.</li>
        </ul>
        <p class="muted small">Short cardio won't slow your gains at 3,200 kcal a day.</p></div>
      <div class="card"><h2>This week</h2>
        ${week.map(x => { const tr = dayPlan(x).filter(r => r.cat === 'train');
          return `<div class="row between small" style="padding:5px 0;border-bottom:2px solid var(--border)"><b style="width:44px">${DOW[dowOf(x)]}</b><span style="flex:1">${tr.map(r => `${r.icon} ${esc(r.title)}${r.done ? ' ✓' : ''}`).join(' · ') || '<span class="muted">Rest</span>'}</span></div>`; }).join('')}</div>
      <div class="card"><h2>➕ Extra session</h2>
        <div class="stack">
          <div class="row"><select id="ev_type">${Object.entries(EVENT_TYPES).map(([k, t]) => `<option value="${k}">${t.icon} ${t.label}</option>`).join('')}</select></div>
          <div class="row"><input type="date" id="ev_date" value="${d}"><input type="time" id="ev_time"><input type="number" id="ev_mins" placeholder="min" class="w-sm"></div>
          <input type="text" id="ev_title" class="w-full" placeholder="Notes (rink, workout…)">
          <div class="row"><label class="small">Repeat weekly for <input type="number" id="ev_rep" value="1" min="1" max="26" class="w-sm"> weeks</label>
            <span class="spacer"></span><button class="btn primary" data-act="addEvent">Add</button></div>
        </div></div>
      ${upcoming.length ? `<div class="card wide"><h2>Extra sessions</h2>${upcoming.map(e => eventRow(e)).join('')}</div>` : ''}
    </div>`;
  },

  meals() {
    const tab = ui.shopTab || 'lists';
    const seg = `<div class="seg">${[['lists', 'Grocery lists'], ['supplies', 'Supplies'], ['plan', 'Meal plan']].map(([k, l]) => `<button data-act="shopTab" data-k="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    if (tab === 'supplies') return seg + suppliesView();
    if (tab === 'plan') return seg + mealPlanView();
    return seg + `<div class="grid">${STORES.map(store => {
      const list = groceryList(store); const nt = store === 'Other' ? null : nextTripDate(store, ui.date);
      return `<div class="card"><h2>🛒 ${STORE_LABEL[store]} ${nt ? `<span class="pill accent">${nt === todayISO() ? 'Today' : fmtDate(nt)}</span>` : ''}</h2>
        ${S.groceries.last[store] ? `<p class="muted small">Last trip: ${fmtDate(S.groceries.last[store])}</p>` : ''}
        ${list.map(i => `<label class="check ${i.checked ? 'done' : ''}">
          <input type="checkbox" data-act="cart" data-kind="${i.kind}" data-id="${i.id}" ${i.checked ? 'checked' : ''}>
          <span class="name">${esc(i.name)}${i.kind === 'supply' ? ` <span class="pill">${SUPPLY_CATS[i.cat] || ''}</span>` : ''}</span>
          <button class="icon-btn" data-act="${i.kind === 'supply' ? 'supOk' : 'extraDel'}" data-id="${i.id}" aria-label="Remove ${esc(i.name)}">✕</button></label>`).join('') || '<p class="muted small">Nothing on the list. Mark supplies as low, or add something below.</p>'}
        <div class="row" style="margin-top:10px"><input type="text" id="ex_${store}" placeholder="Add something" style="flex:1"><button class="btn" data-act="extraAdd" data-store="${store}">Add</button></div>
        ${list.length ? `<button class="btn primary" style="margin-top:10px" data-act="trip" data-store="${store}">✓ Finished ${store === 'Other' ? 'shopping' : store + ' trip'}</button>` : ''}</div>`;
    }).join('')}
      <div class="card wide"><p class="small muted">Tick items as they go in the cart. Finishing a trip marks those supplies as stocked again and clears the one-off extras. Normal weeks: Sobeys on Sunday, Costco every other Saturday. Hockey weeks: Sobeys Wednesday night, Costco Thursday night.</p></div></div>`;
  },

  routines() {
    const cat = ui.rtCat || 'morning';
    const seg = `<div class="seg">${Object.entries(ROUTINE_CATS).map(([k, c]) => `<button data-act="rtCat" data-k="${k}" class="${cat === k ? 'on' : ''}">${c.icon} ${c.label}</button>`).join('')}</div>`;
    const list = S.routines.filter(r => r.cat === cat).sort((a, b) => a.time.localeCompare(b.time));
    return seg + `<div class="grid"><div class="card wide"><h2>${ROUTINE_CATS[cat].icon} ${ROUTINE_CATS[cat].label}</h2>
      <p class="muted small">Each task shows up in your schedule at its time, on the days you pick. "Normal weeks" and "Hockey weeks" switch automatically around your hockey weekends.</p>
      ${list.map(r => `<div class="rt-item">
        <div class="rt-top"><input type="text" value="${esc(r.name)}" data-act="rtField" data-id="${r.id}" data-f="name" aria-label="Task">
          <button class="icon-btn" data-act="rtDel" data-id="${r.id}" aria-label="Delete task">✕</button></div>
        <div class="row" style="margin-top:6px"><input type="time" value="${r.time}" data-act="rtField" data-id="${r.id}" data-f="time" aria-label="Time">
          <div class="days">${[1, 2, 3, 4, 5, 6, 0].map(i => `<button class="day ${!r.days.length || r.days.includes(i) ? 'on' : ''}" data-act="rtDay" data-id="${r.id}" data-d="${i}" aria-pressed="${!r.days.length || r.days.includes(i)}">${DOW[i][0]}</button>`).join('')}</div></div>
        <div class="row" style="margin-top:6px">
          <select data-act="rtField" data-id="${r.id}" data-f="weeks" aria-label="Which weeks">${Object.entries(WEEK_MODES).map(([k, l]) => `<option value="${k}" ${r.weeks === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <label class="small"><input type="checkbox" data-act="rtField" data-id="${r.id}" data-f="monthly" ${r.monthly ? 'checked' : ''}> First week of month only</label>
          <label class="small"><input type="checkbox" data-act="rtField" data-id="${r.id}" data-f="streak" ${r.streak !== false ? 'checked' : ''}> Counts for streak</label>
        </div></div>`).join('') || '<p class="muted">No tasks here yet.</p>'}
      <h3>Add a task</h3>
      <div class="row"><input type="time" id="rtNewTime" value="21:00" aria-label="Time"><input type="text" id="rtNewName" placeholder="New ${ROUTINE_CATS[cat].label.toLowerCase()} task" style="flex:1">
        <button class="btn primary" data-act="rtAdd" data-cat="${cat}">Add</button></div>
    </div></div>`;
  },

  progress() {
    const ws = sortedWeights(); const s = S.settings;
    const last = ws[ws.length - 1];
    const avg7 = last ? rollingAvg(ws, last.date) : null;
    const rate = last ? weeklyRate(ws, last.date) : null;
    const first = ws[0];
    let advice = 'Log at least 3 weigh-ins over 1–3 weeks to see your rate of gain.';
    if (rate !== null) {
      const tgt = s.weeklyGain; const kcalPerUnit = U() === 'lb' ? 3500 : 7700;
      if (rate < tgt - 0.15) advice = `Gaining ${round(rate, 2)} ${U()}/wk — below your ${tgt} target. Add ~${Math.round(((tgt - rate) * kcalPerUnit) / 7 / 50) * 50} kcal/day (e.g. a mass shake or extra PB bagel).`;
      else if (rate > tgt + 0.25) advice = `Gaining ${round(rate, 2)} ${U()}/wk — faster than your ${tgt} target, likely extra fat. Trim ~${Math.round(((rate - tgt) * kcalPerUnit) / 7 / 50) * 50} kcal/day.`;
      else advice = `Gaining ${round(rate, 2)} ${U()}/wk — right on target. Keep calories where they are. 💪`;
    }
    const eta = rate > 0 && s.goalWeight && avg7 && s.goalWeight > avg7 ? addDays(last.date, Math.round(((s.goalWeight - avg7) / rate) * 7)) : null;
    return `<div class="grid">
      <div class="card"><h2>⚖️ Log weight</h2>
        <div class="row"><input type="date" id="w_date" value="${ui.date}"><input type="number" step="0.1" id="w_val" placeholder="${U()}">
          <button class="btn primary" data-act="logWeight" data-src="w_val" data-date="w_date">Save</button></div>
        <div class="row" style="margin-top:10px">
          <label class="field">Goal weight (${U()})<input type="number" step="0.1" data-act="setting" data-k="goalWeight" value="${s.goalWeight || ''}"></label>
          <label class="field">Target gain / week<input type="number" step="0.05" data-act="setting" data-k="weeklyGain" value="${s.weeklyGain}"></label></div>
        <p class="muted small">Lean bulk: ~0.25–0.5% of body weight per week (≈0.5 lb/wk for most people).</p></div>
      <div class="card"><h2>📊 Summary</h2>
        <div class="stat-row">
          <div class="stat"><div class="k">7-day avg</div><div class="v">${avg7 ? round(avg7) : '—'}</div><div class="k">${U()}</div></div>
          <div class="stat"><div class="k">Rate (3 wk)</div><div class="v">${rate !== null ? (rate >= 0 ? '+' : '') + round(rate, 2) : '—'}</div><div class="k">${U()}/week</div></div>
          <div class="stat"><div class="k">Total change</div><div class="v">${first && last ? (last.value - first.value >= 0 ? '+' : '') + round(last.value - first.value) : '—'}</div><div class="k">since ${first ? fmtDate(first.date) : '—'}</div></div>
          <div class="stat"><div class="k">Goal ETA</div><div class="v small" style="font-size:15px">${eta ? fmtDate(eta, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div></div>
        </div><div class="note">${esc(advice)}</div></div>
      <div class="card wide"><h2>📈 Weight trend
          <select data-act="chartDays">${[30, 90, 180, 365].map(n => `<option value="${n}" ${ui.chartDays === n ? 'selected' : ''}>${n} days</option>`).join('')}</select></h2>
        <div class="legend"><span><i class="dot"></i>Daily weigh-in</span><span><i></i>7-day average</span>${s.goalWeight ? '<span><i class="goal"></i>Goal</span>' : ''}</div>
        <div class="chart" id="wchart"></div></div>
      <div class="card wide"><h2>🗒️ Entries</h2><div class="table-wrap"><table>
        <tr><th>Date</th><th class="num">Weight (${U()})</th><th class="num">7-day avg</th><th></th></tr>
        ${[...ws].reverse().slice(0, 30).map(w => `<tr><td>${fmtDate(w.date)}</td><td class="num">${w.value}</td><td class="num">${round(rollingAvg(ws, w.date))}</td>
          <td><button class="icon-btn" data-act="weightDel" data-date="${w.date}" aria-label="Delete">✕</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted">No entries yet.</td></tr>'}
      </table></div></div>
    </div>`;
  },

  settings() {
    const s = S.settings;
    const f = (k, label, step = 1) => `<label class="field">${label}<input type="number" step="${step}" data-act="setting" data-k="${k}" value="${s[k]}"></label>`;
    return `<div class="grid">
      <div class="card"><h2>🎯 Daily targets</h2>
        <div class="row">${f('calories', 'Calories')}${f('gameCalories', 'Game day kcal')}${f('protein', 'Protein g')}${f('carbs', 'Carbs g')}${f('fat', 'Fat g')}</div>
        <div class="row" style="margin-top:8px">${f('waterTarget', 'Water ml', 100)}${f('bottleMl', 'Shaker ml', 10)}</div>
        <div class="row" style="margin-top:8px">${f('goalWeight', 'Goal weight', 0.5)}${f('weeklyGain', 'Gain / week', 0.05)}
          <label class="field">Wake up<input type="time" data-act="setting" data-k="wake" value="${s.wake}"></label></div>
        <button class="btn sm" style="margin-top:10px" data-act="macroCalc">Fill carbs + fat from calories</button></div>
      <div class="card"><h2>🔥 Streak rules</h2>
        <p class="small">A day counts toward your streak when every ticked part is done.</p>
        ${[['food', 'Food: 90% of calories and protein'], ['water', 'Water target'], ['train', 'Training: gym, cardio and hockey on the schedule'], ['routines', 'Routines: every schedule task marked "Counts for streak"']].map(([k, l]) =>
          `<label class="check"><input type="checkbox" data-act="streakCat" data-k="${k}" ${({ ...STREAK_DEFAULTS, ...s.streakCats })[k] ? 'checked' : ''}><span class="name">${l}</span></label>`).join('')}
      </div>
      <div class="card"><h2>☁️ Sync</h2><p class="small">${esc(SYNC_LABEL[cloud.status])}.${cloud.col ? ' Your data is saved to your private claude.ai storage and syncs across your devices.' : ' Your data is stored in this browser only. Export a backup regularly.'}</p></div>
      <div class="card"><h2>⚙️ Preferences</h2>
        <div class="row"><label class="field">Weight unit<select data-act="setting" data-k="unit"><option ${s.unit === 'lb' ? 'selected' : ''}>lb</option><option ${s.unit === 'kg' ? 'selected' : ''}>kg</option></select></label>
          <label class="field">Theme<select data-act="setting" data-k="theme">${['auto', 'light', 'dark'].map(t => `<option ${s.theme === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div></div>
      <div class="card"><h2>💾 Backup</h2>
        <p class="small">Export a copy of all your data, or restore one you saved earlier.</p>
        <div class="row"><button class="btn primary" data-act="export">Export backup</button>
          <label class="btn">Import backup<input type="file" id="importFile" accept=".json,application/json" hidden></label></div>
        <button class="btn ghost danger sm" style="margin-top:10px" data-act="reset">Reset everything</button>
        <p class="muted small">Version ${BUILD}</p></div>
    </div>`;
  },
};

function suppliesView() {
  const filt = ui.supCat || 'all';
  const list = S.supplies.filter(x => filt === 'all' || x.cat === filt);
  return `<div class="grid">
    ${ui.ai.available ? `<div class="card wide ai-card"><h2>✨ What are you out of?</h2>
      <div class="row"><input type="text" id="aiOutText" class="w-full" style="flex:1" placeholder="e.g. out of dish soap, eggs and paper towels" value="${esc(ui.outText || '')}">
        <button class="btn primary" data-act="aiOut" ${ui.outBusy ? 'disabled' : ''}>${ui.outBusy ? 'Adding…' : 'Add'}</button></div>
      <p class="muted small">Matches your supplies and puts them on the right store's list. New things get added too.</p></div>` : ''}
    <div class="card wide"><h2>📦 Supplies <span class="muted small">${S.supplies.filter(x => x.status === 'low').length} low</span></h2>
      <div class="chips">${[['all', 'All'], ...Object.entries(SUPPLY_CATS)].map(([k, l]) => `<button class="chipbtn ${filt === k ? 'on' : ''}" data-act="supCat" data-k="${k}">${l}</button>`).join('')}</div>
      ${list.map(x => `<div class="sup-row ${x.status === 'low' ? 'low' : ''}">
        <span class="name">${esc(x.name)}</span>
        <button class="pill store-pill" data-act="supStore" data-id="${x.id}" title="Change store">${STORE_LABEL[x.store]}</button>
        <button class="btn sm ${x.status === 'low' ? 'warnbtn' : ''}" data-act="supLow" data-id="${x.id}">${x.status === 'low' ? 'On list' : 'Low'}</button>
        <button class="icon-btn" data-act="supDel" data-id="${x.id}" aria-label="Delete ${esc(x.name)}">✕</button></div>`).join('')}
      <h3>Add a supply</h3>
      <div class="row"><input type="text" id="supName" placeholder="Name" style="flex:1;min-width:140px">
        <select id="supCatNew">${Object.entries(SUPPLY_CATS).map(([k, l]) => `<option value="${k}" ${filt === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <select id="supStoreNew">${STORES.map(s => `<option value="${s}">${STORE_LABEL[s]}</option>`).join('')}</select>
        <button class="btn primary" data-act="supAdd">Add</button></div>
    </div></div>`;
}

function mealPlanView() {
  const order = [1, 2, 3, 4, 5, 6, 0]; const today = dowOf(ui.date);
  return `<div class="grid">
    <div class="card wide"><h2>⭐ Favourites <span class="muted small">one tap to log</span></h2>
      ${S.favorites.map(fv => `<div class="row between fav-row"><span><b>${esc(fv.name)}</b> <span class="muted small">${sum(fv.items.map(i => num(i.cal)))} kcal · ${sum(fv.items.map(i => num(i.protein)))} g protein · ${fv.items.length} items</span></span>
        <span class="row"><button class="btn primary sm" data-act="fav" data-id="${fv.id}">Log</button><button class="icon-btn" data-act="favDel" data-id="${fv.id}" aria-label="Delete favourite">✕</button></span></div>`).join('') || '<p class="muted small">None yet.</p>'}
      <p class="muted small">Log something with AI, then tap "Save as favourite" to add it here.</p></div>
    <div class="card wide"><h2>🥗 Weekly meal plan</h2>
      ${order.map(dw => { const p = S.meals.plan[dw] || [];
        const tot = sum(MEAL_SLOTS.map(s => num(S.meals.kcal[`${dw}|${s}`])));
        return `<div class="meal-day ${dw === today ? 'today' : ''}"><div class="row between"><b>${DOW_LONG[dw]}</b>
          ${tot ? `<span class="pill ${tot >= S.settings.calories * 0.95 ? 'good' : 'warn'}">${tot.toLocaleString()} / ${S.settings.calories.toLocaleString()} kcal</span>` : ''}</div>
          <div class="meal-slots">${MEAL_SLOTS.map((s, i) => `<div class="meal-slot"><span>${MEAL_INFO[s][2]}</span>
            <input type="text" data-act="meal" data-dow="${dw}" data-i="${i}" value="${esc(p[i] || '')}" aria-label="${DOW_LONG[dw]} ${MEAL_INFO[s][2]}">
            <input type="number" data-act="mealKcal" data-k="${dw}|${s}" value="${S.meals.kcal[`${dw}|${s}`] || ''}" placeholder="kcal" aria-label="kcal"></div>`).join('')}</div></div>`;
      }).join('')}
      <p class="muted small">Your smoothie is about 605 kcal, so lunch out (aim 800+), the pre-gym snack and a bigger bedtime snack make up the rest of 3,200.</p></div>
  </div>`;
}

function gymEditor() {
  return `<div class="grid"><div class="card wide">
    <h2>✏️ Edit routine <button class="btn primary sm" data-act="editRoutine">Done</button></h2>
    <h3>Weekly schedule</h3>
    <div class="row">${[1, 2, 3, 4, 5, 6, 0].map(i => `<label class="field">${DOW[i]}<select data-act="sched" data-dow="${i}">
      <option value="">Rest</option>${S.gym.split.map(x => `<option value="${x.id}" ${S.gym.schedule[i] === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>`).join('')}</div>
    ${S.gym.split.map(day => `<h3>Day</h3>
      <div class="row"><input type="text" class="w-full" data-act="dayName" data-day="${day.id}" value="${esc(day.name)}" style="flex:1;font-weight:600">
        <button class="btn ghost danger sm" data-act="dayDel" data-day="${day.id}">Delete day</button></div>
      <div class="table-wrap"><table><tr><th>Exercise</th><th>Sets</th><th>Min reps</th><th>Max reps</th><th>+${U()}</th><th></th></tr>
      ${day.exercises.map(ex => `<tr>
        <td><input type="text" data-act="exf" data-day="${day.id}" data-ex="${ex.id}" data-f="name" value="${esc(ex.name)}" style="min-width:150px;width:100%"></td>
        ${['sets', 'repMin', 'repMax', 'inc'].map(k => `<td><input type="number" class="w-sm" step="any" data-act="exf" data-day="${day.id}" data-ex="${ex.id}" data-f="${k}" value="${ex[k]}"></td>`).join('')}
        <td><button class="icon-btn" data-act="exDel" data-day="${day.id}" data-ex="${ex.id}">✕</button></td></tr>`).join('')}
      </table></div><button class="btn sm" data-act="exAdd" data-day="${day.id}">+ Exercise</button>`).join('')}
    <div style="margin-top:14px"><button class="btn" data-act="dayAdd">+ Add training day</button></div>
  </div></div>`;
}

/* ---------- chart (single trend, hover tooltip) ---------- */
function mountChart() {
  const el = $('#wchart'); if (!el) return;
  const all = sortedWeights();
  const end = all.length ? all[all.length - 1].date : todayISO();
  const ws = all.filter(w => diffDays(end, w.date) < ui.chartDays);
  if (ws.length < 2) { el.innerHTML = '<p class="muted small">Log at least two weigh-ins to see a trend.</p>'; return; }
  const W = Math.max(300, Math.round(el.clientWidth || 720)), H = W < 500 ? 220 : 260, m = { l: 44, r: 12, t: 12, b: 26 };
  const start = ws[0].date; const span = Math.max(1, diffDays(end, start));
  const avgs = ws.map(w => ({ date: w.date, v: rollingAvg(all, w.date) }));
  const goal = S.settings.goalWeight || null;
  let lo = Math.min(...ws.map(w => w.value)), hi = Math.max(...ws.map(w => w.value));
  if (goal && Math.abs(goal - hi) < (hi - lo) * 1.5 + 5) { lo = Math.min(lo, goal); hi = Math.max(hi, goal); }
  const pad_ = Math.max(0.5, (hi - lo) * 0.1); lo -= pad_; hi += pad_;
  const x = d => m.l + (diffDays(d, start) / span) * (W - m.l - m.r);
  const y = v => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
  const ticks = 4; const yt = Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks);
  const xt = [0, 0.33, 0.66, 1].map(f => addDays(start, Math.round(span * f)));
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend chart">
    ${yt.map(v => `<line class="grid-line" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="axis-text" x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end">${round(v)}</text>`).join('')}
    ${xt.map((d, i) => `<text class="axis-text" x="${x(d)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === xt.length - 1 ? 'end' : 'middle'}">${fmtDate(d, { month: 'short', day: 'numeric' })}</text>`).join('')}
    ${goal && goal >= lo && goal <= hi ? `<line class="goal" x1="${m.l}" x2="${W - m.r}" y1="${y(goal)}" y2="${y(goal)}"/>` : ''}
    ${ws.map(w => `<circle class="dot" cx="${x(w.date)}" cy="${y(w.value)}" r="4"/>`).join('')}
    <path class="avg" d="${avgs.map((a, i) => `${i ? 'L' : 'M'}${x(a.date)},${y(a.v)}`).join('')}"/>
    <line class="xhair" id="xh" y1="${m.t}" y2="${H - m.b}" x1="-10" x2="-10" visibility="hidden"/>
    <rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent" id="hit"/>
  </svg><div class="tip" id="tip" hidden></div>`;
  const svg = el.querySelector('svg'), tip = $('#tip'), xh = $('#xh');
  const move = ev => {
    const r = svg.getBoundingClientRect(); const px = ((ev.clientX - r.left) / r.width) * W;
    let best = ws[0]; for (const w of ws) if (Math.abs(x(w.date) - px) < Math.abs(x(best.date) - px)) best = w;
    const a = avgs.find(q => q.date === best.date);
    xh.setAttribute('x1', x(best.date)); xh.setAttribute('x2', x(best.date)); xh.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.innerHTML = `<b>${fmtDate(best.date)}</b><br>Weigh-in: ${best.value} ${U()}<br>7-day avg: ${round(a.v)} ${U()}`;
    const left = (x(best.date) / W) * r.width; tip.style.left = Math.min(r.width - tip.offsetWidth, Math.max(0, left - tip.offsetWidth / 2)) + 'px'; tip.style.top = '0px';
  };
  const hit = $('#hit');
  hit.addEventListener('pointermove', move); hit.addEventListener('pointerdown', move);
  hit.addEventListener('pointerleave', () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); });
}

/* ---------- actions ---------- */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200); }
const commit = (msg) => { save(); render(); if (msg) toast(msg); };
const findEvent = id => S.events.find(e => e.id === id);

function addEvent(e) { S.events.push({ id: uid(), done: false, time: '', mins: 0, title: '', ...e }); }

function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim()));
}
function normalizeDate(s) {
  s = s.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); // MM/DD/YYYY
  if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${pad(m[1])}-${pad(m[2])}`; }
  const d = new Date(s); return isNaN(d) ? null : iso(d);
}
function importMFP(text) {
  const rows = parseCSV(text); if (rows.length < 2) throw new Error('CSV looks empty');
  const h = rows[0].map(x => x.trim().toLowerCase());
  const col = test => h.findIndex(test);
  const ci = {
    date: col(x => x === 'date' || x.startsWith('date')),
    cal: col(x => x.startsWith('calories') || x === 'energy (kcal)'),
    protein: col(x => x.startsWith('protein')),
    carbs: col(x => x.startsWith('carbohydrates') || x.startsWith('carbs')),
    fat: col(x => x === 'fat' || x.startsWith('fat (') || x.startsWith('total fat')),
  };
  if (ci.date < 0 || ci.cal < 0) throw new Error('Could not find Date / Calories columns — is this the Nutrition Summary CSV?');
  const days = {};
  for (const r of rows.slice(1)) {
    const d = normalizeDate(r[ci.date] || ''); if (!d) continue;
    const t = days[d] || (days[d] = { cal: 0, protein: 0, carbs: 0, fat: 0, src: 'MyFitnessPal' });
    for (const k of ['cal', 'protein', 'carbs', 'fat']) if (ci[k] >= 0) t[k] += num((r[ci[k]] || '').replace(/,/g, ''));
  }
  for (const [d, t] of Object.entries(days)) { for (const k of ['cal', 'protein', 'carbs', 'fat']) t[k] = Math.round(t[k]); S.nutrition[d] = t; }
  return Object.keys(days).length;
}

// In-page confirmation: first tap arms the button, second tap within 3 s runs it.
function armed(el, label = 'Tap again') {
  if (el.dataset.armed) return true;
  const old = el.innerHTML; el.dataset.armed = '1'; el.textContent = label; el.classList.add('armed');
  setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; el.innerHTML = old; el.classList.remove('armed'); } }, 3000);
  return false;
}
async function download(name, text) {
  try {
    const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (dl) { await dl.save({ filename: name, data: text }); return; }
  } catch (e) { if (e && e.code && e.code !== 'unavailable') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const CLICK = {
  go: el => {
    const g = el.dataset.go;
    if (el.dataset.day) ui.gymDay = el.dataset.day;
    const target = document.getElementById(g);
    if (target) { target.scrollIntoView({ block: 'center' }); if (target.focus) target.focus({ preventScroll: true }); return; }
    if (TABS.some(t => t[0] === g)) { ui.tab = g; ui.editRoutine = false; prefSet('tab', g); render(); window.scrollTo(0, 0); }
  },
  fav: el => {
    const fv = S.favorites.find(x => x.id === el.dataset.id); if (!fv) return;
    addFoodItems(ui.date, fv.items.map(i => ({ ...i, id: uid(), meal: el.dataset.meal || i.meal || 'Bedtime' })), 'Favourite');
    commit(`Logged ${fv.name} · ${sum(fv.items.map(i => num(i.cal)))} kcal`);
  },
  favDel: el => { if (armed(el, 'Delete?')) { S.favorites = S.favorites.filter(x => x.id !== el.dataset.id); commit(); } },
  favSave: () => {
    const items = ui.ai.pending || []; if (!items.length) return;
    const typed = $('#favName') ? $('#favName').value.trim() : '';
    const name = (typed || ui.ai.text.trim() || items[0].name).slice(0, 60);
    S.favorites.push({ id: uid(), name, items: items.map(({ id, ...rest }) => rest) });
    commit(`Saved “${name}” to favourites`);
  },
  logMeal: el => {
    ui.ai.meal = el.dataset.meal; ui.ai.pending = null; render();
    const t = $('#aiText'); if (t) { t.scrollIntoView({ block: 'center' }); t.focus(); }
  },
  aiMealClear: () => { ui.ai.meal = ''; render(); },
  shopTab: el => { ui.shopTab = el.dataset.k; render(); },
  supCat: el => { ui.supCat = el.dataset.k; render(); },
  rtCat: el => { ui.rtCat = el.dataset.k; render(); },
  supLow: el => {
    const x = S.supplies.find(v => v.id === el.dataset.id); x.status = x.status === 'low' ? 'ok' : 'low'; x.inCart = false;
    commit(x.status === 'low' ? `${x.name} added to the ${STORE_LABEL[x.store]} list` : `${x.name} taken off the list`);
  },
  supOk: el => { const x = S.supplies.find(v => v.id === el.dataset.id); x.status = 'ok'; x.inCart = false; commit(); },
  supStore: el => { const x = S.supplies.find(v => v.id === el.dataset.id); x.store = STORES[(STORES.indexOf(x.store) + 1) % STORES.length]; commit(`${x.name} → ${STORE_LABEL[x.store]}`); },
  supDel: el => { if (armed(el, 'Delete?')) { S.supplies = S.supplies.filter(v => v.id !== el.dataset.id); commit(); } },
  supAdd: () => {
    const name = $('#supName').value.trim(); if (!name) return toast('Type a name first');
    S.supplies.push({ id: uid(), name, cat: $('#supCatNew').value, store: $('#supStoreNew').value, status: 'ok', inCart: false }); commit(`Added ${name}`);
  },
  extraAdd: el => {
    const st = el.dataset.store; const name = $('#ex_' + st).value.trim(); if (!name) return;
    S.groceries.extras.push({ id: uid(), name, store: st, checked: false }); commit();
  },
  extraDel: el => { S.groceries.extras = S.groceries.extras.filter(x => x.id !== el.dataset.id); commit(); },
  trip: el => {
    const st = el.dataset.store;
    S.supplies.forEach(x => { if (x.store === st && x.status === 'low' && x.inCart) { x.status = 'ok'; x.inCart = false; } });
    S.groceries.extras = S.groceries.extras.filter(x => !(x.store === st && x.checked));
    S.groceries.last[st] = ui.date; commit(`${st === 'Other' ? 'Shopping' : st + ' trip'} logged`);
  },
  aiOut: () => { const i = $('#aiOutText'); if (i) ui.outText = i.value; aiOut(); },
  rtAdd: el => {
    const name = $('#rtNewName').value.trim(); if (!name) return toast('Type a task first');
    S.routines.push({ id: uid(), cat: el.dataset.cat, time: $('#rtNewTime').value || '21:00', name, days: [], weeks: 'all', monthly: false, streak: true }); commit('Task added');
  },
  rtDel: el => { if (armed(el, 'Delete?')) { S.routines = S.routines.filter(r => r.id !== el.dataset.id); commit(); } },
  rtDay: el => {
    const r = S.routines.find(x => x.id === el.dataset.id); const d = +el.dataset.d;
    let days = r.days.length ? [...r.days] : [0, 1, 2, 3, 4, 5, 6];
    days = days.includes(d) ? days.filter(x => x !== d) : [...days, d];
    if (!days.length) return toast('Pick at least one day');
    r.days = days.length === 7 ? [] : days.sort(); commit();
  },
  rangeAdd: () => {
    const a = $('#rangeStart').value, b = $('#rangeEnd').value;
    if (!a || !b || b < a) return toast('Pick a first and last day');
    S.hockey.ranges.push({ start: a, end: b }); S.hockey.ranges.sort((x, y) => x.start.localeCompare(y.start)); commit('Hockey dates added');
  },
  rangeDel: el => { if (armed(el, 'Remove?')) { S.hockey.ranges.splice(+el.dataset.i, 1); commit(); } },
  tab: el => { ui.tab = el.dataset.tab; ui.editRoutine = false; prefSet('tab', ui.tab); render(); window.scrollTo(0, 0); },
  day: el => { const n = +el.dataset.n; ui.date = n === 0 ? todayISO() : addDays(ui.date, n); ui.gymDay = null; render(); },
  water: el => { S.water[ui.date] = Math.max(0, (S.water[ui.date] || 0) + +el.dataset.n); commit(); },
  logWeight: el => {
    const v = num($('#' + el.dataset.src).value); const date = el.dataset.date ? $('#' + el.dataset.date).value : ui.date;
    if (!v || !date) return toast('Enter a weight');
    S.weights = S.weights.filter(w => w.date !== date); S.weights.push({ date, value: v }); commit(`Saved ${v} ${U()}`);
  },
  weightDel: el => { S.weights = S.weights.filter(w => w.date !== el.dataset.date); commit(); },
  saveNut: () => {
    const prev = S.nutrition[ui.date];
    S.nutrition[ui.date] = { cal: num($('#n_cal').value), protein: num($('#n_protein').value), carbs: num($('#n_carbs').value), fat: num($('#n_fat').value), src: 'Manual', items: (prev && prev.items) || [] };
    commit('Saved');
  },
  aiEstimate: () => aiEstimate(),
  aiDiscard: () => { ui.ai.pending = null; ui.ai.note = ''; render(); },
  aiItemDel: el => { ui.ai.pending = ui.ai.pending.filter(i => i.id !== el.dataset.id); if (!ui.ai.pending.length) ui.ai.pending = null; render(); },
  aiPhotoClear: () => { ui.ai.photo = null; render(); },
  aiAdd: () => {
    const items = ui.ai.pending || []; if (!items.length) return;
    addFoodItems(ui.date, items, 'AI');
    const kcal = sum(items.map(i => i.cal));
    ui.ai.pending = null; ui.ai.note = ''; ui.ai.text = ''; ui.ai.photo = null; ui.ai.meal = '';
    commit(`Added ${items.length} item${items.length > 1 ? 's' : ''} · ${kcal} kcal`);
  },
  foodDel: el => {
    const n = S.nutrition[ui.date]; const it = n && (n.items || []).find(i => i.id === el.dataset.id); if (!it) return;
    n.items = n.items.filter(i => i !== it);
    for (const k of MACROS) n[k] = Math.max(0, Math.round(num(n[k]) - num(it[k])));
    commit(`Removed ${it.name}`);
  },
  clearNut: () => { delete S.nutrition[ui.date]; commit(); },
  editRoutine: () => { ui.editRoutine = !ui.editRoutine; render(); },
  gymClear: el => {
    const dayId = ui.gymDay || gymDayFor(ui.date) || S.gym.split[0]?.id;
    if (armed(el)) { delete S.gym.logs[`${ui.date}|${dayId}`]; commit(); }
  },
  exAdd: el => { splitById(el.dataset.day).exercises.push({ id: uid(), name: 'New exercise', sets: 3, repMin: 8, repMax: 12, inc: 5 }); commit(); },
  exDel: el => { const d = splitById(el.dataset.day); d.exercises = d.exercises.filter(e => e.id !== el.dataset.ex); commit(); },
  dayAdd: () => { S.gym.split.push({ id: uid(), name: 'New day', exercises: [] }); commit(); },
  dayDel: el => {
    if (!armed(el)) return;
    S.gym.split = S.gym.split.filter(d => d.id !== el.dataset.day);
    for (const k of Object.keys(S.gym.schedule)) if (S.gym.schedule[k] === el.dataset.day) delete S.gym.schedule[k];
    commit();
  },
  addEvent: () => {
    const date = $('#ev_date').value; if (!date) return toast('Pick a date');
    const reps = Math.max(1, Math.min(26, num($('#ev_rep').value) || 1));
    for (let i = 0; i < reps; i++) addEvent({ date: addDays(date, i * 7), type: $('#ev_type').value, time: $('#ev_time').value, mins: num($('#ev_mins').value), title: $('#ev_title').value.trim() });
    commit(reps > 1 ? `Added ${reps} weekly sessions` : 'Added');
  },
  eventDel: el => { S.events = S.events.filter(e => e.id !== el.dataset.id); commit(); },
  macroCalc: () => {
    const s = S.settings; s.fat = Math.round((s.calories * 0.25) / 9);
    s.carbs = Math.max(0, Math.round((s.calories - s.protein * 4 - s.fat * 9) / 4)); commit('Macros updated');
  },
  export: () => download(`life-tracker-backup-${todayISO()}.json`, JSON.stringify(S, null, 2)),
  reset: el => { if (armed(el, 'Tap again to erase everything')) { S = defaults(); commit('Reset'); } },
};

const CHANGE = {
  chk: el => {
    const c = S.checks[ui.date] || (S.checks[ui.date] = {});
    if (el.checked) c[el.dataset.key] = true; else delete c[el.dataset.key];
    if (!Object.keys(c).length) delete S.checks[ui.date];
    commit();
  },
  cart: el => {
    const x = el.dataset.kind === 'supply' ? S.supplies.find(v => v.id === el.dataset.id) : S.groceries.extras.find(v => v.id === el.dataset.id);
    if (!x) return; if (el.dataset.kind === 'supply') x.inCart = el.checked; else x.checked = el.checked; commit();
  },
  rtField: el => {
    const r = S.routines.find(x => x.id === el.dataset.id); const f = el.dataset.f;
    if (f === 'monthly' || f === 'streak') r[f] = el.checked;
    else if (f === 'name') r.name = el.value.trim() || r.name;
    else if (f === 'time') { if (el.value) r.time = el.value; }
    else r[f] = el.value;
    commit();
  },
  streakCat: el => { S.settings.streakCats = { ...STREAK_DEFAULTS, ...S.settings.streakCats, [el.dataset.k]: el.checked }; commit(); },
  eventDone: el => { findEvent(el.dataset.id).done = el.checked; commit(); },
  gymDay: el => { ui.gymDay = el.value; render(); },
  set: el => {
    const dayId = ui.gymDay || gymDayFor(ui.date) || S.gym.split[0]?.id; const key = `${ui.date}|${dayId}`;
    const log = S.gym.logs[key] || (S.gym.logs[key] = { date: ui.date, dayId, entries: {} });
    const sets = log.entries[el.dataset.ex] || (log.entries[el.dataset.ex] = []);
    const i = +el.dataset.i; sets[i] = { ...(sets[i] || {}), [el.dataset.f]: el.value === '' ? '' : num(el.value) };
    for (let j = 0; j < sets.length; j++) if (!sets[j]) sets[j] = {};
    // auto-fill the weight of later empty sets for speed
    if (el.dataset.f === 'w' && el.value !== '') {
      const ex = splitById(dayId).exercises.find(e => e.id === el.dataset.ex);
      for (let j = i + 1; j < ex.sets; j++) {
        sets[j] = sets[j] || {};
        if (sets[j].w === undefined || sets[j].w === '') {
          sets[j].w = num(el.value);
          const inp = document.querySelector(`[data-act=set][data-ex="${el.dataset.ex}"][data-i="${j}"][data-f=w]`);
          if (inp) inp.value = sets[j].w;
        }
      }
    }
    save(); // no re-render so focus stays in the set inputs
  },
  sched: el => { if (el.value) S.gym.schedule[el.dataset.dow] = el.value; else delete S.gym.schedule[el.dataset.dow]; commit(); },
  dayName: el => { splitById(el.dataset.day).name = el.value.trim() || 'Day'; commit(); },
  exf: el => {
    const ex = splitById(el.dataset.day).exercises.find(e => e.id === el.dataset.ex);
    ex[el.dataset.f] = el.dataset.f === 'name' ? el.value : Math.max(0, num(el.value));
    if (el.dataset.f !== 'name' && el.dataset.f !== 'inc') ex[el.dataset.f] = Math.max(1, Math.round(ex[el.dataset.f]));
    if (ex.repMax < ex.repMin) ex.repMax = ex.repMin; commit();
  },
  meal: el => { (S.meals.plan[el.dataset.dow] = S.meals.plan[el.dataset.dow] || [])[+el.dataset.i] = el.value; commit(); },
  mealKcal: el => { if (el.value === '') delete S.meals.kcal[el.dataset.k]; else S.meals.kcal[el.dataset.k] = num(el.value); commit(); },
  aiField: el => { const it = (ui.ai.pending || []).find(i => i.id === el.dataset.id); if (it) { it[el.dataset.k] = Math.max(0, Math.round(num(el.value))); render(); } },
  setting: el => { const k = el.dataset.k; S.settings[k] = ['unit', 'theme', 'wake'].includes(k) ? el.value : num(el.value); commit(); },
  chartDays: el => { ui.chartDays = +el.value; render(); },
};

// Errors show on screen so a broken button is visible instead of silent
function showError(msg) {
  let b = document.getElementById('errbar');
  if (!b) { b = document.createElement('div'); b.id = 'errbar'; b.setAttribute('role', 'alert'); document.body.appendChild(b); b.addEventListener('click', () => { b.hidden = true; }); }
  b.textContent = `⚠️ Something went wrong: ${msg}. Screenshot this for Claude. (Tap to hide)`; b.hidden = false;
}
window.addEventListener('error', e => showError(e.message || 'unknown error'));
window.addEventListener('unhandledrejection', e => showError((e.reason && (e.reason.message || e.reason.code)) || 'unknown error'));

// Buttons: handle the click, and fall back to the touch itself if a phone never delivers the click
let lastAct = { sig: '', at: 0 }, touch = null;
const actSig = el => el.dataset.act + '|' + JSON.stringify(el.dataset);
function runAct(el) {
  const sig = actSig(el); const now = Date.now();
  if (lastAct.sig === sig && now - lastAct.at < 700) return; // same tap already handled
  lastAct = { sig, at: now };
  try { CLICK[el.dataset.act](el); } catch (e) { showError(e.message); }
}
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]'); if (!el || !CLICK[el.dataset.act]) return;
  if (el.tagName === 'A') ev.preventDefault();
  runAct(el);
});
document.addEventListener('touchstart', ev => { const t = ev.touches[0]; touch = t ? { x: t.clientX, y: t.clientY } : null; }, { passive: true });
document.addEventListener('touchend', ev => {
  const el = ev.target.closest && ev.target.closest('[data-act]'); const t = ev.changedTouches[0];
  if (!el || !CLICK[el.dataset.act] || !touch || !t) return;
  if (Math.abs(t.clientX - touch.x) > 10 || Math.abs(t.clientY - touch.y) > 10) return; // a scroll, not a tap
  const started = Date.now();
  setTimeout(() => { if (lastAct.at < started && el.isConnected) runAct(el); }, 450);
}, { passive: true });
document.addEventListener('change', async ev => {
  const el = ev.target;
  if (el.id === 'mfpFile' && el.files[0]) {
    try { const n = importMFP(await el.files[0].text()); commit(`Imported ${n} day(s) from MyFitnessPal`); } catch (e) { toast('Import failed: ' + e.message); }
    return;
  }
  if (el.id === 'aiPhoto' && el.files[0]) { ui.ai.photo = el.files[0]; render(); return; }
  if (el.id === 'importFile' && el.files[0]) {
    try { const data = JSON.parse(await el.files[0].text()); if (!data.settings) throw new Error('not a Life Tracker backup'); S = migrate(data); commit('Backup restored'); } catch (e) { toast('Import failed: ' + e.message); }
    return;
  }
  if (el.dataset.act && CHANGE[el.dataset.act]) { try { CHANGE[el.dataset.act](el); } catch (e) { showError(e.message); } }
});
document.addEventListener('input', ev => { if (ev.target.id === 'aiText') ui.ai.text = ev.target.value; if (ev.target.id === 'aiOutText') ui.outText = ev.target.value; });
document.addEventListener('keydown', ev => {
  if (ev.target.id === 'aiText' && ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); aiEstimate(); return; }
  if (ev.target.id === 'aiOutText' && ev.key === 'Enter') { ev.preventDefault(); ui.outText = ev.target.value; aiOut(); return; }
  if (ev.key === 'Enter' && ev.target.matches('input[type=text], input[type=number]')) ev.target.blur(); });

render();
cloudInit();
aiInit();
