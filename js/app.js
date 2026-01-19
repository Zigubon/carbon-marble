import { CONFIG, TILES, ASSETS, TECH_UPGRADES, OFFSETS } from './data.js';

class Game {
    constructor() {
        this.turn = 1;
        this.pos = 0;
        this.money = CONFIG.START_MONEY;
        this.carbonScore = 0;
        this.reputation = 0;
        this.carbonTaxRate = CONFIG.BASE_TAX_RATE;
        this.assets = []; 
        
        this.flags = { reported: false, insurance: false };

        this.ui = {
            board: document.getElementById('board'),
            log: document.getElementById('game-log'),
            modal: document.getElementById('action-modal'),
            modalOpts: document.getElementById('modal-options'),
            rollBtn: document.getElementById('roll-btn'),
            diceVal: document.getElementById('dice-val')
        };

        this.init();
    }

    init() {
        this.renderBoard();
        this.updateDashboard();
        this.log("🚀 12분기 생존 경쟁 시작! 건물을 모아 콤보를 달성하세요.");
        this.ui.rollBtn.onclick = () => this.phaseMove();
    }

    // --- 1. 시각 효과 (Juice) ---
    // x, y 위치에 텍스트를 띄움 (예: +5억)
    showFloatingText(x, y, text, type) {
        const el = document.createElement('div');
        el.className = `floating-text ${type === 'gain' ? 'ft-gain' : 'ft-loss'}`;
        el.innerText = text;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1000); // 1초 뒤 삭제
    }

    // 특정 요소 위에서 텍스트 띄우기
    floatOnElement(elementId, text, type) {
        const el = document.getElementById(elementId);
        if(el) {
            const rect = el.getBoundingClientRect();
            // 화면 중앙 보정
            this.showFloatingText(rect.left + rect.width/2, rect.top, text, type);
        }
    }

    // --- 2. 보드 렌더링 ---
    renderBoard() {
        const center = document.querySelector('.center-area');
        this.ui.board.innerHTML = '';
        this.ui.board.appendChild(center);

        TILES.forEach((tile, idx) => {
            const el = document.createElement('div');
            el.className = `tile ${tile.type}`;
            el.innerHTML = `<div>${tile.name}</div>`;
            el.id = `tile-${idx}`;
            
            // 좌표 (9x7 테두리)
            if (idx <= 8) { el.style.gridRow = 1; el.style.gridColumn = idx + 1; }
            else if (idx <= 14) { el.style.gridRow = idx - 7; el.style.gridColumn = 9; }
            else if (idx <= 23) { el.style.gridRow = 7; el.style.gridColumn = 9 - (idx - 15); }
            else { el.style.gridRow = 7 - (idx - 23); el.style.gridColumn = 1; }

            if (idx === 0) this.spawnToken(el);
            this.ui.board.appendChild(el);
        });
    }

    spawnToken(parent) {
        const token = document.createElement('div');
        token.className = 'player-token';
        token.id = 'p-token';
        parent.appendChild(token);
    }

    // --- 3. Phase: 이동 ---
    phaseMove() {
        this.ui.rollBtn.disabled = true;
        
        // 주사위 굴리는 연출 (긴장감!)
        let rollCount = 0;
        this.ui.diceVal.classList.add('dice-shaking');
        const interval = setInterval(() => {
            this.ui.diceVal.innerText = `🎲 ${Math.floor(Math.random()*6)+1}`;
            rollCount++;
            if(rollCount > 10) { // 10번 바뀐 뒤 멈춤
                clearInterval(interval);
                this.ui.diceVal.classList.remove('dice-shaking');
                this.finalizeMove();
            }
        }, 50);
    }

    finalizeMove() {
        const dice = Math.floor(Math.random() * 6) + 1;
        this.ui.diceVal.innerText = `🎲 ${dice}`;
        
        let nextPos = (this.pos + dice);
        if (nextPos >= TILES.length) {
            nextPos %= TILES.length;
            this.passStart();
        }
        this.pos = nextPos;

        const targetTile = document.getElementById(`tile-${this.pos}`);
        targetTile.appendChild(document.getElementById('p-token'));

        setTimeout(() => this.phaseTileEffect(), 400);
    }

    passStart() {
        this.log("🔄 한 바퀴 완주!"); 
        this.money += 5; // 소소한 보너스
        this.floatOnElement('d-money', '+5억', 'gain');
        this.updateDashboard();
    }

    // --- 4. Phase: 타일 효과 ---
    phaseTileEffect() {
        const tile = TILES[this.pos];
        
        if (tile.type === 'start') {
            this.phaseAction(2);
        } else if (tile.type === 'market' && tile.assetId) {
            // 이미 샀는지 체크
            const isOwned = this.assets.find(a => a.tileId === tile.id);
            if(isOwned) {
                this.log(`🏠 내 사업장 [${tile.name}] 방문.`);
                this.phaseAction(2);
            } else {
                this.showModal(`💰 사업 인수 제안`, `${tile.name}\n비용: ${ASSETS[tile.assetId].cost}억`, [
                    { text: `인수하기`, cb: () => this.buyAsset(tile) },
                    { text: '패스', cb: () => this.phaseAction(2) }
                ]);
            }
        } else if (tile.type === 'event') {
            this.triggerRandomEvent();
        } else if (tile.type === 'reg') {
            this.triggerAudit();
        } else {
            this.phaseAction(2);
        }
    }

    // --- 5. Phase: 경영 액션 ---
    phaseAction(ap) {
        if (ap <= 0) {
            this.phaseSettlement();
            return;
        }
        
        // 버튼 텍스트 구성
        this.showModal(`경영 액션 (남은 AP: ${ap})`, "이번 분기 전략을 선택하세요.", [
            { text: '🛠️ 기술 업그레이드', cb: () => this.openTechMenu(ap) },
            { text: '🌳 탄소 상쇄 (리스크 관리)', cb: () => this.openOffsetMenu(ap) },
            { text: '📄 ESG 보고서 제출 (규제 방어)', cb: () => { 
                this.flags.reported = true; 
                this.floatOnElement('d-rep', '보고완료', 'gain');
                this.phaseAction(ap - 1);
            }},
            { text: '⏩ 턴 종료 (정산하기)', cb: () => this.phaseSettlement() }
        ]);
    }

    // 자산 구매
    buyAsset(tile) {
        const data = ASSETS[tile.assetId];
        if (this.money >= data.cost) {
            this.money -= data.cost;
            this.floatOnElement('d-money', `-${data.cost}`, 'loss');
            
            // 자산 추가 (타일 ID 포함)
            this.assets.push({ ...data, id: Date.now(), tileId: tile.id, level: 0 });
            
            // 시각적 소유 표시
            document.getElementById(`tile-${tile.id}`).classList.add('owned');
            
            this.log(`🎉 [${data.name}] 인수!`);
            this.updateDashboard();
            this.phaseAction(1);
        } else {
            this.log("❌ 자금이 부족합니다.");
            this.phaseAction(2);
        }
    }

    openTechMenu(ap) {
        if (this.assets.length === 0) {
            this.log("⚠️ 업그레이드할 자산이 없습니다.");
            this.phaseAction(ap);
            return;
        }
        const opts = this.assets.map(asset => ({
            text: `${asset.name} 개량`,
            cb: () => this.showUpgradeOptions(asset, ap)
        }));
        opts.push({ text: '취소', cb: () => this.phaseAction(ap) });
        this.showModal("기술 투자", "대상 사업장 선택", opts);
    }

    showUpgradeOptions(asset, ap) {
        const opts = TECH_UPGRADES.map(tech => ({
            text: `${tech.name} (비용 ${tech.cost})`,
            cb: () => {
                if(this.money >= tech.cost) {
                    this.money -= tech.cost;
                    this.floatOnElement('d-money', `-${tech.cost}`, 'loss');
                    this.applyUpgrade(asset, tech);
                    this.phaseAction(ap - 1);
                } else this.log("❌ 자금 부족");
            }
        }));
        this.showModal("기술 선택", "효과를 확인하세요", opts);
    }

    applyUpgrade(asset, tech) {
        if(tech.id === 'eff') { asset.exp -= 1; asset.emit -= 1; }
        if(tech.id === 'scale') { asset.rev += 3; asset.emit += 2; }
        if(tech.id === 'green') { asset.emit -= 3; }
        
        asset.exp = Math.max(1, asset.exp);
        asset.emit = Math.max(0, asset.emit);
        this.log(`🛠️ 업그레이드 완료!`);
        this.floatOnElement('d-carbon', '탄소↓', 'gain');
        this.updateDashboard();
    }

    openOffsetMenu(ap) {
        const opts = OFFSETS.map(off => ({
            text: `${off.name} (비용 ${off.cost})`,
            cb: () => {
                if(this.money >= off.cost) {
                    this.money -= off.cost;
                    this.floatOnElement('d-money', `-${off.cost}`, 'loss');
                    if (Math.random() > off.risk) {
                        this.carbonScore -= off.reduce;
                        this.floatOnElement('d-carbon', `-${off.reduce}`, 'gain');
                        if(off.rep) this.reputation += off.rep;
                    } else {
                        this.log(`⚠️ ${off.name} 무효화됨! (사기당함)`);
                        this.floatOnElement('d-rep', '평판 하락', 'loss');
                        this.reputation -= 1;
                    }
                    this.updateDashboard();
                    this.phaseAction(ap - 1);
                } else this.log("❌ 자금 부족");
            }
        }));
        opts.push({ text: '취소', cb: () => this.phaseAction(ap) });
        this.showModal("상쇄 크레딧", "구매할 상품 선택", opts);
    }

    // --- 이벤트 로직 ---
    triggerAudit() {
        this.log("👮 불시 감사!");
        if (this.flags.reported) {
            this.log("✅ 보고서 덕분에 무사 통과.");
            this.reputation += 1;
            this.floatOnElement('d-rep', '+1', 'gain');
        } else {
            this.log("🚨 보고서 미제출! 과태료 5억.");
            this.money -= 5;
            this.reputation -= 1;
            this.floatOnElement('d-money', '-5', 'loss');
        }
        this.updateDashboard();
        this.phaseAction(2);
    }

    triggerRandomEvent() {
        const r = Math.random();
        if (r < 0.3) {
            this.log("🔥 폭염으로 전력비용 급증 (-3억)");
            this.money -= 3;
            this.floatOnElement('d-money', '-3', 'loss');
        } else if (r < 0.6) {
            this.log("💰 정부 보조금 수령 (+5억)");
            this.money += 5;
            this.floatOnElement('d-money', '+5', 'gain');
        } else {
            this.log("🌊 홍수 주의보 (별일 없었음)");
        }
        this.updateDashboard();
        this.phaseAction(2);
    }

    // --- 6. 정산 (콤보 시스템 추가) ---
    phaseSettlement() {
        this.log(`==== 💰 ${this.turn}분기 결산 ====`);
        
        let totalRev = 0;
        let totalExp = 0;
        let totalEmit = 0;
        
        this.assets.forEach(a => {
            totalRev += a.rev;
            totalExp += a.exp;
            totalEmit += a.emit;
        });

        // [콤보 시스템] 자산 3개마다 보너스
        if(this.assets.length >= 3) {
            const comboBonus = Math.floor(this.assets.length / 3) * 5;
            totalRev += comboBonus;
            this.log(`✨ 규모의 경제 콤보! 추가수익 +${comboBonus}억`);
            this.floatOnElement('d-money', `Combo +${comboBonus}`, 'gain');
        }

        const opProfit = totalRev - totalExp;
        this.money += opProfit;
        this.carbonScore += totalEmit;

        this.floatOnElement('d-money', `+${opProfit}`, opProfit > 0 ? 'gain':'loss');
        
        // 탄소세
        let tax = Math.floor(Math.max(0, this.carbonScore * this.carbonTaxRate));
        if(tax > 0) {
            this.money -= tax;
            this.log(`📉 탄소세 납부: -${tax}억`);
            this.floatOnElement('d-money', `세금 -${tax}`, 'loss');
        }

        // 초기화 및 턴 진행
        this.carbonScore = 0; 
        this.flags.reported = false;
        
        if (this.turn >= CONFIG.MAX_TURN) {
            setTimeout(() => this.endGame(), 1000);
        } else {
            this.turn++;
            this.updateDashboard();
            this.ui.rollBtn.disabled = false;
        }
    }

    endGame() {
        let assetVal = this.assets.reduce((acc, cur) => acc + cur.cost, 0);
        let finalScore = this.money + assetVal + (this.reputation * 5);
        let grade = finalScore >= 300 ? 'S' : (finalScore >= 200 ? 'A' : 'B');
        
        alert(`🏁 게임 종료!\n등급: ${grade}\n최종 자산: ${finalScore}억`);
        location.reload();
    }

    // --- UI Helpers ---
    updateDashboard() {
        document.getElementById('d-money').innerText = Math.floor(this.money);
        document.getElementById('d-carbon').innerText = this.carbonScore;
        document.getElementById('d-rep').innerText = this.reputation;
        document.getElementById('d-rate').innerText = `x${this.carbonTaxRate.toFixed(1)}`;
        document.getElementById('turn-display').innerText = this.turn;
        
        const ul = document.getElementById('asset-ul');
        ul.innerHTML = '';
        this.assets.forEach(a => {
            const li = document.createElement('li');
            li.className = 'asset-item';
            li.innerHTML = `<span>${a.name} (Lv.${a.level})</span><span>+${a.rev} / ☁${a.emit}</span>`;
            ul.appendChild(li);
        });
    }

    log(msg) {
        const p = document.createElement('div');
        p.innerText = msg;
        p.style.marginBottom = "4px";
        this.ui.log.prepend(p);
    }

    showModal(title, desc, options) {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-desc').innerText = desc;
        this.ui.modalOpts.innerHTML = '';
        
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'btn-opt';
            btn.innerHTML = opt.text;
            btn.onclick = () => {
                this.closeModal();
                opt.cb();
            };
            this.ui.modalOpts.appendChild(btn);
        });
        
        this.ui.modal.classList.remove('hidden');
    }

    closeModal() {
        this.ui.modal.classList.add('hidden');
    }
}

new Game();
