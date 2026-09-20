(() => {
  const W = 960;
  const H = 540;
  const WORLD = 9600;
  const BOSS_X = 6200;
  const KNIGHT_X = 8000;
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
  const bossEl = document.getElementById("boss");
  const powerEl = document.getElementById("power");
  const modeEl = document.getElementById("mode");

  const footImg = new Image();
  footImg.src = "pig-foot.png";
  const whaleFaceA = new Image();
  whaleFaceA.src = "princess-a.png";
  const whaleFaceB = new Image();
  whaleFaceB.src = "princess-b.jpg";
  const heroFace = new Image();
  heroFace.src = "hero-face.png";

  const SPEED_STEPS = [0.65, 1, 1.45, 2.1];

  let audioCtx = null;

  const keys = {};
  const held = { left: false, right: false, jump: false, shoot: false };

  let mode = "title";
  let player;
  let pigs;
  let whales;
  let knight;
  let shots;
  let drones;
  let pickups;
  let platforms;
  let shieldCrystals;
  let bossesSpawned;
  let walkAccum = 0;
  let gogoBuf = "";
  let gogoUntil = 0;
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
      jumpsLeft: 99,
      jumpHeld: false,
      muzzleUntil: 0,
      squeezeUntil: 0,
      invisible: false,
      swarmProtect: false,
      transformingUntil: 0,
      nextForm: "robot",
      lastBomb: 0,
      lastGogo: 0,
      speedIndex: 1,
    };
    platforms = [
      { x: 0, y: GROUND, w: WORLD, h: 80 },
      { x: 720, y: 360, w: 180, h: 20 },
      { x: 1180, y: 300, w: 200, h: 20 },
      { x: 1680, y: 350, w: 160, h: 20 },
      { x: 2280, y: 340, w: 220, h: 20 },
      { x: 2580, y: 300, w: 160, h: 20 },
      { x: 2780, y: 250, w: 280, h: 20 },
      { x: 3300, y: 360, w: 200, h: 20 },
      { x: 3680, y: 290, w: 180, h: 20 },
      { x: 4100, y: 340, w: 220, h: 20 },
      { x: 4520, y: 280, w: 200, h: 20 },
      { x: 4980, y: 360, w: 240, h: 20 },
      { x: 5400, y: 300, w: 180, h: 20 },
      { x: 5750, y: 240, w: 220, h: 20 },
      { x: 6400, y: 360, w: 160, h: 20 },
      { x: 6900, y: 300, w: 180, h: 20 },
      { x: 7400, y: 360, w: 200, h: 20 },
    ];
    pigs = [
      makePig(520, GROUND, 420, 700, "pink"),
      makePig(980, 360, 730, 880, "gray"),
      makePig(1500, GROUND, 1360, 1720, "pink"),
      makePig(1880, 350, 1680, 1820, "gray"),
      makePig(2050, GROUND, 1900, 2240, "pink"),
      makePig(2460, 340, 2290, 2480, "gray"),
      makePig(3000, GROUND, 2860, 3240, "pink"),
      makePig(3380, 360, 3300, 3480, "gray"),
      makePig(3800, GROUND, 3600, 4000, "pink"),
      makePig(4180, 340, 4100, 4300, "gray"),
      makePig(4600, GROUND, 4400, 4800, "pink"),
      makePig(5080, 360, 4980, 5200, "gray"),
      makePig(5480, GROUND, 5300, 5680, "pink"),
      makePig(5840, 240, 5750, 5960, "gray"),
    ];
    pickups = [
      makePickup(640, 320, "heart"),
      makePickup(1260, 250, "rapid"),
      makePickup(900, GROUND - 40, "shield"),
      makePickup(1720, 300, "shield"),
      makePickup(2360, 290, "power"),
      makePickup(2700, GROUND - 40, "heart"),
      makePickup(3380, 310, "rapid"),
      makePickup(3760, 240, "heart"),
      makePickup(3000, GROUND - 40, "shield"),
      makePickup(4200, 290, "shield"),
      makePickup(4600, GROUND - 40, "power"),
      makePickup(5080, 310, "heart"),
      makePickup(5480, 250, "rapid"),
      makePickup(6100, GROUND - 40, "heart"),
      makePickup(5000, 250, "shield"),
      makePickup(6450, 310, "shield"),
      makePickup(7680, GROUND - 40, "shield"),
      makePickup(7200, GROUND - 40, "power"),
      makePickup(820, GROUND - 40, "squeeze"),
      makePickup(2100, 290, "squeeze"),
      makePickup(4000, GROUND - 40, "squeeze"),
      makePickup(5600, 250, "squeeze"),
      makePickup(6300, GROUND - 40, "squeeze"),
    ];
    whales = [
      makeWhale(6800, 300, 6400, 7600, 96, whaleFaceA),
      makeWhale(7450, 210, 7000, 7900, 80, whaleFaceB),
    ];
    bossesSpawned = false;
    shieldCrystals = [];
    walkAccum = 0;
    gogoBuf = "";
    gogoUntil = 0;
    knight = {
      x: 8600,
      y: GROUND,
      vx: 2.1,
      vy: 0,
      left: 8100,
      right: 9300,
      hp: 80,
      maxHp: 80,
      facing: -1,
      hurtUntil: 0,
      lastSlash: 0,
      lastHop: 0,
      onGround: true,
    };
    shots = [];
    drones = [];
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
      maxHp: kind === "gray" ? 4 : 3,
      lastRegen: 0,
      kind,
      facing: 1,
      hurtUntil: 0,
      lastTomato: 0,
    };
  }

  function makePickup(x, y, kind) {
    return { x, y, kind, taken: false, bob: Math.random() * 6 };
  }

  function makeWhale(x, y, left, right, hp, face) {
    return {
      x,
      y,
      left,
      right,
      vx: 1.35,
      hp,
      maxHp: hp,
      facing: -1,
      hurtUntil: 0,
      lastTomato: 0,
      bob: Math.random() * 4,
      face,
      shields: 3,
      shieldFlash: 0,
    };
  }

  function whaleShielded(whale) {
    return whale.shields > 0;
  }

  function bossesShielded() {
    return whales.some((w) => w.hp > 0 && whaleShielded(w));
  }

  function remainingBossShields() {
    return whales.reduce((sum, w) => sum + (w.hp > 0 ? w.shields : 0), 0);
  }

  function inCrystalParkour() {
    return shieldCrystals.some((c) => !c.taken && player.x > c.zoneL && player.x < c.zoneR);
  }

  function spawnBossArena() {
    if (bossesSpawned) return;
    bossesSpawned = true;
    for (const whale of whales) {
      whale.shields = 3;
      whale.shieldFlash = performance.now() + 500;
    }
    platforms.push(
      { x: 6248, y: 400, w: 88, h: 16, parkour: true },
      { x: 6370, y: 338, w: 72, h: 16, parkour: true },
      { x: 6488, y: 276, w: 68, h: 16, parkour: true },
      { x: 6604, y: 214, w: 66, h: 16, parkour: true },
      { x: 6478, y: 154, w: 70, h: 16, parkour: true },
      { x: 6336, y: 100, w: 78, h: 16, parkour: true },
      { x: 6188, y: 52, w: 100, h: 16, parkour: true },
      { x: 6920, y: 390, w: 80, h: 16, parkour: true },
      { x: 7040, y: 328, w: 70, h: 16, parkour: true },
      { x: 7160, y: 266, w: 66, h: 16, parkour: true },
      { x: 7284, y: 204, w: 64, h: 16, parkour: true },
      { x: 7168, y: 142, w: 68, h: 16, parkour: true },
      { x: 7024, y: 88, w: 76, h: 16, parkour: true },
      { x: 6880, y: 42, w: 96, h: 16, parkour: true },
      { x: 7520, y: 380, w: 82, h: 16, parkour: true },
      { x: 7648, y: 316, w: 70, h: 16, parkour: true },
      { x: 7770, y: 252, w: 66, h: 16, parkour: true },
      { x: 7888, y: 188, w: 64, h: 16, parkour: true },
      { x: 7764, y: 124, w: 70, h: 16, parkour: true },
      { x: 7620, y: 68, w: 80, h: 16, parkour: true },
      { x: 7488, y: 28, w: 100, h: 16, parkour: true }
    );
    shieldCrystals = [
      { x: 6236, y: 14, taken: false, bob: 0, zoneL: 6160, zoneR: 6720 },
      { x: 6926, y: 6, taken: false, bob: 1.2, zoneL: 6840, zoneR: 7360 },
      { x: 7536, y: 8, taken: false, bob: 2.4, zoneL: 7460, zoneR: 7980 },
    ];
  }

  function breakOneBossShieldLayer(crystal) {
    if (!crystal || crystal.taken) return;
    crystal.taken = true;
    for (const whale of whales) {
      if (whale.shields > 0) {
        whale.shields -= 1;
        whale.shieldFlash = performance.now() + 280;
      }
    }
    updateHud();
  }

  function hitWhale(whale, dmg) {
    if (whale.hp <= 0) return false;
    if (whaleShielded(whale)) {
      whale.shieldFlash = performance.now() + 180;
      return false;
    }
    whale.hp -= dmg;
    whale.hurtUntil = performance.now() + 180;
    return true;
  }

  function toggleSwarmProtect() {
    player.swarmProtect = !player.swarmProtect;
    if (player.swarmProtect && drones.filter((d) => d.kind === "guard").length === 0) {
      for (let i = 0; i < 8; i += 1) {
        drones.push({
          kind: "guard",
          angle: (Math.PI * 2 * i) / 8,
          x: player.x,
          y: player.y - 90,
          flap: i,
        });
      }
    }
    if (!player.swarmProtect) drones = drones.filter((d) => d.kind !== "guard");
    updateHud();
  }

  function launchDroneBombs() {
    const now = performance.now();
    if (now - (player.lastBomb || 0) < 400) return;
    player.lastBomb = now;
    for (let i = 0; i < 8; i += 1) {
      drones.push({
        kind: "bomb",
        x: player.x + (i - 3.5) * 20,
        y: player.y - 46,
        vx: (i - 3.5) * 1.5 + player.facing * 1.1,
        vy: -8.4 - (i % 3) * 0.6,
        flap: i,
        ttl: 180,
        life: 1,
      });
    }
  }

  function activateGogoDrones() {
    if (mode !== "play") return;
    if (!player.swarmProtect) toggleSwarmProtect();
    player.lastBomb = 0;
    launchDroneBombs();
    for (let i = 0; i < 12; i += 1) {
      drones.push({
        kind: "attack",
        x: player.x + (i - 5.5) * 16,
        y: player.y - 120 - (i % 4) * 14,
        vx: player.facing * (5.4 + (i % 5) * 0.45),
        vy: -0.8 + (i % 3) * 0.2,
        flap: i * 0.55,
        ttl: 280,
        life: 1,
      });
    }
    updateHud();
  }

  function noteGogoKey(key) {
    const letter = String(key).toLowerCase();
    if (letter !== "g" && letter !== "o") {
      gogoBuf = "";
      return;
    }
    const now = performance.now();
    if (now > gogoUntil) gogoBuf = "";
    gogoUntil = now + 1000;
    gogoBuf += letter;
    if (gogoBuf.length > 4) gogoBuf = gogoBuf.slice(-4);
    if (gogoBuf === "gogo") {
      gogoBuf = "";
      activateGogoDrones();
    }
  }

  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function playMeow(ac, dest, start, duration, startHz, peakHz, endHz, volume) {
    const osc = ac.createOscillator();
    const formant = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();
    osc.type = "sawtooth";
    formant.type = "triangle";
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(900, start);
    filter.Q.value = 6;
    osc.frequency.setValueAtTime(startHz, start);
    osc.frequency.exponentialRampToValueAtTime(peakHz, start + duration * 0.35);
    osc.frequency.exponentialRampToValueAtTime(endHz, start + duration);
    formant.frequency.setValueAtTime(startHz * 2.1, start);
    formant.frequency.exponentialRampToValueAtTime(peakHz * 2.3, start + duration * 0.35);
    formant.frequency.exponentialRampToValueAtTime(endHz * 1.8, start + duration);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(filter);
    formant.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(start);
    formant.start(start);
    osc.stop(start + duration + 0.02);
    formant.stop(start + duration + 0.02);
  }

  function playSynthTransform() {
    const ac = ensureAudio();
    const t0 = ac.currentTime;
    const master = ac.createGain();
    master.gain.value = 0.85;
    master.connect(ac.destination);
    const hops = [
      [0.0, 0.11, 280, 420, 240, 0.18],
      [0.1, 0.11, 320, 520, 280, 0.2],
      [0.2, 0.12, 380, 640, 320, 0.22],
      [0.32, 0.12, 460, 780, 400, 0.24],
      [0.44, 0.14, 520, 880, 360, 0.26],
    ];
    hops.forEach((m) => playMeow(ac, master, t0 + m[0], m[1], m[2], m[3], m[4], m[5]));
    playMeow(ac, master, t0 + 0.58, 0.42, 240, 720, 160, 0.32);
  }

  function playTransformSound() {
    ensureAudio();
    playSynthTransform();
  }

  function playQuack() {
    const ac = ensureAudio();
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const noise = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();
    osc.type = "square";
    noise.type = "sawtooth";
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(780, t0);
    filter.frequency.exponentialRampToValueAtTime(240, t0 + 0.12);
    filter.Q.value = 7;
    osc.frequency.setValueAtTime(420, t0);
    osc.frequency.exponentialRampToValueAtTime(170, t0 + 0.13);
    noise.frequency.setValueAtTime(90, t0);
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
    osc.connect(filter);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    noise.start(t0);
    osc.stop(t0 + 0.16);
    noise.stop(t0 + 0.16);
  }

  function updateHud() {
    hpEl.textContent = String(Math.max(0, player.hp));
    pigsLeftEl.textContent = String(pigs.filter((p) => p.hp > 0).length);
    const whaleHp = whales.filter((w) => w.hp > 0).reduce((sum, w) => sum + w.hp, 0);
    const knightHp = knight && knight.hp > 0 ? knight.hp : 0;
    const total = whaleHp + knightHp;
    if (bossesSpawned && bossesShielded()) bossEl.textContent = `SHIELD ${remainingBossShields()}`;
    else bossEl.textContent = total > 0 ? String(total) : "DOWN";
    const now = performance.now();
    let power = "NONE";
    if (player.shieldHits > 0) power = "SHIELD";
    if (now < player.powerUntil) power = "BLAST";
    if (now < player.rapidUntil) power = "RAPID";
    if (player.invisible) power = "INVIS";
    if (player.swarmProtect) power = "SWARM";
    if (now < player.squeezeUntil) power = "GOGO";
    powerEl.textContent = power;
    modeEl.textContent = player.form === "truck" ? "TRUCK" : "ROBOT";
    const speedEl = document.getElementById("speed");
    if (speedEl) speedEl.textContent = `${SPEED_STEPS[player.speedIndex].toFixed(2)}x`;
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

  function isTransforming() {
    return performance.now() < player.transformingUntil;
  }

  function transform() {
    const now = performance.now();
    if (isTransforming()) return;
    if (now - lastTransform < 400) return;
    lastTransform = now;
    player.nextForm = player.form === "robot" ? "truck" : "robot";
    player.transformingUntil = now + 720;
    playTransformSound();
  }

  function transformBlend() {
    if (!isTransforming()) return player.form === "truck" ? 1 : 0;
    const p = 1 - (player.transformingUntil - performance.now()) / 720;
    return player.nextForm === "truck" ? p : 1 - p;
  }

  function shoot() {
    const now = performance.now();
    if (player.form !== "robot") return;
    const wait = now < player.rapidUntil ? 90 : 200;
    if (now - lastShot < wait) return;
    lastShot = now;
    player.muzzleUntil = now + 90;
    const box = playerBox();
    const powered = now < player.powerUntil;
    const size = powered ? 16 : 12;
    shots.push({
      x: player.facing > 0 ? box.x + box.w + 6 : box.x - size - 6,
      y: box.y + 28,
      w: size,
      h: size,
      vx: player.facing * (powered ? 15 : 12),
      vy: 0,
      from: "blaster",
      dmg: powered ? 2 : 1,
    });
  }

  function isInvincible() {
    const now = performance.now();
    return now < invulnUntil || now < player.squeezeUntil;
  }

  function changeSpeed(dir) {
    player.speedIndex = Math.max(0, Math.min(SPEED_STEPS.length - 1, player.speedIndex + dir));
    updateHud();
  }

  function toggleInvisible() {
    player.invisible = !player.invisible;
    updateHud();
  }

  function hurtPlayer() {
    if (isInvincible()) return;
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
    const right = keys.ArrowRight || held.right;
    const jumpHeld = keys[" "] || keys.w || keys.W || held.jump;
    const mul = SPEED_STEPS[player.speedIndex] || 1;
    const speed = (player.form === "truck" ? 6.6 : 4.1) * mul;

    if (left) {
      player.vx = -speed;
      player.facing = -1;
    } else if (right) {
      player.vx = speed;
      player.facing = 1;
    } else {
      player.vx *= 0.78;
    }

    if (jumpHeld && !player.jumpHeld) {
      if (!inCrystalParkour() || player.onGround) {
        player.vy = -12.6;
        player.onGround = false;
      }
    }
    player.jumpHeld = jumpHeld;

    if (player.transformingUntil && performance.now() >= player.transformingUntil) {
      player.form = player.nextForm;
      player.transformingUntil = 0;
      updateHud();
    }

    if ((keys.f || keys.F || keys.j || keys.J || held.shoot) && player.form === "robot" && !isTransforming()) {
      shoot();
    }

    player.vy += GRAVITY;
    player.x += player.vx;

    let box = playerBox();
    if (box.x < 20) player.x += 20 - box.x;
    if (box.x + box.w > WORLD - 20) player.x -= box.x + box.w - (WORLD - 20);

    box = playerBox();
    const wallBox = { x: box.x, y: box.y + 10, w: box.w, h: Math.max(20, box.h - 28) };
    const hitX = solidAt(wallBox, 0);
    if (hitX && hitX.y < GROUND - 1 && box.y + box.h > hitX.y + 18) {
      if (player.vx > 0) player.x = hitX.x - box.w / 2 - 1;
      if (player.vx < 0) player.x = hitX.x + hitX.w + box.w / 2 + 1;
      player.vx = 0;
    }

    player.y += player.vy;
    if (player.y > GROUND + 80) {
      player.y = GROUND;
      player.vy = 0;
    }
    box = playerBox();
    player.onGround = false;
    const hitY = solidAt(box, 0);
    if (hitY && player.vy >= 0 && box.y + box.h - Math.max(player.vy, 1) <= hitY.y + 16) {
      player.y = hitY.y;
      player.vy = 0;
      player.onGround = true;
      player.jumpsLeft = 2;
    }

    if (player.onGround && Math.abs(player.vx) > 1.15) {
      walkAccum += Math.abs(player.vx);
      if (walkAccum > 26) {
        walkAccum = 0;
        playQuack();
      }
    } else if (Math.abs(player.vx) < 0.4) {
      walkAccum = 16;
    }

    const targetCam = Math.max(0, Math.min(WORLD - W, player.x - 340));
    cameraX += (targetCam - cameraX) * 0.14;
  }

  function pigBox(pig) {
    return { x: pig.x - 44, y: pig.y - 92, w: 88, h: 92 };
  }

  function whaleBox(whale) {
    return { x: whale.x - 110, y: whale.y - 70, w: 220, h: 120 };
  }

  function updateWhales() {
    for (const whale of whales) {
      if (whale.hp <= 0) continue;
      whale.bob += 0.035;
      whale.x += whale.vx;
      if (whale.x < whale.left || whale.x > whale.right) {
        whale.vx *= -1;
        whale.x = Math.max(whale.left, Math.min(whale.right, whale.x));
      }
      whale.facing = player.invisible ? (whale.vx >= 0 ? 1 : -1) : player.x >= whale.x ? 1 : -1;
      const now = performance.now();
      const inFight = player.x > BOSS_X - 200 && !player.invisible;
      if (inFight && now - whale.lastTomato > 1100) {
        whale.lastTomato = now;
        const dir = whale.facing;
        shots.push({
          x: whale.x + dir * 90,
          y: whale.y + Math.sin(whale.bob) * 12,
          w: 54,
          h: 54,
          vx: dir * 4.2,
          vy: -5.4,
          from: "jumbo",
        });
      }
      if (rectsHit(playerBox(), whaleBox(whale))) {
        if (player.form === "truck" && Math.abs(player.vx) > 3.5) {
          if (hitWhale(whale, 1)) {
            player.vx = -player.facing * 8;
            updateHud();
            checkWin();
          } else {
            player.vx = -player.facing * 10;
          }
        } else {
          hurtPlayer();
        }
      }
    }
  }

  function updateCrystal() {
    if (player.x > BOSS_X) spawnBossArena();
    for (const crystal of shieldCrystals) {
      if (crystal.taken) continue;
      crystal.bob += 0.1;
      const box = {
        x: crystal.x - 16,
        y: crystal.y - 18 + Math.sin(crystal.bob) * 5,
        w: 32,
        h: 36,
      };
      if (rectsHit(playerBox(), box)) breakOneBossShieldLayer(crystal);
    }
  }

  function updatePigs() {
    for (const pig of pigs) {
      if (pig.hp <= 0) continue;
      pig.x += pig.vx;
      if (pig.x < pig.left || pig.x > pig.right) {
        pig.vx *= -1;
        pig.x = Math.max(pig.left, Math.min(pig.right, pig.x));
      }
      pig.facing = player.invisible ? (pig.vx >= 0 ? 1 : -1) : player.x >= pig.x ? 1 : -1;

      const now = performance.now();
      if (now - pig.lastRegen > 2200 && now > pig.hurtUntil + 600 && pig.hp < pig.maxHp) {
        pig.hp = Math.min(pig.maxHp, pig.hp + 1);
        pig.lastRegen = now;
      }
      if (!player.invisible && pig.kind === "gray" && now - pig.lastTomato > 1400 && Math.abs(pig.x - player.x) < 520) {
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
      } else if (!player.invisible && pig.kind === "pink" && Math.random() < 0.002 && Math.abs(pig.x - player.x) < 320) {
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
      if (shot.from === "tomato" || shot.from === "jumbo") shot.vy += 0.28;
      shot.x += shot.vx;
      shot.y += shot.vy || 0;
      if (shot.y > GROUND - (shot.from === "jumbo" ? 28 : 8) && (shot.from === "tomato" || shot.from === "jumbo")) {
        return false;
      }
      if (shot.x < cameraX - 120 || shot.x > cameraX + W + 120) return false;
      if (player.swarmProtect && (shot.from === "tomato" || shot.from === "jumbo" || shot.from === "pig")) {
        const blocked = drones.some((d) => {
          if (d.kind !== "guard") return false;
          return Math.hypot(d.x - shot.x, d.y - shot.y) < 30;
        });
        if (blocked) return false;
      }
      const box = { x: shot.x, y: shot.y, w: shot.w, h: shot.h };
      if (shot.from === "blaster") {
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
        for (const whale of whales) {
          if (whale.hp > 0 && rectsHit(box, whaleBox(whale))) {
            if (hitWhale(whale, shot.dmg || 1)) {
              updateHud();
              checkWin();
            }
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
      if (item.kind === "shield") player.shieldHits = Math.min(6, player.shieldHits + 3);
      if (item.kind === "squeeze") player.squeezeUntil = now + 20000;
      updateHud();
    }
  }

  function hurtEnemyAt(box, dmg) {
    let hit = false;
    for (const pig of pigs) {
      if (pig.hp > 0 && rectsHit(box, pigBox(pig))) {
        pig.hp -= dmg;
        pig.hurtUntil = performance.now() + 180;
        if (pig.hp <= 0) pig.x = -9999;
        hit = true;
      }
    }
    for (const whale of whales) {
      if (whale.hp > 0 && rectsHit(box, whaleBox(whale))) {
        if (hitWhale(whale, dmg)) hit = true;
      }
    }
    if (hit) {
      updateHud();
      checkWin();
    }
    return hit;
  }

  function nearestDroneTarget(drone) {
    let best = null;
    let bestDist = 900;
    for (const pig of pigs) {
      if (pig.hp <= 0) continue;
      const dist = Math.hypot(pig.x - drone.x, pig.y - 50 - drone.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = { x: pig.x, y: pig.y - 60 };
      }
    }
    for (const whale of whales) {
      if (whale.hp <= 0) continue;
      const dist = Math.hypot(whale.x - drone.x, whale.y - drone.y);
      if (dist < bestDist + 80) {
        bestDist = dist;
        best = { x: whale.x, y: whale.y };
      }
    }
    return best;
  }

  function steerDrone(drone, tx, ty, accel, maxSpeed) {
    const dx = tx - drone.x;
    const dy = ty - drone.y;
    const dist = Math.hypot(dx, dy) || 1;
    drone.vx += (dx / dist) * accel;
    drone.vy += (dy / dist) * accel;
    const speed = Math.hypot(drone.vx, drone.vy);
    if (speed > maxSpeed) {
      drone.vx *= maxSpeed / speed;
      drone.vy *= maxSpeed / speed;
    }
  }

  function updateDrones() {
    for (const drone of drones) {
      drone.flap = (drone.flap || 0) + 0.55;
      if (drone.kind === "guard") {
        drone.angle += 0.18;
        const hover = Math.sin(drone.flap) * 10;
        drone.x = player.x + Math.cos(drone.angle) * 90;
        drone.y = player.y - 112 + Math.sin(drone.angle * 2) * 16 + hover;
        hurtEnemyAt({ x: drone.x - 16, y: drone.y - 16, w: 32, h: 32 }, 1);
        continue;
      }
      drone.ttl -= 1;
      if (drone.kind === "bomb") {
        drone.vy += GRAVITY * 0.72;
        drone.x += drone.vx;
        drone.y += drone.vy;
        const boom = { x: drone.x - 16, y: drone.y - 16, w: 32, h: 32 };
        if (hurtEnemyAt(boom, 3) || drone.y >= GROUND - 10 || drone.ttl <= 0) drone.life = 0;
        continue;
      }
      const target = nearestDroneTarget(drone);
      if (target) {
        steerDrone(drone, target.x, target.y - 20, 0.75, 11.5);
      } else {
        steerDrone(drone, player.x + player.facing * 280, player.y - 150, 0.55, 10);
      }
      if (drone.y > GROUND - 90) drone.vy -= 0.7;
      if (drone.y < 36) drone.vy += 0.45;
      drone.x += drone.vx;
      drone.y += drone.vy;
      drone.y = Math.max(28, Math.min(GROUND - 36, drone.y));
      const boom = { x: drone.x - 16, y: drone.y - 14, w: 32, h: 28 };
      if (hurtEnemyAt(boom, 3) || drone.ttl <= 0) drone.life = 0;
    }
    drones = drones.filter((d) => d.kind === "guard" || d.life > 0);
  }

  function checkWin() {
    if (mode !== "play") return;
    if (whales.some((w) => w.hp > 0)) return;
    mode = "win";
    showOverlay("Boss Down!", "You finished the long run and beat the tomato-blasting whales.", "Play Again");
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
      } else if (plat.parkour) {
        ctx.fillStyle = "#d8f4ff";
        ctx.fillRect(x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, plat.y, plat.w, 5);
        ctx.fillStyle = "#7cf0ff";
        ctx.fillRect(x, plat.y + plat.h - 4, plat.w, 4);
      } else {
        ctx.fillStyle = "#3d4c78";
        ctx.fillRect(x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#7aa2ff";
        ctx.fillRect(x, plat.y, plat.w, 5);
      }
    }
  }

  function drawFace(img, x, y, size) {
    if (!img || !img.complete || !img.naturalWidth) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.clip();
    const scale = (size * 1.35) / Math.min(img.width, img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, x - w / 2, y - h * 0.42, w, h);
    ctx.restore();
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
    } else if (item.kind === "squeeze") {
      ctx.fillStyle = "#ff8a1a";
      ctx.fillRect(-10, -18, 20, 28);
      ctx.fillStyle = "#fff";
      ctx.fillRect(-7, -8, 14, 12);
      ctx.fillStyle = "#e23b2f";
      ctx.font = "700 7px Nunito";
      ctx.textAlign = "center";
      ctx.fillText("GOGO", 0, 1);
      ctx.fillStyle = "#2aa0e8";
      ctx.fillRect(-5, -24, 10, 8);
      ctx.fillStyle = "#ffd24a";
      ctx.fillRect(-3, -26, 6, 4);
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
    ctx.fillStyle = "#111";
    ctx.fillRect(x - 22, pig.y - 108, 44, 7);
    ctx.fillStyle = "#3dcc5a";
    ctx.fillRect(x - 22, pig.y - 108, 44 * (pig.hp / pig.maxHp), 7);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 22, pig.y - 108, 44, 7);
  }

  function drawHero() {
    const box = playerBox();
    const x = player.x - cameraX;
    const now = performance.now();
    const blink = now < invulnUntil && Math.floor(now / 90) % 2 === 0;
    ctx.save();
    if (player.invisible) ctx.globalAlpha = 0.12;
    else if (blink) ctx.globalAlpha = 0.45;
    else ctx.globalAlpha = 1;
    if (now < player.squeezeUntil && !player.invisible) {
      ctx.shadowColor = "#ff8a1a";
      ctx.shadowBlur = 18;
    }
    ctx.translate(x, player.y);
    ctx.scale(player.facing, 1);
    const blend = transformBlend();
    if (isTransforming()) {
      ctx.rotate(Math.sin(blend * Math.PI) * 0.55);
      ctx.scale(1 + Math.sin(blend * Math.PI) * 0.25, 1 - Math.sin(blend * Math.PI) * 0.18);
    }

    const truckA = blend;
    const robotA = 1 - blend;
    if (robotA > 0.08) {
      ctx.globalAlpha *= robotA;
      ctx.fillStyle = "#16357f";
      ctx.fillRect(-20, -58, 16, 36);
      ctx.fillRect(4, -58, 16, 36);
      ctx.fillStyle = "#2d62ff";
      ctx.fillRect(-24, -90, 48, 36);
      ctx.fillStyle = "#ffcc33";
      ctx.fillRect(-10, -80, 20, 14);
      ctx.fillStyle = "#8be7ff";
      ctx.fillRect(-18, -122, 36, 34);
      drawFace(heroFace, 0, -108, 36);
      ctx.fillStyle = "#dbe7ff";
      ctx.fillRect(-32, -86, 12, 26);
      ctx.fillStyle = "#1a2a4a";
      ctx.fillRect(18, -82, 28, 14);
      ctx.fillStyle = "#5ad6ff";
      ctx.fillRect(40, -79, 16, 8);
      ctx.fillStyle = "#b8f4ff";
      ctx.fillRect(52, -77, 8, 4);
      if (performance.now() < player.muzzleUntil) {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(64, -75, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#7cf0ff";
        ctx.beginPath();
        ctx.arc(72, -75, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffcc33";
      ctx.fillRect(-6, -58, 12, 8);
      ctx.globalAlpha /= robotA;
    }
    if (truckA > 0.08) {
      ctx.globalAlpha *= truckA;
      ctx.fillStyle = "#1c3f9a";
      ctx.fillRect(-50, -44, 96, 30);
      ctx.fillStyle = "#2f6dff";
      ctx.fillRect(10, -62, 40, 22);
      ctx.fillStyle = "#7cf0ff";
      ctx.fillRect(14, -58, 26, 16);
      drawFace(heroFace, 27, -50, 18);
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
    }
    ctx.restore();
    return box;
  }

  function drawDrones() {
    for (const drone of drones) {
      const x = drone.x - cameraX;
      const y = drone.y;
      ctx.save();
      ctx.translate(x, y);
      if (drone.kind === "bomb") {
        ctx.fillStyle = "#ff9a1a";
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffc85a";
        ctx.beginPath();
        ctx.arc(-4, -4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#7a3b10";
        ctx.fillRect(-2, -16, 4, 7);
        ctx.fillStyle = "#ffe36a";
        ctx.beginPath();
        ctx.arc(0, -18, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const tilt = Math.max(-0.55, Math.min(0.55, (drone.vx || 0) * 0.07));
        const wing = 11 + Math.sin(drone.flap || 0) * 6;
        ctx.rotate(tilt);
        ctx.fillStyle = "rgba(255, 60, 60, 0.22)";
        ctx.beginPath();
        ctx.ellipse(0, 13, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#e2232a";
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff6b6b";
        ctx.beginPath();
        ctx.arc(-3, -3, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffd0d0";
        ctx.fillRect(-wing - 5, -2, wing, 3);
        ctx.fillRect(5, -2, wing, 3);
      }
      ctx.restore();
    }
  }

  function drawWhale(whale) {
    if (whale.hp <= 0) return;
    const x = whale.x - cameraX;
    const y = whale.y + Math.sin(whale.bob) * 14;
    const flash = performance.now() < whale.hurtUntil;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(whale.facing, 1);
    ctx.fillStyle = flash ? "#fff" : "#6f8ea8";
    ctx.beginPath();
    ctx.ellipse(0, 10, 108, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? "#eee" : "#4d6a80";
    ctx.beginPath();
    ctx.moveTo(-100, 8);
    ctx.lineTo(-148, -18);
    ctx.lineTo(-148, 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#d7e6f2";
    ctx.beginPath();
    ctx.ellipse(18, 22, 36, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    drawFace(whale.face, 48, -8, 52);
    ctx.strokeStyle = "#ffd24a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(48, -8, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#2b3340";
    ctx.fillRect(70, -8, 42, 16);
    ctx.fillStyle = "#111";
    ctx.fillRect(108, -12, 22, 24);
    ctx.fillStyle = "#e23b2f";
    ctx.beginPath();
    ctx.arc(140, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2f8a3a";
    ctx.fillRect(136, -22, 8, 10);
    ctx.restore();
    if (whaleShielded(whale)) {
      const pulse = 0.4 + Math.sin(performance.now() / 180) * 0.1;
      const flash = performance.now() < whale.shieldFlash;
      for (let i = 0; i < whale.shields; i += 1) {
        ctx.save();
        ctx.strokeStyle = flash ? "#ffffff" : "rgba(255,255,255,0.92)";
        ctx.lineWidth = flash ? 6 : 3;
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 14;
        ctx.globalAlpha = pulse - i * 0.08;
        ctx.beginPath();
        ctx.ellipse(x, y + 8, 128 + i * 16, 78 + i * 10, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (i === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.14)";
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  function drawCrystal() {
    for (const crystal of shieldCrystals) {
      if (crystal.taken) continue;
      const x = crystal.x - cameraX;
      const y = crystal.y + Math.sin(crystal.bob) * 6;
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(14, 0);
      ctx.lineTo(0, 22);
      ctx.lineTo(-14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#b8f4ff";
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.font = "700 11px Nunito";
      ctx.textAlign = "center";
      ctx.fillText("CRYSTAL", 0, 36);
      ctx.restore();
    }
  }

  function drawTomato(shot, radius) {
    const x = shot.x - cameraX + shot.w / 2;
    const y = shot.y + shot.h / 2;
    ctx.fillStyle = "#e23b2f";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2f8a3a";
    ctx.fillRect(x - radius * 0.2, y - radius - 8, radius * 0.4, 10);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.2, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShots() {
    for (const shot of shots) {
      if (shot.from === "tomato") {
        drawTomato(shot, 9);
      } else if (shot.from === "jumbo") {
        drawTomato(shot, 28);
      } else if (shot.from === "blaster") {
        const x = shot.x - cameraX + shot.w / 2;
        const y = shot.y + shot.h / 2;
        ctx.shadowColor = "#7cf0ff";
        ctx.shadowBlur = 16;
        ctx.fillStyle = "#e8ffff";
        ctx.beginPath();
        ctx.arc(x, y, shot.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3ad6ff";
        ctx.beginPath();
        ctx.arc(x - shot.vx * 0.4, y, shot.w / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = "#ff7ab6";
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
    drawCrystal();
    whales.forEach(drawWhale);
    drawShots();
    const liveWhales = whales.filter((w) => w.hp > 0);
    if (liveWhales.length && player.x > BOSS_X - 400) {
      const hp = liveWhales.reduce((sum, w) => sum + w.hp, 0);
      const max = liveWhales.reduce((sum, w) => sum + w.maxHp, 0);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(180, 40, 600, 22);
      ctx.fillStyle = "#e23b2f";
      ctx.fillRect(180, 40, 600 * (hp / max), 22);
      ctx.strokeStyle = "#ffd24a";
      ctx.strokeRect(180, 40, 600, 22);
      ctx.fillStyle = "#fff";
      ctx.font = "700 13px Nunito";
      ctx.textAlign = "center";
      ctx.fillText(
        bossesShielded() ? `WHALE BOSSES — ${remainingBossShields()} WHITE SHIELDS` : "WHALE BOSSES",
        480,
        56
      );
    }
    if (inCrystalParkour()) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(160, 70, 640, 28);
      ctx.fillStyle = "#fff";
      ctx.font = "700 14px Nunito";
      ctx.textAlign = "center";
      ctx.fillText("Parkour to a crystal — each one breaks one shield layer", 480, 89);
    }
    if (player.shieldHits > 0) {
      ctx.strokeStyle = "rgba(124, 240, 255, 0.7)";
      ctx.lineWidth = 3;
      const box = playerBox();
      ctx.beginPath();
      ctx.arc(player.x - cameraX, player.y - box.h / 2, 52, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawHero();
    drawDrones();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "700 13px Nunito";
    ctx.textAlign = "left";
    ctx.fillText("Arrows move   D faster   S slower   T transform   type GOGO for drones", 16, 24);
  }

  function loop() {
    if (mode === "play") {
      updatePlayer();
      updatePigs();
      updateWhales();
      updateCrystal();
      updateShots();
      updatePickups();
      updateDrones();
    }
    draw();
    requestAnimationFrame(loop);
  }

  function startGame() {
    if (mode === "play") return;
    ensureAudio();
    resetGame();
    hideOverlay();
    mode = "play";
  }

  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (e.repeat) {
      if (e.key === "d" || e.key === "D" || e.key === "s" || e.key === "S") return;
    }
    if (e.key === "t" || e.key === "T") transform();
    if ((e.key === "v" || e.key === "V") && mode === "play") toggleInvisible();
    if ((e.key === "k" || e.key === "K") && mode === "play") toggleSwarmProtect();
    if ((e.key === "l" || e.key === "L") && mode === "play") launchDroneBombs();
    if (!e.repeat && mode === "play") noteGogoKey(e.key);
    if ((e.key === "d" || e.key === "D") && mode === "play") changeSpeed(1);
    if ((e.key === "s" || e.key === "S") && mode === "play") changeSpeed(-1);
    if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "Spacebar"].includes(e.key)) {
      e.preventDefault();
    }
    if ((e.key === "Enter" || (e.key === " " && mode !== "play")) && mode !== "play") startGame();
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

  document.querySelectorAll(".controls button").forEach((btn) => {
    const act = btn.dataset.act;
    const down = (e) => {
      e.preventDefault();
      if (act === "transform") transform();
      else if (act === "invis") toggleInvisible();
      else if (act === "swarm") toggleSwarmProtect();
      else if (act === "bombs") launchDroneBombs();
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
