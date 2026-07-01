// src/screens/ManageGalleryScreen.js
import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';

const ManageGalleryScreen = ({ navigation }) => {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = auth().currentUser;

  useEffect(() => {
    fetchMyGalleries();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '갤러리 관리',
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

  const fetchMyGalleries = async () => {
    try {
      const querySnapshot = await firestore()
        .collection('galleries')
        .where('ownerId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .get();
      
      const galleryList = [];
      for (const doc of querySnapshot.docs) {
        const galleryData = doc.data();
        
        // 각 갤러리의 통계 정보 가져오기
        const stats = await getGalleryStats(doc.id);
        
        galleryList.push({
          id: doc.id,
          ...galleryData,
          ...stats,
        });
      }
      
      setGalleries(galleryList);
    } catch (error) {
      console.error('갤러리 목록 로드 오류:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getGalleryStats = async (galleryId) => {
    try {
      // 예약 통계
      const reservationsSnapshot = await firestore()
        .collection('reservations')
        .where('galleryId', '==', galleryId)
        .get();
      
      let totalRevenus = 0;
      let activeBookings = 0;
      
      reservationsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'confirmed') {
          totalRevenus += data.totalPrice || 0;
          const endDate = data.endDate?.toDate();
          if (endDate && endDate > new Date()) {
            activeBookings++;
          }
        }
      });
      
      // 리뷰 통계
      const reviewsSnapshot = await firestore()
        .collection('reviews')
        .where('galleryId', '==', galleryId)
        .get();
      
      let totalRating = 0;
      reviewsSnapshot.forEach(doc => {
        totalRating += doc.data().rating || 0;
      });
      
      const averageRating = reviewsSnapshot.size > 0 
        ? (totalRating / reviewsSnapshot.size).toFixed(1)
        : 0;
      
      return {
        totalRevenus,
        activeBookings,
        totalReviews: reviewsSnapshot.size,
        averageRating,
      };
    } catch (error) {
      console.error('갤러리 통계 로드 오류:', error);
      return {
        totalRevenus: 0,
        activeBookings: 0,
        totalReviews: 0,
        averageRating: 0,
      };
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMyGalleries();
  };

  const handleDeleteGallery = (galleryId, galleryName) => {
    Alert.alert(
      '갤러리 삭제',
      `"${galleryName}"을(를) 정말 삭제하시겠습니까?\n\n관련된 모든 예약과 리뷰 정보가 함께 삭제됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              // Firestore에서 갤러리 삭제
              await firestore().collection('galleries').doc(galleryId).delete();
              
              Alert.alert('삭제 완료', '갤러리가 삭제되었습니다.');
              fetchMyGalleries();
            } catch (error) {
              console.error('갤러리 삭제 오류:', error);
              Alert.alert('오류', '갤러리 삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const renderGalleryItem = ({ item }) => (
    <View style={styles.galleryCard}>
      {item.imageUrls && item.imageUrls.length > 0 ? (
        <Image 
          source={{ uri: item.imageUrls[0] }} 
          style={styles.galleryImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Icon name="image" size={40} color="#ccc" />
        </View>
      )}
      
      <View style={styles.galleryInfo}>
        <Text style={styles.galleryName}>{item.galleryName}</Text>
        <Text style={styles.location}>{item.location}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Icon name="event-available" size={16} color="#4CAF50" />
            <Text style={styles.statText}>
              활성 예약: {item.activeBookings}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="star" size={16} color="#FFD700" />
            <Text style={styles.statText}>
              평점: {item.averageRating} ({item.totalReviews})
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="attach-money" size={16} color="#007AFF" />
            <Text style={styles.statText}>
              총 수익: {(item.totalRevenus / 10000).toFixed(0)}만원
            </Text>
          </View>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => navigation.navigate('EditMyGallery', { docId: item.id })}
          >
            <Icon name="edit" size={16} color="white" />
            <Text style={styles.actionButtonText}>수정</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.settingsButton]}
            onPress={() => navigation.navigate('ReservationSettings', { galleryId: item.id })}
          >
            <Icon name="settings" size={16} color="white" />
            <Text style={styles.actionButtonText}>예약설정</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => navigation.navigate('GalleryDetail', { galleryId: item.id })}
          >
            <Icon name="visibility" size={16} color="white" />
            <Text style={styles.actionButtonText}>보기</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteGallery(item.id, item.galleryName)}
          >
            <Icon name="delete" size={16} color="white" />
            <Text style={styles.actionButtonText}>삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={galleries}
        renderItem={renderGalleryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="store" size={60} color="#ccc" />
            <Text style={styles.emptyText}>등록된 갤러리가 없습니다</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('GalleryRegister')}
            >
              <Icon name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>갤러리 등록하기</Text>
            </TouchableOpacity>
          </View>
        }
        ListHeaderComponent={
          galleries.length > 0 && (
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => navigation.navigate('GalleryRegister')}
            >
              <Icon name="add-circle" size={24} color="#007AFF" />
              <Text style={styles.registerButtonText}>새 갤러리 등록</Text>
            </TouchableOpacity>
          )
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
  listContainer: {
    padding: 15,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  registerButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 10,
  },
  galleryCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
  galleryName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  statsContainer: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 5,
  },
  statText: {
    fontSize: 14,
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 5,
    gap: 5,
  },
  editButton: {
    backgroundColor: '#4CAF50',
  },
  settingsButton: {
    backgroundColor: '#FF9800',
  },
  viewButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ManageGalleryScreen;