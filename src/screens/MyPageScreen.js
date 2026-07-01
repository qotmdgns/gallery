// src/screens/MyPageScreen.js
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

const MyPageScreen = ({ navigation }) => {
  const { logout } = useLoginStore();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [stats, setStats] = useState({
    galleryCount: 0,
    reservationCount: 0,
    reviewCount: 0,
    favoriteCount: 0,
  });

  const currentUser = auth().currentUser;

  const fetchUserData = useCallback(async () => {
    try {
      if (!currentUser) {
        setUserData(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      if (userDoc.exists) {
        setUserData(userDoc.data());
      }
    } catch (error) {
      console.error('사용자 데이터 로드 오류:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  const fetchUserStats = useCallback(async () => {
    try {
      if (!currentUser) {
        setStats({
          galleryCount: 0,
          reservationCount: 0,
          reviewCount: 0,
          favoriteCount: 0,
        });
        return;
      }

      let galleryCount = 0;
      let reservationCount = 0;
      let reviewCount = 0;

      // 내가 등록한 갤러리 수 (갤러리 운영자인 경우)
      if (userData?.userType === 'owner') {
        try {
          const galleriesSnapshot = await firestore()
            .collection('galleries')
            .where('ownerId', '==', currentUser.uid)
            .get();
          galleryCount = galleriesSnapshot.size;
        } catch (err) {
          console.log('갤러리 조회 오류:', err.message);
        }
      }

      // 예약 내역 수
      try {
        const reservationsSnapshot = await firestore()
          .collection('reservations')
          .where('userId', '==', currentUser.uid)
          .get();
        reservationCount = reservationsSnapshot.size;
      } catch (err) {
        console.log('예약 조회 오류:', err.message);
      }

      // 리뷰 수
      try {
        const reviewsSnapshot = await firestore()
          .collection('reviews')
          .where('userId', '==', currentUser.uid)
          .get();
        reviewCount = reviewsSnapshot.size;
      } catch (err) {
        console.log('리뷰 조회 오류:', err.message);
      }

      // 찜한 갤러리 수
      const favoriteCount = userData?.favoriteGalleries?.length || 0;

      setStats({
        galleryCount,
        reservationCount,
        reviewCount,
        favoriteCount,
      });
    } catch (error) {
      console.error('통계 데이터 로드 오류:', error);
    }
  }, [currentUser, userData?.userType, userData?.favoriteGalleries]);

  useEffect(() => {
    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser, fetchUserData]);

  useEffect(() => {
    if (currentUser && userData) {
      fetchUserStats();
    }
  }, [currentUser, userData, fetchUserStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (currentUser) {
      fetchUserData();
      fetchUserStats();
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
          const filename = `users/${currentUser.uid}/profile/${Date.now()}.jpg`;
          const uploadUri = Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri;

          const reference = storage().ref(filename);
          await reference.putFile(uploadUri);
          const downloadURL = await reference.getDownloadURL();

          // Firestore 업데이트
          await firestore()
            .collection('users')
            .doc(currentUser.uid)
            .update({
              profileImage: downloadURL,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });

          // 로컬 상태 업데이트
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
            // logout 함수는 사용자 상태와 관계없이 호출
            logout();
            // Auth 네비게이터로 이동 (Login 화면이 포함된)
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            });
          } catch (error) {
            console.error('로그아웃 오류:', error);
            // 에러가 발생해도 로컬 상태는 초기화
            logout();
            // 오류 발생 시에도 Auth로 이동
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
      title: '프로필 수정',
      description: '이름, 사진, 소개글 등 프로필 정보를 수정합니다',
      onPress: () => navigation.navigate('ProfileEdit', { userData }) 
    },
    { 
      icon: 'star-outline', 
      title: '찜한 갤러리',
      description: '관심있게 본 갤러리들을 모아볼 수 있습니다',
      badge: stats.favoriteCount,
      onPress: () => navigation.navigate('FavoriteGalleries') 
    },
    { 
      icon: 'history', 
      title: '예약 내역',
      description: '갤러리 예약 현황과 이용 내역을 확인합니다',
      badge: stats.reservationCount, 
      onPress: () => navigation.navigate('BookingHistory') 
    },
    ...(userData?.userType === 'owner' ? [
      { 
        icon: 'store', 
        title: '내 갤러리 관리',
        description: '등록한 갤러리 정보를 수정하고 관리합니다',
        badge: stats.galleryCount,
        onPress: () => navigation.navigate('ManageGalleries') 
      },
      { 
        icon: 'trending-up', 
        title: '수익 관리',
        description: '갤러리 운영 수익과 정산 내역을 확인합니다',
        onPress: () => navigation.navigate('Revenus') 
      },
    ] : []),
    { 
      icon: 'rate-review', 
      title: '내가 쓴 리뷰',
      description: '작성한 갤러리 리뷰를 관리합니다',
      badge: stats.reviewCount,
      onPress: () => navigation.navigate('MyReviews') 
    },
    { 
      icon: 'payment', 
      title: '결제 수단 관리',
      description: '카드, 계좌 등 결제 정보를 관리합니다',
      onPress: () => navigation.navigate('PaymentMethods') 
    },
    { 
      icon: 'notifications-none', 
      title: '알림 설정',
      description: '예약, 메시지 등 알림 수신을 설정합니다',
      onPress: () => navigation.navigate('NotificationSettings') 
    },
    { 
      icon: 'help-outline', 
      title: '고객센터',
      description: '문의하기, FAQ, 공지사항을 확인합니다',
      onPress: () => navigation.navigate('CustomerService') 
    },
    { 
      icon: 'info-outline', 
      title: '약관 및 정책',
      description: '서비스 이용약관과 개인정보 처리방침입니다',
      onPress: () => navigation.navigate('Terms') 
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B7BFF" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#4B7BFF']}
        />
      }
    >
      {/* 프로필 섹션 */}
      <View style={styles.profileSection}>
        <View style={styles.profileInfo}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleProfileImageChange}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator size="large" color="#4B7BFF" />
            ) : userData?.profileImage ? (
              <Image 
                source={{ uri: userData.profileImage }} 
                style={styles.profileImage}
              />
            ) : (
              <Icon name="person" size={40} color="#666" />
            )}
            <View style={styles.cameraIcon}>
              <Icon name="camera-alt" size={16} color="white" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.profileText}>
            <Text style={styles.userName}>{userData?.displayName || '사용자'}</Text>
            <Text style={styles.userId}>@{userData?.userId}</Text>
            <View style={styles.userTypeContainer}>
              <Icon 
                name={userData?.userType === 'owner' ? 'store' : 'person'} 
                size={16} 
                color="#4B7BFF" 
              />
              <Text style={styles.userType}>
                {userData?.userType === 'owner' ? '갤러리 운영자' : '일반 회원'}
              </Text>
              {userData?.isVerified && (
                <Icon name="verified" size={16} color="#4CAF50" />
              )}
            </View>
          </View>
        </View>

        {userData?.bio && (
          <Text style={styles.bio}>{userData.bio}</Text>
        )}

        {/* 인증 상태 표시 */}
        <View style={styles.verificationContainer}>
          <TouchableOpacity 
            style={[
              styles.verificationItem,
              userData?.emailVerified && styles.verificationItemVerified
            ]}
            onPress={() => !userData?.emailVerified && navigation.navigate('EmailVerification', { fromSignup: false })}
            disabled={userData?.emailVerified}
          >
            <Icon 
              name={userData?.emailVerified ? "check-circle" : "email"} 
              size={20} 
              color={userData?.emailVerified ? "#4CAF50" : "#999"} 
            />
            <Text style={[
              styles.verificationText,
              userData?.emailVerified && styles.verificationTextVerified
            ]}>
              {userData?.emailVerified ? '이메일 인증됨' : '이메일 인증하기'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.verificationItem,
              userData?.phoneVerified && styles.verificationItemVerified
            ]}
            onPress={() => !userData?.phoneVerified && navigation.navigate('PhoneVerification', { 
              fromSignup: false,
              phoneNumber: userData?.phoneNumber 
            })}
            disabled={userData?.phoneVerified}
          >
            <Icon 
              name={userData?.phoneVerified ? "check-circle" : "phone-android"} 
              size={20} 
              color={userData?.phoneVerified ? "#4CAF50" : "#999"} 
            />
            <Text style={[
              styles.verificationText,
              userData?.phoneVerified && styles.verificationTextVerified
            ]}>
              {userData?.phoneVerified ? '전화번호 인증됨' : '전화번호 인증하기'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 통계 정보 */}
        <View style={styles.statsContainer}>
          {userData?.userType === 'owner' && (
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => navigation.navigate('ManageGalleries')}
            >
              <Text style={styles.statNumber}>{stats.galleryCount}</Text>
              <Text style={styles.statLabel}>갤러리</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => navigation.navigate('BookingHistory')}
          >
            <Text style={styles.statNumber}>{stats.reservationCount}</Text>
            <Text style={styles.statLabel}>예약</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => navigation.navigate('MyReviews')}
          >
            <Text style={styles.statNumber}>{stats.reviewCount}</Text>
            <Text style={styles.statLabel}>리뷰</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => navigation.navigate('FavoriteGalleries')}
          >
            <Text style={styles.statNumber}>{stats.favoriteCount}</Text>
            <Text style={styles.statLabel}>찜</Text>
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
        <Text style={styles.version}>갤러링 v1.0.0</Text>
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
    backgroundColor: '#4B7BFF',
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
    color: '#4B7BFF',
  },
  bio: {
    marginTop: 15,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
  verificationContainer: {
    flexDirection: 'row',
    paddingTop: 15,
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  verificationItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  verificationItemVerified: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  verificationText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  verificationTextVerified: {
    color: '#4CAF50',
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
});

export default MyPageScreen;
