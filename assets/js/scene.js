/*
 * "Omni", the 3D website helper who guides visitors down the page.
 *
 * A glossy robot receptionist with a headset, a glass visor face, blinking
 * eyes and a voice-waveform mouth. It flies to open space beside each
 * section (sections declare themselves with data-agent), turns its head to
 * follow the cursor, waves, and types a line into a speech bubble.
 * Click it to make it wave and spin.
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
  var small = window.innerWidth < 760;
  var AMBER = 0xffb04a, STEEL = 0x7fa7d9;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  /* ---------- Studio reflections (generated, no image files) ---------- */
  (function () {
    var env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x0d151d, side: THREE.BackSide })));
    function panel(color, w, h, x, y, z) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide }));
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      env.add(m);
    }
    panel(0xffffff, 6, 3, 0, 5.5, 2);   // soft top light
    panel(0xffc27a, 3, 6, -5.5, 0, 2);  // warm side
    panel(0x8fb4e6, 3, 6, 5.5, 1, -2);  // cool rim
    panel(0xffffff, 4, 2, 2, 1, 5.5);   // front fill
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.04).texture;
    pmrem.dispose();
  })();

  scene.add(new THREE.AmbientLight(0x9fb3c8, 0.35));
  var key = new THREE.DirectionalLight(0xfff1e0, 1.4);
  key.position.set(-4, 6, 6);
  scene.add(key);
  var rim = new THREE.DirectionalLight(STEEL, 1.1);
  rim.position.set(5, 3, -4);
  scene.add(rim);

  /* ---------- Materials ---------- */
  var shell = new THREE.MeshPhysicalMaterial({ color: 0xeef1f4, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 });
  var dark = new THREE.MeshPhysicalMaterial({ color: 0x111a23, roughness: 0.25, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.2 });
  var glass = new THREE.MeshPhysicalMaterial({ color: 0x04070b, roughness: 0.06, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.03 });
  var amberGlow = new THREE.MeshBasicMaterial({ color: AMBER, toneMapped: false });
  var steelGlow = new THREE.MeshBasicMaterial({ color: STEEL, toneMapped: false });

  var glowTex = (function () {
    var c = document.createElement("canvas");
    c.width = c.height = 128;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.3, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  function glowSprite(color, size, opacity) {
    var s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: color, transparent: true, opacity: opacity,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
    }));
    s.scale.set(size, size, 1);
    return s;
  }

  /* ---------- Build the agent ---------- */
  var agent = new THREE.Group();   // section position, scale, facing
  var rig = new THREE.Group();     // hover bob and lean
  agent.add(rig);
  scene.add(agent);
  var pickables = [];
  function add(parent, mesh) { parent.add(mesh); pickables.push(mesh); return mesh; }

  // Body: a rounded bean
  var bodyProfile = [
    [0, -0.8], [0.42, -0.78], [0.66, -0.62], [0.76, -0.25], [0.75, 0.25], [0.64, 0.62], [0.42, 0.8], [0, 0.83]
  ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
  add(rig, new THREE.Mesh(new THREE.LatheGeometry(bodyProfile, 64), shell));
  var belt = new THREE.Mesh(new THREE.TorusGeometry(0.755, 0.025, 12, 80), dark);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = -0.2;
  rig.add(belt);

  // Chest: the Omni diamond inside a glowing ring
  var chest = new THREE.Group();
  chest.position.set(0, 0.22, 0.73);
  chest.rotation.x = -0.12;
  rig.add(chest);
  chest.add(new THREE.Mesh(new THREE.CircleGeometry(0.26, 48), glass));
  chest.add(new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.028, 12, 64), amberGlow));
  var diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), amberGlow);
  diamond.position.z = 0.04;
  diamond.scale.set(1, 1, 0.4);
  chest.add(diamond);
  var chestGlow = glowSprite(AMBER, 1.1, 0.45);
  chestGlow.position.z = 0.05;
  chest.add(chestGlow);

  // Neck
  var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.2, 32), dark);
  neck.position.y = 0.9;
  rig.add(neck);

  // Head
  var head = new THREE.Group();
  head.position.y = 1.62;
  rig.add(head);
  var skull = add(head, new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), shell));
  skull.scale.set(0.95, 0.76, 0.82);

  // Visor: the front cap of a sphere (phi = PI/2 faces +z)
  var visor = add(head, new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 48, Math.PI * 0.13, Math.PI * 0.74, Math.PI * 0.24, Math.PI * 0.5),
    glass
  ));
  visor.scale.set(0.87, 0.74, 0.88);
  visor.position.z = 0.02;

  // Eyes
  var eyes = [];
  [-0.3, 0.3].forEach(function (x) {
    var eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), amberGlow);
    eye.scale.set(1, 1.45, 0.35);
    eye.position.set(x, 0.1, 0.9);
    head.add(eye);
    eyes.push(eye);
  });
  var eyeGlow = glowSprite(AMBER, 1.5, 0.3);
  eyeGlow.position.set(0, 0.1, 0.95);
  head.add(eyeGlow);

  // Mouth: a 5-bar voice waveform
  var mouth = [];
  for (var b = 0; b < 5; b++) {
    var bar = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.1, 0.02), amberGlow);
    bar.position.set((b - 2) * 0.085, -0.22, 0.875);
    bar.rotation.x = -0.28;
    head.add(bar);
    mouth.push(bar);
  }

  // Ear pods with glowing rings
  [-1, 1].forEach(function (side) {
    var pod = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 32), dark);
    pod.rotation.z = Math.PI / 2;
    pod.position.set(side * 0.93, 0, 0);
    head.add(pod);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 10, 40), amberGlow);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(side * 1.02, 0, 0);
    head.add(ring);
  });

  // Headset band and microphone boom
  var band = new THREE.Mesh(new THREE.TorusGeometry(0.97, 0.035, 12, 64, Math.PI), dark);
  band.position.set(0, 0.02, -0.08);
  band.rotation.x = -0.12;
  head.add(band);
  var boomCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-1.0, -0.05, 0.08),
    new THREE.Vector3(-1.02, -0.42, 0.55),
    new THREE.Vector3(-0.42, -0.36, 0.84)
  );
  head.add(new THREE.Mesh(new THREE.TubeGeometry(boomCurve, 24, 0.022, 8, false), dark));
  var mic = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), dark);
  mic.position.copy(boomCurve.v2);
  head.add(mic);
  var micLight = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), amberGlow);
  micLight.position.copy(boomCurve.v2).add(new THREE.Vector3(0.02, 0.02, 0.05));
  head.add(micLight);

  // Antenna
  var stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.32, 12), dark);
  stalk.position.set(0, 0.9, 0);
  head.add(stalk);
  var tip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), amberGlow);
  tip.position.set(0, 1.1, 0);
  head.add(tip);
  var tipGlow = glowSprite(AMBER, 0.9, 0.6);
  tipGlow.position.copy(tip.position);
  head.add(tipGlow);

  // Floating hands
  function makeHand() {
    var h = new THREE.Group();
    var palm = add(h, new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 24), shell));
    palm.scale.set(1, 1.08, 0.85);
    var cuff = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 10, 40), dark);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.17;
    h.add(cuff);
    rig.add(h);
    return h;
  }
  var handL = makeHand(), handR = makeHand();
  handL.position.set(-1.05, -0.15, 0.2);
  handR.position.set(1.05, -0.15, 0.2);

  // Hover base
  var base = new THREE.Group();
  base.position.y = -1.2;
  agent.add(base);
  var baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.03, 12, 80), steelGlow);
  baseRing.rotation.x = Math.PI / 2;
  base.add(baseRing);
  var baseRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.012, 8, 80), amberGlow);
  baseRing2.rotation.x = Math.PI / 2;
  base.add(baseRing2);
  var baseGlow = glowSprite(STEEL, 2.6, 0.35);
  baseGlow.scale.set(2.6, 0.9, 1);
  base.add(baseGlow);

  /* ---------- Background dust ---------- */
  var dust = (function () {
    var count = small ? 350 : 800, arr = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var z = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = 14 + Math.random() * 26, q = Math.sqrt(1 - z * z);
      arr[i * 3] = q * Math.cos(t) * r;
      arr[i * 3 + 1] = z * r * 0.6;
      arr[i * 3 + 2] = q * Math.sin(t) * r - 12;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    var d = new THREE.Points(g, new THREE.PointsMaterial({ color: STEEL, size: 0.07, transparent: true, opacity: 0.45, depthWrite: false }));
    scene.add(d);
    return d;
  })();

  /* ---------- Per-section placement, pose and lines ---------- */
  // [x, visual-centre y, scale, facing, bubble side] in world units.
  // Facing turns the agent toward the content. Bubble side: 1 right of the head, -1 left, 0 hidden.
  var CORNER = [-1.25, -3.05, 0.27, 0.3, 0];  // phones: bottom-left, clear of the other chat widget
  var LAYOUT = {
    core:       { d: [3.2, 0, 1, -0.3, 1],        m: [-0.9, 2.15, 0.45, 0.3, 1] },
    services:   { d: [3.5, 2.0, 0.5, -0.45, 1],   m: CORNER },
    audiences:  { d: [3.5, 2.35, 0.48, -0.4, 1],  m: CORNER },
    kk:         { d: [5.9, 2.7, 0.4, -0.5, -1],   m: CORNER },
    process:    { d: [3.5, 2.2, 0.55, -0.4, 1],   m: CORNER },
    calculator: { d: [3.5, 2.2, 0.55, -0.4, 1],   m: CORNER },
    faq:        { d: [-4.4, -1.6, 0.7, 0.45, -1], m: CORNER },
    finale:     { d: [0, 1.4, 0.85, 0, 1],        m: [-0.9, 1.6, 0.45, 0.3, 1] },
    contact:    { d: [-4.5, -1.6, 0.6, 0.45, -1], m: CORNER }
  };
  var LINES = {
    core: "Hi, I'm Omni, your guide to this website. Click me any time to chat.",
    services: "Eleven services, one system. Drag the ring to explore them.",
    audiences: "Local business or agency? Omni AI Builders helps both.",
    kk: "Run an agency? Knock Knock AI puts sales agents on your clients' websites.",
    process: "From first call to live in about three weeks.",
    calculator: "Let's see what slow replies are costing you.",
    faq: "Got a question? The answers are below, or ask me in the chat.",
    finale: "Ready when you are. Let's build your AI workforce.",
    contact: "Tell the team what you'd like to automate first.",
    poke: "Hi again! Open the chat and I'll show you around."
  };
  var POSE = { core: "wave", finale: "wave", services: "present", audiences: "present", kk: "present", process: "present", calculator: "think", faq: "think", contact: "present" };
  // Service detail pages reuse the home page spots
  LAYOUT.svc = LAYOUT.core; POSE.svc = "wave";
  LAYOUT["svc-features"] = LAYOUT.services; POSE["svc-features"] = "present";
  LAYOUT["svc-steps"] = LAYOUT.process; POSE["svc-steps"] = "present";

  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-agent]"));

  // Scroll position in "section units": 2.4 means 40% of the way from section 2 to 3.
  // The agent holds still while a section is centred, then flies to the next spot.
  function scrollTarget() {
    if (!sections.length) return 0;
    var vc = window.innerHeight / 2, centers = sections.map(function (el) {
      var rc = el.getBoundingClientRect();
      return rc.top + rc.height / 2;
    });
    if (vc <= centers[0]) return 0;
    for (var i = 0; i < centers.length - 1; i++) {
      if (vc < centers[i + 1]) {
        var t = (vc - centers[i]) / (centers[i + 1] - centers[i]);
        t = Math.min(1, Math.max(0, (t - 0.25) / 0.5));
        return i + t * t * (3 - 2 * t);
      }
    }
    return centers.length - 1;
  }

  /* ---------- State ---------- */
  var elapsed = 0;
  var pos = scrollTarget();
  var pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };
  var lastX = null, lean = 0;
  var blink = { next: 2, t: -1 };
  var wave = { until: 2.6 };
  var spin = { t: -1 };
  var current = { el: null, key: "", pose: "wave" };
  var dock = { fn: null, last: null, blend: 0 };
  var intro = { t: reduceMotion ? 1 : 0 };
  var v3 = new THREE.Vector3(), hL = new THREE.Vector3(), hR = new THREE.Vector3();

  /* ---------- Speech bubble ---------- */
  var bubble = document.getElementById("agent-bubble");
  var bubbleText = document.getElementById("agent-text");
  var said = "", typing = { text: "", shown: 0, clock: 0 }, talkUntil = 0, pokeTimer = 0;

  function say(keyName, el) {
    var line = (el && el.getAttribute("data-agent-line")) || LINES[keyName] || "";
    if (line === said) return;
    said = line;
    typing.text = line;
    typing.shown = reduceMotion ? line.length : 0;
    typing.clock = 0;
    if (bubbleText) bubbleText.textContent = reduceMotion ? line : "";
    talkUntil = elapsed + line.length * 0.03 + 0.5;
  }

  function placement(p) {
    var i = Math.min(sections.length - 1, Math.floor(p));
    var j = Math.min(sections.length - 1, i + 1);
    var t = p - i;
    var a = sections[i].getAttribute("data-agent"), b = sections[j].getAttribute("data-agent");
    var la = (LAYOUT[a] || LAYOUT.core)[small ? "m" : "d"], lb = (LAYOUT[b] || LAYOUT.core)[small ? "m" : "d"];
    function mix(k) { return la[k] + (lb[k] - la[k]) * t; }
    var near = t < 0.5 ? la : lb;
    return {
      x: mix(0), y: mix(1), s: mix(2), f: mix(3), side: near[4],
      key: t < 0.5 ? a : b, el: t < 0.5 ? sections[i] : sections[j],
      moving: t > 0.04 && t < 0.96
    };
  }

  // Where to stand when the chat panel (bottom-left) is open: on top of the panel,
  // near its left edge, so it stays clear of the page text and the other chat widget.
  function dockTarget() {
    if (!dock.fn) return null;
    var r = dock.fn();
    if (!r || !r.width) return null;
    var w = window.innerWidth, h = window.innerHeight, u = h / (2 * Math.tan(Math.PI / 8) * 10);
    var sc = w - r.width > 320 ? 0.38 : 0.3;
    var sx = r.left + 1.45 * sc * u;
    var sy = Math.max(r.top - 2.1 * sc * u, 70 + 2.0 * sc * u);
    var f = 0.25;
    return { x: (sx - w / 2) / u, y: (h / 2 - sy) / u, s: sc, f: f };
  }

  function update(dt) {
    elapsed += dt;
    if (sections.length) pos += (scrollTarget() - pos) * Math.min(1, dt * 3.2);
    var pl = sections.length ? placement(pos) : { x: 3.2, y: 0, s: 1, f: -0.3, side: 1, key: "core", el: null, moving: false };

    // Docked beside the chat panel
    var dt2 = dockTarget();
    if (dt2) dock.last = dt2;
    dock.blend += ((dt2 ? 1 : 0) - dock.blend) * (reduceMotion ? 1 : Math.min(1, dt * 3.5));
    if (dock.blend > 0.001 && dock.last) {
      var bl = dock.blend, d = dock.last;
      pl.x += (d.x - pl.x) * bl;
      pl.y += (d.y - pl.y) * bl;
      pl.s += (d.s - pl.s) * bl;
      pl.f += (d.f - pl.f) * bl;
      if (bl > 0.02) pl.side = 0;
    }

    // Entrance: fly in from the right with a spin, then wave
    var introSpin = 0;
    if (intro.t < 1) {
      intro.t = Math.min(1, intro.t + dt / 1.8);
      var ie = 1 - Math.pow(1 - intro.t, 3);
      pl.x += (1 - ie) * 9;
      pl.y += (1 - ie) * 1.5;
      introSpin = (1 - ie) * Math.PI * 2;
      pl.moving = true;
      if (intro.t >= 1) wave.until = elapsed + 2.6;
    }

    // Flight: lean into the direction of travel
    if (lastX !== null && dt > 0) lean += (((pl.x - lastX) / dt) * -0.04 - lean) * Math.min(1, dt * 4);
    lastX = pl.x;

    agent.position.set(pl.x, pl.y - 0.8 * pl.s, 0);
    agent.scale.setScalar(pl.s);
    rig.position.y = reduceMotion ? 0 : Math.sin(elapsed * 1.6) * 0.08;
    rig.rotation.z = Math.max(-0.35, Math.min(0.35, lean)) + (reduceMotion ? 0 : Math.sin(elapsed * 0.9) * 0.025);

    if (pl.el !== current.el) {
      current.el = pl.el;
      current.key = pl.key;
      current.pose = POSE[pl.key] || "idle";
      if (current.pose === "wave" && intro.t >= 1) wave.until = elapsed + 2.6;
      if (!pokeTimer) say(pl.key, pl.el);
    }

    // Facing, plus a spin when clicked
    var spinAngle = 0;
    if (spin.t >= 0) {
      spin.t += dt;
      var k = Math.min(1, spin.t / 1.1);
      spinAngle = Math.PI * 2 * (1 - Math.pow(1 - k, 3));
      if (k >= 1) spin.t = -1;
    }
    agent.rotation.y = pl.f + spinAngle + introSpin;

    // Head follows the cursor, relative to where the agent is on screen
    head.localToWorld(v3.set(0, 0, 0));
    v3.project(camera);
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 5);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 5);
    var lookX = pointer.active ? Math.max(-0.75, Math.min(0.75, (pointer.x - v3.x) * 1.1)) : Math.sin(elapsed * 0.4) * 0.15;
    var lookY = pointer.active ? Math.max(-0.4, Math.min(0.45, (pointer.y - v3.y) * 0.8)) : 0;
    var ease = reduceMotion ? 1 : Math.min(1, dt * 6);
    head.rotation.y += ((lookX - pl.f) - head.rotation.y) * ease;
    head.rotation.x += (-lookY - head.rotation.x) * ease;
    head.rotation.z = -head.rotation.y * 0.08;

    // Blink
    if (elapsed > blink.next && blink.t < 0 && !reduceMotion) blink.t = 0;
    var eyeY = 1.45;
    if (blink.t >= 0) {
      blink.t += dt;
      eyeY = 1.45 * Math.abs(Math.cos(Math.min(1, blink.t / 0.16) * Math.PI));
      if (blink.t > 0.16) { blink.t = -1; blink.next = elapsed + 2 + Math.random() * 3.5; }
    }
    eyes.forEach(function (e, i) {
      e.scale.y = Math.max(0.12, eyeY);
      e.position.x = (i ? 0.3 : -0.3) + lookX * 0.03;
    });

    // Mouth: talk while typing, gentle hum otherwise
    var talking = elapsed < talkUntil && !reduceMotion;
    mouth.forEach(function (m, i) {
      m.scale.y = talking
        ? 0.35 + Math.abs(Math.sin(elapsed * 14 + i * 1.7) * Math.sin(elapsed * 5.3 + i)) * 1.6
        : 0.5 + Math.sin(elapsed * 2 + i * 0.8) * 0.15;
    });

    // Glows breathe
    var pulse = 0.5 + 0.5 * Math.sin(elapsed * 2.2);
    chestGlow.material.opacity = 0.3 + pulse * 0.3 + (talking ? 0.2 : 0);
    tipGlow.material.opacity = 0.4 + pulse * 0.4;
    diamond.rotation.z = elapsed * 0.8;
    baseRing.rotation.z = elapsed * 0.5;
    baseRing2.scale.setScalar(1 + pulse * 0.08);
    baseGlow.material.opacity = 0.25 + pulse * 0.15;

    // Hands by pose, in local space. Screen-left is the agent's right hand.
    var waving = elapsed < wave.until && !reduceMotion;
    var contentSide = pl.x > 0.5 ? -1 : 1;
    var t2 = elapsed;
    hL.set(-1.05, -0.15 + Math.sin(t2 * 1.6 + 1) * 0.05, 0.2);
    hR.set(1.05, -0.15 + Math.sin(t2 * 1.6) * 0.05, 0.2);
    if (current.pose === "present") {
      (contentSide < 0 ? hL : hR).set(contentSide * 1.35, 0.35 + Math.sin(t2 * 1.4) * 0.05, 0.75);
    } else if (current.pose === "think") {
      (contentSide < 0 ? hL : hR).set(contentSide * 0.42, 0.95 + Math.sin(t2 * 1.2) * 0.02, 0.85);
    }
    var waveHand = contentSide < 0 ? hR : hL, waveSign = contentSide < 0 ? 1 : -1;
    if (waving || current.pose === "wave") {
      var w = waving ? 1 : 0.35;
      waveHand.set(waveSign * (1.2 + Math.sin(t2 * 9) * 0.18 * w), 1.35 + Math.cos(t2 * 9) * 0.05 * w, 0.35);
    }
    var hk = reduceMotion ? 1 : Math.min(1, dt * 7);
    handL.position.lerp(hL, hk);
    handR.position.lerp(hR, hk);
    var rock = (waving || current.pose === "wave") ? Math.sin(t2 * 9) * 0.5 : 0;
    (contentSide < 0 ? handR : handL).rotation.z = rock;

    dust.rotation.y = elapsed * 0.01 + pos * 0.06;

    // Typewriter
    if (typing.shown < typing.text.length) {
      typing.clock += dt;
      var n = Math.min(typing.text.length, Math.floor(typing.clock / 0.028));
      if (n !== typing.shown) {
        typing.shown = n;
        if (bubbleText) bubbleText.textContent = typing.text.slice(0, n);
      }
    }

    placeBubble(pl);
  }

  function placeBubble(pl) {
    if (!bubble) return;
    var show = !pl.moving && said.length > 0 && pl.side !== 0;
    bubble.classList.toggle("is-on", show);
    if (!show) return;
    head.localToWorld(v3.set(0, 0.45, 0));
    v3.project(camera);
    var sx = (v3.x * 0.5 + 0.5) * window.innerWidth;
    var sy = (-v3.y * 0.5 + 0.5) * window.innerHeight;
    var unitPx = window.innerHeight / (2 * Math.tan(Math.PI / 8) * 10);
    var headPx = 0.95 * pl.s * unitPx;
    var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    var left = pl.side > 0 ? sx + headPx * 1.05 : sx - headPx * 1.05 - bw;
    var top = sy - bh * 0.7;
    bubble.setAttribute("data-tail", pl.side > 0 ? "left" : "right");
    left = Math.max(12, Math.min(window.innerWidth - bw - 12, left));
    top = Math.max(70, Math.min(window.innerHeight - bh - 12, top));
    bubble.style.transform = "translate(" + Math.round(left) + "px," + Math.round(top) + "px)";
  }

  function render() { renderer.render(scene, camera); }

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    small = w < 760;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (reduceMotion) { pos = scrollTarget(); update(0); render(); }
  }

  /* ---------- Input ---------- */
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    pointer.active = true;
  }, { passive: true });
  document.addEventListener("pointerleave", function () { pointer.active = false; });

  var raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  var INTERACTIVE = "a, button, input, select, textarea, summary, label, .card, .carousel-stage, .kk-card, .audience, .omni-chat, .omni-launch";
  function overAgent(e) {
    if (e.target.closest && e.target.closest(INTERACTIVE)) return false;
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(pickables, false).length > 0;
  }

  // Show a hand cursor over the robot so people know they can click it.
  var lastHover = 0;
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    var now = performance.now();
    if (now - lastHover < 80) return;
    lastHover = now;
    document.body.classList.toggle("omni-hover", overAgent(e));
  }, { passive: true });

  function poked() {
    wave.until = elapsed + 2.2;
    if (!reduceMotion) spin.t = 0;
    if (window.OmniChat) { window.OmniChat.open(true); if (reduceMotion) { update(0); render(); } return; }
    said = "";
    say("poke");
    clearTimeout(pokeTimer);
    pokeTimer = setTimeout(function () { pokeTimer = 0; said = ""; say(current.key, current.el); }, 3200);
    if (reduceMotion) { update(0); render(); }
  }

  // Clicking the floating robot, or its speech bubble, opens the chat.
  window.addEventListener("click", function (e) { if (overAgent(e)) poked(); });
  if (bubble) bubble.addEventListener("click", poked);

  /* ---------- Loop ---------- */
  var last = performance.now(), rafId = 0;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    rafId = requestAnimationFrame(frame);
  }

  // Used by chat.js: dock beside the chat panel, talk, wave.
  window.OmniAgent = {
    dock: function (fn) { dock.fn = fn; if (reduceMotion) { update(0); render(); } },
    undock: function () { dock.fn = null; if (reduceMotion) { update(0); render(); } },
    talk: function (seconds) { talkUntil = seconds > 0 ? elapsed + seconds : 0; },
    wave: function () { wave.until = elapsed + 2.4; }
  };

  resize();

  if (reduceMotion) {
    pos = scrollTarget();
    update(0);
    render();
    window.addEventListener("scroll", function () { pos = scrollTarget(); update(0); render(); }, { passive: true });
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
