import { GAME_CONFIG, BUILDINGS, EVENTS, RESEARCH } from './data.js';

class TycoonGame {
    constructor() {
        this.year = 1;
        this.money = GAME_CONFIG.START_MONEY;
        this.rep = GAME_CONFIG.START_REP;
        this.gridSize = 100; // 10x10 Grid
        this.mapData = Array(this.gridSize).fill(null);
        this.taxRate = GAME_CONFIG.TAX_RATE_BASE;
        
        // 건설 모드 선택된 건물 ID
        this.selectedBuildingId = null;
        // 완료된 연구 목록
        this.researched = [];

        // UI 요소 캐싱
        this.ui = {
            grid: document.getElementById('city-grid'),
            money: document.getElementById('ui-money'),
            emit: document.getElementById('ui-emit'),
            rep: document.getElementById('ui-rep'),
            res: document.getElementById('ui-res'),
            infra: document.getElementById('ui-infra'),
            year: document.getElementById('ui-year'),
            msg: document.getElementById('ui-message'), // 하단 메시지바
            buildList: document.getElementById('building-list'),
            researchList: document.getElementById('research-list'),
            logList: document.getElementById('log-list'),
            reportBody: document.getElementById('report-details'),
            cancelBtn: document.getElementById('btn-cancel-select'),
            tooltip: document.getElementById('tooltip')
        };
        
        this.init();
    }

    init() {
        this.generateMap();
        this.renderGrid();
        this.updateHUD();
        
        // 초기 탭 설정
        this.filterBuild('growth');
        this.renderResearch();
        
        this.bindEvents();
        this.addLog("게임 시작! 넷제로 도시를 건설하세요.");
        this.showMessage("우측 메뉴에서 건물을 선택하거나 연구를 진행하세요.");
    }

    // --- 0. 맵 생성 ---
    generateMap() {
        // 중앙 시청
        this.placeBuilding(45, 'town_hall');

        // 오염 유산 6개 고정 배치
        const legacyTypes = ['landfill', 'old_factory', 'flood_house'];
        let placed = 0;
        while(placed < 6) {
            let rndIdx = Math.floor(Math.random() * this.gridSize);
            // 빈 땅이고 기존 건물 없으면 배치
            if(!this.mapData[rndIdx]) { 
                let rndType = legacyTypes[Math.floor(Math.random() * legacyTypes.length)];
                this.placeBuilding(rndIdx, rndType);
                placed++;
            }
        }
    }

    placeBuilding(idx, id) {
        const b = BUILDINGS.find(x => x.id === id);
        if(b) this.mapData[idx] = { ...b };
    }

    // --- 1. 그리드 렌더링 ---
    renderGrid() {
        this.ui.grid.innerHTML = '';
        this.mapData.forEach((building, idx) => {
            const tile = document.createElement('div');
            tile.className = building ? 'tile' : 'tile empty';
            if(building) tile.setAttribute('data-type', building.type);
            
            // 이벤트 연결
            tile.onmouseenter = (e) => this.showTooltip(e, building);
            tile.onmousemove = (e) => this.moveTooltip(e);
            tile.onmouseleave = () => this.hideTooltip();
            tile.onclick = () => this.handleTileClick(idx);
            
            if (building) {
                tile.innerHTML = `<span>${building.icon}</span>`;
            }
            this.ui.grid.appendChild(tile);
        });
    }

    // --- 2. 툴팁 기능 ---
    showTooltip(e, building) {
        if(!building) return;
        let html = `<h4>${building.icon} ${building.name}</h4>`;
        
        if(building.type === 'legacy') {
             html += `<div style="color:#ff7675">⚠️ 오염 유산</div>`;
             html += `<div>철거비용: 💰${building.demolishCost}</div>`;
        } else {
             html += `<div>수익: +${building.rev} | 유지: -${building.exp}</div>`;
        }
        
        if(building.emit > 0) html += `<div>탄소: <span class="stat-neg">배출 ${building.emit}t</span></div>`;
        if(building.emit < 0) html += `<div>탄소: <span class="stat-pos">감축 ${Math.abs(building.emit)}t</span></div>`;
        
        if(building.power > 0) html += `<div>전력: <span class="stat-pos">생산 +${building.power}</span></div>`;
        if(building.power < 0) html += `<div>전력: <span class="stat-neg">소모 ${building.power}</span></div>`;

        this.ui.tooltip.innerHTML = html;
        this.ui.tooltip.classList.remove('hidden');
        this.moveTooltip(e);
    }
    
