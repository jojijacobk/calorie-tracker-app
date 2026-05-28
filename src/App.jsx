import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";

/* ============================================================================
   Calorie Tracker — single-file React app
   - Stacked macro bars (height = recorded Total kcal; segments split
     proportionally by macro calories: carb*4, protein*4, fat*9)
   - Day / Week (Mon–Sun) / Month / Year views with avg-daily aggregation
   - Safe localStorage shim: persists in real environments, falls back to
     in-memory inside sandboxes that block storage.
   ============================================================================ */

/* ---------- macro palette (exact, per spec) ---------- */
const C = { carb: "#D94545", protein: "#22C55E", fat: "#EAB308" };
const ATWATER = { carb: 4, protein: 4, fat: 9 };

/* ---------- runtime platform ---------- */
const IS_ELECTRON = typeof window !== "undefined" && !!window.desktop?.isElectron;
const IS_NATIVE_IOS =
  typeof window !== "undefined" &&
  !!window.Capacitor?.isNativePlatform?.() &&
  window.Capacitor?.getPlatform?.() === "ios";

/* ---------- live window width (desktop windows resize freely) ---------- */
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
}

/* ---------- safe storage shim ---------- */
const mem = {};
const store = {
  get(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return key in mem ? mem[key] : fallback;
    }
  },
  set(key, val) {
    try {
      window.localStorage.setItem(key, JSON.stringify(val));
    } catch {
      mem[key] = val;
    }
  },
};

/* ---------- seed data (your uploaded calorie.csv) ---------- */
const SEED_CSV = `Date,Meal,Carb,Protein,Fat,Total
2026-05-20, Breakfast, 35, 39, 36, 620
2026-05-20, Palak Paneer Grill, 32, 18, 16, 344
2026-05-20, Protein Shake, 72, 58, 18, 682
2026-05-20, Kẹo Dừa, 7.8, 0.2, 1.3, 88
2026-05-20, Bánh Dừa Nướng, 10.5, 0.8, 2.5, 68
2026-05-20,Legit Mixed Pulses Crisps (55g),31,9,8,232
2026-05-20,Cafeteria Lemon Chicken (~175g),22,28,18,362
2026-05-20,Total,53,37,26,594
2026-05-20, Yogabar Power Up 20G Protein Bar, 35.7, 20.0, 7.7, 243
2026-05-20, Mango Tres Leches & Almond Croissant, 119, 20, 54, 1030
2026-05-21,California Burrito PRO Bowl - Grilled Barbeque Chicken (BBQ Paneer, No Rice),24,46,32,590
2026-05-21,California Burrito PRO Bowl - Mexican Paneer (No Rice, Chili Chipotle Chicken),19,44,38,620
May 21 2026, dry fruit bars, 36, 6, 18, 330
2026-05-21, Caramel popcorn, 44, 2, 7, 248
2026-05-21, Keto ice creams, 5, 9, 10, 260
2026-05-21, Mixed Veggie Snack, 4.7, 7.6, 29.4, 190
2026-05-22,Peanut butter sandwich,28,12,16,304
2026-05-22,ITC biriyani small plate,45,24,27,542
2026-05-22,Almond brittle,43,9,41,578
2026-05-24,1 packet Lotus biscoff (75g),54.8,4.5,13.5,357
2026-05-24,Lotus stem honey crunchy fry (1 plate),48.0,3.0,14.0,320
2026-05-24,Sweet mango milk shake (1 glass),45.0,6.0,9.0,290
2026-05-24,Chicken tikka panini (1 sandwich),46.0,28.0,20.0,480
2026-05-24,Onion rings (2 pieces),13.0,1.5,6.0,110
2026-05-24,French fries (5 sticks),9.5,0.8,2.8,65
2026-05-24,Basa Fish tikka (2 pieces),2.0,14.0,6.5,120
2026-05-24,Chicken tikka (1 piece),1.5,13.0,3.5,90
2026-05-23,Homemade egg noodles (1 bowl, low oil),40.0,9.0,5.0,241.0
2026-05-23,2 Multigrain dosa with mint chutney & veg kurma,45.0,8.0,10.0,302.0
2026-05-23,Homemade mango juice with jaggery (1 glass),35.0,1.0,0.5,148.5
2026-05-23,Jackfruit chips (50g),38.0,2.0,10.0,250.0
2026-05-23,Protein PB Sandwich (Protein Chef bread + Fabsta PB),22.0,28.0,19.0,371.0
2026-05-23,Caramel & cheese mixed popcorn (0.5 regular),26.0,3.0,9.0,197.0
2026-05-23,OG Chicken steak taco (no sauce/mayo),16.0,14.0,6.0,174.0
2026-05-23,Aloo tikki chaat (1 plate),40.0,5.0,12.0,288.0
2026-05-23,Milk coffee (100 mL),5.0,3.0,3.0,59.0
2026-05-23,Smoor intense chilli chocolate (3 pieces),15.0,2.0,10.0,158.0
2026-05-23,Cookie man apricot biscuit (1 piece),10.0,1.0,4.0,80.0
2026-05-23,Homemade jackfruit halwa (1 tbsp),14.0,0.5,3.0,85.0
2026-05-24,2 ID Protein Dosas + 2 Whole Eggs 1 Egg White with Gravy + 100ml Jaggery Coffee,44.0,24.0,14.0,402
2026-05-24, MuscleBlaze Biozyme Iso-Zero (1/4 scoop), 0.4, 6.8, 0.1, 30
2026-05-24, Plate Grilled Chicken Salad (with olives, corn, broccoli, light dressing), 11, 35, 12, 292
2026-05-24, 73g Dry Fruit Bar (Dates, Ghee, Almond, Cashew), 44, 5, 14, 322
2026-05-24, Robusta Banana (1) + Apple (1) + Whole Milk (150ml) + Peanut Butter (1 tbsp), 53, 12, 13, 377
2026-05-24, Small Achappam (6) & Kozhalappam (5), 63, 5, 18, 434
2026-05-24, Chicken and Rice Plate with Peanut Butter Toast, 68, 51, 24, 692
2026-05-24, Two-Thirds Dry Fruit Bar, 29.3, 3.3, 9.3, 215
2026-05-24, Milk Coffee and Sweet Frappe, 11, 3.5, 4, 94
2026-05-25, 3 Protein Dosas with 2 tbsp Peanut Butter and Boiled Eggs and Milk Coffee with Jaggery, 61, 40, 35, 721
2026-05-25, Garlic Rice Big Bowl with 3 Achappam and 100g Chicken Fry and 3 tbsp Curd and 25g Pinto Beans and 1 Mangosteen, 126, 36, 31, 927
2026-05-25, Amul Ice Cream, 39, 7, 20, 364
2026-05-25, Mawa Rusk, 9.3, 1.4, 3.9, 75
2026-05-25, 4 Kozhalappam and 3 Mawa Rusk, 47.2, 6.1, 17.8, 366
2026-05-25, Amul Vanilla Ice cream with Fabsta Peanut Butter, 49, 13, 24, 464
2026-05-25, Protein bread chicken fry apple peanut butter and mawa rusk, 56, 62, 22, 670
2026-05-26, Troovy Dal Chips and Pudina Rings, 19.5, 4.1, 4.9, 139
2026-05-26, Dry Fruit Bar (Dates Ghee Almond Cashew), 22.0, 3.5, 7.8, 172
2026-05-26, California Burrito PRO Bowl (Mexican Paneer + Chili Chipotle Chicken No Rice), 22.1, 36.4, 36.2, 558
2026-05-26, MuscleBlaze Iso-Zero Protein Powder (Half Sachet), 0.8, 13.5, 0.3, 61
2026-05-26, Rice with Cabbage Fry Ayala Fish and Rice Payasam, 33.1, 6.8, 7.9, 232
2026-05-26, Peanut Butter Sandwich with Protein Bread, 25.3, 14.1, 9.9, 251`;

