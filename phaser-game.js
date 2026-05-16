const canvas = document.getElementById("game");
const characterScreen = document.getElementById("characterScreen");
const characterCards = document.getElementById("characterCards");
const scenarioScreen = document.getElementById("scenarioScreen");
const scenarioCards = document.getElementById("scenarioCards");
const scenarioSubtitle = document.getElementById("scenarioSubtitle");
const backToCharacters = document.getElementById("backToCharacters");
const viewRanking = document.getElementById("viewRanking");
const rankingScreen = document.getElementById("rankingScreen");
const rankingList = document.getElementById("rankingList");
const backToCharactersFromRanking = document.getElementById("backToCharactersFromRanking");

const W = 960;
const H = 540;
const TOTAL_STAGES = 10;
const WORLD_WIDTH = W * TOTAL_STAGES;
const FLOOR_Y = 464;
const RECORDS_KEY = "pipepanic_records";
const HIGH_SCORE_KEY = "pipepanic_highscore";

let selectedCharacter = null;
let selectedScenario = null;
let phaserScene = null;

function renderCharacterCards() {
  characterCards.innerHTML = "";
  for (const character of characters.filter(character => !character.enemyOnly)) {
    const button = document.createElement("button");
    button.className = "card";
    button.type = "button";
    button.style.setProperty("--accent", character.accent);
    button.style.setProperty("--cap", character.cap);
    button.style.setProperty("--body", character.overalls);
    button.innerHTML = `
      <div class="portrait" aria-hidden="true">
        <div class="mini-plumber">
          <div class="cap"></div><div class="head"></div><div class="body"></div>
          <div class="leg left"></div><div class="leg right"></div>
        </div>
      </div>
      <h2>${character.name}</h2>
      <div class="role">${character.title}</div>
      <ul class="stats">${character.notes.map(note => `<li>${note}</li>`).join("")}</ul>
    `;
    button.addEventListener("click", () => chooseCharacter(character));
    characterCards.appendChild(button);
  }
}

function renderScenarioCards() {
  scenarioCards.innerHTML = "";
  for (const scenario of scenarios) {
    const button = document.createElement("button");
    button.className = "card";
    button.type = "button";
    button.style.setProperty("--accent", scenario.water);
    button.style.setProperty("--sky", scenario.sky);
    button.style.setProperty("--ground", scenario.ground);
    button.style.setProperty("--water", scenario.water);
    button.style.setProperty("--landmark", scenario.landmark);
    button.innerHTML = `
      <div class="scenario-preview" aria-hidden="true"></div>
      <h2>${scenario.name}</h2>
      <div class="role">${scenario.title}</div>
      <ul class="stats">${scenario.notes.map(note => `<li>${note}</li>`).join("")}</ul>
    `;
    button.addEventListener("click", () => startGame(scenario));
    scenarioCards.appendChild(button);
  }
}

function chooseCharacter(character) {
  selectedCharacter = character;
  characterScreen.classList.add("hidden");
  scenarioScreen.classList.remove("hidden");
  scenarioSubtitle.textContent = `${character.name} está listo. Ahora elige dónde empieza el caos.`;
}

function startGame(scenario) {
  selectedScenario = scenario;
  scenarioScreen.classList.add("hidden");
  rankingScreen.classList.add("hidden");
  phaserScene.startRun(selectedCharacter, selectedScenario);
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]");
  } catch (error) {
    return [];
  }
}

function saveRecord(score, complete) {
  const records = loadRecords();
  const record = {
    score: Math.floor(score),
    characterName: selectedCharacter?.name || "Sin personaje",
    scenarioName: selectedScenario?.name || "Sin lugar",
    zonesCompleted: phaserScene?.currentStage || 1,
    cause: complete ? "completed" : "down",
    date: new Date().toLocaleDateString("es-ES")
  };
  records.push(record);
  records.sort((a, b) => b.score - a.score);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records.slice(0, 20)));
  const highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || "0", 10);
  if (record.score > highScore) localStorage.setItem(HIGH_SCORE_KEY, String(record.score));
}

