# Business Inquiries Google Sheets 저장 한 장 체크리스트

## 1. 이 문서의 목적

이 문서는 `Business Inquiries` 팝업 입력 내용을 Google Sheets에 저장하기 위해,
대장님이 실제로 해야 할 일을 한 장으로 정리한 체크리스트입니다.

이 문서에서 정리하는 내용:

- Google Sheets를 어떻게 준비하는지
- Google Apps Script에서 무엇을 클릭해야 하는지
- 어떤 열을 만들어야 하는지
- Apps Script 웹앱을 어떻게 배포하는지
- 마지막으로 어떻게 테스트하는지

## 2. 먼저 준비할 것

- Google 계정
- Google Drive 접근 가능 상태
- 새 Google Sheets 파일 1개
- `Business Inquiries` 팝업에서 저장할 열 구조 결정

## 3. Google Sheets 먼저 만들기

### 3-1. 시트 파일 만들기

1. Google Drive로 갑니다.
2. `새로 만들기`를 누릅니다.
3. `Google 스프레드시트`를 누릅니다.
4. 파일 이름을 예를 들어 `HAGOBOGO Business Inquiries`로 정합니다.

### 3-2. 첫 행 헤더 만들기

첫 줄에 아래 헤더를 넣는 것을 권장합니다.

```text
Date | Time | Name | Job Title | Country | Company Name | Email | Inquiry
```

이렇게 하면 나중에 데이터가 아래 행부터 계속 쌓입니다.

참고:

- 프론트에서는 `country` 키로 값을 보냅니다.
- 실제 운영 시트 열 제목도 `Country`로 통일합니다.
- 즉, 코드 키와 시트 헤더가 같은 의미로 정리된 상태입니다.

### 3-3. `Country` 필드는 필수로 본다

이 체크리스트 기준에서는 `Country`를 선택값이 아니라 필수값으로 보는 것을 권장합니다.

이유:

- 어느 국가에서 들어온 문의인지 알아야 담당자 배정이 쉬워집니다.
- 언어와 시차 대응 기준을 잡는 데 도움이 됩니다.
- B2B 문의에서 국가 정보가 없으면 후속 연락 품질이 떨어질 수 있습니다.

## 4. Apps Script 프로젝트 만들기

### 4-1. 실제로 눌러야 하는 순서

1. 방금 만든 Google Sheets 파일을 엽니다.
2. 상단 메뉴에서 `확장 프로그램`을 누릅니다.
3. `Apps Script`를 누릅니다.
4. 새 탭이 열리면 프로젝트 이름을 정합니다.
   - 예: `BusinessInquiriesSheetReceiver`

이렇게 하면 이 스프레드시트에 연결된 Apps Script 프로젝트가 생성됩니다.

## 5. Apps Script에서 구현해야 할 것

핵심은 아래 두 가지입니다.

1. `doPost(e)` 함수 만들기
2. 시트에 `appendRow()`로 한 줄 저장하기

공식 문서 기준으로:

- `doPost(e)`는 POST 요청을 받을 수 있습니다.  
  출처: [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)

- `appendRow()`는 마지막 줄 아래에 새 행을 추가합니다.  
  출처: [Sheet.appendRow](https://developers.google.com/apps-script/reference/spreadsheet/sheet#append-row-row-contents)

## 6. Apps Script에서 실제로 클릭할 순서

### 6-1. 코드 작성

1. 기본으로 열리는 `Code.gs` 파일을 엽니다.
2. 기본 예제 코드를 지우고 `doPost(e)` 기반 코드로 바꿉니다.
3. 저장합니다.

### 6-2. 웹앱으로 배포

1. 오른쪽 위 `배포`를 누릅니다.
2. `새 배포`를 누릅니다.
3. `유형 선택`에서 `웹 앱`을 선택합니다.
4. 설명을 입력합니다.
   - 예: `Business Inquiries Receiver`
5. 아래 두 항목을 확인합니다.
   - 실행 계정: `나`
   - 액세스 권한: `모든 사용자`
6. `배포`를 누릅니다.

공식 문서 기준으로 배포 흐름은 `Deploy > New deployment > Web app > Deploy`입니다.  
출처: [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)

### 6-3. 웹앱 URL 복사

배포가 끝나면 `/exec`로 끝나는 URL이 나옵니다.

예:

```text
https://script.google.com/macros/s/XXXXXXXXXXXX/exec
```

이 주소가 프론트가 호출할 실제 저장 API 주소입니다.

## 7. Apps Script 권한 설정 권장값

초기 1차 구현 기준으로는 아래를 권장합니다.

- 실행 계정: `나`
- 액세스 권한: `모든 사용자`

이유:

- GitHub Pages 사이트 방문자는 로그인된 Google 사용자가 아닐 수도 있습니다.
- 따라서 공개 폼처럼 받으려면 접근 권한을 넓혀야 합니다.
- 대신 실제 시트에 쓰는 권한은 스크립트 소유자 권한으로 처리하는 것이 단순합니다.

## 8. 프론트에서 필요한 값

프론트에는 Apps Script 웹앱 URL이 필요합니다.

예시:

```text
VITE_BUSINESS_INQUIRY_API_URL=https://script.google.com/macros/s/XXXXXXXXXXXX/exec
```

즉, 지금 Vercel 주소를 넣던 자리에 Apps Script 웹앱 URL을 넣으면 됩니다.

## 9. 운영 빌드 예시

```bash
VITE_BUSINESS_INQUIRY_API_URL=https://script.google.com/macros/s/XXXXXXXXXXXX/exec npm run build
```

이렇게 빌드하면 GitHub Pages 프론트가 Apps Script 웹앱으로 문의 데이터를 보내게 됩니다.

## 10. 운영 테스트 절차

1. 시트 헤더가 제대로 들어 있는지 확인합니다.
2. Apps Script 웹앱이 배포되었는지 확인합니다.
3. 웹앱 URL을 프론트 빌드 값에 넣고 다시 빌드합니다.
4. GitHub Pages에 최신 `dist`를 반영합니다.
5. 사이트에서 `Business Inquiries` 팝업을 엽니다.
6. 테스트 데이터를 입력하고 `Country`도 선택한 뒤 `Save`를 누릅니다.
7. 성공 메시지가 뜨는지 확인합니다.
8. Google Sheets에 새 행이 추가됐는지 확인합니다.

## 11. 가장 자주 하는 실수

### 실수 1. 시트 헤더 없이 시작하는 것

이러면 나중에 어떤 열이 무엇인지 헷갈립니다.

### 실수 2. `/dev` 테스트 URL을 운영에 넣는 것

공식 문서 기준으로 `/dev` URL은 편집 권한이 있는 사용자만 테스트용으로 접근할 수 있습니다.  
운영에는 `/exec` URL을 써야 합니다.  
출처: [Apps Script Web Apps - Test deployments](https://developers.google.com/apps-script/guides/web)

### 실수 3. 웹앱 권한을 너무 좁게 두는 것

이 경우 실제 사용자 브라우저에서 저장이 안 될 수 있습니다.

## 12. 최종 확인용 한 줄 체크

아래 네 가지가 모두 되면 Google Sheets 저장 방식이 동작할 가능성이 높습니다.

- Google Sheets 파일 생성 완료
- 헤더 행 생성 완료
- Apps Script 웹앱 `/exec` URL 확보
- 프론트 빌드에 웹앱 URL 반영 완료
