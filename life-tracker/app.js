/* Life Tracker — all data lives in this browser's localStorage. Use Settings → Export to back up. */
'use strict';

const KEY = 'lifeTracker.v1';
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const STORES = ['Sobeys', 'Costco'];
const TASK_CATS = {
  skin: { label: 'Skin', icon: '🧴' },
  hair: { label: 'Hair', icon: '💇' },
  cleaning: { label: 'Cleaning', icon: '🧽' },
  laundry: { label: 'Laundry', icon: '🧺' },
};
const EVENT_TYPES = {
  game: { label: 'Hockey game', icon: '🏒' },
  practice: { label: 'Hockey practice', icon: '🥅' },
  skate: { label: 'Skate / stick & puck', icon: '⛸️' },
  conditioning: { label: 'Hockey conditioning', icon: '⚡' },
  cardio: { label: 'Cardio', icon: '🚴' },
};
const TABS = [
  ['today', 'Today'], ['food', 'Nutrition'], ['gym', 'Gym'], ['cardio', 'Cardio & Hockey'],
  ['meals', 'Meals & Groceries'], ['routines', 'Routines'], ['progress', 'Weight'], ['settings', 'Settings'],
];

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
function nextMonday(from) { let d = addDays(from, 1); while (dowOf(d) !== 1) d = addDays(d, 1); return d; }
function firstMondayOfNextMonth(from) {
  const d = parseISO(from); const first = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  let s = iso(first); while (dowOf(s) !== 1) s = addDays(s, 1); return s;
}

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
  const task = (cat, name, freq, when = '') => ({ id: uid(), cat, name, freq, when, history: [] });
  const item = (name, store, staple = false) => ({ id: uid(), name, store, qty: '', staple, checked: false });
  const t = todayISO();
  return {
    version: 1,
    settings: {
      unit: 'lb', calories: 3200, protein: 180, carbs: 380, fat: 95,
      waterTarget: 3500, goalWeight: 0, weeklyGain: 0.5, theme: 'auto',
    },
    nutrition: {},   // date -> {cal, protein, carbs, fat, src}
    water: {},       // date -> ml
    weights: [],     // [{date, value}]
    gym: {
      split: [
        { id: 'upA', name: 'Upper A — Strength', exercises: [
          ex('Bench Press', 3, 5, 8), ex('Barbell Row', 3, 6, 10), ex('Overhead Press', 3, 6, 10),
          ex('Lat Pulldown', 3, 8, 12), ex('Incline DB Curl', 2, 10, 15), ex('Triceps Pushdown', 2, 10, 15)] },
        { id: 'loA', name: 'Lower A — Squat', exercises: [
          ex('Back Squat', 3, 5, 8, 10), ex('Romanian Deadlift', 3, 8, 10, 10), ex('Bulgarian Split Squat', 3, 8, 12),
          ex('Lateral Lunge', 2, 8, 12), ex('Standing Calf Raise', 3, 10, 15, 10), ex('Hanging Leg Raise', 3, 10, 15, 0)] },
        { id: 'upB', name: 'Upper B — Hypertrophy', exercises: [
          ex('Incline DB Press', 3, 8, 12), ex('Weighted Pull-up', 3, 6, 10), ex('Seated Cable Row', 3, 10, 12),
          ex('DB Lateral Raise', 3, 12, 20), ex('Face Pull', 2, 12, 20), ex('Hammer Curl', 2, 10, 15), ex('Overhead Triceps Ext', 2, 10, 15)] },
        { id: 'loB', name: 'Lower B — Hinge & Power', exercises: [
          ex('Trap Bar Deadlift', 3, 4, 6, 10), ex('Box Jump', 3, 5, 5, 0), ex('Leg Press', 3, 10, 15, 10),
          ex('Lying Leg Curl', 3, 10, 15), ex('Copenhagen Plank (sec)', 2, 20, 40, 0), ex('Pallof Press', 2, 10, 15)] },
      ],
      schedule: { 1: 'upA', 2: 'loA', 4: 'upB', 5: 'loB' }, // weekday -> split day id
      logs: {}, // `${date}|${dayId}` -> {date, dayId, entries: {exId: [{w, r}]}}
    },
    events: [], // cardio + hockey: {id, date, time, type, title, mins, done, block}
    meals: {
      plan: {
        1: ['Oats + whey + PB + banana', 'Chicken, rice & veg', 'Ground beef pasta', 'Greek yogurt + granola, mass shake'],
        2: ['Eggs (4) + bagel + OJ', 'Leftover pasta', 'Salmon, potatoes & greens', 'PB bagel, milk'],
        3: ['Oats + whey + PB + banana', 'Chicken wrap ×2', 'Steak, rice & veg', 'Trail mix, mass shake'],
        4: ['Eggs (4) + bagel + OJ', 'Chicken, rice & veg', 'Turkey chili + rice', 'Greek yogurt + granola'],
        5: ['Oats + whey + PB + banana', 'Turkey chili leftovers', 'Homemade burgers + fries', 'PB bagel, milk'],
        6: ['Breakfast burritos', 'Sandwich + fruit', 'Pre-game: chicken pasta', 'Chocolate milk post-game'],
        0: ['Pancakes + eggs + bacon', 'Leftovers', 'Roast chicken, potatoes, veg (meal prep)', 'Mass shake'],
      },
      kcal: {}, // `${dow}|${slot}` -> number
    },
    groceries: {
      items: [
        item('Chicken breast (bulk)', 'Costco', true), item('Lean ground beef', 'Costco', true), item('Eggs (5 dozen)', 'Costco', true),
        item('Jasmine rice', 'Costco'), item('Large-flake oats', 'Costco'), item('Whey protein', 'Costco'),
        item('Peanut butter', 'Costco'), item('Greek yogurt', 'Costco', true), item('Frozen berries', 'Costco'),
        item('Bagels', 'Costco', true), item('Salmon fillets', 'Costco'), item('Trail mix', 'Costco'),
        item('Milk (4L)', 'Sobeys', true), item('Bananas', 'Sobeys', true), item('Bread / wraps', 'Sobeys', true),
        item('Fresh vegetables', 'Sobeys', true), item('Potatoes', 'Sobeys'), item('Pasta + sauce', 'Sobeys'),
        item('Orange juice', 'Sobeys'), item('Cheese', 'Sobeys'),
      ],
      schedule: { Sobeys: { dow: 0, everyWeeks: 1, last: '' }, Costco: { dow: 6, everyWeeks: 2, last: '' } },
    },
    tasks: [
      task('skin', 'Gentle cleanser', 1, 'AM'), task('skin', 'Moisturizer', 1, 'AM'), task('skin', 'Sunscreen SPF 30+', 1, 'AM'),
      task('skin', 'Cleanser (post-gym/hockey)', 1, 'PM'), task('skin', 'Treatment (e.g. niacinamide)', 1, 'PM'), task('skin', 'Moisturizer', 1, 'PM'),
      task('skin', 'Exfoliate', 4), task('hair', 'Shampoo + conditioner', 2), task('hair', 'Style product / leave-in', 1, 'AM'),
      task('hair', 'Haircut', 28),
      task('cleaning', 'Dishes / dishwasher', 1), task('cleaning', 'Wipe kitchen counters', 1), task('cleaning', 'Take out garbage & recycling', 7),
      task('cleaning', 'Vacuum', 7), task('cleaning', 'Clean bathroom', 7), task('cleaning', 'Fridge clean-out (before groceries)', 7),
      task('cleaning', 'Mop floors', 14), task('cleaning', 'Dust surfaces', 14), task('cleaning', 'Clean microwave & stove', 14),
      task('laundry', 'Gym clothes', 3), task('laundry', 'Darks', 7), task('laundry', 'Whites & towels', 7),
      task('laundry', 'Bedsheets', 14), task('laundry', 'Air out hockey gear (after every skate)', 1), task('laundry', 'Wash hockey base layers & jersey', 7),
      task('laundry', 'Deep wash hockey gear', 30),
    ],
    created: t,
  };
}

