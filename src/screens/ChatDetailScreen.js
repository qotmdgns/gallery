// src/screens/ChatDetailScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';
import { launchImageLibrary } from 'react-native-image-picker';
import ChatService from '../services/ChatService';

const DEBUG_CHAT_SCREEN = false;

const debugLog = (...args) => {
  if (__DEV__ && DEBUG_CHAT_SCREEN) {
    console.log(...args);
  }
};

const ChatDetailScreen = ({ route, navigation }) => {
  // route.params?먯꽌 ?덉쟾?섍쾶 媛?異붿텧
  const params = route?.params || {};
  const {
    chatRoomId: initialChatRoomId,
    galleryId,
    galleryName,
    isOwner = false,
    isArtist = false
  } = params;

  debugLog('=== ChatDetailScreen ?뚮씪誘명꽣 ===');
  debugLog('?꾩껜 params:', JSON.stringify(params, null, 2));
  debugLog('initialChatRoomId:', initialChatRoomId);
  debugLog('galleryId:', galleryId);
  debugLog('galleryName:', galleryName);
  debugLog('isOwner:', isOwner);

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatRoomId, setChatRoomId] = useState(initialChatRoomId);
  const [uploadingImage, setUploadingImage] = useState(false);

  const flatListRef = useRef(null);
  const currentUser = auth().currentUser;
  const messagesUnsubscribe = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      title: galleryName || '梨꾪똿',
    });

    initializeChatRoom();

    return () => {
      if (messagesUnsubscribe.current) {
        messagesUnsubscribe.current();
      }
    };
  }, []);

  const initializeChatRoom = async () => {
    try {
      debugLog('=== ChatDetailScreen 珥덇린???쒖옉 ===');
      debugLog('initialChatRoomId:', initialChatRoomId);
      debugLog('galleryId:', galleryId);
      debugLog('galleryName:', galleryName);
      debugLog('isOwner:', isOwner);

      let roomId = chatRoomId;

      // 梨꾪똿諛?ID媛 ?놁쑝硫??앹꽦 ?먮뒗 媛?몄삤湲?
      if (!roomId) {
        debugLog('ChatDetailScreen: 梨꾪똿諛?ID ?놁쓬, ?덈줈 ?앹꽦 ?쒕룄');

        if (!galleryId) {
          console.error('ChatDetailScreen: galleryId媛 ?놁뒿?덈떎!');
          Alert.alert('?ㅻ쪟', '媛ㅻ윭由??뺣낫媛 ?놁뒿?덈떎.');
          navigation.goBack();
          return;
        }

        try {
          roomId = await ChatService.createOrGetChatRoom({
            galleryId,
            galleryName,
            isArtist,
          });
          debugLog('ChatDetailScreen: 梨꾪똿諛??앹꽦 ?꾨즺:', roomId);
          setChatRoomId(roomId);
        } catch (createError) {
          console.error('ChatDetailScreen: 梨꾪똿諛??앹꽦 ?ㅽ뙣:', createError);
          Alert.alert('?ㅻ쪟', `梨꾪똿諛??앹꽦 ?ㅽ뙣: ${createError.message}`);
          navigation.goBack();
          return;
        }
      }

      if (!roomId) {
        console.error('ChatDetailScreen: roomId媛 ?ъ쟾???놁뒿?덈떎');
        Alert.alert('?ㅻ쪟', '梨꾪똿諛⑹쓣 李얠쓣 ???놁뒿?덈떎.');
        navigation.goBack();
        return;
      }

      debugLog('ChatDetailScreen: 理쒖쥌 梨꾪똿諛?ID:', roomId);

      // 硫붿떆吏 援щ룆
      subscribeToMessages(roomId);

      // ?쎌쓬 泥섎━
      if (currentUser) {
        await ChatService.updateUnreadCount(roomId, currentUser.uid, 0);
      }
    } catch (error) {
      console.error('=== ChatDetailScreen 珥덇린???ㅻ쪟 ===');
      console.error('?ㅻ쪟:', error);
      Alert.alert('?ㅻ쪟', `梨꾪똿諛⑹쓣 遺덈윭?????놁뒿?덈떎: ${error.message}`);
      setLoading(false);
    }
  };

  const subscribeToMessages = (roomId) => {
    debugLog('=== ChatDetailScreen 硫붿떆吏 援щ룆 ===');
    debugLog('梨꾪똿諛?ID:', roomId);
    debugLog('Firestore 寃쎈줈:', `chatRooms/${roomId}/messages`);

    messagesUnsubscribe.current = firestore()
      .collection('chatRooms')
      .doc(roomId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        (snapshot) => {
          debugLog('=== 硫붿떆吏 ?ㅻ깄???섏떊 ===');
          debugLog('硫붿떆吏 媛쒖닔:', snapshot.size);
          debugLog('鍮꾩뼱?덉쓬:', snapshot.empty);

          const messageList = [];
          snapshot.forEach((doc) => {
            const msgData = doc.data();
            debugLog('硫붿떆吏 ID:', doc.id);
            debugLog('硫붿떆吏 ?댁슜:', msgData.text || '(?대?吏)');
            debugLog('蹂대궦?щ엺:', msgData.senderName, '(', msgData.senderId, ')');

            messageList.push({
              id: doc.id,
              ...msgData,
            });
          });

          debugLog(`ChatDetailScreen: ${messageList.length}媛?硫붿떆吏 濡쒕뱶 ?꾨즺`);
          setMessages(messageList);
          setLoading(false);

          // ??硫붿떆吏媛 ?덉쑝硫??ㅽ겕濡?
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        },
        (error) => {
          console.error('=== 硫붿떆吏 援щ룆 ?ㅻ쪟 ===');
          console.error('?ㅻ쪟 肄붾뱶:', error.code);
          console.error('?ㅻ쪟 硫붿떆吏:', error.message);
          console.error('?꾩껜 ?ㅻ쪟:', error);
          setLoading(false);
        }
      );
  };

  const sendMessage = async () => {
    const text = inputMessage.trim();

    debugLog('=== sendMessage ?몄텧 ===');
    debugLog('text:', text);
    debugLog('chatRoomId:', chatRoomId);
    debugLog('isOwner:', isOwner);
    debugLog('galleryName:', galleryName);
    debugLog('currentUser.displayName:', currentUser?.displayName);

    if (!text) {
      debugLog('硫붿떆吏媛 鍮꾩뼱?덉뒿?덈떎');
      return;
    }

    if (!chatRoomId) {
      console.error('chatRoomId媛 ?놁뒿?덈떎!');
      Alert.alert('?ㅻ쪟', '梨꾪똿諛⑹씠 以鍮꾨릺吏 ?딆븯?듬땲?? ?좎떆 ???ㅼ떆 ?쒕룄?댁＜?몄슂.');
      return;
    }

    // ?낅젰 ?꾨뱶 利됱떆 珥덇린??
    setInputMessage('');

    try {
      // senderName 寃곗젙 (?뺤떎?섍쾶 string?쇰줈, 鍮?臾몄옄??泥댄겕)
      let senderName = '사용자';
      if (isOwner) {
        if (galleryName && typeof galleryName === 'string' && galleryName.trim()) {
          senderName = galleryName.trim();
        } else {
          senderName = '갤러리 운영자';
          console.warn('?좑툘 galleryName??鍮꾩뼱?덇굅???좏슚?섏? ?딆쓬:', galleryName);
        }
      } else {
        if (currentUser?.displayName && typeof currentUser.displayName === 'string' && currentUser.displayName.trim()) {
          senderName = currentUser.displayName.trim();
        } else {
          senderName = '사용자';
          console.warn('?좑툘 displayName??鍮꾩뼱?덇굅???좏슚?섏? ?딆쓬:', currentUser?.displayName);
        }
      }

      // undefined媛 ?녿뒗 源⑤걮??硫붿떆吏 媛앹껜 ?앹꽦
      const message = {
        text: String(text).trim(),
        senderId: String(currentUser.uid),
        senderName: String(senderName),
        type: String(isOwner ? 'gallery' : 'user'),
      };

      debugLog('硫붿떆吏 ?꾨뱶 ???諛?媛??뺤씤:');
      debugLog('- text:', typeof message.text, `"${message.text}"`);
      debugLog('- senderId:', typeof message.senderId, `"${message.senderId}"`);
      debugLog('- senderName:', typeof message.senderName, `"${message.senderName}"`);
      debugLog('- type:', typeof message.type, `"${message.type}"`);

      // undefined 泥댄겕
      Object.keys(message).forEach(key => {
        if (message[key] === undefined || message[key] === 'undefined') {
          console.error(`??硫붿떆吏 ?꾨뱶 "${key}"媛 undefined?낅땲??`);
        }
      });

      debugLog('硫붿떆吏 ?꾩넚 ?쒕룄:', JSON.stringify(message, null, 2));

      await ChatService.sendMessage(chatRoomId, message);
      debugLog('??硫붿떆吏 ?꾩넚 ?깃났');

      // ?ㅽ겕濡?
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('ChatDetailScreen: 硫붿떆吏 ?꾩넚 ?ㅽ뙣:', error);
      // ?ㅽ뙣 ??硫붿떆吏 蹂듭썝
      setInputMessage(text);
      Alert.alert('?ㅻ쪟', `硫붿떆吏 ?꾩넚???ㅽ뙣?덉뒿?덈떎: ${error.message}`);
    }
  };

  const handleImagePicker = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets && response.assets[0]) {
        await uploadAndSendImage(response.assets[0]);
      }
    });
  };

  const uploadAndSendImage = async (image) => {
    if (!chatRoomId) {
      Alert.alert('?ㅻ쪟', '梨꾪똿諛⑹씠 以鍮꾨릺吏 ?딆븯?듬땲??');
      return;
    }

    setUploadingImage(true);

    try {
      // ?대?吏 ?낅줈??
      const fileName = `chat_images/${chatRoomId}/${currentUser.uid}/${Date.now()}_${image.fileName}`;
      const reference = storage().ref(fileName);
      await reference.putFile(image.uri);
      const imageUrl = await reference.getDownloadURL();

      // senderName 寃곗젙 (?뺤떎?섍쾶 string?쇰줈, 鍮?臾몄옄??泥댄겕)
      let senderName = '사용자';
      if (isOwner) {
        if (galleryName && typeof galleryName === 'string' && galleryName.trim()) {
          senderName = galleryName.trim();
        } else {
          senderName = '갤러리 운영자';
          console.warn('?좑툘 ?대?吏 ?낅줈?? galleryName??鍮꾩뼱?덇굅???좏슚?섏? ?딆쓬:', galleryName);
        }
      } else {
        if (currentUser?.displayName && typeof currentUser.displayName === 'string' && currentUser.displayName.trim()) {
          senderName = currentUser.displayName.trim();
        } else {
          senderName = '사용자';
          console.warn('?좑툘 ?대?吏 ?낅줈?? displayName??鍮꾩뼱?덇굅???좏슚?섏? ?딆쓬:', currentUser?.displayName);
        }
      }

      // ?대?吏 硫붿떆吏 ?꾩넚 (undefined ?놁씠)
      const message = {
        text: '',
        imageUrl: String(imageUrl),
        senderId: String(currentUser.uid),
        senderName: String(senderName),
        type: String(isOwner ? 'gallery' : 'user'),
      };

      debugLog('?대?吏 硫붿떆吏 ?꾩넚:', JSON.stringify(message, null, 2));
      await ChatService.sendMessage(chatRoomId, message);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('ChatDetailScreen: ?대?吏 ?낅줈???ㅽ뙣:', error);
      Alert.alert('?ㅻ쪟', '?대?吏 ?꾩넚???ㅽ뙣?덉뒿?덈떎.');
    } finally {
      setUploadingImage(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return '';
    }
  };

  // ?좎쭨媛 媛숈?吏 ?뺤씤?섎뒗 ?ы띁 ?⑥닔
  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    const date1 = d1.toDate ? d1.toDate() : new Date(d1);
    const date2 = d2.toDate ? d2.toDate() : new Date(d2);
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // ?좎쭨 援щ텇??而댄룷?뚰듃
  const DateSeparator = ({ date }) => {
    if (!date) return null;
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    const formattedDate = dateObj.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });

    return (
      <View style={styles.dateSeparatorContainer}>
        <View style={styles.dateSeparatorLine} />
        <Text style={styles.dateSeparatorText}>{formattedDate}</Text>
        <View style={styles.dateSeparatorLine} />
      </View>
    );
  };

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.senderId === currentUser?.uid;

    // ?좎쭨 援щ텇???쒖떆 ?щ? ?뺤씤
    const prevItem = index > 0 ? messages[index - 1] : null;
    const showDateSeparator = !prevItem || !isSameDay(item.createdAt, prevItem.createdAt);

    return (
      <View>
        {showDateSeparator && <DateSeparator date={item.createdAt} />}

        <View style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
        ]}>
          {!isMyMessage && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}

          <View style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
            item.imageUrl && styles.imageBubble
          ]}>
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={[
                styles.messageText,
                isMyMessage ? styles.myMessageText : styles.otherMessageText
              ]}>
                {item.text}
              </Text>
            )}
          </View>

          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.otherMessageTime
          ]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B7BFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="chat-bubble-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>??붾? ?쒖옉?대낫?몄슂!</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handleImagePicker}
          disabled={uploadingImage}
        >
          {uploadingImage ? (
            <ActivityIndicator size="small" color="#4B7BFF" />
          ) : (
            <Icon name="image" size={24} color="#4B7BFF" />
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder="硫붿떆吏瑜??낅젰?섏꽭??.."
          placeholderTextColor="#999"
          multiline
          maxLength={500}
          editable={!uploadingImage}
        />

        <TouchableOpacity
          style={styles.sendButton}
          onPress={sendMessage}
          disabled={!inputMessage.trim() || uploadingImage}
        >
          <Icon
            name="send"
            size={24}
            color={inputMessage.trim() && !uploadingImage ? '#4B7BFF' : '#ccc'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 15,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 15,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    marginLeft: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myMessageBubble: {
    backgroundColor: '#4B7BFF',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  imageBubble: {
    padding: 4,
    overflow: 'hidden',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#333',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: '#666',
    marginRight: 4,
  },
  otherMessageTime: {
    color: '#999',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  dateSeparatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
    justifyContent: 'center',
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 10,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
});

export default ChatDetailScreen;
