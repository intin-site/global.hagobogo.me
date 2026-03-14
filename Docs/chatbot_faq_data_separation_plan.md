# HAGOBOGO 챗봇 FAQ 데이터 분리 기획안

## 1. 문서 목적

이 문서는 현재 하고보고 사이트의 FAQ형 챗봇에서
질문과 답변 데이터를 별도 파일로 분리하기 위한 기획안입니다.

이번 기획안의 목표는 아래 3가지입니다.

1. 챗봇 질문과 답변을 더 쉽게 수정할 수 있게 만들기
2. 번역 UI 문구와 FAQ 데이터를 역할별로 분리하기
3. 나중에 FAQ가 늘어나도 유지보수가 어렵지 않도록 구조를 정리하기

즉, 이번 작업은 화면을 새로 만드는 작업이 아니라
`지금 이미 동작하는 챗봇을 더 관리하기 쉬운 구조로 바꾸기 위한 정리 작업`입니다.

## 2. 현재 구조 진단

현재 챗봇 데이터는 [src/i18n/translations.js](/Users/chris/development/AntigravityWorks/site_hagobogo/src/i18n/translations.js)에 들어 있습니다.

이 파일 안에는 아래 내용이 한꺼번에 섞여 있습니다.

- 판매량 문구
- 버튼 문구
- 문의 팝업 문구
- 푸터 문구
- 챗봇 제목과 안내 문구
- 챗봇 질문과 답변

이 구조는 처음에는 빠르게 만들기 좋지만,
FAQ가 늘어나면 아래 문제가 커집니다.

1. 수정 위치가 불명확합니다.
- 챗봇 질문만 바꾸고 싶은데도 큰 번역 파일 전체를 열어야 합니다.

2. 파일 책임이 섞여 있습니다.
- `translations.js`는 원래 UI 문구를 관리하는 성격인데,
  지금은 질문/답변 콘텐츠까지 함께 관리하고 있습니다.

3. 운영 수정이 어렵습니다.
- 나중에 질문 하나를 바꾸려 해도
  번역 파일 구조를 모르면 실수할 가능성이 있습니다.

4. 확장성이 낮습니다.
- 추후 FAQ가 7개에서 15개, 20개로 늘어나면
  `translations.js`가 너무 길어지고 검토가 어려워집니다.

## 3. 분리 방향

이번 구조 개편에서는 아래 원칙으로 나누는 것이 가장 안전합니다.

### 3-1. `translations.js`에 남길 것

UI 동작과 직접 연결된 짧은 문구는 그대로 남깁니다.

- 챗봇 제목
- 챗봇 안내 문구
- 버튼 문구
- 라벨 문구
- 문의 팝업 문구
- 공통 UI 문구

즉, `화면의 인터페이스 문구`는 계속 `translations.js`가 담당합니다.

### 3-2. 별도 파일로 뺄 것

아래 내용은 별도 데이터 파일로 분리합니다.

- FAQ 질문
- FAQ 답변

즉, `콘텐츠 데이터`만 따로 분리합니다.

이 기준이 중요한 이유는,
UI 문구와 콘텐츠 데이터를 한 파일에 같이 넣으면
다시 구조가 섞이기 때문입니다.

## 4. 권장 파일 구조

가장 현실적인 구조는 아래와 같습니다.

```text
src/
  components/
    ChatbotPanel.jsx
  data/
    chatbotFaq.js
  i18n/
    translations.js
```

여기서 각 파일의 역할은 아래와 같습니다.

### 4-1. `src/data/chatbotFaq.js`

언어별 FAQ 질문/답변만 관리합니다.

예시 구조:

```js
export const CHATBOT_FAQ = {
    EN: [
        {
            id: 'product',
            question: 'What kind of product is HAGOBOGO?',
            answer: '...'
        }
    ],
    ES: [
        {
            id: 'product',
            question: 'Que tipo de producto es HAGOBOGO?',
            answer: '...'
        }
    ],
    FR: [
        {
            id: 'product',
            question: 'Quel type de produit est HAGOBOGO ?',
            answer: '...'
        }
    ],
    KR: [
        {
            id: 'product',
            question: 'HAGOBOGO는 어떤 제품인가요?',
            answer: '...'
        }
    ]
};
```

### 4-2. `src/i18n/translations.js`

기존처럼 UI 문구만 유지합니다.

예:

- `chatbotPanel.title`
- `chatbotPanel.intro`
- `chatbotPanel.buttons`
- `chatbotPanel.labels`
- `chatbotPanel.emptyState`

단, `chatbotPanel.questions`는 제거합니다.

### 4-3. `src/components/ChatbotPanel.jsx`

이 컴포넌트는 아래 두 종류의 데이터를 받게 됩니다.

- `copy`: UI 문구
- `questions`: 질문/답변 데이터

즉, 역할이 더 명확해집니다.

예:

```jsx
<ChatbotPanel
    copy={copy.chatbotPanel}
    questions={chatbotQuestions}
    onClose={...}
    onOpenInquiry={...}
    onViewProposal={...}
/>
```

## 5. 데이터 전달 방식

현재 구조에서는 `Dashboard.jsx`가 언어 상태를 알고 있으므로,
여기서 FAQ 데이터도 같이 선택하는 방식이 가장 단순합니다.

권장 흐름은 아래와 같습니다.

