// [DATA] 게임 밸런스 데이터 (Final)

export const GAME_CONFIG = {
    START_MONEY: 500,   // 초기 자금 (난이도 완화)
    START_REP: 10,      // 초기 만족도
    MAX_YEARS: 15,      // 15년 엔딩
    TAX_RATE_BASE: 1,   // 탄소세율 (톤당 1억)
};

// 1. 리더 (직업) 데이터
export const LEADERS = [
    { 
        id: 'energy_expert', 
        name: '에너지 전문가', 
        icon: '⚡', 
        desc: '전력망 효율화의 대가',
        buff: '에너지 건물 건설비 20% 할인'
    },
    { 
        id: 'climate_expert', 
        name: '기후 전문가', 
        icon: '🌱', 
        desc: '탄소 배출 규제 완화',
        buff: '매년 탄소세 50% 감면'
    },
    { 
        id: 'economy_expert', 
        name: '경제 전문가', 
        icon: '💰', 
        desc: '공격적인 투자 유치',
        buff: '모든 건물 수익 15% 증가'
    }
];

// 2. 연구 데이터 (기술 트리)
export const RESEARCH = [
    { id: 'smart_grid', name: '스마트 그리드', cost: 200, icon: '📡', desc: '대형 데이터센터 및 ESS 해금' },
    { id: 'circular_tech', name: '순환 경제', cost: 150, icon: '♻️', desc: '고효율 자원순환 시설 해금' },
    { id: 'green_infra', name: '녹색 인프라', cost: 100, icon: '🌳', desc: '스마트시티 및 대형 공원 해금' },
    { id: 'adv_energy', name: '차세대 에너지', cost: 300, icon: '⚛️', desc: 'SMR(소형원전) 건설 허가', req: 'smart_grid' }
];

