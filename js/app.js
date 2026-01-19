import { MAP_DATA, GAME_CONFIG } from './data.js';

class CarbonMarble {
    constructor() {
        this.player = { 
            pos: 0, 
            money: GAME_CONFIG.START_MONEY, 
            carbon: 0,
            assets: [] 
        };
        
        this.boardEl = document.getElementById('board');
        this.logEl = document.getElementById('game-log');
        this.rollBtn = document.getElementById('roll-btn');
        this.controlBox = document.querySelector('.control-box'); 

        this.init();
    }

    init() {
        this.renderBoard();
        this.updateUI();
        
        // 주사위 버튼 이벤트 연결 (버튼이 있을 때만)
        if(this.rollBtn) {
            this.rollBtn.addEventListener('click', () => this.rollDice());
        }
    }

    renderBoard() {
        // [수정된 부분] 패널을 지우기 전에 먼저 찾아서 변수에 저장해둡니다!
        const centerPanel = document.querySelector('.center-panel');
        
        // 그 다음 보드를 초기화합니다.
        this.boardEl.innerHTML = ''; 
        
        // 아까 챙겨둔 패널을 다시 집어넣습니다.
        if (centerPanel) {
            this.boardEl.appendChild(centerPanel);
        }

        // 타일 생성 루프
        MAP_DATA.forEach((tile, index) => {
            const el = document.createElement('div');
            el.className = `tile ${tile.type}`;
            el.id = `tile-${index}`;
            el.innerHTML = `
                <div>${tile.name}</div>
                ${tile.cost ? `<div style="font-family:'VT323'">₩${tile.cost}</div>` : ''}
            `;
            
            this.setGridPosition(el, index);
            
            if (index === 0) {
                const token = document.createElement('div');
                token.className = 'player-token';
                token.id = 'player-token';
                el.appendChild(token);
            }
            
            this.boardEl.appendChild(el);
        });
    }

    setGridPosition(el, index) {
        // 6x6 보드 좌표 계산
        if (index < 6) { el.style.gridRow = 1; el.style.gridColumn = index + 1; }
        else if (index < 10) { el.style.gridRow = index - 4; el.style.gridColumn = 6; }
        else if (index < 16) { el.style.gridRow = 6; el.style.gridColumn = 6 - (index - 10); }
        else { el.style.gridRow = 6 - (index - 15); el.style.gridColumn = 1; }
    }

    rollDice() {
        this.removeBuyButton();
        const dice = Math.floor(Math.random() * 6) + 1;
        
        const diceDisplay = document.getElementById('dice-display');
        if(diceDisplay) diceDisplay.innerText = `🎲 ${dice}`;
        
        this.movePlayer(dice);
    }

    movePlayer(steps) {
        const oldPos = this.player.pos;
        this.player.pos = (this.player.pos + steps) % MAP_DATA.length;
        
        const targetTile = document.getElementById(`tile-${this.player.pos}`);
        const token = document.getElementById('player-token');
        if(targetTile && token) targetTile.appendChild(token);

        this.log(`이동: [${MAP_DATA[this.player.pos].name}] 도착`);
        
        if (this.player.pos < oldPos) {
            this.passStartLine();
        }

        this.handleTile(MAP_DATA[this.player.pos]);
    }

    handleTile(tile) {
        if (tile.type === 'factory' || tile.type === 'eco') {
            if (this.player.assets.includes(tile.id)) {
                this.log(`내 소유의 [${tile.name}]입니다.`);
            } else {
                if (this.player.money >= tile.cost) {
                    this.showBuyButton(tile);
                } else {
                    this.log(`자금 부족: [${tile.name}] (필요: ${tile.cost})`);
                }
            }
        } else if (tile.type === 'chance') {
            this.log("🔑 황금열쇠 칸입니다.");
        }
    }

    showBuyButton(tile) {
        const btn = document.createElement('button');
        btn.innerText = `${tile.name} 매입 (-${tile.cost})`;
        btn.className = 'btn-primary';
        btn.id = 'buy-btn';
        btn.style.marginTop = '10px';
        btn.style.backgroundColor = tile.type === 'factory' ? '#c0392b' : '#27ae60';
        
        btn.onclick = () => this.buyProperty(tile);
        
        if(this.controlBox) this.controlBox.appendChild(btn);
        if(this.rollBtn) this.rollBtn.style.display = 'none';
    }

    removeBuyButton() {
        const existingBtn = document.getElementById('buy-btn');
        if (existingBtn) existingBtn.remove();
        if(this.rollBtn) this.rollBtn.style.display = 'inline-block';
    }

    buyProperty(tile) {
        this.player.money -= tile.cost;
        this.player.assets.push(tile.id);
        this.player.carbon += tile.carbon;

        this.log(`🎉 [${tile.name}] 매입 완료!`);
        
        const tileEl = document.getElementById(`tile-${tile.id}`);
        if(tileEl) tileEl.style.border = "3px solid #f1c40f";
        
        this.updateUI();
        this.removeBuyButton();
    }

    passStartLine() {
        const tax = this.player.carbon > 0 ? this.player.carbon * GAME_CONFIG.TAX_RATE : 0;
        const finalSalary = GAME_CONFIG.SALARY - tax;
        this.player.money += finalSalary;
        this.log(`🔄 한 바퀴 완주! (월급 ${GAME_CONFIG.SALARY} - 탄소세 ${tax})`);
        this.updateUI();
    }

    updateUI() {
        const moneyEl = document.getElementById('money');
        if(moneyEl) moneyEl.innerText = `${this.player.money.toLocaleString()}k`;
        
        const carbonEl = document.getElementById('carbon');
        if(carbonEl) {
            carbonEl.innerText = `${this.player.carbon} t`;
            if(this.player.carbon < 0) carbonEl.style.color = '#2980b9';
            else carbonEl.style.color = '#c0392b';
        }
    }

    log(msg) {
        const p = document.createElement('p');
        p.innerText = msg;
        if(this.logEl) this.logEl.prepend(p);
    }
}

new CarbonMarble();
