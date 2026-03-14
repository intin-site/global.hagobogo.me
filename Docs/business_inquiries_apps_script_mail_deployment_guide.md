# Business Inquiries Apps Script 메일 발송 배포 가이드

## 1. 이 문서의 목적

이 문서는 `Business Inquiries` 문의가 들어왔을 때

1. Google Sheets에 저장하고
2. 특정 이메일로 알림 메일을 보내고
3. 시트의 `Status` 열에 메일 전송 결과를 남기도록

Google Apps Script를 실제 운영용으로 배포하는 방법을
초보자 기준으로 한 장에 정리한 문서입니다.

이 문서만 따라 하면 아래 흐름을 만들 수 있습니다.

```text
사이트 문의 제출
-> Google Apps Script 웹앱 호출
-> Google Sheets에 한 줄 저장
-> 관리자 이메일로 알림 메일 발송
-> 시트 Status 열에 성공/실패 기록
```

## 2. 먼저 알아둘 핵심

- 시트 이름은 `Business Inquiries List` 여야 합니다.
- 시트 첫 줄에는 헤더가 있어야 합니다.
- `Status` 열은 이미 대장님이 추가했다고 했으므로 그대로 사용합니다.
- 수신 이메일 주소는 코드에 직접 쓰지 않고 `Script Properties`에 넣습니다.
- 마지막에는 반드시 `웹 앱`으로 다시 배포해야 실제 사이트에 반영됩니다.

## 3. 시트 헤더 확인

`Hagobogo Business Inquiries contents` 파일의
`Business Inquiries List` 탭 첫 줄이 아래처럼 되어 있는지 확인합니다.

```text
Date | Time | Name | Job Title | Country | Company Name | Email | Inquiry | Status
```

중요한 점:

- `Status` 열 이름은 정확히 `Status` 로 씁니다.
- 위치는 맨 끝이 가장 이해하기 쉽습니다.
- 이미 `Status` 열이 있으면 새로 만들 필요는 없습니다.

## 4. Apps Script에서 할 일 요약

이번 최종 코드는 아래를 처리합니다.

1. 문의 데이터가 비어 있지 않은지 검사
2. 이메일 형식이 맞는지 검사
3. 같은 이메일이 120초 안에 반복 접수되면 차단
4. 시트에 문의 내용 저장
5. 관리자 메일 발송
6. `Status` 열에 `메일 발송 성공` 또는 실패 사유 기록
7. 브라우저에 저장 성공 여부와 메일 성공 여부를 따로 응답

## 5. Apps Script에 넣을 최종 코드

Google Sheets에서 `확장 프로그램 > Apps Script` 로 들어간 뒤
기존 `Code.gs` 내용을 모두 지우고 아래 코드로 교체합니다.

```javascript
const SHEET_NAME = 'Business Inquiries List';
const MAX_INQUIRY_LENGTH = 3000;
const SCRIPT_TIME_ZONE = 'Asia/Seoul';
const NOTIFICATION_EMAIL_PROPERTY_KEY = 'BUSINESS_INQUIRY_NOTIFICATION_EMAIL';
const STATUS_HEADER_NAME = 'Status';
const DUPLICATE_SUBMISSION_WINDOW_SECONDS = 120;

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
    const spamError = checkSpamRisk(payload);

    if (validationError) {
      return createJsonResponse(validationError);
    }

    if (spamError) {
      return createJsonResponse(spamError);
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

    const statusColumnIndex = getStatusColumnIndex(sheet);

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

    const savedRowIndex = sheet.getLastRow();
    const mailResult = sendNotificationEmail(payload, submittedAt);

    updateStatusCell(sheet, savedRowIndex, statusColumnIndex, mailResult.statusText);
    markSubmissionCache(payload);

    return createJsonResponse({
      ok: true,
      code: mailResult.ok ? 'INQUIRY_SAVED_AND_EMAILED' : 'INQUIRY_SAVED_BUT_EMAIL_FAILED',
      message: mailResult.ok
        ? '문의가 시트에 저장되었고 메일도 정상 발송되었습니다.'
        : '문의는 시트에 저장되었지만 메일 발송은 실패했습니다.',
      sheetSaved: true,
      emailSent: mailResult.ok,
      emailStatus: mailResult.statusText
    });
  } catch (error) {
    return createJsonResponse({
      ok: false,
      code: 'UNEXPECTED_ERROR',
      message: error && error.message ? error.message : '알 수 없는 오류가 발생했습니다.'
    });
  }
}

function sendNotificationEmail(payload, submittedAt) {
  const notificationEmail = getNotificationEmail();

  if (!notificationEmail) {
    return {
      ok: false,
      statusText: '메일 발송 실패: 수신 이메일 설정이 없습니다.'
    };
  }

  const subject = `[HAGOBOGO] New Business Inquiry from ${payload.companyName}`;
  const formattedDate = Utilities.formatDate(submittedAt, SCRIPT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');

  const body = `
새로운 비즈니스 문의가 접수되었습니다.

