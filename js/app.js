import { GAME_CONFIG, BUILDINGS, EVENTS, RESEARCH, LEADERS, MAPS, POLICIES, ACHIEVEMENTS } from './data.js';

class TycoonGame {
    constructor() {
        // --- 1. 게임 상태 (State) ---
        this.year = 1;
        this.money = GAME_CONFIG.START_MONEY;
        this.rep = GAME_CONFIG.START_REP;
        
        // 10x10 그리드 (100칸)
        this.gridSize = 100;
        this.mapData = Array(this.gridSize).fill(null);
        
        this.taxRate = GAME_CONFIG.TAX_RATE_BASE;
        
        // 선택된 옵션들
        this.selectedMap = null;     // 맵 환경
        this.leader = null;          // 시장(리더)
        this.selectedBuildingId = null; // 건설 모드 선택값
        
        // 진행 상황
        this.researched = [];        // 연구 완료 목록
        this.achieved = new Set();   // 달성한 업적 ID 목록
        this.activePolicies = [];    // 활성화된 정책 효과 (영구 효과 등)

        // --- 2. UI 요소 캐싱 (DOM) ---
        this.ui = {
            // 메인 화면
            grid: document.getElementById('city-grid'),
            money: document.getElementById('ui-money'),
            emit: document.getElementById('ui-emit'),
            rep: document.getElementById('ui-rep'),
            infra: document.getElementById('ui-infra'),
            year: document.getElementById('ui-year'),
            mapBadge: document.getElementById('ui-map-type'),
            msg: document.getElementById('ui-message'),
            tooltip: document.getElementById('tooltip'),
            toast: document.getElementById('achievement-toast'),
            
            // 사이드바 패널
            buildList: document.getElementById('building-list'),
            researchList: document.getElementById('research-list'),
            logList: document.getElementById('log-list'),
            cancelBtn: document.getElementById('btn-cancel-select'),
            
            // 인트로 (선택 화면)
            introScreen: document.getElementById('intro-screen'),
            mapList: document.getElementById('map-list'),
            leaderList: document.getElementById('intro-leader-list'),
            stepMap: document.getElementById('step-map'),
            stepLeader: document.getElementById('step-leader'),
            btnBack: document.getElementById('btn-back-step'),
            btnAction: document.getElementById('btn-intro-action'),
            
            // 룰렛 & 리포트 모달
            rouletteModal: document.getElementById('roulette-modal'),
            rouletteDisplay: document.getElementById('roulette-display'),
            rouletteResult: document.getElementById('roulette-result'),
            rouletteDesc: document.getElementById('roulette-desc'),
            reportModal: document.getElementById('report-modal'),
            reportDetails: document.getElementById('report-details'),
            
            // 정책 모달
            policyModal: document.getElementById('policy-modal'),
            policyTitle: document.getElementById('policy-title'),
            policyDesc: document.getElementById('policy-desc'),
            policyEffectY: document.getElementById('policy-effect-y'),
            policyEffectN: document.getElementById('policy-effect-n'),
            
            // 게임오버
            gameoverModal: document.getElementById('gameover-modal'),
            finalScore: document.getElementById('final-score')
        };
        
        this.init();
    }

    // === 초기화 ===
    init() {
        // 인트로 화면 렌더링
        this.renderIntroMapSelection();
        
        // 전역 객체 등록 (HTML onclick 지원)
        window.game = this;
        
        // 키보드 단축키
        document.addEventListener('keydown', (e) => {
            if(e.key === 'Escape') this.cancelSelection();
        });
    }

    // ----------------------------------------------------
    // [Intro] 맵 및 리더 선택 로직
    // ----------------------------------------------------
    
    renderIntroMapSelection() {
        this.ui.mapList.innerHTML = '';
        MAPS.forEach(map => {
            const card = this.createSelectionCard(map, map.effectDesc);
            card.onclick = () => this.selectMap(map, card);
            this.ui.mapList.appendChild(card);
        });
        
        // 버튼 설정
        this.ui.btnAction.innerText = "맵을 선택하세요";
        this.ui.btnAction.onclick = () => this.goToLeaderStep();
        this.ui.btnBack.classList.add('hidden');
    }

