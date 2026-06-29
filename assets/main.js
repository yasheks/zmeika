const socket = io();
const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");

let myId = null;
let serverClasses = {};
let gameState = { players: {}, projectiles: [], entities: [] };

let keys = { w: false, a: false, s: false, d: false };
let mouseAngle = 0;
let mouseClick = false;
let targetX = 0, targetY = 0;

const minimapCanvas = document.getElementById("minimap");
const minimapCtx = minimapCanvas.getContext("2d");
const MAP_MIN = -2000, MAP_MAX = 2000, MAP_SIZE = 4000;

const textures = {};
const charImages = {
    1: 'images/vergazova_face.png',
    2: 'images/marchenko_face.png',
    3: 'images/maltseva_face.png',
    4: 'images/murashkina_face.png',
    5: 'images/tomchuk_face.png',
    6: 'images/nikan_face.png',
    7: 'images/nikita_face.png'
};

// Отслеживание состояний для звуков
let previousBossExists = false;
let previousPlayerHP = {};
let previousUltCharge = {};

// Звуки скиллов
const skillESounds = {
    1: 'sleep_cast',
    2: 'invert_cast',
    3: 'silence_cast',
    4: 'rpg_cast',
    5: 'perdezh_cast',
    6: 'hook_cast',
    7: 'dimension_cast'
};

// Загрузка всего
function loadGame() {
    // Загружаем текстуры
    Object.entries(charImages).forEach(([id, path]) => {
        const img = new Image();
        img.src = path;
        img.onerror = () => console.log(`Image not found: ${path}`);
        textures[id] = img;
    });

    const bossImg = new Image();
    bossImg.src = 'images/bazis_boss.png';
    bossImg.onerror = () => console.log('Boss image not found');
    textures['boss'] = bossImg;

    // Загружаем звуки (с проверкой)
    const soundList = [
        ['menu', 'sounds/music/menu_theme.mp3', 'music'],
        ['battle', 'sounds/music/battle_theme.mp3', 'music'],
        ['boss', 'sounds/music/boss_theme.mp3', 'music'],
        ['attack_1', 'sounds/sfx/player/attack/vergazova_attack.mp3'],
        ['attack_2', 'sounds/sfx/player/attack/marchenko_attack.mp3'],
        ['attack_3', 'sounds/sfx/player/attack/maltseva_attack.mp3'],
        ['attack_4', 'sounds/sfx/player/attack/murashkina_attack.mp3'],
        ['attack_5', 'sounds/sfx/player/attack/tomchuk_attack.mp3'],
        ['attack_6', 'sounds/sfx/player/attack/nikan_attack.mp3'],
        ['attack_7', 'sounds/sfx/player/attack/nikita_attack.mp3'],
        ['sleep_cast', 'sounds/sfx/player/skills/sleep_cast.mp3'],
        ['invert_cast', 'sounds/sfx/player/skills/invert_cast.mp3'],
        ['silence_cast', 'sounds/sfx/player/skills/silence_cast.mp3'],
        ['rpg_cast', 'sounds/sfx/player/skills/rpg_cast.mp3'],
        ['perdezh_cast', 'sounds/sfx/player/skills/perdezh_cast.mp3'],
        ['hook_cast', 'sounds/sfx/player/skills/hook_cast.mp3'],
        ['dimension_cast', 'sounds/sfx/player/skills/dimension_cast.mp3'],
        ['boss_spawn', 'sounds/sfx/boss/boss_spawn.mp3'],
        ['boss_death', 'sounds/sfx/boss/boss_death.mp3'],
        ['boss_laser', 'sounds/sfx/boss/boss_laser.mp3'],
        ['boss_sticks', 'sounds/sfx/boss/boss_sticks.mp3'],
        ['boss_stomp', 'sounds/sfx/boss/boss_stomp.mp3'],
        ['boss_spin', 'sounds/sfx/boss/boss_spin.mp3'],
        ['boss_dash', 'sounds/sfx/boss/boss_dash.mp3'],
        ['boss_contact', 'sounds/sfx/boss/boss_contact.mp3'],
        ['hit', 'sounds/sfx/ui/hit.mp3'],
        ['hit_boss', 'sounds/sfx/ui/hit_boss.mp3'],
        ['death', 'sounds/sfx/ui/death.mp3'],
        ['heal_pickup', 'sounds/sfx/ui/heal_pickup.mp3'],
        ['stone_pickup', 'sounds/sfx/ui/stone_pickup.mp3'],
        ['ult_ready', 'sounds/sfx/ui/ult_ready.mp3']
    ];

    // Проверяем, существует ли soundManager
    if (typeof soundManager !== 'undefined') {
        soundManager.preloadAll(soundList);
        soundManager.playMusic('menu');
    } else {
        console.log('Sound manager not available - continuing without sound');
    }
}

