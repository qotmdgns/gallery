# 채팅 연속성 테스트 가이드

## 개요
갤러리 상세 페이지에서 시작한 채팅을 채팅 탭에서 이어갈 수 있도록 구현되어 있습니다.

## 구현 내용

### 1. 채팅방 ID 관리
- 채팅방 ID 형식: `{userId}_{galleryId}`
- 동일한 사용자가 동일한 갤러리와 채팅할 때는 항상 같은 채팅방 사용

### 2. ChatDetailScreen 파라미터
```javascript
{
  galleryId: "gallery_id",
  galleryName: "갤러리 이름",
  chatRoomId: "chat_room_id",  // 기존 채팅방 ID (있는 경우)
  isOwner: false,
  isArtist: true/false  // 사용자 타입에 따라
}
```

### 3. 채팅 흐름

#### A. 갤러리 상세에서 채팅 시작
1. GalleryDetailScreen → "1:1 문의하기" 버튼 클릭
2. ChatDetailScreen으로 이동
3. 채팅방 ID 생성: `{userId}_{galleryId}`
4. 채팅방이 없으면 새로 생성, 있으면 기존 채팅방 사용

#### B. 채팅 탭에서 채팅 계속
1. ChatScreen에서 채팅 목록 표시
2. 채팅방 클릭 시 ChatDetailScreen으로 이동
3. `chatRoomId` 파라미터로 기존 채팅방 ID 전달
4. 기존 메시지들이 표시되고 대화 계속 가능

## 테스트 시나리오

### 시나리오 1: 일반 사용자
1. 일반 사용자로 로그인
2. 갤러리 검색 → 상세 페이지 이동
3. "1:1 문의하기" 버튼 클릭
4. 메시지 전송 (예: "안녕하세요")
5. 뒤로가기로 채팅 화면 나가기
6. 하단 탭에서 "채팅" 탭 클릭
7. 방금 대화한 갤러리가 목록에 표시되는지 확인
8. 해당 채팅방 클릭
9. 이전 메시지("안녕하세요")가 표시되는지 확인
10. 추가 메시지 전송 가능한지 확인

### 시나리오 2: 아티스트
1. 아티스트로 로그인
2. 갤러리 검색 → 상세 페이지 이동
3. "1:1 문의하기" 버튼 클릭
4. 메시지 전송 (예: "전시 제안드립니다")
5. 채팅 탭으로 이동
6. 채팅 목록에서 해당 갤러리 확인
7. 클릭하여 대화 계속

### 시나리오 3: 갤러리 운영자
1. 갤러리 운영자로 로그인
2. 문의 관리(OwnerChatScreen) 확인
3. 받은 문의 클릭
4. 답장 전송
5. 사용자/아티스트가 채팅 탭에서 답장 확인 가능

## 디버깅 로그

콘솔에서 다음 로그를 확인하여 문제 해결:

```
ChatDetailScreen: createOrGetChatRoom 시작
- galleryId, galleryName, isOwner, isArtist, paramChatRoomId 확인

ChatDetailScreen: 사용자 모드, 채팅방 ID: {roomId}
- 생성된 채팅방 ID 확인

ChatDetailScreen: 기존 채팅방 사용 또는 새 채팅방 생성
- 채팅방 상태 확인

ChatScreen: 현재 사용자 ID, 사용자 타입
- 채팅 목록 조회 정보

ChatScreen: 채팅방 데이터
- 각 채팅방의 상세 정보
```

## 주요 확인 사항

### ✅ 구현 완료
1. 갤러리에서 시작한 채팅이 채팅 탭에 표시됨
2. 채팅 탭에서 클릭 시 이전 대화 내용 유지
3. 실시간 메시지 업데이트
4. 아티스트/일반 사용자 구분

### ⚠️ 필수 설정
1. Firestore 복합 인덱스 생성
   - chatRooms: userId + lastMessageTime
   - messages: createdAt

2. Firestore 보안 규칙
   - 사용자는 자신의 채팅방만 읽기/쓰기 가능
   - 갤러리 운영자는 자신의 갤러리 채팅방 읽기/쓰기 가능

## 문제 해결

### 채팅이 목록에 표시되지 않는 경우
1. Firestore 복합 인덱스 확인
2. userId가 채팅방에 올바르게 저장되었는지 확인
3. 콘솔 에러 메시지 확인

### 이전 메시지가 보이지 않는 경우
1. chatRoomId가 일치하는지 확인
2. messages 서브컬렉션 구독 확인
3. createdAt 인덱스 확인

### 실시간 업데이트가 안 되는 경우
1. Firestore 구독이 활성화되어 있는지 확인
2. 네트워크 연결 상태 확인
3. onSnapshot 에러 핸들링 확인