# Firebase Cloud Functions - Gallery Booking App

## 개요
갤러리 예약 앱을 위한 Firebase Cloud Functions API 서버입니다.
FCM 토큰 관리, 푸시 알림 전송, 자동 알림 트리거 등의 기능을 제공합니다.

## 주요 기능

### 1. FCM 토큰 관리
- `saveFCMToken`: FCM 토큰 저장/업데이트
- `deleteFCMToken`: FCM 토큰 삭제 (로그아웃 시)

### 2. 푸시 알림 전송
- `sendPushNotification`: 단일 사용자 알림
- `sendBatchNotifications`: 다중 사용자 알림 (최대 500명)

### 3. 자동 알림 트리거
- `onReservationCreated`: 예약 생성 시 오너에게 알림
- `onReservationUpdated`: 예약 상태 변경 시 사용자에게 알림
- `onMessageCreated`: 새 채팅 메시지 시 수신자에게 알림

### 4. 예약 리마인더
- `reservationReminder`: 매일 오전 10시 내일 예약 리마인더

### 5. 유지보수
- `cleanupOldTokens`: 매주 일요일 새벽 3시 만료 토큰 정리

## 설치 및 배포

### 1. 의존성 설치
```bash
cd functions
npm install
```

### 2. Firebase 프로젝트 설정
```bash
firebase use galleryproject-e61c4
```

### 3. 로컬 테스트 (에뮬레이터)
```bash
npm run serve
```

### 4. 프로덕션 배포
```bash
npm run deploy
```

## API 엔드포인트

### FCM 토큰 저장
```
POST /saveFCMToken
Body: {
  userId: string,
  fcmToken: string,
  platform?: string,
  deviceInfo?: object
}
```

### 푸시 알림 전송
```
POST /sendPushNotification
Body: {
  userId: string,
  title: string,
  body: string,
  data?: object,
  channelId?: string
}
```

### 배치 알림 전송
```
POST /sendBatchNotifications
Body: {
  userIds: string[],
  title: string,
  body: string,
  data?: object,
  channelId?: string
}
```

## 환경 변수 설정

Firebase Functions 환경 변수 설정:
```bash
firebase functions:config:set someservice.key="THE API KEY"
```

## 로그 확인
```bash
npm run logs
```

## 주의사항

1. **Node.js 버전**: Node.js 20 필요
2. **권한**: Firebase Admin SDK 권한 필요
3. **요금**: FCM 메시지 전송은 무료이나, Cloud Functions 실행에는 요금이 발생할 수 있음
4. **제한사항**: 
   - 단일 배치 알림은 최대 500명
   - FCM 토큰은 주기적으로 갱신됨
   - iOS는 별도의 APNs 설정 필요

## 문제 해결

### FCM 토큰이 유효하지 않은 경우
- 자동으로 DB에서 제거됨
- 사용자가 앱을 재설치하거나 재로그인 시 새 토큰 생성

### 알림이 수신되지 않는 경우
1. FCM 토큰이 유효한지 확인
2. 사용자 알림 권한 설정 확인
3. 채널 ID가 올바른지 확인
4. Firebase Console에서 테스트 메시지 전송

## 라이선스
MIT