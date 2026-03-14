# Business Inquiries Google Sheets 저장 구현 작업안

## 1. 문서 목적

이 문서는 현재 `Business Inquiries` 메일 전송 구조를 중단하고,
`Google Apps Script 웹앱 + Google Sheets 저장` 구조로 코드와 설정을 바꾸기 위한 실제 작업안을 정리한 문서입니다.

이번 문서는 설계 문서보다 더 구체적입니다.

- 어떤 파일을 수정할지
- 어떤 파일은 유지하고 어떤 파일은 역할이 바뀌는지
- 어떤 순서로 구현해야 덜 꼬이는지
- 무엇을 나중에 제거해야 하는지

를 기준으로 정리합니다.

## 2. 현재 상태 진단

현재 프로젝트는 메일 전송 기준으로 아래 구조가 이미 들어가 있습니다.

- [InquiryModal.jsx](/Users/chris/development/AntigravityWorks/site_hagobogo/src/components/InquiryModal.jsx)
  - 입력값 수집 및 제출 상태 표시
- [inquiryApi.js](/Users/chris/development/AntigravityWorks/site_hagobogo/src/lib/inquiryApi.js)
  - 프론트 API 호출 유틸
- [business-inquiry.js](/Users/chris/development/AntigravityWorks/site_hagobogo/api/business-inquiry.js)
  - Vercel 서버리스 메일 발송 함수
- [.env.example](/Users/chris/development/AntigravityWorks/site_hagobogo/.env.example)
  - Resend/Vercel 기준 예시 값
- [vercel.json](/Users/chris/development/AntigravityWorks/site_hagobogo/vercel.json)
  - Vercel 함수 설정

즉, 프론트 제출 흐름은 이미 구현되어 있고,
지금 바뀌는 핵심은 **전송 대상과 백엔드 구조**입니다.

## 3. 이번 전환의 핵심 원칙

이번 전환에서 가장 중요한 원칙은 아래 두 가지입니다.

1. 프론트 UI는 최대한 유지한다.
2. 저장 대상만 `메일 API`에서 `Apps Script 웹앱`으로 바꾼다.

즉, 팝업 레이아웃과 입력 검증은 그대로 살리고,
실제 저장 경로만 바꾸는 것이 가장 안전합니다.

## 4. 최종 목표 구조

전환 후 목표 구조는 아래와 같습니다.

```text
InquiryModal.jsx
  -> submitBusinessInquiry()
  -> Google Apps Script 웹앱 URL 호출
  -> Google Sheets에 appendRow()
```

즉, 프론트는 그대로 `submitBusinessInquiry()`를 호출하지만
그 내부 URL은 더 이상 Vercel API가 아니라 Apps Script 웹앱 URL이 됩니다.

## 5. 파일별 변경 방향

### 5-1. `src/components/InquiryModal.jsx`

유지할 부분:

- 입력 상태
- 에러 상태
- 제출 중 상태
- 성공/실패 메시지
- 자동 닫기 흐름

바뀌는 부분:

- 없음 또는 매우 적음

판단:

- 현재 `InquiryModal`은 API 종류와 강하게 결합되어 있지 않습니다.
- 따라서 이 파일은 거의 유지하는 편이 맞습니다.

즉, 이 파일은 **전환 비용이 낮은 파일**입니다.

### 5-2. `src/lib/inquiryApi.js`

가장 중요한 수정 대상입니다.

현재 역할:

- Vercel/메일 API 호출

전환 후 역할:

- Google Apps Script 웹앱 호출

필요한 수정:

- API URL 설명을 Apps Script 기준으로 정리
- 응답 파싱 로직을 Apps Script 반환 형식에 맞춤
- 필요 시 `mode`, `redirect`, `headers` 정책 검토

즉, 실제 저장 방식 전환의 핵심은 이 파일에 있습니다.

### 5-3. `api/business-inquiry.js`

현재 역할:

- Vercel 서버리스 메일 발송 함수

전환 후 역할:

- 더 이상 1차 운영 경로가 아님

처리 방향:

- 당장 삭제하지 말고, 우선 사용 중단 상태로 둡니다.
- Google Sheets 저장이 안정화된 뒤 제거 여부를 판단합니다.

비판적으로 보면:

- 바로 삭제하면 롤백 경로가 사라집니다.
- 따라서 1차 전환에서는 “사용 중단”이 맞고, “즉시 삭제”는 권장하지 않습니다.

### 5-4. `.env.example`

현재 역할:

- Resend, Vercel, 프론트 API URL 예시 포함

전환 후 역할:

- Apps Script URL 중심 예시 파일로 정리 필요

권장 방향:

- 메일 전송용 예시는 남겨두되 주석으로 구분하거나
- Google Sheets 저장 기준 예시를 우선값으로 정리

### 5-5. `.env.production.example`

이 파일은 계속 필요합니다.

이유:

