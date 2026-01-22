import { GAME_CONFIG, BUILDINGS, EVENTS, RESEARCH, LEADERS } from './data.js';

class TycoonGame {
    constructor() {
        // --- 게임 상태 데이터 ---
        this.year = 1;
        this.money = GAME_CONFIG.START_MONEY;
        this.rep = GAME_CONFIG.START_REP;
        
        // 10x10 그리드 (총 100칸)
        this.gridSize = 100; 
        this.mapData = Array(this.gridSize).fill(null); 
        
        this.taxRate = GAME_CONFIG.TAX_RATE_BASE;
        this.leader = null;          // 선택된 시장(리더)
        this.selectedBuildingId = null; // 건설 모드에서 선택한 건물 ID
        this.researched = [];        // 완료된 연구 ID 목록

        // --- DOM 요소 캐싱 (성능 최적화) ---
        this.ui = {
            // 메인 화면
            grid: document.getElementById('city-grid'),
            money: document.getElementById('ui-money'),
            emit: document.getElementById('ui-emit'),
            rep: document.getElementById('ui-rep'),
            infra: document.getElementById('ui-infra'),
            year: document.getElementById('ui-year'),
            msg: document.getElementById('ui-message'),
            tooltip: document.getElementById('tooltip'),
            
            // 사이드바 패널
            buildList: document.getElementById('building-list'),
            researchList: document.getElementById('research-list'),
            logList: document.getElementById('log-list'),
            cancelBtn: document.getElementById('btn-cancel-select'),
            
            // 인트로 및 모달
            introScreen: document.getElementById('intro-screen'),
            leaderList: document.getElementById('intro-leader-list'),
            startBtn: document.getElementById('btn-start-game'),
            
            // 룰렛 및 리포트
            rouletteModal: document.getElementById('roulette-modal'),
            rouletteDisplay: document.getElementById('roulette-display'),
            rouletteResult: document.getElementById('roulette-result'),
            rouletteDesc: document.getElementById('roulette-desc'),
            
            reportModal: document.getElementById('report-modal'),
            reportDetails: document.getElementById('report-details'),
            
            gameoverModal: document.getElementById('gameover-modal'),
            finalScore: document.getElementById('final-score')
        };
        
        this.init();
    }

    // === 1. 초기화 및 시작 ===
    init() {
        this.renderLeaderSelection();
        
        // 시작 버튼 이벤트 연결
        this.ui.startBtn.onclick = () => this.startGame();
        
        // 전역 스코프에 게임 인스턴스 등록 (HTML onclick 호환용)
        window.game = this;
        
        // 키보드 ESC로 건설 취소
        document.addEventListener('keydown', (e) => {
            if(e.key === 'Escape') this.cancelSelection();
        });
    }

    // 리더 선택 카드 생성
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
            
