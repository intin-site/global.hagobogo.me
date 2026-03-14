# Business Inquiries 메일 전송 한 장 체크리스트

## 1. 이 문서의 목적

이 문서는 `Business Inquiries` 메일 전송 기능을 실제 운영 환경에서 켜기 위해,
대장님이 해야 하는 일을 한 장으로 압축한 체크리스트입니다.

이 문서만 보면 아래 네 가지를 바로 따라갈 수 있습니다.

- Vercel에서 무엇을 클릭해야 하는지
- Vercel에 어떤 환경 변수를 넣어야 하는지
- Resend 도메인 인증을 어떤 순서로 해야 하는지
- 마지막 운영 테스트를 어떻게 해야 하는지

## 2. 먼저 준비할 것

- GitHub 저장소: `bboman21/site.hagobogo`
- Vercel 계정
- Resend 계정
- 메일 발신에 사용할 도메인
- DNS를 수정할 수 있는 도메인 관리 화면 접근 권한

## 3. Vercel에서 실제로 클릭할 순서

### 3-1. 프로젝트 만들기

1. Vercel에 로그인합니다.
2. 상단 또는 대시보드에서 `Add New...`를 누릅니다.
3. `Project`를 누릅니다.
4. `Import Git Repository` 영역에서 `bboman21/site.hagobogo` 저장소를 찾습니다.
5. 해당 저장소 오른쪽의 `Import`를 누릅니다.
6. 프로젝트 설정 화면이 열리면 기본 루트 디렉터리는 현재 저장소 루트 그대로 둡니다.
7. `Deploy`를 누릅니다.

이 단계가 끝나면 Vercel 프로젝트가 하나 만들어집니다.

### 3-2. 환경 변수 넣기

1. 방금 만든 프로젝트로 들어갑니다.
2. 상단 탭에서 `Settings`를 누릅니다.
3. 왼쪽 메뉴에서 `Environment Variables`를 누릅니다.
4. 아래 값을 하나씩 추가합니다.

```text
RESEND_API_KEY=대장님이_Resend에서_발급받은_실제_키
BUSINESS_INQUIRY_TO_EMAIL=bboman21@gmail.com
BUSINESS_INQUIRY_FROM_EMAIL=HAGOBOGO <noreply@대장님도메인>
```

5. 저장 후 다시 배포가 필요하면 `Deployments`로 가서 최신 배포를 재배포합니다.

## 4. Vercel에 넣어야 할 환경 변수 최종 체크리스트

### 필수 1. `RESEND_API_KEY`

- Resend에서 발급받은 실제 API 키
- 없으면 메일 발송이 되지 않습니다.

### 필수 2. `BUSINESS_INQUIRY_TO_EMAIL`

- 실제 문의 메일을 받을 주소
- 현재 기준 권장값:

```text
bboman21@gmail.com
```

### 필수 3. `BUSINESS_INQUIRY_FROM_EMAIL`

- Resend에서 허용된 발신 주소
- 아무 주소나 쓰면 안 됩니다.
- 반드시 Resend에서 인증된 도메인 기반 주소여야 합니다.

예시:

```text
HAGOBOGO <noreply@your-domain.com>
```

## 5. Resend 도메인 인증 순서

### 5-1. Resend에서 도메인 추가

1. Resend에 로그인합니다.
2. 대시보드에서 `Domains`로 이동합니다.
3. `Add Domain`을 누릅니다.
4. 발신에 사용할 도메인을 입력합니다.
5. 저장하면 Resend가 DNS 레코드 정보를 보여줍니다.

### 5-2. 도메인 관리 사이트에서 DNS 레코드 추가

1. 대장님 도메인을 관리하는 곳으로 이동합니다.
   - 예: 가비아, Cloudflare, GoDaddy 같은 곳
2. DNS 관리 화면을 엽니다.
3. Resend가 보여준 레코드를 그대로 추가합니다.
   - SPF 관련 TXT 레코드
   - DKIM 관련 CNAME 레코드
   - 필요 시 Return-Path 관련 레코드

