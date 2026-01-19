// [DATA] 게임 밸런스 데이터

export const GAME_CONFIG = {
    START_MONEY: 200,   // 시작 자금
    START_REP: 0,       // 시작 평판
    MAX_WEEKS: 12,      // 12주 시나리오
    TAX_RATE_BASE: 2,   // 초기 탄소세 (톤당 2원)
};

// 건물 목록
// type: 'prod'(생산), 'energy'(에너지), 'infra'(인프라), 'green'(감축)
// cost: 건설비, rev: 주간수익, exp: 주간유지비, emit: 주간배출, power: 전력생성(+) 또는 소모(-)
export const BUILDINGS = [
    // 1. 생산 (돈 벌지만 배출 많음)
    { id: 'factory_s', name: '소형 공장', icon: '🏭', type: 'prod', cost: 50, rev: 15, exp: 5, emit: 10, power: -2, desc: '수익↑ 배출↑' },
    { id: 'data_center', name: '데이터센터', icon: '💻', type: 'prod', cost: 100, rev: 40, exp: 15, emit: 20, power: -5, desc: '고수익 고배출' },
    { id: 'logistics', name: '물류창고', icon: '🚚', type: 'prod', cost: 70, rev: 25, exp: 8, emit: 12, power: -3, desc: '안정적 수익' },

    // 2. 에너지 (전력 공급, 배출 차이)
    { id: 'coal_plant', name: '석탄발전', icon: '🔥', type: 'energy', cost: 60, rev: 5, exp: 5, emit: 25, power: 10, desc: '싸지만 매우 더러움' },
    { id: 'solar_farm', name: '태양광단지', icon: '☀️', type: 'energy', cost: 120, rev: 5, exp: 2, emit: 0, power: 5, desc: '비싸지만 청정' },
    { id: 'wind_turbine', name: '풍력발전기', icon: '🌀', type: 'energy', cost: 150, rev: 8, exp: 3, emit: 0, power: 8, desc: '고효율 청정' },

    // 3. 인프라 (평판 상승, 유지비 발생)
    { id: 'park', name: '도시공원', icon: '🌳', type: 'infra', cost: 30, rev: 0, exp: 2, emit: -2, power: 0, desc: '평판↑ 소량흡수' },
    { id: 'school', name: '직업학교', icon: '🏫', type: 'infra', cost: 80, rev: 0, exp: 10, emit: 2, power: -2, desc: '평판 대폭↑' },

    // 4. 감축/전환 (기존 배출 상쇄)
    { id: 'recycle', name: '재활용센터', icon: '♻️', type: 'green', cost: 90, rev: 5, exp: 10, emit: -10, power: -2, desc: '배출량 감소' },
];

// 랜덤 이벤트 (주간 정산 시 발생)
export const EVENTS = [
    { name: '폭염 주의보', msg: '냉방 가동으로 유지비가 증가합니다.', effect: (state) => { state.weekExp += 10; return '유지비 +10'; } },
    { name: '친환경 보조금', msg: '정부에서 녹색 성장을 지원합니다.', effect: (state) => { state.money += 30; return '자금 +30'; } },
    { name: '그린워싱 단속', msg: '규제 당국의 불시 점검!', effect: (state) => { 
        if(state.weekEmit > 20) { state.money -= 50; return '벌금 -50 (배출과다)'; }
        else { state.rep += 1; return '점검 통과 (평판+1)'; }
    }},
    { name: '맑은 날씨', msg: '평온한 한 주였습니다.', effect: () => '특이사항 없음' }
];