loadGame();

function joinGame(charId) {
    document.getElementById("menu").style.display = "none";
    canvas.style.display = "block";
    document.getElementById("game-ui").style.display = "flex";
    document.getElementById("minimap-container").style.display = "flex";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Проверка на существование soundManager
    if (typeof soundManager !== 'undefined') {
        soundManager.playMusic('battle');
    }

    socket.emit("join", charId);
}

socket.on("init", (data) => {
    myId = data.id;
    serverClasses = data.classes;
});

socket.on("state", (state) => {
    gameState = state;

    // 🔥 Обработка ВСЕХ звуковых событий от сервера
    if (typeof soundManager !== 'undefined' && state.soundEvents && state.soundEvents.length > 0) {
        state.soundEvents.forEach(event => {
            // Не проигрываем звуки атак для своего персонажа (они уже проигрываются локально)
            if (event.sound && event.sound.startsWith('attack_')) {
                // Находим своего персонажа и проверяем расстояние
                if (myId && gameState.players[myId]) {
                    const me = gameState.players[myId];
                    // Проигрываем звуки атак только если они далеко от нас (это другие игроки)
                    const dist = Math.sqrt(Math.pow(event.x - me.x, 2) + Math.pow(event.y - me.y, 2));
                    if (dist > 100) { // Если дальше 100 единиц - значит это другой игрок
                        soundManager.play(event.sound, 0.7); // Немного тише для чужих атак
                    }
                }
            } else {
                // Все остальные звуки (скиллы, босс, предметы и т.д.) проигрываем всегда
                soundManager.play(event.sound);
            }
        });
    }

    // Звук появления/смерти босса
    if (typeof soundManager !== 'undefined') {
        if (state.boss && !previousBossExists) {
            soundManager.play('boss_spawn');
            soundManager.playMusic('boss');
        }
        if (!state.boss && previousBossExists) {
            soundManager.play('boss_death');
            soundManager.playMusic('battle');
        }

        // Проверка состояний игроков
        for (let id in state.players) {
            const player = state.players[id];

            // Урон по своему персонажу
            if (id === myId && previousPlayerHP[id] !== undefined) {
                if (player.hp < previousPlayerHP[id]) {
                    soundManager.play('hit');
                }
                if (player.hp > previousPlayerHP[id] + 30) {
                    soundManager.play('heal_pickup');
                }
            }

            // Ультимейт готов
            if (id === myId && player.ultCharge >= 100 && (!previousUltCharge[id] || previousUltCharge[id] < 100)) {
                soundManager.play('ult_ready');
            }

            previousPlayerHP[id] = player.hp;
            previousUltCharge[id] = player.ultCharge;
        }
    }

    previousBossExists = !!state.boss;

    updateUI();
});

function updateUI() {
    if (!myId || !gameState.players[myId]) return;
    let me = gameState.players[myId];

    let dispE = me.stolen && me.stolen.slot === 'E' ? "УКРАДЕНО" : serverClasses[me.classId].skillName;
    let dispQ = me.stolen && me.stolen.slot === 'Q' ? "УКРАДЕНО" : serverClasses[me.classId].qName;

    document.getElementById("hp-bar-fill").style.width = (me.hp / me.maxHp * 100) + "%";
    document.getElementById("hp-text").innerText = `${Math.ceil(me.hp)} / ${me.maxHp}`;
    document.getElementById("skill-e-name").innerText = dispE;
    document.getElementById("skill-q-name").innerText = dispQ;

    let eTimeLeft = Math.max(0, me.lastE + serverClasses[me.classId].eCD - gameState.serverTime);
    document.getElementById("skill-e-cooldown").style.height = ((eTimeLeft / serverClasses[me.classId].eCD) * 100) + "%";
    document.getElementById("skill-q-charge").style.height = me.ultCharge + "%";
}

