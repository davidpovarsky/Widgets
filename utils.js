// =======================
// utils.js  (global helpers)
// =======================

// פונקציה שמחזירה את תאריך היום בפורמט YYYY-MM-DD
globalThis.isoDateTodayLocal = function () {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// fetch JSON with timeout
globalThis.fetchJson = async function (url) {
  const req = new Request(url);
  req.timeoutInterval = 20;
  return await req.loadJSON();
};

// sleep function using Scriptable timers
globalThis.sleep = function (ms) {
  return new Promise((resolve) =>
    Timer.schedule(ms / 1000, false, resolve)
  );
};

// =======================
// operator color table 1:1 מהקוד שלך
// =======================

globalThis.OPERATOR_COLORS = {
  "5": "#3868A7",
  "31": "#3868A7",
  "32": "#3868A7",

  "3": "#218563",

  "6": "#009d43",

  "40": "#aa131f",

  "4": "#9aca3c",
  "25": "#9aca3c",

  "15": "#F3AD44",

  "16": "#cdcdcd",

  "18": "#99ca3c",

  "20": "#e28a07",

  "7": "#e0e1e3",
  "14": "#e0e1e3",

  "33": "#e0e1e3",

  "8": "#ad1b1c",

  "34": "#78be99",

  "35": "#e0e1e3",

  "37": "#df8430",
  "38": "#df8430",

  "98": "#f2d03f",
  "93": "#f2d03f",
  "91": "#f2d03f",
  "97": "#f2d03f",

  "21": "#bf4000",
  "22": "#bf4000",

  "24": "#6fa421",

  "49": "#ffffff",
  "42": "#ffffff",

  "135": "#8db7e1"
};

// פונקציה לקבלת צבע מפעיל — 1:1 מהקוד שלך
globalThis.getOperatorColor = function (operatorId, apiColor) {
  const key = operatorId != null ? String(operatorId) : "";
  if (key && OPERATOR_COLORS[key]) return OPERATOR_COLORS[key];
  if (apiColor && typeof apiColor === "string") return apiColor;
  return null;
};