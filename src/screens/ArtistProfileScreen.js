// src/screens/ArtistProfileScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { launchImageLibrary } from 'react-native-image-picker';
import useLoginStore from '../store/useLoginStore';

const ArtistProfileScreen = ({ navigation, route }) => {
  const { logout, userId: currentUserId, userType } = useLoginStore();
  const { artistId, artwork: initialArtwork, artworkId } = route.params || {};
  const isViewingOtherProfile = artistId && artistId !== currentUserId;

  const [userData, setUserData] = useState(null);
  const [artistData, setArtistData] = useState(null);
  const [artwork, setArtwork] = useState(initialArtwork || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [stats, setStats] = useState({
    artworkCount: 0,
    exhibitionCount: 0,
    proposalCount: 0,
    followerCount: 0,
  });

  const currentUser = auth().currentUser;
  const targetUserId = isViewingOtherProfile ? artistId : currentUser?.uid;

  // Load artwork from database if artworkId is provided
  useEffect(() => {
    if (artworkId && !initialArtwork) {
      loadArtworkFromDatabase();
    }
  }, [artworkId]);

  const loadArtworkFromDatabase = async () => {
    try {
      const artworkDoc = await firestore()
        .collection('artworks')
        .doc(artworkId)
        .get();

      if (artworkDoc.exists) {
        const artworkData = {
          id: artworkDoc.id,
          ...artworkDoc.data()
        };
        setArtwork(artworkData);
      }
    } catch (error) {
      console.error('작품 로드 실패:', error);
    }
  };

  const fetchUserData = useCallback(async () => {
    try {
      if (!targetUserId) {
        setUserData(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 사용자 기본 정보 가져오기
      const userDoc = await firestore()
        .collection('users')
        .doc(targetUserId)
        .get();

      if (userDoc.exists) {
        setUserData(userDoc.data());
      }

      // 아티스트 프로필 정보 가져오기
      const artistDoc = await firestore()
        .collection('artists')
        .doc(targetUserId)
        .get();

      if (artistDoc.exists) {
        const data = artistDoc.data();
        setArtistData({
          ...data,
          genre: data?.genre || []
        });
      }

      // 포트폴리오 가져오기 (작품 목록)
      const artworksSnapshot = await firestore()
        .collection('artworks')
        .where('artistId', '==', targetUserId)
        .limit(6)
        .get();

      const artworks = artworksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPortfolio(artworks);
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetUserId]);

  const fetchArtistStats = useCallback(async () => {
    try {
      if (!targetUserId) {
        setStats({
          artworkCount: 0,
          exhibitionCount: 0,
          proposalCount: 0,
          followerCount: 0,
        });
        return;
      }

      let artworkCount = 0;
      let exhibitionCount = 0;
      let proposalCount = 0;

      // 작품 수
      try {
        const artworksSnapshot = await firestore()
          .collection('artworks')
          .where('artistId', '==', targetUserId)
          .get();
        artworkCount = artworksSnapshot.size;
      } catch (err) {
        console.log('작품 조회 오류:', err.message);
      }

      // 전시 수
      try {
        const exhibitionsSnapshot = await firestore()
          .collection('exhibitions')
          .where('artistId', '==', targetUserId)
          .get();
        exhibitionCount = exhibitionsSnapshot.size;
      } catch (err) {
        console.log('전시 조회 오류:', err.message);
      }

      // 제안서 수
      try {
        const proposalsSnapshot = await firestore()
          .collection('proposals')
          .where('artistId', '==', targetUserId)
          .get();
        proposalCount = proposalsSnapshot.size;
      } catch (err) {
        console.log('제안서 조회 오류:', err.message);
      }

      // 팔로워 수
      const followerCount = artistData?.followers?.length || 0;

      setStats({
        artworkCount,
        exhibitionCount,
        proposalCount,
        followerCount,
      });
    } catch (error) {
      console.error('통계 데이터 로드 오류:', error);
    }
  }, [targetUserId, artistData?.followers]);

  useEffect(() => {
    if (targetUserId) {
      fetchUserData();
    }
  }, [targetUserId, fetchUserData]);

  useEffect(() => {
    if (targetUserId && userData) {
      fetchArtistStats();
    }
  }, [targetUserId, userData, fetchArtistStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (targetUserId) {
      fetchUserData();
      fetchArtistStats();
    } else {
      setRefreshing(false);
    }
  };

  const handleProfileImageChange = () => {
    if (!currentUser) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets && response.assets[0]) {
        setUploadingImage(true);
        try {
          const imageUri = response.assets[0].uri;
          const filename = `artist_profiles/${currentUser.uid}/${Date.now()}.jpg`;
          const uploadUri = Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri;

          const reference = storage().ref(filename);
          await reference.putFile(uploadUri);
          const downloadURL = await reference.getDownloadURL();

          // Firestore 업데이트 (artists 컬렉션과 users 컬렉션 모두)
          await firestore()
            .collection('artists')
            .doc(currentUser.uid)
            .update({
              profileImage: downloadURL,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });

          await firestore()
            .collection('users')
            .doc(currentUser.uid)
            .update({
              profileImage: downloadURL,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });

          // 로컬 상태 업데이트
          setArtistData(prev => ({ ...prev, profileImage: downloadURL }));
          setUserData(prev => ({ ...prev, profileImage: downloadURL }));

          Alert.alert('성공', '프로필 사진이 변경되었습니다.');
        } catch (error) {
          console.error('프로필 이미지 업로드 오류:', error);
          Alert.alert('오류', '프로필 사진 변경 중 오류가 발생했습니다.');
        } finally {
          setUploadingImage(false);
        }
      }
    });
  };

  const handleSendMessage = async () => {
    if (!currentUser) {
      Alert.alert('알림', '로그인이 필요합니다.');
      navigation.navigate('Login');
      return;
    }

    try {
      setLoading(true);

      // 기존 채팅방이 있는지 확인
      const existingChatQuery = await firestore()
        .collection('chatRooms')
        .where('participants', 'array-contains', currentUserId)
        .get();

      let existingChatRoom = null;
      for (const doc of existingChatQuery.docs) {
        const data = doc.data();
        if (data.participants.includes(targetUserId)) {
          existingChatRoom = { id: doc.id, ...data };
          break;
        }
      }

      if (existingChatRoom) {
        // 기존 채팅방으로 이동
        navigation.navigate('ChatDetail', {
          chatRoom: existingChatRoom,
          recipientName: userData?.displayName || '아티스트',
          recipientId: targetUserId
        });
      } else {
        // 새 채팅방 생성
        const currentUserDoc = await firestore()
          .collection('users')
          .doc(currentUserId)
          .get();

        const newChatRoom = {
          participants: [currentUserId, targetUserId],
          participantNames: {
            [currentUserId]: currentUserDoc.data()?.displayName || '사용자',
            [targetUserId]: userData?.displayName || '아티스트'
          },
          lastMessage: '채팅을 시작했습니다.',
          lastMessageTime: firestore.FieldValue.serverTimestamp(),
          createdAt: firestore.FieldValue.serverTimestamp(),
        };

        const chatRoomRef = await firestore()
          .collection('chatRooms')
          .add(newChatRoom);

        navigation.navigate('ChatDetail', {
          chatRoom: { id: chatRoomRef.id, ...newChatRoom },
          recipientName: userData?.displayName || '아티스트',
          recipientId: targetUserId
        });
      }
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
      Alert.alert('오류', '채팅방 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleExhibitionProposal = () => {
    if (!currentUser) {
      Alert.alert('알림', '로그인이 필요합니다.');
      navigation.navigate('Login');
      return;
    }

    if (userType !== 'owner') {
      Alert.alert('알림', '갤러리 오너만 전시 제안을 할 수 있습니다.');
      return;
    }

    navigation.navigate('ExhibitionProposal', {
      artistId: targetUserId,
      artistName: userData?.displayName || '아티스트'
    });
  };

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          onPress: async () => {
            try {
              const user = auth().currentUser;
              if (user) {
                await auth().signOut();
              }
              logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
            } catch (error) {
              console.error('로그아웃 오류:', error);
              logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
              Alert.alert('오류', '로그아웃 처리 중 오류가 발생했습니다.');
            }
          },
        },
      ],
    );
  };

  const menuItems = [
    {
      icon: 'person-outline',
      title: '아티스트 프로필 수정',
      description: '작품 세계, 학력, 경력 등 프로필을 수정합니다',
      onPress: () => navigation.navigate('ProfileEdit', { artistData, userData })
    },
    {
      icon: 'palette',
      title: '포트폴리오 관리',
      description: '작품을 등록하고 포트폴리오를 관리합니다',
      badge: stats.artworkCount,
      onPress: () => navigation.navigate('ArtistPortfolio')
    },
    {
      icon: 'museum',
      title: '전시 기록',
      description: '참여한 전시 이력을 관리합니다',
      badge: stats.exhibitionCount,
      onPress: () => Alert.alert('준비중', '전시 기록 관리 기능은 준비 중입니다.')
    },
    {
      icon: 'send',
      title: '제안서 관리',
      description: '갤러리에 보낸 전시 제안서를 관리합니다',
      badge: stats.proposalCount,
      onPress: () => navigation.navigate('ExhibitionProposal')
    },
    {
      icon: 'search',
      title: '갤러리 탐색',
      description: '전시 기회를 찾아 갤러리를 탐색합니다',
      onPress: () => navigation.navigate('GallerySearch')
    },
    {
      icon: 'people',
      title: '네트워킹',
      description: '다른 아티스트들과 교류합니다',
      onPress: () => Alert.alert('준비중', '아티스트 네트워킹 기능은 준비 중입니다.')
    },
    {
      icon: 'trending-up',
      title: '작품 판매 관리',
      description: '작품 판매 현황과 수익을 관리합니다',
      onPress: () => Alert.alert('준비중', '작품 판매 관리 기능은 준비 중입니다.')
    },
    {
      icon: 'star-outline',
      title: '관심 갤러리',
      description: '관심있게 본 갤러리들을 모아볼 수 있습니다',
      onPress: () => navigation.navigate('FavoriteGalleries')
    },
    {
      icon: 'notifications-none',
      title: '알림 설정',
      description: '전시 기회, 메시지 등 알림을 설정합니다',
      onPress: () => navigation.navigate('NotificationSettings')
    },
    {
      icon: 'help-outline',
      title: '아티스트 지원센터',
      description: '아티스트를 위한 가이드와 지원 정보입니다',
      onPress: () => Alert.alert('준비중', '아티스트 지원센터 기능은 준비 중입니다.')
    },
    {
      icon: 'info-outline',
      title: '약관 및 정책',
      description: '서비스 이용약관과 개인정보 처리방침입니다',
      onPress: () => Alert.alert('준비중', '약관 및 정책 페이지는 준비 중입니다.')
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  const profileImage = artistData?.profileImage || userData?.profileImage;
  const displayName = artistData?.displayName || userData?.displayName || '아티스트';
  const genres = artistData?.genre || [];

  // 다른 아티스트의 프로필을 볼 때
  if (isViewingOtherProfile) {
    return (
      <ScrollView style={styles.container}>
        {/* 헤더 */}
        <View style={styles.publicHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.publicHeaderTitle}>아티스트 프로필</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* 작품 정보 (artwork가 전달된 경우) */}
        {artwork && (
          <View style={styles.artworkSection}>
            <Image source={{ uri: artwork.imageUrl }} style={styles.artworkImage} />
            <View style={styles.artworkInfo}>
              <Text style={styles.artworkTitle}>{artwork.title}</Text>
              {artwork.category && (
                <Text style={styles.artworkCategory}>{artwork.category}</Text>
              )}
              {artwork.year && (
                <Text style={styles.artworkDetail}>제작년도: {artwork.year}년</Text>
              )}
              {artwork.size && (
                <Text style={styles.artworkDetail}>크기: {artwork.size}</Text>
              )}
              {artwork.medium && (
                <Text style={styles.artworkDetail}>재료/기법: {artwork.medium}</Text>
              )}
              {artwork.isForSale && artwork.price > 0 && (
                <Text style={styles.artworkPrice}>₩ {artwork.price.toLocaleString()}</Text>
              )}
              {artwork.description && (
                <Text style={styles.artworkDescription}>{artwork.description}</Text>
              )}
              <View style={styles.artworkStats}>
                <View style={styles.statItemSmall}>
                  <Icon name="visibility" size={16} color="#666" />
                  <Text style={styles.statTextSmall}>{artwork.views || 0} 조회</Text>
                </View>
                <View style={styles.statItemSmall}>
                  <Icon name="favorite" size={16} color="#666" />
                  <Text style={styles.statTextSmall}>{artwork.likes || 0} 좋아요</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 소개 */}
        <View style={styles.publicSection}>
          <Text style={styles.publicSectionTitle}>소개</Text>
          {artistData?.bio ? (
            <Text style={styles.publicBio}>{artistData.bio}</Text>
          ) : (
            <Text style={styles.emptyText}>소개가 없습니다.</Text>
          )}
        </View>

        {/* 포트폴리오 */}
        <View style={styles.publicSection}>
          <Text style={styles.publicSectionTitle}>포트폴리오</Text>
          {portfolio.length > 0 ? (
            <View style={styles.portfolioGrid}>
              {portfolio.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.portfolioItem}
                  onPress={() => navigation.navigate('ArtworkDetail', { artworkId: item.id })}
                >
                  <Image source={{ uri: item.imageUrl }} style={styles.portfolioImage} />
                  <Text style={styles.portfolioTitle} numberOfLines={1}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>등록된 작품이 없습니다.</Text>
          )}
        </View>

        {/* 액션 버튼 */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.messageBtn]}
            onPress={handleSendMessage}
          >
            <Icon name="chat" size={20} color="white" />
            <Text style={styles.actionBtnText}>메시지 보내기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.proposalBtn]}
            onPress={handleExhibitionProposal}
          >
            <Icon name="send" size={20} color="white" />
            <Text style={styles.actionBtnText}>전시 제안하기</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    );
  }

  // 자신의 프로필을 볼 때 (기존 UI)
  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#FF6B6B']}
        />
      }
    >
      {/* 프로필 섹션 */}
      <View style={styles.profileSection}>
        <View style={styles.profileInfo}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleProfileImageChange}
            disabled={uploadingImage || isViewingOtherProfile}
          >
            {uploadingImage ? (
              <ActivityIndicator size="large" color="#FF6B6B" />
            ) : profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <Icon name="person" size={40} color="#666" />
            )}
            {!isViewingOtherProfile && (
              <View style={styles.cameraIcon}>
                <Icon name="camera-alt" size={16} color="white" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.profileText}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userId}>@{userData?.userId}</Text>
            <View style={styles.userTypeContainer}>
              <Icon name="palette" size={16} color="#FF6B6B" />
              <Text style={styles.userType}>아티스트</Text>
              {artistData?.isVerified && (
                <Icon name="verified" size={16} color="#4CAF50" />
              )}
            </View>
          </View>
        </View>

        {artistData?.bio && (
          <Text style={styles.bio}>{artistData.bio}</Text>
        )}

        {/* 장르 태그 */}
        {genres.length > 0 && (
          <View style={styles.genreContainer}>
            {genres.map((genre, index) => (
              <View key={index} style={styles.genreTag}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 통계 정보 */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => navigation.navigate('ArtistPortfolio')}
          >
            <Text style={styles.statNumber}>{stats.artworkCount}</Text>
            <Text style={styles.statLabel}>작품</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => Alert.alert('준비중', '전시 기록 관리 기능은 준비 중입니다.')}
          >
            <Text style={styles.statNumber}>{stats.exhibitionCount}</Text>
            <Text style={styles.statLabel}>전시</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => navigation.navigate('ExhibitionProposal')}
          >
            <Text style={styles.statNumber}>{stats.proposalCount}</Text>
            <Text style={styles.statLabel}>제안서</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => Alert.alert('준비중', '아티스트 네트워킹 기능은 준비 중입니다.')}
          >
            <Text style={styles.statNumber}>{stats.followerCount}</Text>
            <Text style={styles.statLabel}>팔로워</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 메뉴 리스트 */}
      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuLeft}>
              <Icon name={item.icon} size={24} color="#666" />
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>{item.title}</Text>
                {item.description && (
                  <Text style={styles.menuDescription}>{item.description}</Text>
                )}
              </View>
            </View>
            <View style={styles.menuRight}>
              {item.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Icon name="chevron-right" size={24} color="#999" />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* 로그아웃 버튼 */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={20} color="#FF4444" />
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>

      {/* 버전 정보 */}
      <View style={styles.versionContainer}>
        <Text style={styles.version}>갤러링 아티스트 v1.0.0</Text>
        <Text style={styles.copyright}>© 2024 Gallering. All rights reserved.</Text>
      </View>
    </ScrollView>
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
  profileSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userType: {
    fontSize: 14,
    color: '#FF6B6B',
  },
  bio: {
    marginTop: 15,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },
  genreTag: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  menuSection: {
    backgroundColor: 'white',
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuDescription: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 20,
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF4444',
    fontWeight: 'bold',
  },
  versionContainer: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  version: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  copyright: {
    fontSize: 12,
    color: '#ccc',
  },
  // 공개 프로필 스타일
  publicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  publicHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  artworkSection: {
    backgroundColor: 'white',
    marginBottom: 10,
  },
  artworkImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
  },
  artworkInfo: {
    padding: 20,
  },
  artworkTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  artworkCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  artworkDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  artworkPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginTop: 10,
    marginBottom: 12,
  },
  artworkDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginTop: 12,
  },
  artworkStats: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statItemSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statTextSmall: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  publicSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  publicSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  publicBio: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  portfolioItem: {
    width: '31%',
    marginHorizontal: '1%',
    marginBottom: 16,
  },
  portfolioImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  portfolioTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  messageBtn: {
    backgroundColor: '#4CAF50',
  },
  proposalBtn: {
    backgroundColor: '#FF6B6B',
  },
  actionBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ArtistProfileScreen;
