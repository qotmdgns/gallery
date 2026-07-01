// src/screens/ReviewListScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import FirebaseService from '../services/FirebaseService';

const ReviewListScreen = ({ route, navigation }) => {
  const { galleryId, galleryName } = route.params;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });

  const currentUser = auth().currentUser;

  useEffect(() => {
    navigation.setOptions({
      title: `${galleryName} 리뷰`,
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('WriteReview', { galleryId, galleryName })}
        >
          <Icon name="edit" size={24} color="white" />
        </TouchableOpacity>
      ),
    });
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const reviewsSnapshot = await firestore()
        .collection('reviews')
        .where('galleryId', '==', galleryId)
        .orderBy('createdAt', 'desc')
        .get();

      const reviewsList = [];
      let totalRating = 0;
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

      reviewsSnapshot.forEach((doc) => {
        const data = doc.data();
        reviewsList.push({ id: doc.id, ...data });
        totalRating += data.rating;
        distribution[data.rating]++;
      });

      setReviews(reviewsList);
      setStats({
        totalReviews: reviewsList.length,
        averageRating: reviewsList.length > 0 ? (totalRating / reviewsList.length).toFixed(1) : 0,
        ratingDistribution: distribution,
      });
    } catch (error) {
      console.error('리뷰 로드 오류:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, index) => (
      <Icon
        key={index}
        name="star"
        size={16}
        color={index < rating ? '#FFD700' : '#e0e0e0'}
      />
    ));
  };

  const renderReview = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.userName?.charAt(0) || 'U'}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{item.userName}</Text>
            <View style={styles.ratingContainer}>
              {renderStars(item.rating)}
              <Text style={styles.reviewDate}>
                {item.createdAt?.toDate?.()?.toLocaleDateString() || ''}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.reviewText}>{item.text}</Text>

      {item.imageUrls && item.imageUrls.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imageContainer}
        >
          {item.imageUrls.map((url, index) => (
            <TouchableOpacity key={index} style={styles.reviewImageWrapper}>
              <Image source={{ uri: url }} style={styles.reviewImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {item.userId === currentUser?.uid && (
        <View style={styles.reviewActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteReview(item.id)}
          >
            <Icon name="delete" size={18} color="#666" />
            <Text style={styles.actionText}>삭제</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const handleDeleteReview = async (reviewId) => {
    Alert.alert(
      '리뷰 삭제',
      '이 리뷰를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection('reviews').doc(reviewId).delete();
              // 갤러리 평점 재계산
              const firebaseService = new FirebaseService();
              await firebaseService.updateGalleryRating(galleryId);
              fetchReviews();
            } catch (error) {
              console.error('리뷰 삭제 오류:', error);
              Alert.alert('오류', '리뷰 삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 리뷰 통계 */}
      <View style={styles.statsContainer}>
        <View style={styles.statsLeft}>
          <Text style={styles.averageRating}>{stats.averageRating}</Text>
          <View style={styles.starsContainer}>
            {renderStars(Math.round(stats.averageRating))}
          </View>
          <Text style={styles.totalReviews}>{stats.totalReviews}개의 리뷰</Text>
        </View>
        
        <View style={styles.statsRight}>
          {[5, 4, 3, 2, 1].map((rating) => (
            <View key={rating} style={styles.ratingBar}>
              <Text style={styles.ratingNumber}>{rating}</Text>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${(stats.ratingDistribution[rating] / stats.totalReviews) * 100 || 0}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.ratingCount}>
                {stats.ratingDistribution[rating]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <FlatList
        data={reviews}
        renderItem={renderReview}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.reviewsList}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="rate-review" size={60} color="#ccc" />
            <Text style={styles.emptyText}>아직 리뷰가 없습니다</Text>
            <TouchableOpacity
              style={styles.writeButton}
              onPress={() => navigation.navigate('WriteReview', { galleryId, galleryName })}
            >
              <Text style={styles.writeButtonText}>첫 리뷰 작성하기</Text>
            </TouchableOpacity>
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
  headerButton: {
    marginRight: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  statsLeft: {
    alignItems: 'center',
    marginRight: 30,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  totalReviews: {
    fontSize: 14,
    color: '#666',
  },
  statsRight: {
    flex: 1,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingNumber: {
    width: 15,
    fontSize: 12,
    color: '#666',
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  ratingCount: {
    width: 25,
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  reviewsList: {
    padding: 10,
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  reviewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  imageContainer: {
    marginBottom: 12,
  },
  reviewImageWrapper: {
    marginRight: 10,
  },
  reviewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  reviewActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    marginBottom: 20,
  },
  writeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  writeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReviewListScreen;