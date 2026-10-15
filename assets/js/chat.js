/*
 * Omni chat: the 3D agent greets visitors, asks a couple of questions,
 * recommends services and opens the detail page for the one they pick.
 *
 * Scripted conversation (no AI backend needed). Uses window.OMNI_SERVICES
 * (assets/js/services-data.js) and window.OmniAgent (assets/js/scene.js).
 * Optional voice uses the browser's built-in speech synthesis.
 */
(function () {
  "use strict";

  var SERVICES = window.OMNI_SERVICES || [];
  if (!SERVICES.length) return;
  var bySlug = {};
  SERVICES.forEach(function (s) { bySlug[s.slug] = s; });

  var page = document.body.getAttribute("data-page") || "home";
  var pageService = bySlug[document.body.getAttribute("data-service")] || null;
  var base = page === "service" ? "../" : "";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CATS = [["ai", "AI agents"], ["growth", "Ads and funnels"], ["crm", "CRM and automation"], ["agency", "For agencies"]];

  /* ---------- Storage (may be unavailable) ---------- */
  function get(store, k) { try { return window[store].getItem(k); } catch (err) { return null; } }
  function put(store, k, v) { try { window[store].setItem(k, v); } catch (err) { /* ignore */ } }

  /* ---------- DOM ---------- */
  var panel = document.createElement("section");
  panel.className = "omni-chat";
  panel.id = "omni-chat";
  panel.setAttribute("aria-label", "Chat with Omni, our website helper");
  panel.hidden = true;
  panel.innerHTML =
    '<header class="oc-head">' +
      '<span class="oc-avatar" aria-hidden="true"><i></i><i></i></span>' +
      '<div class="oc-who"><p class="oc-name">Omni</p><p class="oc-status">Website helper · online</p></div>' +
      '<button type="button" class="oc-icon" id="oc-voice" aria-pressed="false" title="Turn voice on">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L13 19V5L7.5 9.5z"/><path class="oc-wave" d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/><path class="oc-mute" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>' +
        '<span class="visually-hidden">Voice</span>' +
      '</button>' +
      '<button type="button" class="oc-icon" id="oc-close" title="Close chat">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '<span class="visually-hidden">Close chat</span>' +
      '</button>' +
    '</header>' +
    '<div class="oc-log" id="oc-log" role="log" aria-live="polite"></div>' +
    '<div class="oc-choices" id="oc-choices"></div>';
  document.body.appendChild(panel);

  var launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "omni-launch omni-launch-sr";
  launcher.id = "omni-launch";
  launcher.innerHTML = '<span class="oc-avatar" aria-hidden="true"><i></i><i></i></span><span>Talk to Omni</span>';
  launcher.hidden = true;
  document.body.appendChild(launcher);

  var log = panel.querySelector("#oc-log");
  var choicesEl = panel.querySelector("#oc-choices");
  var voiceBtn = panel.querySelector("#oc-voice");
  var closeBtn = panel.querySelector("#oc-close");

  /* ---------- Voice ---------- */
  var synth = window.speechSynthesis;
  var voiceOn = get("localStorage", "omni-voice") === "on";
  var voice = null;
  function pickVoice() {
    if (!synth) return;
    var list = synth.getVoices() || [];
    voice = list.filter(function (v) { return /en-GB/i.test(v.lang); })[0] ||
            list.filter(function (v) { return /^en/i.test(v.lang); })[0] || null;
  }
  if (synth) {
    pickVoice();
    if ("onvoiceschanged" in synth) synth.onvoiceschanged = pickVoice;
  } else {
    voiceBtn.hidden = true;
  }
  function setVoice(on) {
    voiceOn = on && !!synth;
    voiceBtn.setAttribute("aria-pressed", String(voiceOn));
    voiceBtn.title = voiceOn ? "Turn voice off" : "Turn voice on";
    put("localStorage", "omni-voice", voiceOn ? "on" : "off");
    if (!voiceOn && synth) { try { synth.cancel(); } catch (err) { /* ignore */ } }
  }
  setVoice(voiceOn);
  voiceBtn.addEventListener("click", function () { setVoice(!voiceOn); });

  function speak(text) {
    var agent = window.OmniAgent;
    if (!voiceOn || !synth) {
      if (agent) agent.talk(Math.min(4, text.length * 0.035 + 0.4));
      return;
    }
    try {
      var u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.rate = 1.03;
      u.pitch = 1.1;
      u.onstart = function () { if (agent) agent.talk(60); };
      u.onend = u.onerror = function () { if (agent) agent.talk(0); };
      synth.speak(u);
    } catch (err) {
      if (agent) agent.talk(2);
    }
  }

  /* ---------- Messages ---------- */
  var queue = Promise.resolve();
  var runId = 0;

  function scrollLog() { log.scrollTop = log.scrollHeight; }

  function bot(text) {
    var id = runId;
    queue = queue.then(function () {
      if (id !== runId) return;
      var typing = document.createElement("p");
      typing.className = "oc-msg oc-bot oc-typing";
      typing.innerHTML = "<span></span><span></span><span></span>";
      typing.setAttribute("aria-hidden", "true");
      log.appendChild(typing);
      scrollLog();
      return new Promise(function (resolve) {
        setTimeout(function () {
          typing.remove();
          if (id !== runId) return resolve();
          var p = document.createElement("p");
          p.className = "oc-msg oc-bot";
          p.textContent = text;
          log.appendChild(p);
          scrollLog();
          speak(text);
          resolve();
        }, reduceMotion ? 0 : Math.min(1100, 350 + text.length * 9));
      });
    });
    return queue;
  }

  function user(text) {
    var p = document.createElement("p");
    p.className = "oc-msg oc-user";
    p.textContent = text;
    log.appendChild(p);
    scrollLog();
  }

  function choices(list, opts) {
    var id = runId;
    if (trail.length > 1) list = list.concat([{ label: "← Back", say: "Back", run: back, back: true }]);
    choicesEl.innerHTML = "";
    queue = queue.then(function () {
      if (id !== runId) return;
      choicesEl.innerHTML = "";
      choicesEl.className = "oc-choices" + (opts && opts.grid ? " is-grid" : "");
      list.forEach(function (c) {
        if (c.heading) {
          var h = document.createElement("p");
          h.className = "oc-group";
          h.textContent = c.heading;
          choicesEl.appendChild(h);
          return;
        }
        var b = document.createElement("button");
        b.type = "button";
        b.className = "oc-choice" + (c.primary ? " is-primary" : "") + (c.back ? " is-back" : "");
        b.textContent = c.label;
        b.addEventListener("click", function () {
          choicesEl.innerHTML = "";
          if (!c.silent) user(c.say || c.label);
          c.run();
        });
        choicesEl.appendChild(b);
      });
      scrollLog();
    });
  }

  /* ---------- Navigation ---------- */
  function servicePage(slug) { return base + "services/" + slug + ".html"; }

  function openService(slug) {
    var s = bySlug[slug];
    put("localStorage", "omni-service", slug);
    put("sessionStorage", "omni-from-chat", slug);
    bot("Great choice. Opening " + s.name + " for you now.").then(function () {
      if (window.OmniAgent) window.OmniAgent.wave();
      setTimeout(function () { window.location.href = servicePage(slug); }, reduceMotion ? 200 : 1200);
    });
  }

  function bookCall(slug) {
    if (slug) put("localStorage", "omni-service", slug);
    bot("Perfect. I'll take you to the booking form.").then(function () {
      setTimeout(function () {
        if (page === "home") {
          close();
          var form = document.getElementById("contact");
          if (window.OmniPrefill) window.OmniPrefill();
          if (form) form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
        } else {
          window.location.href = base + "index.html#contact";
        }
      }, 500);
    });
  }

  /* ---------- Conversation ---------- */
  // Each step re-asks its own question, so "Back" just replays the previous step.
  var trail = [];
  function go(step) { trail.push(step); step(); }
  function back() {
    if (trail.length > 1) trail.pop();
    trail[trail.length - 1]();
  }

  function startHome() {
    bot("Hi, I'm Omni, the helper for this website.");
    bot("I can show you everything Omni AI Builders automates. Which describes you best?");
    choices([
      { label: "I run a local business", run: function () { go(forBusiness); }, primary: true },
      { label: "I run an agency", run: function () { go(forAgency); }, primary: true },
      { label: "Show me all services", run: function () { go(showAll); } },
      { label: "Just looking around", run: browse }
    ]);
  }

  function painChoices(audience) {
    var seen = {}, list = [];
    SERVICES.forEach(function (s) {
      if (s.audience !== audience || seen[s.chatPain]) return;
      seen[s.chatPain] = true;
      list.push({ label: s.chatPain, run: function () { go(function () { recommend(s.chatPain); }); } });
    });
    list.push({ label: "Show me all services", run: function () { go(showAll); } });
    return list;
  }

  function forBusiness() {
    bot("Nice. What's costing you the most right now?");
    choices(painChoices("business"));
  }

  function forAgency() {
    bot("Great. We help agencies deliver AI and automation under their own brand.");
    bot("What would you like to offer your clients?");
    choices(painChoices("agency"));
  }

  function recommend(pain) {
    var recs = SERVICES.filter(function (s) { return s.chatPain === pain; });
    if (recs.length === 1) {
      bot("Then I'd start with " + recs[0].name + ".");
      bot(recs[0].short);
    } else {
      bot("Two good options there. " + recs.map(function (r) { return r.name; }).join(" or ") + ".");
      recs.forEach(function (r) { bot(r.name + ": " + r.short); });
    }
    var list = recs.map(function (r) {
      return { label: "Show me " + r.name + " →", say: "Show me " + r.name, run: function () { openService(r.slug); }, primary: true };
    });
    list.push({ label: "Show me all services", run: function () { go(showAll); } });
    choices(list);
  }

  function showAll() {
    bot("Here's everything we do. Pick one and I'll open the details.");
    var list = [];
    CATS.forEach(function (c) {
      list.push({ heading: c[1] });
      SERVICES.filter(function (s) { return s.cat === c[0]; }).forEach(function (s) {
        list.push({ label: s.name, say: "Show me " + s.name, run: function () { openService(s.slug); } });
      });
    });
    choices(list, { grid: true });
  }

  function browse() {
    bot("No problem. I'll be in the corner if you need me.").then(function () {
      setTimeout(close, 1400);
    });
  }

  function startService(s, fromChat) {
    if (fromChat) {
      bot("Here it is: " + s.name + ".");
      bot("Scroll down to see what's included and how it works. I'll walk along with you.");
    } else {
      bot("Hi, I'm Omni, the helper for this website. This page is all about " + s.name + ".");
      bot(s.short);
    }
    choices([
      { label: "Book a call about this", run: function () { bookCall(s.slug); }, primary: true },
      { label: "Show me other services", run: function () { go(showAll); } },
      { label: "Back to the home page", run: function () { window.location.href = base + "index.html"; } }
    ]);
  }

  /* ---------- Open, close, dock ---------- */
  var started = false;

  // An automatic greeting stays up for 5 seconds after it finishes typing, then
  // tucks away. Hovering, tapping or focusing the chat keeps it open.
  var AUTO_HIDE_MS = 5000, autoHideTimer = 0, engaged = false;
  function engage() { engaged = true; clearTimeout(autoHideTimer); }
  ["pointerenter", "pointerdown", "focusin"].forEach(function (ev) { panel.addEventListener(ev, engage); });

  function open(byUser) {
    // The automatic greeting must not take over a chat the visitor already opened.
    if (!byUser && panel.classList.contains("is-open")) return;
    engaged = !!byUser;
    clearTimeout(autoHideTimer);
    panel.hidden = false;
    launcher.hidden = true;
    requestAnimationFrame(function () { panel.classList.add("is-open"); });
    if (window.OmniAgent) window.OmniAgent.dock(function () { return panel.getBoundingClientRect(); });
    if (!started) {
      started = true;
      var from = get("sessionStorage", "omni-from-chat");
      if (page === "service" && pageService) {
        var fromChat = from === pageService.slug;
        go(function () { startService(pageService, fromChat); });
        fromChat = false; // going back to this step later shouldn't repeat "Here it is"
      } else {
        go(startHome);
      }
    }
    if (byUser) {
      queue.then(function () {
        var first = choicesEl.querySelector("button");
        (first || closeBtn).focus({ preventScroll: true });
      });
    } else {
      queue.then(function () {
        autoHideTimer = setTimeout(function () { if (!engaged) close(); }, AUTO_HIDE_MS);
      });
    }
  }

  function close() {
    clearTimeout(autoHideTimer);
    panel.classList.remove("is-open");
    if (synth) { try { synth.cancel(); } catch (err) { /* ignore */ } }
    if (window.OmniAgent) { window.OmniAgent.undock(); window.OmniAgent.talk(0); }
    setTimeout(function () { panel.hidden = true; launcher.hidden = false; }, reduceMotion ? 0 : 250);
  }

  launcher.addEventListener("click", function () { open(true); });
  closeBtn.addEventListener("click", function () { close(); launcher.focus({ preventScroll: true }); });
  panel.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { close(); launcher.focus({ preventScroll: true }); }
  });

  // Open the chat straight at the business or agency question (hero buttons).
  function openAt(route) {
    var agency = route === "agency";
    if (!started) {
      started = true;
      trail.push(startHome); // so "Back" returns to the opening question
      bot("Hi, I'm Omni, the helper for this website.");
    }
    open(true);
    user(agency ? "I run an agency" : "I run a local business");
    go(agency ? forAgency : forBusiness);
  }

  document.querySelectorAll("[data-omni-route]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      openAt(el.getAttribute("data-omni-route"));
    });
  });

  window.OmniChat = { open: open, close: close, openAt: openAt };

  // Greet automatically: once per visit on the home page, and on a service
  // page reached by choosing it in the chat.
  var greeted = get("sessionStorage", "omni-greeted");
  var cameFromChat = page === "service" && pageService && get("sessionStorage", "omni-from-chat") === pageService.slug;
  if ((page === "home" && !greeted) || cameFromChat) {
    put("sessionStorage", "omni-greeted", "1");
    setTimeout(function () { open(false); }, reduceMotion ? 300 : 1500);
    if (cameFromChat) setTimeout(function () { put("sessionStorage", "omni-from-chat", ""); }, 2000);
  } else {
    launcher.hidden = false;
  }
})();
