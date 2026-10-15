/*
 * Full-page 3D particle system for Omni AI Builders.
 *
 * One cloud of glowing particles morphs into a different 3D form for each
 * section as the visitor scrolls (sections declare it with data-shape):
 *   core        a glowing AI orb                      (hero, Knock Knock, contact)
 *   services    a ring of 10 clusters, one per service
 *   audiences   two orbs joined by a data stream      (businesses + agencies)
 *   process     a turning double helix                (the pipeline)
 *   calculator  a rolling data surface
 *   faq         a slow spiral galaxy
 *   finale      the word OMNI
 * Particles scatter mid-transition and push away from the cursor.
 * Requires Three.js r128 loaded as the global THREE.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("scene");
  if (!canvas || !window.THREE) return;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    canvas.remove();
    return;
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = window.innerWidth < 760;
  var N = small ? 9000 : 18000;
  var PR = Math.min(window.devicePixelRatio || 1, 1.75);

  renderer.setPixelRatio(PR);
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  var group = new THREE.Group();
  scene.add(group);

  /* ---------- Shape generators ---------- */
  var TAU = Math.PI * 2;
  function rand(a, b) { return a + Math.random() * (b - a); }
  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }
  function unit() {
    var z = rand(-1, 1), t = rand(0, TAU), r = Math.sqrt(1 - z * z);
    return [r * Math.cos(t), z, r * Math.sin(t)];
  }
  function set(arr, i, x, y, z) { arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z; }

  function shapeCore() {
    var a = new Float32Array(N * 3), golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      if (i % 5 === 0) {
        var u = unit(), r = 2.25 * Math.cbrt(Math.random());
        set(a, i, u[0] * r, u[1] * r, u[2] * r);
      } else {
        var y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * golden, R = 2.6 + gauss() * 0.03;
        set(a, i, Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R);
      }
    }
    return a;
  }

  function shapeServices() {
    var a = new Float32Array(N * 3), R = 3.7;
    for (var i = 0; i < N; i++) {
      if (Math.random() < 0.2) {
        var t = rand(0, TAU), rr = R + gauss() * 0.05;
        set(a, i, Math.cos(t) * rr, Math.sin(t) * rr, gauss() * 0.05);
      } else {
        var k = i % 10, ang = (k / 10) * TAU + Math.PI / 2;
        var u = unit(), r = 0.55 * Math.cbrt(Math.random());
        set(a, i, Math.cos(ang) * R + u[0] * r, Math.sin(ang) * R + u[1] * r, u[2] * r);
      }
    }
    return a;
  }

  function shapeAudiences() {
    var a = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var roll = Math.random();
      if (roll < 0.8) {
        var cx = roll < 0.4 ? -3.4 : 3.4, u = unit(), R = (i % 4 === 0 ? 1.55 * Math.cbrt(Math.random()) : 1.55);
        set(a, i, cx + u[0] * R, u[1] * R, u[2] * R);
      } else {
        var x = rand(-1.9, 1.9), ph = (i % 3) * 2.1;
        set(a, i, x, Math.sin(x * 1.6 + ph) * 0.35 + gauss() * 0.06, Math.cos(x * 1.6 + ph) * 0.35 + gauss() * 0.06);
      }
    }
    return a;
  }

  function shapeProcess() {
    var a = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      if (Math.random() < 0.12) {
        var rx = -5.5 + Math.floor(rand(0, 23)) * 0.5, ra = rx * 1.2, t = rand(-1, 1);
        set(a, i, rx, Math.cos(ra) * 1.1 * t, Math.sin(ra) * 1.1 * t);
      } else {
        var x = rand(-5.5, 5.5), ang = x * 1.2 + (i % 2) * Math.PI;
        set(a, i, x + gauss() * 0.03, Math.cos(ang) * 1.1 + gauss() * 0.05, Math.sin(ang) * 1.1 + gauss() * 0.05);
      }
    }
    return a;
  }

  function shapeCalculator() {
    var a = new Float32Array(N * 3);
    var cols = Math.round(Math.sqrt(N * 13 / 7)), rows = Math.ceil(N / cols), tilt = 0.6;
    for (var i = 0; i < N; i++) {
      var gx = -6.5 + ((i % cols) / (cols - 1)) * 13;
      var gz = -3.5 + (Math.floor(i / cols) / (rows - 1)) * 7;
      var gy = Math.sin(gx * 0.9) * 0.45 + Math.cos(gz * 1.3 + gx * 0.4) * 0.35;
      set(a, i, gx, gy * Math.cos(tilt) - gz * Math.sin(tilt), gy * Math.sin(tilt) + gz * Math.cos(tilt));
    }
    return a;
  }

  function shapeFaq() {
    var a = new Float32Array(N * 3), tilt = 1.0;
    for (var i = 0; i < N; i++) {
      var r = Math.pow(Math.random(), 1.5) * 4.2, ang = ((i % 3) / 3) * TAU + r * 1.1;
      var spread = 0.35 * (1 - r / 5);
      var x = Math.cos(ang) * r + gauss() * spread, y = gauss() * 0.12, z = Math.sin(ang) * r + gauss() * spread;
      set(a, i, x, y * Math.cos(tilt) - z * Math.sin(tilt), y * Math.sin(tilt) + z * Math.cos(tilt));
    }
    return a;
  }

  function shapeText(word, target) {
    var a = target || new Float32Array(N * 3);
    var W = 1400, H = 360, c = document.createElement("canvas");
    c.width = W; c.height = H;
    var g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = '800 280px "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif';
    var tw = g.measureText(word).width || W * 0.8;
    g.fillText(word, W / 2, H / 2 + 10);
    var data = g.getImageData(0, 0, W, H).data, pts = [];
    for (var py = 0; py < H; py += 3) {
      for (var px = 0; px < W; px += 3) {
        if (data[(py * W + px) * 4 + 3] > 140) pts.push(px, py);
      }
    }
    var span = 10.5 / tw;
    for (var i = 0; i < N; i++) {
      if (!pts.length) { set(a, i, 0, 0, 0); continue; }
      var k = Math.floor(Math.random() * (pts.length / 2)) * 2;
      set(a, i,
        (pts[k] - W / 2) * span + gauss() * 0.015,
        -(pts[k + 1] - H / 2) * span + gauss() * 0.015,
        gauss() * 0.12);
    }
    return a;
  }

  /* ---------- Geometry and material ---------- */
  var SHAPES = { core: 0, services: 1, audiences: 2, process: 3, calculator: 4, faq: 5, finale: 6 };
  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(shapeCore(), 3));
  geo.setAttribute("aS1", new THREE.BufferAttribute(shapeServices(), 3));
  geo.setAttribute("aS2", new THREE.BufferAttribute(shapeAudiences(), 3));
  geo.setAttribute("aS3", new THREE.BufferAttribute(shapeProcess(), 3));
  geo.setAttribute("aS4", new THREE.BufferAttribute(shapeCalculator(), 3));
  geo.setAttribute("aS5", new THREE.BufferAttribute(shapeFaq(), 3));
  geo.setAttribute("aS6", new THREE.BufferAttribute(shapeText("OMNI"), 3));
  var rnd = new Float32Array(N);
  for (var r = 0; r < N; r++) rnd[r] = Math.random();
  geo.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);

  // The word needs the display face; re-sample once fonts have loaded.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      var attr = geo.getAttribute("aS6");
      shapeText("OMNI", attr.array);
      attr.needsUpdate = true;
      if (reduceMotion) render();
    });
  }

  var uniforms = {
    uTime: { value: 0 },
    uFrom: { value: 0 },
    uTo: { value: 0 },
    uT: { value: 0 },
    uSize: { value: small ? 0.13 : 0.12 },
    uPR: { value: PR },
    uOpacity: { value: 1 },
    uMouse: { value: new THREE.Vector2(99, 99) },
    uMouseOn: { value: 0 }
  };

  var material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: [
      "uniform float uTime, uFrom, uTo, uT, uSize, uPR, uOpacity, uMouseOn;",
      "uniform vec2 uMouse;",
      "attribute vec3 aS1, aS2, aS3, aS4, aS5, aS6;",
      "attribute float aRand;",
      "varying vec3 vColor;",
      "varying float vAlpha;",
      "mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }",
      "float wt(float k) {",
      "  return (1.0 - step(0.5, abs(uFrom - k))) * (1.0 - uT) + (1.0 - step(0.5, abs(uTo - k))) * uT;",
      "}",
      "void main() {",
      "  vec3 s0 = position; s0.xz = rot(uTime * 0.18) * s0.xz;",
      "  vec3 s1 = aS1;      s1.xy = rot(uTime * 0.07) * s1.xy;",
      "  vec3 s2 = aS2;      s2.yz = rot(uTime * 0.25 * sign(s2.x)) * s2.yz;",
      "  vec3 s3 = aS3;      s3.yz = rot(uTime * 0.45) * s3.yz;",
      "  vec3 s4 = aS4;      s4.y += sin(s4.x * 0.8 + uTime * 0.9) * 0.18;",
      "  vec3 s5 = aS5;      s5.xz = rot(uTime * 0.05) * s5.xz;",
      "  vec3 p = s0 * wt(0.0) + s1 * wt(1.0) + s2 * wt(2.0) + s3 * wt(3.0) + s4 * wt(4.0) + s5 * wt(5.0) + aS6 * wt(6.0);",
      "  float burst = sin(3.14159 * uT);",
      "  float n = aRand * 6.2831;",
      "  vec3 wob = vec3(sin(p.y * 1.7 + uTime * 0.8 + n), sin(p.z * 1.5 + uTime * 0.7 + n * 1.3), sin(p.x * 1.3 + uTime * 0.6 + n * 0.7));",
      "  p += wob * (0.03 + burst * 1.1 * aRand);",
      "  vec4 world = modelMatrix * vec4(p, 1.0);",
      "  vec2 d = world.xy - uMouse;",
      "  float dl = length(d);",
      "  float f = uMouseOn * smoothstep(1.7, 0.0, dl);",
      "  world.xy += (d / max(dl, 0.001)) * f * 0.75;",
      "  world.z += f * 0.6;",
      "  vec4 mv = viewMatrix * world;",
      "  gl_Position = projectionMatrix * mv;",
      "  float textW = wt(6.0);",
      "  gl_PointSize = uSize * (0.45 + aRand) * uPR * (300.0 / -mv.z) * (1.0 + f * 0.9) * (1.0 + textW * 0.5);",
      "  vec3 steel = vec3(0.50, 0.65, 0.85);",
      "  vec3 amber = vec3(1.0, 0.69, 0.29);",
      "  vec3 hot = vec3(1.0, 0.94, 0.84);",
      "  vec3 c = mix(steel, amber, step(0.74, aRand));",
      "  c = mix(c, hot, step(0.975, aRand));",
      "  c = mix(c, amber, clamp(f * 0.9 + burst * 0.3, 0.0, 1.0));",
      "  vColor = c;",
      "  vAlpha = uOpacity * (0.6 + 0.4 * (0.5 + 0.5 * sin(uTime * 1.6 + n * 3.0))) * (1.0 + textW * 0.6);",
      "}"
    ].join("\n"),
    fragmentShader: [
      "varying vec3 vColor;",
      "varying float vAlpha;",
      "void main() {",
      "  float d = length(gl_PointCoord - 0.5);",
      "  float a = smoothstep(0.5, 0.0, d);",
      "  a *= a;",
      "  gl_FragColor = vec4(vColor * a * vAlpha, a * vAlpha);",
      "}"
    ].join("\n")
  });

  var points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  group.add(points);

  /* ---------- Orb glow (only around the core shape) ---------- */
  var glow = (function () {
    var c = document.createElement("canvas");
    c.width = c.height = 128;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,176,74,0.55)");
    grad.addColorStop(0.35, "rgba(255,176,74,0.14)");
    grad.addColorStop(1, "rgba(255,176,74,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    var s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    s.scale.set(9, 9, 1);
    return s;
  })();
  group.add(glow);

  /* ---------- Background dust ---------- */
  (function () {
    var count = small ? 400 : 900, arr = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var u = unit(), rr = rand(14, 40);
      set(arr, i, u[0] * rr, u[1] * rr * 0.6, u[2] * rr - 12);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    var dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x7fa7d9, size: 0.07, transparent: true, opacity: 0.45, depthWrite: false }));
    scene.add(dust);
    scene.userData.dust = dust;
  })();

  /* ---------- Per-section layout: [x, y, scale, opacity] ---------- */
  var LAYOUT = {
    core:       { d: [3.3, 0, 1, 1],          m: [0, 2.05, 0.55, 1] },
    services:   { d: [0, 0.2, 1.35, 0.75],    m: [0, 0, 0.5, 0.4] },
    audiences:  { d: [3.6, 2.4, 0.55, 0.95],  m: [0, 2.6, 0.32, 0.6] },
    kk:         { d: [-4.3, 0.3, 0.7, 0.5],   m: [0, 2.6, 0.35, 0.5] },
    process:    { d: [0, 2.3, 0.85, 0.85],    m: [0, 2.7, 0.35, 0.6] },
    calculator: { d: [2.8, 2.35, 0.44, 0.95],  m: [0, 2.6, 0.3, 0.6] },
    faq:        { d: [-3.6, -1.6, 0.7, 0.85], m: [0, 0, 0.5, 0.35] },
    finale:     { d: [0, 1.25, 0.82, 1],      m: [0, 1.6, 0.34, 1] },
    contact:    { d: [-4.2, -1.6, 0.6, 0.6],  m: [0, -2.5, 0.4, 0.35] }
  };
  function shapeIndex(key) { return key === "contact" || key === "kk" ? 0 : SHAPES[key]; }

  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-shape]"));

  // Scroll position in "section units": 2.4 means 40% of the way from section 2 to 3.
  // Each shape holds steady while its section is centred, then morphs.
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
        t = Math.min(1, Math.max(0, (t - 0.2) / 0.6));
        return i + t * t * (3 - 2 * t);
      }
    }
    return centers.length - 1;
  }

  var pos = scrollTarget();
  var pointer = { x: 0, y: 0, tx: 0, ty: 0, on: 0, ton: 0 };
  var ndc = new THREE.Vector3(), dir = new THREE.Vector3();

  function apply(p) {
    if (!sections.length) return;
    var i = Math.min(sections.length - 1, Math.floor(p));
    var j = Math.min(sections.length - 1, i + 1);
    var t = p - i;
    var a = sections[i].getAttribute("data-shape"), b = sections[j].getAttribute("data-shape");
    uniforms.uFrom.value = shapeIndex(a);
    uniforms.uTo.value = shapeIndex(b);
    uniforms.uT.value = t;

    var la = LAYOUT[a][small ? "m" : "d"], lb = LAYOUT[b][small ? "m" : "d"];
    function mix(k) { return la[k] + (lb[k] - la[k]) * t; }
    group.position.set(mix(0), mix(1), 0);
    group.scale.setScalar(mix(2));
    uniforms.uOpacity.value = mix(3);

    var coreW = (shapeIndex(a) === 0 ? 1 - t : 0) + (shapeIndex(b) === 0 ? t : 0);
    glow.material.opacity = coreW * mix(3);
  }

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    small = w < 760;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (reduceMotion) { apply(scrollTarget()); render(); }
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    pointer.ton = 1;
  }, { passive: true });
  document.addEventListener("pointerleave", function () { pointer.ton = 0; });
  if (reduceMotion) {
    window.addEventListener("scroll", function () { apply(scrollTarget()); render(); }, { passive: true });
  }

  function render() { renderer.render(scene, camera); }

  /* ---------- Animation ---------- */
  var last = performance.now(), rafId = 0, elapsed = 0;

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    uniforms.uTime.value = elapsed;

    // Ease toward the scroll position so jumps (nav links) still morph smoothly.
    pos += (scrollTarget() - pos) * Math.min(1, dt * 4);
    apply(pos);

    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 4);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 4);
    pointer.on += (pointer.ton - pointer.on) * Math.min(1, dt * 3);

    group.rotation.y = pointer.x * 0.22;
    group.rotation.x = -pointer.y * 0.12;

    // Cursor position on the z = 0 plane, for the repel effect.
    ndc.set(pointer.x, pointer.y, 0.5).unproject(camera);
    dir.copy(ndc).sub(camera.position).normalize();
    var dist = -camera.position.z / dir.z;
    uniforms.uMouse.value.set(camera.position.x + dir.x * dist, camera.position.y + dir.y * dist);
    uniforms.uMouseOn.value = pointer.on;

    var dust = scene.userData.dust;
    if (dust) dust.rotation.y = elapsed * 0.01 + pos * 0.08;

    render();
    rafId = requestAnimationFrame(frame);
  }

  resize();
  apply(pos);

  if (reduceMotion) {
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
