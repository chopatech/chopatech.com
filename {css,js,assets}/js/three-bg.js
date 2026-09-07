/* =========================================================
   CHOPA TECH — animated network background (Three.js)
   -----------------------------------------------------------
   A drifting node graph, styled like a live network topology —
   the one deliberate "wow" moment for this product. Renders on
   a fixed full-viewport canvas behind the flat panels, so it
   only shows through the gaps between them. Skips entirely
   for prefers-reduced-motion or if WebGL/Three.js isn't
   available; the CSS radial gradients on <body> remain as a
   static fallback either way.
   ========================================================= */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (typeof THREE === "undefined") return;

  let renderer;
  try {
    const canvas = document.createElement("canvas");
    canvas.id = "bg3d";
    document.body.prepend(canvas);
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) {
    return; // WebGL unavailable — silently keep the CSS gradient fallback
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 20);

  const isLight = () => document.documentElement.getAttribute("data-theme") === "light";
  const SIGNAL = 0x3e6df3;
  const AMBER = 0xe1a13b;

  // --- node field ---
  const COUNT = 85;
  const BOUNDS = { x: 19, y: 11, z: 7 };
  const positions = new Float32Array(COUNT * 3);
  const velocities = [];
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * BOUNDS.x * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * BOUNDS.y * 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * BOUNDS.z * 2;
    velocities.push({
      x: (Math.random() - 0.5) * 0.012,
      y: (Math.random() - 0.5) * 0.012,
      z: (Math.random() - 0.5) * 0.006,
    });
  }
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const nodeMat = new THREE.PointsMaterial({ color: SIGNAL, size: 0.15, transparent: true, opacity: isLight() ? 0.55 : 0.8, sizeAttenuation: true });
  const nodes = new THREE.Points(nodeGeo, nodeMat);
  scene.add(nodes);

  // --- a few "active" amber nodes (paid/online accent — the one bold touch) ---
  const ACCENT_COUNT = 7;
  const accentIdx = [];
  while (accentIdx.length < ACCENT_COUNT) {
    const idx = Math.floor(Math.random() * COUNT);
    if (!accentIdx.includes(idx)) accentIdx.push(idx);
  }
  const accentPositions = new Float32Array(ACCENT_COUNT * 3);
  const accentGeo = new THREE.BufferGeometry();
  accentGeo.setAttribute("position", new THREE.BufferAttribute(accentPositions, 3));
  const accentMat = new THREE.PointsMaterial({ color: AMBER, size: 0.28, transparent: true, opacity: 0.85 });
  const accentPoints = new THREE.Points(accentGeo, accentMat);
  scene.add(accentPoints);

  // --- connective lines between nearby nodes, rebuilt on a throttle ---
  const lineMat = new THREE.LineBasicMaterial({ color: SIGNAL, transparent: true, opacity: isLight() ? 0.1 : 0.16 });
  const lineSegments = new THREE.LineSegments(new THREE.BufferGeometry(), lineMat);
  scene.add(lineSegments);

  const MAX_DIST = 6.2;
  function rebuildLines() {
    const linePositions = [];
    for (let i = 0; i < COUNT; i++) {
      for (let j = i + 1; j < COUNT; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < MAX_DIST * MAX_DIST) {
          linePositions.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
          linePositions.push(positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
        }
      }
    }
    lineSegments.geometry.dispose();
    lineSegments.geometry = new THREE.BufferGeometry();
    lineSegments.geometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  }
  rebuildLines();

  // subtle parallax on pointer movement — motion that answers the user, not just ambient
  let targetX = 0, targetY = 0;
  window.addEventListener("pointermove", (e) => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 2.4;
    targetY = (e.clientY / window.innerHeight - 0.5) * 1.4;
  });

  let frame = 0;
  let stopped = false;
  function animate() {
    if (stopped) return;
    frame++;

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] += velocities[i].x;
      positions[i * 3 + 1] += velocities[i].y;
      positions[i * 3 + 2] += velocities[i].z;
      if (Math.abs(positions[i * 3]) > BOUNDS.x) velocities[i].x *= -1;
      if (Math.abs(positions[i * 3 + 1]) > BOUNDS.y) velocities[i].y *= -1;
      if (Math.abs(positions[i * 3 + 2]) > BOUNDS.z) velocities[i].z *= -1;
    }
    nodeGeo.attributes.position.needsUpdate = true;

    for (let a = 0; a < ACCENT_COUNT; a++) {
      const idx = accentIdx[a];
      accentPositions[a * 3] = positions[idx * 3];
      accentPositions[a * 3 + 1] = positions[idx * 3 + 1];
      accentPositions[a * 3 + 2] = positions[idx * 3 + 2];
    }
    accentGeo.attributes.position.needsUpdate = true;
    accentMat.opacity = 0.55 + Math.sin(frame * 0.03) * 0.3; // slow pulse — the one animated accent

    if (frame % 5 === 0) rebuildLines();

    camera.position.x += (targetX - camera.position.x) * 0.02;
    camera.position.y += (-targetY - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);

    nodes.rotation.y += 0.0006;
    lineSegments.rotation.y += 0.0006;
    accentPoints.rotation.y += 0.0006;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // re-tune opacity/colors if the person toggles light/dark mode
  const themeObserver = new MutationObserver(() => {
    nodeMat.opacity = isLight() ? 0.55 : 0.8;
    lineMat.opacity = isLight() ? 0.1 : 0.16;
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  document.addEventListener("visibilitychange", () => {
    stopped = document.hidden;
    if (!stopped) animate();
  });
})();
