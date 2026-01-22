/**
 * [2026-01-23] Eco Runner Game Engine (Graphic Update)
 * 설명: SVG Data URI를 활용하여 별도 파일 다운로드 없이 그래픽 렌더링 구현
 */

import { CONFIG, OBSTACLES, ITEMS, UPGRADES, PLAYER_IMG } from './data.js';

// === Image Loader (이미지 캐싱) ===
const assets = {};
function loadAsset(key, src) {
    if (assets[key]) return assets[key];
    const img = new Image();
    img.src = src;
    assets[key] = img;
    return img;
}

// === Storage & UI Manager ===
class StorageManager {
    static save(data) { try { localStorage.setItem('ecoRunnerData', JSON.stringify(data)); } catch(e){} }
    static load() {
        try {
            const data = localStorage.getItem('ecoRunnerData');
            return data ? JSON.parse(data) : { coins: 0, upgrades: {} };
        } catch (e) { return { coins: 0, upgrades: {} }; }
    }
}

class UIManager {
    constructor() {
        this.elements = {
            intro: document.getElementById('ui-intro'),
            hud: document.getElementById('ui-hud'),
            gameover: document.getElementById('ui-gameover'),
            shop: document.getElementById('ui-shop'),
            score: document.getElementById('score-value'),
            coin: document.getElementById('coin-value'),
            co2Bar: document.getElementById('co2-bar'),
            finalScore: document.getElementById('final-score'),
            finalCoins: document.getElementById('final-coins'),
            shopCoins: document.getElementById('shop-coin-display'),
            shopContainer: document.getElementById('shop-items-container')
        };
    }

    showScreen(name) {
        ['intro', 'hud', 'gameover', 'shop'].forEach(k => {
            if (this.elements[k]) {
                this.elements[k].classList.add('hidden');
                this.elements[k].classList.remove('active');
            }
        });
        if (this.elements[name]) {
            this.elements[name].classList.remove('hidden');
            this.elements[name].classList.add('active');
        }
    }

    updateHUD(score, coins, co2) {
        if(this.elements.score) this.elements.score.textContent = Math.floor(score);
        if(this.elements.coin) this.elements.coin.textContent = coins;
        if(this.elements.co2Bar) {
            const safeCo2 = isNaN(co2) ? 0 : Math.min(Math.max(co2, 0), 100);
            this.elements.co2Bar.style.width = `${safeCo2}%`;
            this.elements.co2Bar.style.backgroundColor = safeCo2 > 80 ? '#e74c3c' : (safeCo2 > 50 ? '#f39c12' : '#2ecc71');
        }
    }
    
    showToast(message) {
        const container = document.getElementById('toast-container');
        if(!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }

    renderShop(playerData, buyCallback) {
        if(!this.elements.shopCoins) return;
        this.elements.shopCoins.textContent = playerData.coins;
        this.elements.shopContainer.innerHTML = '';

        UPGRADES.forEach(item => {
            const currentLevel = (playerData.upgrades && playerData.upgrades[item.id]) || 0;
            const cost = item.baseCost * (currentLevel + 1);
            const isMax = currentLevel >= item.maxLevel;

            const div = document.createElement('div');
            div.className = `shop-item ${isMax ? 'locked' : ''}`;
            div.innerHTML = `
                <h3>${item.name}</h3>
                <p>${item.desc}</p>
                <p>Lv. ${currentLevel} / ${item.maxLevel}</p>
                <button class="btn primary small">${isMax ? 'MAX' : cost + ' EP'}</button>
            `;
            div.onclick = () => {
                if (!isMax && playerData.coins >= cost) buyCallback(item.id, cost);
            };
            this.elements.shopContainer.appendChild(div);
        });
    }
}

// === Player Class ===
class Player {
    constructor(canvasHeight, upgrades) {
        this.width = 50; 
        this.height = 50;
        this.x = 50; 
        const safeHeight = Math.max(canvasHeight, 200);
        this.groundY = safeHeight - 100 - this.height; 
        this.y = this.groundY;
        this.dy = 0;
        this.isJumping = false;
        this.jumpCount = 0;
        this.maxJumps = 2;
        this.upgrades = upgrades || {};
        
        // 이미지 로드
        this.image = loadAsset('player', PLAYER_IMG);
    }