function migrate(s) {
  const d = defaults();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.settings = { ...d.settings, ...s.settings };
  s.gym = { ...d.gym, ...s.gym };
  s.meals = { ...d.meals, ...s.meals };
  s.groceries = { ...d.groceries, ...s.groceries };
  return s;
}
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) { /* fall through */ }
  return defaults();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('⚠️ Could not save — browser storage is blocked'); }
}
function prefGet(k, d) { try { return localStorage.getItem('lifeTracker.ui.' + k) ?? d; } catch (e) { return d; } }
function prefSet(k, v) { try { localStorage.setItem('lifeTracker.ui.' + k, v); } catch (e) { /* ignore */ } }

let S = load();
const ui = { tab: prefGet('tab', 'today'), date: todayISO(), gymDay: null, editRoutine: false, chartDays: 90 };

/* ---------- domain logic ---------- */
const U = () => S.settings.unit;
const nut = d => S.nutrition[d] || { cal: 0, protein: 0, carbs: 0, fat: 0 };

// Routine tasks: history is a list of dates done.
function taskStatus(t, date) {
  const doneToday = t.history.includes(date);
  const prior = t.history.filter(h => h < date).sort();
  const last = prior[prior.length - 1] || '';
  const since = last ? diffDays(date, last) : Infinity;
  const due = !doneToday && since >= t.freq;
  const overdue = due && last ? since - t.freq : 0;
  const nextIn = last && !due ? t.freq - since : 0;
  return { doneToday, last, due, overdue, nextIn };
}
function taskPill(t, st) {
  if (st.doneToday) return '<span class="pill good">Done ✓</span>';
  if (st.due && st.overdue > 0) return `<span class="pill bad">Overdue ${st.overdue}d</span>`;
  if (st.due) return '<span class="pill warn">Due</span>';
  return `<span class="pill">in ${st.nextIn}d</span>`;
}
const freqLabel = f => f === 1 ? 'Daily' : f === 7 ? 'Weekly' : f === 14 ? 'Every 2 wks' : f === 30 ? 'Monthly' : `Every ${f}d`;

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

