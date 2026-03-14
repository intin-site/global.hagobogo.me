# Business Inquiries Vercel 배포 설정 문서

## 1. 문서 목적

이 문서는 `Business Inquiries` 메일 발송 기능을 실제 운영 환경에 배포하기 위해,
대장님이 준비해야 하는 `Vercel 프로젝트 생성`, `환경 변수 설정`, `GitHub Pages 프론트 빌드 설정`을 한 번에 정리한 문서입니다.

이번 문서에서 가장 중요한 점은 아래 두 가지를 분리해서 이해하는 것입니다.

1. `Vercel 환경 변수`
   - 서버리스 함수가 Resend를 호출할 때 사용
2. `VITE_BUSINESS_INQUIRY_API_URL`
   - GitHub Pages에 올라갈 프론트 빌드가 어느 API 주소를 호출할지 결정

즉, 둘은 이름은 비슷해 보여도 역할이 다릅니다.

## 2. 최종 배포 구조

최종 구조는 아래와 같습니다.

```text
GitHub Pages
  -> 프론트엔드 정적 사이트 제공

Vercel
  -> /api/business-inquiry 서버리스 함수 제공

Resend
  -> 메일 발송
```

즉,

- 웹사이트 화면은 GitHub Pages
- 메일 전송 API는 Vercel
- 실제 메일 발송은 Resend

이렇게 나뉩니다.

## 3. Vercel 프로젝트 생성 절차

### 3-1. 준비물

- GitHub 저장소: `bboman21/site.hagobogo`
- Resend 계정
- Resend API 키
- 발신 이메일 주소 또는 발신 도메인 인증

### 3-2. Vercel 프로젝트 생성 순서

1. Vercel에 로그인합니다.
2. `New Project`를 선택합니다.
3. GitHub 저장소 `site.hagobogo`를 연결합니다.
4. 프로젝트를 생성합니다.
5. 루트 디렉터리는 현재 저장소 루트 그대로 사용합니다.

이 프로젝트는 프론트 전체를 Vercel에 배포하려는 목적이 아니라,
현재는 `api/business-inquiry.js` 서버리스 함수를 제공하는 용도로만 사용합니다.

## 4. Vercel 환경 변수 설정값

Vercel 프로젝트에는 아래 환경 변수를 넣어야 합니다.

### 4-1. 필수 환경 변수

```text
RESEND_API_KEY=리샌드_발급_API_키
BUSINESS_INQUIRY_TO_EMAIL=bboman21@gmail.com
BUSINESS_INQUIRY_FROM_EMAIL=인증된_발신_이메일
```

### 4-2. 각 변수 설명

- `RESEND_API_KEY`
  - Resend API 호출 인증용 키
  - 없으면 메일 발송이 되지 않습니다.

- `BUSINESS_INQUIRY_TO_EMAIL`
  - 실제 문의 메일을 받을 주소
  - 이번 기준값은 `bboman21@gmail.com`

- `BUSINESS_INQUIRY_FROM_EMAIL`
  - Resend에서 허용한 발신 주소
  - 반드시 Resend에서 인증된 도메인 또는 허용된 발신 주소여야 합니다.

## 5. `BUSINESS_INQUIRY_FROM_EMAIL` 예시

예시:

```text
BUSINESS_INQUIRY_FROM_EMAIL=HAGOBOGO <noreply@your-domain.com>
```

또는 초기 테스트 단계에서는 Resend 기본 발신 허용값을 사용할 수 있는지 확인해야 합니다.

중요:

- 이 값은 Resend 정책에 따라 실제 인증된 주소여야 합니다.
- 아무 주소나 적는다고 바로 되는 구조가 아닙니다.

## 6. Vercel 배포 후 확인해야 할 주소

Vercel 프로젝트가 배포되면 보통 아래와 같은 주소가 생깁니다.

```text
https://your-project-name.vercel.app
```

그러면 실제 API 주소는 아래처럼 됩니다.

