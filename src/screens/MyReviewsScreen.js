import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const MyReviewsScreen = ({ navigation }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = auth().currentUser;

  useEffect(() => {
    fetchMyReviews();
  }, []);

  const fetchMyReviews = async () => {
    try {
      console.log('Fetching reviews for user:', currentUser?.uid);

      // userId 필드가 없거나 다른 경우를 대비한 처리
      let reviewsSnapshot;
      try {
        // 먼저 인덱스가 있는 쿼리 시도
        reviewsSnapshot = await firestore()
          .collection('reviews')
          .where('userId', '==', currentUser.uid)
          .orderBy('createdAt', 'desc')
          .get();
      } catch (indexError) {
        console.log('Index query failed, trying without orderBy:', indexError.message);
        // 인덱스 오류 시 정렬 없이 쿼리 후 클라이언트에서 정렬
        reviewsSnapshot = await firestore()
          .collection('reviews')
          .where('userId', '==', currentUser.uid)
          .get();
      }

      console.log(`Found ${reviewsSnapshot.size} reviews`);

      const reviewsData = await Promise.all(
        reviewsSnapshot.docs.map(async (doc) => {
          const reviewData = doc.data();

          // 갤러리 정보 가져오기
          let galleryData = null;
          if (reviewData.galleryId) {
            try {
              const galleryDoc = await firestore()
                .collection('galleries')
                .doc(reviewData.galleryId)
                .get();

              galleryData = galleryDoc.exists ? galleryDoc.data() : null;
            } catch (galleryError) {
              console.error('Gallery fetch error:', galleryError);
            }
          }

          return {
            id: doc.id,
            ...reviewData,
            galleryName: galleryData?.name || '알 수 없는 갤러리',
            galleryImage: galleryData?.images?.[0] || null,
            createdAt: reviewData.createdAt?.toDate() || new Date(),
          };
        })
      );

      // 클라이언트 사이드 정렬 (인덱스 없이 가져온 경우)
      reviewsData.sort((a, b) => b.createdAt - a.createdAt);

      setReviews(reviewsData);
    } catch (error) {
      console.error('리뷰 목록 로드 오류 상세:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      // 더 구체적인 오류 메시지
      let errorMessage = '리뷰 목록을 불러오는 중 오류가 발생했습니다.';
      if (error.code === 'failed-precondition') {
        errorMessage = '데이터베이스 인덱스 설정이 필요합니다. 잠시 후 다시 시도해주세요.';
      } else if (error.code === 'permission-denied') {
        errorMessage = '권한이 없습니다. 다시 로그인해주세요.';
      }

      Alert.alert('오류', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMyReviews();
  };

  const handleDeleteReview = (reviewId, galleryName) => {
    Alert.alert(
      '리뷰 삭제',
      `${galleryName}에 대한 리뷰를 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection('reviews')
                .doc(reviewId)
                .delete();
              
              setReviews(reviews.filter(review => review.id !== reviewId));
              Alert.alert('성공', '리뷰가 삭제되었습니다.');
            } catch (error) {
              console.error('리뷰 삭제 오류:', error);
              Alert.alert('오류', '리뷰 삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ],
    );
  };

  const formatDate = (date) => {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes === 0 ? '방금 전' : `${minutes}분 전`;
      }
      return `${hours}시간 전`;
    } else if (days < 7) {
      return `${days}일 전`;
    } else if (days < 30) {
      return `${Math.floor(days / 7)}주 전`;
    } else if (days < 365) {
      return `${Math.floor(days / 30)}개월 전`;
    } else {
      return `${Math.floor(days / 365)}년 전`;
    }
  };

  const renderReviewItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.reviewCard}
      onPress={() => navigation.navigate('GalleryDetail', { galleryId: item.galleryId })}
    >
      <View style={styles.reviewHeader}>
        {item.galleryImage ? (
          <Image source={{ uri: item.galleryImage }} style={styles.galleryImage} />
        ) : (
          <View style={styles.galleryImagePlaceholder}>
            <Icon name="image" size={30} color="#ccc" />
          </View>
        )}
        <View style={styles.reviewInfo}>
          <Text style={styles.galleryName}>{item.galleryName}</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Icon
                key={star}
                name="star"
                size={16}
                color={star <= item.rating ? '#FFB800' : '#E0E0E0'}
              />
            ))}
            <Text style={styles.ratingText}>{item.rating}.0</Text>
          </View>
          <Text style={styles.reviewDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteReview(item.id, item.galleryName)}
        >
          <Icon name="delete" size={20} color="#999" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.reviewContent} numberOfLines={3}>
        {item.content}
      </Text>
      
      {item.images && item.images.length > 0 && (
        <View style={styles.reviewImages}>
          {item.images.slice(0, 3).map((image, index) => (
            <Image key={index} source={{ uri: image }} style={styles.reviewImage} />
          ))}
          {item.images.length > 3 && (
            <View style={styles.moreImages}>
              <Text style={styles.moreImagesText}>+{item.images.length - 3}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B7BFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="rate-review" size={60} color="#ccc" />
          <Text style={styles.emptyText}>작성한 리뷰가 없습니다</Text>
          <Text style={styles.emptySubText}>
            방문한 갤러리에 대한 리뷰를 작성해보세요
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#4B7BFF']}
            />
          }
        />
      )}
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
  listContainer: {
    padding: 15,
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  galleryImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  galleryImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewInfo: {
    flex: 1,
  },
  galleryName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 8,
  },
  reviewContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewImages: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  moreImages: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MyReviewsScreen;