중요:

- 이 단계는 “메일을 이 도메인 이름으로 보내도 된다”는 걸 증명하는 단계입니다.
- 이걸 하지 않으면 발신 주소가 정상 동작하지 않을 수 있습니다.

### 5-3. Resend에서 검증 완료 확인

1. 다시 Resend `Domains` 화면으로 돌아갑니다.
2. 방금 추가한 도메인 상태를 봅니다.
3. `Verified` 또는 검증 완료 상태가 될 때까지 기다립니다.

DNS 반영에는 시간이 걸릴 수 있습니다.
즉시 안 되어도 이상한 것이 아닙니다.

## 6. GitHub Pages 프론트 빌드에 넣어야 할 값

Vercel 환경 변수와 별도로, 프론트 빌드에는 아래 값을 넣어야 합니다.

```text
VITE_BUSINESS_INQUIRY_API_URL=https://your-project-name.vercel.app/api/business-inquiry
```

이 값은 무엇인가:

- GitHub Pages에 올라가는 프론트가 실제로 호출할 API 주소
- 비밀키가 아니라 공개 API 주소

즉, 이 값은 Vercel `Environment Variables`에 넣는 비밀값이 아니라,
**프론트 빌드 시점에 주입하는 공개 설정값**입니다.

## 7. 실제 빌드 명령 예시

운영용 프론트 빌드는 아래처럼 실행합니다.

```bash
VITE_BUSINESS_INQUIRY_API_URL=https://your-project-name.vercel.app/api/business-inquiry npm run build
```

또는 `.env.production` 파일에 위 값을 넣고 빌드해도 됩니다.

## 8. 운영 테스트 절차

### 8-1. API 먼저 확인

1. Vercel 프로젝트 배포가 끝났는지 확인합니다.
2. API 주소를 메모합니다.

예:

```text
https://your-project-name.vercel.app/api/business-inquiry
```

### 8-2. 프론트 빌드 확인

1. `VITE_BUSINESS_INQUIRY_API_URL`에 위 주소를 넣고 빌드합니다.
2. 최신 `dist` 결과가 GitHub Pages에 반영되었는지 확인합니다.

### 8-3. 실제 폼 테스트

1. 웹사이트에서 `Business Inquiries` 팝업을 엽니다.
2. 아래 값을 입력합니다.
   - Name
   - Job Title
   - Country
   - Company Name
   - Email
   - Inquiry
3. `Save`를 누릅니다.
4. 성공 메시지가 보이는지 확인합니다.
5. `bboman21@gmail.com` 메일함에서 실제 메일이 도착했는지 확인합니다.

### 8-4. 실패 상황도 확인

1. 이메일 형식을 틀리게 입력합니다.
2. 문의 내용을 비워둡니다.
3. 다시 `Save`를 눌러 프론트 검증이 동작하는지 봅니다.
4. 브라우저 콘솔에 CORS 오류가 없는지 확인합니다.

## 9. 가장 자주 하는 실수

### 실수 1. `BUSINESS_INQUIRY_FROM_EMAIL`을 인증되지 않은 주소로 넣는 것

이 경우 메일 발송이 실패할 수 있습니다.

### 실수 2. `VITE_BUSINESS_INQUIRY_API_URL`을 빼고 빌드하는 것

이 경우 GitHub Pages 프론트는 `/api/business-inquiry`를 찾게 되는데,
GitHub Pages에는 그런 API가 없어서 실패합니다.

### 실수 3. Resend 도메인 검증이 끝나기 전에 테스트하는 것

이 경우 메일이 안 갈 수 있습니다.

## 10. 최종 확인용 한 줄 체크

아래 네 가지가 모두 되어야 실제 메일 전송이 됩니다.

- Vercel 프로젝트 생성 완료
- Vercel 환경 변수 3개 등록 완료
- Resend 도메인 인증 완료
- `VITE_BUSINESS_INQUIRY_API_URL` 넣고 프론트 재빌드 완료
