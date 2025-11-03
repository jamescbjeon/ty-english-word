// =========================================================================
// 1. DOM 요소 및 상태 변수 정의
// =========================================================================

const dateSelect = document.getElementById('date-select');
const viewAllBtn = document.getElementById('view-all-btn');
// 2. 버튼 ID 변경 및 추가
const startWordPracticeBtn = document.getElementById('start-word-practice-btn'); // 암기연습 (영어 단어)
const startMeaningPracticeBtn = document.getElementById('start-meaning-practice-btn'); // 암기연습 (한국어 뜻)
const startMockTestBtn = document.getElementById('start-mock-test-btn'); // 모의 테스트

const loadingStatus = document.getElementById('loading-status');

const screens = {
    main: document.getElementById('main-screen'),
    view: document.getElementById('view-screen'),
    practice: document.getElementById('practice-screen'), // 테스트 -> 연습으로 이름 변경 (화면은 기존 test-screen 사용)
    mockTest: document.getElementById('mock-test-screen'), // 모의 테스트 화면 추가
    result: document.getElementById('result-screen')
};

// 테스트 상태 변수
let currentWords = [];
let shuffledWords = [];
let currentQuizIndex = 0;
let correctCount = 0;
let currentPracticeMode = 'word'; // 'word' (영어 단어) 또는 'meaning' (한국어 뜻)

// 연습/테스트 관련 DOM 요소
// 기존 'test' 접두사 -> 'practice' 접두사로 통일
const practiceProgress = document.getElementById('practice-progress');
const currentDisplay = document.getElementById('current-display'); // 단어 또는 뜻을 표시
const answerDisplay = document.getElementById('answer-display'); // 뜻 또는 단어를 표시
const showAnswerBtn = document.getElementById('show-answer-btn');
const endTestEarlyBtn = document.getElementById('end-test-early-btn');
const correctBtn = document.getElementById('correct-btn');
const incorrectBtn = document.getElementById('incorrect-btn');
const endTestBtn = document.getElementById('end-test-btn');
const scoreDisplay = document.getElementById('score-display');

// 모의 테스트 관련 DOM 요소
const mockTestInstruction = document.getElementById('mock-test-instruction');
const mockTestQuestions = document.getElementById('mock-test-questions');
const mockTestAnswerContainer = document.getElementById('mock-test-answer-container');
const mockTestShowAnswerBtn = document.getElementById('mock-test-show-answer-btn');


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
    // 1. 파일 경로 수정: dateKey(임의 텍스트)를 파일명으로 사용
    const filePath = `words/${dateKey}.csv`; 
    
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            console.error(`Error loading ${filePath}: ${response.statusText}`);
            alert(`단어장 파일을 불러오는 데 실패했습니다 (HTTP 상태 코드: ${response.status}). 웹 서버에서 실행 중인지 확인하고 파일 경로(words/${dateKey}.csv)를 확인해주세요.`);
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

async function initializeApp() {
    let keys = []; // 날짜 대신 임의 텍스트 키
    loadingStatus.textContent = '단어장 목록 로딩 중...';
    loadingStatus.classList.remove('hidden');

    try {
        const response = await fetch('words/list.json');
        if (!response.ok) {
            throw new Error(`list.json 로드 실패: ${response.statusText}`);
        }
        keys = await response.json(); 
        
        if (!Array.isArray(keys)) {
            throw new Error('list.json의 형식이 올바르지 않습니다. 배열 형태여야 합니다.');
        }

    } catch (error) {
        console.error('단어장 목록 로드 오류:', error);
        alert(`단어장 목록(words/list.json)을 불러오지 못했습니다. 서버 환경과 파일 존재 여부를 확인해주세요.`);
        keys = []; 
    } finally {
        loadingStatus.classList.add('hidden');
        loadingStatus.textContent = '데이터 로딩 중...';
    }
    
    // 1. 정렬 로직은 유지하거나 필요에 따라 수정 (여기서는 그냥 문자열 정렬)
    keys.sort((a, b) => b.localeCompare(a)); 

    dateSelect.innerHTML = ''; 
    if (keys.length === 0) {
        dateSelect.innerHTML = '<option disabled selected>단어장 파일 없음</option>';
    } else {
        keys.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key; // 1. 화면에 임의의 텍스트 키 표시
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
    // 2. 새로운 버튼에 이벤트 연결
    startWordPracticeBtn.addEventListener('click', () => handleStartPractice('word'));
    startMeaningPracticeBtn.addEventListener('click', () => handleStartPractice('meaning'));
    startMockTestBtn.addEventListener('click', handleStartMockTest);
    
    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', () => showScreen('main'));
    });

    showAnswerBtn.addEventListener('click', handleShowAnswer);
    correctBtn.addEventListener('click', () => handleQuizFeedback(true));
    incorrectBtn.addEventListener('click', () => handleQuizFeedback(false));
    endTestBtn.addEventListener('click', handleShowResult);
    
    endTestEarlyBtn.addEventListener('click', handleEndTestEarly);
    
    // 5. 모의 테스트 정답 확인 버튼
    mockTestShowAnswerBtn.addEventListener('click', handleMockTestShowAnswer);
}

function handleEndTestEarly() {
    const confirmEnd = confirm("테스트를 정말로 종료하시겠습니까?\n종료하면 현재까지 시도한 문제의 결과로 점수가 매겨집니다.");

    if (confirmEnd) {
        handleShowResult(); 
    }
}

