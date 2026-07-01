# 📱 전화번호 인증 오류 해결 가이드

## 문제
`auth/missing-client-identifier` 오류 - Firebase Phone Authentication이 앱을 인식하지 못함

## 해결 단계

### ✅ 1단계: SHA 지문 생성 (완료)
```bash
cd android
./gradlew.bat signingReport
```

**생성된 SHA 지문:**
- SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
- SHA-256: `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C`

### 📝 2단계: Firebase Console에 SHA 지문 추가
1. [Firebase Console](https://console.firebase.google.com) 접속
2. `galleryproject-e61c4` 프로젝트 선택
3. 프로젝트 설정(톱니바퀴) → 일반 탭
4. Android 앱 섹션에서 **SHA 인증서 지문** 찾기
5. **지문 추가** 클릭하여 두 지문 모두 추가:
   - SHA-1 입력
   - SHA-256 입력
6. **저장** 클릭

### 📥 3단계: google-services.json 업데이트
1. Firebase Console 같은 페이지에서 **google-services.json** 다운로드
2. 파일을 `android/app/google-services.json`에 복사 (덮어쓰기)

### 🔄 4단계: 앱 재빌드
```bash
# Metro 종료 (Ctrl+C)
# Metro 재시작
npm start -- --reset-cache

# 새 터미널에서 앱 실행
npm run android
```

### ✨ 5단계: Play Integrity API 활성화 (선택사항)
Google Cloud Console에서:
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 선택
3. API 및 서비스 → 라이브러리
4. "Play Integrity API" 검색
5. **사용 설정** 클릭

## 추가 설정 (필요시)

### reCAPTCHA 설정
Firebase Console에서:
1. Authentication → Sign-in method → 전화
2. **App verification** 섹션
3. **reCAPTCHA verification** 설정 확인

### SafetyNet 비활성화 (테스트용)
`FirebaseService.js`에서:
```javascript
// 개발 환경에서 reCAPTCHA 비활성화
if (__DEV__) {
  this.auth.settings.appVerificationDisabledForTesting = true;
}
```

## 테스트 전화번호 설정
Firebase Console에서:
1. Authentication → Sign-in method → 전화
2. **Phone numbers for testing** 섹션
3. 테스트 전화번호 추가:
   - 번호: `+821012345678`
   - 인증 코드: `123456`

## 문제 해결

### 여전히 오류가 발생하는 경우:
1. **앱 완전 삭제 후 재설치**:
   ```bash
   adb uninstall com.myapp
   npm run android
   ```

2. **캐시 클리어**:
   ```bash
   cd android
   ./gradlew.bat clean
   cd ..
   npm start -- --reset-cache
   ```

3. **Firebase 프로젝트 설정 확인**:
   - Package name: `com.myapp`
   - SHA 지문이 올바르게 등록되었는지 확인

### 로그 확인
```bash
adb logcat | grep -i firebase
adb logcat | grep -i phone
```

## 체크리스트
- [ ] SHA-1 지문 Firebase에 추가
- [ ] SHA-256 지문 Firebase에 추가
- [ ] google-services.json 다운로드 및 교체
- [ ] 앱 재빌드
- [ ] Metro 캐시 리셋
- [ ] 테스트

## 참고
- Firebase Phone Auth는 실제 기기에서 테스트하는 것이 좋습니다
- 에뮬레이터에서는 테스트 전화번호만 사용 가능
- Play Store에 출시할 때는 Release SHA 지문도 추가 필요