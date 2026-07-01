// src/screens/GalleryDetailScreen.js
import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Linking,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { handleError } from '../utils/errorHandler';
import { ERROR_MESSAGES } from '../constants/errorMessages';

const { width } = Dimensions.get('window');

const GalleryDetailScreen = ({ route, navigation }) => {
  const { galleryId } = route.params;
  const [gallery, setGallery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [recentReviews, setRecentReviews] = useState([]);
  const currentUser = auth().currentUser;

  // Zustand 스토어에서 userType 가져오기
  const useLoginStore = require('../store/useLoginStore').default;
  const { userType } = useLoginStore();

  const galleryName = gallery?.galleryName || gallery?.name || '갤러리';
  const galleryTags = useMemo(() => {
    const tags = [
      ...(Array.isArray(gallery?.categories) ? gallery.categories : []),
      ...(Array.isArray(gallery?.facilities) ? gallery.facilities : []),
    ].filter(Boolean);

    return tags.length > 0 ? tags.slice(0, 3) : ['전시공간', '대관', '아트'];
  }, [gallery]);

  const parkingText = useMemo(() => {
    if (!gallery?.facilities) return '정보 없음';
    return gallery.facilities.includes('주차장') ? '주차 가능' : '주차 정보 없음';
  }, [gallery]);

  const floorText = gallery?.floor || gallery?.buildingFloor || '정보 없음';
  const hoursText = gallery?.operatingHours
    ? `${gallery.operatingHours.weekday || '운영시간 미정'}`
    : '운영시간 미정';
  const addressText = gallery?.address || gallery?.location || '주소 정보 없음';

  const fetchGalleryDetail = useCallback(async () => {
    try {
      const doc = await firestore().collection('galleries').doc(galleryId).get();
      
      if (doc.exists) {
        const galleryData = { id: doc.id, ...doc.data() };
        setGallery(galleryData);
        
        // 평균 별점과 리뷰 수 설정
        setAverageRating(galleryData.rating || 0);
        setReviewCount(galleryData.reviewCount || 0);
      } else {
        Alert.alert('오류', ERROR_MESSAGES.GALLERY.NOT_FOUND);
        navigation.goBack();
      }
    } catch (error) {
      handleError(error, {
        screen: 'GalleryDetailScreen',
        action: 'fetchGalleryDetail',
        galleryId: galleryId
      });
    } finally {
      setLoading(false);
    }
  }, [galleryId, navigation]);

  const fetchRecentReviews = useCallback(async () => {
    try {
      const reviewsSnapshot = await firestore()
        .collection('reviews')
        .where('galleryId', '==', galleryId)
        .orderBy('createdAt', 'desc')
        .limit(4)
        .get();

      const reviews = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRecentReviews(reviews);
    } catch (error) {
      console.error('리뷰 가져오기 오류:', error);
      // 리뷰 가져오기 실패는 치명적이지 않으므로 조용히 실패
    }
  }, [galleryId]);

  useEffect(() => {
    fetchGalleryDetail();
    fetchRecentReviews();
    if (currentUser) {
      checkFavoriteStatus();
    }
  }, [fetchGalleryDetail, fetchRecentReviews]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '갤러리 상세',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 15 }}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleCall = () => {
    if (!gallery?.phoneNumber) {
      Alert.alert('알림', '등록된 전화번호가 없습니다.');
      return;
    }
    
    // 전화번호에서 특수문자 제거 (하이픈, 공백 등)
    const phoneNumber = gallery.phoneNumber.replace(/[^0-9]/g, '');
    
    Linking.openURL(`tel:${phoneNumber}`).catch((err) => {
      console.error('전화 연결 실패:', err);
      Alert.alert('오류', '전화 연결에 실패했습니다.');
    });
  };

  const handleInquiry = () => {
    console.log('=== GalleryDetailScreen handleInquiry ===');
    console.log('gallery object:', JSON.stringify(gallery, null, 2));
    console.log('gallery.id:', gallery?.id);
    console.log('gallery.galleryName:', gallery?.galleryName);
    console.log('gallery.ownerId:', gallery?.ownerId);
    console.log('userType:', userType);

    if (gallery?.id && galleryName) {
      console.log('Navigating to ChatDetail with params:', {
        galleryId: gallery.id,
        galleryName,
        isArtist: userType === 'artist',
      });

      navigation.navigate('ChatDetail', {
        galleryId: gallery.id,
        galleryName,
        isArtist: userType === 'artist', // 아티스트 여부 전달
      });
    } else {
      console.error('handleInquiry: 필수 정보가 없습니다.');
      console.error('gallery?.id:', gallery?.id);
      console.error('gallery?.galleryName:', gallery?.galleryName);
    }
  };

  const handleReservation = () => {
    if (!auth().currentUser) {
      Alert.alert('로그인 필요', '예약은 로그인 후 이용할 수 있습니다.');
      return;
    }

    if (gallery?.id && galleryName) {
      navigation.navigate('Reservation', {
        galleryId: gallery.id,
        galleryName,
        price: gallery.price || 0,
        galleryOwnerId: gallery.ownerId,
      });
    }
  };

  const checkFavoriteStatus = async () => {
    if (!currentUser) return;
    
    try {
      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const favorites = userData.favoriteGalleries || [];
        setIsFavorite(favorites.includes(galleryId));
      }
    } catch (error) {
      console.error('찜 상태 확인 오류:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!currentUser) {
      Alert.alert('알림', '로그인이 필요한 기능입니다.');
      return;
    }

    setFavoriteLoading(true);
    
    try {
      const userRef = firestore().collection('users').doc(currentUser.uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        // 사용자 문서가 없으면 생성
        await userRef.set({
          favoriteGalleries: isFavorite ? [] : [galleryId],
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // 기존 사용자 문서 업데이트
        const userData = userDoc.data();
        let favorites = userData.favoriteGalleries || [];
        
        if (isFavorite) {
          // 찜 제거
          favorites = favorites.filter(id => id !== galleryId);
        } else {
          // 찜 추가
          if (!favorites.includes(galleryId)) {
            favorites.push(galleryId);
          }
        }
        
        await userRef.update({
          favoriteGalleries: favorites,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
      
      // 갤러리 문서의 찜 카운트 업데이트
      const galleryRef = firestore().collection('galleries').doc(galleryId);
      await galleryRef.update({
        likeCount: firestore.FieldValue.increment(isFavorite ? -1 : 1),
      });
      
      setIsFavorite(!isFavorite);
      
      // 피드백 메시지
      Alert.alert(
        '알림',
        isFavorite ? '찜 목록에서 제거되었습니다.' : '찜 목록에 추가되었습니다.'
      );
    } catch (error) {
      console.error('찜하기 토글 오류:', error);
      Alert.alert('오류', '찜하기 처리 중 오류가 발생했습니다.');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleReviewMore = () => {
    navigation.navigate('ReviewList', {
      galleryId: gallery.id,
      galleryName: gallery.galleryName,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B7BFF" />
      </View>
    );
  }

  if (!gallery) return null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 이미지 갤러리 */}
        <View style={styles.imageContainer}>
          {gallery.imageUrls && gallery.imageUrls.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / width);
                  setCurrentImageIndex(index);
                }}
              >
                {gallery.imageUrls.map((url, index) => (
                  <Image
                    key={index}
                    source={{ uri: url }}
                    style={styles.galleryImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              
              {/* 이미지 인디케이터 */}
              <View style={styles.imageIndicatorContainer}>
                {gallery.imageUrls.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.imageIndicator,
                      index === currentImageIndex && styles.activeIndicator,
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <View style={styles.noImageContainer}>
              <Icon name="image" size={60} color="#ccc" />
              <Text style={styles.noImageText}>이미지가 없습니다</Text>
            </View>
          )}
        </View>

        {/* 갤러리 기본 정보 */}
        <View style={styles.infoSection}>
          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              <Text style={styles.location}>{gallery.location}</Text>
              <Text style={styles.galleryName}>{gallery.galleryName}</Text>
            </View>
            
            {/* 찜하기 버튼 */}
            <TouchableOpacity 
              style={styles.favoriteButton}
              onPress={toggleFavorite}
              disabled={favoriteLoading}
            >
              {favoriteLoading ? (
                <ActivityIndicator size="small" color="#FF4444" />
              ) : (
                <Icon 
                  name={isFavorite ? "favorite" : "favorite-border"} 
                  size={28} 
                  color="#FF4444" 
                />
              )}
            </TouchableOpacity>
          </View>
          
          {/* 평균 별점 표시 */}
          {reviewCount > 0 && (
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon
                    key={`avg-rating-star-${star}`}
                    name="star"
                    size={20}
                    color={star <= Math.round(averageRating) ? '#FFD700' : '#e0e0e0'}
                  />
                ))}
              </View>
              <Text style={styles.ratingValue}>{averageRating.toFixed(1)}</Text>
              <Text style={styles.reviewCountText}>({reviewCount}개의 리뷰)</Text>
            </View>
          )}
          
          <Text style={styles.price}>{gallery.price ? gallery.price.toLocaleString() : '0'}원 / 1주</Text>
          
          {/* 카테고리 태그 */}
          <View style={styles.tagContainer}>
            {galleryTags.map((tag) => (
              <TouchableOpacity key={tag} style={styles.tag}>
                <Text style={styles.tagText}># {tag}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 문의 버튼 */}
          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.contactButton} onPress={handleInquiry}>
              <Icon name="chat" size={24} color="white" />
              <Text style={styles.contactButtonText}>1 : 1 문의</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
              <Icon name="phone" size={24} color="white" />
              <Text style={styles.contactButtonText}>전화 문의</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 리뷰 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>리뷰</Text>
            {reviewCount > 0 && (
              <View style={styles.rating}>
                <Icon name="star" size={18} color="#FFD700" />
                <Text style={styles.ratingText}>{averageRating.toFixed(1)}</Text>
                <Text style={styles.reviewCountSmall}>({reviewCount})</Text>
              </View>
            )}
          </View>
          
          {/* 리뷰 미리보기 */}
          {recentReviews.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImages}>
              {recentReviews.map((review) => (
                <TouchableOpacity
                  key={review.id}
                  style={styles.reviewPreviewCard}
                  onPress={handleReviewMore}
                >
                  {review.imageUrls && review.imageUrls.length > 0 ? (
                    <View>
                      <Image
                        source={{ uri: review.imageUrls[0] }}
                        style={styles.reviewImageItem}
                        resizeMode="cover"
                      />
                      <View style={styles.reviewImageCaption}>
                        <Text style={styles.reviewCaptionText} numberOfLines={1}>
                          {review.text ? (review.text.length > 15 ? review.text.substring(0, 15) + '...' : review.text) : '내용 없음'}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.reviewTextPreview}>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Icon
                            key={`${review.id}-star-${star}`}
                            name="star"
                            size={12}
                            color={star <= review.rating ? '#FFD700' : '#e0e0e0'}
                          />
                        ))}
                      </View>
                      <Text style={styles.reviewTextContent} numberOfLines={2}>
                        {review.text ? (review.text.length > 15 ? review.text.substring(0, 15) + '...' : review.text) : '내용 없음'}
                      </Text>
                      <Text style={styles.reviewAuthor} numberOfLines={1}>
                        {review.userName || '익명'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noReviewsContainer}>
              <Text style={styles.noReviewsText}>아직 작성된 리뷰가 없습니다</Text>
            </View>
          )}
          
          <TouchableOpacity style={styles.moreButton} onPress={handleReviewMore}>
            <Text style={styles.moreButtonText}>리뷰 더보기</Text>
          </TouchableOpacity>
        </View>

        {/* 갤러리 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>갤러리 정보</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Icon name="square-foot" size={32} color="#4B7BFF" />
              <Text style={styles.infoValue}>{gallery.area || 100} m²</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Icon name="local-parking" size={32} color="#4B7BFF" />
              <Text style={styles.infoValue}>{parkingText}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Icon name="apartment" size={32} color="#4B7BFF" />
              <Text style={styles.infoValue}>{floorText}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Icon name="schedule" size={32} color="#4B7BFF" />
              <Text style={styles.infoValue}>{hoursText}</Text>
            </View>
          </View>
          
          {gallery.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.description}>{gallery.description}</Text>
            </View>
          )}
        </View>

        {/* 위치 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>위치</Text>
          
          <TouchableOpacity style={styles.mapContainer}>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapText}>지도 보기</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.addressContainer}>
            <Text style={styles.addressLabel}>
              {galleryName} {gallery.location || ''}
            </Text>
            <View style={styles.addressRow}>
              <Icon name="location-on" size={20} color="#4B7BFF" />
              <Text style={styles.addressText}>{addressText}</Text>
            </View>
          </View>
        </View>

        {/* 하단 여백 */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 하단 액션 버튼 */}
      <TouchableOpacity style={styles.reservationButton} onPress={handleReservation}>
        <Icon name="event-available" size={24} color="white" />
        <Text style={styles.reservationButtonText}>예약하기</Text>
      </TouchableOpacity>
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
  imageContainer: {
    height: 250,
    backgroundColor: '#f0f0f0',
  },
  galleryImage: {
    width: width,
    height: 250,
  },
  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    marginTop: 10,
    color: '#999',
  },
  imageIndicatorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeIndicator: {
    backgroundColor: 'white',
  },
  infoSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFE5E5',
    marginLeft: 10,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  galleryName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: '#E8F0FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 14,
    color: '#4B7BFF',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  reviewCountText: {
    fontSize: 14,
    color: '#666',
  },
  reviewCountSmall: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4B7BFF',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewImages: {
    marginBottom: 15,
  },
  reviewPreviewCard: {
    marginRight: 10,
  },
  reviewImageItem: {
    width: 100,
    height: 100,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  reviewImageCaption: {
    width: 100,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#e0e0e0',
  },
  reviewCaptionText: {
    fontSize: 11,
    color: '#333',
  },
  reviewTextPreview: {
    width: 140,
    height: 100,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewTextContent: {
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
    flex: 1,
    marginVertical: 6,
  },
  reviewAuthor: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  noReviewsContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  noReviewsText: {
    fontSize: 14,
    color: '#999',
  },
  moreButton: {
    alignSelf: 'center',
  },
  moreButtonText: {
    color: '#4B7BFF',
    fontSize: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  infoItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 15,
  },
  infoValue: {
    marginTop: 8,
    fontSize: 14,
    color: '#333',
  },
  descriptionContainer: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  mapContainer: {
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#E8F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    fontSize: 16,
    color: '#4B7BFF',
  },
  addressContainer: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
  },
  reservationButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#4B7BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  reservationButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default GalleryDetailScreen;