    selectMap(map, cardElement) {
        this.selectedMap = map;
        this.highlightCard(cardElement);
        this.ui.btnAction.disabled = false;
        this.ui.btnAction.innerText = "다음 단계로";
    }

    goToLeaderStep() {
        // 화면 전환 애니메이션
        this.ui.stepMap.classList.add('hidden');
        this.ui.stepLeader.classList.remove('hidden');
        this.ui.btnBack.classList.remove('hidden');
        
        this.ui.leaderList.innerHTML = '';
        LEADERS.forEach(leader => {
            const card = this.createSelectionCard(leader, leader.buff);
            card.onclick = () => this.selectLeader(leader, card);
            this.ui.leaderList.appendChild(card);
        });

        this.ui.btnAction.innerText = "리더를 선택하세요";
        this.ui.btnAction.disabled = true;
        this.ui.btnAction.onclick = () => this.startGame();
        
        // 뒤로가기 버튼
        this.ui.btnBack.onclick = () => {
            this.ui.stepLeader.classList.add('hidden');
            this.ui.stepMap.classList.remove('hidden');
            this.ui.btnBack.classList.add('hidden');
            this.ui.btnAction.innerText = "다음 단계로";
            this.ui.btnAction.onclick = () => this.goToLeaderStep();
        };
    }

    selectLeader(leader, cardElement) {
        this.leader = leader;
        this.highlightCard(cardElement);
        this.ui.btnAction.disabled = false;
        this.ui.btnAction.innerText = "임기 시작하기";
    }

    createSelectionCard(data, subText) {
        const div = document.createElement('div');
        div.className = 'select-card';
        div.innerHTML = `
            <div class="card-icon">${data.icon}</div>
            <div class="card-title">${data.name}</div>
            <div class="card-desc">${data.desc}</div>
            <div class="card-buff">${subText}</div>
        `;
        return div;
    }

    highlightCard(el) {
        document.querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
    }

    // ----------------------------------------------------
    // [Game Start] 게임 본편 진입
    // ----------------------------------------------------
    startGame() {
        this.ui.introScreen.style.display = 'none';
        
        // 맵 특성 적용 (배경색 등)
        document.documentElement.style.setProperty('--map-bg', this.selectedMap.bg);
        this.ui.mapBadge.innerText = this.selectedMap.name;

        // 초기화
        this.generateMap();
        this.renderGrid();
        this.updateHUD();
        this.filterBuild('growth');
        this.renderResearch();
        
        this.addLog(`=== 게임 시작 ===`);
        this.addLog(`맵: ${this.selectedMap.name} / 리더: ${this.leader.name}`);
        this.showMessage("도시 건설을 시작하세요!");
    }

    // ----------------------------------------------------
    // [Map] 맵 생성 및 관리
    // ----------------------------------------------------
    generateMap() {
        // 중앙(45번)에 시청
        this.placeBuilding(45, 'town_hall');

        // 오염 유산 6개 배치
        const legacyTypes = ['landfill', 'old_factory', 'flood_house'];
        let placedLegacies = 0;
        while(placedLegacies < 6) {
            let rndIdx = Math.floor(Math.random() * this.gridSize);
            if(this.checkSpace(rndIdx, 1, 1)) {
                let rndType = legacyTypes[Math.floor(Math.random() * legacyTypes.length)];
                this.placeBuilding(rndIdx, rndType);
                placedLegacies++;
            }
        }

        // 숲 배치 (맵 특성에 따라 다름)
        // 사막이면 숲이 적고(2개), 평지면 많음(6개)
        let forestCount = this.selectedMap.id === 'desert' ? 2 : 6;
        let placedForests = 0;
        while(placedForests < forestCount) {
            let rndIdx = Math.floor(Math.random() * this.gridSize);
            if(this.checkSpace(rndIdx, 1, 1)) {
                this.placeBuilding(rndIdx, 'forest');
                placedForests++;
            }
        }
    }