[접수 일시] ${formattedDate}
[이름] ${payload.name}
[직함] ${payload.title || 'N/A'}
[국가] ${payload.country}
[회사명] ${payload.companyName}
[이메일] ${payload.email}

[문의 내용]
${payload.inquiry}

---
본 메일은 HAGOBOGO Business Inquiries 시스템에서 자동 발송되었습니다.
구글 시트에서 상세 내용을 확인하세요.
  `;

  try {
    MailApp.sendEmail({
      to: notificationEmail,
      subject: subject,
      body: body
    });

    return {
      ok: true,
      statusText: '메일 발송 성공'
    };
  } catch (e) {
    console.error('이메일 발송 실패:', e.toString());

    return {
      ok: false,
      statusText: `메일 발송 실패: ${truncateStatusMessage(e && e.message ? e.message : e.toString())}`
    };
  }
}

function getNotificationEmail() {
  return PropertiesService
    .getScriptProperties()
    .getProperty(NOTIFICATION_EMAIL_PROPERTY_KEY);
}

function getStatusColumnIndex(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headerValues = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

  for (let index = 0; index < headerValues.length; index += 1) {
    if (String(headerValues[index]).trim().toLowerCase() === STATUS_HEADER_NAME.toLowerCase()) {
      return index + 1;
    }
  }

  const newColumnIndex = lastColumn + 1;
  sheet.getRange(1, newColumnIndex).setValue(STATUS_HEADER_NAME);

  return newColumnIndex;
}

function updateStatusCell(sheet, rowIndex, columnIndex, statusText) {
  sheet.getRange(rowIndex, columnIndex).setValue(statusText);
}

function checkSpamRisk(payload) {
  const email = payload && payload.email ? payload.email.trim().toLowerCase() : '';

  if (!email) {
    return null;
  }

  const cache = CacheService.getScriptCache();
  const duplicateKey = `inquiry:${email}`;
  const recentSubmission = cache.get(duplicateKey);

  if (recentSubmission) {
    return {
      ok: false,
      code: 'TOO_MANY_REQUESTS',
      message: '같은 이메일로 너무 짧은 시간 안에 반복 접수되고 있습니다. 잠시 후 다시 시도해 주세요.'
    };
  }

  return null;
}

function markSubmissionCache(payload) {
  const email = payload && payload.email ? payload.email.trim().toLowerCase() : '';

  if (!email) {
    return;
  }

  CacheService
    .getScriptCache()
    .put(`inquiry:${email}`, '1', DUPLICATE_SUBMISSION_WINDOW_SECONDS);
}

function truncateStatusMessage(message) {
  if (!message) {
    return '알 수 없는 오류';
  }

  return String(message).replace(/\s+/g, ' ').trim().slice(0, 200);
}

function validatePayload(payload) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!payload || typeof payload !== 'object') {
    return {
      ok: false,
      code: 'INVALID_PAYLOAD',
      message: '잘못된 요청 형식입니다.'
    };
  }

  if (!isNonEmptyString(payload.name)) {
    return {
      ok: false,
      code: 'REQUIRED_NAME',
      message: '이름은 필수입니다.'
    };
  }

  if (!isNonEmptyString(payload.country)) {
    return {
      ok: false,
      code: 'REQUIRED_COUNTRY',
      message: '국가는 필수입니다.'
    };
  }

  if (!isNonEmptyString(payload.companyName)) {
    return {
      ok: false,
      code: 'REQUIRED_COMPANY_NAME',
      message: '회사명은 필수입니다.'
    };
  }

  if (!isNonEmptyString(payload.email)) {
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

  if (!isNonEmptyString(payload.inquiry)) {
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

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
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

function createJsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 6. Script Properties 설정 방법

위 코드만 붙여넣어서는 아직 메일이 가지 않습니다.
수신 이메일 주소를 Apps Script 설정값에 넣어야 합니다.

### 6-1. 어디를 눌러야 하나

1. Apps Script 화면 왼쪽에서 `프로젝트 설정`을 누릅니다.
2. 아래로 내려가 `스크립트 속성` 또는 `Script Properties` 영역을 찾습니다.
3. `스크립트 속성 추가`를 누릅니다.

### 6-2. 어떤 값을 넣어야 하나

아래처럼 넣습니다.

```text
속성 이름: BUSINESS_INQUIRY_NOTIFICATION_EMAIL
값: 알림을 받을 실제 이메일 주소
```

예:

```text
BUSINESS_INQUIRY_NOTIFICATION_EMAIL = bboman21@gmail.com
```

중요:

- 속성 이름 철자는 반드시 `BUSINESS_INQUIRY_NOTIFICATION_EMAIL` 이어야 합니다.
- 오타가 나면 시트에는 저장되지만 메일은 실패할 수 있습니다.

## 7. 저장 후 꼭 해야 하는 것

1. Apps Script에서 `저장`을 누릅니다.
2. 상단의 `실행` 버튼은 굳이 누르지 않아도 됩니다.
3. 처음 메일 기능을 쓰는 경우 권한 승인 창이 뜰 수 있습니다.
4. 이 경우 본인 계정으로 로그인하고 권한을 승인합니다.

쉽게 말하면:

- 코드 저장
- 수신 이메일 설정
- 권한 승인

이 세 가지가 끝나야 실제 운영 준비가 됩니다.

## 8. 웹 앱으로 다시 배포하는 방법

코드를 바꿨으면 예전 배포가 자동으로 바뀌지 않을 수 있습니다.
그래서 다시 배포해야 합니다.

### 8-1. 클릭 순서

1. Apps Script 오른쪽 위 `배포`를 누릅니다.
2. `배포 관리` 또는 `새 배포`를 누릅니다.
3. 기존 웹앱이 있다면 새 버전으로 업데이트합니다.
4. 유형은 `웹 앱`이어야 합니다.
5. 아래 값을 확인합니다.

```text
실행 계정: 나
액세스 권한: 모든 사용자
```

6. `배포` 또는 `업데이트`를 누릅니다.

### 8-2. 어떤 URL을 써야 하나

운영에는 `/exec` 로 끝나는 URL을 사용합니다.

예:

```text
https://script.google.com/macros/s/XXXXXXXXXXXX/exec
```

`/dev` 주소는 테스트용이라 운영 사이트에는 쓰지 않는 것이 안전합니다.

## 9. 프론트 쪽 확인

현재 프로젝트는 `.env.local`, `.env.production` 의
`VITE_BUSINESS_INQUIRY_API_URL` 값을 Apps Script 웹앱 주소로 사용합니다.

즉, 최종적으로 확인할 것은 이것입니다.

```text
VITE_BUSINESS_INQUIRY_API_URL=https://script.google.com/macros/s/XXXXXXXXXXXX/exec
```

웹앱 URL이 바뀌었다면 프론트도 다시 빌드해야 합니다.

## 10. 테스트 순서

아래 순서대로 하면 가장 덜 헷갈립니다.

1. `Business Inquiries List` 탭에 `Status` 열이 있는지 확인합니다.
2. Apps Script에 최종 코드를 붙여넣습니다.
3. `BUSINESS_INQUIRY_NOTIFICATION_EMAIL` 속성을 저장합니다.
4. 웹앱을 다시 배포합니다.
5. 사이트에서 `Business Inquiries` 팝업을 엽니다.
6. 테스트 문의를 한 번 제출합니다.
7. 시트에 새 행이 생겼는지 확인합니다.
8. `Status` 열이 `메일 발송 성공`인지 확인합니다.
9. 실제 수신 메일함에 알림 메일이 왔는지 확인합니다.

## 11. 실패했을 때 어디를 보면 되나

### 11-1. 시트에는 저장됐는데 메일이 안 온다

가장 먼저 `Status` 열을 봅니다.

- `메일 발송 성공`
  - 메일은 보냈다는 뜻입니다.
  - 스팸함이나 프로모션함을 확인합니다.

- `메일 발송 실패: 수신 이메일 설정이 없습니다.`
  - Script Properties 설정이 빠졌다는 뜻입니다.

- `메일 발송 실패: ...`
  - 뒤에 적힌 문구를 보면 원인을 좁힐 수 있습니다.

### 11-2. 시트에도 안 들어간다

아래를 확인합니다.

- 시트 이름이 `Business Inquiries List` 와 정확히 같은지
- 웹앱이 다시 배포되었는지
- 프론트가 올바른 `/exec` URL을 보고 있는지

### 11-3. 같은 테스트 메일이 바로 또 안 된다

정상일 수 있습니다.
이번 코드에는 같은 이메일이 120초 안에 반복 접수되면 막는 장치가 있습니다.

즉:

- 같은 이메일로 바로 또 보내면 차단될 수 있습니다.
- 2분 정도 뒤 다시 시도하거나 다른 테스트 이메일로 확인하면 됩니다.

## 12. 가장 자주 하는 실수

1. `Status` 열 이름을 다르게 적는 것
2. Script Properties 이름을 틀리게 적는 것
3. 코드 저장만 하고 웹앱 재배포를 안 하는 것
4. `/dev` 주소를 운영에 넣는 것
5. 권한 승인 창을 끝까지 완료하지 않는 것

## 13. 최종 체크

아래 다섯 가지가 맞으면 운영 준비가 거의 끝난 상태입니다.

- `Business Inquiries List` 탭 존재
- `Status` 열 존재
- `Code.gs` 최종 코드 반영 완료
- `BUSINESS_INQUIRY_NOTIFICATION_EMAIL` 설정 완료
- `/exec` 웹앱 URL 기준으로 재배포 완료

## 14. 참고 파일

- [Code.gs](/Users/chris/development/AntigravityWorks/site_hagobogo/apps-script/business-inquiry/Code.gs)
- [business_inquiries_google_sheets_checklist.md](/Users/chris/development/AntigravityWorks/site_hagobogo/Docs/business_inquiries_google_sheets_checklist.md)
