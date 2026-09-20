(() => {
  const W = 960;
  const H = 540;
  const WORLD = 3400;
  const GROUND = 470;
  const GRAVITY = 0.62;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const startBtn = document.getElementById("start-btn");
  const hpEl = document.getElementById("hp");
  const pigsLeftEl = document.getElementById("pigs-left");
  const powerEl = document.getElementById("power");
  const modeEl = document.getElementById("mode");

  const footImg = new Image();
  footImg.src = "pig-foot.png";

  const keys = {};
  const held = { left: false, right: false, jump: false, shoot: false };

  let mode = "title";
  let player;
  let pigs;
  let shots;
  let pickups;
  let platforms;
  let cameraX = 0;
  let lastShot = 0;
  let lastTransform = 0;
  let invulnUntil = 0;

  function rectsHit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function playerBox() {
    const truck = player.form === "truck";
    const w = truck ? 110 : 58;
    const h = truck ? 52 : 96;
    return { x: player.x - w / 2, y: player.y - h, w, h };
  }

  function resetGame() {
    player = {
      x: 160,
      y: GROUND,
      vx: 0,
      vy: 0,
      facing: 1,
      form: "robot",
      hp: 8,
      onGround: true,
      rapidUntil: 0,
      powerUntil: 0,
      shieldHits: 0,
    };
    platforms = [
      { x: 0, y: GROUND, w: WORLD, h: 80 },
      { x: 720, y: 360, w: 180, h: 20 },
      { x: 1180, y: 300, w: 200, h: 20 },
      { x: 1680, y: 350, w: 160, h: 20 },
      { x: 2280, y: 340, w: 220, h: 20 },
      { x: 2580, y: 300, w: 160, h: 20 },
      { x: 2780, y: 250, w: 280, h: 20 },
    ];
    pigs = [
      makePig(520, GROUND, 420, 700, "pink"),
      makePig(980, 360, 730, 880, "gray"),
      makePig(1500, GROUND, 1360, 1720, "pink"),
      makePig(1880, 350, 1680, 1820, "gray"),
      makePig(2050, GROUND, 1900, 2240, "pink"),
      makePig(2460, 340, 2290, 2480, "gray"),
      makePig(3000, GROUND, 2860, 3240, "pink"),
    ];
    pickups = [
      makePickup(640, 320, "heart"),
      makePickup(1260, 250, "rapid"),
      makePickup(1720, 300, "shield"),
      makePickup(2360, 290, "power"),
      makePickup(2700, GROUND - 40, "heart"),
    ];
    shots = [];
    cameraX = 0;
    lastShot = 0;
    invulnUntil = performance.now() + 2500;
    updateHud();
  }

  function makePig(x, y, left, right, kind) {
    return {
      x,
      y,
      vx: kind === "gray" ? 0.85 : 1.15,
      left,
      right,
      hp: kind === "gray" ? 4 : 3,
      kind,
      facing: 1,
      hurtUntil: 0,
      lastTomato: 0,
    };
  }

  function makePickup(x, y, kind) {
    return { x, y, kind, taken: false, bob: Math.random() * 6 };
  }

  function updateHud() {
    hpEl.textContent = String(Math.max(0, player.hp));
    pigsLeftEl.textContent = String(pigs.filter((p) => p.hp > 0).length);
    const now = performance.now();
    let power = "NONE";
    if (player.shieldHits > 0) power = "SHIELD";
    if (now < player.powerUntil) power = "BLAST";
    if (now < player.rapidUntil) power = "RAPID";
    powerEl.textContent = power;
    modeEl.textContent = player.form === "truck" ? "TRUCK" : "ROBOT";
  }

  function showOverlay(title, text, button) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    startBtn.textContent = button;
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function solidAt(box, dy) {
    const test = { x: box.x, y: box.y + dy, w: box.w, h: box.h };
    for (const plat of platforms) {
      if (rectsHit(test, plat)) return plat;
    }
    return null;
  }

  function transform() {
    const now = performance.now();
    if (now - lastTransform < 350) return;
    lastTransform = now;
    player.form = player.form === "robot" ? "truck" : "robot";
    updateHud();
  }

  function shoot() {
    const now = performance.now();
    if (player.form !== "robot") return;
    const wait = now < player.rapidUntil ? 90 : 220;
    if (now - lastShot < wait) return;
    lastShot = now;
    const box = playerBox();
    const powered = now < player.powerUntil;
    shots.push({
      x: player.facing > 0 ? box.x + box.w : box.x - (powered ? 26 : 18),
      y: box.y + 22,
      w: powered ? 26 : 18,
      h: powered ? 12 : 8,
      vx: player.facing * (powered ? 14 : 11),
      vy: 0,
      from: "hero",
      dmg: powered ? 2 : 1,
    });
  }

  function hurtPlayer() {
    if (performance.now() < invulnUntil) return;
    if (player.shieldHits > 0) {
      player.shieldHits -= 1;
      invulnUntil = performance.now() + 700;
      updateHud();
      return;
    }
    player.hp -= 1;
    invulnUntil = performance.now() + 1200;
    player.vx = -player.facing * 6;
    player.vy = -7;
    updateHud();
    if (player.hp <= 0) {
      mode = "over";
      showOverlay("Mission Failed", "The gray pigs' tomato launchers got you. Grab power-ups and try again!", "Retry");
    }
  }

  function updatePlayer() {
    const left = keys.ArrowLeft || keys.a || keys.A || held.left;
    const right = keys.ArrowRight || keys.d || keys.D || held.right;
    const jump = keys[" "] || keys.w || keys.W || held.jump;
    const speed = player.form === "truck" ? 6.6 : 4.1;

    if (left) {
      player.vx = -speed;
      player.facing = -1;
    } else if (right) {
      player.vx = speed;
      player.facing = 1;
    } else {
      player.vx *= 0.78;
    }

    if (jump && player.onGround) {
      player.vy = -13.4;
      player.onGround = false;
    }

    if ((keys.f || keys.F || keys.j || keys.J || held.shoot) && player.form === "robot") {
      shoot();
    }

    player.vy += GRAVITY;
    player.x += player.vx;

    let box = playerBox();
    if (box.x < 20) player.x += 20 - box.x;
    if (box.x + box.w > WORLD - 20) player.x -= box.x + box.w - (WORLD - 20);

    box = playerBox();
    const wallBox = { x: box.x, y: box.y + 8, w: box.w, h: box.h - 20 };
    const hitX = solidAt(wallBox, 0);
    if (hitX && hitX.y < GROUND - 1 && box.y + box.h > hitX.y + 14) {
      if (player.vx > 0) player.x = hitX.x - box.w / 2 - 1;
      if (player.vx < 0) player.x = hitX.x + hitX.w + box.w / 2 + 1;
    }

    player.y += player.vy;
    box = playerBox();
    player.onGround = false;
    const hitY = solidAt(box, 0);
    if (hitY && player.vy >= 0 && box.y + box.h - player.vy <= hitY.y + 12) {
      player.y = hitY.y;
      player.vy = 0;
      player.onGround = true;
    }

    cameraX = Math.max(0, Math.min(WORLD - W, player.x - 340));
  }

  function pigBox(pig) {
    return { x: pig.x - 44, y: pig.y - 92, w: 88, h: 92 };
  }

  function updatePigs() {
    for (const pig of pigs) {
      if (pig.hp <= 0) continue;
      pig.x += pig.vx;
      if (pig.x < pig.left || pig.x > pig.right) {
        pig.vx *= -1;
        pig.x = Math.max(pig.left, Math.min(pig.right, pig.x));
      }
      pig.facing = player.x >= pig.x ? 1 : -1;

      const now = performance.now();
      if (pig.kind === "gray" && now - pig.lastTomato > 1400 && Math.abs(pig.x - player.x) < 520) {
        pig.lastTomato = now;
        const dir = pig.facing;
        shots.push({
          x: pig.x + dir * 28,
          y: pig.y - 62,
          w: 18,
          h: 18,
          vx: dir * 5.4,
          vy: -7.2,
          from: "tomato",
        });
      } else if (pig.kind === "pink" && Math.random() < 0.002 && Math.abs(pig.x - player.x) < 320) {
        shots.push({
          x: pig.facing > 0 ? pig.x + 20 : pig.x - 32,
          y: pig.y - 48,
          w: 14,
          h: 10,
          vx: pig.facing * 6,
          vy: 0,
          from: "pig",
        });
      }

      if (rectsHit(playerBox(), pigBox(pig))) {
        if (player.form === "truck" && Math.abs(player.vx) > 3.5) {
          pig.hp -= 1;
          pig.hurtUntil = performance.now() + 200;
          pig.x += player.facing * 40;
          if (pig.hp <= 0) pig.x = -9999;
          updateHud();
          checkWin();
        } else {
          hurtPlayer();
        }
      }
    }
  }

  function updateShots() {
    shots = shots.filter((shot) => {
      if (shot.from === "tomato") shot.vy += 0.28;
      shot.x += shot.vx;
      shot.y += shot.vy || 0;
      if (shot.y > GROUND - 8 && shot.from === "tomato") return false;
      if (shot.x < cameraX - 80 || shot.x > cameraX + W + 80) return false;
      const box = { x: shot.x, y: shot.y, w: shot.w, h: shot.h };
      if (shot.from === "hero") {
        for (const pig of pigs) {
          if (pig.hp > 0 && rectsHit(box, pigBox(pig))) {
            pig.hp -= shot.dmg || 1;
            pig.hurtUntil = performance.now() + 180;
            if (pig.hp <= 0) pig.x = -9999;
            updateHud();
            checkWin();
            return false;
          }
        }
      } else if (rectsHit(box, playerBox())) {
        hurtPlayer();
        return false;
      }
      return true;
    });
  }

  function updatePickups() {
    for (const item of pickups) {
      if (item.taken) continue;
      item.bob += 0.08;
      const box = { x: item.x - 18, y: item.y - 18 + Math.sin(item.bob) * 6, w: 36, h: 36 };
      if (!rectsHit(playerBox(), box)) continue;
      item.taken = true;
      const now = performance.now();
      if (item.kind === "heart") player.hp = Math.min(8, player.hp + 2);
      if (item.kind === "rapid") player.rapidUntil = now + 8000;
      if (item.kind === "power") player.powerUntil = now + 8000;
      if (item.kind === "shield") player.shieldHits = 2;
      updateHud();
    }
  }

  function checkWin() {
    if (mode !== "play") return;
    if (pigs.some((p) => p.hp > 0)) return;
    mode = "win";
    showOverlay("Pigs Down!", "You grabbed the power-ups and beat the tomato launchers.", "Play Again");
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1a1140");
    g.addColorStop(0.55, "#123057");
    g.addColorStop(1, "#0a1c18");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let i = 0; i < 40; i += 1) {
      const x = ((i * 173) - cameraX * 0.2) % W;
      ctx.fillRect((x + W) % W, (i * 37) % 220, 2, 2);
    }
  }

  function drawPlatforms() {
    for (const plat of platforms) {
      const x = plat.x - cameraX;
      if (plat.y >= GROUND) {
        ctx.fillStyle = "#16301f";
        ctx.fillRect(x, plat.y, plat.w, H - plat.y + 20);
        ctx.fillStyle = "#2f7a3a";
        ctx.fillRect(x, plat.y, plat.w, 16);
        ctx.fillStyle = "#56c25a";
        ctx.fillRect(x, plat.y, plat.w, 6);
      } else {
        ctx.fillStyle = "#3d4c78";
        ctx.fillRect(x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#7aa2ff";
        ctx.fillRect(x, plat.y, plat.w, 5);
      }
    }
  }

  function drawPickup(item) {
    if (item.taken) return;
    const x = item.x - cameraX;
    const y = item.y + Math.sin(item.bob) * 6;
    ctx.save();
    ctx.translate(x, y);
    if (item.kind === "heart") {
      ctx.fillStyle = "#ff4d6d";
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.bezierCurveTo(-22, -6, -12, -22, 0, -10);
      ctx.bezierCurveTo(12, -22, 22, -6, 0, 10);
      ctx.fill();
    } else if (item.kind === "rapid") {
      ctx.fillStyle = "#ffcc33";
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.font = "700 11px Nunito";
      ctx.textAlign = "center";
      ctx.fillText("R", 0, 4);
    } else if (item.kind === "shield") {
      ctx.fillStyle = "#7cf0ff";
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(14, -8);
      ctx.lineTo(10, 12);
      ctx.lineTo(0, 16);
      ctx.lineTo(-10, 12);
      ctx.lineTo(-14, -8);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "#b46bff";
      ctx.fillRect(-12, -12, 24, 24);
      ctx.fillStyle = "#fff";
      ctx.fillRect(-4, -4, 8, 8);
    }
    ctx.restore();
  }

  function drawPig(pig) {
    if (pig.hp <= 0) return;
    const x = pig.x - cameraX;
    const flash = performance.now() < pig.hurtUntil;
    const gray = pig.kind === "gray";
    ctx.save();
    ctx.translate(x, pig.y);
    ctx.scale(pig.facing, 1);

    ctx.fillStyle = flash ? "#fff" : gray ? "#8d93a0" : "#e07aa8";
    ctx.beginPath();
    ctx.ellipse(0, -58, 38, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = gray ? "#4d5360" : "#8a3a66";
    ctx.fillRect(-22, -54, 44, 26);
    ctx.strokeStyle = gray ? "#ff6a2a" : "#6ef0ff";
    ctx.lineWidth = 3;
    ctx.strokeRect(-20, -50, 40, 18);
    ctx.fillStyle = gray ? "#c9cdd6" : "#ffd0e8";
    ctx.beginPath();
    ctx.ellipse(28, -56, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(25, -58, 2.4, 0, Math.PI * 2);
    ctx.arc(33, -58, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = gray ? "#6b7280" : "#ff8ad4";
    ctx.beginPath();
    ctx.moveTo(-20, -88);
    ctx.lineTo(-6, -68);
    ctx.lineTo(-30, -68);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, -90);
    ctx.lineTo(22, -68);
    ctx.lineTo(-2, -68);
    ctx.fill();
    ctx.fillStyle = gray ? "#ffb020" : "#6ef0ff";
    ctx.fillRect(-16, -74, 12, 8);
    ctx.fillRect(4, -74, 12, 8);
    ctx.fillStyle = "#ccc";
    ctx.fillRect(-4, -92, 6, 12);
    if (gray) {
      ctx.fillStyle = "#5a616e";
      ctx.fillRect(20, -70, 28, 10);
      ctx.fillStyle = "#3b404a";
      ctx.fillRect(40, -74, 14, 18);
      ctx.fillStyle = "#e23b2f";
      ctx.beginPath();
      ctx.arc(54, -65, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    if (footImg.complete && footImg.naturalWidth) {
      ctx.drawImage(footImg, -48, -36, 46, 38);
      ctx.drawImage(footImg, 2, -36, 46, 38);
    }
    ctx.restore();
  }

  function drawHero() {
    const box = playerBox();
    const x = player.x - cameraX;
    const blink = performance.now() < invulnUntil && Math.floor(performance.now() / 90) % 2 === 0;
    ctx.save();
    ctx.globalAlpha = blink ? 0.45 : 1;
    ctx.translate(x, player.y);
    ctx.scale(player.facing, 1);

    if (player.form === "truck") {
      ctx.fillStyle = "#1c3f9a";
      ctx.fillRect(-50, -44, 96, 30);
      ctx.fillStyle = "#2f6dff";
      ctx.fillRect(10, -62, 40, 22);
      ctx.fillStyle = "#7cf0ff";
      ctx.fillRect(18, -56, 22, 12);
      ctx.fillStyle = "#ffcc33";
      ctx.fillRect(-50, -34, 14, 10);
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(-26, -12, 11, 0, Math.PI * 2);
      ctx.arc(30, -12, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#aaa";
      ctx.beginPath();
      ctx.arc(-26, -12, 5, 0, Math.PI * 2);
      ctx.arc(30, -12, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#16357f";
      ctx.fillRect(-20, -58, 16, 36);
      ctx.fillRect(4, -58, 16, 36);
      ctx.fillStyle = "#2d62ff";
      ctx.fillRect(-24, -90, 48, 36);
      ctx.fillStyle = "#ffcc33";
      ctx.fillRect(-10, -80, 20, 14);
      ctx.fillStyle = "#8be7ff";
      ctx.fillRect(-16, -114, 32, 26);
      ctx.fillStyle = "#111";
      ctx.fillRect(-14, -106, 28, 10);
      ctx.fillStyle = "#ff4d4d";
      ctx.fillRect(22, -84, 22, 10);
      ctx.fillStyle = "#dbe7ff";
      ctx.fillRect(-32, -86, 12, 26);
      ctx.fillRect(20, -78, 12, 20);
      ctx.fillStyle = "#ffcc33";
      ctx.fillRect(-6, -58, 12, 8);
    }
    ctx.restore();
    return box;
  }

  function drawShots() {
    for (const shot of shots) {
      if (shot.from === "tomato") {
        const x = shot.x - cameraX + shot.w / 2;
        const y = shot.y + shot.h / 2;
        ctx.fillStyle = "#e23b2f";
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2f8a3a";
        ctx.fillRect(x - 2, y - 13, 4, 6);
        ctx.fillStyle = "#fff6";
        ctx.beginPath();
        ctx.arc(x - 3, y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = shot.from === "hero" ? "#7cf0ff" : "#ff7ab6";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fillRect(shot.x - cameraX, shot.y, shot.w, shot.h);
        ctx.shadowBlur = 0;
      }
    }
  }

  function draw() {
    drawSky();
    drawPlatforms();
    pickups.forEach(drawPickup);
    pigs.forEach(drawPig);
    drawShots();
    if (player.shieldHits > 0) {
      ctx.strokeStyle = "rgba(124, 240, 255, 0.7)";
      ctx.lineWidth = 3;
      const box = playerBox();
      ctx.beginPath();
      ctx.arc(player.x - cameraX, player.y - box.h / 2, 52, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawHero();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "700 14px Nunito";
    ctx.textAlign = "left";
    ctx.fillText("T = transform   F/J = shoot   Space = jump", 16, 24);
  }

  function loop() {
    if (mode === "play") {
      updatePlayer();
      updatePigs();
      updateShots();
      updatePickups();
    }
    draw();
    requestAnimationFrame(loop);
  }

  function startGame() {
    resetGame();
    hideOverlay();
    mode = "play";
  }

  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (e.key === "t" || e.key === "T") transform();
    if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "Spacebar"].includes(e.key)) {
      e.preventDefault();
    }
    if ((e.key === "Enter" || e.key === " ") && mode !== "play") startGame();
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

  document.querySelectorAll(".controls button").forEach((btn) => {
    const act = btn.dataset.act;
    const down = (e) => {
      e.preventDefault();
      if (act === "transform") transform();
      else if (act === "shoot") {
        held.shoot = true;
        shoot();
      } else if (act === "jump") held.jump = true;
      else held[act] = true;
    };
    const up = () => {
      if (act === "left" || act === "right" || act === "jump" || act === "shoot") {
        held[act] = false;
      }
    };
    btn.addEventListener("mousedown", down);
    btn.addEventListener("mouseup", up);
    btn.addEventListener("mouseleave", up);
    btn.addEventListener("touchstart", down, { passive: false });
    btn.addEventListener("touchend", up);
  });

  startBtn.addEventListener("click", startGame);
  resetGame();
  requestAnimationFrame(loop);
})();
