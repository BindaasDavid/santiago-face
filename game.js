(() => {
  const TILE = 24;
  const COLS = 28;
  const SPEED = 2;
  const GHOST_SPEED = 1.85;
  const FRIGHT_SPEED = 1.2;
  const FRIGHT_MS = 7000;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const startBtn = document.getElementById("start-btn");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const levelEl = document.getElementById("level");

  canvas.width = COLS * TILE;

  // 0 empty, 1 wall, 2 pellet, 3 power, 4 ghost house, 5 gate
  const MAZE = [
    "1111111111111111111111111111",
    "1222222222222112222222222221",
    "1311112111112112111112111131",
    "1211112111112112111112111121",
    "1222222222222222222222222221",
    "1211112112111111112112111121",
    "1222222112222112222112222221",
    "1111112111110110111112111111",
    "0000012110000000000112100000",
    "1111112110111551110112111111",
    "0000002000104444010002000000",
    "1111112110104444010112111111",
    "0000012110111111110112100000",
    "0000012110000000000112100000",
    "1111112110111111110112111111",
    "1222222222222112222222222221",
    "1211112111112112111112111121",
    "1322112222222002222222112231",
    "1112112112111111112112112111",
    "1222222112222112222112222221",
    "1211111111112112111111111121",
    "1222222222222222222222222221",
    "1111111111111111111111111111",
  ];

  const MAP_ROWS = MAZE.length;
  canvas.height = MAP_ROWS * TILE;

  const DIRS = {
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
  };

  const ENEMIES = [
    { name: "Santi-Red", hue: 0, saturate: 1.15, brightness: 1, ring: "#ff3b3b" },
    { name: "Santi-Pink", hue: 310, saturate: 1.35, brightness: 1.05, ring: "#ff7ad9" },
    { name: "Santi-Cyan", hue: 180, saturate: 1.4, brightness: 1.1, ring: "#4df0ff" },
    { name: "Santi-Gold", hue: 42, saturate: 1.6, brightness: 1.15, ring: "#ffc14d" },
  ];

  const faceImg = new Image();
  faceImg.src = "santiago.jpg";

  let grid;
  let pelletsLeft;
  let player;
  let ghosts;
  let keys = {};
  let queuedDir = null;
  let score = 0;
  let lives = 3;
  let level = 1;
  let mode = "title";
  let frightUntil = 0;
  let lastTs = 0;
  let mouth = 0;
  let eatStreak = 0;
  let invulnUntil = 0;

  function parseMaze() {
    grid = MAZE.map((row) => row.split("").map((ch) => Number(ch)));
    pelletsLeft = 0;
    for (const row of grid) {
      for (const cell of row) {
        if (cell === 2 || cell === 3) pelletsLeft += 1;
      }
    }
  }

  function tileAt(x, y) {
    if (y < 0 || y >= MAP_ROWS) return 1;
    const row = grid[y];
    let col = x;
    if (col < 0) col += COLS;
    if (col >= COLS) col -= COLS;
    return row[col];
  }

  function walkable(x, y, canHouse) {
    const t = tileAt(x, y);
    if (t === 1) return false;
    if (t === 5 && !canHouse) return false;
    return true;
  }

  function centerOf(col, row) {
    return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
  }

  function resetActors() {
    const start = centerOf(13, 17);
    player = {
      x: start.x,
      y: start.y,
      dir: DIRS.left,
      next: DIRS.left,
      radius: 10,
    };
    const house = [
      centerOf(13, 11),
      centerOf(12, 11),
      centerOf(14, 11),
      centerOf(13, 10),
    ];
    ghosts = ENEMIES.map((look, i) => ({
      ...look,
      x: house[i].x,
      y: house[i].y,
      dir: i % 2 === 0 ? DIRS.left : DIRS.right,
      home: i === 0 ? centerOf(13, 8) : house[i],
      released: i === 0,
      releaseAt: performance.now() + i * 1800,
      frightened: false,
      eaten: false,
    }));
    queuedDir = DIRS.left;
    frightUntil = 0;
    eatStreak = 0;
    invulnUntil = performance.now() + 4000;
  }

  function resetLevel() {
    parseMaze();
    resetActors();
  }

  function aligned(entity) {
    const cx = (entity.x - TILE / 2) % TILE;
    const cy = (entity.y - TILE / 2) % TILE;
    return Math.abs(cx) < 0.8 && Math.abs(cy) < 0.8;
  }

  function snap(entity) {
    entity.x = Math.round((entity.x - TILE / 2) / TILE) * TILE + TILE / 2;
    entity.y = Math.round((entity.y - TILE / 2) / TILE) * TILE + TILE / 2;
    if (entity.x < 0) entity.x += COLS * TILE;
    if (entity.x >= COLS * TILE) entity.x -= COLS * TILE;
  }

  function tilePos(entity) {
    let col = Math.round((entity.x - TILE / 2) / TILE);
    const row = Math.round((entity.y - TILE / 2) / TILE);
    if (col < 0) col += COLS;
    if (col >= COLS) col -= COLS;
    return { col, row };
  }

  function inHouse(entity) {
    const { col, row } = tilePos(entity);
    const t = tileAt(col, row);
    return t === 4 || t === 5;
  }

  function canMove(entity, dir, canHouse) {
    const { col, row } = tilePos(entity);
    return walkable(col + dir.x, row + dir.y, canHouse);
  }

  function stepEntity(entity, speed, canHouse) {
    if (aligned(entity)) {
      snap(entity);
      if (entity.next && canMove(entity, entity.next, canHouse)) {
        entity.dir = entity.next;
      } else if (!canMove(entity, entity.dir, canHouse)) {
        return;
      }
    }
    entity.x += entity.dir.x * speed;
    entity.y += entity.dir.y * speed;
    if (entity.x < -TILE / 2) entity.x += COLS * TILE;
    if (entity.x > COLS * TILE + TILE / 2) entity.x -= COLS * TILE;
  }

  function opposite(dir) {
    return { x: -dir.x, y: -dir.y };
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function ghostTarget(ghost, now) {
    if (ghost.eaten) return centerOf(13, 11);
    const { col, row } = tilePos(player);
    if (ghost.frightened) {
      return centerOf((col + 14) % COLS, MAP_ROWS - 1 - row);
    }
    if (ghost.name === "Santi-Pink") {
      return centerOf(col + player.dir.x * 4, row + player.dir.y * 4);
    }
    if (ghost.name === "Santi-Cyan") {
      return centerOf(col + 2, row + 2);
    }
    if (ghost.name === "Santi-Gold") {
      return dist(ghost, player) < 120 ? centerOf(1, MAP_ROWS - 2) : centerOf(col, row);
    }
    const scatter = now % 18000 < 5000;
    return scatter ? centerOf(26, 1) : centerOf(col, row);
  }

  function chooseGhostDir(ghost, now) {
    const target = ghostTarget(ghost, now);
    const options = [DIRS.up, DIRS.left, DIRS.down, DIRS.right].filter((dir) => {
      const opp = opposite(ghost.dir);
      if (dir.x === opp.x && dir.y === opp.y) return false;
      return canMove(ghost, dir, ghost.eaten || !ghost.released || inHouse(ghost));
    });
    if (!options.length) {
      ghost.next = opposite(ghost.dir);
      return;
    }
    let best = options[0];
    let bestScore = Infinity;
    for (const dir of options) {
      const { col, row } = tilePos(ghost);
      const nx = (col + dir.x) * TILE + TILE / 2;
      const ny = (row + dir.y) * TILE + TILE / 2;
      const scoreDir = Math.hypot(nx - target.x, ny - target.y);
      if (scoreDir < bestScore) {
        bestScore = scoreDir;
        best = dir;
      }
    }
    ghost.next = best;
  }

  function updatePlayer() {
    if (queuedDir) player.next = queuedDir;
    stepEntity(player, SPEED * (1 + (level - 1) * 0.06), false);
    const { col, row } = tilePos(player);
    const cell = tileAt(col, row);
    if (cell === 2 || cell === 3) {
      grid[row][col] = 0;
      pelletsLeft -= 1;
      if (cell === 2) {
        score += 10;
      } else {
        score += 50;
        frightUntil = performance.now() + FRIGHT_MS;
        eatStreak = 0;
        ghosts.forEach((g) => {
          if (!g.eaten) {
            g.frightened = true;
            g.dir = opposite(g.dir);
          }
        });
      }
      updateHud();
      if (pelletsLeft <= 0) {
        level += 1;
        resetLevel();
        updateHud();
      }
    }
  }

  function updateGhosts(now) {
    for (const ghost of ghosts) {
      if (!ghost.released && now >= ghost.releaseAt) ghost.released = true;
      ghost.frightened = now < frightUntil && !ghost.eaten;
      if (aligned(ghost)) {
        snap(ghost);
        chooseGhostDir(ghost, now);
      }
      const speed = ghost.eaten
        ? SPEED * 2.2
        : ghost.frightened
          ? FRIGHT_SPEED
          : GHOST_SPEED + (level - 1) * 0.08;
      stepEntity(ghost, speed, ghost.eaten || !ghost.released || inHouse(ghost));
      if (ghost.eaten && dist(ghost, centerOf(13, 11)) < 8) {
        ghost.eaten = false;
        ghost.frightened = false;
      }
      if (dist(ghost, player) < 14 && performance.now() > invulnUntil) {
        if (ghost.frightened && !ghost.eaten) {
          eatStreak += 1;
          score += 200 * eatStreak;
          ghost.eaten = true;
          ghost.frightened = false;
          updateHud();
        } else if (!ghost.eaten && !ghost.frightened) {
          loseLife();
          return;
        }
      }
    }
  }

  function loseLife() {
    lives -= 1;
    updateHud();
    if (lives <= 0) {
      mode = "over";
      showOverlay("Game Over", `Final score ${score}. The Santiagos win this round.`);
      return;
    }
    resetActors();
  }

  function updateHud() {
    scoreEl.textContent = String(score);
    livesEl.textContent = String(lives);
    levelEl.textContent = String(level);
  }

  function showOverlay(title, text) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    startBtn.textContent = title === "Game Over" ? "Play Again" : "Start Game";
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function isWall(x, y) {
    if (y < 0 || y >= MAP_ROWS || x < 0 || x >= COLS) return false;
    return grid[y][x] === 1;
  }

  function drawMaze() {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#2b4cff";
    for (let y = 0; y < MAP_ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const cell = grid[y][x];
        const px = x * TILE;
        const py = y * TILE;
        if (cell === 1) {
          const inset = 5;
          if (!isWall(x, y - 1)) {
            ctx.beginPath();
            ctx.moveTo(px + inset, py + inset);
            ctx.lineTo(px + TILE - inset, py + inset);
            ctx.stroke();
          }
          if (!isWall(x, y + 1)) {
            ctx.beginPath();
            ctx.moveTo(px + inset, py + TILE - inset);
            ctx.lineTo(px + TILE - inset, py + TILE - inset);
            ctx.stroke();
          }
          if (!isWall(x - 1, y)) {
            ctx.beginPath();
            ctx.moveTo(px + inset, py + inset);
            ctx.lineTo(px + inset, py + TILE - inset);
            ctx.stroke();
          }
          if (!isWall(x + 1, y)) {
            ctx.beginPath();
            ctx.moveTo(px + TILE - inset, py + inset);
            ctx.lineTo(px + TILE - inset, py + TILE - inset);
            ctx.stroke();
          }
        } else if (cell === 5) {
          ctx.fillStyle = "#ffb4e6";
          ctx.fillRect(px + 2, py + TILE / 2 - 2, TILE - 4, 4);
        } else if (cell === 2) {
          ctx.fillStyle = "#ffd27a";
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === 3) {
          ctx.fillStyle = "#fff4b0";
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawPlayer(now) {
    mouth = 0.25 + Math.abs(Math.sin(now / 90)) * 0.28;
    const angle = Math.atan2(player.dir.y, player.dir.x);
    ctx.globalAlpha = performance.now() < invulnUntil ? 0.55 + 0.45 * Math.sin(now / 80) : 1;
    ctx.fillStyle = "#ffe14a";
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.arc(player.x, player.y, player.radius, angle + mouth, angle - mouth);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawFace(ghost, now) {
    const r = 16;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ghost.x, ghost.y, r, 0, Math.PI * 2);
    ctx.clip();
    if (ghost.eaten) {
      ctx.fillStyle = "#111";
      ctx.fillRect(ghost.x - r, ghost.y - r, r * 2, r * 2);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ghost.x - 4, ghost.y - 2, 2.5, 0, Math.PI * 2);
      ctx.arc(ghost.x + 4, ghost.y - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const frightened = ghost.frightened && Math.floor(now / 140) % 2 === 0;
      ctx.filter = frightened
        ? "hue-rotate(210deg) saturate(1.8) brightness(0.85)"
        : `hue-rotate(${ghost.hue}deg) saturate(${ghost.saturate}) brightness(${ghost.brightness})`;
      const faceH = r * 2.7;
      const faceW = faceH * 0.86;
      ctx.drawImage(faceImg, ghost.x - faceW / 2, ghost.y - faceH * 0.42, faceW, faceH);
      ctx.filter = "none";
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(ghost.x, ghost.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = ghost.frightened ? "#6aa8ff" : ghost.ring;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function draw(now) {
    ctx.fillStyle = "#05050a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawMaze();
    drawPlayer(now);
    ghosts.forEach((g) => drawFace(g, now));
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    lastTs = ts;
    if (mode === "play") {
      updatePlayer();
      updateGhosts(ts);
    }
    draw(ts);
    requestAnimationFrame(loop);
  }

  function startGame() {
    score = 0;
    lives = 3;
    level = 1;
    resetLevel();
    updateHud();
    hideOverlay();
    mode = "play";
  }

  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    const map = {
      ArrowLeft: DIRS.left,
      a: DIRS.left,
      A: DIRS.left,
      ArrowRight: DIRS.right,
      d: DIRS.right,
      D: DIRS.right,
      ArrowUp: DIRS.up,
      w: DIRS.up,
      W: DIRS.up,
      ArrowDown: DIRS.down,
      s: DIRS.down,
      S: DIRS.down,
    };
    if (map[e.key]) {
      queuedDir = map[e.key];
      e.preventDefault();
    }
    if ((e.key === "Enter" || e.key === " ") && mode !== "play") startGame();
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

  startBtn.addEventListener("click", startGame);

  document.querySelectorAll(".dpad button").forEach((btn) => {
    const setDir = () => {
      queuedDir = DIRS[btn.dataset.dir];
    };
    btn.addEventListener("click", setDir);
    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      setDir();
    });
  });

  parseMaze();
  resetActors();
  updateHud();
  faceImg.onload = () => requestAnimationFrame(loop);
  if (faceImg.complete) requestAnimationFrame(loop);
})();
