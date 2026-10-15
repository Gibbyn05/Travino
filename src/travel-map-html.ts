import { TripLocation } from './trip-locations';
import { colors } from './theme';

/** A live Leaflet map with OpenStreetMap data and native-app message handling. */
export function buildTravelMapHtml(places: TripLocation[]) {
  const data = JSON.stringify(places).replace(/</g, '\\u003c');
  const visitedPalette = JSON.stringify(colors.visitedCountryPalette);
  return `<!doctype html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; background: #dceff4; overflow: hidden; }
    * { box-sizing: border-box; }
    /* Kept inline because some Expo WebViews do not apply a remote Leaflet stylesheet. */
    .leaflet-container { position: relative; overflow: hidden; outline: 0; -webkit-tap-highlight-color: transparent; }
    .leaflet-pane, .leaflet-tile, .leaflet-marker-icon, .leaflet-marker-shadow, .leaflet-tile-container, .leaflet-pane > svg, .leaflet-pane > canvas, .leaflet-image-layer, .leaflet-layer { position: absolute; left: 0; top: 0; }
    .leaflet-pane { z-index: 400; }
    .leaflet-tile-pane { z-index: 200; filter: grayscale(.36) saturate(.53) brightness(1.12) contrast(.83); }
    .leaflet-overlay-pane { z-index: 400; }
    .leaflet-shadow-pane { z-index: 500; }
    .leaflet-marker-pane { z-index: 600; }
    .leaflet-tooltip-pane { z-index: 650; }
    .leaflet-popup-pane { z-index: 700; }
    .leaflet-tile { visibility: hidden; }
    .leaflet-tile-loaded { visibility: inherit; }
    .leaflet-zoom-animated { transform-origin: 0 0; }
    .leaflet-top, .leaflet-bottom { position: absolute; z-index: 1000; pointer-events: none; }
    .leaflet-top { top: 0; } .leaflet-bottom { bottom: 0; } .leaflet-right { right: 0; }
    .leaflet-control { position: relative; z-index: 800; pointer-events: visiblePainted; float: left; clear: both; }
    .leaflet-right .leaflet-control { float: right; } .leaflet-bottom .leaflet-control { margin-bottom: 10px; } .leaflet-right .leaflet-control { margin-right: 10px; }
    .leaflet-popup { position: absolute; text-align: center; margin-bottom: 20px; }
    .leaflet-popup-tip-container { width: 40px; height: 20px; overflow: hidden; margin: 0 auto; }
    .leaflet-popup-tip { width: 17px; height: 17px; padding: 1px; margin: -10px auto 0; transform: rotate(45deg); background: white; }
    .leaflet-top.leaflet-right { top: 112px; right: 14px; }
    .leaflet-control-zoom { border: 0 !important; border-radius: 15px !important; overflow: hidden; box-shadow: 0 5px 16px rgba(27, 42, 51, .18) !important; }
    .leaflet-control-zoom a { width: 42px !important; height: 42px !important; line-height: 40px !important; color: #202B31 !important; border: 0 !important; background: rgba(255,255,255,.96) !important; font: 400 25px -apple-system, BlinkMacSystemFont, sans-serif !important; }
    .leaflet-control-zoom a:first-child { border-radius: 15px 15px 0 0 !important; border-bottom: 1px solid #E6EAEB !important; }
    .leaflet-control-zoom a:last-child { border-radius: 0 0 15px 15px !important; }
    .leaflet-control-attribution { background: rgba(255,255,255,.74) !important; border-radius: 7px 0 0 0; font: 9px -apple-system, BlinkMacSystemFont, sans-serif !important; }
    .trip-marker { width: 46px; height: 50px; filter: drop-shadow(0 4px 7px rgba(28, 42, 48, .19)); cursor: pointer; }
    .trip-marker .card { width: 42px; height: 42px; margin: 0 auto; border-radius: 13px; background: rgba(255,255,255,.98); border: 2px solid #fff; display: grid; place-items: center; box-shadow: 0 1px 1px rgba(0,0,0,.08); }
    .trip-marker .tail { width: 10px; height: 10px; background: #fff; transform: rotate(45deg); margin: -6px auto 0; border-radius: 1px; }
    .trip-marker svg { width: 23px; height: 23px; fill: none; stroke: var(--marker); stroke-width: 1.45; stroke-linecap: round; stroke-linejoin: round; }
    .trip-marker.future { --marker: #437eae; }
    .trip-marker.completed { --marker: #d66e5a; }
    .trip-marker.selected .card { border-color: #263B4A; box-shadow: 0 0 0 2px rgba(38,59,74,.16); }
    .trip-marker.selected .tail { background: #fff; }
    .leaflet-popup-content-wrapper { border-radius: 16px; box-shadow: 0 8px 26px rgba(28, 42, 48, .2); font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    .leaflet-popup-content { margin: 12px 15px; color: #26323a; font-size: 13px; line-height: 18px; }
    .leaflet-popup-content strong { display: block; font-size: 14px; margin-bottom: 2px; }
    .empty-label { background: rgba(255,255,255,.94); padding: 10px 13px; border-radius: 14px; color: #48545b; font: 600 13px -apple-system, BlinkMacSystemFont, sans-serif; box-shadow: 0 3px 14px rgba(26,43,51,.14); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <script>
    const places = ${data};
    const visitedPalette = ${visitedPalette};
    const post = (message) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(message));
    const map = L.map('map', { zoomControl: false, attributionControl: true, minZoom: 2, maxZoom: 8, worldCopyJump: true }).setView([30, 8], 2);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 8, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    const markers = new Map();
    const normalise = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, ' ').trim();
    const aliases = {
      'united states of america': ['united states', 'usa', 'us'],
      'united kingdom': ['uk', 'great britain', 'britain', 'england'],
      'russia': ['russian federation'], 'south korea': ['republic of korea', 'korea south'],
      'vietnam': ['viet nam'], 'czechia': ['czech republic'], 'turkiye': ['turkey'],
      'uae': ['united arab emirates'], 'the netherlands': ['netherlands']
    };
    const visitedCountries = new Map();
    [...new Set(places.filter((place) => place.completed).map((place) => place.country))]
      .sort((a, b) => a.localeCompare(b))
      .forEach((country, index) => {
        const item = { country, color: visitedPalette[index % visitedPalette.length] };
        const key = normalise(country);
        visitedCountries.set(key, item);
        (aliases[key] || []).forEach((alias) => visitedCountries.set(normalise(alias), item));
        Object.entries(aliases).forEach(([official, otherNames]) => {
          if (otherNames.some((alias) => normalise(alias) === key)) visitedCountries.set(normalise(official), item);
        });
      });
    const iconSvg = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 27h22M7 24V9l9-4 9 4v15M11 24v-8h10v8M13 11h.01M19 11h.01"/></svg>';
    const iconFor = (place, selected = false) => L.divIcon({ className: '', iconSize: [46, 50], iconAnchor: [23, 50], html: '<div class="trip-marker ' + (place.completed ? 'completed' : 'future') + (selected ? ' selected' : '') + '"><div class="card">' + iconSvg + '</div><div class="tail"></div></div>' });
    const select = (id, send = true) => {
      markers.forEach(({ marker, place }) => marker.setIcon(iconFor(place, place.id === id)));
      const selected = markers.get(id);
      if (selected) selected.marker.openPopup();
      if (send) post({ type: 'select', id });
    };
    places.forEach((place) => {
      const marker = L.marker([place.latitude, place.longitude], { icon: iconFor(place), riseOnHover: true }).addTo(map);
      marker.bindPopup('<strong>' + escapeHtml(place.city) + '</strong>' + escapeHtml(place.country) + '<br>' + escapeHtml(place.title));
      marker.on('click', () => select(place.id));
      markers.set(place.id, { marker, place });
    });
    fetch('https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson')
      .then((response) => { if (!response.ok) throw new Error('Country borders unavailable'); return response.json(); })
      .then((geojson) => {
        L.geoJSON(geojson, {
          pane: 'overlayPane', interactive: false,
          style: (feature) => {
            const properties = feature && feature.properties ? feature.properties : {};
            const name = properties.ADMIN || properties.NAME_EN || properties.NAME || '';
            const visit = visitedCountries.get(normalise(name));
            return visit ? { color: visit.color, weight: 1, opacity: .88, fillColor: visit.color, fillOpacity: .72 } : { color: 'transparent', weight: 0, fillOpacity: 0 };
          }
        }).addTo(map);
      })
      .catch(() => { /* The basemap remains useful when country outlines are unavailable. */ });
    if (places.length === 1) map.setView([places[0].latitude, places[0].longitude], 5);
    else if (places.length > 1) map.fitBounds(places.map((place) => [place.latitude, place.longitude]), { padding: [62, 54], maxZoom: 5 });
    else { const label = L.control({ position: 'topleft' }); label.onAdd = () => { const node = L.DomUtil.create('div', 'empty-label'); node.textContent = 'Your next destination will appear here'; return node; }; label.addTo(map); }
    if (places.length) select(places[0].id, false);
    function escapeHtml(value) { return String(value || '').replace(/[&<>'"]/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]); }
    post({ type: 'ready' });
  </script>
</body>
</html>`;
}
