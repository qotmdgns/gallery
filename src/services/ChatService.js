// src/services/ChatService.js
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const DEBUG_CHAT = false;

const debugLog = (...args) => {
  if (__DEV__ && DEBUG_CHAT) {
    console.log(...args);
  }
};

/**
 * 梨꾪똿 ?쒕퉬??- 梨꾪똿諛??앹꽦 諛?愿由щ? ?꾪븳 以묒븰?붾맂 ?쒕퉬?? */
class ChatService {
  /**
   * 梨꾪똿諛??앹꽦 ?먮뒗 媛?몄삤湲?   * @param {Object} params - 梨꾪똿諛??앹꽦 ?뚮씪誘명꽣
   * @param {string} params.galleryId - 媛ㅻ윭由?ID
   * @param {string} params.galleryName - 媛ㅻ윭由??대쫫
   * @param {boolean} params.isArtist - ?꾪떚?ㅽ듃 ?щ?
   * @returns {Promise<string>} 梨꾪똿諛?ID
   */
  static async createOrGetChatRoom({ galleryId, galleryName, isArtist = false }) {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('濡쒓렇?몄씠 ?꾩슂?⑸땲??');
      }

      debugLog('ChatService: 梨꾪똿諛??앹꽦 ?쒖옉');
      debugLog('galleryId:', galleryId);
      debugLog('galleryName:', galleryName);
      debugLog('currentUser:', currentUser.uid);

      let ownerId;
      let galleryData = null;

      // 媛??媛ㅻ윭由?(?꾪떚?ㅽ듃? 吏곸젒 梨꾪똿)?몄? ?뺤씤
      if (galleryId && galleryId.startsWith('artist_')) {
        // artist_artistId ?뺤떇?먯꽌 artistId 異붿텧
        const artistId = galleryId.replace('artist_', '');
        debugLog('ChatService: ?꾪떚?ㅽ듃? 吏곸젒 梨꾪똿, artistId:', artistId);

        ownerId = artistId;
        galleryData = {
          name: galleryName,
          ownerId: artistId,
          isVirtual: true, // 媛??媛ㅻ윭由??쒖떆
        };
      } else {
        // ?ㅼ젣 媛ㅻ윭由??뺣낫 媛?몄삤湲?(?ㅻ꼫 ID ?뺤씤)
        const galleryDoc = await firestore()
          .collection('galleries')
          .doc(galleryId)
          .get();

        debugLog('galleryDoc.exists:', galleryDoc.exists);

        if (!galleryDoc.exists) {
          console.error('ChatService: 媛ㅻ윭由?臾몄꽌媛 議댁옱?섏? ?딆뒿?덈떎:', galleryId);
          throw new Error('媛ㅻ윭由щ? 李얠쓣 ???놁뒿?덈떎.');
        }

        galleryData = galleryDoc.data();
        debugLog('galleryData:', JSON.stringify(galleryData, null, 2));

        if (!galleryData) {
          console.error('ChatService: gallery data is missing');
          throw new Error('갤러리 데이터를 읽을 수 없습니다.');
        }

        // ownerId 媛?몄삤湲?(?щ윭 媛?μ꽦 泥댄겕)
        ownerId = galleryData.ownerId || galleryData.userId || galleryData.owner;
        debugLog('ownerId (?먮낯):', galleryData.ownerId);
        debugLog('userId (?泥?:', galleryData.userId);
        debugLog('owner (?泥?:', galleryData.owner);
        debugLog('理쒖쥌 ownerId:', ownerId);

        if (!ownerId) {
          console.error('ChatService: ownerId媛 ?놁뒿?덈떎. galleryData:', JSON.stringify(galleryData));
          console.error('?ъ슜 媛?ν븳 ?꾨뱶??', Object.keys(galleryData));
          throw new Error('媛ㅻ윭由??댁쁺???뺣낫瑜?李얠쓣 ???놁뒿?덈떎.');
        }
      }

