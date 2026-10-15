(function () {
  "use strict";

  // Where the contact form posts its JSON. Leave empty until you connect a
  // form backend (Formspree, Basin, a Netlify function, your CRM's webhook...).
  var FORM_ENDPOINT = "";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Sample run log ---------- */
  var RUNS = [
    ["voice_agent", "missed call answered → booked Tue 10:30", "38s"],
    ["speed_to_lead", "Meta lead texted back", "41s"],
    ["chatbot", "Instagram DM → consultation booked", "1m 12s"],
    ["review_request", "5★ review request sent", "2s"],
    ["reactivation", "old lead replied \"yes, still interested\"", "6s"],
    ["google_ads_sync", "new search lead added to pipeline", "3s"],
    ["reminder", "no-show reminder sent via WhatsApp", "1s"],
    ["voice_agent", "after-hours call qualified and routed", "52s"]
  ];
  var log = document.getElementById("runlog");
  var runIndex = 0;
  var clock = new Date();

  function stamp(d) {
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (n) {
      return String(n).padStart(2, "0");
    }).join(":");
  }

  function addRun(fresh) {
    var run = RUNS[runIndex % RUNS.length];
    runIndex++;
    clock = new Date(clock.getTime() + 3000 + Math.random() * 6000);
    var li = document.createElement("li");
    if (fresh) li.className = "fresh";
    li.innerHTML =
      '<span class="log-time"></span><span class="log-msg"><b></b><span></span></span><span class="log-ok"></span>';
    li.querySelector(".log-time").textContent = stamp(clock);
    li.querySelector(".log-msg b").textContent = run[0];
    li.querySelector(".log-msg span").textContent = run[1];
    li.querySelector(".log-ok").textContent = "✓ " + run[2];
    log.prepend(li);
    while (log.children.length > 5) log.lastElementChild.remove();
  }

  if (log) {
    clock = new Date(Date.now() - 40000);
    for (var i = 0; i < 5; i++) addRun(false);
    if (!reduceMotion) setInterval(function () { addRun(true); }, 2600);
  }

  /* ---------- 3D tilt on service cards ---------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".tilt").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.transform = "rotateY(" + (px - 0.5) * 12 + "deg) rotateX(" + (0.5 - py) * 10 + "deg) translateZ(0)";
        card.style.setProperty("--mx", px * 100 + "%");
        card.style.setProperty("--my", py * 100 + "%");
      });
      card.addEventListener("pointerleave", function () {
        card.style.transform = "";
      });
    });
  }

  /* ---------- Missed-lead calculator ---------- */
  var gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
  var num = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

  var roi = {
    leads: document.getElementById("roi-leads"),
    missed: document.getElementById("roi-missed"),
    close: document.getElementById("roi-close"),
    value: document.getElementById("roi-value")
  };

  function fill(input) {
    var pct = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty("--fill", pct + "%");
  }

  function calc() {
    var leads = +roi.leads.value;
    var missed = +roi.missed.value / 100;
    var close = +roi.close.value / 100;
    var value = +roi.value.value;

    var lost = leads * missed;
    var customers = lost * close;

    document.getElementById("roi-leads-out").textContent = num.format(leads);
    document.getElementById("roi-missed-out").textContent = Math.round(missed * 100) + "%";
    document.getElementById("roi-close-out").textContent = Math.round(close * 100) + "%";
    document.getElementById("roi-value-out").textContent = gbp.format(value);

    document.getElementById("roi-lost-leads").textContent = num.format(lost);
    document.getElementById("roi-customers").textContent = num.format(customers) + " / month";
    document.getElementById("roi-revenue").textContent = gbp.format(customers * value * 12);

    Object.keys(roi).forEach(function (k) { fill(roi[k]); });
  }

  if (roi.leads) {
    Object.keys(roi).forEach(function (k) { roi[k].addEventListener("input", calc); });
    document.getElementById("roi-form").addEventListener("submit", function (e) { e.preventDefault(); });
    calc();
  }

  /* ---------- Services: 3D carousel with category filters ---------- */
  var carousel = document.getElementById("carousel");
  var stage = document.getElementById("carousel-stage");
  var ring = document.getElementById("carousel-ring");
  var serviceCards = Array.prototype.slice.call(document.querySelectorAll(".cards .card[data-cat]"));
  var chips = document.querySelectorAll(".chip[data-filter]");
  var countEl = document.getElementById("car-count");
  var STEP = 360 / serviceCards.length;
  if (carousel) carousel.style.setProperty("--card-step", STEP + "deg");
  var wide = window.matchMedia("(min-width: 900px)");
  var car = { angle: 0, target: 0, dragging: false, startX: 0, startAngle: 0, lastInput: 0, hover: false, raf: 0 };
  var activeFilter = "all";

  function is3d() { return carousel && carousel.classList.contains("is-3d"); }
  function frontIndex() {
    var n = serviceCards.length;
    return ((Math.round(-car.target / STEP) % n) + n) % n;
  }
  function goTo(i) {
    // Shortest rotation to bring card i to the front
    var cur = car.target, want = -i * STEP;
    var diff = ((want - cur) % 360 + 540) % 360 - 180;
    car.target = cur + diff;
    car.lastInput = performance.now();
    kick();
  }
  function step(dir) { car.target -= dir * STEP; car.lastInput = performance.now(); kick(); }

  function paint() {
    ring.style.setProperty("--angle", car.angle + "deg");
    var front = frontIndex();
    serviceCards.forEach(function (card, i) {
      var rel = ((i * STEP + car.angle) % 360 + 540) % 360 - 180;
      var facing = Math.cos(rel * Math.PI / 180);
      card.style.opacity = String(Math.max(0, 0.15 + 0.85 * Math.pow(Math.max(0, facing), 1.4)));
      card.style.pointerEvents = facing > 0.6 ? "auto" : "none";
      card.classList.toggle("is-front", i === front);
      card.setAttribute("aria-hidden", facing > 0.6 ? "false" : "true");
    });
    if (countEl) {
      var title = serviceCards[front].querySelector("h3").textContent;
      countEl.textContent = String(front + 1).padStart(2, "0") + " / " + String(serviceCards.length).padStart(2, "0") + " · " + title;
    }
  }

  function tick() {
    car.raf = 0;
    if (!is3d()) return;
    var now = performance.now();
    if (!car.dragging && !car.hover && !reduceMotion && now - car.lastInput > 4500) {
      car.target -= STEP;
      car.lastInput = now;
    }
    var k = reduceMotion ? 1 : 0.12;
    if (!car.dragging) car.angle += (car.target - car.angle) * k;
    paint();
    if (!reduceMotion || Math.abs(car.target - car.angle) > 0.05 || car.dragging) car.raf = requestAnimationFrame(tick);
  }
  function kick() { if (!car.raf && is3d()) car.raf = requestAnimationFrame(tick); }

  function setMode() {
    if (!carousel) return;
    var on = wide.matches;
    carousel.classList.toggle("is-3d", on);
    serviceCards.forEach(function (card) {
      card.style.opacity = "";
      card.style.pointerEvents = "";
      card.removeAttribute("aria-hidden");
      card.classList.remove("is-front");
      card.hidden = !on && activeFilter !== "all" && card.getAttribute("data-cat") !== activeFilter;
      card.classList.toggle("is-dim", on && activeFilter !== "all" && card.getAttribute("data-cat") !== activeFilter);
    });
    if (on) { car.lastInput = performance.now(); paint(); kick(); }
  }

  if (carousel && ring) {
    car.lastInput = performance.now();
    if (wide.addEventListener) wide.addEventListener("change", setMode); else wide.addListener(setMode);
    setMode();

    document.getElementById("car-prev").addEventListener("click", function () { step(-1); });
    document.getElementById("car-next").addEventListener("click", function () { step(1); });

    carousel.addEventListener("mouseenter", function () { car.hover = true; });
    carousel.addEventListener("mouseleave", function () { car.hover = false; car.lastInput = performance.now(); });
    carousel.addEventListener("keydown", function (e) {
      if (!is3d()) return;
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); serviceCards[frontIndex()].focus({ preventScroll: true }); }
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); serviceCards[frontIndex()].focus({ preventScroll: true }); }
    });
    serviceCards.forEach(function (card, i) {
      card.addEventListener("focus", function () { if (is3d() && frontIndex() !== i) goTo(i); });
    });

    stage.addEventListener("pointerdown", function (e) {
      if (!is3d() || e.button !== 0) return;
      car.dragging = true;
      car.startX = e.clientX;
      car.startAngle = car.angle;
      stage.classList.add("is-dragging");
      stage.setPointerCapture(e.pointerId);
      kick();
    });
    stage.addEventListener("pointermove", function (e) {
      if (!car.dragging) return;
      car.angle = car.startAngle + (e.clientX - car.startX) * 0.3;
    });
    function endDrag() {
      if (!car.dragging) return;
      car.dragging = false;
      stage.classList.remove("is-dragging");
      car.target = Math.round(car.angle / STEP) * STEP;
      car.lastInput = performance.now();
      kick();
    }
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      activeFilter = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
      setMode();
      if (is3d() && activeFilter !== "all") {
        for (var i = 0; i < serviceCards.length; i++) {
          if (serviceCards[i].getAttribute("data-cat") === activeFilter) { goTo(i); break; }
        }
      }
    });
  });

  /* ---------- Scroll progress ---------- */
  var bar = document.getElementById("progress-bar");
  if (bar) {
    var onScroll = function () {
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      bar.style.transform = "scaleX(" + Math.min(1, window.scrollY / max) + ")";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Cursor glow ---------- */
  var cursor = document.getElementById("cursor");
  if (cursor && finePointer && !reduceMotion) {
    var cx = 0, cy = 0, tx = 0, ty = 0, moving = false;
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX; ty = e.clientY;
      if (!moving) { cx = tx; cy = ty; moving = true; cursor.classList.add("is-on"); requestAnimationFrame(follow); }
      var hot = e.target.closest && e.target.closest("a, button, .card, summary, input, select, textarea, .carousel-stage");
      cursor.classList.toggle("is-hover", !!hot);
    }, { passive: true });
    document.addEventListener("pointerleave", function () { cursor.classList.remove("is-on"); });
    function follow() {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      cursor.style.transform = "translate(" + cx + "px," + cy + "px)";
      requestAnimationFrame(follow);
    }
  } else if (cursor) {
    cursor.remove();
  }

  /* ---------- Remember the chosen service and prefill the form ---------- */
  function store(k, v) { try { localStorage.setItem(k, v); } catch (err) { /* ignore */ } }
  function read(k) { try { return localStorage.getItem(k); } catch (err) { return null; } }

  document.querySelectorAll("[data-pick]").forEach(function (a) {
    a.addEventListener("click", function () { store("omni-service", a.getAttribute("data-pick")); });
  });

  /* ---------- Pricing: business / agency tabs ---------- */
  var priceTabs = document.querySelectorAll(".chip[data-price-tab]");
  function showPrices(audience) {
    priceTabs.forEach(function (t) { t.setAttribute("aria-pressed", String(t.getAttribute("data-price-tab") === audience)); });
    document.querySelectorAll(".price-card").forEach(function (c) { c.hidden = c.getAttribute("data-audience") !== audience; });
  }
  priceTabs.forEach(function (t) {
    t.addEventListener("click", function () { showPrices(t.getAttribute("data-price-tab")); });
  });
  if (priceTabs.length) showPrices("business");
  window.OmniPrices = showPrices;

  window.OmniPrefill = function () {
    var slug = read("omni-service");
    var list = window.OMNI_SERVICES || [];
    var s = list.filter(function (x) { return x.slug === slug; })[0];
    if (!s) return;
    var service = document.getElementById("cf-service");
    var type = document.getElementById("cf-type");
    if (service) {
      for (var i = 0; i < service.options.length; i++) {
        if (service.options[i].text === s.name) { service.selectedIndex = i; break; }
      }
    }
    if (type && s.audience === "agency") type.value = "Agency";
  };
  window.OmniPrefill();

  /* ---------- Audience buttons preselect the form ---------- */
  document.querySelectorAll("[data-audience]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var select = document.getElementById("cf-type");
      if (select) select.value = btn.getAttribute("data-audience");
      var service = document.getElementById("cf-service");
      if (service && btn.getAttribute("data-service")) service.value = btn.getAttribute("data-service");
    });
  });

  /* ---------- Copy email ---------- */
  var copyBtn = document.getElementById("copy-email");
  var emailEl = document.getElementById("contact-email");
  if (copyBtn && emailEl) {
    copyBtn.addEventListener("click", function () {
      var text = emailEl.textContent.trim();
      function selectFallback() {
        var range = document.createRange();
        range.selectNodeContents(emailEl);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        copyBtn.textContent = "Selected";
      }
      try {
        navigator.clipboard.writeText(text).then(function () {
          copyBtn.textContent = "Copied";
        }, selectFallback);
      } catch (err) {
        selectFallback();
      }
      setTimeout(function () { copyBtn.textContent = "Copy"; }, 2000);
    });
  }

  /* ---------- Contact form ---------- */
  var form = document.getElementById("contact-form");
  var status = document.getElementById("form-status");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status";

      var name = form.elements.name;
      var email = form.elements.email;
      var bad = null;
      [name, email].forEach(function (f) { f.removeAttribute("aria-invalid"); });
      if (!name.value.trim()) bad = name;
      else if (!email.value.trim() || !email.checkValidity()) bad = email;
      if (bad) {
        bad.setAttribute("aria-invalid", "true");
        bad.focus();
        status.textContent = bad === name ? "Add your name so we know who to reply to." : "Enter a work email we can reply to, like you@company.com.";
        return;
      }

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });

      if (!FORM_ENDPOINT) {
        status.textContent = "This form isn't connected yet. Email us at " + emailEl.textContent.trim() + " instead.";
        return;
      }

      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      status.textContent = "Sending…";
      fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error(res.status);
        form.reset();
        status.className = "form-status ok";
        status.textContent = "Thanks, " + data.name.split(" ")[0] + ". We'll reply within one working day.";
      }).catch(function () {
        status.textContent = "That didn't send. Check your connection and try again, or email us directly.";
      }).finally(function () {
        btn.disabled = false;
      });
    });
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
