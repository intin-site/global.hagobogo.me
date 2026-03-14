# Business Inquiries Apps Script doPost(e) 토큰 검증 2차 초안

## 1. 문서 목적

이 문서는 `Business Inquiries` 팝업 데이터를 Google Sheets에 저장하는 Apps Script 웹앱에
아주 간단한 요청 토큰 검증을 추가한 2차 초안 문서입니다.

같은 기준의 실제 코드 파일도 저장소 안에 아래 경로로 추가해 두었습니다.

`apps-script/business-inquiry/Code.gs`

목표는 아래와 같습니다.

- 아무 요청이나 바로 시트에 저장되지 않도록 한다.
- 프론트가 알고 있는 토큰과 Apps Script가 가진 토큰이 같을 때만 저장한다.
- 초보자도 이해할 수 있는 수준의 간단한 보호 장치를 먼저 넣는다.

이 문서도 실제 운영 시트 헤더를 아래 기준으로 맞춘다는 전제를 둡니다.

```text
Date | Time | Name | Job Title | Country | Company Name | Email | Inquiry
```

중요:

- 프론트 요청 본문 키는 `country`를 사용합니다.
- 실제 시트 열 제목도 `Country`로 맞춥니다.
- 즉, 요청 키와 시트 헤더 이름이 같은 방향으로 정리된 상태입니다.

## 2. 왜 토큰 검증이 필요한가

Apps Script 웹앱은 운영 시 `/exec` URL이 공개됩니다.

즉, 이 URL을 누군가 알게 되면 브라우저나 스크립트로 직접 요청을 보낼 수도 있습니다.

완벽한 보안은 아니지만, 최소한 아래 장점이 있습니다.

- 엉뚱한 요청을 한 번 더 걸러낼 수 있다.
- 내 프론트에서 보내는 요청인지 구분 기준이 하나 생긴다.
- 시트가 아무 입력으로 오염되는 것을 조금 줄일 수 있다.

비판적으로 보면 이 방식의 한계도 분명합니다.

- 프론트 코드 안에 토큰이 들어가면 결국 노출될 수 있습니다.
- 따라서 이건 “강한 보안”이 아니라 “최소한의 문지기” 수준입니다.

즉, 이 토큰 검증은 잠금장치라기보다 문 앞의 1차 확인 정도로 이해하면 맞습니다.

## 3. 권장 토큰 구조

현재 권장 방식은 아래처럼 **Script Properties에 저장된 토큰**과 비교하는 구조입니다.

- 프론트가 `requestToken` 값을 같이 보낸다.
- Apps Script가 Script Properties 안의 토큰 값과 비교한다.
- 같으면 저장
- 다르면 거부

예시:

```text
requestToken=REPLACE_WITH_NEW_REQUEST_TOKEN
```

중요:

- 이 값은 너무 짧지 않게 만드는 것이 좋습니다.
- 사람이 추측하기 쉬운 값은 피하는 편이 좋습니다.

## 4. 프론트에서 보내는 요청 본문 예시

토큰을 포함한 요청 JSON 예시는 아래와 같습니다.

```json
{
  "name": "홍길동",
  "title": "Marketing Manager",
  "country": "South Korea",
  "companyName": "ABC Inc.",
  "email": "hello@example.com",
  "inquiry": "문의 내용",
  "language": "EN",
  "submittedAt": "2026-03-01T14:00:00.000Z",
  "requestToken": "REPLACE_WITH_NEW_REQUEST_TOKEN"
}
```

즉, 기존 요청 본문에 `requestToken`만 하나 더 붙는 구조입니다.

## 5. Apps Script Code.gs 2차 초안

아래 코드는 `Code.gs`에 넣는 2차 초안입니다.

```javascript
const SHEET_NAME = 'Business Inquiries List';
const MAX_INQUIRY_LENGTH = 3000;
const SCRIPT_TIME_ZONE = 'Asia/Seoul';
const REQUEST_TOKEN_PROPERTY_KEY = 'BUSINESS_INQUIRY_REQUEST_TOKEN';

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      message: 'Business Inquiries Apps Script is running.'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        ok: false,
        code: 'EMPTY_BODY',
        message: '요청 본문이 비어 있습니다.'
      });
    }

    const payload = JSON.parse(e.postData.contents);
    const validationError = validatePayload(payload);

    if (validationError) {
      return createJsonResponse(validationError);
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    const submittedAt = parseSubmittedAt(payload.submittedAt);

    if (!sheet) {
      return createJsonResponse({
        ok: false,
        code: 'SHEET_NOT_FOUND',
        message: '대상 시트를 찾을 수 없습니다.'
      });
    }

    sheet.appendRow([
      formatDateCell(submittedAt),
      formatTimeCell(submittedAt),
      payload.name.trim(),
      payload.title ? payload.title.trim() : '',
      payload.country.trim(),
      payload.companyName.trim(),
      payload.email.trim(),
      payload.inquiry.trim()
    ]);

    return createJsonResponse({
      ok: true,
      code: 'INQUIRY_SAVED',
      message: '문의가 정상적으로 저장되었습니다.'
    });
  } catch (error) {
    return createJsonResponse({
      ok: false,
      code: 'UNEXPECTED_ERROR',
      message: error && error.message ? error.message : '알 수 없는 오류가 발생했습니다.'
    });
  }
}

function validatePayload(payload) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const expectedRequestToken = getExpectedRequestToken();

  if (!payload || typeof payload !== 'object') {
    return {
      ok: false,
      code: 'INVALID_PAYLOAD',
      message: '잘못된 요청 형식입니다.'
    };
  }

  if (!expectedRequestToken) {
    return {
      ok: false,
      code: 'MISSING_REQUEST_TOKEN_CONFIG',
      message: '요청 토큰 설정값이 없습니다.'
    };
  }

  if (!payload.requestToken || payload.requestToken !== expectedRequestToken) {
    return {
      ok: false,
      code: 'INVALID_REQUEST_TOKEN',
      message: '유효하지 않은 요청입니다.'
    };
  }

  if (!payload.name || !payload.name.trim()) {
    return {
      ok: false,
      code: 'REQUIRED_NAME',
      message: '이름은 필수입니다.'
    };
  }

  if (!payload.country || !payload.country.trim()) {
    return {
      ok: false,
      code: 'REQUIRED_COUNTRY',
      message: '국가는 필수입니다.'
    };
  }

  if (!payload.companyName || !payload.companyName.trim()) {
    return {
      ok: false,
      code: 'REQUIRED_COMPANY_NAME',
      message: '회사명은 필수입니다.'
    };
  }

  if (!payload.email || !payload.email.trim()) {
    return {
      ok: false,
      code: 'REQUIRED_EMAIL',
      message: '이메일은 필수입니다.'
    };
  }

  if (!emailPattern.test(payload.email.trim())) {
    return {
      ok: false,
      code: 'INVALID_EMAIL',
      message: '이메일 형식이 올바르지 않습니다.'
    };
  }

  if (!payload.inquiry || !payload.inquiry.trim()) {
    return {
      ok: false,
      code: 'REQUIRED_INQUIRY',
      message: '문의 내용은 필수입니다.'
    };
  }

  if (payload.inquiry.length > MAX_INQUIRY_LENGTH) {
    return {
      ok: false,
      code: 'INQUIRY_TOO_LONG',
      message: '문의 내용이 최대 길이를 초과했습니다.'
    };
  }

  return null;
}

function createJsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getExpectedRequestToken() {
  const value = PropertiesService
    .getScriptProperties()
    .getProperty(REQUEST_TOKEN_PROPERTY_KEY);

  return value ? value.trim() : '';
}

function parseSubmittedAt(value) {
  if (!value) {
    return new Date();
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date();
  }

  return parsedDate;
}

function formatDateCell(date) {
  return Utilities.formatDate(date, SCRIPT_TIME_ZONE, 'yyyy-MM-dd');
}

function formatTimeCell(date) {
  return Utilities.formatDate(date, SCRIPT_TIME_ZONE, 'HH:mm:ss');
}
```

## 5-1. 날짜/시간 저장 기준

이 2차 초안도 시트 저장 시간대는 **한국 시간대 `Asia/Seoul`**로 고정합니다.

정리하면 아래와 같습니다.

- `Date` 열: `yyyy-MM-dd`
- `Time` 열: `HH:mm:ss`
- 기준 시간대: `Asia/Seoul`

즉, 프론트가 `submittedAt`을 ISO 문자열로 보내더라도 시트에는 한국 시간 기준 날짜와 시간으로 나뉘어 저장됩니다.

