# Business Inquiries Google Sheets 저장 구조 설계서

## 1. 문서 목적

이 문서는 `Business Inquiries` 팝업에 입력된 내용을 메일 대신 Google Drive에 있는 Google Sheets에 저장하기 위한 구조를 설계한 문서입니다.

목표는 아래와 같습니다.

- 사용자가 팝업에 문의 내용을 입력한다.
- 프론트엔드가 Google Apps Script 웹앱으로 데이터를 보낸다.
- Apps Script가 지정된 Google Sheets에 한 줄씩 저장한다.
- 관리자는 메일함이 아니라 Google Sheets에서 문의 내역을 본다.

즉, 메일 발송 기능을 중단하고 `문의 데이터 저장` 중심으로 운영 구조를 바꾸는 방향입니다.

## 2. 왜 이 방식이 적절한가

현재 규모에서는 아래 이유로 Google Sheets 저장 방식이 충분히 현실적입니다.

- 문의 건수가 아주 많지 않다면 시트로 관리하기 쉽다.
- 메일 발송보다 초기 설정이 단순할 수 있다.
- Google Drive 안에서 데이터가 바로 정리된다.
- 운영자가 스프레드시트에서 정렬, 필터, 검색을 바로 할 수 있다.

비판적으로 보면 한계도 있습니다.

- 스팸 요청이 많아지면 Sheets만으로 관리가 번거로워질 수 있다.
- 데이터베이스만큼 구조적이지 않다.
- 공개 웹앱으로 잘못 열면 외부 요청을 쉽게 받을 수 있다.

하지만 현재 `Business Inquiries` 목적에는 충분히 맞는 선택지입니다.

## 3. 전체 구조

전체 구조는 아래와 같습니다.

```text
사용자 브라우저
  -> Business Inquiries 팝업 입력
  -> Google Apps Script 웹앱으로 POST

Google Apps Script 웹앱
  -> 요청 본문 파싱
  -> 필수값 검증
  -> Google Sheets에 행 추가
  -> 성공/실패 응답 반환

Google Sheets
  -> 문의 데이터 한 줄씩 저장
```

## 4. 공식 문서 기준 근거

Google 공식 문서 기준으로 아래 흐름이 가능합니다.

- Apps Script 웹앱은 `doPost(e)`로 POST 요청을 받을 수 있습니다.  
  출처: [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)

