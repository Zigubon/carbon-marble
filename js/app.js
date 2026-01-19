import { MAP_DATA, GAME_CONFIG } from './data.js';

class CarbonMarble {
    constructor() {
        // 게임 상태 데이터
        this.player = { 
            pos: 0, 
            money: GAME_CONFIG.START_MONEY, 
            carbon: 0,
            assets: [] // 내가 산 타일들의 ID가 저장됨
        };
        
        // HTML 요소 가져오기
        this.boardEl = document.getElementById('board');
        this.logEl = document.getElementById('game-log');
        this.rollBtn = document.getElementById('roll-btn');
        this.controlBox = document.querySelector('.control-box'); // 버튼들이 들어갈 자리

        this.init();
    }

    init() {
        this.renderBoard();
        this.updateUI();
        
        // 주사위 버튼 이벤트 연결
        this.rollBtn.addEventListener('click', () => this.rollDice());
    }

    // 1. 보드 그리기
    renderBoard() {
        this.boardEl.innerHTML = ''; // 초기화
        
        // 중앙 패널은 그대로 유지해야 하므로 백업하거나, HTML 구조를 건드리지 않게 주의
        // 여기서는 편의상 HTML에 있는 .center-panel은 건드리지 않고 타일만 추가합니다.
        // 다만, 기존 코드는 innerHTML로 덮어쓰는 방식이었으니, 
        // index.html의 .center-panel을 제외하고 타일만 추가하는 방식으로 수정합니다.
        
        const centerPanel = document.querySelector('.center-panel');
        this.boardEl.innerHTML = ''; 
        this.boardEl.appendChild(centerPanel); // 중앙 패널 복구

        MAP_DATA.forEach((tile, index) => {
            const el = document.createElement('div');
            el.className = `tile ${tile.type}`;
            el.id = `tile-${index}`; // 나중에 색깔 바꾸려고 ID 부여
            el.innerHTML = `
                <div>${tile.name}</div>
                ${tile.cost ? `<div style="font-family:'VT323'">₩${tile.cost}</div>` : ''}
            `;
            
            this.setGridPosition(el, index);
            
            // 플레이어 토큰 생성 (0번 타일)
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
        // 6x6 보드 좌표 계산 (총 20칸)
        if (index < 6) { el.style.gridRow = 1; el.style.gridColumn = index + 1; }
        else if (index < 10) { el.style.gridRow = index - 4; el.style.gridColumn = 6; }
        else if (index < 16) { el.style.gridRow = 6; el.style.gridColumn = 6 - (index - 10); }
        else { el.style.gridRow = 6 - (index - 15); el.style.gridColumn = 1; }
    }

    // 2. 주사위 굴리기
    rollDice() {
        // 구매 버튼이 떠있다면 제거
        this.removeBuyButton();

        const dice = Math.floor(Math.random() * 6) + 1;
        document.getElementById('dice-display').innerText = `🎲 ${dice}`;
        this.movePlayer(dice);
    }

    // 3. 플레이어 이동
    movePlayer(steps) {
        const oldPos = this.player.pos;
        this.player.pos = (this.player.pos + steps) % MAP_DATA.length;
        
        // 토큰 이동 (DOM 조작)
        const targetTile = document.getElementById(`tile-${this.player.pos}`);
        const token = document.getElementById('player-token');
        targetTile.appendChild(token);

        this.log(`이동: [${MAP_DATA[this.player.pos].name}] 도착`);
        
        // 한 바퀴 완주 체크
        if (this.player.pos < oldPos) {
            this.passStartLine();
        }

        // 도착한 타일 처리
        this.handleTile(MAP_DATA[this.player.pos]);
    }

    // 4. 타일 도착 처리 (핵심!)
    handleTile(tile) {
        // 4-1. 구매 가능한 타일인지 확인 (기업 or 숲)
        if (tile.type === 'factory' || tile.type === 'eco') {
            
            // 이미 누가 샀는지 확인
            if (this.player.assets.includes(tile.id)) {
                this.log(`내 소유의 [${tile.name}]입니다.`);
            } else {
                // 안 샀고, 돈이 있다면 -> 구매 버튼 표시
                if (this.player.money >= tile.cost) {
                    this.showBuyButton(tile);
                } else {
                    this.log(`돈이 부족해 [${tile.name}]을 살 수 없습니다.`);
                }
            }
        } 
        // 4-2. 황금열쇠 등 기타 타일
        else if (tile.type === 'chance') {
            this.log("🔑 황금열쇠 발견! (기능 준비중)");
        }
    }

    // [UI] 구매 버튼 보여주기
    showBuyButton(tile) {
        const btn = document.createElement('button');
        btn.innerText = `${tile.name} 매입 (-${tile.cost})`;
        btn.className = 'btn-primary';
        btn.id = 'buy-btn';
        btn.style.marginTop = '10px';
        btn.style.backgroundColor = tile.type === 'factory' ? '#c0392b' : '#27ae60'; // 빨강 or 초록
        
        btn.onclick = () => this.buyProperty(tile);
        
        // 주사위 버튼 아래에 추가
        this.controlBox.appendChild(btn);
        // 주사위 버튼은 잠시 숨김 (선택 강요)
        this.rollBtn.style.display = 'none';
    }

    removeBuyButton() {
        const existingBtn = document.getElementById('buy-btn');
        if (existingBtn) existingBtn.remove();
        this.rollBtn.style.display = 'inline-block'; // 주사위 다시 보이기
    }

    // 5. 매입 로직
    buyProperty(tile) {
        this.player.money -= tile.cost;
        this.player.assets.push(tile.id);
        
        // 효과 반영 (공장은 탄소+, 숲은 탄소-)
        this.player.carbon += tile.carbon;

        // UI 반영
        this.log(`🎉 [${tile.name}] 매입 완료!`);
        document.getElementById(`tile-${tile.id}`).style.border = "3px solid #f1c40f"; // 소유 표시(금색 테두리)
        
        this.updateUI();
        this.removeBuyButton(); // 버튼 치우고 주사위 복구
    }

    // 6. 한 바퀴 완주 (월급 + 세금)
    passStartLine() {
        // 탄소세 계산 (양수일 때만)
        const tax = this.player.carbon > 0 ? this.player.carbon * GAME_CONFIG.TAX_RATE : 0;
        const finalSalary = GAME_CONFIG.SALARY - tax;

        this.player.money += finalSalary;
        this.log(`🔄 한 바퀴 완주! (월급 ${GAME_CONFIG.SALARY} - 탄소세 ${tax})`);
        
        this.updateUI();
    }

    updateUI() {
        document.getElementById('money').innerText = `${this.player.money.toLocaleString()}k`;
        
        const carbonEl = document.getElementById('carbon');
        carbonEl.innerText = `${this.player.carbon} t`;
        
        // 탄소가 마이너스(친환경)면 파란색, 플러스(오염)면 빨간색
        if(this.player.carbon < 0) carbonEl.style.color = '#2980b9';
        else carbonEl.style.color = '#c0392b';
    }

    log(msg) {
        const p = document.createElement('p');
        p.innerText = msg;
        this.logEl.prepend(p);
    }
}

// 게임 실행
new CarbonMarble();