/* ---------- date helpers (all LOCAL time to dodge UTC drift) ---------- */
function parseLocalDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s + " 00:00:00");
  if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const d2 = new Date(s);
  if (!isNaN(d2.getTime())) return new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return null;
}
const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromISO = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const startOfWeek = (d) => {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a, b) => toISO(a) === toISO(b);
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_S = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const WEEKDAY = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const fmtMD = (d) => `${MONTHS_S[d.getMonth()]} ${d.getDate()}`;

/* ---------- CSV parsing (handles unquoted commas inside meal names) ---------- */
function parseCSV(text) {
  const rows = [];
  const errors = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(",");
    if (parts.length < 6) continue; // not a valid data row
    const first = parts[0].trim().toLowerCase();
    if (first === "date") continue; // header
    // last 4 are numerics; date is first; meal = everything between
    const total = Number(parts[parts.length - 1].trim());
    const fat = Number(parts[parts.length - 2].trim());
    const protein = Number(parts[parts.length - 3].trim());
    const carb = Number(parts[parts.length - 4].trim());
    const dateRaw = parts[0].trim();
    const meal = parts.slice(1, parts.length - 4).join(",").replace(/^["']|["']$/g, "").trim();
    if (meal.toLowerCase() === "total") continue; // skip aggregated rows
    const d = parseLocalDate(dateRaw);
    if (!d) { errors.push(`Bad date "${dateRaw}"`); continue; }
    if ([carb, protein, fat, total].some((n) => Number.isNaN(n))) {
      errors.push(`Non-numeric macros for "${meal}"`); continue;
    }
    rows.push({
      dateISO: toISO(d), meal: meal || "Meal",
      carb: Number(carb), protein: Number(protein), fat: Number(fat), total: Number(total),
    });
  }
  return { rows, errors };
}

const sig = (e) => `${e.dateISO}|${e.meal}|${e.carb}|${e.protein}|${e.fat}|${e.total}`;
function mergeEntries(existing, incoming) {
  const seen = new Set(existing.map(sig));
  let added = 0;
  const merged = existing.slice();
  for (const e of incoming) {
    if (!seen.has(sig(e))) { seen.add(sig(e)); merged.push(e); added++; }
  }
  return { merged, added };
}

/* ---------- macro -> proportional kcal segments ---------- */
function segments(carbG, proteinG, fatG, displayKcal) {
  const c = carbG * ATWATER.carb, p = proteinG * ATWATER.protein, f = fatG * ATWATER.fat;
  const sum = c + p + f;
  if (sum <= 0 || displayKcal <= 0) return { carbKcal: 0, proteinKcal: 0, fatKcal: 0 };
  const k = displayKcal / sum;
  return { carbKcal: c * k, proteinKcal: p * k, fatKcal: f * k };
}

/* ---------- aggregate entries by day ---------- */
function buildDaily(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!map.has(e.dateISO)) map.set(e.dateISO, { carb: 0, protein: 0, fat: 0, total: 0, meals: [] });
    const d = map.get(e.dateISO);
    d.carb += e.carb; d.protein += e.protein; d.fat += e.fat; d.total += e.total;
    d.meals.push(e);
  }
  return map;
}

