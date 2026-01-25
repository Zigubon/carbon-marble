// 점수 계산 로직
function calculateTotal() {
    // 1. 도시 개요 데이터 가져오기
    const totalArea = parseFloat(document.getElementById('totalArea').value) || 0;
    const population = parseFloat(document.getElementById('population').value) || 0;

    // 예외 처리: 기본 데이터가 없으면 경고
    if (totalArea === 0 || population === 0) {
        alert("도시 전체 면적과 인구를 입력해주세요. 정규화 계산에 필요합니다.");
        return;
    }

    let totalScore = 0;

    // --- 지표별 계산 로직 ---

    [cite_start]// [지표 1] 도시 내 자연지역 비율 [cite: 402]
    // 공식: (자연지역 면적 / 도시 전체 면적) * 100
    const ind1_val = parseFloat(document.getElementById('ind1_val').value) || 0;
    const ind1_ratio = (ind1_val / totalArea) * 100;
    let ind1_score = 0;

    if (ind1_ratio > 20.0) ind1_score = 4;
    else if (ind1_ratio >= 14.0) ind1_score = 3;
    else if (ind1_ratio >= 7.0) ind1_score = 2;
    else if (ind1_ratio >= 1.0) ind1_score = 1;
    else ind1_score = 0;

    updateScoreUI('ind1_score', ind1_score);
    totalScore += ind1_score;


    [cite_start]// [지표 12] 1인당 여가 서비스 면적 [cite: 670]
    // 공식: (공원 면적) / (인구/1000) -> ha per 1000 persons
    const ind12_val = parseFloat(document.getElementById('ind12_val').value) || 0;
    const ind12_ratio = ind12_val / (population / 1000);
    let ind12_score = 0;

    if (ind12_ratio > 0.9) ind12_score = 4;
    else if (ind12_ratio >= 0.7) ind12_score = 3;
    else if (ind12_ratio >= 0.4) ind12_score = 2;
    else if (ind12_ratio >= 0.1) ind12_score = 1;
    else ind12_score = 0;

    updateScoreUI('ind12_score', ind12_score);
    totalScore += ind12_score;


    [cite_start]// [지표 17] 전략 수립 여부 (선택형) [cite: 778]
    const ind17_score = parseInt(document.getElementById('ind17_val').value) || 0;
    updateScoreUI('ind17_score', ind17_score);
    totalScore += ind17_score;


    // --- 최종 결과 표시 ---
    const resultArea = document.getElementById('result-area');
    const totalScoreSpan = document.getElementById('total-score');
    
    resultArea.style.display = 'block';
    totalScoreSpan.innerText = totalScore;
    
    // 스크롤 이동
    resultArea.scrollIntoView({behavior: "smooth"});
}

// UI 업데이트 헬퍼 함수
function updateScoreUI(elementId, score) {
    document.getElementById(elementId).innerText = score + "점";
    document.getElementById(elementId).style.color = score >= 3 ? "#2E7D32" : "#d32f2f";
}