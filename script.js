// =========================================================================
// 1. DOM 요소 및 상태 변수 정의
// =========================================================================

const dateSelect = document.getElementById('date-select');
const viewAllBtn = document.getElementById('view-all-btn');
const startWordPracticeBtn = document.getElementById('start-word-practice-btn'); 
const startMeaningPracticeBtn = document.getElementById('start-meaning-practice-btn'); 
const startMockTestBtn = document.getElementById('start-mock-test-btn'); 

const loadingStatus = document.getElementById('loading-status');

const screens = {
    main: document.getElementById('main-screen'),
    view: document.getElementById('view-screen'),
    practice: document.getElementById('practice-screen'), 
    mockTest: document.getElementById('mock-test-screen'), 
    result: document.getElementById('result-screen')
};

// 테스트 상태 변수
let currentWords = [];
let shuffledWords = [];
let currentQuizIndex = 0;
let correctCount = 0;
let incorrectWords = []; // 💡 추가: 틀린 단어를 저장할 배열
let currentPracticeMode = 'word'; 

// 연습/테스트 관련 DOM 요소
const practiceProgress = document.getElementById('practice-progress');
const currentDisplay = document.getElementById('current-display'); 
const answerDisplay = document.getElementById('answer-display'); 
const showAnswerBtn = document.getElementById('show-answer-btn');
const endTestEarlyBtn = document.getElementById('end-test-early-btn');
const correctBtn = document.getElementById('correct-btn');
const incorrectBtn = document.getElementById('incorrect-btn');
const endTestBtn = document.getElementById('end-test-btn');
const scoreDisplay = document.getElementById('score-display');
const incorrectListContainer = document.getElementById('incorrect-list-container'); // 💡 추가: 틀린 단어 컨테이너

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
// 3. 초기화 및 유틸리티 함수 (이전과 동일)
// =========================================================================

async function initializeApp() {
    let keys = []; 
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
    
    keys.sort((a, b) => b.localeCompare(a)); 

    dateSelect.innerHTML = ''; 
    if (keys.length === 0) {
        dateSelect.innerHTML = '<option disabled selected>단어장 파일 없음</option>';
    } else {
        keys.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key; 
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
    
    mockTestShowAnswerBtn.addEventListener('click', handleMockTestShowAnswer);
}

// (handleEndTestEarly, handleViewAll, handleStartMockTest, displayQuiz, handleShowAnswer, handleMockTestShowAnswer 함수는 변경 없음)
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

async function handleStartPractice(mode) {
    const selectedKey = dateSelect.value;
    
    currentWords = await fetchWords(selectedKey);
    
    if (currentWords.length === 0) {
        return;
    }

    currentPracticeMode = mode; 
    shuffledWords = shuffleArray([...currentWords]); 
    currentQuizIndex = 0;
    correctCount = 0;
    incorrectWords = []; // 💡 초기화

    showScreen('practice');
    displayQuiz();
}

async function handleStartMockTest() {
    const selectedKey = dateSelect.value;
    
    currentWords = await fetchWords(selectedKey);
    
    if (currentWords.length === 0) {
        return;
    }
    
    shuffledWords = shuffleArray([...currentWords]); 

    mockTestInstruction.textContent = `${shuffledWords.length}개의 한국어 뜻을 보고 영어 단어를 적어보세요.`;
    mockTestQuestions.innerHTML = shuffledWords.map((item, index) => {
        return `<p><strong>${index + 1}.</strong> ${item.meaning}</p>`;
    }).join('');
    
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
            currentDisplay.textContent = currentWordData.word;
            answerDisplay.textContent = ''; 
        } else {
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

function handleShowAnswer() {
    const currentWordData = shuffledWords[currentQuizIndex];
    
    if (currentPracticeMode === 'word') {
        answerDisplay.textContent = currentWordData.meaning;
    } else {
        answerDisplay.textContent = currentWordData.word;
    }
    
    answerDisplay.classList.remove('hidden');

    showAnswerBtn.classList.add('hidden');
    endTestEarlyBtn.classList.add('hidden');
    correctBtn.classList.remove('hidden');
    incorrectBtn.classList.remove('hidden');
}

function handleMockTestShowAnswer() {
    mockTestShowAnswerBtn.classList.add('hidden');
    
    mockTestAnswerContainer.innerHTML = shuffledWords.map((item, index) => {
        return `<p><strong>${index + 1}.</strong> ${item.meaning} &rarr; <strong>${item.word}</strong></p>`;
    }).join('');
    
    mockTestAnswerContainer.classList.remove('hidden');
    alert("정답이 공개되었습니다! 스스로 채점해보세요.");
}


function handleQuizFeedback(isCorrect) {
    const currentWordData = shuffledWords[currentQuizIndex]; // 💡 현재 단어 데이터 가져오기

    if (isCorrect) {
        correctCount++;
    } else {
        incorrectWords.push(currentWordData); // 💡 틀린 경우 목록에 추가
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
    
    // 💡 틀린 단어 목록 생성 및 표시
    if (incorrectWords.length > 0) {
        let listHTML = '<h3>❌ 틀린 단어 복습</h3><table id="incorrect-word-table"><thead><tr><th>영단어</th><th>뜻</th></tr></thead><tbody>';
        incorrectWords.forEach(item => {
            listHTML += `<tr><td>${item.word}</td><td>${item.meaning}</td></tr>`;
        });
        listHTML += '</tbody></table>';
        incorrectListContainer.innerHTML = listHTML;
    } else {
        incorrectListContainer.innerHTML = '<h3>✅ 모두 맞췄습니다!</h3><p>훌륭합니다! 틀린 단어가 없습니다.</p>';
    }

    incorrectListContainer.classList.remove('hidden');

    showScreen('result');
}

// 앱 시작
initializeApp();