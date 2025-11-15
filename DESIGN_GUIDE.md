# 디자인 지시 가이드 (Design Specification Guide)

## 📋 디자인을 전문적으로 지시하는 방법

### 1. **구체적인 디자인 토큰 명시**

#### ✅ 좋은 예:
```
- 배경색: #091A7A (네이비 블루)
- 텍스트 색상: #FFFFFF (흰색)
- 카드 배경: rgba(255, 255, 255, 0.9) + backdrop-blur-lg
- 테두리: border-2 border-white/20
- 그림자: 0 8px 25px rgba(9, 26, 122, 0.2)
- 둥근 모서리: 20px
- 간격: 16px (카드 간), 24px (섹션 간)
```

#### ❌ 나쁜 예:
```
- "예쁘게 해줘"
- "네이비 느낌으로"
- "카드 스타일로"
```

---

### 2. **레이아웃과 간격 명시**

#### ✅ 좋은 예:
```
- 헤더: 상단 고정, 높이 64px, 패딩 16px
- 카드 그리드: 2열 (모바일), 3열 (태블릿), 4열 (데스크톱)
- 카드 간격: gap-4 (16px)
- 섹션 간격: mb-8 (32px)
- 컨테이너 최대 너비: 1200px, 중앙 정렬
```

#### ❌ 나쁜 예:
```
- "카드들을 나열해줘"
- "간격 적당히"
```

---

### 3. **타이포그래피 명시**

#### ✅ 좋은 예:
```
- 제목: 24px, font-weight 700, line-height 1.2
- 부제목: 18px, font-weight 600, line-height 1.4
- 본문: 16px, font-weight 400, line-height 1.6
- 작은 텍스트: 12px, font-weight 400, line-height 1.5
- 폰트: Lexend (기본 폰트)
```

#### ❌ 나쁜 예:
```
- "큰 글씨로"
- "굵게"
```

---

### 4. **색상 시스템 명시**

#### ✅ 좋은 예:
```
- Primary: #091A7A (네이비 블루)
- Secondary: #ADC8FF (라이트 블루)
- Success: #10B981 (그린)
- Warning: #F59E0B (오렌지)
- Error: #EF4444 (레드)
- Neutral: #6B7280 (그레이)
- 배경 그라데이션: linear-gradient(180deg, #ADC8FF 0%, #FFFFFF 100%)
```

#### ❌ 나쁜 예:
```
- "파란색"
- "밝은 색"
```

---

### 5. **애니메이션과 인터랙션 명시**

#### ✅ 좋은 예:
```
- 버튼 클릭: whileTap={{ scale: 0.95 }}, duration 150ms
- 카드 호버: transform: translateY(-4px), shadow 증가
- 페이드 인: opacity 0 → 1, duration 300ms, ease-out
- 로딩 스피너: rotate 360deg, duration 1s, infinite
- 페이지 전환: slide-in-right, duration 300ms
```

#### ❌ 나쁜 예:
```
- "부드럽게"
- "애니메이션 추가"
```

---

### 6. **컴포넌트 스타일 명시**

#### ✅ 좋은 예:
```
- 버튼:
  - Primary: bg-[#091A7A], text-white, px-6 py-3, rounded-xl
  - Secondary: bg-white/20, text-[#091A7A], border border-[#091A7A]/30
  - 최소 터치 영역: 44px × 44px
  
- 카드:
  - 배경: bg-white/90 backdrop-blur-lg
  - 테두리: border border-white/20
  - 그림자: shadow-lg
  - 둥근 모서리: rounded-2xl
  - 패딩: p-6
  
- 입력 필드:
  - 배경: bg-white/80
  - 테두리: border-2 border-[#091A7A]/20
  - 포커스: border-[#091A7A], ring-2 ring-[#091A7A]/20
  - 높이: 48px
```

#### ❌ 나쁜 예:
```
- "버튼 만들어줘"
- "카드 스타일"
```

---

### 7. **반응형 디자인 명시**

#### ✅ 좋은 예:
```
- 모바일 (기본): 
  - 컨테이너: px-4
  - 폰트 크기: text-base
  - 카드: 1열
  
- 태블릿 (md: 768px):
  - 컨테이너: px-8
  - 폰트 크기: text-lg
  - 카드: 2열
  
- 데스크톱 (lg: 1024px):
  - 컨테이너: px-12, max-w-6xl mx-auto
  - 폰트 크기: text-xl
  - 카드: 3열
```

#### ❌ 나쁜 예:
```
- "모바일에서도 잘 보이게"
```

---

### 8. **상태(State) 명시**

