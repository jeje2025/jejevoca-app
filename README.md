
# 갓생보카

This is a code bundle for 갓생보카. The original project is available at https://www.figma.com/design/pMOsJ8MFmkRmd06ao4Gphv/%EA%B0%93%EC%83%9D%EB%B3%B4%EC%B9%B4.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## 배포 (Deployment)

### Vercel 배포

이 프로젝트는 Vercel에 배포할 수 있도록 설정되어 있습니다.

1. **Vercel CLI를 통한 배포:**
   ```bash
   # Vercel CLI 설치 (처음 한 번만)
   npm i -g vercel
   
   # 프로젝트 배포
   vercel
   ```

2. **Vercel 웹사이트를 통한 배포:**
   - [Vercel](https://vercel.com)에 로그인
   - "New Project" 클릭
   - GitHub/GitLab/Bitbucket에서 저장소 import
   - Vercel이 자동으로 설정을 감지합니다
   - "Deploy" 클릭

3. **환경 변수 설정:**
   - 현재 Supabase 설정은 코드에 하드코딩되어 있습니다
   - 필요시 Vercel 대시보드에서 환경 변수로 설정 가능합니다

### 빌드

프로덕션 빌드:
```bash
npm run build
```

빌드 결과물은 `build` 디렉토리에 생성됩니다.
  