/* ============================================================================
   Chart data builders
   ============================================================================ */
function buildChartData(view, cursorISO, entries, daily, isMobile = false) {
  const cursor = fromISO(cursorISO);

  if (view === "day") {
    const day = daily.get(cursorISO);
    if (!day) return [];
    const maxLen = isMobile ? 14 : 22;
    return day.meals.map((m, i) => {
      const seg = segments(m.carb, m.protein, m.fat, m.total);
      return {
        key: `${i}`,
        label: m.meal.length > maxLen ? m.meal.slice(0, maxLen - 1) + "…" : m.meal,
        fullLabel: m.meal,
        carbKcal: seg.carbKcal, proteinKcal: seg.proteinKcal, fatKcal: seg.fatKcal,
        carbG: m.carb, proteinG: m.protein, fatG: m.fat, total: m.total,
      };
    });
  }

  if (view === "week") {
    const mon = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(mon, i);
      const rec = daily.get(toISO(d)) || { carb: 0, protein: 0, fat: 0, total: 0 };
      const seg = segments(rec.carb, rec.protein, rec.fat, rec.total);
      return {
        key: toISO(d), label: `${DAYS_S[i]} ${d.getDate()}`, fullLabel: `${WEEKDAY[d.getDay()]}, ${fmtMD(d)}`,
        carbKcal: seg.carbKcal, proteinKcal: seg.proteinKcal, fatKcal: seg.fatKcal,
        carbG: rec.carb, proteinG: rec.protein, fatG: rec.fat, total: rec.total, isAvg: false,
      };
    });
  }

  if (view === "month") {
    const y = cursor.getFullYear(), mo = cursor.getMonth();
    const firstMon = startOfWeek(new Date(y, mo, 1));
    const out = [];
    let weekStart = firstMon, idx = 1;
    while (true) {
      // does this week intersect the month?
      const weekEnd = addDays(weekStart, 6);
      if (weekStart > new Date(y, mo, daysInMonth(y, mo))) break;
      let carb = 0, protein = 0, fat = 0, total = 0, activeDays = 0;
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        if (d.getMonth() === mo && d.getFullYear() === y) {
          const rec = daily.get(toISO(d));
          if (rec) { carb += rec.carb; protein += rec.protein; fat += rec.fat; total += rec.total; activeDays++; }
        }
      }
      const avg = activeDays ? total / activeDays : 0; // ÷ logged days only
      const seg = segments(carb, protein, fat, avg);
      out.push({
        key: `w${idx}`, label: `W${idx}`,
        fullLabel: `Week ${idx} · ${fmtMD(weekStart)}–${fmtMD(weekEnd)}`,
        carbKcal: seg.carbKcal, proteinKcal: seg.proteinKcal, fatKcal: seg.fatKcal,
        carbG: activeDays ? carb / activeDays : 0,
        proteinG: activeDays ? protein / activeDays : 0,
        fatG: activeDays ? fat / activeDays : 0,
        total: avg, isAvg: true, activeDays,
      });
      weekStart = addDays(weekStart, 7); idx++;
      if (idx > 6) break;
    }
    return out;
  }

  // year
  const y = cursor.getFullYear();
  return Array.from({ length: 12 }, (_, mo) => {
    const dim = daysInMonth(y, mo);
    let carb = 0, protein = 0, fat = 0, total = 0, activeDays = 0;
    for (let d = 1; d <= dim; d++) {
      const rec = daily.get(toISO(new Date(y, mo, d)));
      if (rec) { carb += rec.carb; protein += rec.protein; fat += rec.fat; total += rec.total; activeDays++; }
    }
    const avg = activeDays ? total / activeDays : 0; // ÷ logged days only
    const seg = segments(carb, protein, fat, avg);
    return {
      key: `m${mo}`, label: MONTHS_S[mo], fullLabel: `${MONTHS[mo]} ${y} · daily avg`,
      carbKcal: seg.carbKcal, proteinKcal: seg.proteinKcal, fatKcal: seg.fatKcal,
      carbG: activeDays ? carb / activeDays : 0,
      proteinG: activeDays ? protein / activeDays : 0,
      fatG: activeDays ? fat / activeDays : 0,
      total: avg, isAvg: true, activeDays,
    };
  });
}