```text
https://your-project-name.vercel.app/api/business-inquiry
```

이 주소가 바로 프론트가 호출해야 하는 운영용 메일 API 주소입니다.

## 7. `VITE_BUSINESS_INQUIRY_API_URL`의 역할

이 값은 **Vercel 서버 환경 변수와 다릅니다.**

이 값은 프론트 코드에서 아래 부분에 사용됩니다.

- [inquiryApi.js](/Users/chris/development/AntigravityWorks/site_hagobogo/src/lib/inquiryApi.js)

현재 코드 동작은 아래와 같습니다.

1. `VITE_BUSINESS_INQUIRY_API_URL`이 있으면 그 주소를 호출
2. 없으면 `/api/business-inquiry` 호출

즉,

- GitHub Pages에서 운영할 때는 반드시 `VITE_BUSINESS_INQUIRY_API_URL`을 넣고 빌드해야 합니다.
- 그렇지 않으면 GitHub Pages 도메인 아래의 `/api/business-inquiry`를 찾게 되는데, GitHub Pages에는 그런 API가 없습니다.

## 8. `VITE_BUSINESS_INQUIRY_API_URL` 실제 값

운영 배포 예시:

```text
VITE_BUSINESS_INQUIRY_API_URL=https://your-project-name.vercel.app/api/business-inquiry
```

즉, 이 값은 **GitHub Pages 프론트가 호출할 Vercel API 전체 주소**입니다.

## 9. 중요한 구분

많이 헷갈리는 부분을 정리하면 아래와 같습니다.

### Vercel 환경 변수

```text
RESEND_API_KEY
BUSINESS_INQUIRY_TO_EMAIL
BUSINESS_INQUIRY_FROM_EMAIL
```

이 값들은:

- Vercel 서버리스 함수 안에서만 사용
- 브라우저로 공개되면 안 됨

### 프론트 빌드 환경 변수

```text
VITE_BUSINESS_INQUIRY_API_URL
```

이 값은:

- GitHub Pages에 올릴 프론트가 사용할 API 주소
- 빌드 결과 JS 안에 포함됨
- 공개되어도 되는 값이어야 함

즉,

- `RESEND_API_KEY`는 비밀값
- `VITE_BUSINESS_INQUIRY_API_URL`은 공개 가능한 연결 주소

입니다.

## 10. GitHub Pages 프론트 빌드 시 설정 방법

현재 프론트는 GitHub Pages에 정적 파일로 올라갑니다.

따라서 `VITE_BUSINESS_INQUIRY_API_URL`은 런타임에 바뀌는 것이 아니라,
**빌드 시점에 값이 고정됩니다.**

즉, 아래 방식으로 빌드 전에 값을 넣어야 합니다.

### 방법 1. `.env.production` 사용

예시:

```text
VITE_BUSINESS_INQUIRY_API_URL=https://your-project-name.vercel.app/api/business-inquiry
```

이 파일을 기준으로 `npm run build`를 실행하면 운영용 API 주소가 프론트 번들에 들어갑니다.

### 방법 2. 터미널에서 환경 변수 주입 후 빌드

예시:

```bash
VITE_BUSINESS_INQUIRY_API_URL=https://your-project-name.vercel.app/api/business-inquiry npm run build
```

현재 구조에서는 이 두 방식 중 하나가 필요합니다.

## 11. 권장 운영 설정값 정리

대장님 기준 권장값 예시는 아래와 같습니다.

### Vercel 환경 변수

```text
RESEND_API_KEY=대장님이_Resend에서_발급한_실제_키
BUSINESS_INQUIRY_TO_EMAIL=bboman21@gmail.com
BUSINESS_INQUIRY_FROM_EMAIL=HAGOBOGO <noreply@인증된도메인>
```

### 프론트 빌드 환경 변수

```text
VITE_BUSINESS_INQUIRY_API_URL=https://your-project-name.vercel.app/api/business-inquiry
```