1. `Dashboard.jsx`가 현재 언어를 확인
2. `CHATBOT_FAQ[language]`를 읽음
3. 그 값을 `ChatbotPanel`에 `questions` prop으로 전달
4. `ChatbotPanel.jsx`는 전달받은 질문 목록만 렌더링

이 방식의 장점은 아래와 같습니다.

- `ChatbotPanel.jsx`가 언어 선택 로직을 몰라도 됩니다.
- FAQ 파일이 커져도 컴포넌트 구조는 단순하게 유지됩니다.
- 테스트와 디버깅이 쉬워집니다.

## 6. 왜 이 방식이 가장 적절한가

대장님 사이트 기준으로는 이 방법이 가장 현실적입니다.

### 장점

1. 수정 지점이 명확합니다.
- 질문/답변만 바꿀 때는 `chatbotFaq.js`만 보면 됩니다.

2. 번역 구조가 깔끔해집니다.
- `translations.js`는 다시 UI 번역 파일 역할에 집중할 수 있습니다.

3. 운영 부담이 줄어듭니다.
- 나중에 질문이 추가되거나 답변이 바뀌어도
  다른 UI 문구를 건드릴 가능성이 줄어듭니다.

4. 다음 단계 확장이 쉽습니다.
- 나중에 JSON, CMS, Google Sheets, Admin 화면으로 옮길 때도
  FAQ 데이터만 따로 빼기 쉬워집니다.

### 단점

1. 파일이 하나 더 생깁니다.
- 하지만 이 정도 분리는 오히려 관리성을 높입니다.

2. 언어별 FAQ 개수가 다르면 관리가 조금 까다로울 수 있습니다.
- 따라서 처음에는 모든 언어에서 같은 `id` 구조를 유지하는 것이 좋습니다.

## 7. 구현 시 주의할 점

이번 작업은 단순히 복붙만 하면 끝나지 않습니다.
아래를 같이 맞춰야 안전합니다.

### 7-1. 질문 `id`를 모든 언어에서 동일하게 유지

예:

- `product`
- `audience`
- `markets`
- `strengths`
- `offline`
- `proposal`
- `contact`

이 `id`가 언어마다 달라지면
선택 상태 관리나 추후 분석 시 혼란이 생깁니다.

### 7-2. `ChatbotPanel.jsx`의 기본값 처리

FAQ 파일을 읽지 못했을 때를 대비해
빈 배열 기본값 처리가 있어야 합니다.

예:

```js
const selectedQuestion = questions.find(...)
```

이때 `questions`가 `undefined`면 오류가 나므로
기본값을 `[]`로 두는 것이 안전합니다.

### 7-3. UI 문구와 콘텐츠 문구를 다시 섞지 않기

이번에 분리한 뒤에도
새 질문을 추가하면서 다시 `translations.js`에 넣기 시작하면
구조 분리 의미가 사라집니다.

따라서 운영 규칙을 아래처럼 정하면 좋습니다.

- 버튼/제목/라벨 = `translations.js`
- 질문/답변 = `chatbotFaq.js`

## 8. 권장 구현 순서

실제 코드 작업은 아래 순서가 가장 안전합니다.

1. `src/data/chatbotFaq.js` 파일 생성
2. `translations.js`에 있는 `chatbotPanel.questions`를 새 파일로 이동
3. `Dashboard.jsx`에서 현재 언어 기준 FAQ 데이터 선택
4. `ChatbotPanel.jsx`가 `questions` prop을 받도록 수정
5. 질문이 정상 렌더링되는지 확인
6. `EN`, `ES`, `FR`, `KR` 모두 동작 확인
7. `npm run build`로 최종 검증

## 9. 수정 대상 파일

이번 구조 분리 구현 시 실제로 수정될 파일은 아래 정도가 적절합니다.

- 신규: `src/data/chatbotFaq.js`
- 수정: `src/i18n/translations.js`
- 수정: `src/components/Dashboard.jsx`
- 수정: `src/components/ChatbotPanel.jsx`

필요 이상으로 다른 파일까지 건드릴 이유는 없습니다.

## 10. 이번 작업의 성공 기준

아래가 만족되면 이번 구조 분리는 성공입니다.

1. 챗봇 질문/답변이 별도 파일에 정리된다
2. `translations.js`는 UI 문구 중심으로 더 단순해진다
3. 기존 화면 동작은 바뀌지 않는다
4. 언어 전환 시 각 언어 FAQ가 정상 노출된다
5. 빌드가 정상 통과한다

## 11. 최종 판단

대장님 사이트에서는
`FAQ 데이터만 별도 파일로 분리하는 방식`이 가장 적절합니다.

이 방식은
너무 과하게 복잡하지 않으면서도,
현재 구조의 유지보수 문제를 확실하게 줄여줍니다.

특히 지금처럼 다국어 FAQ가 이미 들어간 상태에서는
지금 분리해두는 것이 나중에 훨씬 덜 힘듭니다.

즉, 이 작업은 선택사항이 아니라
`챗봇이 커지기 전에 미리 정리해두면 좋은 구조 개선 작업`에 가깝습니다.

## 12. 다음 단계

이 기획안이 괜찮다면,
다음 단계는 실제 코드 구현입니다.

구현에서는 아래만 진행하면 됩니다.

1. `chatbotFaq.js` 생성
2. FAQ 데이터를 `translations.js`에서 분리
3. `Dashboard.jsx`, `ChatbotPanel.jsx` 연결
4. 빌드 검증
