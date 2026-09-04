/* Scoop Runner — single-file classic script so the preview never waits on Vite modules. */
(function () {
  "use strict";
  var canvas = document.getElementById("stage");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var VIEW_H = 720;
  var GRAVITY = 2650, JUMP_V = -980, DJUMP_V = -840, MAX_FALL = 1400;
  var SLIDE_T = 0.46, COYOTE = 0.09, BUFFER = 0.13;
  var BASE_SPD = 330, MAX_SPD = 760, SPD_PER = 52, PX_M = 38;
  var SEASON_M = 520, STEP = 1 / 60;
  var SEASONS = ["sunny", "rainy", "autumn", "spring"];
  var SLABEL = { sunny: "Sunny Edition", rainy: "Rain Desk", autumn: "Autumn Extra", spring: "Spring City" };
  var PAL = {
    sunny: { sky0: "#9eb6d4", sky1: "#e8d7b0", farSil: "#4a5a70", midSil: "#243044", window: "#ffe08a", street: "#2a2622", sidewalk: "#7a7264", fog: "rgba(20,24,32,0.12)", sun: "#ffe08a" },
    rainy: { sky0: "#5a6a7a", sky1: "#2e3844", farSil: "#1c2832", midSil: "#121820", window: "#8fd0e6", street: "#1a2026", sidewalk: "#3a4550", fog: "rgba(20,30,40,0.28)", sun: null },
    autumn: { sky0: "#e0b888", sky1: "#c48a58", farSil: "#5a4034", midSil: "#2a1c16", window: "#ffd080", street: "#261e18", sidewalk: "#8a7058", fog: "rgba(40,24,16,0.16)", sun: "#ffb35a" },
    spring: { sky0: "#b8d4c8", sky1: "#dce8d4", farSil: "#4a5e54", midSil: "#243830", window: "#fff4c4", street: "#262820", sidewalk: "#7a846c", fog: "rgba(20,32,28,0.12)", sun: "#fff3b0" },
  };

  var imgs = { run: [null,null,null,null,null,null], jump: [null,null,null,null], slide: [null,null,null,null], throw: [null,null,null,null], paper: [null,null,null,null], scoop: null, breaking: null, pass: null, camera: null, van: null, protestor: null, paparazzi: null, scaffolding: null, fakeNews: null, crowd: null, jetpack: null, politician: null, celebrity: null, mobster: null, lawyer: null, athlete: null, sky: {} };

  var ASSET_BASE = "";
  (function () {
    try {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        var src = scripts[i].getAttribute("src") || scripts[i].src || "";
        if (src.indexOf("scoop-game") !== -1) {
          ASSET_BASE = src.replace(/[^/]*$/, "");
          break;
        }
      }
    } catch (e) {}
  })();
  function asset(p) {
    return ASSET_BASE + String(p).replace(/^\//, "");
  }

  function loadImg(src) {
    return new Promise(function (resolve) {
      var im = new Image();
      var t = setTimeout(function () { resolve(null); }, 5000);
      im.onload = function () { clearTimeout(t); resolve(im); };
      im.onerror = function () { clearTimeout(t); resolve(null); };
      im.src = src;
    });
  }
  function loadAll() {
    var jobs = [];
    function slot(arr, i, src) {
      jobs.push(loadImg(src).then(function (im) { if (im) arr[i] = im; }));
    }
    function one(key, src) {
      jobs.push(loadImg(src).then(function (im) { if (im) imgs[key] = im; }));
    }
    [1,2,3,4,5,6].forEach(function (i) { slot(imgs.run, i - 1, asset("sprites/run-" + i + ".png")); });
    [1,2,3,4].forEach(function (i) { slot(imgs.jump, i - 1, asset("sprites/jump-" + i + ".png")); });
    [1,2,3,4].forEach(function (i) { slot(imgs.slide, i - 1, asset("sprites/slide-" + i + ".png")); });
    [1,2,3,4].forEach(function (i) { slot(imgs.throw, i - 1, asset("sprites/throw-" + i + ".png")); });
    [1,2,3,4].forEach(function (i) { slot(imgs.paper, i - 1, asset("sprites/paper-" + i + ".png")); });
    one("scoop", asset("sprites/scoop.png")); one("breaking", asset("sprites/breaking.png")); one("pass", asset("sprites/press-pass.png"));
    one("camera", asset("sprites/camera.png")); one("van", asset("sprites/van.png")); one("protestor", asset("sprites/protestor.png"));
    one("paparazzi", asset("sprites/paparazzi.png")); one("scaffolding", asset("sprites/scaffolding.png")); one("fakeNews", asset("sprites/fake-news.png"));
    one("crowd", asset("sprites/crowd.png")); one("jetpack", asset("sprites/jetpack.png"));
    one("politician", asset("sprites/politician.png")); one("celebrity", asset("sprites/celebrity.png"));
    one("mobster", asset("sprites/mobster.png")); one("lawyer", asset("sprites/lawyer.png")); one("athlete", asset("sprites/athlete.png"));
    SEASONS.forEach(function (id) {
      jobs.push(loadImg(asset("bg/" + id + "-sky.jpg")).then(function (im) { imgs.sky[id] = im; }));
    });
    return Promise.all(jobs);
  }

  var audio = { ctx: null, muted: false, master: null };
  function unlockAudio() {
    try {
      if (!audio.ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        audio.ctx = new AC();
        audio.master = audio.ctx.createGain();
        audio.master.connect(audio.ctx.destination);
        audio.master.gain.value = audio.muted ? 0 : 1;
      }
      if (audio.ctx.state === "suspended") audio.ctx.resume();
    } catch (e) {}
  }
  function beep(freq, dur, type, peak) {
    if (!audio.ctx || audio.muted) return;
    var o = audio.ctx.createOscillator();
    var g = audio.ctx.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, audio.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(peak || 0.08, audio.ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.ctx.currentTime + dur);
    o.connect(g); g.connect(audio.master);
    o.start(); o.stop(audio.ctx.currentTime + dur);
  }

  function haptic(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms || 18); } catch (e) {}
  }

  var keys = {};
  var pointerJump = false, pointerSlide = false, pointerThrow = false, pointerJet = false;
  window.addEventListener("keydown", function (e) {
    keys[e.code] = true;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW" || e.code === "ArrowDown" || e.code === "KeyS" || e.code === "KeyF" || e.code === "KeyJ" || e.code === "KeyE" || e.code === "KeyG" || e.code === "KeyQ") e.preventDefault();
    if (!e.repeat && (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW" || e.code === "ArrowDown" || e.code === "KeyS" || e.code === "KeyF" || e.code === "KeyJ" || e.code === "KeyE" || e.code === "KeyG")) haptic(16);
    if ((e.code === "Escape" || e.code === "KeyP") && state === "play") togglePause();
  });
  window.addEventListener("keyup", function (e) { keys[e.code] = false; });
  canvas.addEventListener("pointerdown", function (e) {
    if (state !== "play") return;
    var r = canvas.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width;
    if (x < 0.5) { pointerThrow = true; haptic(18); }
    else { pointerJump = true; haptic(18); }
  });
  window.addEventListener("pointerup", function () { pointerJump = false; pointerSlide = false; pointerThrow = false; pointerJet = false; });
  window.addEventListener("pointercancel", function () { pointerJump = false; pointerSlide = false; pointerThrow = false; pointerJet = false; });

  var G = {
    scroll: 0, speed: BASE_SPD, score: 0, stories: 0, combo: 0, comboT: 0, multT: 0,
    deadline: 0, frontT: 0, invT: 0, slowT: 0, dead: false, deadT: 0,
    vy: 0, py: 0, onGround: true, jumps: 2, slideT: 0, coyote: 0, jumpBuf: 0,
    animT: 0, lastSpawn: 0, nextGap: 420, spawnI: 0, trauma: 0, flash: 0,
    ents: [], parts: [], pops: [], paused: false, idle: true,
    papers: 3, throwCd: 0, throwT: 0, throwBuf: 0, flyT: 0, jetReady: false,
  };
  for (var i = 0; i < 72; i++) G.ents.push({ a: false });
  for (var j = 0; j < 160; j++) G.parts.push({ a: false });

  var viewW = 1280, ground = VIEW_H * 0.78, playerX = 240, dpr = 1;
  var acc = 0, last = 0, raf = 0, running = false;
  var state = "title";
  var lastResult = null;
  var country = window.__scoopCountry || "UN";
  var best = 0, career = 0, playerName = "";
  try {
    best = Number(localStorage.getItem("scoop-runner-best") || 0) || 0;
    career = Number(localStorage.getItem("scoop-runner-stories") || 0) || 0;
    playerName = localStorage.getItem("scoop-runner-byline") || "";
    if (localStorage.getItem("scoop-runner-muted") === "1") audio.muted = true;
    if (localStorage.getItem("scoop-runner-record") === "1" && $("chk-record")) $("chk-record").checked = true;
  } catch (e) {}

  function $(id) { return document.getElementById(id); }
  function show(id, on) { var el = $(id); if (el) el.hidden = !on; }
  function fmt(n) { return Number(n).toLocaleString("en-US"); }

  var tape = { rec: null, chunks: [], mime: "", url: "", blob: null, stream: null, want: false };
  function wantsRecord() {
    var box = $("chk-record");
    return !!(box && box.checked);
  }
  function pickMime() {
    if (typeof MediaRecorder === "undefined") return "";
    var types = ["video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    for (var i = 0; i < types.length; i++) {
      try { if (MediaRecorder.isTypeSupported(types[i])) return types[i]; } catch (e) {}
    }
    return "";
  }
  function saveTapeIdb(blob, mime) {
    try {
      var req = indexedDB.open("scoop-runner", 1);
      req.onupgradeneeded = function () { req.result.createObjectStore("tapes"); };
      req.onsuccess = function () {
        var db = req.result;
        var tx = db.transaction("tapes", "readwrite");
        tx.objectStore("tapes").put({ blob: blob, mime: mime, at: Date.now() }, "latest");
      };
    } catch (e) {}
  }
  function setRecPill(on) {
    var el = $("rec-pill");
    if (el) el.hidden = !on;
  }
  function startTape() {
    tape.want = wantsRecord();
    try { localStorage.setItem("scoop-runner-record", tape.want ? "1" : "0"); } catch (e) {}
    stopTape(null, true);
    if (!tape.want) { setRecPill(false); return; }
    if (!canvas.captureStream || typeof MediaRecorder === "undefined") {
      setRecPill(false);
      return;
    }
    try {
      resize();
      tape.mime = pickMime();
      tape.chunks = [];
      tape.blob = null;
      if (tape.url) { try { URL.revokeObjectURL(tape.url); } catch (e) {} tape.url = ""; }
      tape.stream = canvas.captureStream(24);
      if (audio.ctx && audio.master && audio.ctx.createMediaStreamDestination) {
        try {
          var dest = audio.ctx.createMediaStreamDestination();
          audio.master.connect(dest);
          dest.stream.getAudioTracks().forEach(function (t) { tape.stream.addTrack(t); });
        } catch (e) {}
      }
      var opts = tape.mime ? { mimeType: tape.mime, videoBitsPerSecond: 1800000 } : { videoBitsPerSecond: 1800000 };
      tape.rec = tape.mime ? new MediaRecorder(tape.stream, opts) : new MediaRecorder(tape.stream);
      tape.mime = tape.rec.mimeType || tape.mime || "video/webm";
      tape.rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) tape.chunks.push(ev.data); };
      tape.rec.start(1000);
      setRecPill(true);
    } catch (err) {
      tape.rec = null;
      setRecPill(false);
    }
  }
  function stopTape(done, silent) {
    setRecPill(false);
    var rec = tape.rec;
    tape.rec = null;
    if (!rec || rec.state === "inactive") {
      if (tape.stream) {
        try { tape.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
        tape.stream = null;
      }
      if (done) done(!silent && !!tape.blob);
      return;
    }
    var settled = false;
    function finish(ok) {
      if (settled) return;
      settled = true;
      if (tape.stream) {
        try { tape.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
        tape.stream = null;
      }
      if (done) done(!silent && ok);
    }
    rec.onstop = function () {
      try {
        if (tape.chunks.length) {
          tape.blob = new Blob(tape.chunks, { type: tape.mime || "video/webm" });
          tape.url = URL.createObjectURL(tape.blob);
          if (!silent) saveTapeIdb(tape.blob, tape.mime);
        }
      } catch (e) {}
      finish(!!tape.blob);
    };
    try { rec.stop(); } catch (e) { finish(!!tape.blob); }
    setTimeout(function () { finish(!!tape.blob); }, 1500);
  }
  function openTape() {
    if (!tape.blob || !tape.url) return;
    var vid = $("tape-video");
    if (vid) {
      vid.src = tape.url;
      vid.load();
    }
    var save = $("btn-save-tape");
    if (save) {
      save.href = tape.url;
      var ext = (tape.mime || "").indexOf("mp4") >= 0 ? "mp4" : "webm";
      save.setAttribute("download", "scoop-runner." + ext);
    }
    show("screen-replay", false);
    show("screen-tape", true);
  }

  function resize() {
    var w = Math.max(320, canvas.parentElement.clientWidth);
    var h = Math.max(240, canvas.parentElement.clientHeight);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    viewW = (w / h) * VIEW_H;
    ground = VIEW_H * 0.78;
    playerX = viewW * 0.2;
    ctx.setTransform(dpr * (w / viewW), 0, 0, dpr * (h / VIEW_H), 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  function hash(n) {
    var x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
    x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function seasonProg() { return (G.scroll / PX_M / SEASON_M) % 4; }
  function seasonId() { return SEASONS[Math.floor(seasonProg()) % 4]; }
  function nextSeason() { return SEASONS[(Math.floor(seasonProg()) + 1) % 4]; }
  function seasonBlend() {
    var frac = seasonProg() % 1;
    var remain = (1 - frac) * SEASON_M;
    return remain > 3.2 ? 0 : 1 - remain / 3.2;
  }
  function displayMult() {
    return (1 + Math.floor(G.combo / 5) * 0.5) * (G.multT > 0 ? 2 : 1) * (G.frontT > 0 ? 2 : 1);
  }

  function resetRun(playing) {
    G.scroll = 0; G.speed = BASE_SPD; G.score = 0; G.stories = 0; G.combo = 0; G.comboT = 0; G.multT = 0;
    G.deadline = 0; G.frontT = 0; G.invT = 0; G.slowT = 0; G.dead = false; G.deadT = 0;
    G.vy = 0; G.py = ground - 118; G.onGround = true; G.jumps = 2; G.slideT = 0; G.coyote = 0; G.jumpBuf = 0;
    G.animT = 0; G.lastSpawn = 0; G.nextGap = 420; G.spawnI = 0; G.trauma = 0; G.flash = 0;
    G.paused = false; G.pops.length = 0;
    G.papers = 3; G.throwCd = 0; G.throwT = 0; G.throwBuf = 0; G.flyT = 0; G.jetReady = false;
    for (var i = 0; i < G.ents.length; i++) G.ents[i].a = false;
    for (var j = 0; j < G.parts.length; j++) G.parts[j].a = false;
    if (playing) paintHud();
  }

  function spawn(kind, x, y, w, h, deadly) {
    for (var i = 0; i < G.ents.length; i++) {
      var e = G.ents[i];
      if (!e.a) {
        e.a = true; e.kind = kind; e.x = x; e.y = y; e.w = w; e.h = h;
        e.deadly = deadly; e.got = false; e.bob = 0; e.ph = Math.random() * 6; e.vx = 0;
        return e;
      }
    }
  }
  function burst(x, y, n, color) {
    for (var i = 0; i < n; i++) {
      for (var k = 0; k < G.parts.length; k++) {
        var p = G.parts[k];
        if (!p.a) {
          p.a = true; p.x = x; p.y = y;
          p.vx = (Math.random() - 0.5) * 280; p.vy = -80 - Math.random() * 220;
          p.life = 0.35 + Math.random() * 0.4; p.max = p.life; p.size = 2 + Math.random() * 3;
          p.color = color; break;
        }
      }
    }
  }
  function pop(x, y, text) { G.pops.push({ x: x, y: y, text: text, life: 0.7 }); }

  function maybeSpawn() {
    if (G.scroll - G.lastSpawn < G.nextGap) return;
    G.lastSpawn = G.scroll;
    G.nextGap = 340 + hash(G.spawnI * 17) * 220 - Math.min(120, G.speed - BASE_SPD);
    G.spawnI++;
    var x = viewW + 80;
    if (G.spawnI > 2 && G.spawnI % 8 === 0) {
      G.jetReady = true;
      spawn("jetpack", x, ground - 176, 56, 56, false);
      spawn("crowd", x + 240, ground - 320, 320, 320, true);
      G.nextGap = 720;
      return;
    }
    var r = hash(G.spawnI * 91);
    if (r < 0.28) spawn("scoop", x, ground - 150 - hash(G.spawnI) * 90, 44, 44, false);
    else if (r < 0.38) spawn("breaking", x, ground - 168, 52, 36, false);
    else if (r < 0.44) spawn("pass", x, ground - 200, 40, 28, false);
    else if (r < 0.52) spawn("van", x, ground - 92, 150, 92, true);
    else if (r < 0.58) spawn("protestor", x, ground - 108, 70, 108, true);
    else if (r < 0.64) spawn("paparazzi", x, ground - 102, 78, 102, true);
    else if (r < 0.70) spawn("scaffold", x, ground - 230, 88, 230, true);
    else if (r < 0.75) spawn("cloud", x, ground - 120, 88, 72, true);
    else if (r < 0.81) spawn("politician", x, ground - 112, 72, 112, true);
    else if (r < 0.87) spawn("celebrity", x, ground - 112, 72, 112, true);
    else if (r < 0.92) spawn("mobster", x, ground - 112, 74, 112, true);
    else if (r < 0.96) spawn("lawyer", x, ground - 110, 70, 110, true);
    else spawn("athlete", x, ground - 110, 72, 110, true);
    if (hash(G.spawnI * 3) > 0.72) spawn("scoop", x + 90, ground - 240, 44, 44, false);
  }

  function jump() {
    if (G.jumps <= 0) return;
    var first = G.onGround || G.coyote > 0;
    G.vy = first ? JUMP_V : DJUMP_V;
    G.onGround = false; G.coyote = 0; G.jumps -= 1; G.jumpBuf = 0;
    beep(first ? 420 : 560, 0.1, "square", 0.07);
    burst(playerX + 30, G.py + 100, 5, "#fff");
  }

  function kill() {
    if (G.invT > 0 || G.dead) return;
    G.dead = true; G.deadT = 0; G.vy = -420; G.trauma = 0.7;
    beep(90, 0.4, "sawtooth", 0.12);
  }

  function collect(e) {
    e.got = true; e.a = false;
    if (e.kind === "scoop") {
      G.stories += 1; G.combo += 1; G.comboT = 2.4; G.deadline = Math.min(100, G.deadline + 9);
      G.papers = Math.min(8, G.papers + 1);
      G.score += 250 * displayMult(); pop(e.x, e.y, "SCOOP"); beep(880, 0.12, "triangle", 0.09);
    } else if (e.kind === "breaking") {
      G.stories += 3; G.combo += 2; G.deadline = 100; G.frontT = 7.5; G.multT = 6.5;
      G.papers = Math.min(8, G.papers + 3);
      G.score += 900 * displayMult(); pop(e.x, e.y, "BREAKING"); beep(520, 0.2, "square", 0.1);
    } else if (e.kind === "jetpack") {
      G.jetReady = true; pop(e.x, e.y, "JETPACK"); beep(640, 0.16, "sawtooth", 0.08);
    } else {
      G.invT = 5.2; pop(e.x, e.y, "PRESS"); beep(300, 0.15, "triangle", 0.08);
    }
    burst(e.x, e.y, 10, "#d4a017");
  }

  function throwPaper() {
    if (G.papers <= 0 || G.throwCd > 0 || G.dead || G.slideT > 0 || G.idle || state !== "play") return;
    G.papers -= 1;
    G.throwCd = 0.36;
    G.throwT = 0.26;
    G.throwBuf = 0;
    var p = spawn("paper", playerX + 64, (G.slideT > 0 ? ground - 70 : G.py + 28), 40, 30, false);
    if (p) p.vx = 780;
    beep(740, 0.09, "square", 0.08);
    beep(980, 0.06, "triangle", 0.05);
  }

  function smashObstacle(e) {
    if (e.kind === "crowd") return false;
    e.a = false;
    G.score += 180 * displayMult();
    pop(e.x, e.y, "CLEARED");
    burst(e.x + e.w / 2, e.y + e.h / 2, 14, "#f3ead8");
    beep(160, 0.14, "sawtooth", 0.09);
    return true;
  }

  function crowdAhead() {
    for (var i = 0; i < G.ents.length; i++) {
      var e = G.ents[i];
      if (e.a && e.kind === "crowd" && e.x + e.w > playerX && e.x < viewW + 40) return true;
    }
    return false;
  }
  function igniteJet() {
    if (G.idle || state !== "play" || G.dead || G.flyT > 0) return;
    if (!G.jetReady && !crowdAhead()) return;
    G.jetReady = false;
    G.flyT = 2.5;
    G.slideT = 0;
    G.onGround = false;
    G.vy = -420;
    pop(playerX, G.py - 20, "JETPACK");
    beep(300, 0.12, "square", 0.1);
    beep(520, 0.18, "sawtooth", 0.07);
    haptic(30);
  }

  function playerBox() {
    if (G.slideT > 0) return { x: playerX + 8, y: ground - 50, w: 78, h: 48 };
    return { x: playerX + 18, y: G.py + 16, w: 54, h: 100 };
  }

  function update(dt) {
    if (G.dead) {
      G.deadT += dt; G.vy += GRAVITY * dt; G.py += G.vy * dt; G.trauma = Math.max(0, G.trauma - dt * 1.6);
      if (G.deadT > 0.85) gameOver();
      return;
    }
    var wantJump = pointerJump || keys.Space || keys.ArrowUp || keys.KeyW;
    var wantSlide = pointerSlide || keys.ArrowDown || keys.KeyS;
    var wantThrow = pointerThrow || keys.KeyF || keys.KeyJ || keys.KeyE || keys.Enter;
    if (pointerJet || keys.KeyG || keys.KeyQ) igniteJet();
    if (wantJump) G.jumpBuf = BUFFER;
    if (wantThrow) G.throwBuf = 0.14;
    G.jumpBuf = Math.max(0, G.jumpBuf - dt);
    G.throwBuf = Math.max(0, G.throwBuf - dt);
    G.throwCd = Math.max(0, G.throwCd - dt);
    if (G.throwT > 0) G.throwT = Math.max(0, G.throwT - dt);
    if (G.throwBuf > 0) throwPaper();

    if (G.flyT > 0) {
      G.flyT = Math.max(0, G.flyT - dt);
      G.slideT = 0;
      G.onGround = false;
      if (wantJump) G.vy = -300;
      else G.vy += 240 * dt;
      G.py += G.vy * dt;
      var cruise = ground - 330;
      if (G.py < ground - 380) { G.py = ground - 380; G.vy = 0; }
      if (G.py > cruise) { G.py = cruise; if (G.vy > 0) G.vy = 0; }
    } else {
      if (G.onGround && wantSlide && G.slideT <= 0) {
        G.slideT = SLIDE_T; beep(180, 0.08, "triangle", 0.05);
      }
      if (G.slideT > 0) { G.slideT -= dt; if (G.slideT <= 0 && G.onGround) G.py = ground - 118; }
      if (G.jumpBuf > 0 && (G.onGround || G.coyote > 0 || G.jumps > 0)) jump();

      G.vy += GRAVITY * dt;
      if (G.vy > MAX_FALL) G.vy = MAX_FALL;
      if (!G.onGround) G.py += G.vy * dt;
      var stand = G.slideT > 0 ? ground - 52 : ground - 118;
      if (G.py >= stand && G.vy >= 0) {
        G.py = stand; G.vy = 0; if (!G.onGround) G.jumps = 2;
        G.onGround = true; G.coyote = COYOTE;
      } else {
        G.onGround = false; G.coyote = Math.max(0, G.coyote - dt);
      }
    }

    var spd = G.speed * (G.slowT > 0 ? 0.55 : 1);
    G.scroll += spd * dt;
    G.speed = Math.min(MAX_SPD, BASE_SPD + (G.scroll / PX_M / 500) * SPD_PER);
    G.score += spd * dt * 0.35 * displayMult();
    G.animT += dt;
    G.multT = Math.max(0, G.multT - dt);
    G.frontT = Math.max(0, G.frontT - dt);
    G.invT = Math.max(0, G.invT - dt);
    G.slowT = Math.max(0, G.slowT - dt);
    G.trauma = Math.max(0, G.trauma - dt * 2);
    G.flash = Math.max(0, G.flash - dt);
    if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
    if (G.deadline >= 100 && G.frontT <= 0) {
      G.deadline = 0; G.frontT = 7.5; pop(playerX, G.py - 20, "FRONT PAGE"); beep(240, 0.25, "square", 0.1);
    }

    maybeSpawn();
    var pb = playerBox();
    for (var i = 0; i < G.ents.length; i++) {
      var e = G.ents[i];
      if (!e.a) continue;
      if (e.kind === "paper") {
        e.x += (e.vx || 760) * dt;
        e.ph += dt * 14;
        if (e.x > viewW + 50) { e.a = false; continue; }
        for (var k = 0; k < G.ents.length; k++) {
          var o = G.ents[k];
          if (!o.a || !o.deadly || o.kind === "crowd") continue;
          if (aabb(e.x, e.y, e.w, e.h, o.x, o.y, o.w, o.h)) {
            smashObstacle(o);
            e.a = false;
            break;
          }
        }
        continue;
      }
      e.x -= spd * dt;
      e.bob = Math.sin(G.animT * 4 + e.ph) * 6;
      if (e.x + e.w < -40) { e.a = false; continue; }
      if (e.got) continue;
      if (aabb(pb.x, pb.y, pb.w, pb.h, e.x, e.y + (e.deadly ? 0 : e.bob), e.w, e.h)) {
        if (e.deadly) {
          if (e.kind === "crowd" && G.flyT > 0) { /* jetpack over the rally */ }
          else if (e.kind === "cloud") { G.slowT = 1.8; G.flash = 0.2; e.a = false; beep(200, 0.2, "sawtooth", 0.06); }
          else kill();
        } else collect(e);
      }
    }
    for (var p = 0; p < G.parts.length; p++) {
      var pt = G.parts[p];
      if (!pt.a) continue;
      pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 900 * dt;
      if (pt.life <= 0) pt.a = false;
    }
    for (var q = G.pops.length - 1; q >= 0; q--) {
      G.pops[q].life -= dt; G.pops[q].y -= 40 * dt;
      if (G.pops[q].life <= 0) G.pops.splice(q, 1);
    }
  }

  function drawSky(id, a) {
    var pal = PAL[id];
    var g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, pal.sky0);
    g.addColorStop(0.72, pal.sky1);
    g.addColorStop(1, pal.street);
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewW, VIEW_H);
    var sky = imgs.sky[id];
    if (sky) {
      ctx.globalAlpha = a * 0.16;
      ctx.drawImage(sky, 0, 0, viewW, VIEW_H);
    }
    if (pal.sun) {
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = pal.sun;
      ctx.beginPath();
      ctx.arc(viewW * 0.78, VIEW_H * 0.16, 46, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function drawCity(id, a) {
    var pal = PAL[id];
    ctx.globalAlpha = a;
    var offFar = -((G.scroll * 0.12) % 240);
    for (var i = -1; i < 12; i++) {
      var x = offFar + i * 240;
      var hsh = hash(i + 21);
      var bh = 70 + hsh * 120;
      ctx.fillStyle = pal.farSil;
      ctx.fillRect(x, ground - bh - 36, 150 + hsh * 50, bh + 36);
    }
    var offMid = -((G.scroll * 0.34) % 168);
    for (var i = -1; i < 16; i++) {
      var x = offMid + i * 168;
      var hsh = hash(i * 3 + 8);
      var bw = 86 + hsh * 48;
      var bh = 130 + hsh * 210;
      ctx.fillStyle = pal.midSil;
      ctx.fillRect(x, ground - bh, bw, bh);
      ctx.fillStyle = pal.window;
      var rows = Math.floor(bh / 30);
      for (var r = 2; r < rows - 1; r++) {
        for (var c = 0; c < 3; c++) {
          if (hash(i * 97 + r * 11 + c) > 0.42) {
            ctx.globalAlpha = a * 0.55;
            ctx.fillRect(x + 12 + c * 22, ground - bh + 16 + r * 26, 9, 13);
          }
        }
      }
      ctx.globalAlpha = a;
    }
    ctx.fillStyle = pal.street;
    ctx.fillRect(0, ground, viewW, VIEW_H - ground);
    ctx.fillStyle = pal.sidewalk;
    ctx.fillRect(0, ground - 14, viewW, 14);
    ctx.fillStyle = "rgba(243,234,216,0.16)";
    var dashOff = -((G.scroll) % 72);
    for (var d = 0; d < 28; d++) ctx.fillRect(dashOff + d * 72, ground + 26, 34, 4);
    ctx.globalAlpha = 1;
  }
  function drawImgOrBox(im, x, y, w, h, color) {
    if (im) ctx.drawImage(im, x, y, w, h);
    else { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
  }
  function frame(arr, fps) {
    if (!arr || !arr.length) return null;
    var idx = Math.floor(G.animT * fps) % arr.length;
    for (var k = 0; k < arr.length; k++) {
      var im = arr[(idx + k) % arr.length];
      if (im) return im;
    }
    return null;
  }
  function drawPlayer() {
    var x = playerX, y = G.py, w = 108, h = 132;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x + 50, ground - 6, 42, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    var gx = x + 52, gy = y + 70;
    var glow = ctx.createRadialGradient(gx, gy, 8, gx, gy, 92);
    glow.addColorStop(0, "rgba(243,234,216,0.72)");
    glow.addColorStop(1, "rgba(243,234,216,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 30, y - 20, 180, 180);
    ctx.restore();
    var blink = G.invT > 0 && Math.floor(G.animT * 18) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.45;
    var im = null;
    if (G.slideT > 0) {
      im = frame(imgs.slide, 10);
      drawImgOrBox(im, x - 4, ground - 78, 120, 78, "#1c1914");
    } else if (G.throwT > 0) {
      var ti = Math.min(3, 3 - Math.floor((G.throwT / 0.26) * 4));
      im = imgs.throw[ti] || imgs.throw[2];
      drawImgOrBox(im, x, y, w, h, "#1c1914");
    } else if (!G.onGround) {
      im = frame(imgs.jump, 8);
      drawImgOrBox(im, x, y, w, h, "#1c1914");
    } else {
      im = frame(imgs.run, 11);
      drawImgOrBox(im, x, y, w, h, "#1c1914");
    }
    if (G.flyT > 0) {
      var jx = x + 38, jy = y + 108;
      ctx.fillStyle = "#ff6a00";
      ctx.beginPath(); ctx.moveTo(jx - 12, jy); ctx.lineTo(jx + 20, jy); ctx.lineTo(jx + 4 + Math.sin(G.animT * 42) * 6, jy + 40); ctx.fill();
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath(); ctx.moveTo(jx - 6, jy); ctx.lineTo(jx + 14, jy); ctx.lineTo(jx + 4, jy + 26); ctx.fill();
      if (imgs.jetpack) ctx.drawImage(imgs.jetpack, x + 4, y + 48, 42, 50);
    }
    ctx.globalAlpha = 1;
  }
  function drawEnt(e) {
    var y = e.y + (e.deadly ? 0 : e.bob);
    if (e.kind === "scoop") drawImgOrBox(imgs.scoop, e.x, y, e.w, e.h, "#d4a017");
    else if (e.kind === "breaking") drawImgOrBox(imgs.breaking, e.x, y, e.w, e.h, "#c41e3a");
    else if (e.kind === "pass") drawImgOrBox(imgs.pass, e.x, y, e.w, e.h, "#f3ead8");
    else if (e.kind === "van") drawImgOrBox(imgs.van, e.x, y, e.w, e.h, "#2a2620");
    else if (e.kind === "protestor") drawImgOrBox(imgs.protestor, e.x, y, e.w, e.h, "#c41e3a");
    else if (e.kind === "paparazzi") drawImgOrBox(imgs.paparazzi, e.x, y, e.w, e.h, "#1c1914");
    else if (e.kind === "scaffold") drawImgOrBox(imgs.scaffolding, e.x, y, e.w, e.h, "#9a8c74");
    else if (e.kind === "paper") {
      var pf = imgs.paper[Math.floor(e.ph) % 4];
      drawImgOrBox(pf, e.x, e.y, e.w, e.h, "#f3ead8");
    }
    else if (e.kind === "crowd") drawImgOrBox(imgs.crowd, e.x, e.y, e.w, e.h, "#3a2a28");
    else if (e.kind === "jetpack") drawImgOrBox(imgs.jetpack, e.x, y, e.w, e.h, "#1a6dff");
    else if (e.kind === "politician") drawImgOrBox(imgs.politician, e.x, y, e.w, e.h, "#1c355e");
    else if (e.kind === "celebrity") drawImgOrBox(imgs.celebrity, e.x, y, e.w, e.h, "#c41e3a");
    else if (e.kind === "mobster") drawImgOrBox(imgs.mobster, e.x, y, e.w, e.h, "#1c1914");
    else if (e.kind === "lawyer") drawImgOrBox(imgs.lawyer, e.x, y, e.w, e.h, "#243044");
    else if (e.kind === "athlete") drawImgOrBox(imgs.athlete, e.x, y, e.w, e.h, "#d4a017");
    else drawImgOrBox(imgs.fakeNews, e.x, y, e.w, e.h, "#6e6658");
  }
  function draw() {
    var sid = seasonId();
    var nid = nextSeason();
    var blend = seasonBlend();
    var shakeX = G.trauma ? (Math.random() - 0.5) * 14 * G.trauma : 0;
    var shakeY = G.trauma ? (Math.random() - 0.5) * 10 * G.trauma : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawSky(sid, 1);
    if (blend > 0) drawSky(nid, blend);
    drawCity(sid, 1);
    if (blend > 0) drawCity(nid, blend);
    for (var i = 0; i < G.ents.length; i++) if (G.ents[i].a) drawEnt(G.ents[i]);
    if (!G.idle) drawPlayer();
    else {
      G.py = ground - 118;
      drawPlayer();
    }
    for (var p = 0; p < G.parts.length; p++) {
      var pt = G.parts[p];
      if (!pt.a) continue;
      ctx.globalAlpha = pt.life / pt.max;
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
      ctx.globalAlpha = 1;
    }
    ctx.font = "700 18px Oswald, sans-serif";
    ctx.fillStyle = "#f3ead8";
    for (var q = 0; q < G.pops.length; q++) {
      ctx.globalAlpha = Math.max(0, G.pops[q].life);
      ctx.fillText(G.pops[q].text, G.pops[q].x, G.pops[q].y);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (G.flash > 0) {
      ctx.fillStyle = "rgba(255,255,255," + (G.flash * 0.5) + ")";
      ctx.fillRect(0, 0, viewW, VIEW_H);
    }
    ctx.fillStyle = PAL[sid].fog;
    ctx.fillRect(0, 0, viewW, VIEW_H);
  }

  function paintHud() {
    var el;
    el = $("hud-score"); if (el) el.textContent = fmt(Math.floor(G.score));
    el = $("hud-season"); if (el) el.textContent = SLABEL[seasonId()];
    el = $("hud-dist"); if (el) el.textContent = fmt(Math.floor(G.scroll / PX_M));
    el = $("hud-mult"); if (el) el.textContent = "x" + displayMult().toFixed(1);
    if ($("hud-papers")) $("hud-papers").textContent = String(G.papers);
    var jetBtn = $("btn-jet");
    if (jetBtn) jetBtn.hidden = !(state === "play" && (G.jetReady || G.flyT > 0 || crowdAhead()));
    el = $("hud-bar-i"); if (el) el.style.width = Math.round(Math.min(1, G.deadline / 100) * 100) + "%";
    el = $("hud-bar"); if (el) el.className = "bar" + (G.frontT > 0 ? " front" : "");
    el = $("hud-front"); if (el) el.hidden = G.frontT <= 0;
  }
  function paintTitleStats() {
    var el = $("stat-best"); if (el) el.textContent = fmt(best);
    el = $("stat-stories"); if (el) el.textContent = fmt(career);
    if (country && country !== "UN" && $("stat-desk")) {
      $("stat-desk").innerHTML = '<img class="flag" alt="" src="https://flagcdn.com/w40/' + country.toLowerCase() + '.png"> ' + country;
    }
  }

  var hudClock = 0;
  function loop(now) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    var dt = (now - last) / 1000; last = now;
    if (dt > 0.1) dt = 0.1;
    if (G.paused) { draw(); return; }
    if (G.idle) {
      acc += dt;
      while (acc >= STEP) { G.scroll += 92 * STEP; G.animT += STEP; acc -= STEP; }
      draw();
      return;
    }
    acc += dt;
    while (acc >= STEP) { update(STEP); acc -= STEP; }
    draw();
    hudClock += dt;
    if (hudClock > 0.08) { hudClock = 0; paintHud(); }
  }

  function startLoop() {
    if (running) return;
    running = true; last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function setState(s) {
    state = s;
    show("screen-title", s === "title");
    show("screen-pause", s === "pause");
    show("screen-byline", s === "byline");
    show("screen-board", s === "board");
    show("screen-store", s === "store");
    show("hud", s === "play" || s === "pause");
    show("touch", s === "play");
    show("btn-pause", s === "play" || s === "pause");
    if (s !== "play" && $("btn-jet")) $("btn-jet").hidden = true;
    if (s !== "byline") {
      show("screen-replay", false);
      if (s !== "play") show("screen-tape", false);
    }
  }

  function play() {
    unlockAudio();
    G.idle = false;
    resetRun(true);
    setState("play");
    paintHud();
    startLoop();
    startTape();
    beep(660, 0.08, "triangle", 0.06);
  }
  function togglePause() {
    if (state !== "play" && state !== "pause") return;
    G.paused = !G.paused;
    setState(G.paused ? "pause" : "play");
  }
  function goDesk() {
    G.idle = true; G.paused = false; G.dead = false;
    stopTape(null, true);
    resetRun(false);
    setState("title");
    paintTitleStats();
    startLoop();
  }
  function gameOver() {
    running = false;
    cancelAnimationFrame(raf);
    lastResult = { score: Math.floor(G.score), stories: G.stories, dist: Math.floor(G.scroll / PX_M) };
    if (lastResult.score > best) {
      best = lastResult.score;
      try { localStorage.setItem("scoop-runner-best", String(best)); } catch (e) {}
      $("over-record").hidden = false;
    } else $("over-record").hidden = true;
    career += lastResult.stories;
    try { localStorage.setItem("scoop-runner-stories", String(career)); } catch (e) {}
    $("over-score").textContent = fmt(lastResult.score);
    $("over-stories").textContent = fmt(lastResult.stories);
    $("over-dist").textContent = fmt(lastResult.dist) + " m";
    $("byline-name").value = playerName;
    $("byline-err").hidden = true;
    stopTape(function (hasTape) {
      setState("byline");
      if (hasTape) show("screen-replay", true);
      else setTimeout(function () { var n = $("byline-name"); if (n) n.focus(); }, 80);
    });
  }

  function loadBoard() {
    var list = $("board-list");
    list.innerHTML = "<p class='lede' style='padding:24px'>Loading the worldwide desk…</p>";
    fetch("/api/scores")
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!rows || !rows.length) {
          list.innerHTML = "<p class='lede' style='padding:28px;text-align:center'>No scoops filed yet. Be the first on the front page.</p>";
          return;
        }
        list.innerHTML = rows.map(function (row, i) {
          var code = (row.countryCode || "UN").toLowerCase();
          return '<div class="board-row"><span style="color:var(--muted)">' + (i + 1) + '</span>' +
            '<img class="flag" alt="" src="https://flagcdn.com/w40/' + code + '.png" />' +
            '<span>' + escapeHtml(row.playerName) + '</span>' +
            '<span>' + fmt(row.score) + '</span></div>';
        }).join("");
      })
      .catch(function () {
        list.innerHTML = "<p class='lede' style='padding:28px;text-align:center'>Desk is unreachable. Local files still count.</p>";
      });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      if (c === "&") return "\u0026amp;";
      if (c === "<") return "\u0026lt;";
      if (c === ">") return "\u0026gt;";
      if (c === '"') return "\u0026quot;";
      return "\u0026#39;";
    });
  }

  var STORE = [
    { id: "van", file: "van.png", name: "Delivery Van", beat: "Jump or Scoop-x", blurb: "City logistics always cut across the exclusive." },
    { id: "protestor", file: "protestor.png", name: "Angry Protestor", beat: "Jump, slide, or Scoop-x", blurb: "The rally is the story — and the blockade." },
    { id: "paparazzi", file: "paparazzi.png", name: "Paparazzi", beat: "Jump or Scoop-x", blurb: "They want the shot. You want the byline." },
    { id: "scaffolding", file: "scaffolding.png", name: "Falling Scaffold", beat: "Slide under", blurb: "Deadline construction never waits for the press." },
    { id: "fake-news", file: "fake-news.png", name: "Fake News Cloud", beat: "Avoid — it slows you", blurb: "Disinfo hangs over the beat like weather." },
    { id: "crowd", file: "crowd.png", name: "Agitating Crowd", beat: "Jetpack over them", blurb: "A packed rally you cannot jump. Hit Jetpack." },
    { id: "jetpack", file: "jetpack.png", name: "Jetpack", beat: "G / Jetpack button", blurb: "Pickup or tap Jetpack when a crowd hits the street." },
    { id: "politician", file: "politician.png", name: "Politician", beat: "Jump or Scoop-x", blurb: "City Hall never yields the sidewalk." },
    { id: "celebrity", file: "celebrity.png", name: "Celebrity", beat: "Jump or Scoop-x", blurb: "Red carpet, zero comment, entire entourage." },
    { id: "mobster", file: "mobster.png", name: "Crime Boss", beat: "Jump or Scoop-x", blurb: "The organized-crime desk bites back." },
    { id: "lawyer", file: "lawyer.png", name: "Process Server", beat: "Jump or Scoop-x", blurb: "Libel, injunctions, and a briefcase to the knees." },
    { id: "athlete", file: "athlete.png", name: "Star Athlete", beat: "Jump or Scoop-x", blurb: "Sports page collision: jersey, ego, end zone." },
  ];
  function fillStore() {
    var grid = $("store-grid");
    if (!grid) return;
    grid.innerHTML = STORE.map(function (o) {
      return '<article class="obs"><img src="' + asset("sprites/" + o.file) + '" alt="" />' +
        "<div><h3>" + o.name + "</h3><p>" + o.blurb + "</p><b>" + o.beat + "</b></div></article>";
    }).join("");
  }

  function on(id, ev, fn) {
    var el = $(id);
    if (el) el.addEventListener(ev, fn);
  }
  on("btn-play", "click", play);
  on("btn-board", "click", function () { setState("board"); loadBoard(); });
  on("btn-store", "click", function () { fillStore(); setState("store"); });
  on("btn-store-back", "click", goDesk);
  on("btn-store-play", "click", play);
  on("btn-run-again", "click", play);
  on("btn-desk", "click", goDesk);
  on("btn-resume", "click", togglePause);
  on("btn-quit", "click", goDesk);
  on("btn-pause", "click", togglePause);
  on("btn-mute", "click", function () {
    unlockAudio();
    audio.muted = !audio.muted;
    if (audio.master) audio.master.gain.value = audio.muted ? 0 : 1;
    if ($("btn-mute")) $("btn-mute").textContent = audio.muted ? "🔇" : "🔊";
    try { localStorage.setItem("scoop-runner-muted", audio.muted ? "1" : "0"); } catch (e) {}
  });
  if ($("btn-mute")) $("btn-mute").textContent = audio.muted ? "🔇" : "🔊";
  function hold(el, on, off) {
    if (!el) return;
    el.addEventListener("pointerdown", function (e) { e.preventDefault(); haptic(20); on(); });
    el.addEventListener("pointerup", off);
    el.addEventListener("pointercancel", off);
    el.addEventListener("pointerleave", off);
  }
  hold($("btn-jump"), function () { pointerJump = true; }, function () { pointerJump = false; });
  hold($("btn-throw"), function () { pointerThrow = true; }, function () { pointerThrow = false; });
  hold($("btn-jet"), function () { pointerJet = true; igniteJet(); }, function () { pointerJet = false; });
  on("btn-tape-done", "click", function () {
    show("screen-tape", false);
    var n = $("byline-name");
    if (n) n.focus();
  });
  on("btn-watch", "click", openTape);
  on("btn-skip-replay", "click", function () {
    show("screen-replay", false);
    var n = $("byline-name");
    if (n) n.focus();
  });
  if ($("chk-record")) {
    $("chk-record").addEventListener("change", function () {
      try { localStorage.setItem("scoop-runner-record", $("chk-record").checked ? "1" : "0"); } catch (e) {}
    });
  }

  on("form-byline", "submit", function (e) {
    e.preventDefault();
    if (!lastResult) return;
    var name = $("byline-name").value.trim();
    if (name.length < 2) {
      $("byline-err").hidden = false;
      $("byline-err").textContent = "Byline needs at least 2 characters.";
      return;
    }
    playerName = name;
    try { localStorage.setItem("scoop-runner-byline", name); } catch (err) {}
    $("btn-file").disabled = true;
    $("btn-file").textContent = "Filing…";
    var tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (err) {}
    fetch("/api/scores", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name, score: lastResult.score, stories: lastResult.stories,
        timezone: tz, locale: navigator.language || "",
        countryCode: country && country !== "UN" ? country : undefined,
      }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error("desk closed");
        return r.json();
      })
      .then(function (data) {
        if (data.countryCode) applyCountry(data.countryCode);
        $("btn-file").disabled = false;
        $("btn-file").textContent = "File to the global desk";
        setState("board");
        loadBoard();
      })
      .catch(function () {
        $("btn-file").disabled = false;
        $("btn-file").textContent = "File to the global desk";
        $("byline-err").hidden = false;
        $("byline-err").textContent = "Could not reach the worldwide desk. Try again.";
      });
  });

  function applyCountry(code) {
    if (!code) return;
    code = String(code).toUpperCase();
    if (!/^[A-Z]{2}$/.test(code) || code === "UN" || code === "XX") return;
    if (country && country !== "UN" && code === "US" && country !== "US") return;
    country = code;
    window.__scoopCountry = code;
    paintTitleStats();
  }

  try {
    paintTitleStats();
    resetRun(false);
    G.idle = true;
    setState("title");
    startLoop();
    loadAll();
  } catch (err) {
    try { console.error("Scoop boot failed", err); } catch (e) {}
  }

  var tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
  fetch("/api/country", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      timezone: tz,
      locale: navigator.language || "",
      countryCode: country && country !== "UN" ? country : undefined,
    }),
  })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.countryCode && d.countryCode !== "UN") applyCountry(d.countryCode);
    })
    .catch(function () {});
})();