window.addEventListener("keydown", (e) => {
    let k = e.key.toLowerCase();
    if (k === 'w' || k === 'ц') keys.w = true;
    if (k === 'a' || k === 'ф') keys.a = true;
    if (k === 's' || k === 'ы') keys.s = true;
    if (k === 'd' || k === 'в') keys.d = true;
    if (k === 'e' || k === 'у') {
        if (myId && gameState.players[myId]) {
            const classId = gameState.players[myId].classId;
            if (typeof soundManager !== 'undefined') {
                soundManager.play(skillESounds[classId]);
            }
        }
        socket.emit("input", { keys, angle: mouseAngle, targetX, targetY, click: mouseClick, e: true, q: false });
    }
    if (k === 'q' || k === 'й') {
        if (typeof soundManager !== 'undefined') {
            soundManager.play('ult_ready');
        }
        socket.emit("input", { keys, angle: mouseAngle, targetX, targetY, click: mouseClick, e: false, q: true });
    }
});

window.addEventListener("keyup", (e) => {
    let k = e.key.toLowerCase();
    if (k === 'w' || k === 'ц') keys.w = false;
    if (k === 'a' || k === 'ф') keys.a = false;
    if (k === 's' || k === 'ы') keys.s = false;
    if (k === 'd' || k === 'в') keys.d = false;
});

window.addEventListener("mousemove", (e) => {
    if (!myId || !gameState.players[myId]) return;
    let me = gameState.players[myId];
    mouseAngle = Math.atan2(e.clientY - canvas.height / 2, e.clientX - canvas.width / 2);
    targetX = me.x + (e.clientX - canvas.width / 2);
    targetY = me.y + (e.clientY - canvas.height / 2);
});

window.addEventListener("mousedown", () => {
    mouseClick = true;
    if (myId && gameState.players[myId]) {
        const classId = gameState.players[myId].classId;
        if (typeof soundManager !== 'undefined') {
            soundManager.play(`attack_${classId}`);
        }
    }
});

window.addEventListener("mouseup", () => mouseClick = false);

setInterval(() => {
    if (myId) socket.emit("input", { keys, angle: mouseAngle, targetX, targetY, click: mouseClick, e: false, q: false });
}, 1000 / 60);

