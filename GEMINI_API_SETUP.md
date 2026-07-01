# Gemini API 환경 변수 설정 가이드

이 프로젝트는 Gemini AI를 사용하여 갤러리 검색 기능을 제공합니다.  
환경 변수를 사용하여 API 키를 관리하므로, 앱 실행 전에 반드시 설정이 필요합니다.

---

## 1. Gemini API 키 발급받기

1. **Google AI Studio** 접속: https://makersuite.google.com/app/apikey
2. **"Create API Key"** 버튼 클릭
3. 프로젝트 선택 또는 새 프로젝트 생성
4. 생성된 API 키 복사

---

## 2. 환경 변수 파일 설정

### `.env` 파일 생성

프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 아래와 같이 설정하세요:

```bash
# 프로젝트 루트에서 실행
cp .env.example .env
```

### API 키 입력

`.env` 파일을 열고 발급받은 API 키를 입력하세요:

```env
GEMINI_API_KEY=AIzaSy...여기에_실제_API_키_입력
```

**⚠️ 주의사항:**
- `.env` 파일은 **절대 Git에 커밋하지 마세요**
- `.gitignore`에 이미 포함되어 있으므로 자동으로 제외됩니다
- API 키가 노출되면 즉시 Google Cloud Console에서 키를 삭제하고 재발급하세요

---

## 3. 앱 실행

### Android

```bash
# Metro 서버 시작
npm start

# 다른 터미널에서 Android 앱 실행
npm run android
```

### iOS (추후 설정 필요)

```bash
cd ios
bundle install
bundle exec pod install
cd ..
npm run ios
```

---

## 4. 문제 해결

### "API_KEY_NOT_SET" 에러가 발생하는 경우

1. `.env` 파일이 프로젝트 루트에 있는지 확인
2. `.env` 파일에 `GEMINI_API_KEY=실제키` 형식으로 올바르게 입력되었는지 확인
3. Metro 서버를 **완전히 종료**하고 다시 시작:
   ```bash
   # Metro 서버 종료 (Ctrl+C)
   npm start -- --reset-cache
   ```
4. Android 앱 재빌드:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npm run android
   ```

### API 키가 제대로 로드되지 않는 경우

- `react-native-config` 패키지는 **빌드 타임**에 환경 변수를 로드합니다
- `.env` 파일을 수정한 후에는 **앱을 재빌드**해야 합니다
- Metro 서버 재시작만으로는 환경 변수가 갱신되지 않습니다

---

## 5. 보안 권장사항

### 프로덕션 환경

프로덕션 배포 시에는 다음 방법 중 하나를 사용하세요:

1. **CI/CD 환경 변수**: GitHub Actions, Bitrise 등에서 환경 변수로 설정
2. **별도의 .env 파일**: `.env.production` 파일을 생성하여 배포 시에만 사용
3. **서버 프록시**: 백엔드 서버를 통해 Gemini API를 호출 (가장 안전)

### API 키 사용량 제한

Google Cloud Console에서 API 키 사용량 제한을 설정하는 것을 권장합니다:
- 일일 요청 한도 설정
- 특정 IP 주소에서만 사용 가능하도록 제한 (개발 환경)
- API 키 제한 범위 설정 (Gemini API만 허용)

---

## 6. 참고 링크

- [Gemini API 문서](https://ai.google.dev/docs)
- [react-native-config GitHub](https://github.com/luggit/react-native-config)
- [Google AI Studio](https://makersuite.google.com/app/apikey)
