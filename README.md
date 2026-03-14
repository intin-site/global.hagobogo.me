# HAGOBOGO 랜딩 페이지

페이지 주소: `https://bboman21.github.io/site.hagobogo/`

## 배포
GitHub Actions를 통해 `main` 브랜치에 push하면 자동으로 빌드 → GitHub Pages 배포됩니다.

- 워크플로우: `.github/workflows/deploy.yml`
- 빌드 도구: Vite
- 배포 대상: GitHub Pages (GitHub Actions 소스)

### 환경 변수

빌드 시 필요한 환경 변수는 GitHub Secrets에 등록합니다.

```text
VITE_BUSINESS_INQUIRY_API_URL=Apps Script 웹앱 URL
VITE_ADMIN_SETTINGS_API_URL=Apps Script 웹앱 URL
```

## 현재 사이트 구조

- 프론트엔드: GitHub Pages
- 데이터 저장: Google Sheets
- 메일 알림: Apps Script MailApp

상세 설정 문서:

- `Docs/business_inquiries_apps_script_mail_deployment_guide.md`
- `Docs/business_inquiries_google_sheets_checklist.md`

Apps Script 쪽 필수 조건:

- 시트 이름: `Business Inquiries List`
- 시트 헤더에 `Status` 열 포함
- Script Properties:

```text
BUSINESS_INQUIRY_NOTIFICATION_EMAIL=알림을 받을 실제 이메일 주소
ADMIN_PAGE_PASSWORD=관리자 페이지 비밀번호
```

## 로컬 개발 실행

```bash
npm install
npm run dev
```

개발 서버는 `app.html`을 기준으로 실행됩니다.

## 빌드

```bash
npm run build
```

빌드 결과물은 `dist/` 폴더에 생성됩니다 (`.gitignore`에 포함, CI/CD가 자동 처리).

## 로컬 프로덕션 미리보기

```bash
npm run local
```

macOS에서 더블클릭으로 실행하고 싶다면 `preview.command`를 사용할 수 있습니다.

참고:

- `Vercel + Resend` 관련 문서는 과거 검토안입니다.
- 현재 운영 기준은 `GitHub Pages + Apps Script`입니다.
- macOS에서 더블클릭 실행이 필요하면 `preview.command`를 사용할 수 있습니다.
