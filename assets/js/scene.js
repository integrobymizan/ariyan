/*
 * Hero 3D scene: a workflow graph.
 * Channel nodes (calls, ads, WhatsApp, reviews...) send leads into a central AI core;
 * the core handles them and sends actions (amber) back out: bookings, replies, follow-ups.
 * Requires Three.js r128 loaded as the global THREE.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("scene");
  if (!canvas || !window.THREE) return;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    canvas.remove();
    return;
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var COLORS = { ink: 0x0a0f14, amber: 0xffb04a, steel: 0x7fa7d9, fg: 0xe6ebef, panel: 0x16212c };
  var APPS = ["GoHighLevel", "Calls", "WhatsApp", "Google Ads", "Meta Ads", "Reviews", "Calendar", "SMS", "Website"];

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(COLORS.ink, 0.028);

  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(0, 0.6, 15);

  var root = new THREE.Group();   // positioned by layout
  var graph = new THREE.Group();  // rotated by time, pointer and scroll
  root.add(graph);
  scene.add(root);

  /* ---------- Shared textures ---------- */
  function makeGlowTexture() {
    var c = document.createElement("canvas");
    c.width = c.height = 128;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.18, "rgba(255,255,255,0.65)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.12)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  var glowTex = makeGlowTexture();

  function glowSprite(color, size, opacity) {
    var s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: color, transparent: true, opacity: opacity,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    s.scale.set(size, size, 1);
    return s;
  }

  /* ---------- Lights ---------- */
  scene.add(new THREE.AmbientLight(0x8fa6c0, 0.45));
  var coreLight = new THREE.PointLight(COLORS.amber, 2.2, 14, 2);
  graph.add(coreLight);
  var rim = new THREE.DirectionalLight(COLORS.steel, 0.8);
  rim.position.set(-6, 8, 6);
  scene.add(rim);

  /* ---------- AI core ---------- */
  var core = new THREE.Group();
  graph.add(core);

  var shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.55, 1),
    new THREE.MeshBasicMaterial({ color: COLORS.steel, wireframe: true, transparent: true, opacity: 0.32 })
  );
  core.add(shell);

  var heart = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.85, 0),
    new THREE.MeshStandardMaterial({
      color: 0x1b2836, emissive: COLORS.amber, emissiveIntensity: 0.45,
      roughness: 0.35, metalness: 0.7, flatShading: true
    })
  );
  core.add(heart);

  var coreGlow = glowSprite(COLORS.amber, 6.5, 0.5);
  core.add(coreGlow);

  var rings = [];
  for (var r = 0; r < 3; r++) {
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.25 + r * 0.42, 0.01, 6, 180),
      new THREE.MeshBasicMaterial({ color: r === 1 ? COLORS.amber : COLORS.steel, transparent: true, opacity: r === 1 ? 0.35 : 0.22 })
    );
    ring.rotation.set(Math.PI / 2 + (r - 1) * 0.5, r * 0.8, 0);
    ring.userData.speed = 0.08 + r * 0.05;
    core.add(ring);
    rings.push(ring);
  }

  /* ---------- App nodes, labels and links ---------- */
  var nodes = [];
  var edges = [];
  var nodeGeo = new THREE.BoxGeometry(0.62, 0.62, 0.62);
  var nodeEdgesGeo = new THREE.EdgesGeometry(nodeGeo);

  function makeLabel(text) {
    var c = document.createElement("canvas");
    var w = 256, h = 72;
    c.width = w; c.height = h;
    var g = c.getContext("2d");
    g.font = '500 30px "IBM Plex Mono", ui-monospace, Menlo, monospace';
    var tw = Math.min(w - 8, g.measureText(text).width + 36);
    var x = (w - tw) / 2, y = 10, bh = h - 20, rad = bh / 2;
    g.fillStyle = "rgba(10,15,20,0.78)";
    g.strokeStyle = "rgba(127,167,217,0.55)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x + rad, y);
    g.arcTo(x + tw, y, x + tw, y + bh, rad);
    g.arcTo(x + tw, y + bh, x, y + bh, rad);
    g.arcTo(x, y + bh, x, y, rad);
    g.arcTo(x, y, x + tw, y, rad);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = "#E6EBEF";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + 1);
    var tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.scale.set(1.75, 0.49, 1);
    return s;
  }

  APPS.forEach(function (name, i) {
    var a = (i / APPS.length) * Math.PI * 2 + 0.3;
    var radius = 4.1 + (i % 2) * 0.5;
    var pos = new THREE.Vector3(Math.cos(a) * radius, Math.sin(i * 1.9) * 1.6, Math.sin(a) * radius);

    var group = new THREE.Group();
    group.position.copy(pos);

    var mat = new THREE.MeshStandardMaterial({
      color: COLORS.panel, emissive: COLORS.steel, emissiveIntensity: 0.18,
      roughness: 0.4, metalness: 0.6
    });
    var box = new THREE.Mesh(nodeGeo, mat);
    box.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    var outline = new THREE.LineSegments(nodeEdgesGeo, new THREE.LineBasicMaterial({ color: COLORS.steel, transparent: true, opacity: 0.8 }));
    box.add(outline);
    group.add(box);

    var halo = glowSprite(COLORS.steel, 1.8, 0.18);
    group.add(halo);

    var label = makeLabel(name);
    label.position.set(0, 0.85, 0);
    group.add(label);

    graph.add(group);
    nodes.push({ group: group, box: box, mat: mat, halo: halo, label: label, flash: 0, spin: 0.2 + Math.random() * 0.4 });

    // Curved link from node to core surface
    var end = pos.clone().normalize().multiplyScalar(1.2);
    var mid = pos.clone().multiplyScalar(0.5);
    mid.y += 1.4 * (i % 2 === 0 ? 1 : -1);
    var curve = new THREE.QuadraticBezierCurve3(pos.clone(), mid, end);
    var lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(64));
    var line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: COLORS.steel, transparent: true, opacity: 0.28 }));
    graph.add(line);
    edges.push({ curve: curve, line: line, node: i });
  });

  // Labels need the mono face; redraw once fonts are ready.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      nodes.forEach(function (n, i) {
        var fresh = makeLabel(APPS[i]);
        n.label.material.map.dispose();
        n.label.material.map = fresh.material.map;
        n.label.material.needsUpdate = true;
      });
      if (reduceMotion) render();
    });
  }

  /* ---------- Data packets ---------- */
  var PACKETS = 28;
  var packets = [];
  var tmp = new THREE.Vector3();
  for (var p = 0; p < PACKETS; p++) {
    var sprite = glowSprite(COLORS.fg, 0.42, 0.95);
    sprite.visible = false;
    graph.add(sprite);
    packets.push({ sprite: sprite, active: false, edge: 0, t: 0, dir: 1, speed: 0.4 });
  }

  function launch(edgeIndex, dir) {
    for (var i = 0; i < packets.length; i++) {
      var pk = packets[i];
      if (pk.active) continue;
      pk.active = true;
      pk.edge = edgeIndex;
      pk.dir = dir;
      pk.t = dir === 1 ? 0 : 1;
      pk.speed = 0.35 + Math.random() * 0.3;
      pk.sprite.material.color.setHex(dir === 1 ? COLORS.fg : COLORS.amber);
      pk.sprite.scale.setScalar(dir === 1 ? 0.38 : 0.5);
      pk.sprite.visible = true;
      return;
    }
  }

  var corePulse = 0;

  /* ---------- Background particles ---------- */
  (function addDust() {
    var count = 900;
    var arr = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var rr = 18 + Math.random() * 40;
      var th = Math.random() * Math.PI * 2;
      var ph = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = rr * Math.sin(ph) * Math.cos(th);
      arr[i * 3 + 1] = rr * Math.cos(ph) * 0.6;
      arr[i * 3 + 2] = rr * Math.sin(ph) * Math.sin(th) - 10;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    var dust = new THREE.Points(geo, new THREE.PointsMaterial({
      color: COLORS.steel, size: 0.09, transparent: true, opacity: 0.55, depthWrite: false
    }));
    scene.add(dust);
    scene.userData.dust = dust;
  })();

  /* ---------- Layout, pointer, scroll ---------- */
  var layout = { x: 4.8, y: 0.2, scale: 0.95, z: 15 };
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  var scrollP = 0;

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    if (w >= 980) {
      layout = { x: 4.8, y: 0.2, scale: 0.95, z: 15 };
    } else if (w >= 640) {
      layout = { x: 3, y: 0.6, scale: 0.8, z: 16 };
    } else {
      // Phones: graph sits in its own band above the headline.
      layout = { x: 0, y: 3.2, scale: 0.5, z: 17 };
    }
    root.position.set(layout.x, layout.y, 0);
    root.scale.setScalar(layout.scale);
    // Keep labels legible when the whole graph is scaled down.
    var labelBoost = layout.scale < 0.7 ? 1.5 : 1;
    nodes.forEach(function (n) { n.label.scale.set(1.75 * labelBoost, 0.49 * labelBoost, 1); });
    if (reduceMotion) render();
  }

  function onScroll() {
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollP = Math.min(1, Math.max(0, window.scrollY / max));
    // Dim the scene once the reader is past the hero so text stays legible.
    var heroFade = Math.min(1, window.scrollY / (window.innerHeight * 0.9));
    canvas.style.opacity = String(1 - heroFade * 0.55);
    if (reduceMotion) render();
  }

  window.addEventListener("resize", resize);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointermove", function (e) {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  /* ---------- Animation ---------- */
  var spawnClock = 0;
  var elapsed = 0;

  function update(dt) {
    elapsed += dt;

    // Ease pointer for parallax
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);

    graph.rotation.y = elapsed * 0.06 + scrollP * Math.PI * 1.4 + pointer.x * 0.25;
    graph.rotation.x = 0.18 + pointer.y * 0.12 + Math.sin(elapsed * 0.3) * 0.03;

    camera.position.z = layout.z + scrollP * 5;
    camera.position.y = 0.6 - scrollP * 2.5;
    camera.lookAt(0, -scrollP * 1.5, 0);

    // Core
    corePulse = Math.max(0, corePulse - dt * 2.5);
    shell.rotation.y += dt * 0.2;
    shell.rotation.x += dt * 0.08;
    heart.rotation.y -= dt * 0.5;
    heart.rotation.z += dt * 0.25;
    var s = 1 + corePulse * 0.12 + Math.sin(elapsed * 2) * 0.02;
    heart.scale.setScalar(s);
    heart.material.emissiveIntensity = 0.45 + corePulse * 0.9;
    coreGlow.material.opacity = 0.45 + corePulse * 0.35;
    coreLight.intensity = 2.2 + corePulse * 2;
    rings.forEach(function (ring) { ring.rotation.z += dt * ring.userData.speed; });

    // Nodes
    nodes.forEach(function (n, i) {
      n.flash = Math.max(0, n.flash - dt * 2);
      n.box.rotation.x += dt * n.spin * 0.6;
      n.box.rotation.y += dt * n.spin;
      n.group.position.y += Math.sin(elapsed * 0.8 + i) * dt * 0.08;
      n.mat.emissive.setHex(n.flash > 0.05 ? COLORS.amber : COLORS.steel);
      n.mat.emissiveIntensity = 0.18 + n.flash * 0.9;
      n.halo.material.color.setHex(n.flash > 0.05 ? COLORS.amber : COLORS.steel);
      n.halo.material.opacity = 0.16 + n.flash * 0.5;
    });

    // Spawn inbound data
    spawnClock += dt;
    if (spawnClock > 0.32) {
      spawnClock = 0;
      launch(Math.floor(Math.random() * edges.length), 1);
    }

    // Move packets
    packets.forEach(function (pk) {
      if (!pk.active) return;
      pk.t += pk.dir * pk.speed * dt;
      var done = pk.dir === 1 ? pk.t >= 1 : pk.t <= 0;
      if (done) {
        pk.active = false;
        pk.sprite.visible = false;
        if (pk.dir === 1) {
          // Core processed the data: send a result to another app
          corePulse = Math.min(1, corePulse + 0.35);
          var target = Math.floor(Math.random() * edges.length);
          if (target === pk.edge) target = (target + 3) % edges.length;
          launch(target, -1);
        } else {
          nodes[edges[pk.edge].node].flash = 1;
        }
        return;
      }
      edges[pk.edge].curve.getPoint(pk.t, tmp);
      pk.sprite.position.copy(tmp);
    });

    var dust = scene.userData.dust;
    if (dust) dust.rotation.y = elapsed * 0.01 + scrollP * 0.4;
  }

  function render() {
    if (reduceMotion) {
      // Still frame that still reacts to scroll.
      graph.rotation.y = 0.5 + scrollP * Math.PI * 1.4;
      graph.rotation.x = 0.18;
      camera.position.z = layout.z + scrollP * 5;
      camera.position.y = 0.6 - scrollP * 2.5;
      camera.lookAt(0, -scrollP * 1.5, 0);
    }
    renderer.render(scene, camera);
  }

  var last = performance.now();
  var rafId = 0;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    rafId = requestAnimationFrame(frame);
  }

  resize();
  onScroll();

  if (reduceMotion) {
    // Seed a few static packets so the graph reads as "data flowing".
    for (var k = 0; k < 10; k++) {
      launch(k % edges.length, k % 2 ? -1 : 1);
      var pk = packets[k];
      pk.t = 0.2 + (k % 5) * 0.15;
      edges[pk.edge].curve.getPoint(pk.t, pk.sprite.position);
    }
    render();
  } else {
    rafId = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else {
        last = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    });
  }
})();
