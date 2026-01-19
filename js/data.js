// [DATA] 게임 밸런스 데이터 (Ver 0.2)

export const GAME_CONFIG = {
    START_MONEY: 350,   // 시작 자금 상향 (200 -> 350)
    START_REP: 1,       // 평판 1로 시작
    MAX_WEEKS: 12,      
    TAX_RATE_BASE: 1,   // 초기 탄소세 완화 (2 -> 1) : 이제 1톤당 1억
};

// 건물 목록
export const BUILDINGS = [
    // 0. 기본 건물 (건설 불가, 시작 시 지급)
    { id: 'town_hall', name: '시청', icon: '🏛️', type: 'infra', cost: 0, rev: 20, exp: 0, emit: 0, power: 5, desc: '행정 중심지' },

    // 1. 생산 (돈 벌지만 배출 많음) - *버프: 수익 대폭 상향*
    { id: 'factory_s', name: '소형 공장', icon: '🏭', type: 'prod', cost: 50, rev: 30, exp: 5, emit: 8, power: -2, desc: '초반 자금줄' },
    { id: 'logistics', name: '물류창고', icon: '🚚', type: 'prod', cost: 80, rev: 45, exp: 10, emit: 12, power: -3, desc: '안정적 수익' },
    { id: 'data_center', name: '데이터센터', icon: '💻', type: 'prod', cost: 150, rev: 80, exp: 20, emit: 15, power: -8, desc: '고수익 고전력' },

    // 2. 에너지 (전력 공급) - *버프: 석탄 효율 증가, 풍력 가격 인하*
    { id: 'coal_plant', name: '석탄발전', icon: '🔥', type: 'energy', cost: 60, rev: 10, exp: 5, emit: 20, power: 15, desc: '싸고 전력 많음' },
    { id: 'solar_farm', name: '태양광단지', icon: '☀️', type: 'energy', cost: 100, rev: 5, exp: 2, emit: 0, power: 6, desc: '유지비 저렴' },
    { id: 'wind_turbine', name: '풍력발전기', icon: '🌀', type: 'energy', cost: 130, rev: 10, exp: 5, emit: 0, power: 12, desc: '고효율 청정' }, // 가격 150->130

    // 3. 인프라 (평판)
    { id: 'park', name: '도시공원', icon: '🌳', type: 'infra', cost: 30, rev: 0, exp: 2, emit: -3, power: 0, desc: '소량 흡수' },
    { id: 'school', name: '직업학교', icon: '🏫', type: 'infra', cost: 100, rev: 0, exp: 10, emit: 0, power: -2, desc: '평판 대폭↑' },

    // 4. 감축/전환
    { id: 'recycle', name: '재활용센터', icon: '♻️', type: 'green', cost: 90, rev: 10, exp: 10, emit: -15, power: -3, desc: '배출량 감소' },
];

export const EVENTS = [
    { name: '폭염 주의보', msg: '냉방 가동으로 유지비가 증가합니다.', effect: (state) => { state.weekExp += 15; return '유지비 +15'; } },
    { name: '친환경 보조금', msg: '정부에서 녹색 성장을 지원합니다.', effect: (state) => { state.money += 50; return '자금 +50'; } },
    { name: '그린워싱 단속', msg: '규제 당국의 불시 점검!', effect: (state) => { 
        if(state.weekEmit > 30) { state.money -= 40; return '벌금 -40 (배출과다)'; } // 기준 완화 (20->30)
        else { state.rep += 1; return '점검 통과 (평판+1)'; }
    }},
    { name: '맑은 날씨', msg: '평온한 한 주였습니다.', effect: () => '특이사항 없음' }
];
