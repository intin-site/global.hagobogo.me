# Business Inquiries Vercel + Resend 구현 구조도

## 1. 문서 목적

이 문서는 현재 `site_hagobogo` 프로젝트에 `Business Inquiries` 팝업 메일 발송 기능을 붙이기 위해,
`GitHub Pages + Vercel 서버리스 함수 + Resend` 조합을 기준으로 실제 구현 구조를 정리한 문서입니다.

목표는 단순합니다.

- 프론트엔드는 그대로 GitHub Pages에 유지한다.
- 별도의 전통 서버는 두지 않는다.
- 문의 폼 제출은 Vercel 서버리스 함수가 처리한다.
- 메일 발송은 Resend가 담당한다.

즉, 현재 구조를 크게 무너뜨리지 않고 가장 적은 운영 부담으로 메일 발송 기능을 붙이는 것이 목적입니다.

## 2. 권장 아키텍처

전체 구조는 아래와 같습니다.

```text
사용자 브라우저
  -> Business Inquiries 팝업 입력
  -> POST 요청 전송

Vercel 서버리스 함수
  -> 입력값 검증
  -> Resend 메일 발송 API 호출
  -> 성공/실패 응답 반환

Resend
  -> 지정된 관리자 이메일 주소로 메일 전달
```

이 구조가 적절한 이유는 아래와 같습니다.

- 프론트 코드에 메일 발송 비밀키를 넣지 않아도 된다.
- 현재 GitHub Pages 정적 배포 구조를 유지할 수 있다.
- 전통 서버 없이도 메일 발송이 가능하다.
- 월 100건 수준의 문의 메일에는 과하지 않은 구조다.

## 3. 구성 요소별 역할

### 3-1. 프론트엔드

프론트엔드는 현재 프로젝트의 React 코드가 그대로 담당합니다.

주요 역할:

- 사용자 입력값 수집
- 1차 입력 검증
- 제출 중 상태 표시
- 중복 제출 방지
- 성공/실패 메시지 표시
- 현재 언어 정보 함께 전송

프론트엔드에서 직접 Resend를 호출하면 안 됩니다.
브라우저에 API 키가 노출되기 때문입니다.

### 3-2. Vercel 서버리스 함수

Vercel 함수는 실제 백엔드 역할을 담당합니다.

주요 역할:

- `POST` 요청 수신
- 요청 본문 파싱
- 서버 측 필수값 검증
- 이메일 형식 검증
- 문의 길이 제한 검증
- Resend 호출
- 성공/실패 응답 반환

즉, 별도 전통 서버는 없지만 백엔드 책임은 이 함수가 맡게 됩니다.

### 3-3. Resend

Resend는 메일 전송 전용 서비스입니다.

주요 역할:

- 발신 도메인 인증
- 발신자 주소 관리
- API 기반 메일 전송
- 최종 수신 이메일 전달

현재 요구사항이 `문의 메일 1건 전송`에 가깝기 때문에, Resend의 단순한 API 구조가 잘 맞습니다.

## 4. 실제 데이터 흐름

1. 사용자가 `Business Inquiries` 팝업에 내용을 입력합니다.
2. 사용자가 `Save` 버튼을 누릅니다.
3. 프론트엔드가 서버리스 함수로 `POST` 요청을 보냅니다.
4. 서버리스 함수가 입력값을 검증합니다.
5. 검증이 통과하면 Resend API를 호출합니다.
6. Resend가 지정된 관리자 이메일 주소로 메일을 발송합니다.
7. 서버리스 함수가 성공 또는 실패 응답을 반환합니다.
8. 프론트엔드는 사용자에게 결과 메시지를 보여줍니다.

## 5. 프로젝트 기준 파일 구조 제안

현재 프로젝트에 맞춰 보면 아래 구조가 가장 현실적입니다.

```text
site_hagobogo/
  src/
    components/
      InquiryModal.jsx
    i18n/
      translations.js
    lib/
      inquiryApi.js

  api/
    business-inquiry.js

  Docs/
    business_inquiries_popup_plan.md
    business_inquiries_mail_api_plan.md
    business_inquiries_resend_vercel_plan.md
```

설명:

- `InquiryModal.jsx`
  - 팝업 입력과 제출 버튼 처리
- `src/lib/inquiryApi.js`
  - 프론트에서 서버리스 API를 호출하는 얇은 함수
- `api/business-inquiry.js`
  - Vercel 서버리스 함수

## 6. 프론트엔드 구현 책임 상세

### 6-1. 전송 데이터

프론트에서 보내는 데이터 예시는 아래와 같습니다.

```json
{
  "name": "홍길동",
  "jobTitle": "Marketing Manager",
  "companyName": "ABC Inc.",
  "email": "hello@example.com",
  "inquiry": "문의 내용",
  "language": "EN"
}
```

### 6-2. 프론트가 해야 할 일

- 필수값 비어 있는지 확인
- 이메일 형식 1차 확인
- `Save` 버튼 중복 클릭 방지
- 전송 중 버튼 비활성화
- 성공 시 안내 문구 표시
- 실패 시 안내 문구 표시

### 6-3. 프론트가 하지 말아야 할 일

- Resend API 키 보관
- 수신 이메일 주소 하드코딩
- 실제 메일 발송 직접 처리

## 7. Vercel 서버리스 함수 구현 책임 상세

### 7-1. 엔드포인트

- `POST /api/business-inquiry`

### 7-2. 필수 검증 항목

- `name`: 필수
- `companyName`: 필수
- `email`: 필수
- `email`: 형식 확인
- `inquiry`: 필수
- `inquiry`: 최대 길이 확인
- `jobTitle`: 현재 정책상 선택

### 7-3. 권장 응답 구조

