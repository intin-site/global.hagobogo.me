# 다른 컴퓨터에서 서비스 복구 체크리스트

## 1. 이 문서의 목적

이 문서는 대장님이 다른 컴퓨터에서 이 프로젝트를 다시 열었을 때,

- 화면이 정상적으로 실행되는지
- 문의 저장 기능이 정상적으로 동작하는지
- 배포까지 이어서 할 수 있는지

를 순서대로 확인할 수 있도록 정리한 체크리스트입니다.

초보자 기준으로, 무엇이 꼭 필요하고 무엇은 상황에 따라 필요한지 나눠서 설명합니다.

## 2. 먼저 이해해야 하는 현재 구조

현재 이 프로젝트는 아래 구조로 운영합니다.

`브라우저 화면(GitHub Pages) -> Apps Script 웹앱 -> Google Sheets 저장 + 메일 알림`

즉, 다른 컴퓨터에서 서비스를 다시 이어서 쓰려면
코드만 받는 것으로 끝나지 않고,
문의 저장에 필요한 외부 연결 정보도 함께 맞아야 합니다.

## 3. 준비물

다른 컴퓨터에서 아래 항목이 준비되어 있어야 합니다.

1. Git 설치
2. Node.js 설치
3. 이 저장소 접근 권한
4. 현재 운영 중인 Apps Script 웹앱 URL
5. 필요하면 Google 계정으로 Apps Script / Google Sheets 접근 권한

## 4. 가장 먼저 해야 할 일

### 4-1. 저장소 받기

터미널에서 프로젝트를 받을 폴더로 이동한 뒤 저장소를 복제합니다.

```bash
git clone https://github.com/bboman21/site.hagobogo.git
cd site.hagobogo
```

이미 프로젝트가 있다면 최신 상태를 받아옵니다.

```bash
git pull origin main
```

### 4-2. 패키지 설치

```bash
npm install
```

이 단계는 화면을 실행하는 데 필요한 라이브러리를 설치하는 과정입니다.

## 5. 꼭 넣어야 하는 환경 파일

현재 운영 구조에서 가장 중요한 값은 아래 하나입니다.

```text
VITE_BUSINESS_INQUIRY_API_URL=Apps Script 웹앱 /exec 주소
```

이 값이 없으면 화면은 열릴 수 있어도 `Business Inquiries` 전송은 실패합니다.

### 5-1. `.env.local` 만들기

프로젝트 루트에 `.env.local` 파일을 만들고 아래처럼 넣습니다.

```env
VITE_BUSINESS_INQUIRY_API_URL=https://script.google.com/macros/s/실제값/exec
```

### 5-2. `.env.production`도 같이 맞추기

운영 빌드나 배포 테스트까지 할 예정이면 `.env.production`도 맞춰둡니다.

```env
VITE_BUSINESS_INQUIRY_API_URL=https://script.google.com/macros/s/실제값/exec
```

## 6. 여기까지 하면 무엇이 가능한가

### 가능한 것

1. 로컬에서 화면 실행
2. 챗봇, 제안서 보기, 일반 UI 확인
3. 문의 저장 기능 테스트 시도

### 아직 추가 확인이 필요한 것

1. Apps Script 웹앱이 실제로 살아 있는지
2. Google Sheets 연결이 정상인지
3. 메일 알림 설정이 남아 있는지

즉, `.env.local`, `.env.production`만 맞춘다고 해서
무조건 문의 저장까지 보장되지는 않습니다.

## 7. 로컬 실행 체크

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 화면이 열리면 아래를 확인합니다.

1. 메인 화면이 정상 표시되는지
2. 챗봇 팝업이 열리는지
3. 제안서 iframe이 보이는지
4. 모바일에서 PDF 열기 버튼이 동작하는지

## 8. 문의 저장 기능 체크

다음 순서로 실제 문의 저장이 되는지 확인합니다.

1. `Business Inquiries` 팝업 열기
2. 테스트용 이름, 회사명, 이메일, 문의 내용 입력
3. 전송 버튼 누르기
4. 성공 메시지가 뜨는지 확인

성공 메시지가 안 뜨면 아래를 확인해야 합니다.

## 9. 문의 저장이 안 될 때 확인할 것

### 9-1. Apps Script URL이 맞는지

`.env.local` 또는 `.env.production`에 들어 있는 값이

- 오타가 없는지
- `/exec`로 끝나는지
- 이미 폐기된 예전 URL이 아닌지

를 확인합니다.

### 9-2. Apps Script 웹앱이 배포 상태인지

Apps Script 편집기에서 웹앱이 실제 배포되어 있어야 합니다.

코드를 수정만 하고 재배포하지 않았으면 예전 코드가 계속 동작할 수 있습니다.

### 9-3. Google Sheets 연결이 살아 있는지

현재 Apps Script가 데이터를 넣는 Google Sheets가

- 삭제되지 않았는지
- 시트 이름이 바뀌지 않았는지
- 필요한 헤더가 그대로 있는지

를 확인합니다.

### 9-4. Script Properties가 있는지

Apps Script 프로젝트 설정에서 아래 값이 있는지 확인합니다.

```text
BUSINESS_INQUIRY_NOTIFICATION_EMAIL=알림을 받을 실제 이메일 주소
```

이 값이 없으면 저장은 되더라도 메일 알림 단계에서 문제가 날 수 있습니다.

## 10. 배포까지 이어서 하려면

다른 컴퓨터에서 코드 수정 후 GitHub Pages까지 반영하려면
로컬 파일 외에도 GitHub 쪽 설정이 맞아야 합니다.

확인할 항목:

1. GitHub 저장소 접근 권한
2. GitHub Actions 사용 가능 여부
3. GitHub Secrets에 `VITE_BUSINESS_INQUIRY_API_URL`이 등록되어 있는지

즉, 로컬 `.env.production`만 맞춰도 수동 빌드는 되지만,
GitHub Actions 자동 배포까지 정상으로 돌리려면 GitHub Secrets 설정도 맞아야 합니다.

## 11. 가장 추천하는 복구 순서

초보자 기준으로는 아래 순서가 가장 안전합니다.

1. 저장소 clone
2. `npm install`
3. `.env.local` 작성
4. `npm run dev`
5. 화면 열림 확인
6. 문의 전송 테스트
7. 문제 없으면 `.env.production` 확인
8. 필요 시 GitHub Secrets 확인
9. 그 다음 수정 작업 시작

## 12. 한 줄 요약

다른 컴퓨터에서 서비스를 다시 실행하려면
코드만 받는 것으로 끝나지 않고,
최소한 `VITE_BUSINESS_INQUIRY_API_URL` 값을 다시 넣어야 합니다.

그리고 문의 저장까지 완전히 복구하려면
Apps Script 웹앱, Google Sheets, Script Properties 상태도 함께 살아 있어야 합니다.