- 프론트는 운영 빌드 시 `VITE_BUSINESS_INQUIRY_API_URL` 값을 알아야 하기 때문입니다.

다만 값 예시는 아래처럼 바뀝니다.

```text
VITE_BUSINESS_INQUIRY_API_URL=https://script.google.com/macros/s/XXXXXXXXXXXX/exec
```

### 5-6. `vercel.json`

전환 후에는 우선순위가 크게 낮아집니다.

처리 방향:

- 즉시 삭제하지 말고 유지
- Google Sheets 저장 방식이 안정화된 후, Vercel을 더 이상 안 쓰기로 확정되면 제거

## 6. 실제 구현 순서

### 1단계. Apps Script 응답 형식 먼저 확정

가장 먼저 해야 할 일:

- Apps Script 웹앱이 어떤 JSON을 반환할지 먼저 정해야 합니다.

권장 응답:

성공:

```json
{
  "ok": true,
  "message": "문의가 정상적으로 저장되었습니다."
}
```

실패:

```json
{
  "ok": false,
  "message": "이메일 형식이 올바르지 않습니다."
}
```

이 응답 형식을 먼저 정해놔야 프론트 수정이 간단해집니다.

### 2단계. `inquiryApi.js`를 Apps Script 기준으로 전환

이 단계에서 할 일:

- 기본 URL 설명 변경
- Apps Script 웹앱 `/exec` 주소 호출 기준으로 정리
- 응답 파싱 방식 검토

목표:

- `submitBusinessInquiry()` 함수는 그대로 쓰되, 실제 대상만 바뀌게 만들기

### 3단계. `InquiryModal.jsx`는 최소 수정

이 단계에서 할 일:

- 현재 성공/실패 UI가 Apps Script 응답과도 잘 맞는지 확인
- 필요하면 문구만 조금 조정

목표:

- UI를 흔들지 않고 저장 방식만 바꾸기

### 4단계. `.env.production.example` 값 교체

이 단계에서 할 일:

- 운영 예시를 Vercel URL에서 Apps Script `/exec` URL 예시로 변경

목표:

- 대장님이 운영 빌드를 할 때 헷갈리지 않게 만들기

### 5단계. 문서 정리

이 단계에서 할 일:

- Google Sheets 방식이 1순위라는 점을 문서에 반영
- Vercel/Resend 문서는 보조 문서로 위치 조정

## 7. 1차 구현 범위

1차 구현에서 해야 하는 최소 범위는 아래입니다.

1. Apps Script 웹앱 URL 호출 가능 상태 만들기
2. Google Sheets 저장 성공 시 성공 메시지 표시
3. 저장 실패 시 실패 메시지 표시
4. 운영 빌드 값 예시를 Apps Script 기준으로 정리

즉, “실제로 시트에 데이터가 한 줄 쌓이는 것”이 1차 완료 기준입니다.

## 8. 2차 구현 범위

Google Sheets 저장이 성공한 뒤에 아래를 검토할 수 있습니다.

- 요청 토큰 추가
- 중복 제출 방지 강화
- 관리자 처리 상태 열 추가
- 문의 ID 생성
- 저장 성공 후 시트 링크 기반 운영 흐름 정리

## 9. 삭제/정리 대상 판단 기준

아래 조건이 모두 만족되면 Vercel/Resend 관련 코드는 정리 검토가 가능합니다.

1. Apps Script 저장이 운영에서 안정적으로 동작함
2. 최소 1~2회 실제 문의 테스트가 정상 완료됨
3. Google Sheets 기반 운영이 더 적합하다는 판단이 확정됨

그 전까지는 아래를 유지하는 편이 안전합니다.

- [business-inquiry.js](/Users/chris/development/AntigravityWorks/site_hagobogo/api/business-inquiry.js)
- [vercel.json](/Users/chris/development/AntigravityWorks/site_hagobogo/vercel.json)
- Resend 관련 문서

즉, 지금은 “폐기”보다 “백업 경로 유지”가 맞습니다.

## 10. 가장 먼저 착수할 실제 코드 작업

대장님이 지금 바로 다음 단계로 가려면 가장 먼저 해야 할 실작업은 이것입니다.

1. Google Apps Script 웹앱 `doPost(e)` 코드 작성
2. `/exec` URL 확보
3. `VITE_BUSINESS_INQUIRY_API_URL`을 Apps Script URL로 넣고 프론트 연결

즉, 코드 구조 전환의 실제 출발점은 프론트가 아니라 **Apps Script 웹앱 준비**입니다.

## 11. 최종 권장안

현재 기준으로 가장 안전한 전환 순서는 아래입니다.

1. Apps Script 웹앱 준비
2. `inquiryApi.js` 전환
3. 프론트 연결 확인
4. 실제 시트 저장 테스트
5. 그 다음에야 Vercel/Resend 정리 여부 판단

이 순서를 지키면 불필요하게 현재 동작 구조를 먼저 무너뜨리지 않고 전환할 수 있습니다.