- Apps Script는 Google Sheets의 `appendRow()`로 마지막 줄 아래에 데이터를 추가할 수 있습니다.  
  출처: [Sheet.appendRow](https://developers.google.com/apps-script/reference/spreadsheet/sheet#append-row-row-contents)

- 웹앱은 배포 시 “실행 주체”를 스크립트 소유자로 설정할 수 있습니다.  
  출처: [Apps Script Web Apps - Permissions](https://developers.google.com/apps-script/guides/web)

## 5. 권장 아키텍처

현재 프로젝트 기준 권장 구조는 아래와 같습니다.

- 프론트엔드: 현재 GitHub Pages 유지
- 저장 API 역할: Google Apps Script 웹앱
- 데이터 저장소: Google Sheets

즉, Vercel과 Resend를 쓰는 대신 아래 구조로 단순화할 수 있습니다.

`GitHub Pages -> Apps Script 웹앱 -> Google Sheets`

## 6. 데이터 흐름

1. 사용자가 `Business Inquiries` 팝업을 연다.
2. 사용자가 아래 필드를 입력한다.
   - Name
   - Job Title
   - Country
   - Company Name
   - Email
   - Inquiry
3. 프론트엔드가 Apps Script 웹앱 URL로 `POST` 요청을 보낸다.
4. Apps Script가 본문을 읽는다.
5. 필수값 검증 후 Google Sheets에 한 줄 추가한다.
6. 성공 또는 실패 JSON을 프론트에 반환한다.
7. 프론트는 사용자에게 성공/실패 메시지를 보여준다.

## 7. Google Sheets에 저장할 열 구조

권장 열 순서는 아래와 같습니다.

1. Date
2. Time
3. Name
4. Job Title
5. Country
6. Company Name
7. Email
8. Inquiry

예시:

```text
2026-03-01 | 14:00:00 | Chris | Marketing Manager | South Korea | ABC Inc. | hello@example.com | 문의 내용
```

이 구조가 좋은 이유:

- 날짜와 시간을 분리해 보면 정렬과 확인이 더 쉽다.
- 국가 기준으로 리드를 분류하거나 담당자를 나누기 쉽다.
- 회사명, 이메일, 문의 내용을 한 줄에서 바로 볼 수 있다.

참고:

- 프론트 payload 키 이름은 `country`를 유지합니다.
- 실제 시트 헤더도 운영 파일 기준에 맞춰 `Country`를 사용합니다.

## 8. Apps Script 웹앱 역할

Apps Script 웹앱은 실제 백엔드 역할을 맡습니다.

주요 책임:

- `doPost(e)` 구현
- 요청 본문 JSON 파싱
- 필수값 검증
- 이메일 형식 검증
- 길이 제한 검증
- Google Sheets `appendRow()` 호출
- JSON 응답 반환

즉, 메일 발송 대신 “Google Sheets에 쓰기”가 핵심 책임이 됩니다.

## 9. 프론트엔드 역할

프론트는 아래 역할만 유지하면 됩니다.

- 팝업 입력값 수집
- 1차 유효성 검사
- 제출 상태 표시
- Apps Script 웹앱 URL로 POST
- 성공/실패 메시지 표시

즉 현재 [InquiryModal.jsx](/Users/chris/development/AntigravityWorks/site_hagobogo/src/components/InquiryModal.jsx) 구조는 크게 유지하고, API 대상만 바꾸면 됩니다.

## 10. 권장 요청 본문

프론트에서 보내는 JSON 예시는 아래와 같습니다.

```json
{
  "name": "홍길동",
  "title": "Marketing Manager",
  "companyName": "ABC Inc.",
  "email": "hello@example.com",
  "inquiry": "문의 내용",
  "language": "EN",
  "submittedAt": "2026-03-01T14:00:00.000Z"
}
```

## 11. Apps Script 저장 로직 개요

Apps Script에서는 대략 아래 흐름으로 처리합니다.

1. `doPost(e)` 실행
2. `e.postData.contents` 읽기
3. JSON 파싱
4. 스프레드시트 열기
5. 대상 시트 가져오기
6. `appendRow([...])` 호출
7. 성공 JSON 반환

즉 `appendRow()`를 이용해 마지막 행 아래에 새 데이터를 넣는 구조입니다.

## 12. Google Apps Script 웹앱 배포 방식

공식 문서 기준 배포 흐름은 아래와 같습니다.

1. Apps Script 프로젝트 생성
2. `doPost(e)` 구현
3. `Deploy > New deployment`
4. `Select type > Web app`
5. 실행 주체 설정
6. 접근 권한 설정
7. 배포 후 `/exec` URL 발급

이때 프론트는 발급된 `/exec` URL을 호출하게 됩니다.

## 13. 권장 권한 설정 방향

가장 단순한 1차안은 아래 방향입니다.

- Execute the app as: Me
- Who has access: Anyone

이 방식이 필요한 이유:

- GitHub Pages의 익명 사용자도 폼 제출을 할 수 있어야 하기 때문입니다.
- Apps Script가 시트에 쓸 권한은 스크립트 소유자 권한으로 처리하는 편이 단순합니다.

비판적으로 보면 이 설정은 공개 엔드포인트가 되므로,
나중에는 아래 보완이 필요할 수 있습니다.

- 간단한 토큰 검증
- 요청 빈도 제한
- 스팸 방지 문구 또는 CAPTCHA

## 14. 구현 시 주의할 점

### 14-1. CORS

Apps Script 웹앱은 브라우저에서 호출될 때 CORS 이슈가 생길 수 있습니다.

따라서 실제 구현 시 아래를 확인해야 합니다.

- 응답 형식이 브라우저에서 읽히는지
- `ContentService`로 JSON 응답을 주는지
- 프론트에서 `fetch` 옵션을 무리하게 넣지 않는지

### 14-2. 공개 URL 노출

웹앱 URL은 프론트 코드에 들어가므로 사실상 공개됩니다.

즉, 최소한 아래 정도는 고려해야 합니다.

- 너무 큰 본문 차단
- 비정상 요청 차단
- 시트 구조 보호

### 14-3. 시트 구조 변경

열 순서를 바꾸면 Apps Script 코드도 함께 수정해야 합니다.

즉, 시트는 처음 만들 때 열 구조를 먼저 확정하는 것이 좋습니다.

## 15. 현재 프로젝트에서 필요한 코드 변경 방향

현재 코드 기준으로는 아래 수정이 필요합니다.

### 프론트

- [src/lib/inquiryApi.js](/Users/chris/development/AntigravityWorks/site_hagobogo/src/lib/inquiryApi.js)
  - Vercel API 주소 대신 Apps Script 웹앱 URL 호출로 변경

- [src/components/InquiryModal.jsx](/Users/chris/development/AntigravityWorks/site_hagobogo/src/components/InquiryModal.jsx)
  - 기존 제출 상태 UI는 유지 가능
  - 성공/실패 메시지 재사용 가능

### 문서/설정

- Vercel/Resend 문서는 더 이상 1순위가 아님
- 대신 Apps Script 웹앱 URL을 어떻게 주입할지 정리 필요

## 16. 1차 구현 범위

1차 구현은 아래까지만 하면 충분합니다.

1. Google Sheets 열 구조 생성
2. Apps Script 웹앱 생성
3. `doPost(e)` 구현
4. 시트 `appendRow()` 연결
5. 프론트에서 Apps Script URL 호출
6. 성공/실패 메시지 확인

## 17. 2차 고도화 범위

2차에서는 아래를 고려할 수 있습니다.

- 비정상 요청 차단용 토큰
- 관리자용 상태 열 추가
- 처리 여부 체크 열 추가
- 첨부 링크 열 추가
- 자동 응답 메일과 병행 운영

## 18. 최종 판단

현재 프로젝트에서 `Business Inquiries`를 메일 대신 Google Sheets에 저장하는 것은 충분히 가능합니다.

그리고 현재 규모에서는 오히려 아래 장점이 있습니다.

- 설정이 비교적 단순하다.
- 문의 데이터를 메일보다 구조적으로 쌓아둘 수 있다.
- Google Sheets로 바로 운영 관리가 가능하다.

즉, 대장님 목표가 “문의 내역을 잘 모아두는 것”이라면
메일 전송보다 `Apps Script + Google Sheets` 방식이 더 잘 맞을 가능성이 높습니다.
