# Gallering

갤러리 예약, 갤러리 운영 관리, 아티스트 포트폴리오를 한 앱에서 연결하는 React Native 기반 플랫폼입니다. 일반 사용자, 갤러리 오너, 아티스트의 세 역할을 나누고 Firebase와 Gemini API를 활용해 검색, 예약, 채팅, 리뷰 흐름을 구현했습니다.

## 주요 기능

- 역할별 홈/탭: 일반 사용자, 갤러리 오너, 아티스트별 화면 분기
- 갤러리 탐색: 지역, 가격, 키워드 기반 검색과 상세 페이지
- 예약: 사용자 예약 생성, 예약 내역 확인, 오너 예약 관리
- 수동 예약: 갤러리 오너가 앱 외부 고객 예약을 직접 등록
- 채팅: 사용자와 갤러리 오너, 오너와 아티스트 간 1:1 문의
- 리뷰: 완료된 예약 기반 리뷰 작성과 갤러리 평점 반영
- 아티스트 기능: 작품 업로드, 포트폴리오 관리, 전시 제안
- AI 검색: Gemini API를 이용한 대화형 갤러리 조건 탐색
- 알림: FCM/Notifee 기반 예약 및 채팅 알림 구조

## 기술 스택

- React Native 0.80.1, React 19
- Firebase Auth, Firestore, Storage, Cloud Messaging
- Firebase Cloud Functions, SendGrid
- Gemini API (`@google/generative-ai`)
- Zustand
- React Navigation
- Notifee
- react-native-image-picker
- react-native-calendars

## 실행 방법

```bash
npm install
cp .env.example .env
```

`.env`에는 실제 키를 직접 넣습니다. 제출용 저장소나 ZIP에는 `.env`, `functions/.env`, `android/app/google-services.json`, `ios/GoogleService-Info.plist`를 포함하지 않습니다.

```bash
# Metro 실행
npm start

# Android 실행
npm run android

# 테스트
npm test -- --runInBand

# 린트
npx eslint . --quiet

# Android JS 번들 검증
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output ./tmp/index.android.bundle --assets-dest ./tmp/assets
```

## 환경 설정

`.env.example`

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Firebase Android 실행에는 `android/app/google-services.json`이 필요합니다. iOS 실행에는 `ios/GoogleService-Info.plist`가 필요하지만, 현재 포트폴리오 검증 범위는 Android 기준입니다.

Cloud Functions 이메일 발송은 `functions/.env` 또는 Firebase Functions config에 `SENDGRID_API_KEY`를 설정해 사용합니다.

## 시연 시나리오

1. 일반 사용자, 갤러리 오너, 아티스트 계정을 각각 생성합니다.
2. 오너 계정으로 갤러리를 등록하고 이미지와 운영 정보를 입력합니다.
3. 일반 사용자 계정으로 갤러리를 검색하고 상세 화면에서 예약을 생성합니다.
4. 오너 계정으로 예약 관리 화면에서 예약 상태를 확인합니다.
5. 오너 계정에서 수동 예약을 등록해 앱 외부 고객 예약을 관리합니다.
6. 사용자와 오너 간 채팅방을 만들고 메시지를 주고받습니다.
7. 완료된 예약을 기준으로 리뷰를 작성하고 갤러리 평점 변화를 확인합니다.
8. Gemini API 키가 있을 때 AI 검색 모달에서 조건 기반 추천 흐름을 확인합니다.

## 제출 전 체크리스트

- `.env`, `functions/.env`, Firebase 실제 설정 파일이 ZIP에 없는지 확인
- `.git`, `.idea`, `node_modules`, `android/**/build`, `android/app/.cxx`, 로그 파일 제외
- `npm test -- --runInBand` 통과
- `npx eslint . --quiet` 통과
- Android JS bundle 생성 확인
- README의 실행 방법대로 새 폴더에서 재현 가능 여부 확인
- API 키는 제출 전 재발급 또는 폐기

## 스크린샷

포트폴리오 제출 시 아래 항목의 캡처 또는 짧은 시연 GIF를 함께 첨부하는 것을 권장합니다.

- 역할 선택/회원가입
- 갤러리 목록과 상세 화면
- 예약 생성과 예약 내역
- 오너 예약 관리와 수동 예약
- 채팅 화면
- 아티스트 포트폴리오
- AI 갤러리 검색
