import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";

// ═══════════════════════════════════════════
//  ResellerOS — Full Platform Preview
//  Dark editorial UI · Teal accent · Glass-morphic
// ═══════════════════════════════════════════

// ─── Icons (inline SVG for self-contained) ───
const Icon = ({ d, size = 20, className = "", stroke = "currentColor", fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}><path d={d} /></svg>
);

const Icons = {
  dashboard: (p) => <Icon {...p} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" />,
  package: (p) => <Icon {...p} d="M16.5 9.4l-9-5.19 M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12" />,
  layers: (p) => <Icon {...p} d="M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5" />,
  store: (p) => <Icon {...p} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
  dollar: (p) => <Icon {...p} d="M12 1v22 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />,
  brain: (p) => <Icon {...p} d="M12 2a7 7 0 017 7c0 3-2 5-3 7s-1 4-1 6h-6c0-2 0-4-1-6s-3-4-3-7a7 7 0 017-7z M9 22h6" />,
  zap: (p) => <Icon {...p} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  chart: (p) => <Icon {...p} d="M18 20V10 M12 20V4 M6 20v-6" />,
  settings: (p) => <Icon {...p} d="M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.2.65.77 1.09 1.45 1.1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />,
  search: (p) => <Icon {...p} d="M11 19a8 8 0 100-16 8 8 0 000 16z M21 21l-4.35-4.35" />,
  bell: (p) => <Icon {...p} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0" />,
  plus: (p) => <Icon {...p} d="M12 5v14 M5 12h14" />,
  share: (p) => <Icon {...p} d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8 M16 6l-4-4-4 4 M12 2v13" />,
  send: (p) => <Icon {...p} d="M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z" />,
  refresh: (p) => <Icon {...p} d="M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0020.49 15" />,
  trending: (p) => <Icon {...p} d="M23 6l-9.5 9.5-5-5L1 18" />,
  bag: (p) => <Icon {...p} d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18 M16 10a4 4 0 01-8 0" />,
  eye: (p) => <Icon {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 100-6 3 3 0 000 6z" />,
  link: (p) => <Icon {...p} d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71 M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />,
  check: (p) => <Icon {...p} d="M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01l-3-3" />,
  x: (p) => <Icon {...p} d="M18 6L6 18 M6 6l12 12" />,
  star: (p) => <Icon {...p} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
  upload: (p) => <Icon {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12" />,
  target: (p) => <Icon {...p} d="M12 22a10 10 0 100-20 10 10 0 000 20z M12 18a6 6 0 100-12 6 6 0 000 12z M12 14a2 2 0 100-4 2 2 0 000 4z" />,
  flame: (p) => <Icon {...p} d="M12 12c0-3 1.5-6 3-7.5C11.5 6 8 9.5 8 13c0 3.5 2.5 6 5.5 6s5-2 5.5-5c-1.5 1-3 1.5-4 1-1-.5-2-1.5-3-3z" />,
  clock: (p) => <Icon {...p} d="M12 22a10 10 0 100-20 10 10 0 000 20z M12 6v6l4 2" />,
  image: (p) => <Icon {...p} d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 21" />,
  grid: (p) => <Icon {...p} d="M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z" />,
  chevL: (p) => <Icon {...p} d="M15 18l-6-6 6-6" />,
  chevR: (p) => <Icon {...p} d="M9 18l6-6-6-6" />,
};

// ─── Shared Data ───
const REVENUE_WEEK = [
  { d: "Mon", rev: 145, sales: 3 }, { d: "Tue", rev: 220, sales: 5 }, { d: "Wed", rev: 89, sales: 2 },
  { d: "Thu", rev: 310, sales: 7 }, { d: "Fri", rev: 195, sales: 4 }, { d: "Sat", rev: 420, sales: 9 }, { d: "Sun", rev: 280, sales: 6 },
];
const MKT_PIE = [
  { name: "eBay", value: 42, color: "#3b82f6" }, { name: "Poshmark", value: 28, color: "#ef4444" },
  { name: "Mercari", value: 18, color: "#fb7185" }, { name: "Depop", value: 12, color: "#f97316" },
];
const PRODUCTS = [
  { id: 1, title: 'Lululemon Align 25" Black', brand: "Lululemon", size: "6", price: 68, cost: 12, status: "active", sku: "LUL-0412", days: 4, img: "🧘‍♀️" },
  { id: 2, title: "Nike Dunk Low Panda", brand: "Nike", size: "9.5", price: 145, cost: 85, status: "active", sku: "NIK-0318", days: 8, img: "👟" },
  { id: 3, title: "Free People Thermal Top", brand: "Free People", size: "S", price: 42, cost: 8, status: "active", sku: "FP-0221", days: 12, img: "👕" },
  { id: 4, title: "Vintage Levi's 501 Light Wash", brand: "Levi's", size: "30", price: 78, cost: 15, status: "active", sku: "LEV-0105", days: 21, img: "👖" },
  { id: 5, title: "Coach Crossbody Tabby", brand: "Coach", size: "OS", price: 195, cost: 45, status: "active", sku: "COA-0892", days: 3, img: "👜" },
  { id: 6, title: "Reformation Midi Dress", brand: "Reformation", size: "4", price: 88, cost: 22, status: "draft", sku: "REF-0456", days: 0, img: "👗" },
  { id: 7, title: "Patagonia Better Sweater", brand: "Patagonia", size: "M", price: 95, cost: 18, status: "active", sku: "PAT-0733", days: 15, img: "🧥" },
  { id: 8, title: "Aritzia TNA Hoodie", brand: "Aritzia", size: "XS", price: 55, cost: 10, status: "sold", sku: "ARI-0199", days: 7, img: "🧶" },
];
const LISTINGS = [
  { id: 1, product: "Lululemon Align 25\"", mkt: "poshmark", status: "active", price: 68, payout: 54.40, synced: "2m ago" },
  { id: 2, product: "Lululemon Align 25\"", mkt: "ebay", status: "active", price: 72, payout: 62.54, synced: "5m ago" },
  { id: 3, product: "Nike Dunk Low Panda", mkt: "ebay", status: "active", price: 145, payout: 125.96, synced: "3m ago" },
  { id: 4, product: "Nike Dunk Low Panda", mkt: "mercari", status: "active", price: 139, payout: 125.10, synced: "8m ago" },
  { id: 5, product: "Free People Thermal", mkt: "poshmark", status: "active", price: 42, payout: 33.60, synced: "1m ago" },
  { id: 6, product: "Free People Thermal", mkt: "depop", status: "active", price: 45, payout: 40.50, synced: "12m ago" },
  { id: 7, product: "Vintage Levi's 501", mkt: "ebay", status: "active", price: 78, payout: 67.76, synced: "20m ago" },
  { id: 8, product: "Coach Crossbody Tabby", mkt: "poshmark", status: "active", price: 195, payout: 156.00, synced: "1m ago" },
  { id: 9, product: "Aritzia TNA Hoodie", mkt: "poshmark", status: "sold", price: 55, payout: 44.00, synced: "1h ago" },
  { id: 10, product: "Patagonia Better Sweater", mkt: "mercari", status: "pending", price: 95, payout: 85.50, synced: "15m ago" },
];
const SALES = [
  { id: 1, product: "Aritzia TNA Hoodie", mkt: "poshmark", price: 55, fee: 11, profit: 34, date: "Feb 9", buyer: "sarah_k" },
  { id: 2, product: "Zara Blazer Oversized", mkt: "ebay", price: 62, fee: 8.14, profit: 41.86, date: "Feb 8", buyer: "m***7" },
  { id: 3, product: "Anthropologie Candle Set", mkt: "mercari", price: 28, fee: 2.80, profit: 17.20, date: "Feb 8", buyer: "home_lover" },
  { id: 4, product: "Madewell Transport Tote", mkt: "poshmark", price: 88, fee: 17.60, profit: 48.40, date: "Feb 7", buyer: "jess.m" },
  { id: 5, product: "Adidas Sambas White", mkt: "ebay", price: 95, fee: 12.47, profit: 52.53, date: "Feb 6", buyer: "k***2" },
];
const MARKETPLACES = [
  { id: "ebay", name: "eBay", type: "api", connected: true, user: "reseller_pro", initials: "eB", color: "#3b82f6" },
  { id: "poshmark", name: "Poshmark", type: "automation", connected: true, user: "@closet_queen", initials: "PM", color: "#ef4444" },
  { id: "mercari", name: "Mercari", type: "automation", connected: true, user: "seller2025", initials: "Me", color: "#fb7185" },
  { id: "depop", name: "Depop", type: "automation", connected: false, user: null, initials: "De", color: "#f97316" },
  { id: "facebook", name: "Facebook Marketplace", type: "hybrid", connected: false, user: null, initials: "FB", color: "#6366f1" },
  { id: "grailed", name: "Grailed", type: "automation", connected: false, user: null, initials: "Gr", color: "#78716c" },
];
const AUTO_TASKS = [
  { type: "share", mkt: "poshmark", product: 'Lululemon Align 25"', status: "completed", time: "2:30 PM" },
  { type: "share", mkt: "poshmark", product: "Nike Dunk Low Panda", status: "completed", time: "2:28 PM" },
  { type: "offer", mkt: "poshmark", product: "Free People Thermal", status: "completed", time: "12:00 PM", extra: "$35 offer" },
  { type: "relist", mkt: "mercari", product: "Vintage Levi's 501", status: "completed", time: "3:15 AM" },
  { type: "list", mkt: "ebay", product: "Coach Crossbody", status: "failed", time: "2:45 AM", extra: "Token expired" },
  { type: "share", mkt: "poshmark", product: "Reformation Dress", status: "queued", time: "6:00 PM" },
  { type: "offer", mkt: "poshmark", product: "Aritzia Hoodie", status: "queued", time: "7:30 PM", extra: "$28 offer" },
];
const AUTO_CHART = [
  { h: "6am", shares: 2, offers: 0, relists: 0 }, { h: "8am", shares: 8, offers: 1, relists: 0 },
  { h: "10am", shares: 12, offers: 2, relists: 1 }, { h: "12pm", shares: 15, offers: 3, relists: 0 },
  { h: "2pm", shares: 10, offers: 1, relists: 0 }, { h: "4pm", shares: 6, offers: 0, relists: 2 },
  { h: "6pm", shares: 18, offers: 4, relists: 0 }, { h: "8pm", shares: 22, offers: 6, relists: 1 },
  { h: "10pm", shares: 14, offers: 3, relists: 0 },
];
const AI_RULES = [
  { id: 1, name: "30-day markdown", trigger: "After 30 days listed", action: "10% off", floor: "$15", active: true, applied: 23 },
  { id: 2, name: "No engagement 7d", trigger: "No likes after 7 days", action: "15% off", floor: "$10", active: true, applied: 8 },
  { id: 3, name: "60-day clearance", trigger: "After 60 days listed", action: "25% off", floor: "$8", active: false, applied: 5 },
];
const MD_CHART = [
  { d: "Mon", c: 3 }, { d: "Tue", c: 7 }, { d: "Wed", c: 2 }, { d: "Thu", c: 5 }, { d: "Fri", c: 8 }, { d: "Sat", c: 12 }, { d: "Sun", c: 6 },
];

// ─── CSS ───
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=IBM+Plex+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg0: #0c0f14; --bg50: #111621; --bg100: #171d2b; --bg200: #1e2536;
    --bg300: #252e42; --bg400: #313b52; --bg500: #4a5568; --bg600: #718096;
    --bg700: #a0aec0; --bg800: #cbd5e0; --bg900: #e2e8f0; --bg950: #f7fafc;
    --brand: #22a899; --brandDim: rgba(34,168,153,0.15); --brandGlow: rgba(34,168,153,0.25);
    --coral: #FF6B6B; --amber: #FFAB4C; --violet: #A78BFA; --sky: #38BDF8;
    --ff-display: 'DM Sans', sans-serif; --ff-body: 'IBM Plex Sans', sans-serif;
    --ff-mono: 'JetBrains Mono', monospace;
  }
  body { background: var(--bg0); color: var(--bg900); font-family: var(--ff-body); }
  ::selection { background: var(--brandDim); color: var(--bg950); }
  ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--bg400); border-radius: 99px; }

  .shell { display: flex; min-height: 100vh; background: var(--bg0); position: relative; overflow: hidden; }
  .shell::before {
    content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background: radial-gradient(at 20% 80%, rgba(34,168,153,0.06) 0, transparent 50%),
                radial-gradient(at 80% 20%, rgba(167,139,250,0.04) 0, transparent 50%),
                radial-gradient(at 50% 50%, rgba(255,107,107,0.02) 0, transparent 60%);
  }

  /* Sidebar */
  .sidebar {
    width: 220px; min-height: 100vh; position: fixed; left: 0; top: 0; z-index: 40;
    background: rgba(17,22,33,0.95); backdrop-filter: blur(20px);
    border-right: 1px solid rgba(37,46,66,0.5); display: flex; flex-direction: column;
    transition: width 0.3s;
  }
  .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 16px 18px; border-bottom: 1px solid rgba(37,46,66,0.4); }
  .sidebar-logo .icon { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #22a899, #176d67); display: flex; align-items: center; justify-content: center; color: #fff; font-family: var(--ff-display); font-weight: 700; font-size: 14px; }
  .sidebar-logo .text { font-family: var(--ff-display); font-weight: 700; font-size: 17px; color: var(--bg950); letter-spacing: -0.3px; }
  .sidebar-logo .text span { color: var(--brand); }

  .nav-items { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; }
  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px;
    font-size: 13px; font-weight: 500; color: var(--bg600); cursor: pointer;
    transition: all 0.2s; position: relative; border: none; background: none; width: 100%; text-align: left;
  }
  .nav-item:hover { background: rgba(30,37,54,0.6); color: var(--bg900); }
  .nav-item.active { background: var(--brandDim); color: #3ec5b3; }
  .nav-item.active::before {
    content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
    width: 3px; height: 18px; background: var(--brand); border-radius: 0 4px 4px 0;
  }
  .nav-item svg { flex-shrink: 0; }

  .sidebar-bottom { padding: 12px; border-top: 1px solid rgba(37,46,66,0.4); }
  .user-card {
    display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 10px; background: var(--bg100);
  }
  .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--brandDim); display: flex; align-items: center; justify-content: center; font-family: var(--ff-display); font-weight: 600; font-size: 11px; color: #3ec5b3; }
  .user-name { font-size: 13px; font-weight: 500; color: var(--bg800); }
  .user-plan { font-size: 11px; color: var(--bg500); }

  /* Main content */
  .main { margin-left: 220px; flex: 1; position: relative; z-index: 1; min-height: 100vh; }

  /* Header */
  .header {
    position: sticky; top: 0; z-index: 30; display: flex; align-items: center; justify-content: space-between;
    height: 56px; padding: 0 24px; background: rgba(12,15,20,0.8); backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(37,46,66,0.2);
  }
  .header h1 { font-family: var(--ff-display); font-weight: 700; font-size: 18px; color: var(--bg950); }
  .header .sub { font-size: 12px; color: var(--bg500); margin-top: 1px; }
  .header-right { display: flex; align-items: center; gap: 10px; }
  .search-box {
    position: relative; width: 220px;
  }
  .search-box input {
    width: 100%; background: var(--bg100); border: 1px solid rgba(37,46,66,0.5); border-radius: 10px;
    padding: 7px 12px 7px 34px; font-size: 12px; color: var(--bg900); outline: none;
    font-family: var(--ff-body); transition: border-color 0.2s;
  }
  .search-box input::placeholder { color: var(--bg500); }
  .search-box input:focus { border-color: rgba(34,168,153,0.5); }
  .search-box .icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--bg500); }
  .icon-btn {
    width: 36px; height: 36px; border-radius: 10px; border: 1px solid rgba(37,46,66,0.5);
    background: var(--bg100); display: flex; align-items: center; justify-content: center;
    color: var(--bg600); cursor: pointer; position: relative; transition: all 0.2s;
  }
  .icon-btn:hover { background: var(--bg200); color: var(--bg900); }
  .notif-dot { position: absolute; top: 6px; right: 6px; width: 6px; height: 6px; background: var(--coral); border-radius: 50%; }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 10px;
    background: #18887e; color: #fff; font-family: var(--ff-display); font-weight: 500; font-size: 12px;
    border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 20px rgba(34,168,153,0.15);
  }
  .btn-primary:hover { background: #22a899; box-shadow: 0 0 30px rgba(34,168,153,0.25); }
  .btn-secondary {
    display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 10px;
    background: var(--bg200); color: var(--bg800); font-family: var(--ff-display); font-weight: 500;
    font-size: 12px; border: 1px solid rgba(37,46,66,0.6); cursor: pointer; transition: all 0.2s;
  }
  .btn-secondary:hover { background: var(--bg300); }

  /* Content */
  .content { padding: 24px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
  .grid-3-2 { display: grid; grid-template-columns: 3fr 2fr; gap: 16px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  /* Cards */
  .card {
    background: rgba(23,29,43,0.8); backdrop-filter: blur(12px);
    border: 1px solid rgba(37,46,66,0.5); border-radius: 14px;
    transition: border-color 0.3s;
  }
  .card:hover { border-color: rgba(49,59,82,0.8); }
  .card-p { padding: 18px; }

  /* Stat card */
  .stat-card { padding: 18px; position: relative; overflow: hidden; }
  .stat-card::before {
    content: ''; position: absolute; inset: 0; opacity: 0.6; border-radius: inherit;
  }
  .stat-card.brand::before { background: linear-gradient(135deg, rgba(34,168,153,0.12) 0, rgba(34,168,153,0.02) 100%); }
  .stat-card.amber::before { background: linear-gradient(135deg, rgba(255,171,76,0.12) 0, rgba(255,171,76,0.02) 100%); }
  .stat-card.violet::before { background: linear-gradient(135deg, rgba(167,139,250,0.12) 0, rgba(167,139,250,0.02) 100%); }
  .stat-card.coral::before { background: linear-gradient(135deg, rgba(255,107,107,0.12) 0, rgba(255,107,107,0.02) 100%); }
  .stat-card.sky::before { background: linear-gradient(135deg, rgba(56,189,248,0.12) 0, rgba(56,189,248,0.02) 100%); }
  .stat-label { font-size: 12px; color: var(--bg500); font-weight: 500; position: relative; }
  .stat-value { font-family: var(--ff-display); font-weight: 700; font-size: 24px; color: var(--bg950); margin-top: 4px; position: relative; }
  .stat-change { font-size: 11px; font-weight: 500; margin-top: 4px; position: relative; }
  .stat-change.up { color: #34d399; }
  .stat-change.down { color: var(--coral); }
  .stat-icon { position: absolute; right: 18px; top: 18px; width: 36px; height: 36px; border-radius: 10px; background: rgba(30,37,54,0.6); display: flex; align-items: center; justify-content: center; color: var(--bg600); z-index: 1; }

  .section-title { font-family: var(--ff-display); font-weight: 600; font-size: 14px; color: var(--bg900); }
  .section-sub { font-size: 11px; color: var(--bg500); margin-top: 2px; }

  /* Badges */
  .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; border: 1px solid; }
  .badge-ebay { background: rgba(59,130,246,0.12); color: #60a5fa; border-color: rgba(59,130,246,0.25); }
  .badge-poshmark { background: rgba(239,68,68,0.12); color: #f87171; border-color: rgba(239,68,68,0.25); }
  .badge-mercari { background: rgba(251,113,133,0.12); color: #fb7185; border-color: rgba(251,113,133,0.25); }
  .badge-depop { background: rgba(249,115,22,0.12); color: #fb923c; border-color: rgba(249,115,22,0.25); }
  .status-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; }
  .status-active { background: rgba(52,211,153,0.12); color: #34d399; }
  .status-sold { background: rgba(34,168,153,0.12); color: #3ec5b3; }
  .status-draft { background: rgba(74,85,104,0.15); color: var(--bg600); }
  .status-pending { background: rgba(255,171,76,0.12); color: #FFAB4C; }
  .status-failed { background: rgba(255,107,107,0.12); color: #FF6B6B; }
  .status-queued { background: rgba(255,171,76,0.12); color: #FFAB4C; }
  .status-completed { background: rgba(52,211,153,0.12); color: #34d399; }

  /* Tables */
  .table { width: 100%; border-collapse: collapse; }
  .table th { text-align: left; padding: 10px 16px; font-size: 11px; color: var(--bg500); font-weight: 500; border-bottom: 1px solid rgba(37,46,66,0.3); }
  .table th.right { text-align: right; }
  .table td { padding: 10px 16px; font-size: 13px; border-bottom: 1px solid rgba(37,46,66,0.15); transition: background 0.15s; }
  .table tr:hover td { background: rgba(23,29,43,0.5); }
  .table .right { text-align: right; }
  .table .mono { font-family: var(--ff-mono); font-size: 11px; color: var(--bg500); }
  .table .bold { font-family: var(--ff-display); font-weight: 600; color: var(--bg900); }
  .table .profit { font-family: var(--ff-display); font-weight: 600; }
  .table .profit.pos { color: #34d399; }
  .table .profit.neg { color: var(--coral); }
  .truncate { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* Product grid */
  .product-card { cursor: pointer; overflow: hidden; }
  .product-card:hover { border-color: rgba(49,59,82,0.8); transform: translateY(-1px); }
  .product-img { aspect-ratio: 1; background: var(--bg200); display: flex; align-items: center; justify-content: center; font-size: 42px; position: relative; }
  .product-status { position: absolute; top: 8px; right: 8px; }
  .product-info { padding: 12px; }
  .product-title { font-size: 13px; font-weight: 500; color: var(--bg900); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .product-meta { font-size: 11px; color: var(--bg500); margin-top: 4px; }
  .product-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(37,46,66,0.2); }
  .product-price { font-family: var(--ff-display); font-weight: 700; color: var(--bg950); }
  .product-sku { font-family: var(--ff-mono); font-size: 10px; color: var(--bg500); }

  /* Marketplace cards */
  .mkt-card { padding: 18px; }
  .mkt-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
  .mkt-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-family: var(--ff-display); font-weight: 700; font-size: 13px; }
  .mkt-info { display: flex; align-items: center; gap: 10px; }
  .mkt-name { font-family: var(--ff-display); font-weight: 600; font-size: 14px; color: var(--bg900); }
  .mkt-type { font-size: 11px; color: var(--bg500); }
  .mkt-details { padding: 10px; background: rgba(30,37,54,0.4); border-radius: 10px; margin-bottom: 14px; }
  .mkt-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; }
  .mkt-row .label { color: var(--bg500); }
  .mkt-row .val { color: var(--bg800); font-weight: 500; }

  /* Toggle switch */
  .toggle { position: relative; width: 40px; height: 22px; border-radius: 999px; cursor: pointer; transition: background 0.3s; border: none; }
  .toggle.on { background: var(--brand); }
  .toggle.off { background: var(--bg400); }
  .toggle::after { content: ''; position: absolute; top: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
  .toggle.on::after { transform: translateX(20px); }
  .toggle.off::after { transform: translateX(3px); }

  /* Auto task list */
  .task-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; transition: background 0.15s; }
  .task-row:hover { background: rgba(23,29,43,0.3); }
  .task-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .task-type { font-size: 11px; font-weight: 500; }
  .task-product { font-size: 13px; color: var(--bg800); }
  .task-extra { font-size: 11px; color: var(--bg500); }
  .task-time { font-family: var(--ff-mono); font-size: 11px; color: var(--bg500); }

  /* AI section */
  .ai-suggestion { padding: 14px; background: var(--brandDim); border: 1px solid rgba(34,168,153,0.2); border-radius: 10px; }
  .ai-price { font-family: var(--ff-display); font-weight: 700; font-size: 22px; color: var(--bg950); }
  .ai-range { font-family: var(--ff-mono); font-size: 11px; color: var(--bg600); }
  .rule-row { display: flex; align-items: center; justify-content: space-between; padding: 12px; background: rgba(23,29,43,0.5); border-radius: 10px; border: 1px solid rgba(37,46,66,0.3); }
  .rule-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .rule-name { font-size: 13px; font-weight: 500; color: var(--bg900); }
  .rule-desc { font-size: 11px; color: var(--bg500); }
  .rule-count { font-family: var(--ff-mono); font-size: 11px; color: var(--bg500); }

  /* Animations */
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .anim-up { animation: fadeInUp 0.5s ease-out both; }
  .anim-fade { animation: fadeIn 0.4s ease-out both; }
  .delay-1 { animation-delay: 0.05s; } .delay-2 { animation-delay: 0.1s; }
  .delay-3 { animation-delay: 0.15s; } .delay-4 { animation-delay: 0.2s; }
  .delay-5 { animation-delay: 0.25s; } .delay-6 { animation-delay: 0.3s; }

  /* Tooltip overrides */
  .recharts-default-tooltip { background: #171d2b !important; border: 1px solid rgba(49,59,82,0.6) !important; border-radius: 10px !important; font-size: 12px !important; font-family: var(--ff-body) !important; }
`;

// ─── Tooltip styles ───
const ttStyle = { background: "#171d2b", border: "1px solid rgba(49,59,82,0.6)", borderRadius: 10, fontSize: 12, fontFamily: "IBM Plex Sans" };

// ─── Helpers ───
const fmt = (v) => v == null ? "—" : "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (v) => Number(v).toLocaleString("en-US");

// ─── Pages ───
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: Icons.dashboard },
  { id: "products", label: "Products", icon: Icons.package },
  { id: "listings", label: "Listings", icon: Icons.layers },
  { id: "marketplaces", label: "Marketplaces", icon: Icons.store },
  { id: "sales", label: "Sales", icon: Icons.dollar },
  { id: "ai", label: "AI Pricing", icon: Icons.brain },
  { id: "automation", label: "Automation", icon: Icons.zap },
  { id: "analytics", label: "Analytics", icon: Icons.chart },
];

// ════════════════════════════════════════════
//  PAGE: Dashboard
// ════════════════════════════════════════════
function DashboardPage() {
  return (
    <div className="content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="grid-4">
        {[
          { label: "Active Listings", value: "127", icon: Icons.layers, color: "brand", change: "+12%" },
          { label: "Total Revenue", value: "$4,892", icon: Icons.dollar, color: "amber", change: "+8%" },
          { label: "Items Sold", value: "43", icon: Icons.bag, color: "violet", change: "+15%" },
          { label: "Total Profit", value: "$2,147", icon: Icons.trending, color: "coral", change: "-3%" },
        ].map((s, i) => (
          <div key={i} className={`card stat-card ${s.color} anim-up delay-${i + 1}`}>
            <div className="stat-icon">{s.icon({ size: 18 })}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-change ${s.change.startsWith("+") ? "up" : "down"}`}>{s.change.startsWith("+") ? "↑" : "↓"} {s.change.replace(/[+-]/, "")} vs last period</div>
          </div>
        ))}
      </div>

      <div className="grid-2-1">
        <div className="card card-p anim-up delay-3">
          <div className="section-title" style={{ marginBottom: 14 }}>Revenue This Week</div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_WEEK}>
                <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22a899" stopOpacity={0.3} /><stop offset="100%" stopColor="#22a899" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="d" tick={{ fill: "#718096", fontSize: 11, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#718096", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={ttStyle} formatter={v => [`$${v}`, "Revenue"]} />
                <Area type="monotone" dataKey="rev" stroke="#22a899" strokeWidth={2.5} fill="url(#rg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card card-p anim-up delay-4">
          <div className="section-title" style={{ marginBottom: 14 }}>By Marketplace</div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={MKT_PIE} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
                {MKT_PIE.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie><Tooltip contentStyle={ttStyle} formatter={v => [`${v}%`, "Share"]} /></PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {MKT_PIE.map(m => (
              <div key={m.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--bg700)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: m.color }} />{m.name}
                </span>
                <span style={{ fontFamily: "var(--ff-mono)", fontSize: 11, color: "var(--bg500)" }}>{m.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card anim-up delay-5">
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(37,46,66,0.3)" }}>
          <div className="section-title">Recent Sales</div>
        </div>
        {SALES.slice(0, 4).map((s, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px", borderBottom: "1px solid rgba(37,46,66,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--brandDim)", display: "flex", alignItems: "center", justifyContent: "center" }}>{Icons.bag({ size: 15, stroke: "#3ec5b3" })}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--bg900)" }}>{s.product}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                  <span className={`badge badge-${s.mkt}`}>{s.mkt}</span>
                  <span style={{ fontSize: 11, color: "var(--bg500)" }}>{s.date}</span>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, color: "var(--bg900)" }}>{fmt(s.price)}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#34d399" }}>+{fmt(s.profit)} profit</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  PAGE: Products
// ════════════════════════════════════════════
function ProductsPage() {
  return (
    <div className="content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="search-box"><span className="icon">{Icons.search({ size: 14 })}</span><input placeholder="Search by title, brand, SKU…" /></div>
        <div style={{ display: "flex", gap: 8 }}>
          <select style={{ background: "var(--bg100)", border: "1px solid rgba(37,46,66,0.5)", borderRadius: 10, padding: "7px 12px", fontSize: 12, color: "var(--bg900)", outline: "none" }}>
            <option>All Status</option><option>Active</option><option>Draft</option><option>Sold</option>
          </select>
          <button className="btn-primary">{Icons.plus({ size: 14 })} Add Product</button>
        </div>
      </div>
      <div className="grid-4">
        {PRODUCTS.map((p, i) => (
          <div key={p.id} className={`card product-card anim-up delay-${(i % 6) + 1}`} style={{ transition: "all 0.2s" }}>
            <div className="product-img">{p.img}<div className="product-status"><span className={`status-badge status-${p.status}`}>{p.status}</span></div></div>
            <div className="product-info">
              <div className="product-title">{p.title}</div>
              <div className="product-meta">{p.brand} · {p.size}</div>
              <div className="product-bottom">
                <span className="product-price">{fmt(p.price)}</span>
                <span className="product-sku">{p.sku}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  PAGE: Listings
// ════════════════════════════════════════════
function ListingsPage() {
  return (
    <div className="content anim-fade">
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead><tr><th>Product</th><th>Marketplace</th><th>Status</th><th className="right">Price</th><th className="right">Est. Payout</th><th>Synced</th><th className="right">Actions</th></tr></thead>
          <tbody>
            {LISTINGS.map(l => (
              <tr key={l.id}>
                <td><span className="truncate" style={{ display: "block", fontWeight: 500, color: "var(--bg900)" }}>{l.product}</span></td>
                <td><span className={`badge badge-${l.mkt}`}>{l.mkt}</span></td>
                <td><span className={`status-badge status-${l.status}`}>{l.status}</span></td>
                <td className="right bold">{fmt(l.price)}</td>
                <td className="right" style={{ color: "var(--bg600)" }}>{fmt(l.payout)}</td>
                <td style={{ fontSize: 12, color: "var(--bg500)" }}>{l.synced}</td>
                <td className="right">
                  {l.status === "active" && <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <button className="icon-btn" style={{ width: 28, height: 28, borderRadius: 6 }} title="Relist">{Icons.refresh({ size: 13 })}</button>
                    <button className="icon-btn" style={{ width: 28, height: 28, borderRadius: 6 }} title="Delist">{Icons.x({ size: 13 })}</button>
                  </div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  PAGE: Marketplaces
// ════════════════════════════════════════════
function MarketplacesPage() {
  return (
    <div className="content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="grid-3">
        {MARKETPLACES.map((m, i) => (
          <div key={m.id} className={`card mkt-card anim-up delay-${(i % 6) + 1}`}>
            <div className="mkt-header">
              <div className="mkt-info">
                <div className="mkt-icon" style={{ background: m.color + "25", color: m.color }}>{m.initials}</div>
                <div><div className="mkt-name">{m.name}</div><div className="mkt-type">{m.type} integration</div></div>
              </div>
              {m.connected && Icons.check({ size: 18, stroke: "#34d399" })}
            </div>
            {m.connected && (
              <div className="mkt-details">
                <div className="mkt-row"><span className="label">Username</span><span className="val">{m.user}</span></div>
                <div className="mkt-row"><span className="label">Last sync</span><span className="val">5m ago</span></div>
                <div className="mkt-row"><span className="label">Status</span><span className="val" style={{ color: "#34d399" }}>Connected</span></div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              {m.connected ? (
                <><button className="btn-secondary" style={{ flex: 1 }}>{Icons.refresh({ size: 13 })} Sync</button></>
              ) : (
                <button className="btn-primary" style={{ flex: 1 }}>{Icons.link({ size: 13 })} Connect</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  PAGE: Sales
// ════════════════════════════════════════════
function SalesPage() {
  return (
    <div className="content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="grid-4">
        {[
          { label: "Total Revenue", value: "$4,892", icon: Icons.dollar, color: "amber" },
          { label: "Total Profit", value: "$2,147", icon: Icons.trending, color: "brand" },
          { label: "Items Sold", value: "43", icon: Icons.bag, color: "violet" },
          { label: "Avg Profit", value: "$49.93", icon: Icons.target, color: "sky" },
        ].map((s, i) => (
          <div key={i} className={`card stat-card ${s.color} anim-up delay-${i + 1}`}>
            <div className="stat-icon">{s.icon({ size: 18 })}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="card anim-up delay-3" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead><tr><th>Product</th><th>Marketplace</th><th className="right">Sale Price</th><th className="right">Fees</th><th className="right">Profit</th><th>Date</th></tr></thead>
          <tbody>
            {SALES.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 500, color: "var(--bg900)" }}>{s.product}</td>
                <td><span className={`badge badge-${s.mkt}`}>{s.mkt}</span></td>
                <td className="right bold">{fmt(s.price)}</td>
                <td className="right" style={{ color: "var(--bg500)" }}>{fmt(s.fee)}</td>
                <td className="right"><span className="profit pos">+{fmt(s.profit)}</span></td>
                <td style={{ fontSize: 12, color: "var(--bg500)" }}>{s.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  PAGE: AI Pricing
// ════════════════════════════════════════════
function AIPricingPage() {
  const [suggestions, setSuggestions] = useState({});
  const getSuggestion = (id) => {
    const p = PRODUCTS.find(x => x.id === id);
    const suggested = Math.round(p.price * (0.85 + Math.random() * 0.3));
    setSuggestions(prev => ({ ...prev, [id]: { price: suggested, low: Math.round(suggested * 0.8), high: Math.round(suggested * 1.2), confidence: "High", comps: Math.floor(Math.random() * 15) + 5 } }));
  };

  return (
    <div className="content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="grid-4">
        {[
          { label: "AI Priced Items", value: "47", icon: Icons.brain, color: "brand" },
          { label: "Auto Markdowns", value: "23", icon: Icons.trending, color: "amber", change: "+15%" },
          { label: "Avg Days to Sell", value: "12", icon: Icons.target, color: "violet", change: "-8%" },
          { label: "Revenue Recovered", value: "$1,340", icon: Icons.dollar, color: "coral", change: "+22%" },
        ].map((s, i) => (
          <div key={i} className={`card stat-card ${s.color} anim-up delay-${i + 1}`}>
            <div className="stat-icon">{s.icon({ size: 18 })}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            {s.change && <div className={`stat-change ${s.change.startsWith("+") ? "up" : "down"}`}>{s.change.startsWith("+") ? "↑" : "↓"} {s.change.replace(/[+-]/, "")} vs last period</div>}
          </div>
        ))}
      </div>

      <div className="grid-3-2">
        <div className="card card-p anim-up delay-3">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div><div className="section-title">Smart Markdown Rules</div><div className="section-sub">Automatically adjust prices based on conditions</div></div>
            <button className="btn-primary" style={{ fontSize: 11 }}>{Icons.plus({ size: 13 })} Add Rule</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {AI_RULES.map(r => (
              <div key={r.id} className="rule-row">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="rule-dot" style={{ background: r.active ? "#34d399" : "var(--bg500)" }} />
                  <div><div className="rule-name">{r.name}</div><div className="rule-desc">{r.trigger} → {r.action} · Floor: {r.floor}</div></div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="rule-count">{r.applied}x</span>
                  <button className={`toggle ${r.active ? "on" : "off"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card card-p anim-up delay-4">
          <div className="section-title" style={{ marginBottom: 14 }}>Weekly Auto-Markdowns</div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MD_CHART}>
                <XAxis dataKey="d" tick={{ fill: "#718096", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#718096", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="c" fill="#22a899" radius={[5, 5, 0, 0]} name="Markdowns" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div><div className="section-title" style={{ marginBottom: 12 }}>Price Suggestions</div></div>
      <div className="grid-3">
        {PRODUCTS.filter(p => p.status === "active").slice(0, 6).map((p, i) => {
          const s = suggestions[p.id];
          return (
            <div key={p.id} className={`card card-p anim-up delay-${(i % 6) + 1}`}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div><div style={{ fontSize: 13, fontWeight: 500, color: "var(--bg900)" }}>{p.title}</div><div style={{ fontSize: 11, color: "var(--bg500)", marginTop: 2 }}>{p.brand} · {p.size}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "var(--bg500)" }}>Current</div><div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, color: "var(--bg900)" }}>{fmt(p.price)}</div></div>
              </div>
              {s ? (
                <div style={{ animation: "fadeInUp 0.4s ease-out" }}>
                  <div className="ai-suggestion">
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>{Icons.brain({ size: 14, stroke: "#3ec5b3" })}<span style={{ fontSize: 12, fontWeight: 500, color: "#3ec5b3" }}>AI Suggestion</span></div>
                    <div className="ai-price">{fmt(s.price)}</div>
                    <div className="ai-range">Range: {fmt(s.low)} – {fmt(s.high)} · {s.confidence} · {s.comps} comps</div>
                  </div>
                  <button className="btn-primary" style={{ width: "100%", marginTop: 10, justifyContent: "center" }}>Apply {fmt(s.price)}</button>
                </div>
              ) : (
                <button className="btn-secondary" style={{ width: "100%", justifyContent: "center" }} onClick={() => getSuggestion(p.id)}>{Icons.brain({ size: 13 })} Get AI Price</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  PAGE: Automation
// ════════════════════════════════════════════
function AutomationPage() {
  const [autoShare, setAutoShare] = useState(true);
  const [autoOffer, setAutoOffer] = useState(true);
  const [autoRelist, setAutoRelist] = useState(false);

  const taskCfg = {
    share: { icon: Icons.share, label: "Share", color: "#60a5fa", bg: "rgba(59,130,246,0.1)" },
    offer: { icon: Icons.send, label: "Offer", color: "#FFAB4C", bg: "rgba(255,171,76,0.1)" },
    relist: { icon: Icons.refresh, label: "Relist", color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
    list: { icon: Icons.zap, label: "List", color: "#3ec5b3", bg: "rgba(34,168,153,0.1)" },
  };
  const statusIcon = { completed: "✓", failed: "✗", queued: "◷" };
  const statusColor = { completed: "#34d399", failed: "#FF6B6B", queued: "#FFAB4C" };

  return (
    <div className="content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="grid-4">
        {[
          { label: "Tasks Today", value: "186", icon: Icons.zap, color: "brand" },
          { label: "Shares Today", value: "142", icon: Icons.share, color: "sky", change: "+18%" },
          { label: "Offers Sent", value: "24", icon: Icons.send, color: "amber", change: "+12%" },
          { label: "Items Relisted", value: "8", icon: Icons.refresh, color: "violet" },
        ].map((s, i) => (
          <div key={i} className={`card stat-card ${s.color} anim-up delay-${i + 1}`}>
            <div className="stat-icon">{s.icon({ size: 18 })}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            {s.change && <div className={`stat-change up`}>↑ {s.change.replace("+", "")} vs last period</div>}
          </div>
        ))}
      </div>

      <div className="grid-3">
        {[
          { icon: Icons.share, title: "Auto Share", desc: "Share closet to followers on schedule", enabled: autoShare, toggle: () => setAutoShare(!autoShare), stats: [{ v: "142", l: "today" }, { v: "4h", l: "interval" }, { v: "98%", l: "success" }], color: "#3b82f6" },
          { icon: Icons.send, title: "Auto Offers", desc: "Send offers to likers at optimal times", enabled: autoOffer, toggle: () => setAutoOffer(!autoOffer), stats: [{ v: "24", l: "today" }, { v: "10%", l: "discount" }, { v: "32%", l: "accepted" }], color: "#FFAB4C" },
          { icon: Icons.refresh, title: "Auto Relist", desc: "Delete & relist for fresh visibility", enabled: autoRelist, toggle: () => setAutoRelist(!autoRelist), stats: [{ v: "8", l: "today" }, { v: "14d", l: "interval" }, { v: "↑23%", l: "views" }], color: "#a78bfa" },
        ].map((a, i) => (
          <div key={i} className={`card card-p anim-up delay-${i + 1}`} style={a.enabled ? { borderColor: a.color + "35", background: a.color + "08" } : {}}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: a.enabled ? a.color + "20" : "var(--bg200)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {a.icon({ size: 17, stroke: a.enabled ? a.color : "var(--bg500)" })}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--ff-display)", fontWeight: 600, fontSize: 13, color: "var(--bg900)" }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: "var(--bg500)" }}>{a.desc}</div>
                </div>
              </div>
              <button className={`toggle ${a.enabled ? "on" : "off"}`} onClick={a.toggle} />
            </div>
            <div style={{ display: "flex", gap: 20, paddingTop: 10, borderTop: "1px solid rgba(37,46,66,0.2)" }}>
              {a.stats.map((s, j) => <div key={j}><div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: 16, color: "var(--bg900)" }}>{s.v}</div><div style={{ fontSize: 11, color: "var(--bg500)" }}>{s.l}</div></div>)}
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card card-p anim-up delay-4">
          <div className="section-title" style={{ marginBottom: 14 }}>Today's Activity</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={AUTO_CHART} barCategoryGap="20%">
                <XAxis dataKey="h" tick={{ fill: "#718096", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#718096", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="shares" fill="#3b82f6" stackId="a" name="Shares" />
                <Bar dataKey="offers" fill="#FFAB4C" stackId="a" name="Offers" />
                <Bar dataKey="relists" fill="#a78bfa" stackId="a" radius={[4, 4, 0, 0]} name="Relists" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card anim-up delay-5" style={{ overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(37,46,66,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="section-title">Task Queue</div>
            <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--bg500)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: 99, background: "#FFAB4C" }} />Queued</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: 99, background: "#34d399" }} />Done</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: 99, background: "#FF6B6B" }} />Failed</span>
            </div>
          </div>
          {AUTO_TASKS.map((t, i) => {
            const cfg = taskCfg[t.type] || taskCfg.share;
            return (
              <div key={i} className="task-row" style={{ borderBottom: "1px solid rgba(37,46,66,0.1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="task-icon" style={{ background: cfg.bg }}>{cfg.icon({ size: 13, stroke: cfg.color })}</div>
                  <div>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <span className="task-type" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span style={{ fontSize: 10, color: "var(--bg400)" }}>·</span>
                      <span style={{ fontSize: 11, color: "var(--bg500)" }}>{t.mkt}</span>
                    </div>
                    <div className="task-product">{t.product}</div>
                    {t.extra && <div className="task-extra" style={{ color: t.status === "failed" ? "#FF6B6B" : "var(--bg500)" }}>{t.extra}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="task-time">{t.time}</span>
                  <span style={{ fontSize: 13, color: statusColor[t.status] }}>{statusIcon[t.status]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  PAGE: Analytics (bonus)
// ════════════════════════════════════════════
function AnalyticsPage() {
  const data = REVENUE_WEEK.map(d => ({ ...d, profit: Math.round(d.rev * 0.44), items: d.sales }));
  return (
    <div className="content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="grid-2 anim-fade">
        <div className="card card-p">
          <div className="section-title" style={{ marginBottom: 14 }}>Revenue vs Profit</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="d" tick={{ fill: "#718096", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#718096", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="rev" fill="#22a899" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="profit" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card card-p">
          <div className="section-title" style={{ marginBottom: 14 }}>Items Sold Trend</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <XAxis dataKey="d" tick={{ fill: "#718096", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#718096", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={ttStyle} />
                <Line type="monotone" dataKey="items" stroke="#38BDF8" strokeWidth={2.5} dot={{ r: 4, fill: "#38BDF8" }} name="Items Sold" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("dashboard");

  const PAGE_MAP = {
    dashboard: { title: "Dashboard", sub: "Your reselling command center", component: DashboardPage },
    products: { title: "Products", sub: "8 total products", component: ProductsPage },
    listings: { title: "Listings", sub: "10 listings across all marketplaces", component: ListingsPage },
    marketplaces: { title: "Marketplaces", sub: "Connect your selling accounts", component: MarketplacesPage },
    sales: { title: "Sales", sub: "Track revenue, profit, and fulfillment", component: SalesPage },
    ai: { title: "AI Pricing", sub: "Smart suggestions, demand analysis, automated markdowns", component: AIPricingPage },
    automation: { title: "Automation", sub: "Auto-share, send offers, relist on autopilot", component: AutomationPage },
    analytics: { title: "Analytics", sub: "Revenue charts and performance insights", component: AnalyticsPage },
  };

  const current = PAGE_MAP[page];
  const PageComponent = current.component;

  return (
    <>
      <style>{css}</style>
      <div className="shell">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="icon">R</div>
            <div className="text">Reseller<span>OS</span></div>
          </div>
          <nav className="nav-items">
            {NAV.map(n => (
              <button key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}>
                {n.icon({ size: 18 })} {n.label}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="user-card">
              <div className="user-avatar">JD</div>
              <div><div className="user-name">Jane Doe</div><div className="user-plan">Pro plan</div></div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="main">
          <div className="header">
            <div>
              <h1>{current.title}</h1>
              <div className="sub">{current.sub}</div>
            </div>
            <div className="header-right">
              <div className="search-box">
                <span className="icon">{Icons.search({ size: 14 })}</span>
                <input placeholder="Search products, listings…" />
              </div>
              <div className="icon-btn">{Icons.bell({ size: 16 })}<span className="notif-dot" /></div>
              <button className="btn-primary">{Icons.plus({ size: 14 })} New Product</button>
            </div>
          </div>
          <PageComponent key={page} />
        </div>
      </div>
    </>
  );
}
