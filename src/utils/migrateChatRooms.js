// src/utils/migrateChatRooms.js
// 기존 채팅방에 participants 필드와 ownerId 필드 추가하는 마이그레이션 스크립트

import firestore from '@react-native-firebase/firestore';

/**
 * 모든 채팅방의 데이터 구조를 통합 형식으로 마이그레이션
 * - ownerId 필드 추가
 * - participants 배열 추가
 * - chatRoomId 필드 추가
 */
export const migrateChatRoomsParticipants = async () => {
  try {
    console.log('채팅방 마이그레이션 시작...');

    // 모든 채팅방 가져오기
    const chatRoomsSnapshot = await firestore()
      .collection('chatRooms')
      .get();

    console.log(`총 ${chatRoomsSnapshot.size}개의 채팅방을 확인합니다.`);

    const batch = firestore().batch();
    let updateCount = 0;
    let ownerIdAddCount = 0;

    for (const doc of chatRoomsSnapshot.docs) {
      const data = doc.data();
      let needUpdate = false;
      const updateData = {};

      // chatRoomId가 없으면 추가
      if (!data.chatRoomId) {
        updateData.chatRoomId = doc.id;
        needUpdate = true;
      }

      // ownerId가 없으면 갤러리에서 가져오기
      if (!data.ownerId && data.galleryId) {
        const galleryDoc = await firestore()
          .collection('galleries')
          .doc(data.galleryId)
          .get();

        if (galleryDoc.exists) {
          const galleryData = galleryDoc.data();
          if (galleryData.ownerId) {
            updateData.ownerId = galleryData.ownerId;
            ownerIdAddCount++;
            needUpdate = true;
            console.log(`채팅방 ${doc.id}: ownerId 추가 (${galleryData.ownerId})`);
          }
        }
      }

      // participants 필드가 없거나 빈 배열인 경우
      if (!data.participants || data.participants.length === 0) {
        const participants = [];

        // userId가 있으면 추가
        if (data.userId) {
          participants.push(data.userId);
        }

        // ownerId가 있으면 추가 (방금 추가한 것도 포함)
        const ownerId = updateData.ownerId || data.ownerId;
        if (ownerId && ownerId !== data.userId) {
          participants.push(ownerId);
        }

        // participants가 비어있지 않으면 업데이트
        if (participants.length > 0) {
          updateData.participants = participants;
          needUpdate = true;

          console.log(`채팅방 ${doc.id} participants 업데이트:`, {
            userId: data.userId,
            ownerId: ownerId,
            participants: participants
          });
        }
      }

      // 업데이트가 필요한 경우
      if (needUpdate) {
        batch.update(doc.ref, updateData);
        updateCount++;
      }
    }

    if (updateCount > 0) {
      await batch.commit();
      console.log(`${updateCount}개의 채팅방이 업데이트되었습니다.`);
      console.log(`${ownerIdAddCount}개의 채팅방에 ownerId가 추가되었습니다.`);
    } else {
      console.log('업데이트할 채팅방이 없습니다.');
    }

    return {
      success: true,
      updated: updateCount,
      ownerIdAdded: ownerIdAddCount,
      total: chatRoomsSnapshot.size
    };
  } catch (error) {
    console.error('채팅방 마이그레이션 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 특정 채팅방의 participants 확인
export const checkChatRoomParticipants = async (chatRoomId) => {
  try {
    const chatRoom = await firestore()
      .collection('chatRooms')
      .doc(chatRoomId)
      .get();

    if (chatRoom.exists) {
      const data = chatRoom.data();
      console.log(`채팅방 ${chatRoomId}:`, {
        userId: data.userId,
        ownerId: data.ownerId,
        participants: data.participants || '없음',
        participantsCount: data.participants?.length || 0
      });
      return data.participants;
    } else {
      console.log(`채팅방 ${chatRoomId}를 찾을 수 없습니다.`);
      return null;
    }
  } catch (error) {
    console.error('채팅방 확인 실패:', error);
    return null;
  }
};