function renderRanking() {
  const records = loadRecords();
  if (!records.length) {
    rankingList.innerHTML = `<p class="subtitle">Todavía no hay partidas guardadas.</p>`;
    return;
  }
  rankingList.innerHTML = `
    <table class="ranking-table">
      <thead><tr><th>#</th><th>Puntos</th><th>Personaje</th><th>Lugar</th><th>Zonas</th><th>Fecha</th></tr></thead>
      <tbody>
        ${records.map((record, index) => `
          <tr>
            <td class="rank">${index + 1}</td>
            <td class="score-cell">${record.score}</td>
            <td>${record.characterName}</td>
            <td>${record.scenarioName}</td>
            <td>${record.zonesCompleted}/10</td>
            <td class="date-cell">${record.date}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

class MainScene extends Phaser.Scene {
  constructor() {
    super("main");
  }

  create() {
    phaserScene = this;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,E,F,ONE,TWO,THREE,ESC,ENTER");
    this.createTextures();
    this.showAttract();
  }

  createTextures() {
    this.makeRectTexture("pipe-pixel", 42, 26, 0x8792a8);
    this.makeRectTexture("enemy-pixel", 34, 58, 0x7c4dff);
    this.makeRectTexture("rat-pixel", 34, 22, 0x6b6470);
    this.makeRectTexture("drop-pixel", 8, 14, 0x42e8ff);
    this.makeRectTexture("coffee-pixel", 22, 22, 0xffd166);
    this.makeRectTexture("plunger-pixel", 18, 12, 0xdbeaf2);
  }

  makeRectTexture(key, width, height, color) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(0, 0, width, height, Math.min(8, width / 4));
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }

  showAttract() {
    this.cameras.main.setBackgroundColor("#07111f");
    this.add.text(W / 2, H / 2, "PIPE PANIC PHASER", { fontFamily: "system-ui", fontSize: 42, fontStyle: "900", color: "#42e8ff" }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 + 46, "Elige personaje para empezar", { fontFamily: "system-ui", fontSize: 18, color: "#9cb8c9" }).setOrigin(0.5);
  }

  startRun(character, scenario) {
    this.children.removeAll();
    this.physics.world.colliders.destroy();

    this.character = character;
    this.scenario = scenario;
    this.currentStage = 1;
    this.score = 0;
    this.waterLevel = 0;
    this.health = 5;
    this.gameOver = false;
    this.recordSaved = false;
    this.noticeTimer = 0;
    this.noticeText = "";
    this.nextEventAt = 8;
    this.activeEvent = null;
    this.caffeineTimer = 0;
    this.rainTimer = 0;
    this.windTimer = 0;
    this.earthquakeTimer = 0;
    this.attackCooldown = 0;
    this.currentToolIndex = 0;

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, H);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, H);
    this.cameras.main.setBackgroundColor(scenario.sky);

    this.createWorld();
    this.createPlayer();
    this.createHud();
    this.showNotice(`MUNDO PHASER: ${scenario.name.toUpperCase()}`, 2.4);
  }

  createWorld() {
    this.grounds = this.physics.add.staticGroup();
    this.pipes = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.drops = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.physics.add.overlap(this.projectiles, this.enemies, (projectile, enemy) => {
      this.damageEnemy(enemy, projectile.damage || 1);
      projectile.destroy();
    });

    for (let stage = 0; stage < TOTAL_STAGES; stage++) {
      const screen = this.scenario.screens[stage];
      const groundY = screen.groundY || FLOOR_Y;
      const ground = this.add.rectangle(stage * W + W / 2, groundY + 42, W, 84, Phaser.Display.Color.HexStringToColor(this.scenario.ground).color);
      this.physics.add.existing(ground, true);
      this.grounds.add(ground);

      const pipeCount = screen.pipeCount || 4;
      for (let i = 0; i < pipeCount; i++) {
        const x = stage * W + 110 + i * (W - 220) / Math.max(1, pipeCount - 1);
        const y = this.scenario.pipeY[i % this.scenario.pipeY.length] || 110;
        const pipe = this.pipes.create(x, y, "pipe-pixel");
        pipe.leak = Phaser.Math.FloatBetween(0.45, 1.1) * screen.difficulty * this.scenario.leakMod;
        pipe.spawnTimer = Phaser.Math.FloatBetween(0.2, 0.8);
      }

      this.spawnStageEnemies(stage + 1, stage * W, screen);
      this.add.text(stage * W + 38, groundY - 28, screen.name, { fontFamily: "system-ui", fontSize: 18, fontStyle: "800", color: "#f5fbff" });
    }
  }

  createPlayer() {
    this.player = this.add.container(80, this.getFloorY(80) - 58);
    const body = this.add.rectangle(0, 20, 34, 58, Phaser.Display.Color.HexStringToColor(this.character.overalls).color);
    const head = this.add.rectangle(0, -18, 26, 24, 0xf0b47a);
    const cap = this.add.rectangle(0, -34, 38, 14, Phaser.Display.Color.HexStringToColor(this.character.cap).color);
    this.player.add([body, head, cap]);
    this.physics.add.existing(this.player);
    this.player.body.setSize(34, 58).setOffset(-17, -9).setCollideWorldBounds(true);
    this.player.facing = 1;
    this.physics.add.collider(this.player, this.grounds);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  createHud() {
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(100);
    const panel = this.add.rectangle(18, 16, 430, 178, 0x030c16, 0.76).setOrigin(0, 0);
    const sidePanel = this.add.rectangle(W - 286, 16, 268, 148, 0x030c16, 0.76).setOrigin(0, 0);
    this.hudText = this.add.text(34, 34, "", { fontFamily: "system-ui", fontSize: 14, color: "#dbeaf2", lineSpacing: 7 });
    this.sideText = this.add.text(W - 268, 34, "", { fontFamily: "system-ui", fontSize: 14, color: "#dbeaf2", lineSpacing: 8 });
    this.notice = this.add.text(W / 2, 145, "", { fontFamily: "system-ui", fontSize: 30, fontStyle: "900", color: "#ffd166", stroke: "#000000", strokeThickness: 7 }).setOrigin(0.5);
    this.hud.add([panel, sidePanel, this.hudText, this.sideText, this.notice]);
  }

  spawnStageEnemies(stage, areaStart, screen) {
    const types = ["rat", stage >= 3 ? "thief" : "rat", stage >= 5 ? "knife" : "dog", stage >= 7 ? "dj" : "rat"];
    if (stage >= 4 && stage < 6) types.push("mariKarmen");
    if (stage >= 6 && stage < 8) types.push("alcalde");
    if (stage >= 8) types.push("hincha");

    const count = Math.min(7, Math.floor(stage / 2) + 2);
    for (let i = 0; i < count; i++) this.spawnEnemy(types[i % types.length], areaStart + Phaser.Math.Between(240, W - 100), screen);
  }

  spawnEnemy(type, x, screen) {
    const texture = type === "rat" ? "rat-pixel" : "enemy-pixel";
    const enemy = this.enemies.create(x, this.getFloorY(x) - (type === "rat" ? 22 : 58), texture);
    enemy.type = type;
    enemy.specialType = ["mariKarmen", "alcalde", "hincha"].includes(type) ? type : null;
    enemy.hp = type === "rat" ? 1 : 3;
    enemy.damage = type === "mariKarmen" ? 0 : type === "knife" ? 2 : 1;
    enemy.attackTimer = Phaser.Math.FloatBetween(1, 3);
    enemy.body.setVelocityX(Phaser.Math.Between(45, 80) * (Math.random() > 0.5 ? 1 : -1) * (screen?.difficulty || 1));
    enemy.body.setCollideWorldBounds(false);
    enemy.setTint(this.enemyColor(type));
    this.physics.add.collider(enemy, this.grounds);
  }

  update(time, deltaMs) {
    if (!this.player || !this.character || this.gameOver) {
      if (this.gameOver && Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) this.returnToSelection();
      return;
    }

    const dt = deltaMs / 1000;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.updatePlayer(dt);
    this.updatePipes(dt);
    this.updateProjectiles();
    this.updateEnemies(dt);
    this.updateEvents(dt);
    this.updateWater(dt);
    this.updateHud(dt);

    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) this.returnToSelection();
  }

  updatePlayer(dt) {
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.W) || Phaser.Input.Keyboard.JustDown(this.cursors.space);
    const caffeineMod = this.caffeineTimer > 0 ? 1.8 : 1;
    const speed = 220 * this.character.speedMod * caffeineMod;

    if (Phaser.Input.Keyboard.JustDown(this.keys.ONE)) this.currentToolIndex = 0;
    if (Phaser.Input.Keyboard.JustDown(this.keys.TWO)) this.currentToolIndex = 1;
    if (Phaser.Input.Keyboard.JustDown(this.keys.THREE)) this.currentToolIndex = 2;

    if (left) {
      this.player.body.setVelocityX(-speed);
      this.player.facing = -1;
      this.player.setScale(-1, 1);
    } else if (right) {
      this.player.body.setVelocityX(speed);
      this.player.facing = 1;
      this.player.setScale(1, 1);
    } else {
      this.player.body.setVelocityX(0);
    }

    if (jump && this.player.body.blocked.down) this.player.body.setVelocityY(-500 * this.character.jumpMod);
    if (Phaser.Input.Keyboard.JustDown(this.keys.F) && this.attackCooldown <= 0) this.attack();
    if (this.keys.E.isDown) this.repair(dt);

    if (this.windTimer > 0) this.player.body.velocity.x += Math.sin(performance.now() / 260) * 80 * dt;
    this.currentStage = Phaser.Math.Clamp(Math.floor(this.player.x / W) + 1, 1, TOTAL_STAGES);
  }

  attack() {
    const tool = this.currentTool();
    this.attackCooldown = tool.cooldown;
    if (tool.id === "wrench") {
      this.hitEnemiesInRange(tool.range, tool.damage, 0.2);
      return;
    }

    if (tool.id === "plunger") {
      const projectile = this.projectiles.create(this.player.x + this.player.facing * 30, this.player.y + 18, "plunger-pixel");
      projectile.damage = tool.damage;
      projectile.body.allowGravity = false;
      projectile.body.setVelocityX(this.player.facing * 430);
      projectile.life = 1;
      return;
    }

    this.hitEnemiesInRange(tool.range, 0, 1.8);
    this.repair(0.16, true);
  }

  hitEnemiesInRange(range, damage, slowSeconds) {
    this.enemies.children.each(enemy => {
      if (!enemy.active) return;
      const inFront = Math.sign(enemy.x - this.player.x || this.player.facing) === this.player.facing;
      if (!inFront || Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) > range) return;
      if (damage > 0) this.damageEnemy(enemy, damage);
      enemy.body.setVelocityX(enemy.body.velocity.x * 0.35);
      enemy.slowTimer = Math.max(enemy.slowTimer || 0, slowSeconds);
    });
  }

  repair(dt, fromTape = false) {
    let target = null;
    this.pipes.children.each(pipe => {
      const range = fromTape ? 92 : 56;
      if (!target && pipe.leak > 0 && Math.abs(pipe.x - this.player.x) < range && Math.abs(pipe.y - this.player.y) < 220) target = pipe;
    });
    if (!target) return;
    const rustyMod = this.activeEvent?.type === "tools" ? 0.5 : 1;
    const tapeBoost = fromTape ? 1.4 : 1;
    target.leak = Math.max(0, target.leak - 0.75 * this.character.repairMod * rustyMod * tapeBoost * dt);
    target.setAlpha(target.leak > 0 ? 1 : 0.35);
    this.score += 18 * dt * this.character.repairMod * rustyMod;
    if (target.leak <= 0) this.showNotice("¡AVERÍA SELLADA!", 0.8);
  }

  updateProjectiles() {
    this.projectiles.children.each(projectile => {
      if (!projectile.active) return;
      projectile.life -= this.game.loop.delta / 1000;
      if (projectile.life <= 0 || projectile.x < 0 || projectile.x > WORLD_WIDTH) projectile.destroy();
    });
  }

  updatePipes(dt) {
    const waterMod = this.activeEvent?.type === "water" ? 2 : 1;
    this.pipes.children.each(pipe => {
      if (pipe.leak <= 0) return;
      if (pipe.x < this.cameras.main.scrollX - W * 0.25 || pipe.x > this.cameras.main.scrollX + W * 1.25) return;
      pipe.spawnTimer -= dt * waterMod;
      if (pipe.spawnTimer <= 0) {
        const drop = this.drops.create(pipe.x + Phaser.Math.Between(-16, 16), pipe.y + 24, "drop-pixel");
        drop.body.setVelocityY(Phaser.Math.Between(145, 230) * waterMod * this.scenario.dropSpeedMod);
        drop.body.allowGravity = false;
        pipe.spawnTimer = Phaser.Math.FloatBetween(0.2, 0.55) / Math.max(pipe.leak, 0.25);
      }
    });

    this.drops.children.each(drop => {
      if (!drop.active) return;
      if (drop.y > this.getFloorY(drop.x) - this.waterLevel) {
        this.waterLevel += 0.16;
        drop.destroy();
      }
    });
  }

  updateEnemies(dt) {
    this.enemies.children.each(enemy => {
      if (!enemy.active) return;
      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= dt;
        enemy.body.setVelocityX(enemy.body.velocity.x * 0.96);
      }
      const areaStart = Math.floor(enemy.x / W) * W;
      if (enemy.x < areaStart + 40 || enemy.x > areaStart + W - 40) enemy.body.setVelocityX(-enemy.body.velocity.x);

      if (enemy.specialType === "mariKarmen") {
        this.enemies.children.each(other => {
          if (other !== enemy && Math.abs(other.x - enemy.x) < 150) other.body.velocity.x += Math.sign(other.x - enemy.x || 1) * 20 * dt;
        });
      }

      if (enemy.specialType === "alcalde") {
        enemy.attackTimer -= dt;
        if (enemy.attackTimer <= 0 && this.enemies.countActive(true) < 36) {
          this.spawnEnemy("rat", Phaser.Math.Clamp(enemy.x + Phaser.Math.Between(-110, 110), 40, WORLD_WIDTH - 80), this.currentScreen());
          enemy.attackTimer = Phaser.Math.FloatBetween(2.2, 3.6);
          this.showNotice("¡EL ALCALDE TRAE MÁS RATAS!", 0.9);
        }
      }

      if (enemy.specialType === "hincha") {
        enemy.attackTimer -= dt;
        if (Math.abs(enemy.x - this.player.x) < 190) {
          this.player.body.velocity.x += Math.sign(this.player.x - enemy.x || 1) * 130 * dt;
          if (enemy.attackTimer <= 0) {
            this.damagePlayer(0.5);
            enemy.attackTimer = 2.3;
          }
        }
      }

      if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), enemy.getBounds())) {
        if (enemy.specialType !== "mariKarmen") this.damagePlayer(enemy.damage || 1);
        enemy.body.setVelocityX(-enemy.body.velocity.x);
      }
    });
  }

  updateEvents(dt) {
    this.nextEventAt -= dt;
    if (this.nextEventAt <= 0) {
      this.triggerRandomEvent();
      this.nextEventAt = Phaser.Math.FloatBetween(15, 25);
    }
    if (this.noticeTimer > 0) this.noticeTimer -= dt;
    if (this.activeEvent) {
      this.activeEvent.timer -= dt;
      if (this.activeEvent.timer <= 0) this.activeEvent = null;
    }
    if (this.caffeineTimer > 0) this.caffeineTimer -= dt;
    if (this.rainTimer > 0) {
      this.rainTimer -= dt;
      this.waterLevel = Math.min(100, this.waterLevel + 4 * dt);
    }
    if (this.windTimer > 0) this.windTimer -= dt;
    if (this.earthquakeTimer > 0) {
      this.earthquakeTimer -= dt;
      if (Math.random() < 0.2) {
        const drop = this.drops.create(this.cameras.main.scrollX + Phaser.Math.Between(80, W - 80), 0, "drop-pixel");
        drop.body.setVelocityY(280);
        drop.body.allowGravity = false;
      }
    }
  }

  triggerRandomEvent() {
    const eventPool = ["galerna", "traineras", "bretxa", "tamborrada", "sirena", "topo", "marea", "aldapa", "jazzaldia", "pintxo", "portua", "igeldo"];
    const eventName = Phaser.Utils.Array.GetRandom(eventPool);
    if (eventName === "galerna") {
      this.activeEvent = { type: "water", timer: 8 };
      this.rainTimer = 8;
      this.showNotice("¡GALERNA EN LA CONCHA!", 3);
    } else if (eventName === "traineras") {
      const pickup = this.pickups.create(this.player.x + Phaser.Math.Between(-180, 180), 40, "coffee-pixel");
      pickup.body.setVelocityY(90);
      pickup.body.allowGravity = false;
      this.physics.add.overlap(this.player, pickup, () => {
        this.caffeineTimer = 7;
        pickup.destroy();
        this.showNotice("¡TRAINERAS DE PASAIA! VELOCIDAD", 2);
      });
      this.showNotice("¡TRAINERAS DE PASAIA!", 3);
    } else if (eventName === "bretxa") {
      this.activeEvent = { type: "tools", timer: 10 };
      this.showNotice("¡MERCADO DE LA BRETXA!", 3);
    } else if (eventName === "tamborrada") {
      this.enemies.children.each(enemy => enemy.body.setVelocityX(enemy.body.velocity.x * 0.25));
      this.showNotice("¡TAMBORRADA!", 3);
    } else if (eventName === "sirena") {
      this.enemies.children.each(enemy => enemy.body.setVelocityX(-enemy.body.velocity.x));
      this.showNotice("¡SIRENA DEL PUERTO!", 3);
    } else if (eventName === "topo") {
      this.windTimer = 8;
      this.showNotice("¡TOPO AVERIADO!", 3);
    } else if (eventName === "marea") {
      this.waterLevel = Math.min(100, this.waterLevel + 24);
      this.showNotice("¡MAREA VIVA EN PASAIA!", 3);
    } else if (eventName === "aldapa") {
      for (let i = 0; i < 4; i++) this.spawnEnemy("rat", this.player.x + Phaser.Math.Between(-180, 180), this.currentScreen());
      this.showNotice("¡ALDAPA DE MIRACRUZ!", 3);
    } else if (eventName === "jazzaldia") {
      this.score += 120;
      this.enemies.children.each(enemy => enemy.body.setVelocityX(enemy.body.velocity.x * 0.4));
      this.showNotice("¡JAZZALDIA! +120", 3);
    } else if (eventName === "pintxo") {
      this.health = Math.min(5, this.health + 1);
      this.score += 80;
      this.showNotice("¡PINTXO DE LA PARTE VIEJA!", 3);
    } else if (eventName === "portua") {
      this.repairNearbyPipes(0.5);
      this.score += 60;
      this.showNotice("¡PORTUA DE PASAIA! REFUERZOS", 3);
    } else if (eventName === "igeldo") {
      this.earthquakeTimer = 6;
      this.showNotice("¡MONTE IGELDO TIEMBLA!", 3);
    }
  }

  updateWater(dt) {
    if (!this.waterRect) this.waterRect = this.add.rectangle(0, H, WORLD_WIDTH, 0, Phaser.Display.Color.HexStringToColor(this.scenario.water).color, 0.78).setOrigin(0, 1).setDepth(30);
    this.waterRect.height = this.waterLevel;
    if (this.waterLevel >= this.player.y + 40) this.endRun(false, "¡TALLER INUNDADO!");
    if (this.pipes.children.entries.every(pipe => pipe.leak <= 0)) this.endRun(true, "¡BARRIO COMPLETADO!");
  }

  updateHud() {
    const repaired = this.pipes.children.entries.filter(pipe => pipe.leak <= 0).length;
    const effect = this.rainTimer > 0 ? "Galerna activa" : this.windTimer > 0 ? "Topo averiado" : this.earthquakeTimer > 0 ? "Igeldo tiembla" : this.activeEvent ? "Evento activo" : "Explora y repara";
    const tool = this.currentTool();
    const cooldown = this.attackCooldown > 0 ? ` · ${this.attackCooldown.toFixed(1)}s` : "";
    this.hudText.setText([
      `${this.character.name} - ${this.character.title}`,
      `Lugar: ${this.scenario.name} · Zona ${this.currentStage}/${TOTAL_STAGES}`,
      `Tramo: ${this.currentScreen().name}`,
      `Averías: ${repaired}/${this.pipes.countActive(true)} · Agua: ${Math.floor(this.waterLevel)}%`,
      `Puntuación: ${Math.floor(this.score)}`,
      effect
    ]);
    this.sideText.setText([
      `Vida: ${"♥".repeat(Math.max(0, Math.ceil(this.health)))}`,
      `${tool.key}: ${tool.name}${cooldown}`,
      tool.description,
      "E: reparar tubería",
      `Récord: ${localStorage.getItem(HIGH_SCORE_KEY) || 0}`
    ]);
    this.notice.setText(this.noticeTimer > 0 ? this.noticeText : "");
  }

  damageEnemy(enemy, amount) {
    enemy.hp -= amount;
    enemy.setTint(0xffffff);
    this.time.delayedCall(90, () => enemy.active && enemy.setTint(this.enemyColor(enemy.type)));
    if (enemy.hp <= 0) {
      this.score += 35;
      enemy.destroy();
    }
  }

  currentTool() {
    const set = toolSets[this.character?.id] || tools;
    return set[this.currentToolIndex] || set[0];
  }

  damagePlayer(amount) {
    if (this.invulnerableUntil && this.time.now < this.invulnerableUntil) return;
    this.health = Math.max(0, this.health - amount);
    this.invulnerableUntil = this.time.now + 650;
    this.cameras.main.shake(90, 0.006);
    if (this.health <= 0) this.endRun(false, "¡FUERA DE SERVICIO!");
  }

  repairNearbyPipes(amount) {
    this.pipes.children.each(pipe => {
      if (Math.abs(pipe.x - this.player.x) < 360) {
        pipe.leak = Math.max(0, pipe.leak - amount);
        pipe.setAlpha(pipe.leak > 0 ? 1 : 0.35);
      }
    });
  }

  endRun(complete, message) {
    if (this.gameOver) return;
    this.gameOver = true;
    if (!this.recordSaved) {
      saveRecord(this.score, complete);
      this.recordSaved = true;
    }
    this.showNotice(`${message} Pulsa Enter`, 99);
    this.physics.pause();
  }

  returnToSelection() {
    this.scene.restart();
    characterScreen.classList.remove("hidden");
    scenarioScreen.classList.add("hidden");
    rankingScreen.classList.add("hidden");
  }

  showNotice(text, timer) {
    this.noticeText = text;
    this.noticeTimer = timer;
  }

  currentScreen() {
    return this.scenario.screens[this.currentStage - 1] || this.scenario.screens[0];
  }

  getFloorY(x) {
    const stage = Phaser.Math.Clamp(Math.floor(x / W), 0, TOTAL_STAGES - 1);
    return this.scenario.screens[stage]?.groundY || FLOOR_Y;
  }

  enemyColor(type) {
    if (type === "mariKarmen") return 0xc44060;
    if (type === "alcalde") return 0xe03030;
    if (type === "hincha") return 0x1a4d8c;
    if (type === "knife") return 0x2d2a33;
    if (type === "dj") return 0x7c4dff;
    if (type === "dog") return 0x8b5a2b;
    if (type === "thief") return 0x303044;
    return 0x6b6470;
  }
}

const phaserGame = new Phaser.Game({
  type: Phaser.CANVAS,
  width: W,
  height: H,
  canvas,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1180 },
      debug: false
    }
  },
  scene: [MainScene]
});

backToCharacters.addEventListener("click", () => {
  scenarioScreen.classList.add("hidden");
  characterScreen.classList.remove("hidden");
});

viewRanking.addEventListener("click", () => {
  renderRanking();
  characterScreen.classList.add("hidden");
  rankingScreen.classList.remove("hidden");
});

backToCharactersFromRanking.addEventListener("click", () => {
  rankingScreen.classList.add("hidden");
  characterScreen.classList.remove("hidden");
});

document.addEventListener("keydown", event => {
  const scene = phaserScene;
  if (!scene?.character || scene.gameOver) return;
  if (event.key === "1") scene.currentToolIndex = 0;
  if (event.key === "2") scene.currentToolIndex = 1;
  if (event.key === "3") scene.currentToolIndex = 2;
  if ((event.key === "f" || event.key === "F") && scene.attackCooldown <= 0) scene.attack();
});

renderCharacterCards();
renderScenarioCards();