    // 건물 배치 (멀티타일 지원)
    placeBuilding(idx, id) {
        const b = BUILDINGS.find(x => x.id === id);
        if(b) {
            // 인스턴스 생성 (원본 데이터 보존 + 루트 위치 저장)
            const instance = { ...b, rootIdx: idx };
            this.setOccupied(idx, b.w, b.h, instance);
        }
    }

    // 그리드 점유 설정
    setOccupied(idx, w, h, data) {
        for(let r=0; r<h; r++) {
            for(let c=0; c<w; c++) {
                let targetIdx = idx + (r * 10) + c;
                this.mapData[targetIdx] = data; 
            }
        }
    }

    // 공간 확인
    checkSpace(idx, w, h) {
        const row = Math.floor(idx / 10);
        const col = idx % 10;
        // 맵 이탈 체크
        if (col + w > 10 || row + h > 10) return false;
        // 겹침 체크
        for(let r=0; r<h; r++) {
            for(let c=0; c<w; c++) {
                let targetIdx = idx + (r * 10) + c;
                if(this.mapData[targetIdx] !== null) return false;
            }
        }
        return true;
    }

    // 철거 (공간 비우기)
    clearSpace(idx) {
        const b = this.mapData[idx];
        if(!b) return;
        const root = b.rootIdx;
        for(let r=0; r<b.h; r++) {
            for(let c=0; c<b.w; c++) {
                let targetIdx = root + (r * 10) + c;
                this.mapData[targetIdx] = null;
            }
        }
    }

    // ----------------------------------------------------
    // [Render] 그리드 그리기 (CSS Grid Span 활용)
    // ----------------------------------------------------
    renderGrid() {
        this.ui.grid.innerHTML = '';
        const renderedIndices = new Set();

        for(let i=0; i<this.gridSize; i++) {
            if(renderedIndices.has(i)) continue;

            const b = this.mapData[i];
            const tile = document.createElement('div');
            tile.className = 'tile';
            
            if(b) {
                if(b.rootIdx === i) {
                    tile.innerHTML = `<span>${b.icon}</span>`;
                    tile.setAttribute('data-type', b.type);
                    
                    // 대형 건물 스타일
                    if(b.w > 1) tile.classList.add('w2');
                    if(b.h > 1) tile.classList.add('h2');
                    
                    tile.style.gridColumn = `span ${b.w}`;
                    tile.style.gridRow = `span ${b.h}`;

                    // 마우스 이벤트
                    tile.onmouseenter = (e) => this.showTooltip(e, b);
                    tile.onmousemove = (e) => this.moveTooltip(e);
                    tile.onmouseleave = () => this.hideTooltip();
                    tile.onclick = () => this.handleTileClick(i); 
                    tile.oncontextmenu = (e) => { e.preventDefault(); this.cancelSelection(); }; // 우클릭 취소

                    this.ui.grid.appendChild(tile);

                    // 점유 마킹
                    for(let r=0; r<b.h; r++) {
                        for(let c=0; c<b.w; c++) {
                            renderedIndices.add(i + (r*10) + c);
                        }
                    }
                }
            } else {
                tile.className = 'tile empty';
                tile.onclick = () => this.handleTileClick(i);
                tile.oncontextmenu = (e) => { e.preventDefault(); this.cancelSelection(); };
                this.ui.grid.appendChild(tile);
            }
        }
    }

