export type GlobePlace = { id: string; country: string };

/** A zoomable, flat world map using public-domain Natural Earth boundaries. */
export function buildGlobeHtml(places: GlobePlace[]) {
  const data = JSON.stringify(places).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>
    * { box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #fff; }
    #map { position: relative; touch-action: none; }
    svg { display: block; width: 100%; height: 100%; background: #fff; touch-action: none; }
    .country { fill: #fff; stroke: #252B30; stroke-width: 1.35; stroke-linejoin: round; vector-effect: non-scaling-stroke; cursor: pointer; }
    .country.visited { stroke-width: 1.7; }
    .country.selected { stroke: #171D22; stroke-width: 2.7; }
    .label { fill: #171D22; font: 600 17px -apple-system, BlinkMacSystemFont, sans-serif; text-anchor: middle; dominant-baseline: central; pointer-events: none; paint-order: stroke; stroke: rgba(255,255,255,.82); stroke-width: 2.5px; stroke-linejoin: round; }
    .controls { position: absolute; right: 10px; bottom: 10px; display: flex; gap: 6px; align-items: center; }
    button { min-width: 34px; height: 34px; padding: 0 10px; border: 1px solid #dfe4e7; border-radius: 12px; background: rgba(255,255,255,.96); color: #252B30; font: 600 15px -apple-system, BlinkMacSystemFont, sans-serif; box-shadow: 0 2px 8px rgba(27,39,49,.10); }
    #status { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #68737d; font: 500 13px -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 20px; pointer-events: none; }
    #status.error { color: #a84747; }
  </style>
</head>
<body>
  <div id="map">
    <svg id="world" viewBox="0 0 1200 600" role="img" aria-label="World map showing countries visited">
      <g id="features"></g>
      <g id="labels"></g>
    </svg>
    <div class="controls" aria-label="Map zoom controls"><button id="zoomOut" aria-label="Zoom out">−</button><button id="zoomIn" aria-label="Zoom in">+</button><button id="reset">World</button></div>
    <div id="status">Loading country outlines …</div>
  </div>
  <script>
    const visited = ${data};
    const width = 1200, height = 600;
    const world = document.getElementById('world');
    const mapRoot = document.getElementById('map');
    const featureLayer = document.getElementById('features');
    const labelLayer = document.getElementById('labels');
    const status = document.getElementById('status');
    const post = (message) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(message));
    const normalise = (value) => String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, ' ').trim();
    const aliases = {
      'united states of america': ['united states', 'usa', 'us'],
      'united kingdom': ['uk', 'great britain', 'britain', 'england'],
      'russia': ['russian federation'],
      'south korea': ['republic of korea', 'korea south', 'korea republic of'],
      'north korea': ['democratic peoples republic of korea', 'korea north'],
      'vietnam': ['viet nam'],
      'czechia': ['czech republic'],
      'bolivia': ['bolivia plurinational state of'],
      'tanzania': ['united republic of tanzania'],
      'moldova': ['republic of moldova'],
      'iran': ['iran islamic republic of'],
      'syria': ['syrian arab republic'],
      'laos': ['lao people democratic republic'],
      'brunei': ['brunei darussalam'],
      'ivory coast': ['cote divoire'],
      'democratic republic of the congo': ['dr congo', 'democratic republic of congo'],
      'republic of the congo': ['republic of congo', 'congo'],
      'uae': ['united arab emirates'],
      'the netherlands': ['netherlands'],
      'turkiye': ['turkey']
    };
    const visitByName = new Map();
    [...visited].sort((a,b) => normalise(a.country).localeCompare(normalise(b.country))).forEach((place, index) => {
      const item = { ...place, color: 'hsl(' + ((index * 137.508 + 14) % 360).toFixed(1) + ' 68% 82%)' };
      const key = normalise(place.country);
      visitByName.set(key, item);
      (aliases[key] || []).forEach((alias) => visitByName.set(normalise(alias), item));
      Object.entries(aliases).forEach(([official, otherNames]) => {
        if (otherNames.some((alias) => normalise(alias) === key)) {
          visitByName.set(normalise(official), item);
          otherNames.forEach((alias) => visitByName.set(normalise(alias), item));
        }
      });
    });
    const project = ([longitude, latitude]) => [((longitude + 180) / 360) * width, ((85 - Math.max(-85, Math.min(85, latitude))) / 170) * height];
    const ringsFor = (geometry) => {
      if (!geometry) return [];
      return geometry.type === 'Polygon' ? geometry.coordinates : geometry.type === 'MultiPolygon' ? geometry.coordinates.flat() : [];
    };
    const makePath = (rings) => rings.map((ring) => {
      if (!ring.length) return '';
      const points = ring.map(project);
      return 'M' + points.map(([x,y]) => x.toFixed(1) + ',' + y.toFixed(1)).join('L') + 'Z';
    }).join('');
    const labelPoint = (geometry) => {
      const rings = ringsFor(geometry).sort((a,b) => b.length-a.length);
      const ring = rings[0];
      if (!ring || !ring.length) return [0,0];
      let sin = 0, cos = 0, lat = 0;
      ring.forEach(([lon, y]) => { const rad = lon * Math.PI / 180; sin += Math.sin(rad); cos += Math.cos(rad); lat += y; });
      return project([Math.atan2(sin, cos) * 180 / Math.PI, lat / ring.length]);
    };
    const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    let scale = 1, offsetX = 0, offsetY = 0;
    const updateView = () => {
      const viewWidth = width / scale, viewHeight = height / scale;
      offsetX = Math.max(0, Math.min(width - viewWidth, offsetX));
      offsetY = Math.max(0, Math.min(height - viewHeight, offsetY));
      world.setAttribute('viewBox', offsetX + ' ' + offsetY + ' ' + viewWidth + ' ' + viewHeight);
    };
    const zoom = (factor) => {
      const centerX = offsetX + width / scale / 2, centerY = offsetY + height / scale / 2;
      scale = Math.max(1, Math.min(7, scale * factor));
      offsetX = scale === 1 ? 0 : centerX - width / scale / 2;
      offsetY = scale === 1 ? 0 : centerY - height / scale / 2;
      updateView();
    };
    let drag = null, moved = false, suppressClick = false;
    mapRoot.addEventListener('pointerdown', (event) => {
      if (event.target.closest && event.target.closest('button')) return;
      drag = { x: event.clientX, y: event.clientY, offsetX, offsetY, scale };
      moved = false;
    });
    mapRoot.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      if (!moved) return;
      const bounds = world.getBoundingClientRect();
      offsetX = drag.offsetX - dx * width / bounds.width / drag.scale;
      offsetY = drag.offsetY - dy * height / bounds.height / drag.scale;
      updateView();
      event.preventDefault();
    });
    mapRoot.addEventListener('pointerup', () => {
      if (moved) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 100); }
      drag = null;
    });
    mapRoot.addEventListener('pointercancel', () => { drag = null; });

    world.addEventListener('click', (event) => {
      if (suppressClick) return;
      const path = event.target.closest && event.target.closest('[data-country-id]');
      if (!path) return;
      const item = visited.find((place) => place.id === path.getAttribute('data-country-id'));
      if (item) post({ type: 'select', id: item.id });
    });
    document.getElementById('zoomIn').addEventListener('click', () => zoom(1.45));
    document.getElementById('zoomOut').addEventListener('click', () => zoom(1 / 1.45));
    document.getElementById('reset').addEventListener('click', () => { scale = 1; offsetX = 0; offsetY = 0; updateView(); });

    fetch('https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson')
      .then((response) => { if (!response.ok) throw new Error('Country boundaries unavailable'); return response.json(); })
      .then((geojson) => {
        const labels = [];
        geojson.features.forEach((feature) => {
          const properties = feature.properties || {};
          const name = properties.ADMIN || properties.NAME_EN || properties.NAME || 'Unknown';
          const item = visitByName.get(normalise(name));
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', makePath(ringsFor(feature.geometry)));
          path.setAttribute('class', 'country' + (item ? ' visited' : ''));
          path.setAttribute('aria-label', name);
          if (item) {
            path.style.fill = item.color;
            path.setAttribute('data-country-id', item.id);
            path.setAttribute('role', 'button');
          }
          const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
          title.textContent = item ? name + ' · visited' : name;
          path.appendChild(title);
          featureLayer.appendChild(path);
          const [x,y] = labelPoint(feature.geometry);
          labels.push('<text class="label" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + (name.length > 14 ? '14' : name.length > 9 ? '16' : '18') + '">' + esc(name) + '</text>');
        });
        labelLayer.innerHTML = labels.join('');
        status.remove();
        if (!visited.length) post({ type: 'ready' });
      })
      .catch(() => { status.textContent = 'Could not load country outlines. Connect to the internet and try again.'; status.classList.add('error'); post({ type: 'error' }); });
  </script>
</body>
</html>`;
}