    moveTooltip(e) {
        this.ui.tooltip.style.left = (e.pageX + 15) + 'px';
        this.ui.tooltip.style.top = (e.pageY + 15) + 'px';
    }
    
    hideTooltip() { this.ui.tooltip.classList.add('hidden'); }

    // --- 3. 타일 클릭 핸들러 (건설/철거) ---
    handleTileClick(idx) {
        const currentB = this.mapData[idx];

        // A. 건설 모드 (건물을 선택한 상태)
        if (this.selectedBuildingId) {
            // 기존 건물 체크
            if(currentB) {
                if(currentB.id === 'town_hall') { alert("시청은 철거할 수 없습니다."); return; }
                if(currentB.type === 'legacy') { alert("오염 유산은 먼저 철거해야 합니다 (클릭해서 철거)."); return; }
            }
            
            const template = BUILDINGS.find(b => b.id === this.selectedBuildingId);
            if(this.money < template.cost) { alert("자금이 부족합니다!"); return; }
            
            this.build(idx, template);
            return;
        }

        // B. 일반 모드 (정보 보기 및 철거)
        if (currentB && currentB.id !== 'town_hall') {
            // 유산은 지정된 비용, 내가 지은 건물은 10억에 철거
            const cost = currentB.type === 'legacy' ? currentB.demolishCost : 10;
            
            if(confirm(`[${currentB.name}] 철거하시겠습니까? (비용: ${cost}억)`)) {
                if(this.money >= cost) {
                    this.money -= cost;
                    this.mapData[idx] = null; // 땅 비우기
                    this.renderGrid();
                    this.updateHUD();
                    this.addLog(`${currentB.name} 철거 (-${cost})`, 'bad');
                    this.showMessage("철거 완료. 빈 땅이 되었습니다.");
                } else {
                    alert("철거 자금이 부족합니다.");
                }
            }
        } else if (!currentB) {
            this.showMessage("우측 메뉴에서 건물을 선택하고 땅을 클릭하세요.");
        }
    }

    // --- 4. 우측 패널 (건설) ---
    filterBuild(type) {
        // 탭 스타일 갱신
        document.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        this.ui.buildList.innerHTML = '';
        const buildable = BUILDINGS.filter(b => b.type !== 'legacy' && b.id !== 'town_hall');

        buildable.forEach(b => {
            if(type !== 'all' && b.type !== type) return;

            const item = document.createElement('div');
            item.className = 'build-item';
            
            // 연구 필요 체크
            let locked = b.reqTech && !this.researched.includes(b.reqTech);
            
            if(this.selectedBuildingId === b.id) item.classList.add('selected');
            if(this.money < b.cost || locked) item.classList.add('disabled');

            // 에너지/탄소 표시
            let powerStat = b.power > 0 ? `<span class="stat-pos">⚡+${b.power}</span>` : (b.power < 0 ? `<span class="stat-neg">⚡${b.power}</span>` : '');
            let emitStat = b.emit > 0 ? `<span class="stat-neg">♨️${b.emit}</span>` : (b.emit < 0 ? `<span class="stat-pos">🌱${Math.abs(b.emit)}</span>` : '');

            let html = `
                <div class="bi-icon">${b.icon}</div>
                <div class="bi-info">
                    <div class="bi-name">${b.name} ${locked ? '🔒' : ''}</div>`;
            
            if(locked) {
                const reqName = RESEARCH.find(r=>r.id===b.reqTech).name;
                html += `<div class="bi-desc" style="color:#e74c3c">필요: ${reqName}</div>`;
            } else {
                html += `<div class="bi-cost">💰 ${b.cost}</div>
                         <div class="bi-desc">수익${b.rev} | ${emitStat} ${powerStat}</div>`;
            }
            html += `</div>`;
            
            item.innerHTML = html;
            item.onclick = () => {
                if(locked) { alert("연구가 필요합니다!"); return; }
                if(this.money < b.cost) { alert("자금이 부족합니다."); return; }
                this.selectBuilding(b.id);
            };
            this.ui.buildList.appendChild(item);
        });
    }

    selectBuilding(id) {
        this.selectedBuildingId = id;
        this.ui.cancelBtn.classList.remove('hidden');
        this.showMessage(`선택됨: ${BUILDINGS.find(b=>b.id===id).name}`);
        
        // 리스트 UI 갱신 (선택 효과)
        const bType = BUILDINGS.find(b=>b.id===id).type;
        this.filterBuild(bType);
    }

