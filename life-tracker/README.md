# 🏒 Life Tracker

All-in-one personal tracker that runs in the browser (phone or desktop). No accounts, no server, no build step. Your data stays in your browser's local storage.

| Tab | What it does |
|---|---|
| **Today** | Calories/macros vs. target, water, today's lift, hockey/cardio, weigh-in, today's meals, grocery-day reminder, and every routine task due today |
| **Nutrition** | Enter MyFitnessPal daily totals, or import MFP's *Nutrition Summary* CSV export. 7-day averages and a 14-day hit/miss table |
| **Gym** | 4-day Upper/Lower split (editable). Log weight × reps per set. **Progressive overload** (double progression): tells you when to add weight, when to beat reps, and when to deload after 2 stalled sessions. Shows the estimated 1RM trend |
| **Cardio & Hockey** | Hockey games, practices, skates and cardio, with weekly repeats. One click generates a **4-week pre-season hockey conditioning block** (Base → Build → Peak → Deload) on non-lifting days |
| **Meals & Groceries** | 7-day meal plan with optional kcal per meal. Separate **Sobeys** and **Costco** lists, each with its own trip schedule (e.g. Sobeys weekly, Costco every 2 weeks), staple items that reset after each trip, and "next trip" dates |
| **Routines** | Skin (AM/PM), hair, cleaning and laundry tasks, each with its own frequency and due/overdue tracking |
| **Weight** | Weigh-ins, 7-day average, 3-week rate of gain, goal ETA, and calorie adjustment advice for a lean bulk |
| **Settings** | Targets, lb/kg, theme, JSON backup export/import |

## Run it

- **Locally:** open `index.html` in a browser, or run `python3 -m http.server` in this folder.
- **On your phone:** enable GitHub Pages for this repo (Settings → Pages → deploy from branch). Open `https://<user>.github.io/<repo>/life-tracker/` and use "Add to Home Screen".

## About MyFitnessPal

MyFitnessPal has no public API, so a personal app can't sync live. Two options:
1. Type the day's totals from your MFP diary into the Nutrition tab (about 10 seconds).
2. With MFP Premium, export your data and import the *Nutrition Summary* CSV. Rows are summed per day.

## Backups

Data is per-browser. Use **Settings → Export backup** regularly, and **Import backup** to move to another device.