// Groceries
function nextTrip(store, from) {
  const sc = S.groceries.schedule[store];
  for (let i = 0; i < 70; i++) {
    const d = addDays(from, i);
    if (dowOf(d) !== +sc.dow) continue;
    if (!sc.last || diffDays(d, sc.last) >= sc.everyWeeks * 7 - 3) return d;
  }
  return null;
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
function render() {
  document.documentElement.dataset.theme = S.settings.theme === 'auto' ? '' : S.settings.theme;
  if (S.settings.theme === 'auto') delete document.documentElement.dataset.theme;
  const isToday = ui.date === todayISO();
  $('#app').innerHTML = `
    <header class="top">
      <div class="top-row">
        <h1>🏒 Life Tracker</h1>
        <div class="datenav">
          <button class="icon-btn" data-act="day" data-n="-1" aria-label="Previous day">◀</button>
          <span class="label">${isToday ? 'Today' : fmtDate(ui.date)}</span>
          <button class="icon-btn" data-act="day" data-n="1" aria-label="Next day">▶</button>
          ${isToday ? '' : '<button class="btn sm" data-act="day" data-n="0">Today</button>'}
        </div>
      </div>
      <nav class="tabs">${TABS.map(([k, l]) => `<button data-act="tab" data-tab="${k}" class="${ui.tab === k ? 'on' : ''}">${l}</button>`).join('')}</nav>
    </header>
    <main>${VIEWS[ui.tab]()}</main>`;
  if (ui.tab === 'progress') mountChart();
}

function meter(label, val, target, unit = '', cls = '') {
  const pct = target ? Math.min(100, (val / target) * 100) : 0;
  const state = cls || (target && val >= target * 0.95 ? 'good' : '');
  return `<div class="meter"><div class="lbl"><span>${label}</span><span><b>${round(val, 0)}</b> / ${round(target, 0)}${unit}</span></div>
    <div class="bar ${state}"><span style="width:${pct}%"></span></div></div>`;
}

function waterCard() {
  const ml = S.water[ui.date] || 0; const tgt = S.settings.waterTarget;
  return `<div class="card"><h2>💧 Water <span class="muted small">${round(ml / 1000, 2)} / ${round(tgt / 1000, 1)} L</span></h2>
    ${meter('Today', ml, tgt, ' ml')}
    <div class="row">
      <button class="btn" data-act="water" data-n="250">+250 ml</button>
      <button class="btn" data-act="water" data-n="500">+500 ml</button>
      <button class="btn" data-act="water" data-n="1000">+1 L</button>
      <button class="btn ghost" data-act="water" data-n="-250">−250</button>
    </div>
    <p class="muted small">Tip: add ~500–750 ml for every hour of hockey or hard cardio.</p></div>`;
}

function macroCard(compact) {
  const n = nut(ui.date), s = S.settings;
  return `<div class="card"><h2>🍽️ Calories & macros ${n.src ? `<span class="pill accent">${esc(n.src)}</span>` : ''}</h2>
    ${meter('Calories', n.cal, s.calories, ' kcal')}
    ${meter('Protein', n.protein, s.protein, ' g')}
    ${meter('Carbs', n.carbs, s.carbs, ' g')}
    ${meter('Fat', n.fat, s.fat, ' g')}
    ${n.cal && n.cal < s.calories ? `<p class="small">Still need <b>${round(s.calories - n.cal, 0)} kcal</b> and <b>${round(Math.max(0, s.protein - n.protein), 0)} g protein</b> to hit your bulk target.</p>` : ''}
    ${compact ? '<button class="btn sm" data-act="tab" data-tab="food">Log from MyFitnessPal →</button>' : ''}</div>`;
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

function taskRows(tasks, date) {
  if (!tasks.length) return '<p class="muted small">Nothing here.</p>';
  return tasks.map(t => {
    const st = taskStatus(t, date);
    return `<label class="check ${st.doneToday ? 'done' : ''}">
      <input type="checkbox" data-act="task" data-id="${t.id}" ${st.doneToday ? 'checked' : ''}>
      <span class="name">${t.when ? `<span class="pill">${t.when}</span> ` : ''}${esc(t.name)}</span>${taskPill(t, st)}</label>`;
  }).join('');
}

const VIEWS = {
  today() {
    const d = ui.date, dow = dowOf(d);
    const dayId = gymDayFor(d); const day = dayId && splitById(dayId);
    const events = S.events.filter(e => e.date === d).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const hasGame = events.some(e => e.type === 'game' || e.type === 'practice');
    const lowerDay = day && /lower|leg|squat|hinge/i.test(day.name);
    const due = S.tasks.filter(t => { const st = taskStatus(t, d); return st.due || st.doneToday; });
    const trips = STORES.filter(s => nextTrip(s, d) === d);
    const meals = S.meals.plan[dow] || [];
    const logged = dayId && S.gym.logs[`${d}|${dayId}`];
    const w = S.weights.find(x => x.date === d);
    return `<div class="grid">
      ${macroCard(true)}
      ${waterCard()}
      <div class="card"><h2>🏋️ Gym <span class="pill ${logged ? 'good' : ''}">${logged ? 'Logged' : DOW_LONG[dow]}</span></h2>
        ${day ? `<p><b>${esc(day.name)}</b> · ${day.exercises.length} exercises</p>
          ${lowerDay && hasGame ? '<div class="note warn">Hockey today + lower-body day — lift in the morning, keep sets 1–2 reps shy of failure, or swap with an upper day.</div>' : ''}
          <button class="btn primary" data-act="tab" data-tab="gym">Open workout →</button>`
        : '<p class="muted">Rest day from lifting. Mobility + a walk is a great call.</p><button class="btn sm" data-act="tab" data-tab="gym">Log a session anyway</button>'}
      </div>
      <div class="card"><h2>🏒 Cardio & hockey</h2>
        ${events.length ? events.map(e => eventRow(e, false)).join('') : '<p class="muted">Nothing scheduled.</p>'}
        <button class="btn sm" data-act="tab" data-tab="cardio">Schedule →</button></div>
      <div class="card"><h2>⚖️ Weigh-in</h2>
        <div class="row"><input type="number" step="0.1" id="todayWeight" placeholder="${U()}" value="${w ? w.value : ''}">
          <button class="btn primary" data-act="logWeight" data-src="todayWeight">Save</button></div>
        <p class="muted small">Weigh in each morning after the bathroom, before eating. The 7-day average matters, not single days.</p></div>
      <div class="card"><h2>🥗 Today's meals</h2>
        ${MEAL_SLOTS.map((s, i) => `<div class="row small"><span class="muted" style="width:70px">${s}</span><span>${esc(meals[i] || '—')}</span></div>`).join('')}
        ${trips.length ? `<div class="note">🛒 Grocery day: <b>${trips.join(' + ')}</b>. <a href="#" data-act="tab" data-tab="meals">Open list</a></div>` : ''}</div>
      <div class="card wide"><h2>✅ Routines due today <span class="muted small">${due.filter(t => t.history.includes(d)).length}/${due.length} done</span></h2>
        <div class="grid">${Object.entries(TASK_CATS).map(([k, c]) => {
          const list = due.filter(t => t.cat === k);
          return list.length ? `<div><h3>${c.icon} ${c.label}</h3>${taskRows(list, d)}</div>` : '';
        }).join('') || '<p class="muted">All caught up 🎉</p>'}</div></div>
    </div>`;
  },

  food() {
    const n = nut(ui.date), s = S.settings;
    const days = Array.from({ length: 14 }, (_, i) => addDays(ui.date, -i));
    const logged = days.filter(d => S.nutrition[d] && S.nutrition[d].cal);
    const avg = k => logged.length ? sum(logged.slice(0, 7).map(d => S.nutrition[d][k])) / Math.min(7, logged.length) : 0;
    return `<div class="grid">
      ${macroCard(false)}
      <div class="card"><h2>✏️ Enter totals for ${fmtDate(ui.date)}</h2>
        <p class="muted small">Copy the daily totals from MyFitnessPal's Diary (bottom of the day) — or import a CSV below.</p>
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
    const d = ui.date; const ws = startOfWeek(d);
    const upcoming = S.events.filter(e => e.date >= d && diffDays(e.date, d) <= 35).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    const past = S.events.filter(e => e.date < d && diffDays(d, e.date) <= 14).sort((a, b) => b.date.localeCompare(a.date));
    const week = S.events.filter(e => e.date >= ws && e.date < addDays(ws, 7));
    const ice = week.filter(e => ['game', 'practice', 'skate'].includes(e.type)).length;
    const mins = sum(week.filter(e => e.done).map(e => num(e.mins)));
    const blockStart = firstMondayOfNextMonth(todayISO());
    return `<div class="grid">
      <div class="card"><h2>This week <span class="muted small">from ${fmtDate(ws)}</span></h2>
        <div class="stat-row"><div class="stat"><div class="k">On-ice sessions</div><div class="v">${ice}</div></div>
          <div class="stat"><div class="k">Minutes done</div><div class="v">${mins}</div></div>
          <div class="stat"><div class="k">Planned</div><div class="v">${week.length}</div></div></div>
        <p class="muted small">You're bulking: every 30 min of hard hockey burns ~300–450 kcal. Eat it back — add a snack on game/practice days.</p></div>
      <div class="card"><h2>➕ Add session / game</h2>
        <div class="stack">
          <div class="row"><select id="ev_type">${Object.entries(EVENT_TYPES).map(([k, t]) => `<option value="${k}">${t.icon} ${t.label}</option>`).join('')}</select></div>
          <div class="row"><input type="date" id="ev_date" value="${d}"><input type="time" id="ev_time"><input type="number" id="ev_mins" placeholder="min" class="w-sm"></div>
          <input type="text" id="ev_title" class="w-full" placeholder="Notes (rink, opponent, workout…)">
          <div class="row"><label class="small">Repeat weekly for <input type="number" id="ev_rep" value="1" min="1" max="26" class="w-sm"> weeks</label>
            <span class="spacer"></span><button class="btn primary" data-act="addEvent">Add</button></div>
        </div></div>
      <div class="card"><h2>⚡ Hockey training block</h2>
        <p class="small">Generates a 4-week pre-season conditioning block (Base → Build → Peak → Deload) on Wed / Sat / Sun so it doesn't clash with lifting days: bike intervals that mimic 30–45 s shifts, agility + sprints, and zone-2 aerobic work.</p>
        <div class="row"><label class="small">Start Monday <input type="date" id="blockStart" value="${blockStart}"></label>
          <button class="btn primary" data-act="genBlock">Generate</button></div>
        ${S.events.some(e => e.block) ? '<button class="btn ghost danger sm" data-act="clearBlock" style="margin-top:6px">Remove generated block</button>' : ''}</div>
      <div class="card wide"><h2>📅 Next 5 weeks</h2>${upcoming.map(e => eventRow(e)).join('') || '<p class="muted">Nothing scheduled. Add your hockey games/practices above.</p>'}</div>
      <div class="card wide"><h2>🕘 Last 2 weeks</h2>${past.map(e => eventRow(e)).join('') || '<p class="muted">No past sessions.</p>'}</div>
    </div>`;
  },

  meals() {
    const today = dowOf(ui.date);
    const order = [1, 2, 3, 4, 5, 6, 0];
    const g = S.groceries;
    return `<div class="grid">
      <div class="card wide"><h2>🥗 Weekly meal plan <span class="muted small">kcal per meal optional</span></h2>
        ${order.map(dw => { const p = S.meals.plan[dw] || [];
          const tot = sum(MEAL_SLOTS.map(s => num(S.meals.kcal[`${dw}|${s}`])));
          return `<div class="meal-day ${dw === today ? 'today' : ''}"><div class="row between"><b>${DOW_LONG[dw]}</b>
            ${tot ? `<span class="pill ${tot >= S.settings.calories * 0.95 ? 'good' : 'warn'}">${tot} / ${S.settings.calories} kcal</span>` : ''}</div>
            <div class="meal-slots">${MEAL_SLOTS.map((s, i) => `<div class="meal-slot"><span>${s}</span>
              <input type="text" data-act="meal" data-dow="${dw}" data-i="${i}" value="${esc(p[i] || '')}">
              <input type="number" data-act="mealKcal" data-k="${dw}|${s}" value="${S.meals.kcal[`${dw}|${s}`] || ''}" placeholder="kcal"></div>`).join('')}</div></div>`;
        }).join('')}</div>
      ${STORES.map(store => {
        const sc = g.schedule[store]; const nt = nextTrip(store, ui.date);
        const items = g.items.filter(i => i.store === store);
        return `<div class="card"><h2>🛒 ${store} <span class="pill accent">Next: ${nt ? (nt === ui.date ? 'Today' : fmtDate(nt)) : '—'}</span></h2>
          <div class="row small">Every <input type="number" class="w-sm" min="1" max="8" data-act="storeEvery" data-store="${store}" value="${sc.everyWeeks}"> week(s) on
            <select data-act="storeDow" data-store="${store}">${DOW_LONG.map((n, i) => `<option value="${i}" ${+sc.dow === i ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <p class="muted small">Last trip: ${sc.last ? fmtDate(sc.last) : 'not logged yet'}</p>
          ${items.map(i => `<div class="check ${i.checked ? 'done' : ''}">
            <input type="checkbox" data-act="gItem" data-id="${i.id}" ${i.checked ? 'checked' : ''}>
            <span class="name">${esc(i.name)}${i.qty ? ` <span class="muted small">× ${esc(i.qty)}</span>` : ''}${i.staple ? ' <span class="pill">staple</span>' : ''}</span>
            <button class="icon-btn" data-act="gMove" data-id="${i.id}" title="Move to other store">⇄</button>
            <button class="icon-btn" data-act="gDel" data-id="${i.id}" aria-label="Delete">✕</button></div>`).join('') || '<p class="muted small">List is empty.</p>'}
          <div class="row" style="margin-top:8px"><input type="text" id="gi_${store}" placeholder="Add item" style="flex:1"><input type="text" id="gq_${store}" placeholder="qty" class="w-sm">
            <label class="small"><input type="checkbox" id="gs_${store}"> staple</label><button class="btn" data-act="gAdd" data-store="${store}">Add</button></div>
          <button class="btn primary" style="margin-top:8px" data-act="trip" data-store="${store}">✓ Finished ${store} trip</button>
          <p class="muted small">Finishing a trip clears checked items, resets staples (they come back every trip) and logs the date.</p></div>`;
      }).join('')}
    </div>`;
  },

  routines() {
    const d = ui.date;
    return `<div class="grid">${Object.entries(TASK_CATS).map(([k, c]) => {
      const list = S.tasks.filter(t => t.cat === k);
      return `<div class="card"><h2>${c.icon} ${c.label}</h2>
        ${list.map(t => { const st = taskStatus(t, d);
          return `<div class="check ${st.doneToday ? 'done' : ''}">
            <input type="checkbox" data-act="task" data-id="${t.id}" ${st.doneToday ? 'checked' : ''}>
            <span class="name">${t.when ? `<span class="pill">${t.when}</span> ` : ''}${esc(t.name)}<br><span class="muted small">${freqLabel(t.freq)}${st.last ? ` · last ${fmtDate(st.last)}` : ''}</span></span>
            ${taskPill(t, st)}<button class="icon-btn" data-act="taskDel" data-id="${t.id}" aria-label="Delete">✕</button></div>`; }).join('')}
        <div class="row" style="margin-top:8px"><input type="text" id="tn_${k}" placeholder="New task" style="flex:1">
          <label class="small">every <input type="number" id="tf_${k}" value="${k === 'skin' ? 1 : 7}" min="1" class="w-sm"> d</label>
          ${k === 'skin' || k === 'hair' ? `<select id="tw_${k}"><option value="">Any</option><option>AM</option><option>PM</option></select>` : ''}
          <button class="btn" data-act="taskAdd" data-cat="${k}">Add</button></div></div>`;
    }).join('')}</div>`;
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
        <div class="row">${f('calories', 'Calories')}${f('protein', 'Protein g')}${f('carbs', 'Carbs g')}${f('fat', 'Fat g')}</div>
        <div class="row" style="margin-top:8px">${f('waterTarget', 'Water ml', 250)}</div>
        <p class="muted small">Bulk starting point: body weight (lb) × 16–18 kcal, protein 0.8–1 g per lb, fat ~25% of calories, carbs fill the rest. Set the same targets in MyFitnessPal.</p>
        <button class="btn sm" data-act="macroCalc">Fill macros from calories</button></div>
      <div class="card"><h2>⚙️ Preferences</h2>
        <div class="row"><label class="field">Weight unit<select data-act="setting" data-k="unit"><option ${s.unit === 'lb' ? 'selected' : ''}>lb</option><option ${s.unit === 'kg' ? 'selected' : ''}>kg</option></select></label>
          <label class="field">Theme<select data-act="setting" data-k="theme">${['auto', 'light', 'dark'].map(t => `<option ${s.theme === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
        <p class="muted small">Changing units doesn't convert past entries.</p></div>
      <div class="card"><h2>💾 Backup</h2>
        <p class="small">Your data is stored only in this browser. Export a backup regularly, and import it to move to another device.</p>
        <div class="row"><button class="btn primary" data-act="export">Export backup</button>
          <label class="btn">Import backup<input type="file" id="importFile" accept=".json,application/json" hidden></label></div>
        <button class="btn ghost danger sm" style="margin-top:10px" data-act="reset">Reset everything</button></div>
    </div>`;
  },
};

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
const findTask = id => S.tasks.find(t => t.id === id);
const findEvent = id => S.events.find(e => e.id === id);
const findItem = id => S.groceries.items.find(i => i.id === id);

function addEvent(e) { S.events.push({ id: uid(), done: false, time: '', mins: 0, title: '', ...e }); }
function genHockeyBlock(start) {
  S.events = S.events.filter(e => !e.block);
  const weeks = [
    { label: 'Wk1 Base', bike: 'Bike intervals 8 × 30s hard / 90s easy + 10 min warm-up', agil: 'Agility ladder 10 min, 5-10-5 shuttle × 6, 6 × 20 m sprints, lateral bounds 3 × 6/side', z2: 'Zone 2 bike or jog 30 min (can talk in full sentences)', z2m: 30 },
    { label: 'Wk2 Build', bike: 'Bike intervals 10 × 30s hard / 90s easy', agil: 'Shuttle × 8, 8 × 20 m sprints, skater jumps 3 × 8/side, crossover drills', z2: 'Zone 2 35 min', z2m: 35 },
    { label: 'Wk3 Peak', bike: 'Shift sims 12 × 40s all-out / 80s easy', agil: 'Shuttle × 10, 10 × 20 m sprints, reactive agility (partner/coach cues)', z2: 'Zone 2 40 min', z2m: 40 },
    { label: 'Wk4 Deload', bike: 'Bike intervals 6 × 30s / 90s — stay fresh for the season', agil: 'Light agility 15 min + hip/groin mobility', z2: 'Easy zone 2 25 min', z2m: 25 },
  ];
  weeks.forEach((w, i) => {
    const mon = addDays(start, i * 7);
    addEvent({ date: addDays(mon, 2), type: 'conditioning', title: `${w.label}: ${w.bike}`, mins: 30, block: start });
    addEvent({ date: addDays(mon, 5), type: 'conditioning', title: `${w.label}: ${w.agil}`, mins: 35, block: start });
    addEvent({ date: addDays(mon, 6), type: 'cardio', title: `${w.label}: ${w.z2}`, mins: w.z2m, block: start });
  });
}

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

function download(name, text) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const CLICK = {
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
    S.nutrition[ui.date] = { cal: num($('#n_cal').value), protein: num($('#n_protein').value), carbs: num($('#n_carbs').value), fat: num($('#n_fat').value), src: 'Manual' };
    commit('Saved');
  },
  clearNut: () => { delete S.nutrition[ui.date]; commit(); },
  editRoutine: () => { ui.editRoutine = !ui.editRoutine; render(); },
  gymClear: () => {
    const dayId = ui.gymDay || gymDayFor(ui.date) || S.gym.split[0]?.id;
    if (confirm('Delete this session?')) { delete S.gym.logs[`${ui.date}|${dayId}`]; commit(); }
  },
  exAdd: el => { splitById(el.dataset.day).exercises.push({ id: uid(), name: 'New exercise', sets: 3, repMin: 8, repMax: 12, inc: 5 }); commit(); },
  exDel: el => { const d = splitById(el.dataset.day); d.exercises = d.exercises.filter(e => e.id !== el.dataset.ex); commit(); },
  dayAdd: () => { S.gym.split.push({ id: uid(), name: 'New day', exercises: [] }); commit(); },
  dayDel: el => {
    if (!confirm('Delete this training day? Logged sessions are kept.')) return;
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
  genBlock: () => {
    const st = $('#blockStart').value; if (!st) return;
    const mon = dowOf(st) === 1 ? st : nextMonday(st);
    genHockeyBlock(mon); commit(`Hockey block added: ${fmtDate(mon)} – ${fmtDate(addDays(mon, 27))}`);
  },
  clearBlock: () => { if (confirm('Remove all generated hockey-block sessions?')) { S.events = S.events.filter(e => !e.block); commit(); } },
  gAdd: el => {
    const st = el.dataset.store; const name = $('#gi_' + st).value.trim(); if (!name) return;
    S.groceries.items.push({ id: uid(), name, store: st, qty: $('#gq_' + st).value.trim(), staple: $('#gs_' + st).checked, checked: false }); commit();
  },
  gDel: el => { S.groceries.items = S.groceries.items.filter(i => i.id !== el.dataset.id); commit(); },
  gMove: el => { const i = findItem(el.dataset.id); i.store = i.store === 'Sobeys' ? 'Costco' : 'Sobeys'; commit(`Moved to ${i.store}`); },
  trip: el => {
    const st = el.dataset.store;
    S.groceries.items = S.groceries.items.filter(i => !(i.store === st && i.checked && !i.staple));
    S.groceries.items.forEach(i => { if (i.store === st) i.checked = false; });
    S.groceries.schedule[st].last = ui.date; commit(`${st} trip logged`);
  },
  taskAdd: el => {
    const c = el.dataset.cat; const name = $('#tn_' + c).value.trim(); if (!name) return;
    S.tasks.push({ id: uid(), cat: c, name, freq: Math.max(1, num($('#tf_' + c).value) || 1), when: $('#tw_' + c)?.value || '', history: [] }); commit();
  },
  taskDel: el => { if (confirm('Delete this task?')) { S.tasks = S.tasks.filter(t => t.id !== el.dataset.id); commit(); } },
  macroCalc: () => {
    const s = S.settings; s.fat = Math.round((s.calories * 0.25) / 9);
    s.carbs = Math.max(0, Math.round((s.calories - s.protein * 4 - s.fat * 9) / 4)); commit('Macros updated');
  },
  export: () => download(`life-tracker-backup-${todayISO()}.json`, JSON.stringify(S, null, 2)),
  reset: () => { if (confirm('Erase ALL data and restore defaults? Export a backup first!')) { S = defaults(); commit('Reset'); } },
};

const CHANGE = {
  task: el => {
    const t = findTask(el.dataset.id);
    if (el.checked) { if (!t.history.includes(ui.date)) t.history.push(ui.date); } else t.history = t.history.filter(h => h !== ui.date);
    t.history = t.history.sort().slice(-120); commit();
  },
  eventDone: el => { findEvent(el.dataset.id).done = el.checked; commit(); },
  gItem: el => { findItem(el.dataset.id).checked = el.checked; commit(); },
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
  storeEvery: el => { S.groceries.schedule[el.dataset.store].everyWeeks = Math.max(1, num(el.value) || 1); commit(); },
  storeDow: el => { S.groceries.schedule[el.dataset.store].dow = +el.value; commit(); },
  setting: el => { const k = el.dataset.k; S.settings[k] = ['unit', 'theme'].includes(k) ? el.value : num(el.value); commit(); },
  chartDays: el => { ui.chartDays = +el.value; render(); },
};

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]'); if (!el || !CLICK[el.dataset.act]) return;
  if (el.tagName === 'A') ev.preventDefault();
  CLICK[el.dataset.act](el);
});
document.addEventListener('change', async ev => {
  const el = ev.target;
  if (el.id === 'mfpFile' && el.files[0]) {
    try { const n = importMFP(await el.files[0].text()); commit(`Imported ${n} day(s) from MyFitnessPal`); } catch (e) { toast('Import failed: ' + e.message); }
    return;
  }
  if (el.id === 'importFile' && el.files[0]) {
    try { const data = JSON.parse(await el.files[0].text()); if (!data.settings) throw new Error('not a Life Tracker backup'); S = migrate(data); commit('Backup restored'); } catch (e) { toast('Import failed: ' + e.message); }
    return;
  }
  if (el.dataset.act && CHANGE[el.dataset.act]) CHANGE[el.dataset.act](el);
});
document.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.matches('input[type=text], input[type=number]')) ev.target.blur(); });

render();
