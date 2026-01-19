import { GAME_CONFIG, BUILDINGS, EVENTS, RESEARCH, LEADERS } from './data.js';

class TycoonGame {
    constructor() {
        this.year = 1;
        this.money = GAME_CONFIG.START_MONEY;
        this.rep = GAME_CONFIG.START_REP;
        this.gridSize = 100; // 10x10 Grid
        this.mapData = Array(this.gridSize).fill(null);
        this.taxRate = GAME_CONFIG.TAX_RATE_BASE;
        
        this.selectedBuildingId = null;
        this.researched = [];
        this.leader = null; // 선택된 리더

        this.ui = {
            grid: document.getElementById('city-grid'),
            money: document.getElementById('ui-money'),
            emit: document.getElementById('ui-emit'),
            rep: document.getElementById('ui-rep'),
            res: document.getElementById('ui-res'),
            infra: document.getElementById('ui-infra'),
            year: document.getElementById('ui-year'),
            msg: document.getElementById('ui-message'),
            buildList: document.getElementById('building-list'),
            researchList: document.getElementById('research-list'),
            logList: document.getElementById('log-list'),
            reportBody: document.getElementById('report-details'),
            cancelBtn: document.getElementById('btn-cancel-select'),
            tooltip: document.getElementById('tooltip'),
            leaderModal: document.getElementById('leader-modal'),
            leaderList: document.getElementById('leader-list')
        };
        
        this.init();
    }

    init() {
        // 리더 선택 모달 띄우기
        this.renderLeaderSelection();
        this.generateMap();
        this.renderGrid();
        this.updateHUD();
        this.filterBuild('growth');
        this.renderResearch();
        this.bindEvents();
    }

    // --- 리더 선택 ---
    renderLeaderSelection() {
        this.ui.leaderList.innerHTML = '';
        LEADERS.forEach(leader => {
            const card = document.createElement('div');
            card.className = 'leader-card';
            card.innerHTML = `
                <div class="l-icon">${leader.icon}</div>
                <div class="l-title">${leader.name}</div>
                <div class="l-desc">${leader.desc}</div>
                <div class="l-buff">${leader.buff}</div>
            `;
            card.onclick = () => this.selectLeader(leader);
            this.ui.leaderList.appendChild(card);
        });
        this.ui.leaderModal.classList.remove('hidden');
    }

    selectLeader(leader) {
        this.leader = leader;
        this.ui.leaderModal.classList.add('hidden');
        this.addLog(`⭐ [${leader.name}] 취임! (${leader.buff})`);
        this.showMessage(`환영합니다, 시장님! ${leader.name} 특성이 적용됩니다.`);
        this.filterBuild('growth'); // 리더 특성(가격) 반영을 위해 갱신
    }

