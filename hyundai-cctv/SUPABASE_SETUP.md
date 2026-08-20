# 현대CCTV 상담 폼 설정

## 1. Supabase에서 테이블 만들기

1. Supabase Dashboard에서 프로젝트를 만듭니다.
2. 왼쪽 메뉴의 **SQL Editor**를 엽니다.
3. 이 폴더의 `supabase-schema.sql` 내용을 전부 붙여넣고 **Run**을 누릅니다.
4. **Table Editor → consultations**에서 테이블 생성을 확인합니다.

SQL은 RLS를 활성화하고 익명 방문자에게 INSERT만 허용합니다. SELECT, UPDATE, DELETE 정책은 만들지 않으므로 브라우저 방문자는 다른 상담 데이터를 읽거나 수정하거나 삭제할 수 없습니다.

## 2. Supabase URL과 공개 키 확인

1. 프로젝트 상단의 **Connect** 버튼에서 Project URL과 Publishable Key를 확인합니다.
2. 또는 **Settings → API Keys**에서 Publishable Key를 확인합니다.
3. Data API URL은 **Integrations → Data API**에서도 확인할 수 있습니다.
4. 새 프로젝트는 `sb_publishable_...` 형식의 Publishable Key 사용을 권장합니다. 기존 프로젝트의 legacy `anon` public key도 사용할 수 있습니다.
5. `service_role`, Secret Key, `sb_secret_...` 값은 절대 브라우저 코드나 GitHub에 넣지 마세요.

## 3. 코드에 URL과 키 넣기

`script.js` 상단에서 다음 두 줄을 교체합니다.

```js
const SUPABASE_URL = 'https://프로젝트참조값.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_...';
```

## 4. GitHub에 수정 파일 업로드

```bash
git add index.html script.js supabase-schema.sql SUPABASE_SETUP.md robots.txt vercel.json assets
git commit -m "Add Supabase consultation form"
git push origin main
```

GitHub 웹 화면을 사용한다면 저장소의 **Add file → Upload files**에서 이 폴더의 파일과 `assets` 폴더를 업로드하고 Commit합니다.

## 5. Vercel 재배포

- GitHub 저장소가 Vercel 프로젝트와 연결되어 있으면 `main` 브랜치 push 후 자동 재배포됩니다.
- 수동 배포는 Vercel 프로젝트 **Deployments**에서 최신 배포의 메뉴를 열어 **Redeploy**를 선택합니다.
- CLI 사용 시 프로젝트 폴더에서 `vercel --prod`를 실행합니다.

## 6. 실제 상담 신청 테스트

1. Vercel 배포 URL을 엽니다.
2. 성함, 연락처와 개인정보 필수 동의를 입력하고 제출합니다.
3. `상담 신청이 완료되었습니다. 확인 후 빠르게 연락드리겠습니다.` 메시지를 확인합니다.
4. Supabase **Table Editor → consultations**에서 새 행이 생성됐는지 확인합니다.
5. 같은 브라우저에서 60초 이내 재제출이 차단되는지 확인합니다.
6. 익명 REST 요청으로 SELECT, UPDATE, DELETE가 거부되는지 확인합니다.

## 7. Cloudflare Turnstile 추가 위치

폼 안의 `#turnstile-container`가 위젯 자리이며 `script.js`의 `getTurnstileToken()`이 토큰 연결 지점입니다. 실제 도입 시 토큰 검증은 브라우저가 아니라 Supabase Edge Function이나 Vercel Function에서 수행해야 합니다.
