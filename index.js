const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const CLASSES = {
    1: { name: "Вергазова", hp: 300, speed: 4, color: "#9b59b6", skillName: "ЛЕКЦИЯ", qName: "ИНТЕГРИРОВАНИЕ", eCD: 8000 },
    2: { name: "Марченко", hp: 200, speed: 5, color: "#3498db", skillName: "ОБР. МАТРИЦА", qName: "ВЕКТОРНОЕ ПРОСТРАНСТВО", eCD: 10000 },
    3: { name: "Мальцева", hp: 150, speed: 6, color: "#f1c40f", skillName: "USB-ФЛЕШКА", qName: "БОТ-ПОМОЩНИК", eCD: 12000 },
    4: { name: "Мурашкина", hp: 350, speed: 3, color: "#e67e22", skillName: "РПГ", qName: "РЕЖИМ ТАНКА", eCD: 6000 },
    5: { name: "Томчук", hp: 200, speed: 5, color: "#27ae60", skillName: "ПЕРДЁЖ (ВКЛ)", qName: "ШАМПУНЬ", eCD: 500 },
    6: { name: "Никандров", hp: 220, speed: 4.5, color: "#34495e", skillName: "СПИНИНГ", qName: "РЫБАЛКА", eCD: 7000 },
    7: { name: "Никитос", hp: 200, speed: 6, color: "#8e44ad", skillName: "СЪЕБАТЬСЯ", qName: "СПИЗДИТЬ", eCD: 10000 }
};
let boss = null;
let bossRespawn = Date.now() + 30000;
let players = {};
let projectiles = [];
let entities = [];
let soundEvents = [];

function distance(x1, y1, x2, y2) { return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)); }

function addSoundEvent(sound, x, y) {
    soundEvents.push({ sound, x, y, time: Date.now() });
    soundEvents = soundEvents.filter(e => Date.now() - e.time < 1000);
}

function castSkillE(p, cId, now, data) {
    if (cId === 1) {
        projectiles.push({ x: p.x, y: p.y, angle: p.angle, speed: 8, owner: p.id, dmg: 5, effect: 'sleep', pierce: true, life: 800, size: 50, color: "purple" });
        addSoundEvent('sleep_cast', p.x, p.y);
    }
    else if (cId === 2) {
        for(let i=0; i<8; i++) projectiles.push({ x: p.x, y: p.y, angle: p.angle + (Math.random()-0.5), speed: 9, owner: p.id, dmg: 5, effect: 'invert', pierce: true, life: 600, color: "sand" });
        addSoundEvent('invert_cast', p.x, p.y);
    }
    else if (cId === 3) {
        projectiles.push({ x: p.x, y: p.y, angle: p.angle, speed: 15, owner: p.id, dmg: 15, effect: 'silence', pierce: false, life: 1000, color: "black" });
        addSoundEvent('silence_cast', p.x, p.y);
    }
    else if (cId === 4) {
        projectiles.push({ x: p.x, y: p.y, angle: p.angle, speed: 12, owner: p.id, dmg: 40, aoe: 150, pierce: false, life: 1000, color: "orange" });
        addSoundEvent('rpg_cast', p.x, p.y);
    }
    else if (cId === 5) {
        p.toggleE = !p.toggleE;
        addSoundEvent('perdezh_cast', p.x, p.y);
    }
    else if (cId === 6) {
        projectiles.push({ x: p.x, y: p.y, angle: p.angle, speed: 15, owner: p.id, dmg: 10, type: 'hook', pierce: false, life: 800, color: "#718093", canHookBoss: true });
        addSoundEvent('hook_cast', p.x, p.y);
    }
    else if (cId === 7) {
        p.states.dimension = now + 3000;
        entities.push({ type: 'portal', x: p.x, y: p.y, life: now + 3000 });
        addSoundEvent('dimension_cast', p.x, p.y);
    }
}