// 3. 건물 목록 (w:가로, h:세로)
export const BUILDINGS = [
    // [0] 기본 및 오염 유산 (건설 메뉴 X)
    { id: 'forest', name: '숲', icon: '🌲', type: 'forest', cost: 0, rev: 0, exp: 0, emit: -2, power: 0, w:1, h:1, desc: '자연 정화' },
    { id: 'town_hall', name: '시청', icon: '🏛️', type: 'infra', cost: 0, rev: 15, exp: 0, emit: 0, power: 5, w:1, h:1, desc: '도시의 심장' },
    { id: 'landfill', name: '매립지', icon: '🗑️', type: 'legacy', cost: 0, rev: 0, exp: 5, emit: 15, power: 0, demolishCost: 50, w:1, h:1, desc: '철거비 50억' },
    { id: 'old_factory', name: '노후공장', icon: '🏭', type: 'legacy', cost: 0, rev: 10, exp: 5, emit: 20, power: -5, demolishCost: 40, w:1, h:1, desc: '철거비 40억' },
    { id: 'flood_house', name: '침수주택', icon: '🏚️', type: 'legacy', cost: 0, rev: 2, exp: 2, emit: 2, power: -1, demolishCost: 30, w:1, h:1, desc: '철거비 30억' },

    // [1] 성장 (Growth) - 돈을 버는 건물
    { id: 'shop_s', name: '소형상가', icon: '🏪', type: 'growth', cost: 40, rev: 12, exp: 3, emit: 4, power: -2, w:1, h:1, desc: '동네 상권' },
    { id: 'shop_l', name: '대형몰', icon: '🏬', type: 'growth', cost: 120, rev: 50, exp: 12, emit: 15, power: -8, w:2, h:2, desc: '2x2 대형 상권' },
    { id: 'office', name: '오피스', icon: '🏢', type: 'growth', cost: 80, rev: 25, exp: 8, emit: 8, power: -5, w:1, h:1, desc: '안정적 수익' },
    { id: 'logistics', name: '물류허브', icon: '🚛', type: 'growth', cost: 150, rev: 65, exp: 20, emit: 25, power: -10, w:1, h:1, desc: '고수익 고오염' },
    { id: 'industry_h', name: '중공업단지', icon: '🏭', type: 'growth', cost: 200, rev: 95, exp: 30, emit: 40, power: -20, w:2, h:1, desc: '2x1 오염원' },
    { id: 'data_center', name: '데이터센터', icon: '💾', type: 'growth', cost: 250, rev: 110, exp: 40, emit: 10, power: -35, w:1, h:1, desc: '전력 대량 소모', reqTech: 'smart_grid' },

    // [2] 에너지 (Energy) - 전력 생산
    { id: 'coal_plant', name: '석탄발전', icon: '🌑', type: 'energy', cost: 60, rev: 5, exp: 5, emit: 30, power: 30, w:1, h:1, desc: '싸고 강력한 오염' },
    { id: 'gas_plant', name: '가스발전', icon: '🔥', type: 'energy', cost: 80, rev: 5, exp: 10, emit: 12, power: 15, w:1, h:1, desc: '안정적 공급' },
    { id: 'solar', name: '태양광', icon: '☀️', type: 'energy', cost: 100, rev: 2, exp: 2, emit: 0, power: 10, w:1, h:1, desc: '청정 에너지' },
    { id: 'wind_farm', name: '풍력단지', icon: '🌀', type: 'energy', cost: 180, rev: 8, exp: 5, emit: 0, power: 25, w:2, h:1, desc: '2x1 고효율' },
    { id: 'ess', name: 'ESS저장소', icon: '🔋', type: 'energy', cost: 90, rev: 0, exp: 5, emit: 0, power: 5, w:1, h:1, desc: '전력망 보조', reqTech: 'smart_grid' },
    { id: 'nuclear', name: 'SMR(소형원전)', icon: '⚛️', type: 'energy', cost: 350, rev: 15, exp: 20, emit: 0, power: 50, w:1, h:1, desc: '차세대 무탄소', reqTech: 'adv_energy' },

    // [3] 순환 (Circular) - 배출 감축
    { id: 'mrf', name: '선별센터', icon: '♻️', type: 'circular', cost: 80, rev: 15, exp: 10, emit: -5, power: -3, w:1, h:1, desc: '재활용 수익' },
    { id: 'compost', name: '퇴비화시설', icon: '🍂', type: 'circular', cost: 50, rev: 8, exp: 5, emit: -8, power: -1, w:1, h:1, desc: '유기물 처리' },
    { id: 'repair', name: '수리센터', icon: '🔧', type: 'circular', cost: 60, rev: 10, exp: 5, emit: -3, power: -1, w:1, h:1, desc: '수명 연장' },
    { id: 'chem_recycle', name: '화학적재활용', icon: '⚗️', type: 'circular', cost: 150, rev: 25, exp: 15, emit: -15, power: -10, w:1, h:1, desc: '대규모 감축', reqTech: 'circular_tech' },

    // [4] 인프라 (Infra) - 만족도 및 기능
    { id: 'park', name: '도시숲', icon: '🌳', type: 'infra', cost: 40, rev: 0, exp: 3, emit: -3, power: 0, w:1, h:1, desc: '시민 휴식처' },
    { id: 'hospital', name: '종합병원', icon: '🏥', type: 'infra', cost: 150, rev: 20, exp: 20, emit: 5, power: -10, w:2, h:1, desc: '회복력 상승' },
    { id: 'transit', name: '환승센터', icon: '🚏', type: 'infra', cost: 100, rev: 10, exp: 10, emit: -5, power: -5, w:1, h:1, desc: '대중교통' },
    { id: 'smart_city', name: '스마트시티', icon: '🏙️', type: 'infra', cost: 300, rev: 50, exp: 15, emit: -10, power: -10, w:2, h:2, desc: '2x2 미래 주거', reqTech: 'green_infra' },
];

// 4. 이벤트 목록 (랜덤 발생)
export const EVENTS = [
    { name: '기록적 폭염', msg: '냉방 수요 폭증! (전력 소모 급증)', effect: (s) => { s.weekPower -= 15; return '전력 -15'; } },
    { name: '태풍 상륙', msg: '시설물 침수 피해 발생', effect: (s) => { 
        let dmg = 80; s.money -= dmg; return `복구비 -${dmg}`; 
    }},
    { name: '탄소국경세', msg: '수출 기업 탄소세 부과', effect: (s) => {
        let fine = Math.floor(s.weekEmit * 0.8); s.money -= fine; return `관세 -${fine}`;
    }},
    { name: 'ESG 경영대상', msg: '우수 도시 선정 보너스', effect: (s) => {
        let bonus = s.rep > 25 ? 100 : 0; s.money += bonus; return bonus > 0 ? `상금 +${bonus}` : '조건 미달 (평판 부족)';
    }},
    { name: '기술 혁신', msg: '발전 효율 증가', effect: (s) => { s.weekPower += 20; return '전력 +20'; } },
    { name: '평온한 한해', msg: '특별한 사건 없이 지나갔습니다.', effect: () => '특이사항 없음' }
];
