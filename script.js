// =========================================================================
// 1. DOM 요소 및 상태 변수 정의
// =========================================================================

const dateSelect = document.getElementById('date-select');
const viewAllBtn = document.getElementById('view-all-btn');
const startTestBtn = document.getElementById('start-test-btn');
const loadingStatus = document.getElementById('loading-status');

const screens = {
    main: document.getElementById('main-screen'),
    view: document.getElementById('view-screen'),
    test: document.getElementById('test-screen'),
    result: document.getElementById('result-screen')
};

// 테스트 상태 변수
let currentWords = [];
let shuffledWords = [];
let currentQuizIndex = 0;
let correctCount = 0;

// 테스트 관련 DOM 요소
const testProgress = document.getElementById('test-progress');
const currentWordDisplay = document.getElementById('current-word');
const currentMeaningDisplay = document.getElementById('current-meaning');
const showAnswerBtn = document.getElementById('show-answer-btn');
const correctBtn = document.getElementById('correct-btn');
const incorrectBtn = document.getElementById('incorrect-btn');
const endTestBtn = document.getElementById('end-test-btn');
const scoreDisplay = document.getElementById('score-display');


// =========================================================================
// 2. CSV 파싱 및 데이터 로딩 함수
// =========================================================================

/**
 * CSV 텍스트를 파싱하여 단어 객체 배열로 변환합니다.
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    
    // 첫 줄은 헤더 (word, meaning)이므로 건너_ㅂ니다.
    const dataLines = lines.slice(1);
    
    return dataLines.map(line => {
        // 쉼표(,)로 분리 (CSV의 기본 형식). 따옴표 처리 등 복잡한 CSV는 무시합니다.
        const parts = line.split(',');
        if (parts.length < 2) return null;

        const [word, meaning] = [parts[0].trim(), parts[1].trim()];

        if (word && meaning) {
            return { word, meaning };
        }
        return null;
    }).filter(item => item !== null);
}

/**
 * 지정된 날짜의 CSV 파일을 서버에서 비동기로 불러와 파싱합니다.
 */
async function fetchWords(dateKey) {
    loadingStatus.classList.remove('hidden');
    const filePath = `words/${dateKey}.csv`; 
    
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            console.error(`Error loading ${filePath}: ${response.statusText}`);
            alert(`파일을 불러오는 데 실패했습니다 (HTTP 상태 코드: ${response.status}). 웹 서버에서 실행 중인지 확인하고 파일 경로를 확인해주세요.`);
            return []; 
        }
        
        const csvText = await response.text();
        const words = parseCSV(csvText);
        return words;
    } catch (error) {
        console.error('Fetch error:', error);
        alert(`네트워크 또는 파일 접근 오류가 발생했습니다. Live Server 등 웹 서버 환경에서 실행해주세요.`);
        return [];
    } finally {
        loadingStatus.classList.add('hidden');
    }
}

// =========================================================================
// 3. 초기화 및 유틸리티 함수
// =========================================================================

/**
 * 초기 설정: 드롭다운 메뉴 채우기
 * 이 fileList는 사용자의 words 폴더에 실제로 있는 파일명과 일치해야 합니다.
 */
async function initializeApp() {
    let dates = [];
    loadingStatus.textContent = '단어장 목록 로딩 중...';
    loadingStatus.classList.remove('hidden');

    try {
        // 1. list.json 파일 불러오기
        const response = await fetch('words/list.json');
        if (!response.ok) {
            throw new Error(`list.json 로드 실패: ${response.statusText}`);
        }
        // 2. JSON 파싱. dates는 ["251028", "250607", ...] 형태를 예상
        dates = await response.json(); 
        
        // 유효성 검사 (배열인지 확인)
        if (!Array.isArray(dates)) {
            throw new Error('list.json의 형식이 올바르지 않습니다. 배열 형태여야 합니다.');
        }

    } catch (error) {
        console.error('단어장 목록 로드 오류:', error);
        alert(`단어장 목록(words/list.json)을 불러오지 못했습니다. 서버 환경과 파일 존재 여부를 확인해주세요.`);
        // 오류 발생 시 빈 배열로 진행
        dates = []; 
    } finally {
        loadingStatus.classList.add('hidden');
        loadingStatus.textContent = '데이터 로딩 중...'; // 원래 상태로 되돌림
    }
    
    // 날짜를 최신순으로 정렬 (숫자로 간주하고 정렬)
    dates.sort((a, b) => b - a); 

    dateSelect.innerHTML = ''; // 드롭다운 초기화
    if (dates.length === 0) {
        dateSelect.innerHTML = '<option disabled selected>단어장 파일 없음</option>';
    } else {
        dates.forEach(dateKey => {
            const option = document.createElement('option');
            // '251028' 형태를 '25년 10월 28일'로 변환
            const year = dateKey.substring(0, 2);
            const month = dateKey.substring(2, 4);
            const day = dateKey.substring(4, 6);
            option.value = dateKey;
            option.textContent = `${year}년 ${month}월 ${day}일`;
            dateSelect.appendChild(option);
        });
    }

    showScreen('main');
    setupEventListeners();
}

