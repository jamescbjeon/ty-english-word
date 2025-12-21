import re
import pandas as pd

# ===== 1. TXT 파일 읽기 =====
with open("eng1000.txt", "r", encoding="utf-8") as f:
    lines = [line.strip() for line in f if line.strip()]

rows = []

current_lesson = None
current_rank = None
current_english = None
current_korean_parts = []

# ===== 2. 라인 순회하며 파싱 =====
for line in lines:
    # 홍보 / 페이지 문구 제거
    if "1000englishwords.com" in line:
        continue

    # 새로운 단어 시작 (L숫자 Rank English ...)
    m = re.match(r"(L\d+)\s+(\d+)\s+(.+)", line)
    if m:
        # 이전 단어 저장
        if current_lesson is not None:
            rows.append({
                "Lesson": current_lesson,
                "Rank": current_rank,
                "English": current_english,
                "Korean": " ".join(current_korean_parts)
            })

        current_lesson = m.group(1)
        current_rank = int(m.group(2))

        rest = m.group(3).strip()

        # English / Korean이 한 줄에 같이 있는 경우
        parts = rest.split()
        current_english = parts[0]
        current_korean_parts = parts[1:] if len(parts) > 1 else []

    else:
        # 한국어 뜻이 다음 줄로 내려간 경우
        if current_lesson is not None:
            current_korean_parts.append(line)

# ===== 3. 마지막 단어 저장 =====
if current_lesson is not None:
    rows.append({
        "Lesson": current_lesson,
        "Rank": current_rank,
        "English": current_english,
        "Korean": " ".join(current_korean_parts)
    })

# ===== 4. DataFrame → CSV =====
df = pd.DataFrame(rows)
df.to_csv("1000_english_words.csv", index=False, encoding="utf-8-sig")

print("✅ CSV 파일 생성 완료: 1000_english_words.csv")