    cancelSelection() {
        this.selectedBuildingId = null;
        this.ui.cancelBtn.classList.add('hidden');
        this.showMessage("선택 취소됨.");
        
        // 현재 활성화된 탭으로 리프레시
        const activeTab = document.querySelector('.sub-tab-btn.active');
        if(activeTab) this.filterBuild(activeTab.dataset.type);
    }

    build(idx, template) {
        // 기존 건물이 있었다면 철거 비용 없이 덮어쓰기(재건축) 처리하거나,
        // 여기선 단순하게 건설비만 차감
        this.money -= template.cost;
        this.mapData[idx] = { ...template };
        
        this.renderGrid();
        this.updateHUD();
        this.addLog(`${template.name} 건설 (-${template.cost})`);
        this.showMessage(`${template.name} 건설 완료!`);
    }

    // --- 5. 연구 패널 ---
    renderResearch() {
        this.ui.researchList.innerHTML = '';
        RESEARCH.forEach(r => {
            const item = document.createElement('div');
            item.className = 'research-item';
            
            const isDone = this.researched.includes(r.id);
            const locked = r.req && !this.researched.includes(r.req);
            
            if(isDone) item.classList.add('done');
            else if(locked || this.money < r.cost) item.classList.add('disabled');

            let statusIcon = isDone ? '✅' : (locked ? '🔒' : '');

            item.innerHTML = `
                <div class="bi-icon">${r.icon}</div>
                <div class="bi-info">
                    <div class="bi-name">${r.name} ${statusIcon}</div>
                    ${!isDone ? `<div class="bi-cost">💰 ${r.cost}</div>` : '<div class="stat-pos">개발 완료</div>'}
                    <div class="bi-desc">${r.desc}</div>
                    ${locked ? `<div class="bi-desc" style="color:#e74c3c">선행: ${RESEARCH.find(x=>x.id===r.req).name}</div>` : ''}
                </div>
            `;
            
            item.onclick = () => {
                if(isDone) return;
                if(locked) { alert("선행 연구가 필요합니다."); return; }
                if(this.money < r.cost) { alert("연구 자금이 부족합니다."); return; }
                
                if(confirm(`${r.name} 연구를 진행하시겠습니까? (비용 ${r.cost})`)) {
                    this.money -= r.cost;
                    this.researched.push(r.id);
                    this.addLog(`🔬 기술 개발: ${r.name}`, 'good');
                    this.updateHUD();
                    this.renderResearch();
                    
                    // 건설 목록 갱신 (해금 확인)
                    const activeTab = document.querySelector('.sub-tab-btn.active');
                    if(activeTab) this.filterBuild(activeTab.dataset.type);
                }
            };
            this.ui.researchList.appendChild(item);
        });
    }

    // --- 6. 시스템 (탭전환, 로그, HUD) ---
    switchMainTab(tabName) {
        ['panel-build', 'panel-research', 'panel-log'].forEach(id => document.getElementById(id).classList.add('hidden'));
        document.getElementById(`panel-${tabName}`).classList.remove('hidden');

        document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
        if(event) event.target.classList.add('active');
    }

    addLog(msg, type='normal') {
        const item = document.createElement('div');
        item.className = `log-item ${type}`;
        item.innerHTML = `<span style="opacity:0.6; margin-right:5px;">Y${this.year}</span> ${msg}`;
        this.ui.logList.prepend(item);
    }

    showMessage(text) {
        this.ui.msg.innerText = text;
        // 깜빡임 효과
        this.ui.msg.style.opacity = 0.5;
        setTimeout(() => this.ui.msg.style.opacity = 1, 100);
    }