/* ---------- stats over visible range ---------- */
function buildStats(view, cursorISO, daily, budget) {
  const cursor = fromISO(cursorISO);
  let isos = [];
  if (view === "day") isos = [cursorISO];
  else if (view === "week") { const m = startOfWeek(cursor); isos = Array.from({ length: 7 }, (_, i) => toISO(addDays(m, i))); }
  else if (view === "month") {
    const y = cursor.getFullYear(), mo = cursor.getMonth();
    isos = Array.from({ length: daysInMonth(y, mo) }, (_, i) => toISO(new Date(y, mo, i + 1)));
  } else {
    const y = cursor.getFullYear();
    for (let mo = 0; mo < 12; mo++)
      for (let d = 1; d <= daysInMonth(y, mo); d++) isos.push(toISO(new Date(y, mo, d)));
  }
  let total = 0, tracked = 0, peak = 0, peakISO = null, over = 0;
  for (const iso of isos) {
    const rec = daily.get(iso);
    if (!rec) continue;
    tracked++; total += rec.total;
    if (rec.total > peak) { peak = rec.total; peakISO = iso; }
    if (rec.total > budget) over++;
  }
  return {
    total, tracked, peak, peakISO,
    avg: tracked ? total / tracked : 0, over,
  };
}

/* ---------- title ---------- */
function buildTitle(view, cursorISO) {
  const c = fromISO(cursorISO);
  if (view === "day") return `${WEEKDAY[c.getDay()]}, ${fmtMD(c)}`;
  if (view === "week") { const m = startOfWeek(c), e = addDays(m, 6); return `Week of ${fmtMD(m)} – ${fmtMD(e)}`; }
  if (view === "month") return `${MONTHS[c.getMonth()]} ${c.getFullYear()}`;
  return `${c.getFullYear()}`;
}
function shiftCursor(view, cursorISO, dir) {
  const c = fromISO(cursorISO);
  if (view === "day") return toISO(addDays(c, dir));
  if (view === "week") return toISO(addDays(c, dir * 7));
  if (view === "month") return toISO(new Date(c.getFullYear(), c.getMonth() + dir, 1));
  return toISO(new Date(c.getFullYear() + dir, c.getMonth(), 1));
}

/* ============================================================================
   Small UI atoms
   ============================================================================ */
const fmtK = (n) => Math.round(n).toLocaleString();

