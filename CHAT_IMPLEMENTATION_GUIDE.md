# 아티스트-갤러리 운영자 채팅 구현 가이드

## 구현 완료 내용

### 1. 코드 수정 사항

#### GalleryDetailScreen.js
- 모든 사용자가 "1:1 문의하기" 버튼을 통해 갤러리와 채팅 가능
- `isArtist` 파라미터를 ChatDetail 화면으로 전달

#### ChatDetailScreen.js
- 실시간 메시지 구독 개선
- 아티스트 타입 구분 (`userType: 'artist'` 저장)
- 메시지 전송 최적화 (즉시 입력 필드 초기화)
- 타임스탬프 처리 개선
- 에러 발생 시 메시지 복원

#### ChatScreen.js
- 아티스트를 위한 맞춤 안내 메시지
- 실시간 업데이트 개선
- 복합 인덱스 없을 때 폴백 처리

#### OwnerChatScreen.js
- 아티스트와 일반 사용자 구분 표시
- 아티스트 배지 및 특별 아이콘

## Firestore 인덱스 설정 필요

Firebase Console에서 다음 복합 인덱스를 생성해야 합니다:

### 1. chatRooms 컬렉션 인덱스
```
Collection: chatRooms
Fields:
- userId (Ascending)
- lastMessageTime (Descending)
```

### 2. messages 서브컬렉션 인덱스
```
Collection group: messages
Fields:
- createdAt (Ascending)
```

## 테스트 시나리오

### 1. 아티스트로 로그인하여 채팅 시작
1. 아티스트 계정으로 로그인
2. 갤러리 검색 → 갤러리 상세 페이지 이동
3. "1:1 문의하기" 버튼 클릭
4. 메시지 입력 및 전송
5. 실시간으로 메시지가 표시되는지 확인

### 2. 갤러리 운영자로 확인
1. 갤러리 운영자 계정으로 로그인
2. 문의 관리(OwnerChatScreen) 이동
3. 아티스트 문의가 "아티스트" 배지와 함께 표시되는지 확인
4. 채팅방 클릭하여 대화 계속

### 3. 실시간 채팅 테스트
1. 두 기기/브라우저에서 각각 아티스트, 갤러리 운영자로 로그인
2. 채팅방 진입
3. 양쪽에서 메시지 전송
4. 실시간으로 메시지가 나타나는지 확인

## 주요 기능

### 아티스트 측
- 갤러리 상세 페이지에서 "1:1 문의하기"로 채팅 시작
- ChatScreen에서 모든 채팅 목록 확인
- 실시간 메시지 송수신

### 갤러리 운영자 측
- OwnerChatScreen에서 모든 문의 확인
- 아티스트 문의는 특별 표시 (배지, 아이콘)
- 실시간 메시지 송수신

## 데이터 구조

### chatRooms 문서
```javascript
{
  userId: "user_or_artist_uid",
  userName: "사용자 이름",
  userType: "user" | "artist",  // 사용자 타입
  galleryId: "gallery_id",
  galleryName: "갤러리 이름",
  ownerId: "owner_uid",
  lastMessage: "마지막 메시지",
  lastMessageTime: Timestamp,
  createdAt: Timestamp
}
```

### messages 문서
```javascript
{
  text: "메시지 내용",
  senderId: "sender_uid",
  senderName: "발신자 이름",
  type: "user" | "artist" | "gallery",
  createdAt: Timestamp
}
```

## 트러블슈팅

### 1. 채팅 목록이 표시되지 않는 경우
- Firestore 복합 인덱스가 생성되었는지 확인
- 콘솔에서 에러 메시지 확인
- userId가 올바르게 저장되었는지 확인

### 2. 실시간 업데이트가 안 되는 경우
- 네트워크 연결 확인
- Firestore 규칙이 읽기/쓰기를 허용하는지 확인
- 구독이 정상적으로 설정되었는지 콘솔 로그 확인

### 3. 메시지 전송 실패
- 채팅방이 정상적으로 생성되었는지 확인
- galleryId와 ownerId가 존재하는지 확인
- Firestore 쓰기 권한 확인

## 향후 개선 사항

1. 메시지 읽음 상태 표시
2. 이미지/파일 첨부 기능
3. 푸시 알림 연동
4. 메시지 검색 기능
5. 채팅방 삭제/나가기 기능