function castSkillQ(p, cId, now, data) {
    if (cId === 1) {
        p.x += Math.cos(p.angle)*300; p.y += Math.sin(p.angle)*300; p.hp = p.maxHp;
        addSoundEvent('heal_pickup', p.x, p.y);
    }
    else if (cId === 2) {
        entities.push({ type: 'field', x: p.x, y: p.y, owner: p.id, life: now + 8000, radius: 250 });
    }
    else if (cId === 3) {
        entities.push({ type: 'bot', x: p.x, y: p.y, owner: p.id, hp: 150, lastShot: 0, size: 35 });
    }
    else if (cId === 4) p.states.tank = now + 10000;
    else if (cId === 5) p.states.shampoo = now + 5000;
    else if (cId === 6) {
        let angle = Math.atan2(data.targetY - p.y, data.targetX - p.x);
        projectiles.push({
            type: 'shark_ult', x: p.x, y: p.y, targetX: data.targetX, targetY: data.targetY,
            angle: angle, speed: 10, owner: p.id, dmg: 80, life: 3000, size: 60
        });
        addSoundEvent('shark_cast', p.x, p.y);
    }
    else if (cId === 7) {
        let target = null; let minDist = 600;
        for (let id in players) {
            if (id !== p.id && distance(p.x, p.y, players[id].x, players[id].y) < minDist) {
                minDist = distance(p.x, p.y, players[id].x, players[id].y); target = players[id];
            }
        }
        if (target) {
            p.stolen = { slot: Math.random() > 0.5 ? 'E' : 'Q', classId: target.classId, expire: now + 30000 };
            p.isRed = true;
        }
    }
}

io.on("connection", (socket) => {
    socket.on("join", (charId) => {
        const pClass = CLASSES[charId];
        players[socket.id] = {
            id: socket.id, classId: charId,
            x: Math.random() * 800 + 100, y: Math.random() * 600 + 100,
            angle: 0, hp: pClass.hp, maxHp: pClass.hp, speed: pClass.speed, color: pClass.color,
            inputs: { w: false, a: false, s: false, d: false },
            lastShot: 0, lastE: 0, ultCharge: 0,
            stamina: 100, maxStamina: 100, toggleE: false, stolen: null,
            states: { sleep: 0, inverted: 0, silenced: 0, tank: 0, dimension: 0, shampoo: 0, slow: 0 },
            isRed: false, buffs: null
        };
        socket.emit("init", { id: socket.id, classes: CLASSES });
    });

    socket.on("input", (data) => {
        let p = players[socket.id];
        if (!p) return;
        p.inputs = data.keys; p.angle = data.angle;
        const now = Date.now();

        if (p.states.sleep > now) return;

        let shotCD = 500;
        if (p.states.tank > now) shotCD = 1000;
        if (p.classId === 5) shotCD = 60;

        if (data.click && now - p.lastShot > shotCD) {
            if (p.classId === 5) {
                if (p.stamina > 2) {
                    p.stamina -= 1.5; p.lastShot = now;
                    projectiles.push({ type: 'laser', x: p.x, y: p.y, angle: p.angle, speed: 25, owner: p.id, dmg: 2, pierce: true, life: 150, color: "#f1c40f" });
                    addSoundEvent('attack_5', p.x, p.y);
                }
            }
             else {
                p.lastShot = now;
                if (p.classId === 1) {
                    [-0.5, 0, 0.5].forEach(off => projectiles.push({ x: p.x, y: p.y, angle: p.angle + off, speed: 10, owner: p.id, dmg: 15, pierce: true, life: 1000, color: "white" }));
                    addSoundEvent('attack_1', p.x, p.y);
                }
                else if (p.classId === 2) {
                    projectiles.push({ x: p.x, y: p.y, angle: p.angle, speed: 20, owner: p.id, dmg: 40, pierce: false, life: 1500, color: "#2980b9" });
                    addSoundEvent('attack_2', p.x, p.y);
                }
                else if (p.classId === 3) {
                    for(let i=0; i<5; i++) projectiles.push({ x: p.x, y: p.y, angle: p.angle + (Math.random()-0.5)*0.8, speed: 12, owner: p.id, dmg: 10, pierce: false, life: 400, color: "yellow" });
                    addSoundEvent('attack_3', p.x, p.y);
                }
                else if (p.classId === 4) {
                    if (p.states.tank > now) {
                        projectiles.push({ x: p.x, y: p.y, angle: p.angle, speed: 15, owner: p.id, dmg: 50, aoe: 100, pierce: false, life: 1000, color: "orange" });
                    } else {
                        projectiles.push({ x: p.x+Math.cos(p.angle)*30, y: p.y+Math.sin(p.angle)*30, angle: p.angle, speed: 0, owner: p.id, dmg: 35, pierce: true, life: 100, size: 40, color: "brown" });
                    }
                    addSoundEvent('attack_4', p.x, p.y);
                }
                else if (p.classId === 6) {
                    projectiles.push({ type: 'whip', x: p.x+Math.cos(p.angle)*40, y: p.y+Math.sin(p.angle)*40, angle: p.angle, speed: 12, owner: p.id, dmg: 25, effect: 'fish_slow', pierce: true, life: 300 });
                    addSoundEvent('attack_6', p.x, p.y);
                }
                else if (p.classId === 7) {
                    projectiles.push({ x: p.x, y: p.y, angle: p.angle, speed: 18, owner: p.id, dmg: 18, pierce: false, life: 800, color: "#8e44ad" });
                    addSoundEvent('attack_7', p.x, p.y);
                }
            }
        }

        if (data.e && now - p.lastE > CLASSES[p.classId].eCD && p.states.silenced < now) {
            p.lastE = now;
            let castId = (p.stolen && p.stolen.slot === 'E' && p.stolen.expire > now) ? p.stolen.classId : p.classId;
            castSkillE(p, castId, now, data);
        }

        if (data.q && p.ultCharge >= 100 && p.states.silenced < now) {
            p.ultCharge = 0;
            let castId = (p.stolen && p.stolen.slot === 'Q' && p.stolen.expire > now) ? p.stolen.classId : p.classId;
            castSkillQ(p, castId, now, data);
        }
    });

    socket.on("disconnect", () => delete players[socket.id]);
});