    // --- 맵 생성 ---
    generateMap() {
        this.placeBuilding(45, 'town_hall');
        const legacyTypes = ['landfill', 'old_factory', 'flood_house'];
        let placed = 0;
        while(placed < 6) {
            let rndIdx = Math.floor(Math.random() * this.gridSize);
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

    renderGrid() {
        this.ui.grid.innerHTML = '';
        this.mapData.forEach((building, idx) => {
            const tile = document.createElement('div');
            tile.className = building ? 'tile' : 'tile empty';
            if(building) tile.setAttribute('data-type', building.type);
            
            tile.onmouseenter = (e) => this.showTooltip(e, building);
            tile.onmousemove = (e) => this.moveTooltip(e);
            tile.onmouseleave = () => this.hideTooltip();
            tile.onclick = () => this.handleTileClick(idx);
            
            if (building) tile.innerHTML = `<span>${building.icon}</span>`;
            this.ui.grid.appendChild(tile);
        });
    }

    // --- 툴팁 ---
    showTooltip(e, building) {
        if(!building) return;
        let html = `<h4>${building.icon} ${building.name}</h4>`;
        
        if(building.type === 'legacy') {
             html += `<div style="color:#ff7675">⚠️ 오염 유산</div>`;
             html += `<div>철거비용: 💰${building.demolishCost}</div>`;
        } else {
             // 리더 버프 적용된 수익 표시? (여기선 기본값만 표시하거나 계산해서 표시)
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

    // --- 클릭 핸들러 ---
    handleTileClick(idx) {
        const currentB = this.mapData[idx];

        if (this.selectedBuildingId) {
            if(currentB) {
                if(currentB.id === 'town_hall') { alert("시청은 철거할 수 없습니다."); return; }
                if(currentB.type === 'legacy') { alert("오염 유산은 먼저 철거해야 합니다."); return; }
            }
            
            // 건물 가격 계산 (리더 버프 적용)
            const template = BUILDINGS.find(b => b.id === this.selectedBuildingId);
            const finalCost = this.getBuildingCost(template);

            if(this.money < finalCost) { alert("자금이 부족합니다!"); return; }
            
            this.build(idx, template, finalCost);
            return;
        }

        if (currentB && currentB.id !== 'town_hall') {
            const cost = currentB.type === 'legacy' ? currentB.demolishCost : 10;
            if(confirm(`[${currentB.name}] 철거하시겠습니까? (비용: ${cost}억)`)) {
                if(this.money >= cost) {
                    this.money -= cost;
                    this.mapData[idx] = null;
                    this.renderGrid();
                    this.updateHUD();
                    this.addLog(`${currentB.name} 철거 (-${cost})`, 'bad');
                    this.showMessage("철거 완료.");
                } else {
                    alert("철거 자금이 부족합니다.");
                }
            }
        } else if (!currentB) {
            this.showMessage("우측 메뉴에서 건물을 선택하고 땅을 클릭하세요.");
        }
    }

    // --- 비용 계산 함수 (리더 버프) ---
    getBuildingCost(building) {
        let cost = building.cost;
        // 에너지 전문가: 에너지 건물 20% 할인
        if(this.leader && this.leader.id === 'energy_expert' && building.type === 'energy') {
            cost = Math.floor(cost * 0.8);
        }
        return cost;
    }

    // --- 건설 패널 ---
    filterBuild(type) {
        document.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        this.ui.buildList.innerHTML = '';
        const buildable = BUILDINGS.filter(b => b.type !== 'legacy' && b.id !== 'town_hall');

        buildable.forEach(b => {
            if(type !== 'all' && b.type !== type) return;

            const item = document.createElement('div');
            item.className = 'build-item';
            
            let locked = b.reqTech && !this.researched.includes(b.reqTech);
            if(this.selectedBuildingId === b.id) item.classList.add('selected');
            
            // 리더 버프 적용된 가격
            const finalCost = this.getBuildingCost(b);
            const canAfford = this.money >= finalCost;

            if(!canAfford || locked) item.classList.add('disabled');

            let powerStat = b.power > 0 ? `<span class="stat-pos">⚡+${b.power}</span>` : (b.power < 0 ? `<span class="stat-neg">⚡${b.power}</span>` : '');
            let emitStat = b.emit > 0 ? `<span class="stat-neg">♨️${b.emit}</span>` : (b.emit < 0 ? `<span class="stat-pos">🌱${Math.abs(b.emit)}</span>` : '');

            // 가격 표시 (할인되면 색상 변경)
            let costHtml = `💰 ${finalCost}`;
            if(finalCost < b.cost) costHtml = `<span style="color:#2ecc71">💰 ${finalCost} (↓)</span>`;

            let html = `
                <div class="bi-icon">${b.icon}</div>
                <div class="bi-info">
                    <div class="bi-name">${b.name} ${locked ? '🔒' : ''}</div>`;
            
            if(locked) {
                const reqName = RESEARCH.find(r=>r.id===b.reqTech).name;
                html += `<div class="bi-desc" style="color:#e74c3c">필요: ${reqName}</div>`;
            } else {
                html += `<div class="bi-cost">${costHtml}</div>
                         <div class="bi-desc">수익${b.rev} | ${emitStat} ${powerStat}</div>`;
            }
            html += `</div>`;
            
            item.innerHTML = html;
            item.onclick = () => {
                if(locked) { alert("연구가 필요합니다!"); return; }
                if(this.money < finalCost) { alert("자금이 부족합니다."); return; }
                this.selectBuilding(b.id);
            };
            this.ui.buildList.appendChild(item);
        });
    }

    renderResearch() {
        this.ui.researchList.innerHTML = '';
        RESEARCH.forEach(r => {
            const item = document.createElement('div');
            item.className = 'research-item';
            
            const isDone = this.researched.includes(r.id);
            const locked = r.req && !this.researched.includes(r.req);
            
            if(isDone) item.classList.add('done');
            else if(locked || this.money < r.cost) item.classList.add('disabled');

            item.innerHTML = `
                <div class="bi-icon">${r.icon}</div>
                <div class="bi-info">
                    <div class="bi-name">${r.name} ${isDone ? '✅' : (locked ? '🔒' : '')}</div>
                    ${!isDone ? `<div class="bi-cost">💰 ${r.cost}</div>` : ''}
                    <div class="bi-desc">${r.desc}</div>
                </div>
            `;
            
            item.onclick = () => {
                if(isDone || locked || this.money < r.cost) return;
                if(confirm(`${r.name} 연구를 진행하시겠습니까? (비용 ${r.cost})`)) {
                    this.money -= r.cost;
                    this.researched.push(r.id);
                    this.addLog(`🔬 기술 개발: ${r.name}`, 'good');
                    this.updateHUD();
                    this.renderResearch();
                    const activeTab = document.querySelector('.sub-tab-btn.active');
                    if(activeTab) this.filterBuild(activeTab.dataset.type);
                }
            };
            this.ui.researchList.appendChild(item);
        });
    }

    selectBuilding(id) {
        this.selectedBuildingId = id;
        this.ui.cancelBtn.classList.remove('hidden');
        this.filterBuild(BUILDINGS.find(b=>b.id===id).type);
    }

    cancelSelection() {
        this.selectedBuildingId = null;
        this.ui.cancelBtn.classList.add('hidden');
        const activeTab = document.querySelector('.sub-tab-btn.active');
        if(activeTab) this.filterBuild(activeTab.dataset.type);
    }

    build(idx, template, finalCost) {
        this.money -= finalCost;
        this.mapData[idx] = { ...template };
        this.renderGrid();
        this.updateHUD();
        this.addLog(`${template.name} 건설 (-${finalCost})`);
        this.showMessage(`${template.name} 건설 완료!`);
    }

    switchMainTab(tabName) {
        ['panel-build', 'panel-research', 'panel-log'].forEach(id => document.getElementById(id).classList.add('hidden'));
        document.getElementById(`panel-${tabName}`).classList.remove('hidden');
        document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
        if(event) event.target.classList.add('active');
    }

    addLog(msg, type='normal') {
        const item = document.createElement('div');
        item.className = `log-item ${type}`;
        item.innerHTML = `<span style="opacity:0.6;">Y${this.year}</span> ${msg}`;
        this.ui.logList.prepend(item);
    }

    showMessage(text) {
        this.ui.msg.innerText = text;
        this.ui.msg.style.opacity = 0.5;
        setTimeout(() => this.ui.msg.style.opacity = 1, 100);
    }

    // --- 연말 정산 ---
    nextYear() {
        if (this.year > GAME_CONFIG.MAX_YEARS) {
            alert(`게임 종료! 최종 자산: ${this.money}`);
            return;
        }

        let totalRev = 0, totalExp = 0, baseEmit = 0, totalPower = 0;
        let totalRep = 0;

        this.mapData.forEach(b => {
            if (b) {
                // 경제 전문가: 수익 15% 증가
                let rev = b.rev;
                if(this.leader && this.leader.id === 'economy_expert') {
                    rev = Math.floor(rev * 1.15);
                }
                
                totalRev += rev;
                totalExp += b.exp;
                baseEmit += b.emit;
                totalPower += b.power;
                if(b.rep) totalRep += b.rep;
            }
        });

        // 스모그 효과
        let smogPenalty = 0;
        for(let i=0; i<this.gridSize; i++) {
            const b = this.mapData[i];
            if(b && b.emit > 0) {
                const neighbors = [i-1, i+1, i-10, i+10];
                neighbors.forEach(nIdx => {
                    if(i%10 === 0 && nIdx === i-1) return;
                    if(i%10 === 9 && nIdx === i+1) return;
                    if(nIdx >= 0 && nIdx < 100 && this.mapData[nIdx] && this.mapData[nIdx].emit > 0) {
                        smogPenalty += 2;
                    }
                });
            }
        }
        let totalEmit = baseEmit + smogPenalty;

        // 전력 패널티
        if(totalPower < 0) {
            const pCost = Math.abs(totalPower) * 5;
            totalExp += pCost;
            this.addLog(`⚡ 전력부족! 비상비용 -${pCost}`, 'bad');
        }

        const netEmit = Math.max(0, totalEmit); 
        let tax = Math.floor(netEmit * this.taxRate);

        // 기후 전문가: 탄소세 50% 감면
        if(this.leader && this.leader.id === 'climate_expert') {
            tax = Math.floor(tax * 0.5);
        }

        // 이벤트
        let tempState = { money: this.money, rep: this.rep + totalRep, res: 0, weekEmit: netEmit, weekPower: totalPower };
        const evt = EVENTS[Math.floor(Math.random() * EVENTS.length)];
        const evtResult = evt.effect(tempState);
        this.addLog(`🔔 ${evt.name}: ${evtResult}`);
        this.money = tempState.money;

        // 최종 계산
        const netProfit = totalRev - totalExp - tax;
        this.money += netProfit;

        // 파산 체크
        if(this.money < 0) {
            document.getElementById('final-score').innerText = `최종 기록: ${this.year}년차 파산`;
            document.getElementById('gameover-modal').classList.remove('hidden');
            return;
        }

        this.showReport(totalRev, totalExp, tax, netEmit, smogPenalty, evt, evtResult, netProfit);

        this.year++;
        if(this.year % 5 === 1 && this.year > 1) {
            this.taxRate += 1;
            this.addLog(`📢 탄소세율 인상 (x${this.taxRate})`, 'bad');
        }
        
        this.updateHUD();
        // 건설 목록 갱신 (자금 변동)
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
        if(smog > 0) html += `<div class="report-row" style="color:#e67e22; font-size:0.8rem">⚠️ 스모그(인접): 배출 +${smog}t</div>`;
        if(this.leader) html += `<div class="report-row" style="color:#2ecc71; font-size:0.8rem">👤 리더 효과 적용됨</div>`;
        
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
        this.mapData.forEach(b => { if(b) { e+=b.emit; p+=b.power; if(b.rep) r+=b.rep; } });
        
        this.ui.emit.innerText = `${e}t`;
        
        // 아이콘 중복 방지를 위해 숫자만 업데이트하고 색상 조정
        this.ui.infra.innerText = p; // 숫자만
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