    // --- 7. 연말 정산 (핵심 로직) ---
    nextYear() {
        if (this.year > GAME_CONFIG.MAX_YEARS) {
            alert(`게임 종료! 최종 자산: ${this.money}`);
            return;
        }

        let totalRev = 0, totalExp = 0, baseEmit = 0, totalPower = 0;
        let totalRep = 0;

        this.mapData.forEach(b => {
            if (b) {
                totalRev += b.rev;
                totalExp += b.exp;
                baseEmit += b.emit;
                totalPower += b.power;
                if(b.rep) totalRep += b.rep;
            }
        });

        // [스모그 효과] 공해 건물(emit > 0)끼리 인접 시 배출량 증가
        let smogPenalty = 0;
        for(let i=0; i<this.gridSize; i++) {
            const b = this.mapData[i];
            if(b && b.emit > 0) {
                const neighbors = [i-1, i+1, i-10, i+10];
                neighbors.forEach(nIdx => {
                    // 그리드 경계 체크
                    if(i%10 === 0 && nIdx === i-1) return;
                    if(i%10 === 9 && nIdx === i+1) return;
                    
                    if(nIdx >= 0 && nIdx < 100 && this.mapData[nIdx] && this.mapData[nIdx].emit > 0) {
                        smogPenalty += 2; // 인접 배출원 하나당 +2t
                    }
                });
            }
        }
        let totalEmit = baseEmit + smogPenalty;

        // [전력 패널티]
        if(totalPower < 0) {
            const pCost = Math.abs(totalPower) * 5;
            totalExp += pCost;
            this.addLog(`⚡ 전력부족! 비상발전비용 -${pCost}`, 'bad');
        }

        const netEmit = Math.max(0, totalEmit); 
        const tax = Math.floor(netEmit * this.taxRate);

        // [이벤트]
        let tempState = { money: this.money, rep: this.rep + totalRep, res: 0, weekEmit: netEmit, weekPower: totalPower };
        const evt = EVENTS[Math.floor(Math.random() * EVENTS.length)];
        const evtResult = evt.effect(tempState);
        this.addLog(`🔔 ${evt.name}: ${evtResult}`);

        this.money = tempState.money;
        const netProfit = totalRev - totalExp - tax;
        this.money += netProfit;

        // [파산 체크]
        if(this.money < 0) {
            document.getElementById('final-score').innerText = `최종 기록: ${this.year}년차 파산 (배출량 ${netEmit}t)`;
            document.getElementById('gameover-modal').classList.remove('hidden');
            return; // 게임 중단
        }

        this.showReport(totalRev, totalExp, tax, netEmit, smogPenalty, evt, evtResult, netProfit);

        this.year++;
        if(this.year % 5 === 1 && this.year > 1) {
            this.taxRate += 1;
            this.addLog(`📢 탄소세율 인상 (x${this.taxRate})`, 'bad');
        }
        
        this.updateHUD();
        
        // UI 리프레시
        if(!document.getElementById('panel-build').classList.contains('hidden')) {
             const activeTab = document.querySelector('.sub-tab-btn.active');
             if(activeTab) this.filterBuild(activeTab.dataset.type);
        }
    }

    showReport(rev, exp, tax, emit, smog, evt, evtResult, netProfit) {
        let html = `
            <div class="report-row"><span>매출</span> <span>+${rev}</span></div>
            <div class="report-row"><span>유지비</span> <span style="color:red">-${exp}</span></div>
            <div class="report-row"><span>탄소세 (${emit}t)</span> <span style="color:red">-${tax}</span></div>
        `;
        if(smog > 0) {
            html += `<div class="report-row" style="color:#e67e22; font-size:0.8rem">⚠️ 스모그(인접): 배출 +${smog}t</div>`;
        }
        html += `
            <div class="report-row" style="background:#f0f0f0; padding:4px;">
                <span>🔔 ${evt.name}</span>
                <span style="font-size:0.8rem">${evtResult}</span>
            </div>
            <div class="report-total">순이익: ${netProfit >= 0 ? '+' : ''}${netProfit}</div>
            <div style="text-align:center; font-size:0.8rem; margin-top:5px;">현재 자금: ${this.money}</div>
        `;
        this.ui.reportBody.innerHTML = html;
        document.getElementById('report-modal').classList.remove('hidden');
    }

    updateHUD() {
        this.ui.money.innerText = this.money;
        this.ui.year.innerText = this.year <= GAME_CONFIG.MAX_YEARS ? this.year : "END";
        
        let e=0, p=0, r=GAME_CONFIG.START_REP;
        this.mapData.forEach(b => { 
            if(b) { e+=b.emit; p+=b.power; if(b.rep) r+=b.rep; } 
        });
        
        this.ui.emit.innerText = `${e}t`;
        this.ui.infra.innerText = p>=0 ? `⚡+${p}` : `⚡${p}`;
        this.ui.infra.style.color = p<0 ? '#ff7675' : '#55efc4';
        this.ui.rep.innerText = r;
    }

    bindEvents() {
        document.getElementById('btn-next-week').onclick = () => this.nextYear();
        window.game = this; 
        document.addEventListener('keydown', (e) => { if(e.key==='Escape') this.cancelSelection(); });
    }
}

new TycoonGame();
