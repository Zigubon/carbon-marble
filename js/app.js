import { GAME_CONFIG, BUILDINGS, EVENTS } from './data.js';

class TycoonGame {
    constructor() {
        this.week = 1;
        this.money = GAME_CONFIG.START_MONEY;
        this.rep = GAME_CONFIG.START_REP;
        this.gridSize = 100; 
        this.mapData = Array(this.gridSize).fill(null);
        this.taxRate = GAME_CONFIG.TAX_RATE_BASE;
        this.selectedBuildingId = null;

        this.ui = {
            grid: document.getElementById('city-grid'),
            money: document.getElementById('ui-money'),
            emit: document.getElementById('ui-emit'),
            rep: document.getElementById('ui-rep'),
            res: document.getElementById('ui-res'),
            infra: document.getElementById('ui-infra'),
            week: document.getElementById('ui-week'),
            msg: document.getElementById('ui-message'),
            buildList: document.getElementById('building-list'),
            logList: document.getElementById('log-list'),
            reportBody: document.getElementById('report-details'),
            cancelBtn: document.getElementById('btn-cancel-select')
        };
        
        this.init();
    }

    init() {
        this.generateMap();
        this.renderGrid();
        this.updateHUD();
        // [버그 수정] 이벤트 객체 없이 호출 시 안전하게 처리
        this.filterBuild('growth');
        this.bindEvents();
        this.addLog("게임 시작! 도시를 재건하세요.");
    }

    // --- 맵 & 그리드 ---
    generateMap() {
        const centerIdx = 45;
        this.placeBuilding(centerIdx, 'town_hall');

        const legacyTypes = ['landfill', 'old_factory', 'flood_house'];
        for(let i=0; i<10; i++) {
            let rndIdx = Math.floor(Math.random() * this.gridSize);
            if(!this.mapData[rndIdx]) { 
                let rndType = legacyTypes[Math.floor(Math.random() * legacyTypes.length)];
                this.placeBuilding(rndIdx, rndType);
            }
        }
    }

    placeBuilding(idx, id) {
        const b = BUILDINGS.find(x => x.id === id);
        if(b) this.mapData[idx] = { ...b };
    }

    renderGrid() {
        this.ui.grid.innerHTML = '';
        this.mapData.forEach((building, idx) => {
            const tile = document.createElement('div');
            tile.className = building ? 'tile' : 'tile empty';
            if(building) tile.setAttribute('data-type', building.type);
            
            tile.onclick = () => this.handleTileClick(idx);
            
            if (building) {
                tile.innerHTML = `<span>${building.icon}</span>`;
            }
            this.ui.grid.appendChild(tile);
        });
    }

    // --- 타일 클릭 (건설 및 철거) ---
    handleTileClick(idx) {
        const currentB = this.mapData[idx];

        // 1. 건설 모드
        if (this.selectedBuildingId) {
            if(currentB) {
                if(currentB.id === 'town_hall') {
                    this.showMessage("❌ 시청은 건드릴 수 없습니다.");
                    return;
                }
                if(currentB.type === 'legacy') {
                    this.showMessage("⚠️ 오염 유산은 먼저 철거해야 합니다.");
                    return;
                }
            }
            
            const template = BUILDINGS.find(b => b.id === this.selectedBuildingId);
            if(this.money < template.cost) {
                this.showMessage("💸 자금이 부족합니다!");
                return;
            }
            this.build(idx, template);
            return;
        }

        // 2. 일반 선택 모드 (철거 로직 추가)
        if (currentB) {
            if(currentB.type === 'legacy') {
                // 철거 팝업
                const cost = currentB.demolishCost;
                if(confirm(`[${currentB.name}] 철거하시겠습니까? (비용: ${cost}억)`)) {
                    if(this.money >= cost) {
                        this.money -= cost;
                        this.mapData[idx] = null; // 땅 비우기
                        this.renderGrid();
                        this.updateHUD();
                        this.addLog(`${currentB.name} 철거 완료 (-${cost})`, 'bad');
                        this.showMessage("철거 완료! 이제 건설할 수 있습니다.");
                    } else {
                        this.showMessage("💸 철거 자금이 부족합니다.");
                    }
                }
            } else {
                this.showMessage(`ℹ️ [${currentB.name}] 수익:${currentB.rev} 배출:${currentB.emit}`);
            }
        } else {
            this.showMessage("우측 메뉴에서 건물을 선택하고 클릭하세요.");
        }
    }