async function handleViewAll() {
    const selectedKey = dateSelect.value;
    const keyDisplay = dateSelect.options[dateSelect.selectedIndex].textContent;

    currentWords = await fetchWords(selectedKey);

    if (currentWords.length === 0) {
        return;
    }
    
    document.getElementById('view-date-display').textContent = keyDisplay;
    const tbody = document.querySelector('#word-table tbody');
    tbody.innerHTML = '';

    currentWords.forEach(item => {
        const row = tbody.insertRow();
        row.insertCell().textContent = item.word;
        row.insertCell().textContent = item.meaning;
    });

    showScreen('view');
}

// 3, 4. 암기 연습 시작 (단어 -> 뜻, 뜻 -> 단어 모두 처리)
async function handleStartPractice(mode) {
    const selectedKey = dateSelect.value;
    
    currentWords = await fetchWords(selectedKey);
    
    if (currentWords.length === 0) {
        return;
    }

    currentPracticeMode = mode; // 모드 저장
    shuffledWords = shuffleArray([...currentWords]); 
    currentQuizIndex = 0;
    correctCount = 0;

    showScreen('practice');
    displayQuiz();
}

// 5. 모의 테스트 시작
async function handleStartMockTest() {
    const selectedKey = dateSelect.value;
    
    currentWords = await fetchWords(selectedKey);
    
    if (currentWords.length === 0) {
        return;
    }
    
    // 모의 테스트는 순서가 중요하지 않으므로, 원래 배열을 복사하여 사용하거나 (여기서는 편의상)
    // 전체 단어를 사용하여 문제를 만듭니다. 순서를 임의로 섞는 것이 더 좋습니다.
    shuffledWords = shuffleArray([...currentWords]); 

    // 문제 표시
    mockTestInstruction.textContent = `${shuffledWords.length}개의 한국어 뜻을 보고 영어 단어를 적어보세요.`;
    mockTestQuestions.innerHTML = shuffledWords.map((item, index) => {
        return `<p><strong>${index + 1}.</strong> ${item.meaning}</p>`;
    }).join('');
    
    // 정답 관련 요소 초기화
    mockTestAnswerContainer.innerHTML = '';
    mockTestAnswerContainer.classList.add('hidden');
    mockTestShowAnswerBtn.classList.remove('hidden');
    
    showScreen('mockTest');
}

function displayQuiz() {
    if (currentQuizIndex < shuffledWords.length) {
        const currentWordData = shuffledWords[currentQuizIndex];
        
        practiceProgress.textContent = `문제 ${currentQuizIndex + 1} / ${shuffledWords.length}`;
        
        if (currentPracticeMode === 'word') {
            // 3. 암기연습 (영어 단어): 영단어 제시, 뜻 숨김
            currentDisplay.textContent = currentWordData.word;
            answerDisplay.textContent = ''; 
        } else {
            // 4. 암기연습 (한국어 뜻): 한국어 뜻 제시, 단어 숨김
            currentDisplay.textContent = currentWordData.meaning;
            answerDisplay.textContent = '';
        }
        
        answerDisplay.classList.add('hidden'); 

        showAnswerBtn.classList.remove('hidden');
        correctBtn.classList.add('hidden');
        incorrectBtn.classList.add('hidden');
        endTestBtn.classList.add('hidden');
        endTestEarlyBtn.classList.remove('hidden');
    } else {
        handleShowResult();
    }
}

/**
 * 정답 확인 시 '시험 종료' 버튼을 숨깁니다.
 */
function handleShowAnswer() {
    const currentWordData = shuffledWords[currentQuizIndex];
    
    if (currentPracticeMode === 'word') {
        // 3. 암기연습 (영어 단어): 정답으로 뜻 표시
        answerDisplay.textContent = currentWordData.meaning;
    } else {
        // 4. 암기연습 (한국어 뜻): 정답으로 단어 표시
        answerDisplay.textContent = currentWordData.word;
    }
    
    answerDisplay.classList.remove('hidden');

    showAnswerBtn.classList.add('hidden');
    endTestEarlyBtn.classList.add('hidden');
    correctBtn.classList.remove('hidden');
    incorrectBtn.classList.remove('hidden');
}

// 5. 모의 테스트 정답 확인 로직
function handleMockTestShowAnswer() {
    mockTestShowAnswerBtn.classList.add('hidden');
    
    mockTestAnswerContainer.innerHTML = shuffledWords.map((item, index) => {
        // 제공된 순서에 맞게 한국어 뜻과 영어 단어 답안을 제공
        return `<p><strong>${index + 1}.</strong> ${item.meaning} &rarr; <strong>${item.word}</strong></p>`;
    }).join('');
    
    mockTestAnswerContainer.classList.remove('hidden');
    alert("정답이 공개되었습니다! 스스로 채점해보세요.");
}


function handleQuizFeedback(isCorrect) {
    if (isCorrect) {
        correctCount++;
    }

    currentQuizIndex++;
    
    if (currentQuizIndex === shuffledWords.length) {
        correctBtn.classList.add('hidden');
        incorrectBtn.classList.add('hidden');
        endTestEarlyBtn.classList.add('hidden');
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
        scoreMessage = `테스트를 조기 종료했습니다.<br><br>총 ${totalQuestions} 문제 중 <br>${attemptedCount} 문제 시도하여 <br>${correctCount} 문제 맞춤`;
    } else {
        scoreMessage = `총 ${totalQuestions} 문제 중 **${correctCount} 문제** 맞춤`;
    }
    
    scoreDisplay.innerHTML = scoreMessage;
    showScreen('result');
}

// 앱 시작
initializeApp();