// Функция отрисовки
function draw() {
    requestAnimationFrame(draw);
    if (!myId || !gameState.players[myId]) return;
    let me = gameState.players[myId];
    let amInDim = me.states.dimension > gameState.serverTime;

    ctx.fillStyle = amInDim ? "rgba(44, 14, 55, 1)" : "#444";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2 - me.x, canvas.height / 2 - me.y);

    ctx.strokeStyle = amInDim ? "#8e44ad" : "#555";
    ctx.lineWidth = 1;
    for(let i = MAP_MIN; i < MAP_MAX; i += 200) {
        ctx.beginPath(); ctx.moveTo(i, MAP_MIN); ctx.lineTo(i, MAP_MAX); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(MAP_MIN, i); ctx.lineTo(MAP_MAX, i); ctx.stroke();
    }

    if (gameState.boss && !amInDim) {
        let b = gameState.boss;
        const bossImg = textures['boss'];

        if (bossImg && bossImg.complete) {
            ctx.drawImage(bossImg, b.x - b.size/2, b.y - b.size/2, b.size, b.size);
        } else {
            ctx.fillStyle = "#e74c3c";
            ctx.fillRect(b.x - b.size/2, b.y - b.size/2, b.size, b.size);
        }

        const barWidth = 120;
        const barHeight = 15;
        const barX = b.x - barWidth/2;
        const barY = b.y - b.size/2 - 35;

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

        const hpPercent = b.hp / b.maxHp;
        ctx.fillStyle = hpPercent > 0.5 ? "#2ecc71" : hpPercent > 0.25 ? "#f1c40f" : "#e74c3c";
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${Math.ceil(b.hp)} / ${b.maxHp}`, b.x, barY + barHeight/2);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 16px Arial";
        ctx.fillText(b.name, b.x, barY - 15);

        if (hpPercent < 0.3) {
            ctx.strokeStyle = "rgba(231, 76, 60, 0.5)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size/2 + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else if (!gameState.boss && !amInDim) {
        if (gameState.bossRespawn) {
            const timeLeft = Math.max(0, Math.ceil((gameState.bossRespawn - gameState.serverTime) / 1000));

            // Сохраняем состояние контекста
            ctx.save();
            // Возвращаем трансформацию для экранных координат
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            const textX = canvas.width / 2;
            const textY = 70;

            // Фон для текста
            const textWidth = 400;
            const textHeight = 40;
            ctx.fillRect(textX - textWidth/2, textY - textHeight/2, textWidth, textHeight);

            ctx.fillStyle = "#f1c40f";
            ctx.font = "bold 24px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`БОСС ПОЯВИТСЯ ЧЕРЕЗ: ${timeLeft}с`, textX, textY);

            ctx.restore();
        }
    }

    gameState.entities.forEach(e => {
        if (e.type === 'field') {
            ctx.fillStyle = e.owner === myId ? "rgba(52, 152, 219, 0.2)" : "rgba(231, 76, 60, 0.2)";
            ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
        } else if (e.type === 'bot' && !amInDim) {
            ctx.fillStyle = "#bdc3c7"; ctx.fillRect(e.x - 15, e.y - 15, 30, 30);
            ctx.fillStyle = "red"; ctx.fillRect(e.x - 15, e.y - 25, 30 * (e.hp/100), 5);
        } else if (e.type === 'puddle') {
            ctx.fillStyle = "rgba(52, 152, 219, 0.4)";
            ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
        } else if (e.type === 'portal') {
            ctx.fillStyle = "black"; ctx.beginPath(); ctx.arc(e.x, e.y, 30, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = "#8e44ad"; ctx.lineWidth = 3; ctx.stroke();
        } else if (e.type === 'bait' && !amInDim) {
            ctx.fillStyle = "#e1b12c"; ctx.beginPath(); ctx.arc(e.x, e.y, 8, 0, Math.PI*2); ctx.fill();
        } else if (e.type === 'heal' && !amInDim) {
            ctx.fillStyle = "#2ecc71"; ctx.fillRect(e.x - 12, e.y - 12, 24, 24);
            ctx.fillStyle = "white"; ctx.font = "bold 18px Arial";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("+", e.x, e.y + 1);
        } else if (e.type === 'power_stone' && !amInDim) {
            ctx.fillStyle = "#f1c40f";
            ctx.beginPath(); ctx.arc(e.x, e.y, 15, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = "#f39c12"; ctx.lineWidth = 3; ctx.stroke();
            ctx.fillStyle = "white"; ctx.font = "bold 20px Arial";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("★", e.x, e.y + 1);
        } else if (e.type === 'b_stomp') {
            ctx.strokeStyle = "rgba(231, 76, 60, 0.5)";
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI*2); ctx.stroke();
        }
    });

    gameState.projectiles.forEach(p => {
        if (amInDim && p.owner !== myId) return;

        if (p.type === 'laser') {
            ctx.strokeStyle = "red"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - Math.cos(p.angle)*35, p.y - Math.sin(p.angle)*35); ctx.stroke();
        } else if (p.type === 'whip') {
            ctx.fillStyle = "#00a8ff";
            ctx.beginPath(); ctx.ellipse(p.x, p.y, 15, 8, p.angle, 0, Math.PI*2); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(p.x - Math.cos(p.angle)*15, p.y - Math.sin(p.angle)*15);
            ctx.lineTo(p.x - Math.cos(p.angle)*25 - Math.sin(p.angle)*10, p.y - Math.sin(p.angle)*25 + Math.cos(p.angle)*10);
            ctx.lineTo(p.x - Math.cos(p.angle)*25 + Math.sin(p.angle)*10, p.y - Math.sin(p.angle)*25 - Math.cos(p.angle)*10);
            ctx.fill();
        } else if (p.type === 'hook') {
            ctx.fillStyle = p.color || "#718093";
            ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI*2); ctx.fill();
            if (gameState.players[p.owner]) {
                ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(p.x, p.y);
                ctx.lineTo(gameState.players[p.owner].x, gameState.players[p.owner].y); ctx.stroke();
            }
        } else if (p.type === 'shark') {
            ctx.fillStyle = "rgba(41, 128, 185, 0.5)";
            ctx.beginPath(); ctx.arc(p.x, p.y, p.aoe, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "white"; ctx.font = "50px Arial";
            ctx.fillText("🦈", p.x - 25, p.y + 15);
        } else if (p.type === 'shark_ult') {
            ctx.fillStyle = "#2980b9";
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
            ctx.beginPath(); ctx.ellipse(0, 0, 30, 15, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "white"; ctx.font = "20px Arial";
            ctx.fillText("🦈", -12, 7);
            ctx.restore();
        } else if (p.type === 'bait_proj') {
            ctx.fillStyle = "#e1b12c";
            ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "rgba(225, 177, 44, 0.5)";
            ctx.beginPath(); ctx.arc(p.x - Math.cos(p.angle)*10, p.y - Math.sin(p.angle)*10, 5, 0, Math.PI*2); ctx.fill();
        } else if (p.type === 'b_laser') {
            ctx.strokeStyle = "#e74c3c"; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - Math.cos(p.angle)*40, p.y - Math.sin(p.angle)*40); ctx.stroke();
        } else if (p.type === 'b_stick') {
            ctx.fillStyle = "#c0392b";
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
            ctx.fillRect(-15, -5, 30, 10);
            ctx.restore();
        } else if (p.type === 'b_bullet') {
            ctx.fillStyle = "#e67e22";
            ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI*2); ctx.fill();
        } else {
            ctx.fillStyle = p.color || "white";
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size || 5, 0, Math.PI * 2); ctx.fill();
        }
    });

    for (let id in gameState.players) {
        let p = gameState.players[id];
        let isMe = (id === myId);

        let heInDim = p.states.dimension > gameState.serverTime;
        if (!isMe && heInDim) continue;
        if (!isMe && amInDim && !heInDim) continue;

        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);

        if (p.toggleE) {
            ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
            ctx.beginPath(); ctx.arc(0, 0, 120, 0, Math.PI*2); ctx.fill();
        }

        if (p.states.tank > gameState.serverTime) {
            ctx.strokeStyle = "#e67e22";
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI*2); ctx.stroke();
        }

        const img = textures[p.classId];
        if (img && img.complete) {
            ctx.drawImage(img, -25, -25, 50, 50);
            if (p.isRed) {
                ctx.globalCompositeOperation = "source-atop";
                ctx.fillStyle = "rgba(255, 0, 0, 0.5)"; ctx.fillRect(-25, -25, 50, 50);
                ctx.globalCompositeOperation = "source-over";
            }
        } else {
            ctx.fillStyle = p.isRed ? "red" : p.color;
            ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        if (!isMe) {
            ctx.fillStyle = "black"; ctx.fillRect(p.x - 20, p.y - 35, 40, 5);
            ctx.fillStyle = "red"; ctx.fillRect(p.x - 20, p.y - 35, 40 * (p.hp / p.maxHp), 5);

            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";
            ctx.fillText(serverClasses[p.classId].name, p.x, p.y - 40);
        }

        if (p.classId === 5) {
            ctx.fillStyle = "black"; ctx.fillRect(p.x - 20, p.y + 30, 40, 5);
            ctx.fillStyle = "#2ecc71"; ctx.fillRect(p.x - 20, p.y + 30, 40 * (p.stamina / 100), 5);
        }

        if (p.buffs) {
            ctx.fillStyle = "#f1c40f";
            ctx.beginPath(); ctx.arc(p.x, p.y + 25, 8, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "white"; ctx.font = "bold 10px Arial";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("★", p.x, p.y + 25);
        }
    }
    ctx.restore();

    minimapCtx.clearRect(0, 0, 150, 150);
    const scale = 150 / 4000;

    for (let id in gameState.players) {
        let p = gameState.players[id];
        if (p.states.dimension > gameState.serverTime && id !== myId) continue;
        minimapCtx.fillStyle = (id === myId) ? "#2ecc71" : "#e74c3c";
        minimapCtx.beginPath();
        minimapCtx.arc((p.x - MAP_MIN) * scale, (p.y - MAP_MIN) * scale, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    }

    if (gameState.boss) {
        minimapCtx.fillStyle = "#f1c40f";
        minimapCtx.beginPath();
        minimapCtx.arc((gameState.boss.x - MAP_MIN) * scale, (gameState.boss.y - MAP_MIN) * scale, 5, 0, Math.PI * 2);
        minimapCtx.fill();
        minimapCtx.strokeStyle = "red";
        minimapCtx.lineWidth = 2;
        minimapCtx.stroke();
    }

    document.getElementById("coords").innerText = `X: ${Math.round(me.x)} Y: ${Math.round(me.y)}`;
}
draw();