    // ----------------------------------------------------
    // [Interaction] 클릭 및 건설 로직
    // ----------------------------------------------------
    handleTileClick(idx) {
        const currentB = this.mapData[idx];

        // [Mode 1] 건설 모드
        if (this.selectedBuildingId) {
            if(currentB) {
                if(currentB.id === 'town_hall') { this.showMessage("❌ 시청은 철거 불가!"); return; }
                if(currentB.type === 'legacy') { this.showMessage("⚠️ 오염 유산은 먼저 클릭해서 철거하세요."); return; }
                if(currentB.id === 'forest') {
                    // 숲은 바로 덮어쓰기 허용 (벌목 비용 0)
                } else {
                    this.showMessage("❌ 기존 건물은 먼저 철거해야 합니다.");
                    return;
                }
            }
            
            const template = BUILDINGS.find(b => b.id === this.selectedBuildingId);
            
            // 공간 체크
            if(!this.checkSpace(idx, template.w, template.h)) {
                this.showMessage("❌ 공간이 부족합니다! (맵 밖이거나 겹침)");
                return;
            }

            // 비용 계산 (버프 적용)
            let cost = this.calculateCost(template);

            if(this.money < cost) { 
                this.showMessage("💸 자금이 부족합니다!"); 
                return; 
            }
            
            this.build(idx, template, cost);
            return;
        }

        // [Mode 2] 일반 모드 (정보/철거)
        if (currentB && currentB.id !== 'town_hall') {
            const cost = currentB.type === 'legacy' ? currentB.demolishCost : 10;
            const msg = currentB.type === 'legacy' ? "오염 유산을 정화하시겠습니까?" : "건물을 철거하시겠습니까?";
            
            if(confirm(`[${currentB.name}] ${msg} (비용: ${cost}억)`)) {
                if(this.money >= cost) {
                    this.money -= cost;
                    this.clearSpace(idx);
                    this.renderGrid();
                    this.updateHUD();
                    this.addLog(`철거 완료: ${currentB.name} (-${cost}억)`, 'bad');
                    this.showMessage("철거되었습니다.");
                } else {
                    alert("철거 비용이 부족합니다.");
                }
            }
        } else if (!currentB) {
            this.showMessage("건설할 건물을 우측 메뉴에서 선택하세요.");
        }
    }

    calculateCost(template) {
        let cost = template.cost;
        
        // 리더 버프: 에너지 전문가
        if(this.leader.id === 'energy_expert' && template.type === 'energy') {
            cost = Math.floor(cost * 0.8); // 20% 할인
        }
        
        // 맵 패널티: 사막 숲 비용 3배
        if(this.selectedMap.id === 'desert' && template.id === 'forest') {
            cost = cost * 3; 
            // 숲 기본 비용이 0이면 의미 없으므로, 데이터에서 숲 비용을 10으로 잡거나 해야 함
            // 현재 데이터 상 숲 비용 0이면 패널티 없음.
        }

        return cost;
    }

    build(idx, template, finalCost) {
        this.money -= finalCost;
        this.clearSpace(idx); // 기존 것(숲 등) 제거
        this.setOccupied(idx, template.w, template.h, { ...template, rootIdx: idx });
        
        this.renderGrid();
        this.updateHUD();
        this.addLog(`${template.name} 건설 (-${finalCost}억)`);
        this.showMessage("건설 완료!");
    }

