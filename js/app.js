import { MAP_DATA, GAME_CONFIG } from './data.js';

class CarbonMarble {
    constructor() {
        // 게임 목표: 총 자산 10,000k 만들기
        this.GOAL_ASSET = 10000; 
        
        this.player = { 
            pos: 0, 
            money: GAME_CONFIG.START_MONEY, 
            carbon: 0,
            assets: [] // 보유한 타일 ID 목록
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
        
        if(this.rollBtn) {
            this.rollBtn.addEventListener('click', () => this.rollDice());
        }
        
        // 총 자산 표시 UI 추가 (없으면 만듦)
        this.addTotalAssetUI();
    }

    addTotalAssetUI() {
        const dashboard = document.querySelector('.dashboard');
        if(dashboard && !document.getElementById('total-asset')) {
            const div = document.createElement('div');
            div.className = 'stat-item total-asset';
            div.innerHTML = `<span class="label">총 자산 가치</span><span class="value" id="total-asset">0k</span>`;
            dashboard.appendChild(div);
        }
    }

    renderBoard() {
        const centerPanel = document.querySelector('.center-panel');
        this.boardEl.innerHTML = ''; 
        if (centerPanel) this.boardEl.appendChild(centerPanel);

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
        if (index < 6) { el.style.gridRow = 1; el.style.gridColumn = index + 1; }
        else if (index < 10) { el.style.gridRow = index - 4; el.style.gridColumn = 6; }
        else if (index < 16) { el.style.gridRow = 6; el.style.gridColumn = 6 - (index - 10); }
        else { el.style.gridRow = 6 - (index - 15); el.style.gridColumn = 1; }
    }

    rollDice() {
        this.clearButtons(); // 기존 버튼 청소
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

        // 한 바퀴 완주 체크
        if (this.player.pos < oldPos) {
            this.passStartLine();
        }

        this.handleTile(MAP_DATA[this.player.pos]);
    }

    handleTile(tile) {
        if (tile.type === 'factory' || tile.type === 'eco') {
            if (this.player.assets.includes(tile.id)) {
                this.log(`내 소유의 [${tile.name}]입니다.`);
                this.showRollButton(); // 다시 주사위 굴리기
            } else {
                // [선택지] 매입 vs 패스
                if (this.player.money >= tile.cost) {
                    this.showChoice(tile);
                } else {
                    this.log(`자금 부족으로 [${tile.name}] 패스.`);
                    this.showRollButton();
                }
            }
        } else {
            if (tile.type === 'chance') this.log("🔑 황금열쇠 (준비중)");
            else if (tile.type === 'start') this.log("🚩 출발점");
            this.showRollButton();
        }
    }

    // [핵심] 선택 버튼 2개 보여주기
    showChoice(tile) {
        this.rollBtn.style.display = 'none'; // 주사위 숨김
        
        const btnGroup = document.createElement('div');
        btnGroup.className = 'btn-group';
        btnGroup.id = 'choice-btns';

        // 1. 매입 버튼
        const buyBtn = document.createElement('button');
        buyBtn.innerText = `매입 (-${tile.cost})`;
        buyBtn.className = 'btn-primary';
        buyBtn.style.backgroundColor = tile.type === 'factory' ? '#c0392b' : '#27ae60';
        buyBtn.onclick = () => this.buyProperty(tile);

        // 2. 패스 버튼
        const passBtn = document.createElement('button');
        passBtn.innerText = '패스';
        passBtn.className = 'btn-secondary';
        passBtn.onclick = () => this.passProperty(tile);

        btnGroup.appendChild(buyBtn);
        btnGroup.appendChild(passBtn);
        this.controlBox.appendChild(btnGroup);
    }

    clearButtons() {
        const group = document.getElementById('choice-btns');
        if(group) group.remove();
    }

    showRollButton() {
        this.rollBtn.style.display = 'inline-block';
    }

    buyProperty(tile) {
        this.player.money -= tile.cost;
        this.player.assets.push(tile.id);
        this.player.carbon += tile.carbon;

        this.log(`🎉 [${tile.name}] 매입 완료!`);
        document.getElementById(`tile-${tile.id}`).style.border = "3px solid #f1c40f"; // 소유 표시
        
        this.updateUI();
        this.clearButtons();
        this.showRollButton();
    }

    passProperty(tile) {
        this.log(`💨 [${tile.name}] 매입을 포기했습니다.`);
        this.clearButtons();
        this.showRollButton();
    }

    passStartLine() {
        const tax = this.player.carbon > 0 ? this.player.carbon * GAME_CONFIG.TAX_RATE : 0;
        const finalSalary = GAME_CONFIG.SALARY - tax;
        this.player.money += finalSalary;
        this.log(`🔄 월급 +${GAME_CONFIG.SALARY} / 세금 -${tax}`);
        
        // 파산 체크
        if (this.player.money < 0) {
            alert("💸 파산했습니다! 탄소세를 감당하지 못했습니다.");
            location.reload();
        }
        
        this.updateUI();
        this.checkWin();
    }

    // 총 자산 계산
    calculateTotalAsset() {
        let assetValue = 0;
        this.player.assets.forEach(id => {
            const tile = MAP_DATA.find(t => t.id === id);
            if(tile) assetValue += tile.cost; // 매입가를 자산 가치로 인정
        });
        return this.player.money + assetValue;
    }

    checkWin() {
        const total = this.calculateTotalAsset();
        if (total >= this.GOAL_ASSET) {
            alert(`🏆 축하합니다! 총 자산 ${total.toLocaleString()}k 달성!\n진정한 넷제로 타이쿤이 되셨습니다.`);
            this.log("🏆 게임 승리!");
        }
    }

    updateUI() {
        if(document.getElementById('money')) {
            document.getElementById('money').innerText = `${this.player.money.toLocaleString()}k`;
        }
        
        const carbonEl = document.getElementById('carbon');
        if(carbonEl) {
            carbonEl.innerText = `${this.player.carbon} t`;
            carbonEl.style.color = this.player.carbon < 0 ? '#2980b9' : '#c0392b';
        }

        // 총 자산 업데이트
        const totalEl = document.getElementById('total-asset');
        if(totalEl) {
            const total = this.calculateTotalAsset();
            totalEl.innerText = `${total.toLocaleString()}k`;
            // 목표 달성률에 따라 색상 변경 (시각적 피드백)
            totalEl.style.color = total >= this.GOAL_ASSET ? '#f1c40f' : '#333';
        }
    }

    log(msg) {
        const p = document.createElement('p');
        p.innerText = msg;
        if(this.logEl) this.logEl.prepend(p);
    }
}

new CarbonMarble();