또한 `submittedAt` 값이 비어 있거나 잘못된 형식이면 현재 시각으로 안전하게 대체하도록 예시 코드를 보강했습니다.

혼동을 줄이려면 Apps Script 프로젝트 설정 시간대도 `Asia/Seoul`로 맞추는 것을 권장합니다.

## 6. 대장님이 꼭 수정해야 하는 값

### 6-1. `SHEET_NAME`

```javascript
const SHEET_NAME = 'Business Inquiries List';
```

실제 시트 탭 이름과 같아야 합니다.

### 6-2. Script Properties의 요청 토큰 값

```javascript
const REQUEST_TOKEN_PROPERTY_KEY = 'BUSINESS_INQUIRY_REQUEST_TOKEN';
```

실제 토큰 문자열은 코드에 직접 적지 않고 Script Properties에 넣는 것을 권장합니다.

권장:

- 길게 만든다
- 추측하기 어렵게 만든다
- 너무 쉬운 단어 조합은 피한다

예시 값:

```text
REPLACE_WITH_NEW_REQUEST_TOKEN
```

설정 순서:

1. Apps Script 편집기에서 `프로젝트 설정`으로 이동합니다.
2. `스크립트 속성` 또는 `Script Properties` 영역을 엽니다.
3. 아래 키와 값을 추가합니다.

```text
키: BUSINESS_INQUIRY_REQUEST_TOKEN
값: REPLACE_WITH_NEW_REQUEST_TOKEN
```

## 7. 프론트에서 함께 바꿔야 하는 부분

Apps Script에 토큰을 추가했으면 프론트도 같은 값을 보내야 합니다.

즉, 나중에 프론트 코드에서는 아래와 같은 구조가 필요합니다.

```javascript
{
  ...formValues,
  language,
  submittedAt: new Date().toISOString(),
  requestToken: 'REPLACE_WITH_NEW_REQUEST_TOKEN'
}
```

즉, 프론트와 Apps Script가 같은 토큰을 알아야 합니다.

추가로 이 문서 기준에서는 `country`도 필수값입니다.

즉, 프론트와 Apps Script가 둘 다 `country`를 비어 있지 않은 값으로 받는 기준을 맞춰야 합니다.

## 8. 이 방식의 한계

이 토큰은 프론트 코드 안에 들어가기 때문에,
원칙적으로는 완전한 비밀값이 아닙니다.

따라서 이 방식은:

- 강한 보안 수단이 아님
- 최소한의 필터 역할만 함

정도로 이해해야 합니다.

즉, 완벽한 방어는 아니지만
“아무 요청이나 바로 시트에 쌓이는 상태”보다는 한 단계 낫습니다.

## 9. 언제 이 방식이 적절한가

이 토큰 방식은 아래 조건에서 적절합니다.

- 문의 수가 많지 않다
- 빠르게 1차 운영을 열고 싶다
- 정교한 백엔드 보안은 아직 과하다
- 최소한의 방어선은 필요하다

즉, 지금 대장님 상황에는 현실적인 2차 보호 장치입니다.

## 10. 배포 전 체크리스트

1. `SHEET_NAME` 수정 완료
2. Script Properties 요청 토큰 설정 완료
3. 프론트에도 같은 토큰을 넣을 준비 완료
4. `Code.gs` 저장 완료
5. `배포 > 새 배포 > 웹 앱` 재배포 완료
6. `/exec` URL 유지 또는 새 URL 확인 완료

## 11. 테스트 방법

### 11-1. 정상 테스트

1. 프론트가 올바른 `requestToken`을 보내게 한다.
2. 팝업에서 값을 입력하고 `Save`를 누른다.
3. 시트에 새 행이 추가되는지 확인한다.

### 11-2. 실패 테스트

1. 일부러 잘못된 토큰을 보낸다.
2. `Save`를 누른다.
3. 시트에 새 행이 추가되지 않아야 한다.
4. 응답은 `INVALID_REQUEST_TOKEN` 계열이어야 한다.

## 12. 다음 단계

이 문서 다음으로 가장 자연스러운 작업은 아래 둘 중 하나입니다.

1. 프론트 `inquiryApi.js`와 `InquiryModal.jsx`에 `requestToken`을 실제로 넣는 코드 수정
2. Apps Script의 토큰을 코드 상수 대신 Script Properties로 옮기는 3차 고도화
