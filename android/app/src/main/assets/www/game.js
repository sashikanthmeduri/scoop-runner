(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayCopy = document.getElementById("overlayCopy");
  const startBtn = document.getElementById("startBtn");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const W = canvas.width;
  const H = canvas.height;
  const GROUND = H - 86;
  const BEST_KEY = "scoop-runner-best";
  let running = false;
  let t = 0;
  let speed = 5.2;
  let score = 0;
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  bestEl.textContent = "BEST " + best;
  const player = { x: 64, y: GROUND, vy: 0, w: 36, h: 48, onGround: true };
  let obstacles = [];
  let scoops = [];
  function reset() {
    t = 0; speed = 5.2; score = 0;
    player.y = GROUND; player.vy = 0; player.onGround = true;
    obstacles = []; scoops = [];
    scoreEl.textContent = "SCOOPS 0";
  }
  function jump() {
    if (!running) return;
    if (player.onGround) { player.vy = -13.2; player.onGround = false; }
  }
  function spawn() {
    const roll = Math.random();
    if (roll < 0.62) {
      const kinds = ["lawsuit", "fakenews", "deadline"];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const h = kind === "deadline" ? 70 : 42;
      obstacles.push({ x: W + 20, y: GROUND - h + 48, w: 46, h, kind });
    } else {
      scoops.push({ x: W + 20, y: GROUND - 90 - Math.random() * 90, r: 12, taken: false });
    }
  }
  function hit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function gameOver() {
    running = false;
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      bestEl.textContent = "BEST " + best;
    }
    overlayTitle.textContent = "KILLED IN EDIT";
    overlayCopy.textContent = "You filed " + score + " scoop" + (score === 1 ? "" : "s") + ". The city desk wants another take.";
    startBtn.textContent = "REFILE";
    overlay.classList.remove("hidden");
  }
  function tick() {
    if (!running) return;
    t += 1;
    speed = 5.2 + t / 700;
    if (t % Math.max(38, 78 - Math.floor(t / 180)) === 0) spawn();
    player.vy += 0.62;
    player.y += player.vy;
    if (player.y >= GROUND) { player.y = GROUND; player.vy = 0; player.onGround = true; }
    obstacles.forEach((o) => (o.x -= speed));
    scoops.forEach((s) => (s.x -= speed));
    obstacles = obstacles.filter((o) => o.x > -80);
    scoops = scoops.filter((s) => s.x > -40 && !s.taken);
    const box = { x: player.x, y: player.y - player.h, w: player.w, h: player.h };
    for (const o of obstacles) { if (hit(box, o)) return gameOver(); }
    for (const s of scoops) {
      const dx = box.x + box.w / 2 - s.x;
      const dy = box.y + box.h / 2 - s.y;
      if (dx * dx + dy * dy < (s.r + 16) * (s.r + 16)) {
        s.taken = true; score += 1; scoreEl.textContent = "SCOOPS " + score;
      }
    }
    draw();
    requestAnimationFrame(tick);
  }
  function draw() {
    ctx.fillStyle = "#12151b"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1b140a"; ctx.fillRect(0, GROUND + 48, W, H);
    ctx.fillStyle = "#f5b942"; ctx.fillRect(0, GROUND + 48, W, 3);
    ctx.fillStyle = "#e8dcc8"; ctx.fillRect(player.x, player.y - player.h, player.w, player.h);
    ctx.fillStyle = "#f5b942"; ctx.fillRect(player.x + 8, player.y - player.h - 10, 20, 10);
    ctx.fillStyle = "#3ee0d4"; ctx.fillRect(player.x + 22, player.y - 18, 16, 8);
    obstacles.forEach((o) => {
      ctx.fillStyle = o.kind === "lawsuit" ? "#ff4d4d" : o.kind === "fakenews" ? "#9b7bff" : "#f5b942";
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = "#0b0d10"; ctx.font = "10px Georgia";
      const label = o.kind === "lawsuit" ? "SUIT" : o.kind === "fakenews" ? "FAKE" : "TIME";
      ctx.fillText(label, o.x + 8, o.y + 22);
    });
    scoops.forEach((s) => {
      ctx.beginPath(); ctx.fillStyle = "#f5b942"; ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0b0d10"; ctx.font = "9px Impact"; ctx.fillText("S", s.x - 3, s.y + 3);
    });
  }
  function start() { reset(); overlay.classList.add("hidden"); running = true; draw(); requestAnimationFrame(tick); }
  startBtn.addEventListener("click", start);
  canvas.addEventListener("pointerdown", jump);
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") { e.preventDefault(); if (!running) start(); else jump(); }
  });
  draw();
})();