    jump() {
        if (this.jumpCount < this.maxJumps) {
            this.dy = this.jumpCount === 0 ? CONFIG.JUMP_FORCE : CONFIG.DOUBLE_JUMP_FORCE;
            this.isJumping = true;
            this.jumpCount++;
        }
    }

    update(canvasHeight) {
        if (canvasHeight) {
             const safeHeight = Math.max(canvasHeight, 200);
             this.groundY = safeHeight - 100 - this.height;
        }

        this.dy += CONFIG.GRAVITY;
        this.y += this.dy;

        if (this.y > this.groundY) {
            this.y = this.groundY;
            this.dy = 0;
            this.isJumping = false;
            this.jumpCount = 0;
        }
    }

    draw(ctx) {
        if (this.image.complete) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // 로딩 전 백업 도형
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

// === GameObject Class ===
class GameObject {
    constructor(def, canvasWidth, canvasHeight) {
        this.def = def;
        this.x = canvasWidth;
        this.width = def.width || 40;
        this.height = def.height || 40;
        this.markedForDeletion = false;
        this.collisionProcessed = false;

        if (def.yPos === 'air') {
            this.y = canvasHeight - 220 - Math.random() * 80;
        } else if (def.yPos === 'ground' || !def.yPos) {
            this.y = canvasHeight - 100 - this.height;
        } else {
            this.y = canvasHeight - 150 - Math.random() * 150;
        }
        
        // 이미지 로드
        if (def.imgSrc) {
            this.image = loadAsset(def.type, def.imgSrc);
        }
    }

    update(speed) {
        this.x -= speed;
        if (this.x + this.width < 0) this.markedForDeletion = true;
    }

    draw(ctx) {
        if (this.image && this.image.complete) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // 백업 도형
            ctx.fillStyle = this.def.color || '#fff';
            if (this.def.score) {
                ctx.beginPath();
                ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        }
    }
}

// === Main Game Class ===
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ui = new UIManager();
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.state = 'INTRO'; 
        this.userData = StorageManager.load();
        
        this.reset();
        this.bindEvents();
        
        this.lastTime = performance.now();
        requestAnimationFrame(this.animate.bind(this));
    }

    resize() {
        const container = this.canvas.parentElement;
        if (container && container.clientWidth > 0) {
            this.width = this.canvas.width = container.clientWidth;
            this.height = this.canvas.height = container.clientHeight;
        } else {
            this.width = this.canvas.width = window.innerWidth;
            this.height = this.canvas.height = window.innerHeight;
        }
    }

    reset() {
        this.player = new Player(this.height, this.userData.upgrades);
        this.obstacles = [];
        this.items = [];
        this.score = 0;
        this.gameSpeed = CONFIG.GAME_SPEED_START;
        this.co2Level = 0;
        this.sessionCoins = 0;
        this.frameCount = 0;
        const techLevel = (this.userData.upgrades && this.userData.upgrades.tech) || 0;
        this.passiveCo2Reduction = techLevel * 0.01;
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => {
            if ((e.code === 'Space' || e.code === 'ArrowUp') && this.state === 'PLAYING') {
                e.preventDefault();
                this.player.jump();
            }
        });

        const jumpAction = (e) => {
            if (this.state === 'PLAYING') {
                e.preventDefault();
                this.player.jump();
            }
        };
        this.canvas.addEventListener('mousedown', jumpAction);
        this.canvas.addEventListener('touchstart', jumpAction, { passive: false });

        const safeBind = (id, fn) => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('click', fn);
        };

