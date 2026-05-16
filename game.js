    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    const characterScreen = document.getElementById("characterScreen");
    const characterCards = document.getElementById("characterCards");
    const scenarioScreen = document.getElementById("scenarioScreen");
    const scenarioCards = document.getElementById("scenarioCards");
    const scenarioSubtitle = document.getElementById("scenarioSubtitle");
    const backToCharacters = document.getElementById("backToCharacters");

    const W = canvas.width;
    const H = canvas.height;
    const floorY = 464;

    const keys = new Set();
    const pipes = [];
    const drops = [];
    const particles = [];
    const enemies = [];
    const projectiles = [];
    const drains = [];
    const helpers = [];
    const totalStages = 10;
    let selectedCharacter = null;
    let selectedScenario = null;
    let currentStage = 1;
    let scenarioComplete = false;
    let cameraX = 0;
    let worldWidth = W * totalStages;
    let currentToolIndex = 0;
    let attackCooldown = 0;
    let playerHealth = 5;
    let hurtTimer = 0;
    let player;
    let lastTime = 0;
    let gameStarted = false;
    let gameOver = false;
    let score = 0;
    let waterLevel = 0;
    let repairTarget = null;
    let nextEventAt = 0;
    let activeEvent = null;
    let eventNotice = { text: "", timer: 0 };
    let coffee = null;
    let caffeineTimer = 0;
    let sunTimer = 0;
    let specialEvent = null;

    function renderCharacterCards() {
      characterCards.innerHTML = "";
      for (const character of characters) {
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
      resetGame();
      syncMapToScenario(selectedScenario, 0);
      gameStarted = true;
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }

    function resetGame() {
      currentStage = 1;
      scenarioComplete = false;
      cameraX = 0;
      worldWidth = W * totalStages;
      score = 0;
      waterLevel = 0;
      playerHealth = 5;
      currentToolIndex = 0;
      attackCooldown = 0;
      hurtTimer = 0;
      loadWorld();
    }

    function loadWorld() {
      player = {
        x: 80,
        y: floorY - 58,
        w: 34,
        h: 58,
        vx: 0,
        vy: 0,
        grounded: false,
        facing: 1
      };
      pipes.length = 0;
      drops.length = 0;
      particles.length = 0;
      enemies.length = 0;
      projectiles.length = 0;
      drains.length = 0;
      helpers.length = 0;
      repairTarget = null;
      activeEvent = null;
      eventNotice = { text: "", timer: 0 };
      coffee = null;
      caffeineTimer = 0;
      sunTimer = 0;
      specialEvent = null;
      gameOver = false;
      nextEventAt = randomRange(20, 30);

      const scenario = selectedScenario || scenarios[0];
      for (let stage = 1; stage <= totalStages; stage++) {
        const screen = scenario.screens[stage - 1];
        const pipeCount = screen.pipeCount;
        const areaStart = (stage - 1) * W;
        const leftMargin = 125;
        const spacing = (W - leftMargin * 2) / Math.max(1, pipeCount - 1);
        for (let index = 0; index < pipeCount; index++) {
          pipes.push({
            x: areaStart + leftMargin + spacing * index,
            y: scenario.pipeY[index % scenario.pipeY.length] + randomRange(-10, 10),
            leak: randomRange(0.18, 0.42) * scenario.leakMod * screen.difficulty,
            difficulty: screen.difficulty,
            spawnTimer: randomRange(0, 1.5),
            repairedFlash: 0
          });
        }
        drains.push({
          x: areaStart + randomRange(180, W - 180),
          y: floorY - 10,
          clogged: randomRange(0.45, 0.82) * screen.difficulty,
          repairedFlash: 0
        });
        spawnEnemies(screen, areaStart, stage);
      }
      showNotice(`MUNDO ABIERTO: ${scenario.name.toUpperCase()}`, 2.4);
    }

    function spawnEnemies(screen, areaStart, stage) {
      const count = Math.min(6, Math.floor(stage / 2) + (stage >= 7 ? 1 : 0));
      const types = ["rat", stage >= 3 ? "thief" : "rat", stage >= 5 ? "knife" : "dog", stage >= 7 ? "dj" : "rust", stage >= 8 ? "drone" : "rat"];
      for (let i = 0; i < count; i++) {
        const type = types[i % types.length];
        const flying = type === "drone";
        const enemyW = type === "rat" ? 34 : type === "dog" ? 38 : type === "dj" || type === "knife" || type === "thief" ? 34 : 42;
        const enemyH = type === "rat" ? 22 : type === "dog" ? 24 : type === "dj" || type === "knife" || type === "thief" ? 58 : 36;
        enemies.push({
          type,
          x: areaStart + randomRange(260, W - 110),
          y: flying ? randomRange(170, 280) : floorY - enemyH,
          w: enemyW,
          h: enemyH,
          vx: randomRange(42, 72) * (Math.random() > 0.5 ? 1 : -1) * screen.difficulty,
          hp: type === "rust" ? 3 : type === "thief" || type === "knife" || type === "dj" ? 3 : 2,
          damage: type === "knife" ? 2 : 1,
          hitFlash: 0,
          stun: 0,
          flying
        });
      }
    }

    function loop(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;
      update(dt);
      draw();
      if (gameStarted) requestAnimationFrame(loop);
    }

    function update(dt) {
      if (eventNotice.timer > 0) eventNotice.timer -= dt;
      if (gameOver) {
        if (keys.has("Enter")) {
          characterScreen.classList.remove("hidden");
          scenarioScreen.classList.add("hidden");
          gameStarted = false;
        }
        return;
      }

      updateEvents(dt);
      updatePlayer(dt);
      updatePipes(dt);
      updateDrops(dt);
      updateCoffee(dt);
      updateProjectiles(dt);
      updateEnemies(dt);
      updateHelpers(dt);
      updateParticles(dt);

      const totalLeak = pipes.reduce((sum, pipe) => Math.abs(pipe.x - player.x) < W * 0.85 ? sum + pipe.leak : sum, 0);
      const repairedRatio = pipes.length ? pipes.filter(pipe => pipe.leak <= 0).length / pipes.length : 0;
      const calmFloodMod = specialEvent?.type === "calm" ? 0.55 : 1;
      const floodRate = 0.45 * selectedCharacter.floodMod * selectedScenario.floodMod * stageDifficulty() * Math.min(totalLeak, 2.1) * calmFloodMod;
      const openDrainPower = drains.reduce((sum, drain) => Math.abs(drain.x - player.x) < W * 1.1 && drain.clogged <= 0 ? sum + 1 : sum, 0);
      const sunDrain = sunTimer > 0 ? 12 : 0;
      const calmDrain = specialEvent?.type === "calm" ? 4.5 : 0;
      const drainRate = 1.1 + repairedRatio * 4.8 + openDrainPower * 2.4 + (totalLeak < 0.8 ? 2.6 : 0) + sunDrain + calmDrain;
      waterLevel = Math.max(0, waterLevel + floodRate * dt - drainRate * dt);
      if (waterLevel >= 122) {
        waterLevel = 122;
        gameOver = true;
        showNotice("¡TALLER INUNDADO! Pulsa Enter", 99);
      }
    }

    function allPipesSealed() {
      return pipes.length > 0 && pipes.every(pipe => pipe.leak <= 0);
    }

    function stageDifficulty() {
      return currentScreen().difficulty;
    }

    function currentScreen() {
      const scenario = selectedScenario || scenarios[0];
      return scenario.screens[Math.max(0, Math.min(totalStages - 1, currentStage - 1))];
    }

    function visibleX(worldX) {
      return worldX - cameraX;
    }

    function isVisible(worldX, margin = 90) {
      return worldX > cameraX - margin && worldX < cameraX + W + margin;
    }


    function updateEvents(dt) {
      if (activeEvent) {
        activeEvent.timer -= dt;
        if (activeEvent.timer <= 0) activeEvent = null;
      }

      nextEventAt -= dt;
      if (nextEventAt <= 0) {
        triggerRandomEvent();
        nextEventAt = randomRange(20, 30);
      }

      if (caffeineTimer > 0) caffeineTimer -= dt;
      if (sunTimer > 0) sunTimer -= dt;
      if (specialEvent) {
        specialEvent.timer -= dt;
        updateCharacterSpecial(dt);
        if (specialEvent.timer <= 0) specialEvent = null;
      }
    }

    function updateCharacterSpecial(dt) {
      if (specialEvent.type === "debug") {
        const pipe = nearestLeakingPipe(520);
        if (pipe) {
          pipe.leak = Math.max(0, pipe.leak - 0.22 * dt);
          pipe.repairedFlash = 0.12;
          score += 6 * dt;
        }
      }
      if (specialEvent.type === "blueprint") {
        const drain = drains.find(item => item.clogged > 0 && Math.abs(item.x - player.x) < 460);
        if (drain) drain.clogged = Math.max(0, drain.clogged - 0.14 * dt);
      }
    }

    function triggerRandomEvent() {
      const eventPool = ["water", "tools", "coffee", "sun", "neighbor", "munipa", "special"];
      const eventName = eventPool[Math.floor(Math.random() * eventPool.length)];
      if (eventName === "water") {
        activeEvent = { type: "water", timer: 8 };
        showNotice("EVENTO: ¡TORRENTE DE AGUA!", 3.2);
      }
      if (eventName === "tools") {
        activeEvent = { type: "tools", timer: 10 };
        showNotice("EVENTO: ¡HERRAMIENTAS OXIDADAS!", 3.2);
      }
      if (eventName === "coffee") {
        coffee = { x: randomRange(cameraX + 80, cameraX + W - 110), y: -30, size: 24, vy: 95, glow: 0 };
        showNotice("EVENTO: ¡SUBIDÓN DE CAFEÍNA!", 3.2);
      }
      if (eventName === "sun") {
        sunTimer = 9;
        showNotice("EVENTO: ¡SOLAZO! El agua se seca", 3.2);
      }
      if (eventName === "neighbor") {
        spawnHelper("neighbor");
        showNotice("EVENTO: ¡VECINO MANITAS!", 3.2);
      }
      if (eventName === "munipa") {
        spawnHelper("munipa");
        showNotice("EVENTO: ¡MUNIPA DE REFUERZO!", 3.2);
      }
      if (eventName === "special") triggerCharacterSpecial();
    }

    function triggerCharacterSpecial() {
      const id = selectedCharacter?.id;
      if (id === "urko") {
        specialEvent = { type: "prost", timer: 120 };
        showNotice("URKO: ¡BOCATA DEL PROST! Inmunidad", 4);
      } else if (id === "gari") {
        specialEvent = { type: "debug", timer: 18 };
        showNotice("GARI: ¡MODO INFORMÁTICA! Reparación remota", 4);
      } else if (id === "david") {
        specialEvent = { type: "caravan", timer: 18 };
        showNotice("DAVID: ¡CARAVANA ACTIVADA!", 4);
      } else if (id === "pedro") {
        specialEvent = { type: "fishknife", timer: 16 };
        showNotice("PEDRO: ¡CUCHILLO DE PESCADERO!", 4);
      } else if (id === "eider") {
        specialEvent = { type: "blueprint", timer: 20 };
        showNotice("EIDER: ¡PLANO TÉCNICO!", 4);
      } else if (id === "usoa") {
        specialEvent = { type: "calm", timer: 22 };
        showNotice("USOA: ¡CALMA TOTAL!", 4);
      }
    }

    function spawnHelper(type) {
      helpers.push({
        type,
        x: clamp(player.x + randomRange(-120, 120), 40, worldWidth - 80),
        y: floorY - 54,
        w: 34,
        h: 54,
        timer: type === "munipa" ? 14 : 12,
        actionTimer: 0
      });
    }

    function showNotice(text, timer) {
      eventNotice.text = text;
      eventNotice.timer = timer;
    }

    function updatePlayer(dt) {
      attackCooldown = Math.max(0, attackCooldown - dt);
      hurtTimer = Math.max(0, hurtTimer - dt);
      if (keys.has("1")) currentToolIndex = 0;
      if (keys.has("2")) currentToolIndex = 1;
      if (keys.has("3")) currentToolIndex = 2;

      const left = keys.has("ArrowLeft") || keys.has("a") || keys.has("A");
      const right = keys.has("ArrowRight") || keys.has("d") || keys.has("D");
      const jump = keys.has("ArrowUp") || keys.has("w") || keys.has("W") || keys.has(" ");
      const caffeineMod = caffeineTimer > 0 ? 2 : 1;
      const musicMod = reggaetonSlowActive() ? 0.72 : 1;
      const caravanMod = specialEvent?.type === "caravan" ? 1.9 : 1;
      const moveSpeed = 210 * selectedCharacter.speedMod * caffeineMod * musicMod * caravanMod;
      const acceleration = player.grounded ? 2600 : 1550;
      const friction = player.grounded ? 1700 : 360;
      const maxJump = -485 * selectedCharacter.jumpMod;

      if (left) {
        player.vx -= acceleration * dt;
        player.facing = -1;
      }
      if (right) {
        player.vx += acceleration * dt;
        player.facing = 1;
      }
      if (!left && !right) {
        player.vx = approach(player.vx, 0, friction * dt);
      }
      player.vx = clamp(player.vx, -moveSpeed, moveSpeed);

      if (jump && player.grounded) {
        player.vy = maxJump;
        player.grounded = false;
      }

      player.vy += 1180 * dt;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      player.x = clamp(player.x, 16, worldWidth - player.w - 16);
      cameraX = clamp(player.x + player.w / 2 - W / 2, 0, worldWidth - W);
      currentStage = clamp(Math.floor((player.x + player.w / 2) / W) + 1, 1, totalStages);
      syncMapToScenario(selectedScenario, player.x / Math.max(1, worldWidth - player.w));

      if (allPipesSealed()) {
        scenarioComplete = true;
        gameOver = true;
        showNotice("¡BARRIO COMPLETADO!", 99);
        return;
      }

      if (player.y + player.h >= floorY) {
        player.y = floorY - player.h;
        player.vy = 0;
        player.grounded = true;
      }

      if ((keys.has("f") || keys.has("F")) && attackCooldown <= 0) useTool();
      handleRepair(dt);
    }

    function reggaetonSlowActive() {
      const centerX = player.x + player.w / 2;
      const centerY = player.y + player.h / 2;
      return enemies.some(enemy => enemy.type === "dj" && Math.hypot(enemy.x + enemy.w / 2 - centerX, enemy.y + enemy.h / 2 - centerY) < 210);
    }

    function useTool() {
      const tool = characterTools()[currentToolIndex];
      attackCooldown = tool.cooldown;
      if (tool.id === "wrench") {
        const knifeMod = specialEvent?.type === "fishknife" ? 2.4 : 1;
        const knifeRange = specialEvent?.type === "fishknife" ? 1.35 : 1;
        hitEnemiesInRange(tool.range * knifeRange, tool.damage * knifeMod, 0.2);
        addToolSpark(player.x + player.w / 2 + player.facing * 34, player.y + 38, "#ffd166");
      } else if (tool.id === "plunger") {
        projectiles.push({
          x: player.x + player.w / 2,
          y: player.y + 32,
          vx: player.facing * 430,
          life: 0.95,
          damage: tool.damage
        });
      } else {
        hitEnemiesInRange(tool.range, 0, 1.8);
        if (repairTarget) {
          const sealBoost = selectedCharacter.id === "usoa" ? 0.34 : selectedCharacter.id === "pedro" ? 0.26 : 0.18;
          if (repairTarget.clogged !== undefined) {
            repairTarget.clogged = Math.max(0, repairTarget.clogged - sealBoost);
          } else {
            repairTarget.leak = Math.max(0, repairTarget.leak - sealBoost);
          }
          repairTarget.repairedFlash = 0.24;
          score += 12;
        }
        addToolSpark(player.x + player.w / 2, player.y + 34, "#73ff9f");
      }
    }

    function characterTools() {
      return toolSets[selectedCharacter?.id] || tools;
    }

    function hitEnemiesInRange(range, damage, stun) {
      const centerX = player.x + player.w / 2;
      const centerY = player.y + player.h / 2;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const enemyX = enemy.x + enemy.w / 2;
        const enemyY = enemy.y + enemy.h / 2;
        const inFront = Math.sign(enemyX - centerX) === player.facing || Math.abs(enemyX - centerX) < 18;
        if (inFront && Math.hypot(enemyX - centerX, enemyY - centerY) <= range) {
          damageEnemy(i, damage, stun);
        }
      }
    }

    function addToolSpark(x, y, color) {
      for (let i = 0; i < 10; i++) {
        particles.push({ x, y, vx: randomRange(-120, 120), vy: randomRange(-130, -20), life: 0.32, color });
      }
    }

    function handleRepair(dt) {
      const repairing = keys.has("e") || keys.has("E");
      const nearest = nearestLeakingPipe(specialEvent?.type === "debug" ? 120 : 46);
      const nearestDrain = drains.find(drain => drain.clogged > 0 && Math.abs((player.x + player.w / 2) - drain.x) < 52);
      repairTarget = nearest || nearestDrain || null;

      if (!repairing || !repairTarget) return;

      const rustyMod = activeEvent && activeEvent.type === "tools" ? 0.5 : 1;
      const repairPower = 0.62 * selectedCharacter.repairMod * rustyMod;
      if (nearest) {
        nearest.leak = Math.max(0, nearest.leak - repairPower * dt);
        nearest.repairedFlash = 0.16;
      } else {
        nearestDrain.clogged = Math.max(0, nearestDrain.clogged - repairPower * 0.75 * dt);
        nearestDrain.repairedFlash = 0.16;
        waterLevel = Math.max(0, waterLevel - 1.9 * dt);
      }
      score += 18 * repairPower * dt;

      for (let i = 0; i < 2; i++) {
        particles.push({ x: repairTarget.x + randomRange(-16, 16), y: (repairTarget.y || floorY) + 22, vx: randomRange(-42, 42), vy: randomRange(-110, -40), life: 0.35, color: "#ffd166" });
      }
    }

    function nearestLeakingPipe(range) {
      const centerX = player.x + player.w / 2;
      return pipes.find(pipe => pipe.leak > 0 && Math.abs(centerX - pipe.x) < range && Math.abs(player.y - pipe.y) < 350);
    }

    function updatePipes(dt) {
      const rushMod = activeEvent && activeEvent.type === "water" ? 2 : 1;
      for (const drain of drains) drain.repairedFlash = Math.max(0, drain.repairedFlash - dt);
      for (const pipe of pipes) {
        pipe.repairedFlash = Math.max(0, pipe.repairedFlash - dt);
        if (pipe.leak <= 0) continue;
        if (!isVisible(pipe.x, W * 0.25)) continue;
        pipe.spawnTimer -= dt * rushMod;
        waterLevel += pipe.leak * 0.44 * selectedCharacter.floodMod * selectedScenario.floodMod * pipe.difficulty * rushMod * dt;

        if (pipe.spawnTimer <= 0) {
          drops.push({
            x: pipe.x + randomRange(-18, 18),
            y: pipe.y + 30,
            r: randomRange(4, 7),
            vy: randomRange(145, 220) * rushMod * selectedScenario.dropSpeedMod * (0.96 + pipe.difficulty * 0.34),
            splash: false
          });
          pipe.spawnTimer = randomRange(0.16, 0.45) / Math.max(pipe.leak * 2.8, 0.25);
        }
      }
    }

    function updateDrops(dt) {
      for (let i = drops.length - 1; i >= 0; i--) {
        const drop = drops[i];
        drop.vy += 90 * dt;
        drop.y += drop.vy * dt;
        if (drop.y > floorY - waterLevel) {
          drops.splice(i, 1);
          waterLevel += 0.12;
          for (let p = 0; p < 4; p++) {
            particles.push({ x: drop.x, y: floorY - waterLevel, vx: randomRange(-60, 60), vy: randomRange(-80, -20), life: 0.42, color: "#42e8ff" });
          }
        }
      }
    }

    function updateCoffee(dt) {
      if (!coffee) return;
      coffee.y += coffee.vy * dt;
      coffee.glow += dt * 8;
      if (rectsOverlap(player.x, player.y, player.w, player.h, coffee.x, coffee.y, coffee.size, coffee.size)) {
        caffeineTimer = 7;
        coffee = null;
        showNotice("¡CAFÉ RECOGIDO! Velocidad x2", 2.4);
        return;
      }
      if (coffee.y > floorY) coffee = null;
    }

    function updateProjectiles(dt) {
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        projectile.x += projectile.vx * dt;
        projectile.life -= dt;
        let consumed = projectile.life <= 0 || projectile.x < -20 || projectile.x > worldWidth + 20;
        for (let e = enemies.length - 1; e >= 0 && !consumed; e--) {
          const enemy = enemies[e];
          if (rectsOverlap(projectile.x - 8, projectile.y - 8, 16, 16, enemy.x, enemy.y, enemy.w, enemy.h)) {
            damageEnemy(e, projectile.damage, 0.55);
            consumed = true;
          }
        }
        if (consumed) projectiles.splice(i, 1);
      }
    }

    function updateEnemies(dt) {
      for (const enemy of enemies) {
        enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
        enemy.stun = Math.max(0, enemy.stun - dt);
        if (enemy.stun <= 0) {
          enemy.x += enemy.vx * dt;
          if (enemy.flying) enemy.y += Math.sin(performance.now() / 240 + enemy.x / 40) * 22 * dt;
          const areaStart = Math.floor(enemy.x / W) * W;
          if (enemy.x < areaStart + 38 || enemy.x + enemy.w > areaStart + W - 38) enemy.vx *= -1;
        }

        if (hurtTimer <= 0 && rectsOverlap(player.x, player.y, player.w, player.h, enemy.x, enemy.y, enemy.w, enemy.h)) {
          if (specialEvent?.type === "prost") {
            enemy.stun = Math.max(enemy.stun, 1.2);
            enemy.vx *= -1;
            showNotice("¡BOCATA DEL PROST! Daño bloqueado", 0.8);
            continue;
          }
          playerHealth -= enemy.damage || 1;
          hurtTimer = 1.1;
          player.vx = -Math.sign(enemy.vx || 1) * 220;
          player.vy = -180;
          showNotice("¡GOLPE!", 0.8);
          if (playerHealth <= 0) {
            gameOver = true;
            showNotice("¡FUERA DE SERVICIO! Pulsa Enter", 99);
          }
        }
      }
    }

    function updateHelpers(dt) {
      for (let i = helpers.length - 1; i >= 0; i--) {
        const helper = helpers[i];
        helper.timer -= dt;
        helper.actionTimer -= dt;
        helper.x = approach(helper.x, player.x + (helper.type === "munipa" ? -70 : 70), 120 * dt);
        if (helper.actionTimer <= 0) {
          helper.actionTimer = helper.type === "munipa" ? 0.7 : 0.9;
          if (helper.type === "munipa") {
            const enemyIndex = enemies.findIndex(enemy => Math.abs(enemy.x - helper.x) < 220);
            if (enemyIndex >= 0) damageEnemy(enemyIndex, 1, 0.7);
          } else {
            const pipe = pipes.find(item => item.leak > 0 && Math.abs(item.x - helper.x) < 180);
            const drain = drains.find(item => item.clogged > 0 && Math.abs(item.x - helper.x) < 180);
            if (pipe) pipe.leak = Math.max(0, pipe.leak - 0.08);
            if (drain) drain.clogged = Math.max(0, drain.clogged - 0.08);
            waterLevel = Math.max(0, waterLevel - 0.35);
          }
        }
        if (helper.timer <= 0) helpers.splice(i, 1);
      }
    }

    function damageEnemy(index, damage, stun) {
      const enemy = enemies[index];
      enemy.hp -= damage;
      enemy.stun = Math.max(enemy.stun, stun);
      enemy.hitFlash = 0.18;
      if (enemy.hp <= 0) {
        addToolSpark(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#ff5a6d");
        enemies.splice(index, 1);
        score += 35;
      }
    }

    function updateParticles(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.life -= dt;
        particle.vy += 420 * dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        if (particle.life <= 0) particles.splice(i, 1);
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      drawBackground();
      drawZoneOverlay();
      drawDrains();
      drawPipes();
      drawExit();
      drawDrops();
      drawCoffee();
      drawProjectiles();
      drawEnemies();
      drawHelpers();
      drawPlayer();
      drawParticles();
      drawWater();
      drawHud();
      drawNotice();
      if (!gameStarted) drawAttract();
      if (gameOver) drawGameOver();
    }

    function drawBackground() {
      const scenario = selectedScenario || scenarios[0];
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, hexToRgba(scenario.sky, 0.48));
      sky.addColorStop(1, "rgba(9, 19, 31, 0.74)");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      drawStreetViewBackdrop(scenario);
      drawScenarioLandmarks(scenario);

      ctx.fillStyle = hexToRgba(scenario.ground, 0.78);
      ctx.fillRect(0, floorY, W, H - floorY);
      ctx.fillStyle = "#20354b";
      const tileOffset = -(cameraX % 64);
      for (let x = tileOffset; x < W; x += 64) ctx.fillRect(x, floorY, 44, 10);
    }

    function drawStreetViewBackdrop(scenario) {
      const vanishingX = W / 2 + Math.sin(cameraX / 620) * 70;
      const horizonY = 258;
      const palette = streetViewPalette(scenario.id);

      ctx.save();
      ctx.fillStyle = "rgba(4, 10, 18, 0.18)";
      ctx.fillRect(0, 0, W, floorY);
      ctx.fillStyle = palette.road;
      ctx.beginPath();
      ctx.moveTo(vanishingX - 34, horizonY);
      ctx.lineTo(vanishingX + 34, horizonY);
      ctx.lineTo(W + 180, floorY);
      ctx.lineTo(-180, floorY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
      ctx.lineWidth = 4;
      for (let i = -3; i <= 3; i++) {
        const baseX = W / 2 + i * 120 - (cameraX % 120);
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizonY + 10);
        ctx.lineTo(baseX, floorY);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(255, 209, 102, 0.58)";
      ctx.lineWidth = 5;
      for (let y = horizonY + 18; y < floorY; y += 44) {
        const t = (y - horizonY) / (floorY - horizonY);
        ctx.beginPath();
        ctx.moveTo(vanishingX - 7 * t, y);
        ctx.lineTo(vanishingX + 7 * t, y + 18 * t);
        ctx.stroke();
      }

      drawPerspectiveSide("left", palette, vanishingX, horizonY);
      drawPerspectiveSide("right", palette, vanishingX, horizonY);

      ctx.fillStyle = "rgba(3, 12, 22, 0.62)";
      ctx.fillRect(18, 154, 188, 28);
      ctx.fillStyle = "#f5fbff";
      ctx.font = "900 13px system-ui";
      ctx.fillText("VISTA CALLE SIMULADA", 32, 173);
      ctx.restore();
    }

    function drawPerspectiveSide(side, palette, vanishingX, horizonY) {
      const dir = side === "left" ? -1 : 1;
      for (let i = 0; i < 7; i++) {
        const depth = i / 6;
        const nearY = floorY - i * 30;
        const farY = Math.max(horizonY + 20, nearY - 92 + depth * 28);
        const nearX = dir < 0 ? -18 + i * 22 : W + 18 - i * 22;
        const farX = vanishingX + dir * (92 + i * 18);
        const width = 72 + (6 - i) * 16;
        const height = 70 + ((i + currentStage) % 3) * 28;

        ctx.fillStyle = i % 2 === 0 ? palette.buildingA : palette.buildingB;
        ctx.beginPath();
        ctx.moveTo(nearX, nearY);
        ctx.lineTo(nearX + dir * width, nearY);
        ctx.lineTo(farX + dir * 36, farY - height * 0.35);
        ctx.lineTo(farX, farY - height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = palette.window;
        for (let w = 0; w < 3; w++) {
          const wx = nearX + dir * (18 + w * 20);
          ctx.fillRect(wx, nearY - 46, dir * 10, 10);
          ctx.fillRect(wx, nearY - 24, dir * 10, 10);
        }
      }
    }

    function streetViewPalette(id) {
      if (id === "pasai-antxo") return { road: "rgba(35, 47, 58, 0.96)", buildingA: "rgba(166, 95, 52, 0.9)", buildingB: "rgba(41, 62, 80, 0.92)", window: "rgba(127, 220, 255, 0.82)" };
      if (id === "astigarraga") return { road: "rgba(78, 58, 38, 0.94)", buildingA: "rgba(97, 65, 35, 0.9)", buildingB: "rgba(38, 91, 55, 0.86)", window: "rgba(255, 209, 102, 0.82)" };
      if (id === "larratxo-altza") return { road: "rgba(43, 49, 68, 0.96)", buildingA: "rgba(74, 83, 103, 0.94)", buildingB: "rgba(55, 63, 83, 0.94)", window: "rgba(217, 199, 255, 0.82)" };
      if (id === "egia") return { road: "rgba(48, 42, 48, 0.96)", buildingA: "rgba(179, 93, 58, 0.92)", buildingB: "rgba(36, 80, 82, 0.88)", window: "rgba(255, 207, 159, 0.82)" };
      if (id === "gros") return { road: "rgba(45, 55, 66, 0.96)", buildingA: "rgba(219, 184, 106, 0.88)", buildingB: "rgba(43, 94, 120, 0.9)", window: "rgba(129, 232, 255, 0.82)" };
      if (id === "amara") return { road: "rgba(54, 56, 64, 0.96)", buildingA: "rgba(91, 120, 104, 0.88)", buildingB: "rgba(74, 84, 98, 0.92)", window: "rgba(169, 207, 255, 0.82)" };
      if (id === "parte-vieja") return { road: "rgba(55, 43, 40, 0.98)", buildingA: "rgba(154, 90, 45, 0.9)", buildingB: "rgba(93, 61, 51, 0.92)", window: "rgba(255, 202, 120, 0.82)" };
      return { road: "rgba(42, 52, 68, 0.96)", buildingA: "rgba(58, 77, 101, 0.92)", buildingB: "rgba(42, 57, 78, 0.92)", window: "rgba(156, 236, 255, 0.82)" };
    }

    function drawZoneOverlay() {
      if (!gameStarted || !selectedScenario) return;
      for (let index = 0; index < totalStages; index++) {
        const worldX = index * W;
        if (worldX + W < cameraX || worldX > cameraX + W) continue;
        const x = visibleX(worldX);
        const screen = selectedScenario.screens[index];
        ctx.fillStyle = index % 2 === 0 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.08)";
        ctx.fillRect(x, 0, W, H);
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, floorY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(3, 12, 22, 0.68)";
        ctx.fillRect(x + 26, 168, 270, 46);
        ctx.fillStyle = selectedScenario.water;
        ctx.font = "900 17px system-ui";
        ctx.fillText(`${index + 1}. ${screen.name}`, x + 42, 196);
      }
    }

    function drawScenarioLandmarks(scenario) {
      const screen = gameStarted && selectedScenario ? currentScreen() : scenario.screens[0];
      const stage = gameStarted ? currentStage : 1;
      if (scenario.id === "astigarraga") {
        ctx.fillStyle = "#1f5b36";
        drawHill(-80, 385, 260, 90);
        drawHill(170, 388, 330, 120);
        drawHill(560, 382, 300, 105);
        ctx.fillStyle = "#6f4422";
        ctx.fillRect(610 - stage * 8, 306, 175, 92);
        ctx.fillStyle = "#3b2113";
        ctx.beginPath();
        ctx.moveTo(592 - stage * 8, 306);
        ctx.lineTo(800 - stage * 8, 306);
        ctx.lineTo(758 - stage * 8, 270);
        ctx.lineTo(632 - stage * 8, 270);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffd166";
        ctx.font = "800 18px system-ui";
        ctx.fillText(stage >= 10 ? "TXOTX FINAL" : "TXOTX", 636 - stage * 8, 352);
        drawStreetSign(screen.name, 54, 326, "#ffd166");
      } else if (scenario.id === "pasai-antxo") {
        ctx.fillStyle = "#0b4c68";
        ctx.fillRect(0, 382, W, 82);
        ctx.strokeStyle = "#d18742";
        ctx.lineWidth = 7;
        for (const x of [120, 380, 710]) {
          ctx.beginPath();
          ctx.moveTo(x, 382);
          ctx.lineTo(x + 34, 220);
          ctx.lineTo(x + 92, 382);
          ctx.moveTo(x + 28, 250);
          ctx.lineTo(x + 118, 250);
          ctx.stroke();
        }
        ctx.fillStyle = "#23344b";
        ctx.fillRect(500, 342, 280, 42);
        ctx.fillStyle = "#c46f38";
        for (let i = 0; i < 5; i++) ctx.fillRect(522 + i * 48, 314, 34, 28);
        drawStreetSign(screen.name, 48, 324, "#7fdcff");
        if (stage >= 6) drawBeacon(835, 300);
      } else if (scenario.id === "larratxo-altza") {
        ctx.fillStyle = "#384258";
        for (let i = 0; i < 7; i++) {
          const x = 55 + i * 122;
          const h = 94 + (i % 3) * 34;
          ctx.fillRect(x, floorY - h, 78, h);
          ctx.fillStyle = "rgba(255, 214, 118, 0.7)";
          for (let y = floorY - h + 18; y < floorY - 18; y += 24) {
            ctx.fillRect(x + 14, y, 12, 10);
            ctx.fillRect(x + 48, y, 12, 10);
          }
          ctx.fillStyle = "#384258";
        }
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, 420);
        ctx.lineTo(260, 356);
        ctx.lineTo(520, 392);
        ctx.lineTo(960, 318);
        ctx.stroke();
        drawStreetSign(screen.name, 48, 316, "#d9c7ff");
      } else {
        if (scenario.id === "egia") {
          ctx.fillStyle = "#18445a";
          ctx.fillRect(0, 386, W, 78);
          ctx.fillStyle = "#c26f42";
          ctx.fillRect(585, 270, 190, 118);
          ctx.fillStyle = "#8f402d";
          for (let x = 605; x < 760; x += 34) {
            ctx.fillRect(x, 292, 18, 22);
            ctx.fillRect(x, 330, 18, 22);
          }
          ctx.fillStyle = "#d9e0e8";
          ctx.fillRect(558, 252, 238, 22);
          ctx.fillStyle = "#1d6b45";
          drawHill(54, 394, 260, 84);
          drawHill(250, 400, 230, 72);
          ctx.strokeStyle = "#b7c4cf";
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(0, 352);
          ctx.lineTo(W, 314 - stage * 2);
          ctx.stroke();
          drawStreetSign(screen.name, 48, 318, "#ffcf9f");
        } else {
        ctx.fillStyle = "#2d3f58";
        for (let i = 0; i < 8; i++) {
          const x = 38 + i * 118;
          const h = 72 + ((i + stage) % 4) * 24;
          ctx.fillRect(x, floorY - h, 72, h);
          ctx.fillStyle = "rgba(174, 232, 255, 0.72)";
          for (let y = floorY - h + 16; y < floorY - 12; y += 22) {
            ctx.fillRect(x + 12, y, 12, 9);
            ctx.fillRect(x + 42, y, 12, 9);
          }
          ctx.fillStyle = "#2d3f58";
        }
        ctx.strokeStyle = "#9aa9bf";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(0, 390);
        ctx.lineTo(W, 330 - stage * 3);
        ctx.stroke();
        ctx.fillStyle = "#1a2433";
        ctx.fillRect(640, 326, 210, 62);
        ctx.fillStyle = "#39b6c8";
        ctx.font = "800 16px system-ui";
        ctx.fillText("INTXAURRONDO", 666, 363);
        drawStreetSign(screen.name, 48, 318, "#9cecff");
        }
      }

      ctx.strokeStyle = "rgba(255,255,255,0.045)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 80, H);
        ctx.stroke();
      }
    }

    function drawStreetSign(text, x, y, color) {
      ctx.fillStyle = "rgba(2, 9, 18, 0.72)";
      ctx.fillRect(x, y, 230, 42);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, 230, 42);
      ctx.fillStyle = color;
      ctx.font = "900 16px system-ui";
      ctx.fillText(text.toUpperCase(), x + 14, y + 27);
    }

    function drawBeacon(x, y) {
      const pulse = Math.sin(performance.now() / 120) * 0.35 + 0.65;
      ctx.save();
      ctx.shadowColor = "#ffd166";
      ctx.shadowBlur = 20 * pulse;
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawHill(x, y, w, h) {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y, w / 2, h, 0, Math.PI, 0);
      ctx.lineTo(x + w, floorY);
      ctx.lineTo(x, floorY);
      ctx.closePath();
      ctx.fill();
    }

    function drawPipes() {
      for (const pipe of pipes) {
        if (!isVisible(pipe.x)) continue;
        ctx.save();
        ctx.translate(visibleX(pipe.x), pipe.y);
        ctx.fillStyle = pipe.repairedFlash > 0 ? "#ffd166" : "#7b96a6";
        ctx.fillRect(-28, -12, 56, 26);
        ctx.fillRect(-12, 8, 24, 56);
        ctx.fillStyle = "#4d6677";
        ctx.fillRect(-38, -20, 76, 14);
        if (pipe.leak <= 0) {
          ctx.fillStyle = "#73ff9f";
          ctx.fillRect(-16, 57, 32, 8);
        } else {
          ctx.fillStyle = pipe.leak > 0.32 ? "#ff5a6d" : "#42e8ff";
          ctx.beginPath();
          ctx.arc(0, 64, 5 + pipe.leak * 10, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    function drawDrains() {
      for (const drain of drains) {
        if (!isVisible(drain.x)) continue;
        const x = visibleX(drain.x);
        ctx.save();
        ctx.translate(x, drain.y);
        ctx.fillStyle = drain.clogged > 0 ? "#6f5a45" : "#42e8ff";
        ctx.fillRect(-24, -8, 48, 16);
        ctx.strokeStyle = drain.repairedFlash > 0 ? "#ffd166" : "#101820";
        ctx.lineWidth = 3;
        for (let i = -15; i <= 15; i += 10) {
          ctx.beginPath();
          ctx.moveTo(i, -7);
          ctx.lineTo(i, 7);
          ctx.stroke();
        }
        if (drain.clogged <= 0) {
          ctx.fillStyle = "rgba(66,232,255,0.36)";
          ctx.beginPath();
          ctx.arc(0, 0, 34 + Math.sin(performance.now() / 140) * 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    function drawExit() {
      if (!gameStarted || gameOver) return;
      drawMinimap();
    }

    function drawMinimap() {
      const x = W / 2 - 185;
      const y = H - 38;
      const width = 370;
      ctx.save();
      ctx.fillStyle = "rgba(3, 12, 22, 0.72)";
      ctx.fillRect(x - 14, y - 16, width + 28, 32);
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(x, y, width, 4);
      for (let i = 0; i < totalStages; i++) {
        const nodeX = x + (i / (totalStages - 1)) * width;
        ctx.fillStyle = i + 1 === currentStage ? "#ffd166" : "#73ff9f";
        ctx.beginPath();
        ctx.arc(nodeX, y + 2, i + 1 === currentStage ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
      }
      const playerX = x + (player.x / Math.max(1, worldWidth - player.w)) * width;
      ctx.fillStyle = "#42e8ff";
      ctx.beginPath();
      ctx.arc(playerX, y + 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawDrops() {
      ctx.fillStyle = "#42e8ff";
      for (const drop of drops) {
        if (!isVisible(drop.x)) continue;
        ctx.beginPath();
        ctx.ellipse(visibleX(drop.x), drop.y, drop.r * 0.72, drop.r * 1.25, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawCoffee() {
      if (!coffee) return;
      ctx.save();
      const pulse = Math.sin(coffee.glow) * 0.25 + 0.75;
      ctx.shadowColor = "#ffd166";
      ctx.shadowBlur = 26 * pulse;
      ctx.fillStyle = "#fff2a8";
      const x = visibleX(coffee.x);
      ctx.fillRect(x, coffee.y + 6, coffee.size, coffee.size - 6);
      ctx.fillStyle = "#7b3f1d";
      ctx.fillRect(x + 4, coffee.y + 10, coffee.size - 8, 7);
      ctx.strokeStyle = "#fff2a8";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x + coffee.size, coffee.y + 16, 8, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.restore();
    }

    function drawProjectiles() {
      ctx.save();
      for (const projectile of projectiles) {
        if (!isVisible(projectile.x)) continue;
        ctx.translate(visibleX(projectile.x), projectile.y);
        ctx.fillStyle = "#dbeaf2";
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff5a6d";
        ctx.fillRect(-6, -3, 12, 6);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      ctx.restore();
    }

    function drawEnemies() {
      for (const enemy of enemies) {
        if (!isVisible(enemy.x)) continue;
        ctx.save();
        ctx.translate(visibleX(enemy.x), enemy.y);
        ctx.globalAlpha = enemy.stun > 0 ? 0.62 : 1;
        ctx.fillStyle = enemy.hitFlash > 0 ? "#ffffff" : enemyColor(enemy.type);
        if (enemy.type === "rat" || enemy.type === "dog") {
          ctx.beginPath();
          ctx.ellipse(enemy.w / 2, enemy.h / 2, enemy.w / 2, enemy.h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffb3b3";
          ctx.beginPath();
          ctx.arc(enemy.w - 4, 4, 5, 0, Math.PI * 2);
          ctx.fill();
          if (enemy.type === "dog") {
            ctx.fillStyle = "#2a1f1b";
            ctx.fillRect(enemy.w - 3, 11, 12, 5);
          }
        } else if (enemy.type === "drone") {
          ctx.fillRect(5, 8, enemy.w - 10, enemy.h - 16);
          ctx.strokeStyle = "#42e8ff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(4, 8, 8, 0, Math.PI * 2);
          ctx.arc(enemy.w - 4, 8, 8, 0, Math.PI * 2);
          ctx.stroke();
        } else if (enemy.type === "thief" || enemy.type === "knife") {
          ctx.fillRect(7, 8, enemy.w - 14, enemy.h - 8);
          ctx.fillStyle = "#101018";
          ctx.fillRect(10, 0, enemy.w - 20, 12);
          ctx.fillStyle = "#ffd166";
          ctx.fillRect(13, 15, 5, 5);
          ctx.fillRect(25, 15, 5, 5);
          if (enemy.type === "knife") {
            ctx.strokeStyle = "#dbeaf2";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(enemy.w - 6, 18);
            ctx.lineTo(enemy.w + 10, 8);
            ctx.stroke();
          }
        } else if (enemy.type === "dj") {
          ctx.fillRect(6, 6, enemy.w - 12, enemy.h - 6);
          ctx.fillStyle = "#42e8ff";
          ctx.fillRect(11, 13, 10, 8);
          ctx.fillRect(28, 13, 10, 8);
          ctx.strokeStyle = "rgba(255, 209, 102, 0.75)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(enemy.w / 2, enemy.h / 2, 72 + Math.sin(performance.now() / 110) * 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#ffd166";
          ctx.font = "900 15px system-ui";
          ctx.fillText("♪", enemy.w + 8, 6);
          ctx.fillText("♫", -14, 24);
        } else {
          ctx.fillRect(4, 4, enemy.w - 8, enemy.h - 4);
          ctx.fillStyle = "#ffd166";
          ctx.fillRect(12, 12, 6, 6);
          ctx.fillRect(25, 12, 6, 6);
        }
        if (Math.abs(enemy.x - player.x) < 190) {
          ctx.fillStyle = "rgba(3, 12, 22, 0.8)";
          ctx.fillRect(-20, -28, enemy.w + 40, 20);
          ctx.fillStyle = "#f5fbff";
          ctx.font = "800 11px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(enemyName(enemy.type), enemy.w / 2, -14);
          ctx.textAlign = "left";
        }
        ctx.restore();
      }
    }

    function drawHelpers() {
      for (const helper of helpers) {
        if (!isVisible(helper.x)) continue;
        const x = visibleX(helper.x);
        ctx.save();
        ctx.translate(x, helper.y);
        ctx.fillStyle = helper.type === "munipa" ? "#1f66d1" : "#6cc36c";
        ctx.fillRect(0, 14, helper.w, helper.h - 14);
        ctx.fillStyle = "#f0b47a";
        ctx.fillRect(5, 0, helper.w - 10, 18);
        ctx.fillStyle = helper.type === "munipa" ? "#0c244f" : "#7b4b25";
        ctx.fillRect(2, -4, helper.w - 4, 8);
        ctx.fillStyle = "#f5fbff";
        ctx.font = "800 11px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(helper.type === "munipa" ? "MUNIPA" : "VECINO", helper.w / 2, -12);
        ctx.textAlign = "left";
        ctx.restore();
      }
    }

    function enemyColor(type) {
      if (type === "rat") return "#6b6470";
      if (type === "drone") return "#8aa4b8";
      if (type === "thief") return "#303044";
      if (type === "knife") return "#2d2a33";
      if (type === "dj") return "#7c4dff";
      if (type === "dog") return "#8b5a2b";
      return "#9a5d2e";
    }

    function enemyName(type) {
      if (type === "rat") return "Rata";
      if (type === "dog") return "Perro suelto";
      if (type === "thief") return "Ladrón de cobre";
      if (type === "knife") return "Segarro";
      if (type === "dj") return "DJ Brayan";
      if (type === "drone") return "Dron averiado";
      return "Gremlin de óxido";
    }

    function drawPlayer() {
      const c = selectedCharacter || characters[1];
      const x = player ? visibleX(player.x) : 80;
      const y = player ? player.y : floorY - 58;
      ctx.save();
      ctx.translate(x + player.w / 2, y);
      ctx.scale(player.facing, 1);

      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(0, player.h + 5, 24, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f0b47a";
      ctx.fillRect(-13, 13, 26, 27);
      ctx.fillStyle = c.cap;
      ctx.fillRect(-18, 2, 36, 15);
      ctx.fillRect(8, 11, 18, 6);
      ctx.fillStyle = c.overalls;
      ctx.fillRect(-16, 39, 32, 28);
      ctx.fillStyle = "#f4c182";
      ctx.fillRect(-24, 42, 9, 20);
      ctx.fillRect(15, 42, 9, 20);
      ctx.fillStyle = "#151821";
      ctx.fillRect(-16, 66, 12, 10);
      ctx.fillRect(4, 66, 12, 10);
      ctx.fillStyle = "#101018";
      ctx.fillRect(2, 24, 5, 4);
      ctx.fillRect(12, 24, 9, 5);

      if (specialEvent?.type === "caravan") {
        ctx.fillStyle = "rgba(255, 209, 102, 0.92)";
        ctx.fillRect(-30, 48, 60, 25);
        ctx.fillStyle = "#263548";
        ctx.fillRect(-19, 53, 14, 9);
        ctx.fillRect(6, 53, 14, 9);
        ctx.fillStyle = "#101018";
        ctx.beginPath();
        ctx.arc(-20, 75, 6, 0, Math.PI * 2);
        ctx.arc(20, 75, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      if (specialEvent?.type === "prost") {
        ctx.strokeStyle = "rgba(255, 209, 102, 0.9)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 38, 38 + Math.sin(performance.now() / 90) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (caffeineTimer > 0) {
        ctx.strokeStyle = "rgba(255, 209, 102, 0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 38, 33 + Math.sin(performance.now() / 80) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawParticles() {
      for (const particle of particles) {
        if (!isVisible(particle.x, 40)) continue;
        ctx.globalAlpha = Math.max(0, particle.life / 0.42);
        ctx.fillStyle = particle.color;
        ctx.fillRect(visibleX(particle.x), particle.y, 3, 3);
      }
      ctx.globalAlpha = 1;
    }

    function drawWater() {
      if (waterLevel <= 0.2) return;
      const y = floorY - waterLevel;
      const gradient = ctx.createLinearGradient(0, y, 0, H);
      gradient.addColorStop(0, "rgba(66,232,255,0.78)");
      gradient.addColorStop(1, "rgba(20,100,180,0.95)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, y);
      for (let x = 0; x <= W; x += 24) {
        ctx.lineTo(x, y + Math.sin(performance.now() / 280 + x / 38) * 5);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    }

    function drawHud() {
      if (!selectedCharacter) return;
      const scenario = selectedScenario || scenarios[0];
      const screen = currentScreen();
      ctx.fillStyle = "rgba(3, 12, 22, 0.72)";
      ctx.fillRect(18, 16, 430, 130);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.strokeRect(18, 16, 430, 130);
      ctx.fillStyle = "#f5fbff";
      ctx.font = "700 18px system-ui";
      ctx.fillText(`${selectedCharacter.name} - ${selectedCharacter.title}`, 34, 43);
      ctx.font = "600 14px system-ui";
      ctx.fillStyle = "#9cb8c9";
      const repaired = pipes.filter(pipe => pipe.leak <= 0).length;
      const openDrains = drains.filter(drain => drain.clogged <= 0).length;
      ctx.fillText(`Lugar: ${scenario.name} · Zona ${currentStage}/${totalStages}`, 34, 66);
      ctx.fillText(`Tramo: ${screen.name}`, 34, 88);
      ctx.fillText(`Averías: ${repaired}/${pipes.length} · Sumideros: ${openDrains}/${drains.length} · Agua: ${Math.floor(waterLevel)}%`, 34, 110);
      const effect = sunTimer > 0 ? "Solazo activo: el agua baja rápido" : allPipesSealed() ? "Barrio completo" : reggaetonSlowActive() ? "Reggaetón cerca: velocidad reducida" : activeEvent ? eventLabel(activeEvent.type) : caffeineTimer > 0 ? "Cafeína activa" : "Explora el mapa y repara averías";
      ctx.fillText(effect, 34, 132);

      if (specialEvent) {
        ctx.fillStyle = "#ffd166";
        ctx.font = "900 13px system-ui";
        ctx.fillText(`${specialLabel()} · ${Math.ceil(specialEvent.timer)}s`, 472, 60);
      }

      ctx.fillStyle = "rgba(219, 234, 242, 0.76)";
      ctx.font = "600 12px system-ui";
      ctx.fillText(screen.detail, 472, 38);

      ctx.fillStyle = "rgba(3, 12, 22, 0.72)";
      ctx.fillRect(W - 286, 16, 268, 126);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.strokeRect(W - 286, 16, 268, 126);
      ctx.fillStyle = "#f5fbff";
      ctx.font = "800 15px system-ui";
      ctx.fillText(`Vida: ${"♥".repeat(Math.max(0, playerHealth))}`, W - 268, 44);
      ctx.fillStyle = "#ffd166";
      const tool = characterTools()[currentToolIndex];
      ctx.fillText(`${tool.key}: ${tool.name}`, W - 268, 70);
      ctx.fillStyle = "#dbeaf2";
      ctx.font = "700 12px system-ui";
      ctx.fillText(tool.description, W - 268, 91);
      ctx.fillStyle = "#9cb8c9";
      ctx.fillText("1 Llave: cuerpo a cuerpo", W - 268, 112);
      ctx.fillText("2 Desatascador: distancia · 3 Cinta: control", W - 268, 130);

      if (repairTarget) {
        ctx.fillStyle = "rgba(255,209,102,0.92)";
        ctx.font = "800 14px system-ui";
        ctx.fillText(repairTarget.clogged !== undefined ? "Pulsa E para limpiar sumidero" : "Pulsa E para reparar", visibleX(repairTarget.x) - 64, (repairTarget.y || floorY) + 96);
      }
    }

    function drawNotice() {
      if (eventNotice.timer <= 0) return;
      const alpha = Math.sin(performance.now() / 85) > 0 ? 1 : 0.35;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.font = "900 34px system-ui";
      ctx.lineWidth = 8;
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.strokeText(eventNotice.text, W / 2, 145);
      ctx.fillStyle = "#ffd166";
      ctx.fillText(eventNotice.text, W / 2, 145);
      ctx.restore();
    }

    function drawGameOver() {
      ctx.fillStyle = "rgba(4, 8, 16, 0.62)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = scenarioComplete ? "#73ff9f" : "#ff5a6d";
      ctx.font = "900 54px system-ui";
      ctx.fillText(scenarioComplete ? "¡BARRIO COMPLETADO!" : "¡TALLER INUNDADO!", W / 2, 246);
      ctx.fillStyle = "#f5fbff";
      ctx.font = "700 20px system-ui";
      ctx.fillText(`Puntuación final: ${Math.floor(score)}`, W / 2, 286);
      ctx.fillText("Pulsa Enter para volver a elegir personaje", W / 2, 318);
      ctx.textAlign = "left";
    }

    function drawAttract() {
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(0, 0, W, H);
    }

    function eventLabel(type) {
      if (type === "water") return "Evento: Torrente de agua";
      if (type === "tools") return "Evento: Herramientas oxidadas";
      return "Evento activo";
    }

    function specialLabel() {
      if (specialEvent?.type === "prost") return "Bocata del Prost: inmunidad";
      if (specialEvent?.type === "debug") return "Modo informática: reparación remota";
      if (specialEvent?.type === "caravan") return "Caravana activada: velocidad";
      if (specialEvent?.type === "fishknife") return "Cuchillo de pescadero: daño x2.4";
      if (specialEvent?.type === "blueprint") return "Plano técnico: limpia sumideros";
      if (specialEvent?.type === "calm") return "Calma total: menos agua";
      return "Especial activo";
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function approach(value, target, amount) {
      if (value < target) return Math.min(value + amount, target);
      if (value > target) return Math.max(value - amount, target);
      return target;
    }

    function randomRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    function hexToRgba(hex, alpha) {
      const value = hex.replace("#", "");
      const r = parseInt(value.slice(0, 2), 16);
      const g = parseInt(value.slice(2, 4), 16);
      const b = parseInt(value.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
      return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    window.addEventListener("keydown", event => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(event.key)) event.preventDefault();
      keys.add(event.key);
    });

    window.addEventListener("keyup", event => keys.delete(event.key));

    backToCharacters.addEventListener("click", () => {
      selectedCharacter = null;
      scenarioScreen.classList.add("hidden");
      characterScreen.classList.remove("hidden");
    });

    renderCharacterCards();
    renderScenarioCards();
    resetGame();
    draw();
