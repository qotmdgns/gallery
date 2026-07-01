import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import FirebaseService from '../services/FirebaseService';
import useLoginStore from '../store/useLoginStore';

const { width } = Dimensions.get('window');

const ArtworkDetailScreen = ({ navigation, route }) => {
  const { artwork: initialArtwork, artworkId } = route.params;
  const { userId, userType } = useLoginStore();
  const [loading, setLoading] = useState(true);
  const [artwork, setArtwork] = useState(initialArtwork || null);
  const [artistInfo, setArtistInfo] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const firebaseService = new FirebaseService();

  useEffect(() => {
    if (artworkId && !initialArtwork) {
      loadArtworkFromDatabase();
    } else {
      loadArtistInfo();
      checkIfLiked();
      updateViewCount();
    }
  }, [artworkId]);

  const loadArtworkFromDatabase = async () => {
    try {
      setLoading(true);
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
      } else {
        Alert.alert('오류', '작품을 찾을 수 없습니다.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('작품 로드 실패:', error);
      Alert.alert('오류', '작품 정보를 불러오는 중 오류가 발생했습니다.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (artwork) {
      loadArtistInfo();
      checkIfLiked();
      updateViewCount();
    }
  }, [artwork]);

  const loadArtistInfo = async () => {
    try {
      setLoading(true);
      // 아티스트 정보 가져오기
      const userDoc = await firestore()
        .collection('users')
        .doc(artwork.artistId)
        .get();

      if (userDoc.exists) {
        setArtistInfo({
          id: userDoc.id,
          ...userDoc.data()
        });
      }
    } catch (error) {
      console.error('아티스트 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfLiked = async () => {
    if (!userId) return;

    try {
      const likeDoc = await firestore()
        .collection('artworkLikes')
        .doc(`${artwork.id}_${userId}`)
        .get();

      setIsLiked(likeDoc.exists);
    } catch (error) {
      console.error('좋아요 확인 실패:', error);
    }
  };

  const updateViewCount = async () => {
    try {
      await firestore()
        .collection('artworks')
        .doc(artwork.id)
        .update({
          views: firestore.FieldValue.increment(1)
        });
    } catch (error) {
      console.error('조회수 업데이트 실패:', error);
    }
  };

  const handleLike = async () => {
    if (!userId) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }

    try {
      const likeRef = firestore()
        .collection('artworkLikes')
        .doc(`${artwork.id}_${userId}`);

      if (isLiked) {
        await likeRef.delete();
        await firestore()
          .collection('artworks')
          .doc(artwork.id)
          .update({
            likes: firestore.FieldValue.increment(-1)
          });
      } else {
        await likeRef.set({
          artworkId: artwork.id,
          userId: userId,
          createdAt: firestore.FieldValue.serverTimestamp()
        });
        await firestore()
          .collection('artworks')
          .doc(artwork.id)
          .update({
            likes: firestore.FieldValue.increment(1)
          });
      }

      setIsLiked(!isLiked);
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
      Alert.alert('오류', '좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  const handleInquiry = async () => {
    if (!userId) {
      Alert.alert('알림', '로그인이 필요합니다.');
      navigation.navigate('Login');
      return;
    }

    if (userId === artwork.artistId) {
      Alert.alert('알림', '자신의 작품에는 문의할 수 없습니다.');
      return;
    }

    try {
      setLoading(true);

      // 아티스트를 가상의 갤러리로 취급하여 ChatDetailScreen에 전달
      const virtualGalleryId = `artist_${artwork.artistId}`;
      const galleryName = artistInfo?.displayName || '아티스트';

      console.log('=== 작품 문의 시작 ===');
      console.log('virtualGalleryId:', virtualGalleryId);
      console.log('galleryName:', galleryName);
      console.log('artistId:', artwork.artistId);
      console.log('artwork:', artwork.title);

      // ChatDetailScreen으로 이동 (ChatService가 채팅방 생성/조회 처리)
      navigation.navigate('ChatDetail', {
        galleryId: virtualGalleryId,
        galleryName: galleryName,
        isOwner: false,
        artworkId: artwork.id,
        artworkTitle: artwork.title,
        artistId: artwork.artistId
      });
    } catch (error) {
      console.error('채팅 시작 실패:', error);
      Alert.alert('오류', '채팅을 시작할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = () => {
    Alert.alert(
      '구매 문의',
      '아티스트에게 구매 의사를 전달하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '문의하기',
          onPress: handleInquiry
        }
      ]
    );
  };

  if (loading || !artwork) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>작품 상세</Text>
        <TouchableOpacity onPress={handleLike}>
          <Icon
            name={isLiked ? "favorite" : "favorite-border"}
            size={24}
            color={isLiked ? "#FF6B6B" : "#333"}
          />
        </TouchableOpacity>
      </View>

      {/* 작품 이미지 */}
      <Image source={{ uri: artwork.imageUrl }} style={styles.artworkImage} />

      {/* 작품 정보 */}
      <View style={styles.infoSection}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{artwork.title}</Text>
          {artwork.status === 'sold' && (
            <View style={styles.soldBadge}>
              <Text style={styles.soldBadgeText}>판매완료</Text>
            </View>
          )}
        </View>

        {artwork.category && (
          <Text style={styles.category}>{artwork.category}</Text>
        )}

        {artwork.year && (
          <Text style={styles.detail}>제작년도: {artwork.year}년</Text>
        )}

        {artwork.size && (
          <Text style={styles.detail}>크기: {artwork.size}</Text>
        )}

        {artwork.medium && (
          <Text style={styles.detail}>재료/기법: {artwork.medium}</Text>
        )}

        {artwork.isForSale && artwork.price > 0 && (
          <Text style={styles.price}>₩ {artwork.price.toLocaleString()}</Text>
        )}

        {artwork.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>작품 설명</Text>
            <Text style={styles.description}>{artwork.description}</Text>
          </View>
        )}

        {/* 통계 */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Icon name="visibility" size={18} color="#666" />
            <Text style={styles.statText}>{artwork.views || 0} 조회</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="favorite" size={18} color="#666" />
            <Text style={styles.statText}>{artwork.likes || 0} 좋아요</Text>
          </View>
        </View>
      </View>

      {/* 아티스트 정보 */}
      {artistInfo && (
        <View style={styles.artistSection}>
          <Text style={styles.sectionTitle}>아티스트 정보</Text>
          <TouchableOpacity
            style={styles.artistInfo}
            onPress={() => navigation.navigate('ArtistProfile', {
              artistId: artwork.artistId,
              artwork: artwork
            })}
          >
            <View style={styles.artistAvatar}>
              {artistInfo.profileImage ? (
                <Image source={{ uri: artistInfo.profileImage }} style={styles.avatarImage} />
              ) : (
                <Icon name="person" size={30} color="#999" />
              )}
            </View>
            <View style={styles.artistDetails}>
              <Text style={styles.artistName}>{artistInfo.displayName}</Text>
              {artistInfo.bio && (
                <Text style={styles.artistBio} numberOfLines={2}>{artistInfo.bio}</Text>
              )}
            </View>
            <Icon name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>
        </View>
      )}

      {/* 액션 버튼 */}
      <View style={styles.actionButtons}>
        {userId !== artwork.artistId && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.inquiryButton]}
              onPress={handleInquiry}
            >
              <Icon name="chat" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>1:1 문의하기</Text>
            </TouchableOpacity>

            {artwork.isForSale && artwork.status !== 'sold' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.purchaseButton]}
                onPress={handlePurchase}
              >
                <Icon name="shopping-cart" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>구매 문의</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* 하단 여백 */}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  artworkImage: {
    width: width,
    height: width,
    backgroundColor: '#f5f5f5',
  },
  infoSection: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  soldBadge: {
    backgroundColor: '#FF5252',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  soldBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  category: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  detail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginTop: 12,
    marginBottom: 16,
  },
  descriptionSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  artistSection: {
    padding: 20,
    borderTopWidth: 8,
    borderTopColor: '#f5f5f5',
  },
  artistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  artistAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  artistDetails: {
    flex: 1,
  },
  artistName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  artistBio: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  inquiryButton: {
    backgroundColor: '#4A90E2',
  },
  purchaseButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ArtworkDetailScreen;