#### ✅ 좋은 예:
```
- 기본 상태: opacity 100%, scale 1
- 호버 상태: opacity 90%, scale 1.02
- 활성 상태: bg-[#091A7A], text-white
- 비활성 상태: opacity 50%, cursor-not-allowed
- 로딩 상태: opacity 70%, spinner 표시
- 에러 상태: border-red-500, text-red-500
```

---

### 9. **참고 자료 제공**

#### ✅ 좋은 예:
```
- "Figma 디자인 참고: [링크]"
- "이 이미지의 색감과 스타일 적용"
- "이 앱의 버튼 스타일 참고"
```

---

## 📐 현재 프로젝트의 디자인 시스템

### 색상 팔레트
```css
--color-primary: #091A7A      /* 네이비 블루 */
--color-secondary: #ADC8FF     /* 라이트 블루 */
--color-success: #10B981       /* 그린 */
--color-warning: #F59E0B       /* 오렌지 */
--color-error: #EF4444         /* 레드 */
--color-neutral: #6B7280       /* 그레이 */
```

### 타이포그래피
```css
--text-main-heading: 20px      /* 메인 제목 */
--text-section-header: 16px    /* 섹션 헤더 */
--text-subheading: 14px        /* 부제목 */
--text-body: 14px              /* 본문 */
--text-small: 12px             /* 작은 텍스트 */
```

### 간격 시스템
```css
--radius-small: 12px           /* 작은 둥근 모서리 */
--radius-standard: 20px        /* 표준 둥근 모서리 */
--radius-subject: 40px         /* 큰 둥근 모서리 */
--radius-pill: 50px            /* 완전히 둥근 모서리 */
```

### 그림자 시스템
```css
--shadow-card: 0 4px 20px rgba(9, 26, 122, 0.15)
--shadow-interactive: 0 8px 25px rgba(9, 26, 122, 0.2)
--shadow-elevated: 0 20px 40px rgba(9, 26, 122, 0.25)
```

### 글래스모피즘 시스템
```css
--bg-glass: rgba(173, 200, 255, 0.3)
backdrop-blur-lg (16px)
border border-white/20
```

---

## 🎯 디자인 지시 템플릿

### 버튼 디자인 지시 예시:
```
[버튼 스타일]
- 타입: Primary 버튼
- 배경색: #091A7A
- 텍스트 색상: #FFFFFF
- 폰트 크기: 16px, font-weight 600
- 패딩: px-6 py-3
- 둥근 모서리: 12px
- 그림자: 0 4px 12px rgba(9, 26, 122, 0.3)
- 클릭 효과: scale 0.95, duration 150ms
- 최소 크기: 44px × 44px
```

### 카드 디자인 지시 예시:
```
[카드 스타일]
- 배경: rgba(255, 255, 255, 0.9) + backdrop-blur-lg
- 테두리: border border-white/20
- 둥근 모서리: 20px
- 그림자: 0 4px 20px rgba(9, 26, 122, 0.15)
- 패딩: 24px
- 간격: 16px (카드 간)
```

### 레이아웃 디자인 지시 예시:
```
[레이아웃]
- 컨테이너: max-w-6xl, mx-auto, px-4 (모바일), px-8 (태블릿), px-12 (데스크톱)
- 그리드: 1열 (모바일), 2열 (태블릿), 3열 (데스크톱)
- 간격: gap-4 (16px)
- 섹션 간격: mb-8 (32px)
```

---

## 💡 실전 팁

1. **구체적인 수치 제공**: "큰 글씨" 대신 "24px, font-weight 700"
2. **색상 코드 명시**: "파란색" 대신 "#091A7A"
3. **간격 명시**: "적당히" 대신 "16px" 또는 "gap-4"
4. **상태 명시**: "클릭하면" 대신 "whileTap={{ scale: 0.95 }}"
5. **참고 자료 첨부**: 이미지나 링크 제공
6. **반응형 고려**: 모바일/태블릿/데스크톱 각각 명시
7. **접근성 고려**: 최소 터치 영역 44px, 색상 대비율 명시

---

## 📝 체크리스트

디자인 지시 시 다음 항목들을 포함하세요:

- [ ] 색상 코드 (HEX, RGB, 또는 CSS 변수)
- [ ] 폰트 크기와 굵기
- [ ] 간격 (padding, margin, gap)
- [ ] 둥근 모서리 (border-radius)
- [ ] 그림자 (box-shadow)
- [ ] 애니메이션 (duration, easing, transform)
- [ ] 반응형 브레이크포인트
- [ ] 상태 (hover, active, disabled, loading)
- [ ] 최소 터치 영역 (모바일)
- [ ] 참고 이미지/링크 (있는 경우)

---

이 가이드를 참고하여 디자인을 지시하시면 더 정확하고 일관된 결과를 얻을 수 있습니다! 🎨