      // ?먭린 ?먯떊怨?梨꾪똿?섎젮??寃쎌슦 諛⑹?
      if (currentUser.uid === ownerId) {
        console.error('ChatService: ?먭린 ?먯떊怨?梨꾪똿?????놁뒿?덈떎!');
        console.error('currentUser.uid:', currentUser.uid);
        console.error('ownerId:', ownerId);
        throw new Error('?먭린 ?먯떊怨?梨꾪똿?????놁뒿?덈떎.');
      }

      // 梨꾪똿諛?ID???ъ슜?륤D_媛ㅻ윭由촇D ?뺤떇
      const chatRoomId = `${currentUser.uid}_${galleryId}`;
      const chatRoomRef = firestore().collection('chatRooms').doc(chatRoomId);

      debugLog('ChatService: 梨꾪똿 李멸????뺤씤');
      debugLog('  - currentUser.uid:', currentUser.uid);
      debugLog('  - ownerId:', ownerId);
      debugLog('  - ?숈씪 ?щ?:', currentUser.uid === ownerId);

      // 梨꾪똿諛⑹씠 ?대? 議댁옱?섎뒗吏 ?뺤씤
      debugLog('ChatService: 梨꾪똿諛?議댁옱 ?щ? ?뺤씤 ?쒖옉');
      const chatRoom = await chatRoomRef.get();
      debugLog('ChatService: 梨꾪똿諛?議고쉶 ?꾨즺, exists:', chatRoom.exists);

      const existingData = chatRoom.exists ? chatRoom.data() : null;
      debugLog('ChatService: existingData ???', typeof existingData);
      debugLog('ChatService: existingData 議댁옱:', !!existingData);

      // 梨꾪똿諛⑹씠 ?녾굅???곗씠?곌? ?먯긽??寃쎌슦 ?덈줈 ?앹꽦
      if (!chatRoom.exists || !existingData) {
        // ??梨꾪똿諛??앹꽦
        debugLog('ChatService: ??梨꾪똿諛??앹꽦 ?쒖옉 (exists:', chatRoom.exists, ', hasData:', !!existingData, ')');
        debugLog('  - currentUser.uid:', currentUser.uid);
        debugLog('  - currentUser.displayName:', currentUser.displayName);
        debugLog('  - ownerId:', ownerId);
        debugLog('  - galleryId:', galleryId);
        debugLog('  - galleryName:', galleryName);
        debugLog('  - galleryData.name:', galleryData?.name);

        const newChatRoom = {
          // 湲곕낯 ?뺣낫
          chatRoomId: chatRoomId,
          userId: currentUser.uid,
          userName: currentUser.displayName || '사용자',
          userType: isArtist ? 'artist' : 'user',

          // 媛ㅻ윭由??뺣낫
          galleryId: galleryId,
          galleryName: galleryName || galleryData.name,
          ownerId: ownerId,

          // 李멸???諛곗뿴 - 荑쇰━瑜??꾪빐 以묒슂!
          participants: [currentUser.uid, ownerId],

          // ??꾩뒪?ы봽
          createdAt: firestore.FieldValue.serverTimestamp(),
          lastMessage: '',
          lastMessageTime: firestore.FieldValue.serverTimestamp(),

          unreadCount: {
            [currentUser.uid]: 0,
            [ownerId]: 0
          }
        };

        debugLog('ChatService: ??梨꾪똿諛??곗씠??', JSON.stringify(newChatRoom, null, 2));
        await chatRoomRef.set(newChatRoom);
        debugLog('ChatService: ??梨꾪똿諛??앹꽦 ?꾨즺');
      } else {
        // 湲곗〈 梨꾪똿諛⑹씠 ?꾩슂???꾨뱶媛 ?놁쑝硫??낅뜲?댄듃
        debugLog('ChatService: 湲곗〈 梨꾪똿諛?議댁옱, ?낅뜲?댄듃 ?뺤씤 ?쒖옉');
        debugLog('ChatService: existingData.userId:', existingData.userId);
        debugLog('ChatService: existingData.ownerId:', existingData.ownerId);

        const updateData = {};
        let needUpdate = false;

        if (!existingData.userId) {
          updateData.userId = currentUser.uid;
          needUpdate = true;
          debugLog('湲곗〈 梨꾪똿諛⑹뿉 userId 異붽?:', currentUser.uid);
        }

        if (!existingData.ownerId) {
          updateData.ownerId = ownerId;
          needUpdate = true;
          debugLog('湲곗〈 梨꾪똿諛⑹뿉 ownerId 異붽?:', ownerId);
        }

        if (!existingData.participants || existingData.participants.length === 0) {
          updateData.participants = [currentUser.uid, ownerId];
          needUpdate = true;
          debugLog('湲곗〈 梨꾪똿諛⑹뿉 participants 異붽?');
        }

        if (!existingData.chatRoomId) {
          updateData.chatRoomId = chatRoomId;
          needUpdate = true;
        }

        if (!existingData.galleryId) {
          updateData.galleryId = galleryId;
          needUpdate = true;
        }

        if (!existingData.galleryName) {
          updateData.galleryName = galleryName || galleryData.name;
          needUpdate = true;
        }

        if (needUpdate) {
          debugLog('ChatService: 湲곗〈 梨꾪똿諛??낅뜲?댄듃:', chatRoomId, updateData);
          await chatRoomRef.update(updateData);
          debugLog('ChatService: 湲곗〈 梨꾪똿諛??낅뜲?댄듃 ?꾨즺');
        } else {
          debugLog('ChatService: existing chat room update not needed');
        }
      }

