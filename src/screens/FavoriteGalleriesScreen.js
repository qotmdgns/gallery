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

const FavoriteGalleriesScreen = ({ navigation }) => {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = auth().currentUser;

  useEffect(() => {
    fetchFavoriteGalleries();
  }, []);

  const fetchFavoriteGalleries = async () => {
    try {
      // 사용자 문서에서 찜한 갤러리 ID 목록 가져오기
      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      const favoriteGalleryIds = userDoc.data()?.favoriteGalleries || [];

      if (favoriteGalleryIds.length === 0) {
        setGalleries([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 찜한 갤러리들의 정보 가져오기
      const galleriesData = await Promise.all(
        favoriteGalleryIds.map(async (galleryId) => {
          const galleryDoc = await firestore()
            .collection('galleries')
            .doc(galleryId)
            .get();

          if (!galleryDoc.exists) return null;

          const galleryData = galleryDoc.data();
          
          // 리뷰 정보 가져오기
          const reviewsSnapshot = await firestore()
            .collection('reviews')
            .where('galleryId', '==', galleryId)
            .get();

          const totalRating = reviewsSnapshot.docs.reduce((sum, doc) => 
            sum + doc.data().rating, 0
          );
          const averageRating = reviewsSnapshot.size > 0 
            ? (totalRating / reviewsSnapshot.size).toFixed(1) 
            : 0;

          return {
            id: galleryDoc.id,
            ...galleryData,
            rating: averageRating,
            reviewCount: reviewsSnapshot.size,
          };
        })
      );

      // null 값 필터링
      setGalleries(galleriesData.filter(gallery => gallery !== null));
    } catch (error) {
      console.error('찜한 갤러리 목록 로드 오류:', error);
      Alert.alert('오류', '찜한 갤러리 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFavoriteGalleries();
  };

  const handleRemoveFavorite = (galleryId, galleryName) => {
    Alert.alert(
      '찜 해제',
      `${galleryName}을(를) 찜 목록에서 제거하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '제거',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection('users')
                .doc(currentUser.uid)
                .update({
                  favoriteGalleries: firestore.FieldValue.arrayRemove(galleryId),
                });
              
              setGalleries(galleries.filter(gallery => gallery.id !== galleryId));
              Alert.alert('성공', '찜 목록에서 제거되었습니다.');
            } catch (error) {
              console.error('찜 해제 오류:', error);
              Alert.alert('오류', '찜 해제 중 오류가 발생했습니다.');
            }
          },
        },
      ],
    );
  };

  const renderGalleryItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.galleryCard}
      onPress={() => navigation.navigate('GalleryDetail', { galleryId: item.id })}
    >
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.galleryImage} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Icon name="image" size={40} color="#ccc" />
        </View>
      )}
      
      <View style={styles.galleryInfo}>
        <View style={styles.headerRow}>
          <Text style={styles.galleryName} numberOfLines={1}>{item.name}</Text>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => handleRemoveFavorite(item.id, item.name)}
          >
            <Icon name="favorite" size={20} color="#FF4B7B" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.location} numberOfLines={1}>
          <Icon name="location-on" size={14} color="#999" /> {item.location}
        </Text>
        
        <View style={styles.ratingRow}>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={16} color="#FFB800" />
            <Text style={styles.rating}>{item.rating}</Text>
            <Text style={styles.reviewCount}>({item.reviewCount})</Text>
          </View>
          <Text style={styles.price}>₩{item.hourlyRate?.toLocaleString()}/시간</Text>
        </View>
        
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
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
      {galleries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="favorite-border" size={60} color="#ccc" />
          <Text style={styles.emptyText}>찜한 갤러리가 없습니다</Text>
          <Text style={styles.emptySubText}>
            마음에 드는 갤러리를 찜해보세요
          </Text>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => navigation.navigate('Search')}
          >
            <Text style={styles.searchButtonText}>갤러리 둘러보기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={galleries}
          renderItem={renderGalleryItem}
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
  galleryCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  galleryImage: {
    width: '100%',
    height: 200,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryInfo: {
    padding: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  galleryName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  favoriteButton: {
    padding: 4,
  },
  location: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: '#999',
    marginLeft: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B7BFF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
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
    marginBottom: 30,
  },
  searchButton: {
    backgroundColor: '#4B7BFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FavoriteGalleriesScreen;