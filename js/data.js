/**
 * [2026-01-23] 게임 데이터 및 설정 파일
 * 설명: 밸런스 조정, 아이템 정의, 업적 데이터 포함
 */

export const CONFIG = {
    GAME_SPEED_START: 6, // 초기 스크롤 속도
    GAME_SPEED_MAX: 15, // 최대 속도
    GRAVITY: 0.6, // 중력
    JUMP_FORCE: -12, // 점프력
    DOUBLE_JUMP_FORCE: -10, // 2단 점프력
    CO2_MAX: 100, // CO2 최대치 (게임오버 기준)
    CO2_PASSIVE_INCREASE: 0.05, // 프레임당 자연 증가량
    SPAWN_RATE_OBSTACLE: 120, // 프레임 단위 장애물 생성 주기 (가변적)
    SPAWN_RATE_ITEM: 80, // 아이템 생성 주기
};

export const OBSTACLES = [
    { type: 'SMOG', name: '스모그', width: 50, height: 50, damage: 15, yPos: 'air', color: '#7f8c8d' }, // 공중
    { type: 'TRASH', name: '플라스틱 쓰레기', width: 40, height: 40, damage: 10, yPos: 'ground', color: '#95a5a6' }, // 바닥
    { type: 'FACTORY', name: '매연 공장', width: 60, height: 80, damage: 20, yPos: 'ground', color: '#2c3e50' } // 큰 바닥
];

export const ITEMS = [
    { type: 'SEED', name: '나무 묘목', score: 100, co2Reduction: 5, color: '#2ecc71', width: 30, height: 30 },
    { type: 'SOLAR', name: '태양광 패널', score: 300, co2Reduction: 10, color: '#f1c40f', width: 35, height: 35 },
    { type: 'COIN', name: '에코 코인', currency: 10, color: '#3498db', width: 25, height: 25 }
];

// 상점 업그레이드 데이터
export const UPGRADES = [
    { 
        id: 'shoes', 
        name: '탄소 섬유 운동화', 
        desc: '이동 속도가 빨라지고 점수 획득량 10% 증가', 
        baseCost: 100, 
        level: 0, 
        maxLevel: 5 
    },
    { 
        id: 'filter', 
        name: '고성능 마스크', 
        desc: '장애물 충돌 시 CO2 증가량 10% 감소', 
        baseCost: 150, 
        level: 0, 
        maxLevel: 5 
    },
    { 
        id: 'tech', 
        name: '탄소 포집 기술', 
        desc: '시간당 CO2 자연 증가 속도 감소', 
        baseCost: 300, 
        level: 0, 
        maxLevel: 3 
    }
];

// 로깅 헬퍼 (사용자 요청 반영)
export const Logger = {
    info: (msg, data = '') => console.log(`%c[INFO] ${msg}`, 'color: #2ecc71; font-weight: bold;', data),
    warn: (msg, data = '') => console.warn(`%c[WARN] ${msg}`, 'color: #f39c12;', data),
    error: (msg, data = '') => console.error(`%c[ERROR] ${msg}`, 'color: #e74c3c; font-weight: bold;', data)
};
