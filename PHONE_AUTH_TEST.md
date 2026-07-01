# Phone Auth 테스트 가이드

## 빠른 테스트 방법

### 1. 테스트 번호 사용 (개발 모드)
앱이 개발 모드(`__DEV__`)에서 실행 중일 때:
- **전화번호**: `010-1234-5678`
- **인증 코드**: `123456`

이 번호는 실제 SMS를 발송하지 않고 테스트할 수 있습니다.

### 2. Firebase Console에서 테스트 번호 등록
Firebase Console > Authentication > Sign-in method > Phone에서:
1. "테스트용 전화번호" 섹션 확장
2. 추가 버튼 클릭
3. 테스트 번호 입력:
   - **전화번호**: `+82 10-9876-5432`
   - **인증 코드**: `654321`

## 앱 재빌드 및 테스트

### 1. Metro 번들러 재시작
```bash
# Metro 종료 (Ctrl+C)
# 캐시 초기화하고 재시작
npm start -- --reset-cache
```

### 2. Android 앱 재빌드
```bash
# Android 폴더 정리
cd android && ./gradlew.bat clean && cd ..

# 앱 재실행
npm run android
```

### 3. 로그 확인
앱 실행 중 콘솔에서 다음 메시지를 확인:
- "Development mode: Disabling reCAPTCHA for testing"
- "Development mode: Using test phone authentication"

## 실제 번호로 테스트

### 필수 확인 사항:
1. ✅ Firebase Console에서 Phone Auth 활성화
2. ✅ SHA 인증서 등록 (SHA-1, SHA-256 모두)
3. ✅ 최신 google-services.json 다운로드 및 적용
4. ✅ Google Play Services가 설치된 기기/에뮬레이터

### Google Cloud Console 설정:
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 (galleryproject-e61c4)
3. API 및 서비스 > 활성화된 API
4. 다음 API들이 활성화되어 있는지 확인:
   - ✅ Firebase Auth API
   - ✅ Identity Toolkit API
   - ✅ Android Device Verification API

## 일반적인 오류 해결

### 1. "missing-client-identifier" 오류
**원인**: SHA 인증서가 Firebase에 등록되지 않음
**해결책**:
```bash
cd android
./gradlew.bat signingReport
```
출력된 SHA-1과 SHA-256을 Firebase Console에 추가

### 2. "operation-not-allowed" 오류
**원인**: Firebase에서 Phone Auth가 비활성화됨
**해결책**: Firebase Console > Authentication > Sign-in method에서 Phone 활성화

### 3. "invalid-phone-number" 오류
**원인**: 잘못된 전화번호 형식
**해결책**: 010-XXXX-XXXX 형식 사용 (하이픈 포함/제외 모두 가능)

### 4. "too-many-requests" 오류
**원인**: 너무 많은 인증 요청
**해결책**:
- 5분 정도 대기 후 재시도
- 테스트 번호 사용으로 전환

## 프로덕션 배포 전 체크리스트

- [ ] `appVerificationDisabledForTesting = true` 제거
- [ ] Release keystore의 SHA 인증서 등록
- [ ] Play Console App Signing의 SHA 인증서 등록
- [ ] 실제 기기에서 최종 테스트

## 추가 디버깅

### ADB 로그 확인
```bash
adb logcat | grep -i "auth"
```

### Firebase Auth 상태 확인
```javascript
// FirebaseService.js에 추가
console.log('Auth settings:', this.auth.settings);
console.log('Current user:', this.auth.currentUser);
```

## 테스트 시나리오

1. **신규 가입 시 전화번호 인증**
   - 회원가입 완료 후 전화번호 인증 화면으로 이동
   - 테스트 번호 입력
   - 인증 코드 입력
   - 성공 메시지 확인

2. **프로필에서 전화번호 인증**
   - 프로필 > 전화번호 인증
   - 실제 번호 또는 테스트 번호 입력
   - SMS 수신 확인
   - 인증 완료

3. **인증 실패 케이스**
   - 잘못된 인증 코드 입력 → 오류 메시지 확인
   - 만료된 코드 사용 → 재발송 기능 테스트