function Tip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const Row = ({ c, name, g, k }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, lineHeight: "20px" }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: c, display: "inline-block" }} />
      <span style={{ flex: 1 }}>{name}</span>
      <span style={{ fontFamily: "var(--mono)", opacity: 0.7 }}>{Math.round(g)} g</span>
      <span style={{ fontFamily: "var(--mono)", minWidth: 56, textAlign: "right" }}>{fmtK(k)} kcal</span>
    </div>
  );
  return (
    <div style={{
      background: "#15171c", border: "1px solid #2a2e37", borderRadius: 10,
      padding: "10px 12px", minWidth: 230, boxShadow: "0 12px 40px rgba(0,0,0,.5)",
    }}>
      <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 8, color: "#f4f5f7" }}>{d.fullLabel}</div>
      <Row c={C.carb} name="Carbs" g={d.carbG} k={d.carbKcal} />
      <Row c={C.fat} name="Fat" g={d.fatG} k={d.fatKcal} />
      <Row c={C.protein} name="Protein" g={d.proteinG} k={d.proteinKcal} />
      <div style={{ borderTop: "1px solid #2a2e37", marginTop: 8, paddingTop: 7, display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
        <span style={{ opacity: 0.7 }}>{d.isAvg ? `Avg / logged day (${d.activeDays || 0})` : "Total"}</span>
        <strong style={{ fontFamily: "var(--mono)" }}>{fmtK(d.total)} kcal</strong>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: "linear-gradient(180deg,#16181d,#131418)", border: "1px solid #23262e",
      borderRadius: 14, padding: "14px 16px", minHeight: 92, display: "flex",
      flexDirection: "column", justifyContent: "space-between",
    }}>
      <div style={{ fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", color: "#7c828e" }}>{label}</div>
      <div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 26, fontWeight: 600, color: accent || "#f4f5f7", lineHeight: 1.05 }}>{value}</div>
        {sub && <div style={{ fontSize: 11.5, color: "#7c828e", marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ============================================================================
   Main App
   ============================================================================ */
const DEFAULTS = { budget: 1600, increment: 500 };

export default function App() {
  const [entries, setEntries] = useState(() => {
    const saved = store.get("ct_entries", null);
    if (saved && Array.isArray(saved) && saved.length) return saved;
    return parseCSV(SEED_CSV).rows; // seed first-run
  });
  const [settings, setSettings] = useState(() => ({ ...DEFAULTS, ...store.get("ct_settings", {}) }));
  const [view, setView] = useState(() => store.get("ct_view", "week"));
  const [cursorISO, setCursorISO] = useState(() => {
    const s = store.get("ct_cursor", null);
    if (s) return s;
    return "2026-05-25"; // anchor near the seed data
  });
  const [tab, setTab] = useState("dashboard"); // dashboard | settings
  const [alert, setAlert] = useState(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  /* persistence */
  /* native iOS: light status-bar text, and don't overlay web content */
  useEffect(() => {
    if (!IS_NATIVE_IOS) return;
    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch { /* absent on web/desktop — ignore */ }
    })();
  }, []);

  useEffect(() => store.set("ct_entries", entries), [entries]);
  useEffect(() => store.set("ct_settings", settings), [settings]);
  useEffect(() => store.set("ct_view", view), [view]);
  useEffect(() => store.set("ct_cursor", cursorISO), [cursorISO]);

  const isMobile = useWindowWidth() < 560;

  const daily = useMemo(() => buildDaily(entries), [entries]);
  const chartData = useMemo(() => buildChartData(view, cursorISO, entries, daily, isMobile), [view, cursorISO, entries, daily, isMobile]);
  const stats = useMemo(() => buildStats(view, cursorISO, daily, settings.budget), [view, cursorISO, daily, settings.budget]);
  const title = useMemo(() => buildTitle(view, cursorISO), [view, cursorISO]);

  const totalDaysTracked = daily.size;

  /* y axis */
  const maxVal = Math.max(settings.budget, ...chartData.map((d) => d.total), 0);
  const inc = settings.increment;
  const yMax = Math.max(inc, Math.ceil((maxVal * 1.08) / inc) * inc);
  const ticks = []; for (let t = 0; t <= yMax; t += inc) ticks.push(t);

  const hasData = chartData.some((d) => d.total > 0);

  /* ---------- in-bar / above-bar label renderers ---------- */
  const segFont = isMobile ? 9 : 11;
  // estimate monospace text width; render only if it fully fits the slot
  const fits = (str, fontSize, avail) => str.length * fontSize * 0.62 + 8 <= avail;
  // centered rounded kcal inside a segment, only if it fits
  const makeSegLabel = (textColor) => (props) => {
    const { x, y, width, height, value } = props;
    if (!value || value < 1) return null;
    const txt = String(Math.round(value));
    if (height < segFont + 6 || !fits(txt, segFont, width)) return null;
    return (
      <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central"
        fontFamily="var(--mono)" fontSize={segFont} fontWeight={600} fill={textColor}>
        {txt}
      </text>
    );
  };
  // rounded total floating above the whole stack
  const totalFont = isMobile ? 10 : 12;
  const totalLabel = (props) => {
    const { x, y, width, value } = props;
    if (!value || value < 1) return null;
    const txt = String(Math.round(value));
    if (!fits(txt, totalFont, width * 1.6)) return null; // some bleed allowed (sits above bar)
    return (
      <text x={x + width / 2} y={y - 7} textAnchor="middle"
        fontFamily="var(--mono)" fontSize={totalFont} fontWeight={700} fill="#e7e9ee">
        {txt}
      </text>
    );
  };
  // protein segment: "<kcal> (<grams>g)"
  const proteinLabel = (props) => {
    const { x, y, width, height, value, index } = props;
    if (!value || value < 1) return null;
    const g = chartData[index] ? Math.round(chartData[index].proteinG) : 0;
    const txt = `${Math.round(value)} (${g}g)`;
    if (height < segFont + 6 || !fits(txt, segFont, width)) return null;
    return (
      <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central"
        fontFamily="var(--mono)" fontSize={segFont} fontWeight={600} fill="#0d0e12">
        {txt}
      </text>
    );
  };

  /* CSV ingest */
  const ingest = useCallback((text, name) => {
    const { rows, errors } = parseCSV(text);
    if (!rows.length) {
      setAlert({ type: "error", msg: `No valid rows found${name ? ` in ${name}` : ""}. Expected: Date, Meal, Carb, Protein, Fat, Total.` });
      return;
    }
    setEntries((prev) => {
      const { merged, added } = mergeEntries(prev, rows);
      const dup = rows.length - added;
      setAlert({
        type: "success",
        msg: `Added ${added} row${added === 1 ? "" : "s"}${dup ? `, skipped ${dup} duplicate${dup === 1 ? "" : "s"}` : ""}${errors.length ? `, ${errors.length} skipped (errors)` : ""}.`,
      });
      return merged;
    });
  }, []);

  const onFile = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = (e) => ingest(String(e.target.result), file.name);
    r.onerror = () => setAlert({ type: "error", msg: "Could not read that file." });
    r.readAsText(file);
  };

  useEffect(() => { if (alert) { const t = setTimeout(() => setAlert(null), 5000); return () => clearTimeout(t); } }, [alert]);

  const VIEWS = ["day", "week", "month", "year"];
  const onDatePick = (e) => { if (e.target.value) setCursorISO(e.target.value); };

  /* ---------- styles ---------- */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600&display=swap');
    :root{ --mono:'JetBrains Mono',ui-monospace,monospace; --disp:'Bricolage Grotesque',sans-serif; --body:'Outfit',system-ui,sans-serif; }
    *{box-sizing:border-box}
    .ct-root{font-family:var(--body);background:radial-gradient(1200px 600px at 80% -10%, #1b2330 0%, #0d0e12 55%);min-height:100vh;color:#e7e9ee;padding:6px 18px calc(env(safe-area-inset-bottom) + 18px);}
    .ct-shell{max-width:1080px;margin:0 auto;}
    .vbtn{appearance:none;border:1px solid #2a2e37;background:#15171c;color:#aeb4bf;padding:0 16px;height:44px;border-radius:11px;font-size:14px;font-weight:500;cursor:pointer;transition:.18s;font-family:var(--body);text-transform:capitalize;}
    .vbtn:hover{border-color:#3a414e;color:#e7e9ee;}
    .vbtn.active{background:linear-gradient(180deg,#fff,#e9ecf2);color:#0d0e12;border-color:#fff;box-shadow:0 6px 22px rgba(255,255,255,.12);font-weight:600;}
    .iconbtn{appearance:none;width:44px;height:44px;border-radius:11px;border:1px solid #2a2e37;background:#15171c;color:#cfd4dd;font-size:18px;cursor:pointer;transition:.18s;display:flex;align-items:center;justify-content:center;}
    .iconbtn:hover{border-color:#3a414e;background:#1b1e25;}
    .tabbtn{appearance:none;background:none;border:none;color:#7c828e;font-family:var(--body);font-size:14px;font-weight:600;cursor:pointer;padding:8px 2px;border-bottom:2px solid transparent;transition:.18s;}
    .tabbtn.active{color:#e7e9ee;border-bottom-color:#D94545;}
    input[type=date]{font-family:var(--body);background:#15171c;border:1px solid #2a2e37;color:#e7e9ee;height:44px;border-radius:11px;padding:0 12px;font-size:14px;color-scheme:dark;}
    input[type=range]{accent-color:#D94545;width:100%;height:44px;cursor:pointer;}
    input[type=number]{font-family:var(--mono);background:#15171c;border:1px solid #2a2e37;color:#e7e9ee;height:42px;border-radius:10px;padding:0 12px;font-size:15px;width:110px;}
    .card{background:linear-gradient(180deg,#16181d,#121317);border:1px solid #23262e;border-radius:16px;}
    .drop{border:1.5px dashed #34384280;border-radius:14px;padding:28px;text-align:center;transition:.18s;cursor:pointer;background:#121317;}
    .drop.drag{border-color:#D94545;background:#1a1416;}
    @media (max-width:560px){ .ct-root{padding:12px;} }
  `;

  return (
    <div className="ct-root">
      <style>{css}</style>
      {IS_ELECTRON && <div className="titlebar-drag" />}
      <div className="ct-shell">

        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "var(--disp)", fontSize: 26, fontWeight: 700, letterSpacing: "-.02em" }}>
              Calorie<span style={{ color: "#D94545" }}>·</span>Tracker
            </div>
            <div style={{ fontSize: 12.5, color: "#7c828e", marginTop: 2 }}>
              {entries.length} entries · {totalDaysTracked} days tracked
            </div>
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            <button className={`tabbtn ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}>Dashboard</button>
            <button className={`tabbtn ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>Settings</button>
          </div>
        </div>

        {alert && (
          <div style={{
            marginBottom: 14, padding: "11px 14px", borderRadius: 11, fontSize: 13.5,
            background: alert.type === "success" ? "#0f2417" : "#2a1416",
            border: `1px solid ${alert.type === "success" ? "#1f7a4d" : "#7a2f2f"}`,
            color: alert.type === "success" ? "#7ee0a8" : "#f0a0a0",
          }}>{alert.msg}</div>
        )}

        {tab === "dashboard" && (
          <>
            {/* view selector + nav */}
            <div className="card" style={{ padding: 14, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                {VIEWS.map((v) => (
                  <button key={v} className={`vbtn ${view === v ? "active" : ""}`} onClick={() => setView(v)}
                    style={{ flex: isMobile ? "1 1 0" : "0 0 auto" }} aria-pressed={view === v}>{v}</button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button className="iconbtn" onClick={() => setCursorISO(shiftCursor(view, cursorISO, -1))} aria-label="Previous">‹</button>
                <button className="iconbtn" onClick={() => setCursorISO(shiftCursor(view, cursorISO, 1))} aria-label="Next">›</button>
                <div style={{ fontFamily: "var(--disp)", fontSize: 19, fontWeight: 700, flex: 1, minWidth: 160 }}>{title}</div>
                <input type="date" value={cursorISO} onChange={onDatePick} />
                <button className="vbtn" style={{ flex: "0 0 auto", padding: "0 14px" }} onClick={() => setCursorISO(toISO(new Date()))}>Today</button>
              </div>
            </div>

            {/* stats */}
            <div style={{
              display: "grid", gap: 12, marginBottom: 14,
              gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)",
            }}>
              <StatCard label={view === "day" ? "Day total" : "Range total"} value={`${fmtK(stats.total)}`} sub="kcal" />
              <StatCard label="Avg daily" value={`${fmtK(stats.avg)}`} sub={`over ${stats.tracked} day${stats.tracked === 1 ? "" : "s"}`} accent="#22C55E" />
              <StatCard label="Peak day" value={`${fmtK(stats.peak)}`} sub={stats.peakISO ? fmtMD(fromISO(stats.peakISO)) : "—"} accent="#EAB308" />
              <StatCard label="Days over budget" value={`${stats.over}`} sub={`> ${fmtK(settings.budget)} kcal`} accent={stats.over ? "#D94545" : "#7c828e"} />
            </div>

            {/* chart */}
            <div className="card" style={{ padding: isMobile ? "16px 8px 10px" : "20px 18px 12px", marginBottom: 14 }}>
              {/* legend */}
              <div style={{ display: "flex", gap: 16, marginBottom: 10, paddingLeft: isMobile ? 6 : 10, flexWrap: "wrap", fontSize: 12.5 }}>
                {[["Carbs", C.carb], ["Fat", C.fat], ["Protein", C.protein]].map(([n, c]) => (
                  <span key={n} style={{ display: "flex", alignItems: "center", gap: 6, color: "#aeb4bf" }}>
                    <span style={{ width: 11, height: 11, borderRadius: 3, background: c }} />{n}
                  </span>
                ))}
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#aeb4bf" }}>
                  <span style={{ width: 16, borderTop: "2px dashed #cfd4dd" }} />Budget
                </span>
              </div>

              {hasData ? (
                <ResponsiveContainer width="100%" height={isMobile ? 320 : 400}>
                  <BarChart data={chartData} margin={{ top: 24, right: 8, left: 0, bottom: view === "day" ? 8 : 4 }}>
                    <XAxis
                      dataKey="label" tick={{ fill: "#8b919c", fontSize: (view === "day" && isMobile) ? 8 : (isMobile ? 9.5 : 11), fontFamily: "var(--body)" }}
                      axisLine={{ stroke: "#23262e" }} tickLine={false}
                      interval={0} angle={view === "day" ? (isMobile ? -60 : -18) : 0}
                      textAnchor={view === "day" ? "end" : "middle"} height={view === "day" ? (isMobile ? 72 : 46) : 28}
                    />
                    <YAxis
                      domain={[0, yMax]} ticks={ticks}
                      tick={{ fill: "#8b919c", fontSize: isMobile ? 9.5 : 11, fontFamily: "var(--mono)" }}
                      axisLine={false} tickLine={false} width={isMobile ? 38 : 48}
                    />
                    <Tooltip content={<Tip />} cursor={{ fill: "#ffffff08" }} />
                    <ReferenceLine
                      y={settings.budget} stroke="#cfd4dd" strokeDasharray="6 5" strokeWidth={1.4}
                      label={{ value: `Budget ${fmtK(settings.budget)}`, position: "right", fill: "#cfd4dd", fontSize: isMobile ? 9 : 11, fontFamily: "var(--mono)" }}
                    />
                    <Bar dataKey="carbKcal" stackId="m" fill={C.carb}>
                      <LabelList dataKey="carbKcal" content={makeSegLabel("#fff")} />
                    </Bar>
                    <Bar dataKey="fatKcal" stackId="m" fill={C.fat}>
                      <LabelList dataKey="fatKcal" content={makeSegLabel("#3a2f04")} />
                    </Bar>
                    <Bar dataKey="proteinKcal" stackId="m" fill={C.protein} radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="proteinKcal" content={proteinLabel} />
                      <LabelList dataKey="total" content={totalLabel} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: isMobile ? 280 : 360, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#6b7280", textAlign: "center", padding: 20 }}>
                  <div style={{ fontSize: 40, marginBottom: 10, opacity: .5 }}>🍽️</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#9aa1ac" }}>No entries for {title}</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Use the date picker to jump to a tracked period, or add data in Settings.</div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "settings" && (
          <div style={{ display: "grid", gap: 14 }}>
            {/* budget + increment */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontFamily: "var(--disp)", fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Targets</div>

              <SliderRow
                label="Daily calorie budget" unit="kcal" min={1000} max={3000} step={50}
                value={settings.budget} onChange={(v) => setSettings((s) => ({ ...s, budget: v }))}
              />
              <div style={{ height: 18 }} />
              <SliderRow
                label="Y-axis increment" unit="kcal" min={100} max={1000} step={50}
                value={settings.increment} onChange={(v) => setSettings((s) => ({ ...s, increment: v }))}
              />
            </div>

            {/* upload */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontFamily: "var(--disp)", fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Import data</div>
              <div style={{ fontSize: 12.5, color: "#7c828e", marginBottom: 14 }}>
                CSV columns: <code style={{ fontFamily: "var(--mono)", color: "#aeb4bf" }}>Date, Meal, Carb, Protein, Fat, Total</code>. New rows merge with existing data; duplicates are skipped.
              </div>
              <div
                className={`drop ${drag ? "drag" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]); }}
              >
                <div style={{ fontSize: 30, opacity: .6, marginBottom: 6 }}>⬆</div>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>Drop a CSV here, or tap to browse</div>
                <div style={{ fontSize: 12, color: "#7c828e", marginTop: 4 }}>Dates accept 2026-05-20 or May 21 2026</div>
                <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }}
                  onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
            </div>

            {/* summary + danger */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontFamily: "var(--disp)", fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Data summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Summary k="Total entries" v={entries.length} />
                <Summary k="Days tracked" v={totalDaysTracked} />
                <Summary k="Date range" v={entries.length ? `${fmtMD(fromISO([...daily.keys()].sort()[0]))} – ${fmtMD(fromISO([...daily.keys()].sort().slice(-1)[0]))}` : "—"} />
                <Summary k="Total calories" v={`${fmtK([...daily.values()].reduce((a, d) => a + d.total, 0))} kcal`} />
              </div>
              <button
                onClick={() => { if (window.confirm("Clear all entries? This cannot be undone.")) { setEntries([]); setAlert({ type: "success", msg: "All entries cleared." }); } }}
                style={{ marginTop: 18, appearance: "none", background: "#1c1416", border: "1px solid #7a2f2f", color: "#f0a0a0", padding: "10px 16px", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--body)" }}
              >Clear all data</button>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 11, color: "#565c66", marginTop: 20, lineHeight: 1.6 }}>
          Bar height = recorded <strong style={{ color: "#7c828e" }}>Total kcal</strong>. Colour segments show each macro's caloric share (carbs &amp; protein = 4 kcal/g, fat = 9 kcal/g).
          Month/Year bars show <strong style={{ color: "#7c828e" }}>average daily</strong> calories.
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, unit, min, max, step, value, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <label style={{ fontSize: 14, fontWeight: 500, color: "#cfd4dd" }}>{label}</label>
        <input type="number" min={min} max={max} step={step} value={value}
          onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v))); }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#565c66", fontFamily: "var(--mono)" }}>
        <span>{min} {unit}</span><span>{max} {unit}</span>
      </div>
    </div>
  );
}

function Summary({ k, v }) {
  return (
    <div style={{ background: "#121317", border: "1px solid #23262e", borderRadius: 11, padding: "12px 14px" }}>
      <div style={{ fontSize: 11.5, color: "#7c828e", marginBottom: 4 }}>{k}</div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 600 }}>{v}</div>
    </div>
  );
}