/**
 * 배열의 순서를 무작위로 섞습니다. (Fisher-Yates 셔플)
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * 화면 전환 함수
 */
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}


// =========================================================================
// 4. 이벤트 핸들러
// =========================================================================

function setupEventListeners() {
    viewAllBtn.addEventListener('click', handleViewAll);
    startTestBtn.addEventListener('click', handleStartTest);
    
    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', () => showScreen('main'));
    });

    showAnswerBtn.addEventListener('click', handleShowAnswer);
    correctBtn.addEventListener('click', () => handleQuizFeedback(true));
    incorrectBtn.addEventListener('click', () => handleQuizFeedback(false));
    endTestBtn.addEventListener('click', handleShowResult);
}


/**
 * '전체 단어 보기' 버튼 클릭 핸들러 (비동기)
 */
async function handleViewAll() {
    const selectedDate = dateSelect.value;
    const dateDisplay = dateSelect.options[dateSelect.selectedIndex].textContent;

    currentWords = await fetchWords(selectedDate);

    if (currentWords.length === 0) {
        // 이미 fetchWords에서 alert를 띄웠으므로 여기서는 리턴만 합니다.
        return;
    }
    
    document.getElementById('view-date-display').textContent = dateDisplay;
    const tbody = document.querySelector('#word-table tbody');
    tbody.innerHTML = '';

    currentWords.forEach(item => {
        const row = tbody.insertRow();
        row.insertCell().textContent = item.word;
        row.insertCell().textContent = item.meaning;
    });

    showScreen('view');
}

/**
 * '테스트 시작' 버튼 클릭 핸들러 (비동기)
 */
async function handleStartTest() {
    const selectedDate = dateSelect.value;
    
    currentWords = await fetchWords(selectedDate);
    
    if (currentWords.length === 0) {
        return;
    }

    // 상태 초기화 및 테스트 시작
    shuffledWords = shuffleArray([...currentWords]); 
    currentQuizIndex = 0;
    correctCount = 0;

    showScreen('test');
    displayQuiz();
}

/**
 * 퀴즈 한 문제 표시
 */
function displayQuiz() {
    if (currentQuizIndex < shuffledWords.length) {
        const currentWordData = shuffledWords[currentQuizIndex];
        
        testProgress.textContent = `문제 ${currentQuizIndex + 1} / ${shuffledWords.length}`;
        currentWordDisplay.textContent = currentWordData.word;
        currentMeaningDisplay.textContent = ''; 
        currentMeaningDisplay.classList.add('hidden'); 

        showAnswerBtn.classList.remove('hidden');
        correctBtn.classList.add('hidden');
        incorrectBtn.classList.add('hidden');
        endTestBtn.classList.add('hidden');

    } else {
        handleShowResult();
    }
}

/**
 * '정답 확인' 버튼 클릭 핸들러
 */
function handleShowAnswer() {
    const currentWordData = shuffledWords[currentQuizIndex];
    currentMeaningDisplay.textContent = currentWordData.meaning;
    currentMeaningDisplay.classList.remove('hidden');

    showAnswerBtn.classList.add('hidden');
    correctBtn.classList.remove('hidden');
    incorrectBtn.classList.remove('hidden');
}

/**
 * '맞춤' 또는 '틀림' 버튼 클릭 핸들러
 */
function handleQuizFeedback(isCorrect) {
    if (isCorrect) {
        correctCount++;
    }

    currentQuizIndex++;
    
    // 마지막 문제 후에는 '테스트 종료' 버튼을 표시
    if (currentQuizIndex === shuffledWords.length) {
        correctBtn.classList.add('hidden');
        incorrectBtn.classList.add('hidden');
        endTestBtn.classList.remove('hidden'); 
        
    } else {
        displayQuiz(); 
    }
}

/**
 * 결과 화면 표시 핸들러
 */
function handleShowResult() {
    const totalQuestions = shuffledWords.length;
    const scoreText = `총 ${totalQuestions} 문제 중 ${correctCount} 문제 맞춤`;
    
    scoreDisplay.textContent = scoreText;
    showScreen('result');
}

// 앱 시작
initializeApp();