    // --- 사이드바 및 필터 ---
    filterBuild(type) {
        // 탭 스타일 (JS 호출 시 event가 없을 수 있음 처리)
        const tabs = document.querySelectorAll('.sub-tab-btn');
        tabs.forEach(btn => {
            if(btn.dataset.type === type) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        this.ui.buildList.innerHTML = '';
        const buildable = BUILDINGS.filter(b => b.type !== 'legacy' && b.id !== 'town_hall');

        buildable.forEach(b => {
            if(type !== 'all' && b.type !== type) return;

            const item = document.createElement('div');
            item.className = 'build-item';
            if(this.selectedBuildingId === b.id) item.classList.add('selected');
            
            const canAfford = this.money >= b.cost;
            if(!canAfford) item.classList.add('disabled');

            // [개선] 에너지 표기 추가
            let extraStat = '';
            if(b.power > 0) extraStat = `⚡+${b.power}`;
            else if(b.emit < 0) extraStat = `💚${Math.abs(b.emit)}`;

            item.innerHTML = `
                <div class="bi-icon">${b.icon}</div>
                <div class="bi-info">
                    <div class="bi-name">${b.name} <span class="bi-stat">${extraStat}</span></div>
                    <div class="bi-cost">💰 ${b.cost}</div>
                    <span class="bi-desc">수익${b.rev} / 탄소${b.emit}</span>
                </div>
            `;
            
            item.onclick = () => {
                if(!canAfford) { this.showMessage("자금이 부족합니다."); return; }
                this.selectBuilding(b.id);
            };

            this.ui.buildList.appendChild(item);
        });
    }

    selectBuilding(id) {
        this.selectedBuildingId = id;
        this.showMessage(`🔨 건설 모드: 맵을 클릭해 건설하세요.`);
        this.ui.cancelBtn.classList.remove('hidden');
        
        // 리스트 UI 갱신을 위해 현재 탭 다시 로드 (단순화)
        const bType = BUILDINGS.find(b=>b.id===id).type;
        this.filterBuild(bType);
    }

    cancelSelection() {
        this.selectedBuildingId = null;
        this.showMessage("선택 취소됨.");
        this.ui.cancelBtn.classList.add('hidden');
        // 스타일 리셋
        const items = document.querySelectorAll('.build-item');
        items.forEach(el => el.classList.remove('selected'));
    }

    build(idx, template) {
        this.money -= template.cost;
        this.mapData[idx] = { ...template };
        this.renderGrid();
        this.updateHUD();
        this.addLog(`${template.name} 건설 (-${template.cost})`);
        this.showMessage(`🏗️ ${template.name} 건설 완료!`);
    }

    // --- 탭 전환 ---
    switchMainTab(tabName) {
        const buildPanel = document.getElementById('panel-build');
        const logPanel = document.getElementById('panel-log');
        const btns = document.querySelectorAll('.main-tab-btn');
        
        btns.forEach(b => b.classList.remove('active'));
        // 클릭된 버튼 활성화 (event 사용)
        if(event) event.target.classList.add('active');

        if(tabName === 'build') {
            buildPanel.classList.remove('hidden');
            logPanel.classList.add('hidden');
        } else {
            buildPanel.classList.add('hidden');
            logPanel.classList.remove('hidden');
        }
    }

    addLog(msg, type = 'normal') {
        const item = document.createElement('div');
        item.className = `log-item ${type}`;
        item.innerHTML = `<span style="opacity:0.6; margin-right:5px;">W${this.week}</span> ${msg}`;
        this.ui.logList.prepend(item);
    }

    // --- 주간 정산 ---
    nextWeek() {
        if (this.week > GAME_CONFIG.MAX_WEEKS) {
            alert(`게임 종료! 최종 자산: ${this.money}`);
            location.reload();
            return;
        }

        let totalRev = 0, totalExp = 0, totalEmit = 0, totalPower = 0;
        let totalRep = 0, totalRes = 0;

        this.mapData.forEach(b => {
            if (b) {
                totalRev += b.rev;
                totalExp += b.exp;
                totalEmit += b.emit;
                totalPower += b.power;
                if(b.rep) totalRep += b.rep;
                if(b.res) totalRes += b.res;
            }
        });

        if(totalPower < 0) {
            const penalty = Math.abs(totalPower) * 5;
            totalExp += penalty;
            this.addLog(`⚡ 전력 부족! 추가비용 -${penalty}`, 'bad');
        }

        const netEmit = Math.max(0, totalEmit); 
        const tax = netEmit * this.taxRate;

        let tempState = { money: this.money, rep: this.rep + totalRep, res: totalRes, weekEmit: netEmit, weekPower: totalPower };
        
        const evt = EVENTS[Math.floor(Math.random() * EVENTS.length)];
        const evtResult = evt.effect(tempState);
        this.addLog(`🔔 ${evt.name}: ${evtResult}`);

        this.money = tempState.money;
        const netProfit = totalRev - totalExp - tax;
        this.money += netProfit;

        this.showReport(totalRev, totalExp, tax, netEmit, evt, evtResult, netProfit);

        this.week++;
        if(this.week % 4 === 1 && this.week > 1) {
            this.taxRate += 1;
            this.addLog(`📢 탄소세율 인상 (x${this.taxRate})`, 'bad');
        }
        
        this.updateHUD();
        // 건설 가능 여부 갱신
        if(this.selectedBuildingId) {
             const bType = BUILDINGS.find(b=>b.id===this.selectedBuildingId).type;
             this.filterBuild(bType);
        }
    }

    showReport(rev, exp, tax, emit, evt, evtResult, netProfit) {
        const html = `
            <div class="report-row"><span>매출</span> <span>+${rev}</span></div>
            <div class="report-row"><span>유지비</span> <span style="color:red">-${exp}</span></div>
            <div class="report-row"><span>탄소세 (${emit}t)</span> <span style="color:red">-${tax}</span></div>
            <div class="report-row" style="background:#f0f0f0; padding:4px;">
                <span>🔔 ${evt.name}</span>
                <span style="font-size:0.8rem">${evtResult}</span>
            </div>
            <div class="report-total">
                순이익: ${netProfit >= 0 ? '+' : ''}${netProfit}
            </div>
            <div style="text-align:center; font-size:0.8rem; margin-top:5px; color:#666;">
                현재 자금: ${this.money}
            </div>
        `;
        this.ui.reportBody.innerHTML = html;
        document.getElementById('report-modal').classList.remove('hidden');
    }

    updateHUD() {
        this.ui.money.innerText = this.money;
        this.ui.week.innerText = this.week <= GAME_CONFIG.MAX_WEEKS ? this.week : "END";
        
        let currentEmit = 0, currentPower = 0, currentRep = GAME_CONFIG.START_REP, currentRes = 0;
        this.mapData.forEach(b => {
            if(b) {
                currentEmit += b.emit;
                currentPower += b.power;
                if(b.rep) currentRep += b.rep;
                if(b.res) currentRes += b.res;
            }
        });

        this.ui.rep.innerText = currentRep;
        this.ui.res.innerText = currentRes;
        this.ui.emit.innerText = `${currentEmit}t`;
        this.ui.infra.innerText = currentPower >= 0 ? `⚡+${currentPower}` : `⚡${currentPower}`;
        this.ui.infra.style.color = currentPower < 0 ? '#ff7675' : '#55efc4';
    }

    showMessage(text) {
        this.ui.msg.innerText = text;
        this.ui.msg.style.opacity = 0;
        setTimeout(() => this.ui.msg.style.opacity = 1, 100);
    }

    bindEvents() {
        document.getElementById('btn-next-week').onclick = () => this.nextWeek();
        window.game = this; 
        
        document.addEventListener('keydown', (e) => {
            if(e.key === 'Escape') this.cancelSelection();
        });
    }
}

new TycoonGame();
