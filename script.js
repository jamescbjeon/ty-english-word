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
const endTestEarlyBtn = document.getElementById('end-test-early-btn');
const correctBtn = document.getElementById('correct-btn');
const incorrectBtn = document.getElementById('incorrect-btn');
const endTestBtn = document.getElementById('end-test-btn');
const scoreDisplay = document.getElementById('score-display');


// =========================================================================
// 2. CSV 파싱 및 데이터 로딩 함수 (이전과 동일)
// =========================================================================

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    
    const dataLines = lines.slice(1);
    
    return dataLines.map(line => {
        const parts = line.split(',');
        if (parts.length < 2) return null;

        const [word, meaning] = [parts[0].trim(), parts[1].trim()];

        if (word && meaning) {
            return { word, meaning };
        }
        return null;
    }).filter(item => item !== null);
}

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
// 3. 초기화 및 유틸리티 함수 (이전과 동일)
// =========================================================================

async function initializeApp() {
    let dates = [];
    loadingStatus.textContent = '단어장 목록 로딩 중...';
    loadingStatus.classList.remove('hidden');

    try {
        const response = await fetch('words/list.json');
        if (!response.ok) {
            throw new Error(`list.json 로드 실패: ${response.statusText}`);
        }
        dates = await response.json(); 
        
        if (!Array.isArray(dates)) {
            throw new Error('list.json의 형식이 올바르지 않습니다. 배열 형태여야 합니다.');
        }

    } catch (error) {
        console.error('단어장 목록 로드 오류:', error);
        alert(`단어장 목록(words/list.json)을 불러오지 못했습니다. 서버 환경과 파일 존재 여부를 확인해주세요.`);
        dates = []; 
    } finally {
        loadingStatus.classList.add('hidden');
        loadingStatus.textContent = '데이터 로딩 중...';
    }
    
    dates.sort((a, b) => b - a); 

    dateSelect.innerHTML = ''; 
    if (dates.length === 0) {
        dateSelect.innerHTML = '<option disabled selected>단어장 파일 없음</option>';
    } else {
        dates.forEach(dateKey => {
            const option = document.createElement('option');
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

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}


// =========================================================================
// 4. 이벤트 핸들러 및 퀴즈 로직
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
    
    endTestEarlyBtn.addEventListener('click', handleEndTestEarly);
}

function handleEndTestEarly() {
    const confirmEnd = confirm("테스트를 정말로 종료하시겠습니까?\n종료하면 현재까지 시도한 문제의 결과로 점수가 매겨집니다.");

    if (confirmEnd) {
        handleShowResult(); 
    }
}

async function handleViewAll() {
    const selectedDate = dateSelect.value;
    const dateDisplay = dateSelect.options[dateSelect.selectedIndex].textContent;

    currentWords = await fetchWords(selectedDate);

    if (currentWords.length === 0) {
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

async function handleStartTest() {
    const selectedDate = dateSelect.value;
    
    currentWords = await fetchWords(selectedDate);
    
    if (currentWords.length === 0) {
        return;
    }

    shuffledWords = shuffleArray([...currentWords]); 
    currentQuizIndex = 0;
    correctCount = 0;

    showScreen('test');
    displayQuiz();
}

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
        endTestEarlyBtn.classList.remove('hidden'); // ✅ 문제 제시 시 '시험 종료' 보임

    } else {
        handleShowResult();
    }
}

/**
 * 정답 확인 시 '시험 종료' 버튼을 숨깁니다.
 */
function handleShowAnswer() {
    const currentWordData = shuffledWords[currentQuizIndex];
    currentMeaningDisplay.textContent = currentWordData.meaning;
    currentMeaningDisplay.classList.remove('hidden');

    showAnswerBtn.classList.add('hidden');
    endTestEarlyBtn.classList.add('hidden'); // 👈 **수정: 정답 확인 후 '시험 종료' 숨김**
    correctBtn.classList.remove('hidden');
    incorrectBtn.classList.remove('hidden');
}

function handleQuizFeedback(isCorrect) {
    if (isCorrect) {
        correctCount++;
    }

    currentQuizIndex++;
    
    if (currentQuizIndex === shuffledWords.length) {
        correctBtn.classList.add('hidden');
        incorrectBtn.classList.add('hidden');
        endTestEarlyBtn.classList.add('hidden'); // 마지막에는 조기 종료 버튼 숨김 (필수)
        endTestBtn.classList.remove('hidden'); 
        
    } else {
        displayQuiz(); 
    }
}

function handleShowResult() {
    const totalQuestions = shuffledWords.length;
    const attemptedCount = currentQuizIndex; 

    let scoreMessage;

    if (attemptedCount < totalQuestions) {
        scoreMessage = `테스트를 조기 종료했습니다.<br>총 ${totalQuestions} 문제 중 **${attemptedCount} 문제** 시도하여 **${correctCount} 문제** 맞춤`;
    } else {
        scoreMessage = `총 ${totalQuestions} 문제 중 **${correctCount} 문제** 맞춤`;
    }
    
    scoreDisplay.innerHTML = scoreMessage;
    showScreen('result');
}

// 앱 시작
initializeApp();