    // ----------------------------------------------------
    // [Panels] 건설 및 연구 목록
    // ----------------------------------------------------
    filterBuild(type) {
        // 탭 스타일
        document.querySelectorAll('.sub-tab-btn').forEach(btn => 
            btn.classList.toggle('active', btn.dataset.type === type));

        this.ui.buildList.innerHTML = '';
        const buildable = BUILDINGS.filter(b => b.type !== 'legacy' && b.id !== 'town_hall'); // 숲은 목록에 표시할지 선택 (데이터에 포함됨)

        buildable.forEach(b => {
            if(type !== 'all' && b.type !== type) return;

            const item = document.createElement('div');
            item.className = 'build-item';
            
            // 잠금 체크
            let locked = b.reqTech && !this.researched.includes(b.reqTech);
            // 선택 체크
            if(this.selectedBuildingId === b.id) item.classList.add('selected');
            
            const cost = this.calculateCost(b);
            if(this.money < cost || locked) item.classList.add('disabled');

            // 아이콘/텍스트 구성
            let powerTxt = b.power > 0 ? `<span class="stat-pos">⚡+${b.power}</span>` : (b.power < 0 ? `<span class="stat-neg">⚡${b.power}</span>` : '');
            let emitTxt = b.emit > 0 ? `<span class="stat-neg">♨️${b.emit}</span>` : (b.emit < 0 ? `<span class="stat-pos">🌱${Math.abs(b.emit)}</span>` : '');
            let costHtml = cost < b.cost ? `<span class="stat-pos">💰${cost}</span>` : `💰${cost}`; // 할인 표시

            item.innerHTML = `
                <div class="bi-icon">${b.icon}</div>
                <div class="bi-info">
                    <div class="bi-name">${b.name} ${locked ? '🔒' : ''}</div>
                    ${locked ? `<div class="bi-desc stat-neg">필요: ${RESEARCH.find(r=>r.id===b.reqTech).name}</div>` 
                             : `<div class="bi-cost">${costHtml}</div><div class="bi-desc">수익${b.rev} ${emitTxt} ${powerTxt}</div>`}
                </div>
            `;
            
            item.onclick = () => {
                if(locked) { this.showMessage("🔒 선행 연구가 필요합니다."); return; }
                if(this.money < cost) { this.showMessage("💸 자금이 부족합니다."); return; }
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
                if(isDone) return;
                if(locked) { alert("선행 연구가 필요합니다."); return; }
                if(this.money < r.cost) { alert("연구 자금이 부족합니다."); return; }
                
                if(confirm(`${r.name} 연구를 진행하시겠습니까? (-${r.cost}억)`)) {
                    this.money -= r.cost;
                    this.researched.push(r.id);
                    this.addLog(`연구 완료: ${r.name}`, 'good');
                    this.updateHUD();
                    this.renderResearch();
                    
                    // 건설 목록 갱신
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
        this.showMessage(`${BUILDINGS.find(b=>b.id===id).name} 선택됨. 맵을 클릭하세요.`);
        const b = BUILDINGS.find(x=>x.id===id);
        this.filterBuild(b.type);
    }

    cancelSelection() {
        this.selectedBuildingId = null;
        this.ui.cancelBtn.classList.add('hidden');
        this.showMessage("선택 취소");
        const activeTab = document.querySelector('.sub-tab-btn.active');
        if(activeTab) this.filterBuild(activeTab.dataset.type);
    }

    switchMainTab(tab) {
        ['panel-build', 'panel-research', 'panel-log'].forEach(id => document.getElementById(id).classList.add('hidden'));
        document.getElementById(`panel-${tab}`).classList.remove('hidden');
        document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
        if(event) event.target.classList.add('active');
    }

    // ----------------------------------------------------
    // [Logic] 연말 정산 (Game Loop)
    // ----------------------------------------------------
    nextYear() {
        if(this.year > GAME_CONFIG.MAX_YEARS) return;
        
        // 1. 룰렛 시작
        this.ui.rouletteModal.classList.remove('hidden');
        this.ui.rouletteDisplay.classList.remove('hidden');
        this.ui.rouletteResult.classList.add('hidden');
        
        let count = 0;
        const interval = setInterval(() => {
            const rndEvt = EVENTS[Math.floor(Math.random() * EVENTS.length)];
            this.ui.rouletteDisplay.innerText = `🎲 ${rndEvt.name}...`;
            count++;
            if(count > 15) { // 1.5초 후 정지
                clearInterval(interval);
                this.calculateYear(EVENTS[Math.floor(Math.random() * EVENTS.length)]);
            }
        }, 80);
    }

    calculateYear(evt) {
        let totalRev=0, totalExp=0, baseEmit=0, totalPower=0;
        
        // A. 건물 기본 스탯 합산 (rootIdx 기준 중복 방지)
        this.mapData.forEach((b, i) => {
            if(b && b.rootIdx === i) {
                // 리더 버프: 경제 전문가 수익 15% 증가
                let rev = b.rev;
                if(this.leader.id === 'economy_expert') rev = Math.floor(rev * 1.15);
                
                // 맵 특성: 항구는 상업(growth) 수익 20% 증가
                if(this.selectedMap.id === 'port' && b.type === 'growth') {
                    rev = Math.floor(rev * 1.2);
                }
                // 맵 특성: 사막은 태양광 효율 50% 증가 (전력)
                let power = b.power;
                if(this.selectedMap.id === 'desert' && b.id === 'solar') {
                    power = Math.floor(power * 1.5);
                }

                totalRev += rev;
                totalExp += b.exp;
                baseEmit += b.emit;
                totalPower += power;
            }
        });

        // B. 스모그 효과 (배출원 인접 패널티)
        let smogPenalty = 0;
        for(let i=0; i<this.gridSize; i++) {
            const b = this.mapData[i];
            // 해당 타일에 건물이 있고, 그 건물이 배출원이며, 루트일 때 (중복 계산 방지)
            if(b && b.emit > 0 && b.rootIdx === i) {
                const neighbors = [i-1, i+1, i-10, i+10];
                neighbors.forEach(nIdx => {
                    if(i%10 === 0 && nIdx === i-1) return; // 좌측 경계
                    if(i%10 === 9 && nIdx === i+1) return; // 우측 경계
                    
                    if(nIdx >= 0 && nIdx < 100) {
                        const neighbor = this.mapData[nIdx];
                        // 이웃이 있고, 배출원이며, '나'와 다른 건물이면
                        if(neighbor && neighbor.emit > 0 && neighbor.rootIdx !== i) {
                            smogPenalty += 2; 
                        }
                    }
                });
            }
        }
        let totalEmit = baseEmit + smogPenalty;

        // C. 전력 패널티
        let powerCost = 0;
        if(totalPower < 0) {
            powerCost = Math.abs(totalPower) * 5; // 부족분 당 5억
            totalExp += powerCost;
            this.addLog(`⚡ 전력부족! 비상발전비용 -${powerCost}억`, 'bad');
        }

        // D. 탄소세
        const netEmit = Math.max(0, totalEmit);
        let tax = Math.floor(netEmit * this.taxRate);
        // 리더 버프: 기후 전문가 50% 감면
        if(this.leader.id === 'climate_expert') tax = Math.floor(tax * 0.5);

        // E. 이벤트 적용 (즉시 효과)
        // 맵 특성: 항구는 태풍 피해 2배
        let tempState = { money: this.money, weekEmit: netEmit, weekPower: totalPower, rep: this.rep, res: 0 };
        // 이벤트 효과 계산 전 맵 특성 고려는 effect 함수 내에서 하긴 복잡하니, 
        // 여기서 간단히 돈만 깎는 이벤트라면 2배 적용 (단순화)
        if(this.selectedMap.id === 'port' && evt.name.includes('태풍')) {
            // 태풍 이벤트는 money를 직접 깎음. 시뮬레이션이 어려우니 생략하거나
            // 이벤트 결과 메시지만 띄우고 돈은 아래에서 합산.
            // 여기선 구조상 이벤트 effect가 직접 tempState를 수정하므로, 
            // 이벤트 실행 후 차액을 계산해서 2배 곱하는 식으로 처리 가능.
        }
        
        const prevMoney = tempState.money;
        const evtResult = evt.effect(tempState);
        let evtMoneyDiff = tempState.money - prevMoney;
        
        // 항구 맵 태풍 2배 적용
        if(this.selectedMap.id === 'port' && evt.name.includes('태풍')) {
            evtMoneyDiff *= 2; 
        }
        
        this.addLog(`🔔 ${evt.name}: ${evtResult}`);

        // F. 최종 계산
        // 순이익 = 매출 - 유지비 - 탄소세 + 이벤트변동분
        const netProfit = totalRev - totalExp - tax + evtMoneyDiff;
        this.money += netProfit;

        // G. 결과 표시
        this.ui.rouletteDisplay.classList.add('hidden');
        this.ui.rouletteResult.classList.remove('hidden');
        this.ui.rouletteDesc.innerHTML = `
            <h3 style="color:#00cec9">${evt.name}</h3>
            <p>${evtResult}</p>
            ${this.selectedMap.id==='port' && evt.name.includes('태풍') ? '<p class="stat-neg">(항구 특성: 피해 2배)</p>' : ''}
            <hr style="border-color:#555; margin:10px 0;">
            <div style="font-size:0.9rem; text-align:left; padding-left:20px;">
                <p>📈 매출: +${totalRev}</p>
                <p>📉 유지비: -${totalExp} ${powerCost>0?`(전력난-${powerCost})`:''}</p>
                <p>🏛️ 탄소세: -${tax} (배출 ${netEmit}t)</p>
                ${smogPenalty>0 ? `<p class="stat-neg">⚠️ 스모그 패널티: 탄소 +${smogPenalty}t</p>` : ''}
            </div>
            <h2 style="color:${netProfit>=0?'#2ecc71':'#e74c3c'}">최종 손익: ${netProfit > 0 ? '+' : ''}${netProfit}억</h2>
        `;
        
        this.pendingYearUpdate = { netProfit, netEmit }; 
        this.checkAchievements(netEmit);
    }

    finishYear() {
        this.ui.rouletteModal.classList.add('hidden');

        // 파산 체크
        if(this.money < 0) {
            this.ui.finalScore.innerText = `${this.year}년차 파산 (최종 부채 ${this.money}억)`;
            this.ui.gameoverModal.classList.remove('hidden');
            return;
        }

        // 정책 트리거 (3년마다)
        if(this.year % GAME_CONFIG.POLICY_INTERVAL === 0) {
            this.triggerPolicy();
            return; // 정책 모달이 닫히면서 resumeYear 호출
        }

        this.resumeYear();
    }

    resumeYear() {
        this.year++;
        
        // 엔딩 체크
        if(this.year > GAME_CONFIG.MAX_YEARS) {
            alert(`🎉 축하합니다! 15년 임기를 성공적으로 마쳤습니다.\n최종 자금: ${this.money}억`);
            location.reload();
            return;
        }

        // 탄소세 인상
        if(this.year % 5 === 1) {
            this.taxRate += 1;
            this.addLog(`📢 정책 강화: 탄소세율 인상 (x${this.taxRate})`, 'bad');
            this.showMessage("탄소세율이 인상되었습니다!");
        }

        this.updateHUD();
        this.addLog(`📅 ${this.year}년이 시작되었습니다.`);
    }

    // ----------------------------------------------------
    // [Policy] 정책 시스템
    // ----------------------------------------------------
    triggerPolicy() {
        const policyIdx = (this.year / GAME_CONFIG.POLICY_INTERVAL) - 1;
        if(policyIdx >= POLICIES.length) { this.resumeYear(); return; } // 정책 고갈

        const p = POLICIES[policyIdx];
        this.currentPolicy = p;

        this.ui.policyTitle.innerText = p.title;
        this.ui.policyDesc.innerText = p.desc;
        
        // 효과 텍스트 구성
        this.ui.policyEffectY.innerText = `비용 ${p.y.cost}억 | ${p.y.msg}`;
        this.ui.policyEffectN.innerText = `비용 ${p.n.cost}억 | ${p.n.msg}`;
        
        this.ui.policyModal.classList.remove('hidden');
    }

    decidePolicy(isApprove) {
        const p = this.currentPolicy;
        const choice = isApprove ? p.y : p.n;
        
        if(this.money < choice.cost) {
            alert("시행 예산이 부족합니다!");
            return;
        }

        this.money -= choice.cost;
        
        // 효과 적용 (간단히 돈/평판/전역변수로 처리)
        // 실제로는 건물 배출량을 영구적으로 줄이거나 해야 하지만, 
        // MVP에선 로그와 자금/평판 변동으로만 처리
        this.money += (choice.bonusMoney || 0);
        this.rep += choice.rep;
        
        this.addLog(`📜 정책 [${p.title}] - ${choice.label}`, 'policy');
        this.ui.policyModal.classList.add('hidden');
        this.resumeYear();
    }

    // ----------------------------------------------------
    // [Achievements] 업적 시스템
    // ----------------------------------------------------
    checkAchievements(currentEmit) {
        ACHIEVEMENTS.forEach(ach => {
            if(this.achieved.has(ach.id)) return;

            let unlocked = false;
            
            // 조건 체크
            if(ach.id === 'money_maker' && this.money >= 1000) unlocked = true;
            if(ach.id === 'net_zero' && currentEmit <= 0) unlocked = true;
            
            if(ach.id === 'solar_king') {
                const count = this.mapData.filter(b => b && b.id === 'solar').length;
                if(count >= 5) unlocked = true;
            }
            if(ach.id === 'forest_city') {
                const count = this.mapData.filter(b => b && b.id === 'park').length; // 도시숲
                if(count >= 5) unlocked = true;
            }

            if(unlocked) {
                this.achieved.add(ach.id);
                this.money += ach.reward;
                this.showToast(ach);
                this.addLog(`🏆 업적 달성: ${ach.title} (+${ach.reward}억)`, 'good');
            }
        });
    }

    showToast(ach) {
        const t = this.ui.toast;
        t.querySelector('h4').innerText = ach.title;
        t.querySelector('p').innerText = ach.desc;
        t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 3000);
    }

    // ----------------------------------------------------
    // [Utils] 툴팁, HUD, 로그
    // ----------------------------------------------------
    showTooltip(e, b) {
        if(!b) return;
        let html = `<h4>${b.icon} ${b.name}</h4>`;
        
        if(b.type === 'legacy') html += `<div style="color:#ff7675">⚠️ 철거비용: 💰${b.demolishCost}</div>`;
        else if(b.id !== 'forest') html += `<div>수익 ${b.rev} | 유지 ${b.exp}</div>`;
        
        if(b.emit !== 0) html += `<div>탄소: ${b.emit > 0 ? `<span class="stat-neg">+${b.emit}t</span>` : `<span class="stat-pos">${b.emit}t</span>`}</div>`;
        if(b.power !== 0) html += `<div>전력: ${b.power > 0 ? `<span class="stat-pos">+${b.power}</span>` : `<span class="stat-neg">${b.power}</span>`}</div>`;
        
        // 시너지 설명 (툴팁 강화)
        if(b.id === 'data_center') html += `<div class="synergy">Tip: 스마트그리드 연구 시 효율↑</div>`;
        
        this.ui.tooltip.innerHTML = html;
        this.ui.tooltip.classList.remove('hidden');
        this.moveTooltip(e);
    }
    moveTooltip(e) { this.ui.tooltip.style.left = (e.pageX+15)+'px'; this.ui.tooltip.style.top = (e.pageY+15)+'px'; }
    hideTooltip() { this.ui.tooltip.classList.add('hidden'); }

    updateHUD() {
        this.ui.money.innerText = this.money;
        this.ui.year.innerText = this.year;
        
        let e=0, p=0;
        this.mapData.forEach((b, i) => { 
            if(b && b.rootIdx === i) { e+=b.emit; p+=b.power; } 
        });
        
        this.ui.emit.innerText = `${e}t`;
        this.ui.infra.innerText = p;
        this.ui.infra.style.color = p<0 ? '#ff7675' : '#55efc4';
        this.ui.rep.innerText = this.rep;
    }

    addLog(msg, type='normal') {
        const d = document.createElement('div');
        d.className = `log-item ${type}`;
        d.innerHTML = `<span>Y${this.year}</span> ${msg}`;
        this.ui.logList.prepend(d);
    }
    
    showMessage(t) { 
        this.ui.msg.innerText = t; 
        this.ui.msg.style.animation = 'none';
        this.ui.msg.offsetHeight; 
        this.ui.msg.style.animation = 'pulse 0.5s';
    }
}

// 게임 실행
new TycoonGame();
