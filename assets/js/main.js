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

  /* ---------- Service filters ---------- */
  var chips = document.querySelectorAll(".chip[data-filter]");
  var serviceCards = document.querySelectorAll(".cards .card[data-cat]");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
      serviceCards.forEach(function (card) {
        var show = f === "all" || card.getAttribute("data-cat") === f;
        var wasHidden = card.hidden;
        card.hidden = !show;
        if (show && wasHidden && !reduceMotion) {
          card.classList.remove("is-entering");
          void card.offsetWidth;
          card.classList.add("is-entering");
        }
      });
    });
  });

  /* ---------- Audience buttons preselect the form ---------- */
  document.querySelectorAll("[data-audience]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var select = document.getElementById("cf-type");
      if (select) select.value = btn.getAttribute("data-audience");
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