setInterval(() => {
    const now = Date.now();

    let healCount = entities.filter(e => e.type === 'heal').length;
    if (healCount < 30 && Math.random() < 0.05) {
        entities.push({ type: 'heal', x: Math.random() * 4000 - 2000, y: Math.random() * 4000 - 2000, life: now + 60000 });
    }

    if (!boss && now > bossRespawn) {
        boss = {
            name: "BAZIS BOSS MARCHENKO",
            hp: 5000, maxHp: 5000,
            x: 0, y: 0,
            size: 80,
            aggro: {},
            lastAttack: 0,
            contactDamage: 30,
            lastContactDamage: {}
        };
        addSoundEvent('boss_spawn', boss.x, boss.y);
    }

    if (boss) {
        let target = null;
        let maxDmg = 0;
        for (let id in boss.aggro) {
            if (boss.aggro[id] > maxDmg) { maxDmg = boss.aggro[id]; target = players[id]; }
        }
        if (!target) {
            let minDist = 2000;
            for (let id in players) {
                let d = distance(boss.x, boss.y, players[id].x, players[id].y);
                if (d < minDist) { minDist = d; target = players[id]; }
            }
        }

        for (let pid in players) {
            let p = players[pid];
            if (p.states.dimension >= now) continue;

            let distToBoss = distance(boss.x, boss.y, p.x, p.y);
            if (distToBoss < boss.size/2 + 25) {
                if (!boss.lastContactDamage[pid] || now - boss.lastContactDamage[pid] > 1000) {
                    p.hp -= boss.contactDamage;
                    p.isRed = true;
                    boss.lastContactDamage[pid] = now;
                    boss.aggro[pid] = (boss.aggro[pid] || 0) + boss.contactDamage;
                    addSoundEvent('boss_contact', p.x, p.y);

                    let angle = Math.atan2(p.y - boss.y, p.x - boss.x);
                    p.x += Math.cos(angle) * 50;
                    p.y += Math.sin(angle) * 50;

                    if (p.hp <= 0) {
                        p.x = Math.random() * 800 + 100;
                        p.y = Math.random() * 600 + 100;
                        p.hp = p.maxHp;
                        p.states = { sleep: 0, inverted: 0, silenced: 0, tank: 0, dimension: 0, shampoo: 0, slow: 0 };
                        p.stolen = null;
                        p.buffs = null;
                        addSoundEvent('death', p.x, p.y);
                    }
                }
            }
        }

        if (target) {
            let angle = Math.atan2(target.y - boss.y, target.x - boss.x);
            boss.x += Math.cos(angle) * 1.5;
            boss.y += Math.sin(angle) * 1.5;

            if (now - boss.lastAttack > 2000) {
                boss.lastAttack = now;
                let atkType = Math.floor(Math.random() * 5);

                if (atkType === 0) {
                    for(let i=-1; i<=1; i++)
                        projectiles.push({ type: 'b_laser', x: boss.x, y: boss.y, angle: angle + i*0.2, speed: 10, dmg: 40, owner: 'boss', life: 2000 });
                    addSoundEvent('boss_laser', boss.x, boss.y);
                }
                else if (atkType === 1) {
                    for(let i=0; i<8; i++)
                        projectiles.push({ type: 'b_stick', x: boss.x, y: boss.y, angle: (Math.PI*2/8)*i, speed: 7, dmg: 20, owner: 'boss', life: 1000, effect: 'fear' });
                    addSoundEvent('boss_sticks', boss.x, boss.y);
                }
                else if (atkType === 2) {
                    entities.push({ type: 'b_stomp', x: boss.x, y: boss.y, radius: 250, life: now + 1000 });
                    addSoundEvent('boss_stomp', boss.x, boss.y);
                }
                else if (atkType === 3) {
                    for(let i=0; i<12; i++)
                        projectiles.push({ type: 'b_bullet', x: boss.x, y: boss.y, angle: (Math.PI*2/12)*i, speed: 5, dmg: 15, owner: 'boss', life: 2000 });
                    addSoundEvent('boss_spin', boss.x, boss.y);
                }
                else if (atkType === 4) {
                    boss.x = target.x; boss.y = target.y;
                    addSoundEvent('boss_dash', boss.x, boss.y);
                }
            }
        }

        if (boss.hp <= 0) {
            entities.push({ type: 'power_stone', x: boss.x, y: boss.y, life: now + 30000 });
            addSoundEvent('boss_death', boss.x, boss.y);
            boss = null;
            bossRespawn = now + 30000;
        }
    }

    for (let id in players) {
        let p = players[id];
        if (p.ultCharge < 100) p.ultCharge = Math.min(100, p.ultCharge + 0.05);

        // Восстановление стамины Томчука
        if (p.classId === 5 && p.stamina < p.maxStamina) {
            p.stamina = Math.min(p.maxStamina, p.stamina + 0.15);
        }

        if (p.buffs && p.buffs.regen && now % 1000 < 16) {
            p.hp = Math.min(p.maxHp, p.hp + 1);
        }

        if (p.classId === 5 && p.toggleE && p.states.dimension < now) {
            p.hp -= 0.05;
            for(let id2 in players) {
                if (id2 !== p.id && distance(p.x, p.y, players[id2].x, players[id2].y) < 120 && players[id2].states.dimension < now) {
                    players[id2].hp -= 0.15;
                    players[id2].isRed = true;
                }
            }
            if (boss && distance(p.x, p.y, boss.x, boss.y) < 120) {
                boss.hp -= 0.3;
                boss.aggro[p.id] = (boss.aggro[p.id] || 0) + 0.3;
            }
        }

        if (p.states.shampoo > now && (now % 200 < 20)) {
            entities.push({ type: 'puddle', x: p.x, y: p.y, life: now + 3000, radius: 40, owner: p.id });
        }

        if (p.states.sleep < now) {
            let mult = (p.states.inverted > now) ? -1 : 1;
            let speed = p.speed;
            if (p.buffs && p.buffs.speed) speed *= p.buffs.speed;

            if (p.states.slow > now) speed *= 0.5;
            if (p.states.shampoo > now) speed *= 1.6;

            entities.forEach(e => {
                if (e.type === 'field' && distance(p.x, p.y, e.x, e.y) < e.radius) speed *= (e.owner === p.id) ? 1.5 : 0.3;
                if (e.type === 'puddle' && distance(p.x, p.y, e.x, e.y) < e.radius && e.owner !== p.id) speed *= 0.6;
            });

            if (p.inputs.w) p.y -= speed * mult; if (p.inputs.s) p.y += speed * mult;
            if (p.inputs.a) p.x -= speed * mult; if (p.inputs.d) p.x += speed * mult;
        }
        p.isRed = false;
    }

    entities = entities.filter(e => {
        if (e.type === 'field' || e.type === 'puddle' || e.type === 'portal') return e.life > now;

        if (e.type === 'heal') {
            if (e.life < now) return false;
            let picked = false;
            for (let pid in players) {
                let p = players[pid];
                if (p.hp > 0 && distance(e.x, e.y, p.x, p.y) < 25 && p.states.dimension < now) {
                    p.hp = Math.min(p.maxHp, p.hp + 50);
                    picked = true;
                    addSoundEvent('heal_pickup', e.x, e.y);
                    break;
                }
            }
            return !picked;
        }

        if (e.type === 'power_stone') {
            if (e.life < now) return false;
            for (let pid in players) {
                let p = players[pid];
                if (distance(p.x, p.y, e.x, e.y) < 30 && p.states.dimension < now) {
                    p.buffs = { speed: 1.2, hp: 1.2, regen: 1.2 };
                    if (p.buffs.hp) {
                        p.maxHp *= 1.2;
                        p.hp = Math.min(p.maxHp, p.hp * 1.2);
                    }
                    addSoundEvent('stone_pickup', e.x, e.y);
                    return false;
                }
            }
            return true;
        }

        if (e.type === 'bait') {
            if (e.life < now) {
                projectiles.push({
                    type: 'shark',
                    x: e.x, y: e.y,
                    speed: 0, aoe: 200, dmg: 150,
                    owner: e.owner, life: 300
                });
                addSoundEvent('shark_cast', e.x, e.y);
                return false;
            }
            return true;
        }

        if (e.type === 'bot') {
            if (e.hp <= 0) return false;

            // Бот получает урон от снарядов
            for (let i = projectiles.length - 1; i >= 0; i--) {
                let proj = projectiles[i];
                if (proj.owner !== e.owner && distance(proj.x, proj.y, e.x, e.y) < (proj.size || 10) + 20) {
                    e.hp -= proj.dmg;
                    if (!proj.pierce) {
                        projectiles.splice(i, 1);
                    }
                }
            }

            // Бот получает урон от босса
            if (boss && distance(e.x, e.y, boss.x, boss.y) < 60) {
                e.hp -= 5;
            }

            // Бот получает лечение от хилок
            entities.forEach(heal => {
                if (heal.type === 'heal' && heal.life > 0 && distance(e.x, e.y, heal.x, heal.y) < 25) {
                    e.hp = Math.min(150, e.hp + 30);
                    heal.life = 0;
                }
            });

            // Поиск цели
            let target = null;
            let minDist = 800;

            if (boss) {
                let d = distance(e.x, e.y, boss.x, boss.y);
                if (d < minDist) {
                    minDist = d;
                    target = { x: boss.x, y: boss.y, isBoss: true };
                }
            }

            for(let pid in players) {
                if(pid !== e.owner && players[pid].hp > 0 && players[pid].states.dimension < now) {
                    let d = distance(e.x, e.y, players[pid].x, players[pid].y);
                    if (d < minDist) {
                        minDist = d;
                        target = players[pid];
                    }
                }
            }

            if (target) {
                let angle = Math.atan2(target.y - e.y, target.x - e.x);
                e.x += Math.cos(angle) * 3;
                e.y += Math.sin(angle) * 3;
                if (now - e.lastShot > 800) {
                    e.lastShot = now;
                    projectiles.push({
                        x: e.x,
                        y: e.y,
                        angle: angle + (Math.random() - 0.5) * 0.3,
                        speed: 15,
                        owner: e.owner,
                        dmg: 12,
                        pierce: false,
                        life: 800,
                        color: "red",
                        targetBoss: target.isBoss,
                        size: 8
                    });
                }
            }
            return true;
        }
        return false;
    });

    for (let i = projectiles.length - 1; i >= 0; i--) {
        let proj = projectiles[i];
        proj.x += Math.cos(proj.angle) * proj.speed;
        proj.y += Math.sin(proj.angle) * proj.speed;
        proj.life -= 16;
        let hit = false;
        let size = proj.size || 10;

        if (boss && proj.owner !== 'boss') {
            let distToBoss = distance(proj.x, proj.y, boss.x, boss.y);

            if (distToBoss < size + boss.size/2) {
                boss.hp -= proj.dmg;
                boss.aggro[proj.owner] = (boss.aggro[proj.owner] || 0) + proj.dmg;
                addSoundEvent('hit_boss', proj.x, proj.y);

                if (proj.effect === 'sleep') {
                    boss.lastAttack = now + 3000;
                }
                if (proj.effect === 'fish_slow') {
                    if (!boss.slowUntil || boss.slowUntil < now) {
                        boss.slowUntil = now + 2000;
                        boss.originalSpeed = boss.originalSpeed || 1.5;
                        boss.currentSpeed = boss.originalSpeed * 0.5;
                    }
                }

                if (proj.type === 'hook' && proj.canHookBoss) {
                    let owner = players[proj.owner];
                    if (owner) {
                        let angle = Math.atan2(owner.y - boss.y, owner.x - boss.x);
                        boss.x = owner.x + Math.cos(proj.angle) * 80;
                        boss.y = owner.y + Math.sin(proj.angle) * 80;
                    }
                }

                if (proj.aoe) {
                    boss.hp -= proj.dmg * 0.5;
                    boss.aggro[proj.owner] = (boss.aggro[proj.owner] || 0) + proj.dmg * 0.5;
                }

                if (!proj.pierce && proj.type !== 'hook') hit = true;
            }
        }

        if (proj.type === 'bait_proj') {
            if (distance(proj.x, proj.y, proj.targetX, proj.targetY) < proj.speed) {
                hit = true;
                entities.push({
                    type: 'bait',
                    x: proj.targetX,
                    y: proj.targetY,
                    owner: proj.owner,
                    life: now + 2000
                });
            }
        }

        if (proj.type === 'shark_ult') {
            if (boss && distance(proj.x, proj.y, boss.x, boss.y) < 100) {
                boss.hp -= proj.dmg;
                boss.aggro[proj.owner] = (boss.aggro[proj.owner] || 0) + proj.dmg;
                addSoundEvent('hit_boss', proj.x, proj.y);
                entities.push({ type: 'puddle', x: proj.x, y: proj.y, life: now + 5000, radius: 120, owner: proj.owner });
                hit = true;
            }
            if (proj.life <= 0) {
                entities.push({ type: 'puddle', x: proj.x, y: proj.y, life: now + 5000, radius: 120, owner: proj.owner });
            }
        }

        for (let pid in players) {
            let p = players[pid];
            if (p.id !== proj.owner && p.states.dimension < now && distance(proj.x, proj.y, p.x, p.y) < size + 25) {
                let dmgMult = 1;
                if (p.classId === 5 && p.toggleE) dmgMult = 0.5;

                p.hp -= (proj.dmg * dmgMult);
                if (dmgMult > 0 && proj.dmg > 0) p.isRed = true;
                p.states.sleep = 0;

                if (players[proj.owner] && proj.dmg > 0 && proj.owner !== 'boss') {
                    players[proj.owner].ultCharge = Math.min(100, players[proj.owner].ultCharge + 5);
                }

                if (proj.effect === 'sleep') p.states.sleep = now + 5000;
                if (proj.effect === 'invert') p.states.inverted = now + 5000;
                if (proj.effect === 'silence') p.states.silenced = now + 10000;
                if (proj.effect === 'fish_slow') p.states.slow = now + 2000;

                if (proj.effect === 'fear' && boss) {
                    let angleFromBoss = Math.atan2(p.y - boss.y, p.x - boss.x);
                    p.x += Math.cos(angleFromBoss) * 50;
                    p.y += Math.sin(angleFromBoss) * 50;
                }

                if (proj.type === 'hook') {
                    let owner = players[proj.owner];
                    if (owner) {
                        p.x = owner.x + Math.cos(proj.angle) * 40;
                        p.y = owner.y + Math.sin(proj.angle) * 40;
                    }
                    p.states.slow = now + 1000;
                }

                if (proj.aoe) {
                    for(let id2 in players) {
                        if (id2 !== proj.owner && distance(p.x, p.y, players[id2].x, players[id2].y) < proj.aoe && players[id2].states.dimension < now) {
                            players[id2].hp -= proj.dmg;
                            players[id2].isRed = true;
                        }
                    }
                    if (boss && distance(p.x, p.y, boss.x, boss.y) < proj.aoe) {
                        boss.hp -= proj.dmg;
                        boss.aggro[proj.owner] = (boss.aggro[proj.owner] || 0) + proj.dmg;
                        addSoundEvent('hit_boss', p.x, p.y);
                    }
                }

                if (!proj.pierce && proj.type !== 'bait_proj') hit = true;
                if (p.hp <= 0) {
                    p.x = Math.random()*800;
                    p.y = Math.random()*600;
                    p.hp = p.maxHp;
                    p.states = { sleep: 0, inverted: 0, silenced: 0, tank: 0, dimension: 0, shampoo: 0, slow: 0 };
                    p.stolen = null;
                    addSoundEvent('death', p.x, p.y);
                }
            }
        }

        if (boss && boss.slowUntil && now > boss.slowUntil) {
            boss.currentSpeed = boss.originalSpeed || 1.5;
            boss.slowUntil = null;
        }

        if (proj.life <= 0 || hit) projectiles.splice(i, 1);
    }

    if (boss) {
        boss.moveSpeed = boss.currentSpeed || 1.5;
    }

    io.emit("state", {
        players, projectiles, entities, boss, bossRespawn, serverTime: now,
        soundEvents: soundEvents.slice()
    });

    soundEvents = [];
}, 1000 / 60);

app.use(express.static(__dirname + "/assets"));
app.get("/", (req, res) => res.sendFile(__dirname + "/assets/index.html"));
http.listen(3000, () => console.log("Сервер запущен на порту 3000"));