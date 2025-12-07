// api_static.js
// טוען stops.json מה-iCloud

const fm = FileManager.iCloud();
const stopsFile = fm.joinPath(fm.documentsDirectory(), "stops.json");
await fm.downloadFileFromiCloud(stopsFile);

const stopsDataRaw = fm.readString(stopsFile);
let stopsData;

try {
  stopsData = JSON.parse(stopsDataRaw);
} catch (e) {
  const a = new Alert();
  a.title = "שגיאה בטעינת stops.json";
  a.message = String(e);
  await a.present();
  return;
}

// הפקת רשימות תחנות
const stopsArray = Array.isArray(stopsData)
  ? stopsData
  : Array.isArray(stopsData.stops)
  ? stopsData.stops
  : [];

const stopsById = new Map();
const stopsByCode = new Map();

for (const s of stopsArray) {
  if (!s) continue;
  const id = String(s.stopId ?? "");
  const code = String(s.stopCode ?? "");
  if (id) stopsById.set(id, s);
  if (code) stopsByCode.set(code, s);
}

// הבאת shapeId + קואורדינטות לכל מסלול
async function fetchShapeIdAndCoordsForRoute(routeInfo) {
  try {
    if (!routeInfo.shapeId || typeof routeInfo.shapeId !== "string") {
      console.warn(`Skipping shapes: route ${routeInfo.routeId}`);
      return;
    }

    const shapeId = routeInfo.shapeId;
    const shapesUrl = `${API_BASE}/shapes?shapeIds=${encodeURIComponent(shapeId)}`;

    const shapesData = await fetchJson(shapesUrl);

    let coords = [];

    if (shapesData && typeof shapesData === "object") {
      if (Array.isArray(shapesData[shapeId])) {
        coords = shapesData[shapeId];
      } else {
        const keys = Object.keys(shapesData);
        if (keys.length && Array.isArray(shapesData[keys[0]])) {
          coords = shapesData[keys[0]];
        }
      }
    }

    if (!coords.length) {
      console.warn(`Shapes API returned no coords for shapeId ${shapeId}`);
      return;
    }

    routeInfo.shapeCoords = coords;

  } catch (e) {
    console.error(`Error fetching shapeCoords for route ${routeInfo.routeId}: ${e}`);
  }
}

// ---------------- STATIC ROUTES LOADER ----------------

const routeDate = ROUTE_DATE_OVERRIDE || isoDateTodayLocal();
const routesStatic = [];

for (const cfg of ROUTES) {
  const routeId = cfg.routeId;
  const routeIdStr = String(routeId);

  let routeData;
  try {
    const routeUrl = `${API_BASE}/route?routeId=${routeIdStr}&date=${routeDate}`;
    routeData = await fetchJson(routeUrl);
  } catch (e) {
    const a = new Alert();
    a.title = "שגיאה בטעינת נתוני מסלול";
    a.message = `שגיאה במסלול ${routeIdStr}:\n` + String(e);
    await a.present();
    return;
  }

  // --- DATA EXTRACTION ---
  let routeMeta = null;
  if (Array.isArray(routeData.routes)) {
    routeMeta =
      routeData.routes.find((r) => String(r.routeId) === routeIdStr) ||
      routeData.routes[0] ||
      null;
  }

  const changes =
    (routeData.routeChanges && routeData.routeChanges[routeIdStr]) || [];

  let currentChange =
    changes.find((c) => c.isCurrent) ||
    changes[0] ||
    null;

  const rawStoptimes = currentChange?.stoptimes || [];
  const headsign = currentChange?.headsign || routeMeta?.routeLongName || "";
  const shapeIdFromRoute = currentChange?.shapeId || null;

  // realtime filtering helpers
  const routeCodeStatic = routeMeta?.code || null;
  const routeDirection = routeMeta?.direction || null;

  const routeDescExact = routeMeta?.routeDesc || null;
  const routeDescPrefix =
    routeCodeStatic && routeDirection
      ? `${routeCodeStatic}-${routeDirection}-`
      : null;

  // סט תחנות
  const routeStops = rawStoptimes.map((st) => {
    const sid = String(st.stopId ?? "");
    const base = stopsById.get(sid) || {};

    return {
      stopId: sid,
      stopSequence: st.stopSequence,
      pickup: !!st.pickup,
      dropoff: !!st.dropoff,
      stopCode: base.stopCode ?? null,
      stopName: base.stopName ?? "(ללא שם)",
      lat: base.lat ?? null,
      lon: base.lon ?? null,
    };
  });

  routeStops.sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0));

  const operatorId = routeMeta?.operatorId ?? null;
  const apiColor = routeMeta?.color ?? null;
  const operatorColor = getOperatorColor(operatorId, apiColor);

  routesStatic.push({
    routeId,
    routeCode: routeCodeStatic,
    routeDate,
    routeMeta,
    headsign,
    routeStops,
    routeDescExact,
    routeDescPrefix,
    operatorId,
    operatorColor,
    shapeId: shapeIdFromRoute,
    shapeCoords: null,
  });
}

// אחרי שהמסלולים נטענו – מביאים shape לכל מסלול
for (const r of routesStatic) {
  await fetchShapeIdAndCoordsForRoute(r);
}