성공:

```json
{
  "ok": true,
  "message": "Inquiry submitted successfully."
}
```

실패:

```json
{
  "ok": false,
  "message": "Invalid email format."
}
```

### 7-4. 서버에서 추가로 고려할 항목

- 너무 짧은 문의 차단
- 너무 긴 문의 차단
- 비정상적인 요청 빈도 제한
- 개발용 로그와 운영용 오류 분리

## 8. Resend 연동 구조

서버리스 함수 안에서는 Resend를 아래 순서로 사용합니다.

1. 환경 변수에서 API 키를 읽는다.
2. 환경 변수에서 수신 이메일 주소를 읽는다.
3. 메일 제목과 본문을 구성한다.
4. Resend API로 발송 요청을 보낸다.
5. 성공/실패 결과를 받아 프론트에 전달한다.

## 9. 환경 변수 설계

민감 정보는 코드가 아니라 Vercel 환경 변수에 둬야 합니다.

예시:

```text
RESEND_API_KEY=...
BUSINESS_INQUIRY_TO_EMAIL=contact@example.com
BUSINESS_INQUIRY_FROM_EMAIL=no-reply@example.com
```

설명:

- `RESEND_API_KEY`
  - Resend 인증용 키
- `BUSINESS_INQUIRY_TO_EMAIL`
  - 실제 문의 수신 주소
- `BUSINESS_INQUIRY_FROM_EMAIL`
  - Resend에서 허용된 발신 주소

## 10. 메일 제목과 본문 구조

### 10-1. 권장 제목

```text
[HAGOBOGO] New Business Inquiry from ABC Inc.
```

### 10-2. 권장 본문

```text
Name: 홍길동
Job Title: Marketing Manager
Company Name: ABC Inc.
Email: hello@example.com
Language: EN

Inquiry:
문의 내용
```

초기에는 화려한 템플릿보다 plain text 또는 단순 HTML이 더 적절합니다.

이유:

- 디버깅이 쉽다.
- 메일 본문 누락 여부를 확인하기 쉽다.
- 운영 초기에 불필요한 복잡도를 줄일 수 있다.

## 11. 배포 구조 설계

### 11-1. 프론트 배포

- GitHub Pages 유지
- 현재처럼 정적 파일 제공

### 11-2. API 배포

- Vercel 프로젝트 별도 생성
- `api/business-inquiry.js` 서버리스 함수 배포

### 11-3. 연결 방식

프론트는 절대 경로가 아니라 운영용 API 주소를 호출해야 합니다.

예시:

- 개발 환경: `http://localhost:3000/api/business-inquiry`
- 운영 환경: `https://your-vercel-project.vercel.app/api/business-inquiry`

즉, 프론트와 API가 서로 다른 도메인일 가능성이 높기 때문에 CORS 정책도 고려해야 합니다.

## 12. CORS와 운영 연결 주의사항

GitHub Pages와 Vercel은 기본적으로 다른 도메인입니다.

예:

- 프론트: `https://bboman21.github.io/site.hagobogo`
- API: `https://hagobogo-mail-api.vercel.app`

따라서 서버리스 함수에는 최소한 아래 대응이 필요합니다.

- 허용할 Origin 명시
- `POST` 메서드만 허용
- 필요 시 `OPTIONS` 프리플라이트 처리

이 부분을 빼먹으면 로컬에서는 되더라도 운영 환경에서 막힐 수 있습니다.

## 13. 보안 설계

최소한 아래 항목은 포함하는 것이 좋습니다.

- 서버 측 필수값 검증
- 이메일 형식 검증
- 최대 길이 제한
- 요청 빈도 제한
- 환경 변수 사용
- 사용자에게는 상세 내부 오류 노출 금지

현재 월 100건 수준이라도 스팸 요청은 얼마든지 들어올 수 있습니다.
따라서 `프론트 검증만으로 충분하다`고 보면 안 됩니다.

## 14. 1차 구현 범위

1차 구현은 아래까지만 하는 것이 적절합니다.

1. 프론트 `Save` 버튼에 API 호출 연결
2. Vercel 서버리스 함수 구현
3. Resend 메일 발송 연결
4. 성공/실패 메시지 처리
5. 최소 검증 적용

즉, 먼저 `실제로 메일 1통이 안정적으로 발송되는 구조`를 만드는 것이 목표입니다.

## 15. 2차 고도화 범위

2차에서는 아래 항목을 확장할 수 있습니다.

- rate limiting 고도화
- 봇 방지 장치 추가
- 관리자 참조 메일 추가
- 성공 후 자동 응답 메일 추가
- HTML 메일 템플릿 도입
- 문의 내역 로그 저장
- 운영 모니터링 연결

## 16. 실제 구현 단계 제안

1. Resend 계정 및 도메인 인증
2. 수신 이메일 주소와 발신 이메일 주소 확정
3. Vercel 프로젝트 생성
4. 환경 변수 등록
5. 서버리스 함수 구현
6. 프론트 API 호출 연결
7. 로컬 테스트
8. 운영 배포 테스트

## 17. 최종 권장안

현재 프로젝트에서는 아래 방식이 가장 현실적입니다.

- 프론트: GitHub Pages 유지
- 메일 API: Vercel 서버리스 함수 1개
- 메일 발송: Resend

이 조합은 아래 이유로 적절합니다.

- 현재 사이트 구조를 거의 유지할 수 있다.
- 별도 서버 운영 부담이 없다.
- 월 100건 수준 메일에는 충분하다.
- 구현과 유지보수 난이도가 비교적 낮다.

즉, `Business Inquiries` 기능을 운영 가능한 수준으로 올리는 가장 간결한 구조라고 볼 수 있습니다.