      return chatRoomId;
    } catch (error) {
      console.error('ChatService: 梨꾪똿諛??앹꽦 ?ㅽ뙣:', error);
      console.error('?먮윭 ?대쫫:', error.name);
      console.error('?먮윭 硫붿떆吏:', error.message);
      console.error('?먮윭 ?ㅽ깮:', error.stack);
      throw error;
    }
  }

  /**
   * ?ㅻ꼫媛 諛쏆? 梨꾪똿諛?紐⑸줉 議고쉶
   * @param {string} ownerId - ?ㅻ꼫 ID
   * @returns {Promise<Array>} 梨꾪똿諛?紐⑸줉
   */
  static async getOwnerChatRooms(ownerId) {
    try {
      // ownerId濡?吏곸젒 議고쉶 (媛???⑥쑉??
      const snapshot = await firestore()
        .collection('chatRooms')
        .where('ownerId', '==', ownerId)
        .orderBy('lastMessageTime', 'desc')
        .get();

      const chatRooms = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // ?먯떊??怨좉컼?쇰줈 ?쒖옉??梨꾪똿 ?쒖쇅
        if (data.userId !== ownerId) {
          chatRooms.push({
            id: doc.id,
            ...data
          });
        }
      });

      return chatRooms;
    } catch (error) {
      if (error.code === 'failed-precondition') {
        debugLog('ChatService: missing index, retrying without orderBy');

        const snapshot = await firestore()
          .collection('chatRooms')
          .where('ownerId', '==', ownerId)
          .get();

        const chatRooms = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.userId !== ownerId) {
            chatRooms.push({
              id: doc.id,
              ...data
            });
          }
        });

        // ?대씪?댁뼵???뺣젹
        chatRooms.sort((a, b) => {
          const timeA = a.lastMessageTime?.toMillis?.() || 0;
          const timeB = b.lastMessageTime?.toMillis?.() || 0;
          return timeB - timeA;
        });

        return chatRooms;
      }
      throw error;
    }
  }

  /**
   * ?ъ슜?먭? ?쒖옉??梨꾪똿諛?紐⑸줉 議고쉶
   * @param {string} userId - ?ъ슜??ID
   * @returns {Promise<Array>} 梨꾪똿諛?紐⑸줉
   */
  static async getUserChatRooms(userId) {
    try {
      // userId濡?吏곸젒 議고쉶
      const snapshot = await firestore()
        .collection('chatRooms')
        .where('userId', '==', userId)
        .orderBy('lastMessageTime', 'desc')
        .get();

      const chatRooms = [];
      snapshot.forEach(doc => {
        chatRooms.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return chatRooms;
    } catch (error) {
      if (error.code === 'failed-precondition') {
        debugLog('ChatService: missing index, retrying without orderBy');

        const snapshot = await firestore()
          .collection('chatRooms')
          .where('userId', '==', userId)
          .get();

        const chatRooms = [];
        snapshot.forEach(doc => {
          chatRooms.push({
            id: doc.id,
            ...doc.data()
          });
        });

        // ?대씪?댁뼵???뺣젹
        chatRooms.sort((a, b) => {
          const timeA = a.lastMessageTime?.toMillis?.() || 0;
          const timeB = b.lastMessageTime?.toMillis?.() || 0;
          return timeB - timeA;
        });

        return chatRooms;
      }
      throw error;
    }
  }

  /**
   * 梨꾪똿諛⑹쓽 ?쎌? ?딆? 硫붿떆吏 ???낅뜲?댄듃
   * @param {string} chatRoomId - 梨꾪똿諛?ID
   * @param {string} userId - ?ъ슜??ID
   * @param {number} count - 移댁슫??(0?쇰줈 ?ㅼ젙?섎㈃ ?쎌쓬 泥섎━)
   */
  static async updateUnreadCount(chatRoomId, userId, count = 0) {
    try {
      await firestore()
        .collection('chatRooms')
        .doc(chatRoomId)
        .update({
          [`unreadCount.${userId}`]: count
        });
    } catch (error) {
      console.error('ChatService: ?쎌? ?딆? 硫붿떆吏 ???낅뜲?댄듃 ?ㅽ뙣:', error);
    }
  }

  /**
   * 硫붿떆吏 ?꾩넚
   * @param {string} chatRoomId - 梨꾪똿諛?ID
   * @param {Object} message - 硫붿떆吏 媛앹껜
   * @returns {Promise<void>}
   */
  static async sendMessage(chatRoomId, message) {
    try {
      debugLog('=== ChatService.sendMessage ===');
      debugLog('chatRoomId:', chatRoomId);
      debugLog('message ?먮낯:', JSON.stringify(message, null, 2));

      const chatRoomRef = firestore().collection('chatRooms').doc(chatRoomId);

      // undefined 媛??쒓굅 (Firestore??undefined瑜??덉슜?섏? ?딆쓬)
      const cleanMessage = {};
      Object.keys(message).forEach(key => {
        const value = message[key];
        if (value !== undefined && value !== null) {
          cleanMessage[key] = value;
        } else {
          console.warn(`?좑툘 硫붿떆吏 ?꾨뱶 "${key}"媛 ${value}?낅땲?? ?쒓굅?⑸땲??`);
        }
      });

      // ?꾩닔 ?꾨뱶 ?뺤씤
      if (!cleanMessage.senderId) {
        throw new Error('senderId媛 ?꾩슂?⑸땲??');
      }
      if (!cleanMessage.senderName) {
        console.warn('?좑툘 senderName???놁뒿?덈떎. 湲곕낯媛??ㅼ젙');
        cleanMessage.senderName = '사용자';
      }
      if (!cleanMessage.type) {
        console.warn('?좑툘 type???놁뒿?덈떎. 湲곕낯媛??ㅼ젙');
        cleanMessage.type = 'user';
      }

      debugLog('?뺤젣??硫붿떆吏:', JSON.stringify(cleanMessage, null, 2));

      // 硫붿떆吏 異붽?
      await chatRoomRef.collection('messages').add({
        ...cleanMessage,
        createdAt: firestore.FieldValue.serverTimestamp()
      });

      debugLog('硫붿떆吏 ????꾨즺');

      // 梨꾪똿諛?留덉?留?硫붿떆吏 ?낅뜲?댄듃 (undefined 諛⑹?)
      const updateData = {
        lastMessageTime: firestore.FieldValue.serverTimestamp()
      };

      // lastMessage??text媛 ?덉쑝硫?text, ?놁쑝硫?'?ъ쭊'
      if (cleanMessage.text && cleanMessage.text.trim()) {
        updateData.lastMessage = String(cleanMessage.text);
      } else {
        updateData.lastMessage = '?ъ쭊';
      }

      debugLog('梨꾪똿諛??낅뜲?댄듃 ?곗씠??', updateData);
      await chatRoomRef.update(updateData);

      debugLog('梨꾪똿諛??낅뜲?댄듃 ?꾨즺');

      // ?곷?諛⑹쓽 ?쎌? ?딆? 硫붿떆吏 ??利앷?
      const chatRoom = await chatRoomRef.get();
      if (chatRoom.exists) {
        const data = chatRoom.data();
        debugLog('=== ?쎌? ?딆? 硫붿떆吏 ???낅뜲?댄듃 ===');
        debugLog('梨꾪똿諛?participants:', data.participants);
        debugLog('硫붿떆吏 senderId:', cleanMessage.senderId);

        // participants 諛곗뿴???좏슚?쒖? ?뺤씤
        if (!data.participants || !Array.isArray(data.participants)) {
          console.error('??participants 諛곗뿴???녾굅???섎せ?섏뿀?듬땲??', data.participants);
          console.warn('?좑툘 ?쎌? ?딆? 硫붿떆吏 ???낅뜲?댄듃瑜?嫄대꼫?곷땲??');
          return;
        }

        // senderId媛 string?몄? ?뺤씤
        const senderIdStr = String(cleanMessage.senderId);
        debugLog('senderId (string):', senderIdStr);

        const otherUserId = data.participants.find(id => String(id) !== senderIdStr);
        debugLog('?곷?諛?userId:', otherUserId);
        debugLog('?곷?諛?userId ???', typeof otherUserId);

        // otherUserId媛 ?좏슚?쒖? ?뺤씤 (undefined, null, empty string 泥댄겕)
        if (otherUserId && String(otherUserId).trim()) {
          const currentUnread = data.unreadCount?.[otherUserId] || 0;
          debugLog('?꾩옱 ?쎌? ?딆? 硫붿떆吏 ??', currentUnread);

          const unreadCountKey = `unreadCount.${String(otherUserId)}`;
          debugLog('?낅뜲?댄듃???꾨뱶 ??', unreadCountKey);

          if (unreadCountKey.includes('undefined')) {
            console.error('??unreadCount ?ㅼ뿉 undefined媛 ?ы븿?섏뼱 ?덉뒿?덈떎!');
            console.error('otherUserId:', otherUserId);
            console.error('participants:', data.participants);
            console.warn('?좑툘 ?쎌? ?딆? 硫붿떆吏 ???낅뜲?댄듃瑜?嫄대꼫?곷땲??');
            return;
          }

          await chatRoomRef.update({
            [unreadCountKey]: currentUnread + 1
          });
          debugLog('???쎌? ?딆? 硫붿떆吏 ???낅뜲?댄듃 ?꾨즺');
        } else {
          console.error('???곷?諛?userId瑜?李얠쓣 ???녾굅???좏슚?섏? ?딆뒿?덈떎.');
          console.error('otherUserId:', otherUserId);
          console.error('participants:', data.participants);
          console.error('senderId:', cleanMessage.senderId);
        }
      } else {
        console.warn('?좑툘 梨꾪똿諛?臾몄꽌瑜?李얠쓣 ???놁뒿?덈떎.');
      }
    } catch (error) {
      console.error('ChatService: 硫붿떆吏 ?꾩넚 ?ㅽ뙣:', error);
      console.error('?ㅻ쪟 ?ㅽ깮:', error.stack);
      throw error;
    }
  }
}

export default ChatService;
