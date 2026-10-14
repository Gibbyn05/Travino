export type GlobePlace = { id: string; city: string; country: string; lat: number; lon: number };

export function buildGlobeHtml(places: GlobePlace[], selectedId?: string) {
  const data = JSON.stringify(places).replace(/</g, '\\u003c');
  const selected = JSON.stringify(selectedId ?? '');
  return `<!doctype html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>
    * { box-sizing: border-box; }
    html, body, #globe { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #eaf5fb; }
    canvas { display: block; }
    #loading { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; color: #627f91; font: 700 14px -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: .02em; pointer-events: none; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js"></script>
</head>
<body>
  <div id="globe"></div>
  <div id="loading">Loading globe …</div>
  <script>
    const places = ${data};
    const selectedId = ${selected};
    const root = document.getElementById('globe');
    const loading = document.getElementById('loading');
    const post = (message) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(message));
    try {
      const globe = Globe()(root)
        .backgroundColor('#eaf5fb')
        .globeImageUrl('https://cdn.jsdelivr.net/gh/vasturiano/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('https://cdn.jsdelivr.net/gh/vasturiano/three-globe/example/img/earth-topology.png')
        .showAtmosphere(true)
        .atmosphereColor('#9fcfe4')
        .atmosphereAltitude(.16)
        .pointsData(places)
        .pointLat('lat')
        .pointLng('lon')
        .pointAltitude(point => point.id === selectedId ? .11 : .065)
        .pointRadius(point => point.id === selectedId ? .42 : .31)
        .pointColor(point => point.id === selectedId ? '#1670ef' : '#f53d88')
        .pointLabel(point => '<div style="padding:8px 10px;border-radius:12px;background:#ffffff;color:#1d1d28;font:700 13px -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 6px 18px rgba(29,29,40,.12)">' + point.city + ', ' + point.country + '</div>')
        .onPointClick(point => post({ type: 'select', id: point.id }));
      const resize = () => globe.width(window.innerWidth).height(window.innerHeight);
      resize();
      window.addEventListener('resize', resize);
      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = .45;
      controls.enablePan = false;
      controls.minDistance = 160;
      controls.maxDistance = 430;
      globe.pointOfView({ lat: 20, lng: 8, altitude: 2.15 }, 0);
      loading.remove();
    } catch (error) {
      loading.textContent = 'The globe could not load.';
      post({ type: 'error' });
    }
  </script>
</body>
</html>`;
}
