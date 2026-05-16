let osmMap = null;
let osmTileLayer = null;
let activeMapScenario = null;

function initOsmMap() {
  const mapNode = document.getElementById("osmMap");
  if (!mapNode || typeof L === "undefined" || osmMap) return;

  osmMap = L.map(mapNode, {
    attributionControl: true,
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    tap: false,
    touchZoom: false
  });

  osmTileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(osmMap);

  osmMap.setView([43.3141, -1.9531], 15);
}

function syncMapToScenario(scenario, progress = 0) {
  if (!scenario?.map) return;
  initOsmMap();
  if (!osmMap) return;

  const [baseLat, baseLon] = scenario.map.center;
  const [latDrift, lonDrift] = scenario.map.drift;
  const offset = progress - 0.5;
  const center = [baseLat + offset * latDrift, baseLon + offset * lonDrift];
  const zoom = scenario.map.zoom;

  if (activeMapScenario !== scenario.id) {
    activeMapScenario = scenario.id;
    osmMap.setView(center, zoom, { animate: false });
    setTimeout(() => osmMap.invalidateSize(), 0);
  } else {
    osmMap.panTo(center, { animate: false });
  }
}