## 12. CORS 설정 주의사항

현재 [business-inquiry.js](/Users/chris/development/AntigravityWorks/site_hagobogo/api/business-inquiry.js) 에는 허용 Origin 목록이 코드에 들어 있습니다.

현재 포함된 값:

- `https://bboman21.github.io`
- 로컬 개발용 `127.0.0.1` 포트들

여기서 주의할 점:

- 실제 GitHub Pages 주소가 `https://bboman21.github.io/site.hagobogo/` 형태이더라도 Origin은 `https://bboman21.github.io` 입니다.
- 따라서 현재 코드 구조상 Origin 값은 맞는 편입니다.

다만 이후:

- 커스텀 도메인을 붙이거나
- 다른 테스트 도메인을 붙이면

허용 Origin 목록을 다시 수정해야 합니다.

## 13. 대장님이 실제로 해야 하는 순서

1. Resend에서 API 키 발급
2. Resend 발신 이메일 또는 도메인 인증
3. Vercel 프로젝트 생성
4. Vercel 환경 변수 3개 등록
5. Vercel 배포 완료 후 API 주소 확인
6. `VITE_BUSINESS_INQUIRY_API_URL` 값을 운영 주소로 지정
7. 프론트 `npm run build`
8. 새 `dist` 결과를 GitHub Pages에 반영

## 14. 배포 전 체크리스트

### Vercel 쪽

- `RESEND_API_KEY` 등록 완료
- `BUSINESS_INQUIRY_TO_EMAIL=bboman21@gmail.com` 등록 완료
- `BUSINESS_INQUIRY_FROM_EMAIL` 등록 완료
- 함수 배포 성공
- `https://your-project-name.vercel.app/api/business-inquiry` 접속 가능

### 프론트 쪽

- `VITE_BUSINESS_INQUIRY_API_URL` 운영 주소로 반영
- `npm run build` 다시 실행
- 최신 `dist` 업로드 또는 커밋 반영

## 15. 운영 테스트 체크리스트

1. 이름, 회사명, 이메일, 문의 내용을 입력하고 `Save`를 누른다.
2. 브라우저 콘솔에 CORS 오류가 없는지 확인한다.
3. 성공 메시지가 나오는지 확인한다.
4. `bboman21@gmail.com`로 메일이 실제 도착하는지 확인한다.
5. 잘못된 이메일 형식은 프론트와 서버 모두에서 차단되는지 확인한다.
6. Resend 발송 실패 시 사용자 오류 문구가 보이는지 확인한다.

## 16. 가장 중요한 실수 방지 포인트

### 16-1. `VITE_BUSINESS_INQUIRY_API_URL`을 Vercel 환경 변수라고 착각하지 말 것

이 값은 **GitHub Pages 프론트 빌드용 값**입니다.

### 16-2. `BUSINESS_INQUIRY_FROM_EMAIL`을 임의 값으로 쓰지 말 것

Resend에서 허용된 발신 주소가 아니면 실제 전송이 실패할 수 있습니다.

### 16-3. GitHub Pages는 서버가 아님

따라서 `/api/business-inquiry` 같은 상대경로를 그대로 두면 운영에서 실패합니다.

## 17. 권장 최종 설정 요약

대장님 기준으로 가장 안전한 최종 정리는 아래와 같습니다.

### Vercel 환경 변수

```text
RESEND_API_KEY=실제_리샌드_API_키
BUSINESS_INQUIRY_TO_EMAIL=bboman21@gmail.com
BUSINESS_INQUIRY_FROM_EMAIL=인증된_발신_주소
```

### GitHub Pages 빌드 시 주입할 값

```text
VITE_BUSINESS_INQUIRY_API_URL=https://your-project-name.vercel.app/api/business-inquiry
```

이렇게 설정하면 현재 사이트 구조를 유지하면서도 `Business Inquiries` 팝업이 실제 메일 전송 기능을 수행할 수 있습니다.
