// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Picker } from '@react-native-picker/picker';
import { handleError } from '../utils/errorHandler';
import { LoadingView, ErrorView, EmptyView } from '../components/LoadingErrorHandler';
import useLoginStore from '../store/useLoginStore';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [galleries, setGalleries] = useState([]);
  const [filteredGalleries, setFilteredGalleries] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { userType } = useLoginStore();

  const fetchGalleries = useCallback(async () => {
    try {
      setError(null);

      // 권한 오류 방지를 위한 try-catch
      let querySnapshot;
      try {
        querySnapshot = await firestore()
          .collection('galleries')
          .limit(50) // 제한을 두어 성능 개선
          .get();
      } catch (firestoreError) {
        console.log('Firestore 접근 오류:', firestoreError.message);

        // 권한 오류인 경우 빈 배열로 처리
        if (firestoreError.code === 'permission-denied') {
          console.log('갤러리 데이터 접근 권한이 없습니다. Firebase 보안 규칙을 확인하세요.');
          setGalleries([]);
          setFilteredGalleries([]);
          setError({
            message: '갤러리 데이터를 불러올 수 없습니다.\n잠시 후 다시 시도해주세요.',
            code: 'permission-denied'
          });
          return;
        }
        throw firestoreError;
      }

      const galleryData = [];
      querySnapshot.forEach((doc) => {
        galleryData.push({ id: doc.id, ...doc.data() });
      });

      // 클라이언트 측에서 정렬
      galleryData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });

      setGalleries(galleryData);
      setFilteredGalleries(galleryData);
    } catch (err) {
      console.error('갤러리 로드 오류:', err);
      const errorInfo = handleError(err, {
        screen: 'HomeScreen',
        action: 'fetchGalleries'
      });
      setError(errorInfo);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);

  const handleSearch = (text) => {
    setSearchText(text);
    filterGalleries(text, selectedFilter);
  };

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
    filterGalleries(searchText, filter);
  };

  const filterGalleries = (searchText, filter) => {
    let filtered = [...galleries];

    // 검색어 필터링
    if (searchText) {
      filtered = filtered.filter(
        (gallery) =>
          gallery.galleryName?.toLowerCase().includes(searchText.toLowerCase()) ||
          gallery.location?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // 추가 필터링 (예: 가격대별, 지역별 등)
    if (filter !== 'all') {
      // 필터 로직 추가 가능
    }

    setFilteredGalleries(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGalleries();
  };

  const renderGalleryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.galleryCard}
      onPress={() => {
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate('GalleryDetail', { galleryId: item.id });
        } else {
          navigation.navigate('GalleryDetail', { galleryId: item.id });
        }
      }}
      activeOpacity={0.8}
    >
      {item.imageUrls && item.imageUrls.length > 0 ? (
        <Image source={{ uri: item.imageUrls[0] }} style={styles.galleryImage} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Icon name="image" size={40} color="#ccc" />
        </View>
      )}
      
      <View style={styles.galleryInfo}>
        <Text style={styles.galleryName} numberOfLines={1}>
          {item.galleryName}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {item.location}
        </Text>
        <Text style={styles.price}>
          {item.price?.toLocaleString()}원 / 1주
        </Text>
      </View>
    </TouchableOpacity>
  );



  if (loading) {
    return <LoadingView message="갤러리를 불러오는 중..." />;
  }

  if (error) {
    return (
      <ErrorView 
        error={error}
        message={error.message}
        onRetry={() => {
          setLoading(true);
          fetchGalleries();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* 검색 및 필터 헤더 */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="지역, 갤러리명"
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={handleSearch}
            />
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Icon name="close" size={20} color="#999" />
            </TouchableOpacity>
          </View>
          
          {/* 프로필 버튼 추가 */}
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.jumpTo('MyPage')}
          >
            <Icon name="account-circle" size={32} color="#4B7BFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterContainer}>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedFilter}
              onValueChange={handleFilterChange}
              style={styles.picker}
            >
              <Picker.Item label="검색 필터" value="all" />
              <Picker.Item label="가격 낮은순" value="priceLow" />
              <Picker.Item label="가격 높은순" value="priceHigh" />
              <Picker.Item label="최신순" value="recent" />
            </Picker>
          </View>
          
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue="all"
              style={styles.picker}
            >
              <Picker.Item label="추천순" value="all" />
              <Picker.Item label="인기순" value="popular" />
              <Picker.Item label="평점순" value="rating" />
            </Picker>
          </View>
        </View>
      </View>

      {/* 갤러리 목록 */}
      <FlatList
        data={filteredGalleries}
        renderItem={renderGalleryItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4B7BFF']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="search-off" size={60} color="#ccc" />
            <Text style={styles.emptyText}>등록된 갤러리가 없습니다</Text>
          </View>
        }
      />
      
      {userType === 'owner' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('GalleryRegister')}
          activeOpacity={0.8}
        >
          <Icon name="add" size={28} color="white" />
        </TouchableOpacity>
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
  header: {
    backgroundColor: 'white',
    paddingTop: 10,
    paddingHorizontal: 15,
    paddingBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    flex: 1,
    marginRight: 10,
  },
  profileButton: {
    padding: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerWrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    overflow: 'hidden',
  },
  picker: {
    height: 40,
    fontSize: 14,
  },
  listContainer: {
    padding: 10,
  },
  row: {
    justifyContent: 'space-between',
  },
  galleryCard: {
    width: (width - 30) / 2,
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  galleryImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryInfo: {
    padding: 12,
  },
  galleryName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  price: {
    fontSize: 15,
    color: '#4B7BFF',
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
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4B7BFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default HomeScreen;
