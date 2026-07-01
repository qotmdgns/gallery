// src/screens/ChatListScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import useLoginStore from '../store/useLoginStore';

const ChatListScreen = ({ navigation, route }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth().currentUser;
  const { userType } = useLoginStore();

  // 오너 모드인지 확인 (오너 탭에서 접근한 경우)
  const isOwnerMode = route?.params?.viewMode === 'owner' || (userType === 'owner' && route?.name === 'Chat');

  useEffect(() => {
    console.log('=== ChatListScreen Debug ===');
    console.log('Current User:', currentUser?.uid);
    console.log('User Type:', userType);
    console.log('Is Owner Mode:', isOwnerMode);

    if (!currentUser) {
      console.log('No current user, stopping load');
      setLoading(false);
      return;
    }

    loadChats();
  }, [currentUser, isOwnerMode]);

  const loadChats = async () => {
    try {
      console.log('=== loadChats 시작 ===');
      console.log('Firestore 연결 시도...');

      let query;

      if (isOwnerMode && userType === 'owner') {
        // 오너가 받은 문의 조회
        console.log('ChatListScreen: 오너 모드 - 받은 문의 조회');
        console.log('Query: ownerId ==', currentUser.uid);
        query = firestore()
          .collection('chatRooms')
          .where('ownerId', '==', currentUser.uid);
      } else {
        // 사용자가 보낸 채팅 조회
        console.log('ChatListScreen: 사용자 모드 - 보낸 채팅 조회');
        console.log('Query: userId ==', currentUser.uid);
        query = firestore()
          .collection('chatRooms')
          .where('userId', '==', currentUser.uid);
      }

      console.log('Firestore 리스너 설정 중...');

      // 실시간 리스너 설정
      const unsubscribe = query.onSnapshot(
        (snapshot) => {
          console.log('=== Firestore 스냅샷 수신 ===');
          console.log('문서 개수:', snapshot.size);
          console.log('비어있음:', snapshot.empty);

          const chatList = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            console.log('채팅방 ID:', doc.id);
            console.log('채팅방 데이터:', JSON.stringify(data, null, 2));

            // 오너 모드에서는 자신이 고객으로 보낸 채팅 제외
            if (isOwnerMode && data.userId === currentUser.uid) {
              console.log('오너 모드에서 자신의 채팅 제외:', doc.id);
              return;
            }

            chatList.push({
              id: doc.id,
              ...data,
            });
          });

          // 시간순 정렬 (최신 순)
          chatList.sort((a, b) => {
            const timeA = getTimestamp(a.lastMessageTime);
            const timeB = getTimestamp(b.lastMessageTime);
            return timeB - timeA;
          });

          console.log(`ChatListScreen: ${chatList.length}개 채팅방 로드 완료`);
          console.log('최종 채팅 목록:', chatList);
          setChats(chatList);
          setLoading(false);
        },
        (error) => {
          console.error('=== Firestore 오류 ===');
          console.error('오류 코드:', error.code);
          console.error('오류 메시지:', error.message);
          console.error('전체 오류:', error);
          setChats([]);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('=== loadChats 오류 ===');
      console.error('오류:', error);
      setChats([]);
      setLoading(false);
    }
  };

  const getTimestamp = (timestamp) => {
    if (!timestamp) return 0;
    if (timestamp.toMillis) return timestamp.toMillis();
    if (timestamp.seconds) return timestamp.seconds * 1000;
    if (timestamp._seconds) return timestamp._seconds * 1000;
    return 0;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now - date;

      if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      if (diff < 48 * 60 * 60 * 1000) {
        return '어제';
      }

      return date.toLocaleDateString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
      });
    } catch (error) {
      return '';
    }
  };

  const handleChatPress = (item) => {
    console.log('=== handleChatPress ===');
    console.log('item:', JSON.stringify(item, null, 2));
    console.log('galleryName:', item.galleryName);
    console.log('isOwnerMode:', isOwnerMode);

    navigation.navigate('ChatDetail', {
      chatRoomId: item.id,
      galleryId: item.galleryId || item.id.split('_')[1], // fallback: chatRoomId에서 추출
      galleryName: item.galleryName || '갤러리',
      isOwner: isOwnerMode,
    });
  };

  const renderChatItem = ({ item }) => {
    const isArtist = item.userType === 'artist';

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
      >
        <View style={[styles.avatar, isArtist && styles.artistAvatar]}>
          <Icon
            name={isOwnerMode ? (isArtist ? "palette" : "person") : "store"}
            size={24}
            color={isOwnerMode && isArtist ? "#4B7BFF" : "#666"}
          />
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <View>
              {isOwnerMode ? (
                <>
                  <Text style={styles.userName}>{item.userName || '사용자'}</Text>
                  {isArtist && (
                    <View style={styles.artistBadge}>
                      <Text style={styles.artistBadgeText}>아티스트</Text>
                    </View>
                  )}
                  <Text style={styles.gallerySubtext}>{item.galleryName}</Text>
                </>
              ) : (
                <Text style={styles.galleryName}>{item.galleryName || '갤러리'}</Text>
              )}
            </View>
            <Text style={styles.time}>{formatTime(item.lastMessageTime)}</Text>
          </View>

          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || '대화를 시작해보세요'}
          </Text>
        </View>
      </TouchableOpacity>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {isOwnerMode ? '문의 관리' : '채팅'}
        </Text>
        {isOwnerMode && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{chats.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={chats.length === 0 && styles.emptyList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="chat-bubble-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>
              {isOwnerMode ? '받은 문의가 없습니다' : '채팅 내역이 없습니다'}
            </Text>
            <Text style={styles.emptySubText}>
              {isOwnerMode
                ? '고객이나 아티스트가 문의하면 여기에 표시됩니다'
                : '갤러리에 문의하면 여기에 표시됩니다'}
            </Text>
            <Text style={styles.emptyHint}>
              💡 갤러리 상세 페이지에서 "문의하기" 버튼을 눌러 채팅을 시작하세요
            </Text>
          </View>
        }
      />
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 10,
  },
  badge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  artistAvatar: {
    backgroundColor: '#E8F0FF',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  galleryName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  gallerySubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  artistBadge: {
    backgroundColor: '#4B7BFF',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  artistBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  emptyList: {
    flex: 1,
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
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    color: '#4B7BFF',
    marginTop: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default ChatListScreen;