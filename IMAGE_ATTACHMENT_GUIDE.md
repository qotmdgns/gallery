# 채팅 이미지 첨부 기능 구현 가이드

## 구현 완료 내용

### 1. 필요 라이브러리
- `react-native-image-picker`: 이미지 선택 (이미 설치됨)
- `@react-native-firebase/storage`: Firebase Storage (이미 설치됨)

### 2. 구현된 기능

#### ChatDetailScreen.js 수정 사항

**새로운 기능:**
1. 이미지 선택 버튼 (갤러리 아이콘)
2. 이미지 업로드 중 로딩 표시
3. 이미지 메시지 표시
4. Firebase Storage에 이미지 저장

**주요 함수:**
- `handleImagePicker()`: 이미지 라이브러리 열기
- `uploadImageAndSend()`: 이미지 업로드 및 메시지 전송
- `renderMessage()`: 텍스트/이미지 메시지 구분 표시

#### ChatScreen.js 수정 사항
- 채팅 목록에서 "사진" 메시지 특별 표시
- 이미지 아이콘과 함께 표시

## 사용 방법

### 이미지 전송
1. 채팅 화면에서 입력창 왼쪽의 이미지 아이콘 클릭
2. 갤러리에서 사진 선택
3. 자동으로 업로드 및 전송
4. 업로드 중에는 로딩 인디케이터 표시

### 이미지 보기
- 채팅에서 전송된 이미지를 바로 확인
- 200x200 크기로 표시
- 둥근 모서리 적용

## Firebase Storage 구조

```
chat_images/
  └── {chatRoomId}/
      └── {timestamp}_{filename}
```

## Firestore 메시지 구조

### 텍스트 메시지
```javascript
{
  type: "user" | "artist" | "gallery",
  senderId: "uid",
  senderName: "이름",
  text: "메시지 내용",
  createdAt: Timestamp
}
```

### 이미지 메시지
```javascript
{
  type: "user" | "artist" | "gallery",
  senderId: "uid",
  senderName: "이름",
  imageUrl: "https://storage.url...",
  text: "",
  createdAt: Timestamp
}
```

## 권한 설정

### Android (android/app/src/main/AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

### iOS (ios/MyApp/Info.plist)
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>사진을 선택하여 채팅에 전송하기 위해 갤러리 접근이 필요합니다.</string>
```

## Firebase Storage 보안 규칙

```javascript
service firebase.storage {
  match /b/{bucket}/o {
    // 채팅 이미지
    match /chat_images/{chatRoomId}/{imageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.size < 10 * 1024 * 1024  // 10MB 제한
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## UI 구성

### 입력 영역
```
[이미지 아이콘] [텍스트 입력창] [전송 버튼]
```

### 메시지 표시
- 텍스트 메시지: 기존과 동일
- 이미지 메시지: 200x200 크기의 이미지 표시

## 제한 사항

1. **이미지 크기**: 최대 2000x2000 픽셀
2. **이미지 품질**: 80% 압축
3. **파일 크기**: Firebase Storage 규칙으로 10MB 제한
4. **파일 형식**: 이미지 파일만 가능 (JPEG, PNG 등)

## 테스트 시나리오

1. **이미지 전송 테스트**
   - 작은 이미지 전송 (< 1MB)
   - 큰 이미지 전송 (> 5MB)
   - 여러 이미지 연속 전송

2. **네트워크 상황 테스트**
   - WiFi에서 전송
   - 느린 네트워크에서 전송
   - 업로드 중 네트워크 끊김

3. **UI 테스트**
   - 업로드 중 로딩 표시 확인
   - 이미지와 텍스트 메시지 혼합 표시
   - 스크롤 성능 확인

## 향후 개선 사항

1. **이미지 미리보기**: 전송 전 이미지 미리보기
2. **카메라 촬영**: 갤러리 외 카메라 직접 촬영
3. **이미지 압축 옵션**: 사용자가 품질 선택
4. **다중 이미지**: 여러 이미지 동시 선택
5. **이미지 확대**: 이미지 클릭 시 전체 화면 보기
6. **다운로드**: 이미지 로컬 저장 기능
7. **이미지 캐싱**: 성능 향상을 위한 캐싱

## 트러블슈팅

### 이미지가 표시되지 않는 경우
1. Firebase Storage URL 확인
2. 네트워크 연결 상태 확인
3. Storage 보안 규칙 확인

### 업로드 실패
1. 파일 크기 제한 확인
2. Storage 쓰기 권한 확인
3. 네트워크 상태 확인

### 앱 크래시
1. 메모리 부족 (큰 이미지)
2. 권한 미허용
3. 라이브러리 링킹 문제