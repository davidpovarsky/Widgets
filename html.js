export const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>מסלולי קווים</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- אייקון אוטובוס של גוגל -->
  <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:
opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=directions_bus" />

  <!-- Leaflet למפה -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

  <style>
  .material-symbols-outlined {
    font-variation-settings:
      'FILL' 0,
      'wght' 400,
      'GRAD' 0,
      'opsz' 24;
    font-size: 26px;
    line-height: 1;
  }
  :root { color-scheme: light dark; }
  body {
    margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #f4f4f4; color: #111; direction: rtl;
  }

  /* מכולל עליון – מפה + רשימות */
  #topContainer {
    display: flex;
    flex-direction: column;
    height: 100vh;
    box-sizing: border-box;
  }

  /* מפה */
  #map {
    width: 100%;
    height: 260px;
    flex-shrink: 0;
    border-bottom: 1px solid #ddd;
  }

  /* קונטיינר של כל המסלולים זה לצד זה */
  #routesContainer {
    display: flex;
    flex-direction: row;
    gap: 12px;
    padding: 8px;
    overflow-x: auto;
    box-sizing: border-box;
    flex: 1 1 auto;
  }

  .route-card {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    min-width: 320px;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  header {
    background: #1976d2; color: #fff; padding: 10px 14px;
    display: flex; flex-direction: column; gap: 4px;
    position: sticky; top: 0; z-index: 100;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  header .line-main { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  header .route-number { font-weight: 700; font-size: 20px; padding: 2px 8px; border-radius: 999px; background: rgba(0,0,0,0.25); }
  header .headsign { font-size: 15px; font-weight: 500; }
  header .sub { font-size: 11px; opacity: 0.9; display: flex; justify-content: space-between; gap: 10px; }

  .stops-list {
    background: #fff; position: relative; overflow: hidden;
    padding: 0; padding-bottom: 20px;
    transform: translate3d(0,0,0);
  }

  .stops-rows { width: 100%; }

  .stop-row { display: flex; flex-direction: row; align-items: stretch; gap: 0; min-height: 50px; }

  /* Timeline */
  .timeline { width: 50px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; position: relative; }
  .timeline-line { width: 4px; background: #e0e0e0; flex: 1; }
  .timeline-circle { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 3px solid #1976d2; box-sizing: border-box; z-index: 2; margin: -2px 0; }
  .timeline.first .line-top { visibility: hidden; }
  .timeline.last .line-bottom { visibility: hidden; }

  /* Stop Content */
  .stop-main { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 8px 10px 8px 0; border-bottom: 1px solid #f0f0f0; }
  .stop-name { font-size: 15px; font-weight: 600; display: flex; gap: 4px; }
  .seq-num { color: #1976d2; font-weight: 700; min-width: 18px; }
  .stop-code { font-size: 11px; color: #777; margin-right: 22px; }
  .stop-buses { margin-top: 6px; margin-right: 22px; display: flex; flex-wrap: wrap; gap: 4px; }

  .bus-chip { border-radius: 4px; padding: 2px 6px; font-size: 11px; font-weight: bold; display: inline-flex; align-items: center; }
  .bus-soon { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
  .bus-mid  { background: #fffde7; color: #f9a825; border: 1px solid #fff9c4; }
  .bus-far  { background: #e1f5fe; color: #0277bd; border: 1px solid #b3e5fc; }
  .bus-late { background: #f5f5f5; color: #757575; border: 1px solid #e0e0e0; }

  .footer-note-global { margin: 4px 0 10px; font-size: 10px; color: #999; text-align: center; }

  /* --- אייקון האוטובוס לאורך רשימת התחנות --- */
  .bus-icon {
    position: absolute;
    right: 25px;
    font-size: 24px;
    z-index: 50;
    pointer-events: none;
    will-change: top;
    transform: translate3d(50%, -50%, 0);
    -webkit-transform: translate3d(50%, -50%, 0);
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    perspective: 1000px;
    transition: top 1s linear;
  }
  </style>
</head>
<body>

<div id="topContainer">
  <div id="map"></div>
  <div id="routesContainer"></div>
</div>
<div class="footer-note-global">המיקום מוערך ע"י המערכת (ETA) • המפה מבוססת על מסלולי shape של KavNav.</div>

<script>
  // payloads = מערך של כל המסלולים
  let payloads = [];
  let initialized = false;

  // נשמור פה רפרנסים לדום עבור כל מסלול
  const routeViews = new Map(); // key: routeId string

  // משתנים למפה
  let mapInstance = null;
  let mapRouteLayers = [];
  let mapDidInitialFit = false; // נשתמש בזה כדי לא לעשות fitBounds יותר מפעם אחת
let mapBusLayers = [];
  function buildBusIndex(vehicles) {
    const byStop = new Map();
    const now = new Date();
    for (const v of vehicles) {
      const calls = Array.isArray(v.onwardCalls) ? v.onwardCalls : [];
      for (const c of calls) {
        if (!c || !c.stopCode || !c.eta) continue;
        const stopCode = String(c.stopCode);
        const etaDate = new Date(c.eta);
        let minutes = Math.round((etaDate.getTime() - now.getTime()) / 60000);
        if (minutes < -2) continue;
        const key = stopCode;
        if (!byStop.has(key)) byStop.set(key, []);
        byStop.get(key).push({ minutes });
      }
    }
    for (const arr of byStop.values()) { arr.sort((a, b) => a.minutes - b.minutes); }
    return byStop;
  }

  function classifyMinutes(minutes) {
    if (minutes <= 3) return "bus-soon";
    if (minutes <= 7) return "bus-mid";
    if (minutes <= 15) return "bus-far";
    return "bus-late";
  }

  function formatMinutesLabel(minutes) {
    if (minutes <= 0) return "כעת";
    return minutes + " דק׳";
  }

  function ensureLayout(allPayloads) {
    if (initialized) return;
    const container = document.getElementById("routesContainer");
    container.innerHTML = "";

    allPayloads.forEach((p) => {
      const meta = p.meta || {};
      const routeIdStr = String(meta.routeId);

      const card = document.createElement("div");
      card.className = "route-card";

      const header = document.createElement("header");
      const lineMain = document.createElement("div");
      lineMain.className = "line-main";

      const leftDiv = document.createElement("div");
      const routeNumSpan = document.createElement("span");
      routeNumSpan.className = "route-number";
      routeNumSpan.textContent = meta.routeNumber || meta.routeCode || "";

      const headsignSpan = document.createElement("span");
      headsignSpan.className = "headsign";
      headsignSpan.textContent = meta.headsign || "";

      leftDiv.appendChild(routeNumSpan);
      leftDiv.appendChild(headsignSpan);

      const metaLineDiv = document.createElement("div");
      metaLineDiv.style.fontSize = "12px";
      metaLineDiv.style.opacity = "0.9";
      metaLineDiv.textContent = "קו " + (meta.routeCode || "");

      lineMain.appendChild(leftDiv);
      lineMain.appendChild(metaLineDiv);

      const subDiv = document.createElement("div");
      subDiv.className = "sub";

      const routeDateSpan = document.createElement("span");
      routeDateSpan.textContent = meta.routeDate || "";

      const snapshotSpan = document.createElement("span");
      snapshotSpan.textContent = "עדכון: -";

      subDiv.appendChild(routeDateSpan);
      subDiv.appendChild(snapshotSpan);

      header.appendChild(lineMain);
      header.appendChild(subDiv);

      const stopsList = document.createElement("div");
      stopsList.className = "stops-list";

      const rowsContainer = document.createElement("div");
      rowsContainer.className = "stops-rows";
      stopsList.appendChild(rowsContainer);

      card.appendChild(header);
      card.appendChild(stopsList);

      container.appendChild(card);

      routeViews.set(routeIdStr, {
        card,
        header,
        routeNumSpan,
        headsignSpan,
        metaLineDiv,
        routeDateSpan,
        snapshotSpan,
        stopsList,
        rowsContainer,
      });
    });

    initialized = true;
  }

  // פונקציה לבניית המפה מתוך ה-payloads
  function ensureMapInstance(allPayloads) {
    const mapDiv = document.getElementById("map");
    if (!mapDiv) return;

    if (!mapInstance) {
      mapInstance = L.map("map");
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: ""
      }).addTo(mapInstance);
    }

    // הסרת שכבות קודמות
    mapRouteLayers.forEach(layer => {
      try { mapInstance.removeLayer(layer); } catch (e) {}
    });
    mapRouteLayers = [];

    const allLatLngs = [];

    allPayloads.forEach(p => {
      const meta = p.meta || {};
      const operatorColor = meta.operatorColor || "#1976d2";
      const shapeCoords = Array.isArray(p.shapeCoords) ? p.shapeCoords : null;
      const stops = Array.isArray(p.stops) ? p.stops : [];

      const group = L.layerGroup();

      // מסלול shape
      if (shapeCoords && shapeCoords.length) {
        const latlngs = shapeCoords
          .map(coord => Array.isArray(coord) && coord.length >= 2 ? [coord[1], coord[0]] : null)
          .filter(Boolean);

        if (latlngs.length) {
          const poly = L.polyline(latlngs, {
            weight: 4,
            opacity: 0.9,
            color: operatorColor
          });
          poly.addTo(group);
          latlngs.forEach(ll => allLatLngs.push(ll));
        }
      }

      // תחנות
      stops.forEach(s => {
        if (typeof s.lat === "number" && typeof s.lon === "number") {
          const ll = [s.lat, s.lon];
          const marker = L.circleMarker(ll, {
            radius: 3,
            weight: 1
          });
          marker.bindTooltip(
            (s.stopName || "") + (s.stopCode ? " (" + s.stopCode + ")" : ""),
            { direction: "top", offset: [0, -4] }
          );
          marker.addTo(group);
          allLatLngs.push(ll);
        }
      });
      // ---- ציור אוטובוסים על המפה לפי positionOnLine ----
      const vehicles = Array.isArray(p.vehicles) ? p.vehicles : [];

      // המרת shapeCoords לפורמט leaflet [lat, lon]
      const shapeLatLngs = Array.isArray(p.shapeCoords)
        ? p.shapeCoords
            .map(c => Array.isArray(c) && c.length >= 2 ? [c[1], c[0]] : null)
            .filter(Boolean)
        : [];

      vehicles.forEach(v => {
        if (typeof v.positionOnLine !== "number") return;
        if (!shapeLatLngs.length) return;

        const pos = v.positionOnLine;
        const idx = Math.floor(pos * (shapeLatLngs.length - 1));
        const ll = shapeLatLngs[idx];
        if (!ll) return;

        // יצירת אייקון אוטובוס — מחרוזת פשוטה!
        const busMarker = L.marker(ll, {
          icon: L.divIcon({
            html: '<span class="material-symbols-outlined" style="color:' + operatorColor + '; font-size:26px;">directions_bus</span>',
            className: "bus-map-icon",
            iconSize: [26, 26]
          })
        });

        busMarker.addTo(group);
        mapBusLayers.push(busMarker);
      });
      group.addTo(mapInstance);
      mapRouteLayers.push(group);
    });

    // התאמת המפה לכל המסלולים – רק בפעם הראשונה
    if (allLatLngs.length && !mapDidInitialFit) {
      mapInstance.fitBounds(allLatLngs, { padding: [20, 20] });
      mapDidInitialFit = true;
    }
  }

  function renderAll() {
    if (!payloads || !payloads.length) return;
    ensureLayout(payloads);

    // מפת Leaflet
    ensureMapInstance(payloads);

    payloads.forEach((payload) => {
      const meta = payload.meta || {};
      const stops = Array.isArray(payload.stops) ? payload.stops : [];
      const vehicles = Array.isArray(payload.vehicles) ? payload.vehicles : [];
      const busesByStop = buildBusIndex(vehicles);

      const routeIdStr = String(meta.routeId);
      const view = routeViews.get(routeIdStr);
      if (!view) return;

      const {
        header,
        routeNumSpan,
        headsignSpan,
        metaLineDiv,
        routeDateSpan,
        snapshotSpan,
        stopsList,
        rowsContainer,
      } = view;

      const operatorColor = meta.operatorColor || "#1976d2";

      header.style.background = operatorColor;
      routeNumSpan.textContent = meta.routeNumber || meta.routeCode || "";
      headsignSpan.textContent = meta.headsign || "";
      metaLineDiv.textContent = "קו " + (meta.routeCode || "");
      routeDateSpan.textContent = meta.routeDate || "";

      const snap = meta.lastSnapshot || meta.lastVehicleReport || "-";
      snapshotSpan.textContent =
        "עדכון: " + (snap.split("T")[1]?.split(".")[0] || snap);

      // בניית רשימת תחנות
      rowsContainer.innerHTML = "";
      stops.forEach((stop, idx) => {
        const row = document.createElement("div");
        row.className = "stop-row";

        const timeline = document.createElement("div");
        timeline.className = "timeline";
        if (idx === 0) timeline.classList.add("first");
        if (idx === stops.length - 1) timeline.classList.add("last");

        const lineTop = document.createElement("div");
        lineTop.className = "timeline-line line-top";
        const circle = document.createElement("div");
        circle.className = "timeline-circle";
        circle.style.borderColor = operatorColor;
        const lineBottom = document.createElement("div");
        lineBottom.className = "timeline-line line-bottom";
        timeline.appendChild(lineTop);
        timeline.appendChild(circle);
        timeline.appendChild(lineBottom);

        const main = document.createElement("div");
        main.className = "stop-main";

        const nameEl = document.createElement("div");
        nameEl.className = "stop-name";
        const seqSpan = document.createElement("span");
        seqSpan.className = "seq-num";
        seqSpan.style.color = operatorColor;
        seqSpan.textContent = idx + 1 + ".";
        const txtSpan = document.createElement("span");
        txtSpan.textContent = stop.stopName;
        nameEl.appendChild(seqSpan);
        nameEl.appendChild(txtSpan);

        const codeEl = document.createElement("div");
        codeEl.className = "stop-code";
        codeEl.textContent = stop.stopCode || "#" + stop.stopSequence;

        main.appendChild(nameEl);
        main.appendChild(codeEl);

        const stopCodeKey = stop.stopCode ? String(stop.stopCode) : null;
        const buses = stopCodeKey ? busesByStop.get(stopCodeKey) || [] : [];
        if (buses.length) {
          const busesContainer = document.createElement("div");
          busesContainer.className = "stop-buses";
          buses.slice(0, 3).forEach((b) => {
            const chip = document.createElement("div");
            chip.className = "bus-chip " + classifyMinutes(b.minutes);
            chip.textContent = formatMinutesLabel(b.minutes);
            busesContainer.appendChild(chip);
          });
          main.appendChild(busesContainer);
        }

        row.appendChild(timeline);
        row.appendChild(main);
        rowsContainer.appendChild(row);
      });

      // אייקוני אוטובוסים לאורך המסלול למסלול הזה בלבד
      setTimeout(() => {
        // הסר אייקונים קודמים של המסלול הזה
        const oldIcons = stopsList.querySelectorAll(".bus-icon");
        oldIcons.forEach((el) => el.remove());

const totalHeight = rowsContainer.offsetHeight;
        vehicles.forEach((v) => {
          const pos =
            typeof v.positionOnLine === "number" ? v.positionOnLine : null;
          if (pos == null || isNaN(pos)) return;

          let y = pos * totalHeight;
          if (y < 10) y = 10;
          if (y > totalHeight - 15) y = totalHeight - 15;

          const icon = document.createElement("div");
          icon.className = "bus-icon material-symbols-outlined";
          icon.textContent = "directions_bus";
          icon.style.top = y + "px";
          icon.style.color = operatorColor;
          if (v.routeNumber) icon.title = v.routeNumber;
          stopsList.appendChild(icon);
        });
      }, 50);
    });
  }

  window.updateData = function(newPayloads) {
    payloads = Array.isArray(newPayloads) ? newPayloads : [];
    renderAll();
  };
</script>

</body>
</html>`;
