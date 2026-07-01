# Firebase Phone Authentication 설정 가이드

## 오류 해결 방법

### 1단계: SHA 인증서 생성

#### Debug SHA-1 인증서 생성
Windows에서 다음 명령어를 실행하세요:

```bash
cd android
# Windows 명령 프롬프트에서:
gradlew signingReport

# 또는 PowerShell에서:
.\gradlew signingReport
```

출력에서 다음과 같은 정보를 찾으세요:
```
Variant: debug
Config: debug
Store: C:\Users\0\MyApp\android\app\debug.keystore
Alias: androiddebugkey
MD5: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
SHA1: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
SHA-256: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
```

### 2단계: Firebase Console에 SHA 인증서 등록

1. [Firebase Console](https://console.firebase.google.com/)에 로그인
2. 프로젝트 선택 (galleryproject-e61c4)
3. 프로젝트 설정 (톱니바퀴 아이콘) 클릭
4. "내 앱" 섹션에서 Android 앱 선택
5. "SHA 인증서 지문" 섹션에서 "지문 추가" 클릭
6. SHA-1과 SHA-256 인증서 모두 추가
7. 저장

### 3단계: google-services.json 파일 다시 다운로드

1. Firebase Console의 프로젝트 설정에서
2. Android 앱 카드에서 `google-services.json` 다시 다운로드
3. `android/app/` 폴더에 덮어쓰기

### 4단계: Firebase Authentication 설정 확인

1. Firebase Console에서 Authentication 섹션으로 이동
2. Sign-in method 탭 클릭
3. "전화" 인증 방법이 활성화되어 있는지 확인
4. 비활성화되어 있다면 활성화

### 5단계: 앱 재빌드

```bash
# Metro 번들러 종료 (Ctrl+C)
# 캐시 정리
cd android
gradlew clean

# 앱 재빌드
cd ..
npm run android
```

## 추가 설정 (선택사항)

### SafetyNet/Play Integrity API 설정

Firebase Phone Auth는 보안을 위해 SafetyNet 또는 Play Integrity API를 사용합니다.

#### Google Cloud Console에서 API 활성화:
1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 프로젝트 선택
3. API 및 서비스 > 라이브러리
4. 다음 API 활성화:
   - Android Device Verification API
   - Play Integrity API (새로운 앱)
   - SafetyNet API (기존 앱 호환성)

## 테스트용 전화번호 설정 (개발 중 유용)

Firebase Console에서 테스트용 전화번호를 설정할 수 있습니다:

1. Authentication > Sign-in method > 전화
2. "테스트용 전화번호" 섹션
3. 전화번호와 인증 코드 추가:
   - 전화번호: +82 10-1234-5678
   - 인증 코드: 123456

## 문제가 지속될 경우

### 1. AppCheck 비활성화 (임시 해결책)
Firebase Console에서:
1. App Check 섹션으로 이동
2. Android 앱 선택
3. "Enforce" 비활성화 (개발 중에만)

### 2. Firebase Auth 설정 확인
```javascript
// src/services/FirebaseService.js에서 확인
import auth from '@react-native-firebase/auth';

// 언어 설정 (선택사항)
auth().languageCode = 'ko';

// reCAPTCHA 검증 비활성화 (테스트용)
auth().settings.appVerificationDisabledForTesting = true; // 개발 중에만!
```

### 3. Android 빌드 설정 확인
`android/app/build.gradle`에서:
```gradle
defaultConfig {
    applicationId "com.company.MyApp"  // Firebase Console과 일치해야 함
    // ...
}
```

## 주의사항

- SHA 인증서는 개발 환경(debug)과 프로덕션(release)이 다릅니다
- 프로덕션 배포 시에는 release keystore의 SHA 인증서도 등록해야 합니다
- 팀 개발 시 각 개발자의 debug.keystore SHA 인증서를 모두 등록해야 합니다
- Google Play Store에 업로드한 앱은 Play App Signing의 SHA 인증서도 필요합니다

## 에뮬레이터에서 테스트

Android 에뮬레이터에서는 Google Play Services가 설치되어 있어야 합니다:
- AVD Manager에서 "Google Play" 이미지 사용
- 또는 실제 기기에서 테스트 권장