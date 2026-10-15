import { TripLocation } from './trip-locations';

/** A live Leaflet map with OpenStreetMap data and native-app message handling. */
export function buildTravelMapHtml(places: TripLocation[]) {
  const data = JSON.stringify(places).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIINfQ6QeeD3tDkL5JrFzPp7t6r1E8p5e2M=" crossorigin="" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; background: #dceff4; overflow: hidden; }
    * { box-sizing: border-box; }
    .leaflet-control-zoom { border: 0 !important; box-shadow: 0 2px 10px rgba(27, 42, 51, .18) !important; }
    .leaflet-control-zoom a { width: 40px !important; height: 40px !important; line-height: 38px !important; color: #26323a !important; border: 0 !important; font: 400 25px -apple-system, BlinkMacSystemFont, sans-serif !important; }
    .leaflet-control-zoom a:first-child { border-radius: 13px 13px 0 0 !important; border-bottom: 1px solid #e9edef !important; }
    .leaflet-control-zoom a:last-child { border-radius: 0 0 13px 13px !important; }
    .leaflet-control-attribution { background: rgba(255,255,255,.74) !important; border-radius: 7px 0 0 0; font: 9px -apple-system, BlinkMacSystemFont, sans-serif !important; }
    .trip-marker { width: 54px; height: 54px; transform: translate(-27px, -54px); filter: drop-shadow(0 4px 7px rgba(28, 42, 48, .24)); cursor: pointer; }
    .trip-marker .card { width: 48px; height: 48px; margin: 0 auto; border-radius: 15px; background: rgba(255,255,255,.98); border: 3px solid #fff; display: grid; place-items: center; box-shadow: 0 1px 0 rgba(0,0,0,.07); }
    .trip-marker .tail { width: 12px; height: 12px; background: #fff; transform: rotate(45deg); margin: -7px auto 0; border-radius: 1px; }
    .trip-marker svg { width: 26px; height: 26px; fill: none; stroke: var(--marker); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .trip-marker.future { --marker: #437eae; }
    .trip-marker.completed { --marker: #d66e5a; }
    .trip-marker.selected .card { background: #263b4a; }
    .trip-marker.selected .tail { background: #263b4a; }
    .trip-marker.selected svg { stroke: #fff; }
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
    const post = (message) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(message));
    const map = L.map('map', { zoomControl: false, attributionControl: true, minZoom: 2, worldCopyJump: true }).setView([30, 8], 2);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 19, attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }).addTo(map);
    const markers = new Map();
    const iconSvg = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 27h22M7 24V9l9-4 9 4v15M11 24v-8h10v8M13 11h.01M19 11h.01"/></svg>';
    const iconFor = (place, selected = false) => L.divIcon({ className: '', iconSize: [54, 54], iconAnchor: [27, 54], html: '<div class="trip-marker ' + (place.completed ? 'completed' : 'future') + (selected ? ' selected' : '') + '"><div class="card">' + iconSvg + '</div><div class="tail"></div></div>' });
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
    if (places.length === 1) map.setView([places[0].latitude, places[0].longitude], 6);
    else if (places.length > 1) map.fitBounds(places.map((place) => [place.latitude, place.longitude]), { padding: [62, 54], maxZoom: 5 });
    else { const label = L.control({ position: 'topleft' }); label.onAdd = () => { const node = L.DomUtil.create('div', 'empty-label'); node.textContent = 'Your next destination will appear here'; return node; }; label.addTo(map); }
    if (places.length) select(places[0].id, false);
    function escapeHtml(value) { return String(value || '').replace(/[&<>'"]/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]); }
    post({ type: 'ready' });
  </script>
</body>
</html>`;
}