        safeBind('btn-start', () => this.startGame());
        safeBind('btn-restart', () => this.startGame());
        safeBind('btn-home', () => this.goHome());
        safeBind('btn-shop', () => {
            this.ui.showScreen('shop');
            this.ui.renderShop(this.userData, (id, cost) => this.buyUpgrade(id, cost));
        });
        safeBind('btn-close-shop', () => this.goHome());
    }

    startGame() {
        this.resize();
        this.reset();
        this.state = 'PLAYING';
        this.ui.showScreen('hud');
    }

    goHome() {
        this.state = 'INTRO';
        this.ui.showScreen('intro');
    }

    buyUpgrade(id, cost) {
        if (!this.userData.upgrades) this.userData.upgrades = {};
        this.userData.coins -= cost;
        this.userData.upgrades[id] = (this.userData.upgrades[id] || 0) + 1;
        StorageManager.save(this.userData);
        this.ui.renderShop(this.userData, (i, c) => this.buyUpgrade(i, c));
        this.ui.showToast('업그레이드 완료!');
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.userData.coins += this.sessionCoins;
        StorageManager.save(this.userData);
        
        const finalScoreEl = document.getElementById('final-score');
        const finalCoinsEl = document.getElementById('final-coins');
        if(finalScoreEl) finalScoreEl.textContent = Math.floor(this.score);
        if(finalCoinsEl) finalCoinsEl.textContent = this.sessionCoins;
        
        this.ui.showScreen('gameover');
    }

    spawnObjects() {
        this.frameCount++;
        try {
            if (this.frameCount % CONFIG.SPAWN_RATE_OBSTACLE === 0 && OBSTACLES.length > 0) {
                const def = OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)];
                this.obstacles.push(new GameObject(def, this.width, this.height));
            }
            if (this.frameCount % CONFIG.SPAWN_RATE_ITEM === 0 && ITEMS.length > 0) {
                const def = ITEMS[Math.floor(Math.random() * ITEMS.length)];
                this.items.push(new GameObject(def, this.width, this.height));
            }
        } catch (e) { console.error(e); }
    }

    update(deltaTime) {
        if (this.state !== 'PLAYING') return;
        
        if (this.gameSpeed < CONFIG.GAME_SPEED_MAX) this.gameSpeed += 0.001;
        this.co2Level += (CONFIG.CO2_PASSIVE_INCREASE - this.passiveCo2Reduction);
        
        if (this.co2Level >= CONFIG.CO2_MAX) {
            this.gameOver();
            return;
        }

        const shoeLevel = (this.userData.upgrades && this.userData.upgrades.shoes) || 0;
        this.score += (0.1 * (1 + shoeLevel * 0.1));

        this.player.update(this.height);
        this.spawnObjects();
        
        this.obstacles.forEach(o => o.update(this.gameSpeed));
        this.items.forEach(i => i.update(this.gameSpeed));
        
        this.obstacles = this.obstacles.filter(o => !o.markedForDeletion);
        this.items = this.items.filter(i => !i.markedForDeletion); 

        this.checkCollisions();
        this.ui.updateHUD(this.score, this.sessionCoins, this.co2Level);
    }

    checkCollisions() {
        const p = this.player;
        const safeUpgrades = this.userData.upgrades || {};
        
        // 간단한 AABB 충돌 체크 (이미지 크기 고려)
        const check = (a, b) => {
            return a.x < b.x + b.width && a.x + a.width > b.x &&
                   a.y < b.y + b.height && a.y + a.height > b.y;
        };
        
        this.obstacles.forEach(obs => {
            if (!obs.collisionProcessed && check(p, obs)) {
                obs.collisionProcessed = true;
                let damage = obs.def.damage || 10;
                damage = damage * (1 - ((safeUpgrades.filter || 0) * 0.1));
                this.co2Level += damage;
                this.ui.showToast(`⚠️ ${obs.def.name} 충돌!`);
            }
        });
        
        this.items.forEach((item) => {
             if (!item.markedForDeletion && check(p, item)) {
                item.markedForDeletion = true;
                if (item.def.score) {
                    this.score += item.def.score;
                    this.co2Level = Math.max(0, this.co2Level - (item.def.co2Reduction||0));
                    this.ui.showToast(`🌿 ${item.def.name} 획득!`);
                }
            }
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 지면
        if (this.height > 100) {
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.fillRect(0, this.height - 100, this.width, 100);
        }

        if (this.state === 'PLAYING') {
            try {
                this.obstacles.forEach(o => o.draw(this.ctx));
                this.items.forEach(i => i.draw(this.ctx));
                this.player.draw(this.ctx);
            } catch(e) {}
        }
    }

    animate(timeStamp) {
        const deltaTime = timeStamp - this.lastTime;
        this.lastTime = timeStamp;
        try {
            this.update(deltaTime);
            this.draw();
        } catch (e) { console.error(e); }
        requestAnimationFrame(this.animate.bind(this));
    }
}

window.onload = () => { new Game(); };