            card.onclick = () => {
                // 선택 효과
                document.querySelectorAll('.leader-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                
                // 데이터 설정
                this.leader = leader;
                this.ui.startBtn.disabled = false;
                this.ui.startBtn.innerText = `${leader.name}로 임기 시작`;
                this.ui.startBtn.style.backgroundColor = '#0984e3'; // 활성 색상
            };
            this.ui.leaderList.appendChild(card);
        });
    }

    // 게임 시작 (인트로 종료)
    startGame() {
        this.ui.introScreen.style.display = 'none';
        
        this.generateMap();     // 맵 생성
        this.renderGrid();      // 그리드 그리기
        this.updateHUD();       // 상단바 갱신
        this.filterBuild('growth'); // 건설 메뉴 초기화
        this.renderResearch();  // 연구 메뉴 초기화
        this.bindMainEvents();  // 메인 버튼 이벤트 연결
        
        this.addLog(`게임 시작! ${this.leader.name} 시장 취임.`);
        this.showMessage(`환영합니다! ${this.leader.buff} 효과가 적용됩니다.`);
    }

    // === 2. 맵 생성 로직 (오염 & 숲 배치) ===
    generateMap() {
        // 중앙(45번)에 시청 배치 (1x1)
        this.placeBuilding(45, 'town_hall');

        // 오염 유산 6개 랜덤 배치
        const legacyTypes = ['landfill', 'old_factory', 'flood_house'];
        let placedLegacies = 0;
        while(placedLegacies < 6) {
            let rndIdx = Math.floor(Math.random() * this.gridSize);
            // 빈 땅인지 확인 (1x1 공간 체크)
            if(this.checkSpace(rndIdx, 1, 1)) {
                let rndType = legacyTypes[Math.floor(Math.random() * legacyTypes.length)];
                this.placeBuilding(rndIdx, rndType);
                placedLegacies++;
            }
        }

        // 숲 5개 랜덤 배치 (밸런스 조절)
        let placedForests = 0;
        while(placedForests < 5) {
            let rndIdx = Math.floor(Math.random() * this.gridSize);
            if(this.checkSpace(rndIdx, 1, 1)) {
                this.placeBuilding(rndIdx, 'forest');
                placedForests++;
            }
        }
    }

    // 건물 데이터 맵에 등록 (멀티 타일 처리)
    placeBuilding(idx, id) {
        const b = BUILDINGS.find(x => x.id === id);
        if(b) {
            // rootIdx: 건물의 기준점 (좌상단)
            const buildingInstance = { ...b, rootIdx: idx };
            this.setOccupied(idx, b.w, b.h, buildingInstance);
        }
    }

    // 맵 공간 점유 설정
    setOccupied(idx, w, h, data) {
        for(let r=0; r<h; r++) {
            for(let c=0; c<w; c++) {
                let targetIdx = idx + (r * 10) + c;
                this.mapData[targetIdx] = data; 
            }
        }
    }

    // 공간 확인 (건설 가능 여부)
    checkSpace(idx, w, h) {
        const row = Math.floor(idx / 10);
        const col = idx % 10;
        
        // 1. 맵 밖으로 나가는지 체크
        if (col + w > 10 || row + h > 10) return false;

        // 2. 이미 건물이 있는지 체크
        for(let r=0; r<h; r++) {
            for(let c=0; c<w; c++) {
                let targetIdx = idx + (r * 10) + c;
                // 빈 땅(null)이 아니면 건설 불가
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

    // === 3. 그리드 렌더링 ===
    renderGrid() {
        this.ui.grid.innerHTML = '';
        
        // 이미 그려진(점유된) 타일 인덱스를 저장하여 중복 렌더링 방지
        const renderedIndices = new Set();

        for(let i=0; i<this.gridSize; i++) {
            // 이미 렌더링된 큰 건물의 일부라면 패스
            if(renderedIndices.has(i)) continue;

            const b = this.mapData[i];
            const tile = document.createElement('div');
            tile.className = 'tile';
            
            if(b) {
                // 건물의 기준점(Root)일 때만 그립니다.
                if(b.rootIdx === i) {
                    tile.innerHTML = `<span>${b.icon}</span>`;
                    tile.setAttribute('data-type', b.type);
                    
                    // 대형 건물 클래스 추가 (CSS용)
                    if(b.w > 1) tile.classList.add('w2');
                    if(b.h > 1) tile.classList.add('h2');
                    
                    // Grid Layout Span 적용
                    tile.style.gridColumn = `span ${b.w}`;
                    tile.style.gridRow = `span ${b.h}`;

                    // 이벤트 연결
                    tile.onmouseenter = (e) => this.showTooltip(e, b);
                    tile.onmousemove = (e) => this.moveTooltip(e);
                    tile.onmouseleave = () => this.hideTooltip();
                    tile.onclick = () => this.handleTileClick(i); 
                    // 우클릭 시 건설 취소
                    tile.oncontextmenu = (e) => { e.preventDefault(); this.cancelSelection(); };

                    this.ui.grid.appendChild(tile);

                    // 이 건물이 차지하는 모든 인덱스를 방문 처리
                    for(let r=0; r<b.h; r++) {
                        for(let c=0; c<b.w; c++) {
                            renderedIndices.add(i + (r*10) + c);
                        }
                    }
                }
            } else {
                // 빈 땅
                tile.className = 'tile empty';
                tile.onclick = () => this.handleTileClick(i);
                tile.oncontextmenu = (e) => { e.preventDefault(); this.cancelSelection(); };
                this.ui.grid.appendChild(tile);
            }
        }
    }

    // === 4. 인터랙션 (클릭 & 툴팁) ===
    
    // 타일 클릭 핸들러 (핵심!)
    handleTileClick(idx) {
        const currentB = this.mapData[idx];

        // [A] 건설 모드 (건물을 선택한 상태)
        if (this.selectedBuildingId) {
            // 1. 기존 건물 체크
            if(currentB) {
                if(currentB.id === 'town_hall') { this.showMessage("❌ 시청은 철거할 수 없습니다."); return; }
                if(currentB.type === 'legacy') { this.showMessage("⚠️ 오염 유산은 먼저 클릭해서 철거하세요."); return; }
                // 숲이나 일반 건물 위에 지으려면? -> "철거 먼저 하세요" 유도 (안전함)
                this.showMessage("❌ 빈 땅에만 건설할 수 있습니다. (기존 건물 철거 필요)");
                return;
            }
            
            const template = BUILDINGS.find(b => b.id === this.selectedBuildingId);
            
            // 2. 공간 체크 (대형 건물이 맵 밖으로 나가거나 겹치는지)
            if(!this.checkSpace(idx, template.w, template.h)) {
                this.showMessage("❌ 공간이 부족합니다! (건물이 겹치거나 맵 밖입니다)");
                return;
            }

            // 3. 비용 체크 (리더 할인 적용)
            let cost = template.cost;
            if(this.leader.id === 'energy_expert' && template.type === 'energy') {
                cost = Math.floor(cost * 0.8);
            }

            if(this.money < cost) { 
                this.showMessage("💸 자금이 부족합니다!"); 
                return; 
            }
            
            // 4. 건설 실행
            this.build(idx, template, cost);
            return;
        }

        // [B] 일반 모드 (정보 확인 및 철거)
        if (currentB) {
            if(currentB.id === 'town_hall') {
                this.showMessage("🏛️ 시청: 우리 도시의 중심입니다.");
                return;
            }

            // 철거 비용 계산 (유산은 비쌈, 일반은 10억)
            const demolishCost = currentB.demolishCost || 10;
            const name = currentB.name;

            if(confirm(`[${name}] 철거하시겠습니까? (비용: ${demolishCost}억)`)) {
                if(this.money >= demolishCost) {
                    this.money -= demolishCost;
                    this.clearSpace(idx); // 공간 비우기
                    this.renderGrid();
                    this.updateHUD();
                    this.addLog(`${name} 철거완료 (-${demolishCost})`, 'bad');
                    this.showMessage("철거되었습니다.");
                } else {
                    alert("철거 자금이 부족합니다.");
                }
            }
        } else {
            // 빈 땅 클릭
            this.showMessage("우측 메뉴에서 건물을 선택하고 땅을 클릭하세요.");
        }
    }

    // 건설 실행 함수
    build(idx, template, finalCost) {
        this.money -= finalCost;
        // 맵 데이터에 인스턴스 저장
        this.setOccupied(idx, template.w, template.h, { ...template, rootIdx: idx });
        
        this.renderGrid();
        this.updateHUD();
        this.addLog(`${template.name} 건설 (-${finalCost})`);
        this.showMessage(`${template.name} 건설 완료!`);
        
        // 연속 건설을 원하면 이 줄 유지, 아니면 this.cancelSelection();
    }

    // 툴팁 표시
    showTooltip(e, b) {
        if(!b) return;
        let html = `<h4>${b.icon} ${b.name}</h4>`;
        
        if(b.type === 'legacy') {
             html += `<div style="color:#ff7675">⚠️ 오염 유산</div>`;
             html += `<div>철거비용: 💰${b.demolishCost}</div>`;
        } else if(b.id !== 'forest') {
             html += `<div>수익: +${b.rev} | 유지: -${b.exp}</div>`;
        }
        
        if(b.emit !== 0) html += `<div>탄소: ${b.emit > 0 ? `<span class="stat-neg">+${b.emit}t</span>` : `<span class="stat-pos">${b.emit}t</span>`}</div>`;
        if(b.power !== 0) html += `<div>전력: ${b.power > 0 ? `<span class="stat-pos">+${b.power}</span>` : `<span class="stat-neg">${b.power}</span>`}</div>`;
        
        this.ui.tooltip.innerHTML = html;
        this.ui.tooltip.classList.remove('hidden');
        this.moveTooltip(e);
    }
    
    moveTooltip(e) {
        // 마우스 포인터 옆에 표시 (화면 밖으로 안 나가게 살짝 조정하면 좋음)
        this.ui.tooltip.style.left = (e.pageX + 20) + 'px';
        this.ui.tooltip.style.top = (e.pageY + 20) + 'px';
    }
    
    hideTooltip() { this.ui.tooltip.classList.add('hidden'); }


    // === 5. UI 및 패널 관리 ===
    
    // 탭 전환
    switchMainTab(tab) {
        ['panel-build', 'panel-research', 'panel-log'].forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });
        document.getElementById(`panel-${tab}`).classList.remove('hidden');
        
        // 버튼 활성화 스타일
        document.querySelectorAll('.main-tab-btn').forEach(btn => btn.classList.remove('active'));
        if(event) event.target.classList.add('active');
    }

    // 건설 목록 렌더링
    filterBuild(type) {
        // 서브 탭 스타일
        document.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        this.ui.buildList.innerHTML = '';
        // 건설 가능한 건물만 필터링 (유산, 시청, 숲 제외)
        const buildable = BUILDINGS.filter(b => !['legacy', 'forest', 'infra'].includes(b.type) || (b.type==='infra' && b.id !=='town_hall'));
        
        // 타입별 필터링
        const filtered = buildable.filter(b => b.type === type);

        filtered.forEach(b => {
            const item = document.createElement('div');
            item.className = 'build-item';
            
            // 연구 해금 여부
            let locked = b.reqTech && !this.researched.includes(b.reqTech);
            
            // 선택 여부
            if(this.selectedBuildingId === b.id) item.classList.add('selected');
            
            // 비용 계산 (리더 할인)
            let cost = b.cost;
            if(this.leader && this.leader.id === 'energy_expert' && b.type === 'energy') {
                cost = Math.floor(cost * 0.8);
            }
            
            if(this.money < cost || locked) item.classList.add('disabled');

            let sizeBadge = (b.w > 1 || b.h > 1) ? `<span style="font-size:0.7em; border:1px solid #aaa; padding:0 3px; border-radius:4px;">${b.w}x${b.h}</span>` : '';
            let lockIcon = locked ? '🔒' : '';

            // 정보 HTML 구성
            let infoHtml = '';
            if(locked) {
                const reqName = RESEARCH.find(r=>r.id===b.reqTech).name;
                infoHtml = `<div class="bi-desc" style="color:#e74c3c">필요: ${reqName}</div>`;
            } else {
                let costColor = cost < b.cost ? '#2ecc71' : '#e67e22'; // 할인 시 초록색
                let powerTxt = b.power !== 0 ? (b.power > 0 ? `⚡+${b.power}` : `⚡${b.power}`) : '';
                let emitTxt = b.emit !== 0 ? (b.emit > 0 ? `♨️${b.emit}` : `🌱${Math.abs(b.emit)}`) : '';
                
                infoHtml = `
                    <div class="bi-cost" style="color:${costColor}">💰 ${cost}</div>
                    <div class="bi-desc">수익${b.rev} ${emitTxt} ${powerTxt}</div>
                `;
            }

            item.innerHTML = `
                <div class="bi-icon">${b.icon}</div>
                <div class="bi-info">
                    <div class="bi-name">${b.name} ${sizeBadge} ${lockIcon}</div>
                    ${infoHtml}
                </div>
            `;
            
            item.onclick = () => {
                if(locked) { this.showMessage("🔒 연구가 필요합니다."); return; }
                if(this.money < cost) { this.showMessage("💸 자금이 부족합니다."); return; }
                this.selectBuilding(b.id);
            };
            this.ui.buildList.appendChild(item);
        });
    }

    selectBuilding(id) {
        this.selectedBuildingId = id;
        this.ui.cancelBtn.classList.remove('hidden');
        this.showMessage(`선택됨: ${BUILDINGS.find(b=>b.id===id).name}`);
        // 탭 UI 갱신 (선택 표시 위해)
        const b = BUILDINGS.find(x=>x.id===id);
        this.filterBuild(b.type);
    }

    cancelSelection() {
        this.selectedBuildingId = null;
        this.ui.cancelBtn.classList.add('hidden');
        this.showMessage("선택이 취소되었습니다.");
        // UI 갱신
        const activeTab = document.querySelector('.sub-tab-btn.active');
        if(activeTab) this.filterBuild(activeTab.dataset.type);
    }

    // 연구 목록 렌더링
    renderResearch() {
        this.ui.researchList.innerHTML = '';
        RESEARCH.forEach(r => {
            const item = document.createElement('div');
            item.className = 'research-item';
            
            const isDone = this.researched.includes(r.id);
            const locked = r.req && !this.researched.includes(r.req); // 선행 연구 미완료 시 잠김
            
            if(isDone) item.classList.add('done');
            else if(locked || this.money < r.cost) item.classList.add('disabled');

            let status = isDone ? '✅ 개발완료' : (locked ? '🔒 잠김' : `💰 ${r.cost}`);

            item.innerHTML = `
                <div class="bi-icon">${r.icon}</div>
                <div class="bi-info">
                    <div class="bi-name">${r.name}</div>
                    <div class="bi-cost">${status}</div>
                    <div class="bi-desc">${r.desc}</div>
                    ${locked ? `<div class="bi-desc" style="color:red">선행: ${RESEARCH.find(x=>x.id===r.req).name}</div>` : ''}
                </div>
            `;
            
            item.onclick = () => {
                if(isDone) return;
                if(locked) { alert("선행 연구가 필요합니다."); return; }
                if(this.money < r.cost) { alert("연구 자금이 부족합니다."); return; }
                
                if(confirm(`${r.name} 연구를 시작하시겠습니까? (비용 ${r.cost})`)) {
                    this.money -= r.cost;
                    this.researched.push(r.id);
                    this.addLog(`🔬 연구 완료: ${r.name}`, 'good');
                    this.updateHUD();
                    this.renderResearch();
                    
                    // 건설 목록도 갱신 (해금된 건물 표시)
                    const activeTab = document.querySelector('.sub-tab-btn.active');
                    if(activeTab && !document.getElementById('panel-build').classList.contains('hidden')) {
                        this.filterBuild(activeTab.dataset.type);
                    }
                }
            };
            this.ui.researchList.appendChild(item);
        });
    }

    // === 6. 연말 정산 및 로직 ===
    
    // 다음 해로 진행 (버튼 클릭)
    nextYear() {
        if(this.year > GAME_CONFIG.MAX_YEARS) return;
        
        // 1. 룰렛 모달 열기
        this.ui.rouletteModal.classList.remove('hidden');
        this.ui.rouletteDisplay.classList.remove('hidden');
        this.ui.rouletteResult.classList.add('hidden');
        
        // 2. 룰렛 애니메이션
        let count = 0;
        const interval = setInterval(() => {
            const rndEvt = EVENTS[Math.floor(Math.random() * EVENTS.length)];
            this.ui.rouletteDisplay.innerText = `🎲 ${rndEvt.name}...`;
            count++;
            if(count > 15) { // 1.5초 후 멈춤
                clearInterval(interval);
                const finalEvt = EVENTS[Math.floor(Math.random() * EVENTS.length)];
                this.calculateYear(finalEvt);
            }
        }, 80);
    }

    // 실제 정산 계산
    calculateYear(evt) {
        let totalRev = 0, totalExp = 0, baseEmit = 0, totalPower = 0;
        
        // 중복 계산 방지를 위해 rootIdx 기준 순회
        const calculatedBuildings = new Set();

        this.mapData.forEach((b, i) => {
            if(b && b.rootIdx === i) {
                // 리더 버프: 경제 전문가는 수익 15% 증가
                let rev = b.rev;
                if(this.leader.id === 'economy_expert') rev = Math.floor(rev * 1.15);
                
                totalRev += rev;
                totalExp += b.exp;
                baseEmit += b.emit;
                totalPower += b.power;
            }
        });

        // [스모그 효과] 인접 오염원 패널티
        // 그리드를 순회하며 배출 건물이 붙어있는지 확인
        let smogPenalty = 0;
        for(let i=0; i<this.gridSize; i++) {
            const b = this.mapData[i];
            // 건물이 있고 배출원(>0)이며, 해당 건물의 본체(root)일 때만 체크 (중복방지)
            if(b && b.emit > 0 && b.rootIdx === i) {
                const neighbors = [i-1, i+1, i-10, i+10];
                neighbors.forEach(nIdx => {
                    // 맵 경계 체크
                    if(i%10 === 0 && nIdx === i-1) return; // 왼쪽 경계
                    if(i%10 === 9 && nIdx === i+1) return; // 오른쪽 경계
                    
                    if(nIdx >= 0 && nIdx < 100) {
                        const neighborB = this.mapData[nIdx];
                        // 이웃이 있고, 배출원이며, 나와 다른 건물일 때
                        if(neighborB && neighborB.emit > 0 && neighborB.rootIdx !== i) {
                            smogPenalty += 2; // 패널티 +2t
                        }
                    }
                });
            }
        }
        let totalEmit = baseEmit + smogPenalty;

        // [전력 패널티]
        if(totalPower < 0) {
            const pCost = Math.abs(totalPower) * 5; // 부족분 당 5억
            totalExp += pCost;
            this.addLog(`⚡ 전력 부족! 비상 발전 비용 -${pCost}`, 'bad');
        }

        // [탄소세]
        const netEmit = Math.max(0, totalEmit);
        let tax = Math.floor(netEmit * this.taxRate);
        // 리더 버프: 기후 전문가는 탄소세 50% 감면
        if(this.leader.id === 'climate_expert') tax = Math.floor(tax * 0.5);

        // [이벤트 적용]
        let tempState = { money: this.money, rep: this.rep, res: 0, weekEmit: netEmit, weekPower: totalPower };
        const evtResult = evt.effect(tempState); // 이벤트 효과 실행
        this.money = tempState.money; // 이벤트로 인한 즉시 현금 변동 반영 (복구비 등)

        // [최종 순이익]
        const netProfit = totalRev - totalExp - tax;
        this.money += netProfit;

        // 룰렛 화면에 결과 표시
        this.ui.rouletteDisplay.classList.add('hidden');
        this.ui.rouletteResult.classList.remove('hidden');
        this.ui.rouletteDesc.innerHTML = `
            <h3 style="color:#00cec9">${evt.name}</h3>
            <p>${evtResult}</p>
            <hr style="border-color:#555; margin:10px 0;">
            <p>매출: +${totalRev} / 유지비: -${totalExp}</p>
            <p>탄소세: -${tax} (배출 ${netEmit}t)</p>
            ${smogPenalty > 0 ? `<p style="color:#e74c3c; font-size:0.8rem">⚠️ 스모그 패널티: +${smogPenalty}t</p>` : ''}
            <h2 style="color:${netProfit>=0?'#2ecc71':'#e74c3c'}">순이익: ${netProfit}억</h2>
        `;
        
        // 로그 기록
        this.addLog(`${evt.name} 발생. 순이익 ${netProfit}`);
    }

    // 연말 정산 종료 및 다음 해 준비
    finishYear() {
        this.ui.rouletteModal.classList.add('hidden');

        // 파산 체크
        if(this.money < 0) {
            this.ui.finalScore.innerText = `${this.year}년차 파산 (최종 자금 ${this.money}억)`;
            this.ui.gameoverModal.classList.remove('hidden');
            return;
        }

        this.year++;
        
        // 엔딩 체크
        if(this.year > GAME_CONFIG.MAX_YEARS) {
            alert(`🎉 축하합니다! 15년 임기를 성공적으로 마쳤습니다.\n최종 자금: ${this.money}억`);
            location.reload();
            return;
        }

        // 탄소세 인상 (5년 주기)
        if(this.year % 5 === 1) {
            this.taxRate += 1;
            this.addLog(`📢 환경 정책 강화: 탄소세율 인상 (x${this.taxRate})`, 'bad');
            this.showMessage("탄소세율이 인상되었습니다!");
        }

        this.updateHUD();
        this.addLog(`📅 ${this.year}년이 시작되었습니다.`);
    }

    // === 7. 유틸리티 ===
    
    updateHUD() {
        // 값 업데이트
        this.ui.money.innerText = this.money;
        this.ui.year.innerText = this.year;
        
        // 전체 통계 재계산
        let e = 0, p = 0, r = GAME_CONFIG.START_REP;
        // rootIdx 기준 중복 없이 합산
        const counted = new Set();
        this.mapData.forEach((b, i) => {
            if(b && b.rootIdx === i) {
                e += b.emit;
                p += b.power;
                // 평판 건물(infra) 등에서 rep 속성이 있다면 추가 가능 (현재 데이터엔 없음, 로직상 준비)
                // if(b.rep) r += b.rep; 
            }
        });

        this.ui.emit.innerText = `${e}t`;
        this.ui.infra.innerText = p; // 숫자만
        // 전력 색상
        this.ui.infra.style.color = p < 0 ? '#ff7675' : '#55efc4';
        
        this.ui.rep.innerText = r;
    }

    addLog(msg, type='normal') {
        const div = document.createElement('div');
        div.className = `log-item ${type}`;
        div.innerHTML = `<span>Y${this.year}</span> ${msg}`;
        this.ui.logList.prepend(div);
    }

    showMessage(text) {
        this.ui.msg.innerText = text;
        // 깜빡 애니메이션 리셋
        this.ui.msg.style.animation = 'none';
        this.ui.msg.offsetHeight; /* trigger reflow */
        this.ui.msg.style.animation = 'pulse 0.5s';
    }

    bindMainEvents() {
        document.getElementById('btn-next-week').onclick = () => this.nextYear();
    }
}

// 게임 실행
new TycoonGame();
