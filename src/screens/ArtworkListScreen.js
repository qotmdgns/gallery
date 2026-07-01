import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FirebaseService from '../services/FirebaseService';
import useLoginStore from '../store/useLoginStore';

const ArtworkListScreen = ({ navigation }) => {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userId } = useLoginStore();
  const firebaseService = new FirebaseService();

  const loadArtworks = useCallback(async () => {
    try {
      const data = await firebaseService.getArtistArtworks(userId);
      setArtworks(data);
    } catch (error) {
      console.error('Load artworks error:', error);
      Alert.alert('오류', '작품 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadArtworks();
  }, [loadArtworks]);

  const onRefresh = () => {
    setRefreshing(true);
    loadArtworks();
  };

  const handleEdit = (artwork) => {
    // 작품 수정 화면으로 이동
    navigation.navigate('ArtworkEdit', { artwork });
  };

  const handleDelete = (artworkId) => {
    Alert.alert(
      '작품 삭제',
      '정말로 이 작품을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await firebaseService.deleteArtwork(artworkId);
              setArtworks(artworks.filter(item => item.id !== artworkId));
              Alert.alert('성공', '작품이 삭제되었습니다.');
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('오류', '작품 삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleStatusToggle = async (artwork) => {
    const newStatus = artwork.status === 'active' ? 'sold' : 'active';
    const statusText = newStatus === 'sold' ? '판매완료' : '판매중';

    try {
      await firebaseService.updateArtwork(artwork.id, { status: newStatus });
      setArtworks(artworks.map(item =>
        item.id === artwork.id ? { ...item, status: newStatus } : item
      ));
      Alert.alert('성공', `작품 상태가 ${statusText}로 변경되었습니다.`);
    } catch (error) {
      console.error('Status update error:', error);
      Alert.alert('오류', '상태 변경 중 오류가 발생했습니다.');
    }
  };

  const renderArtwork = ({ item }) => (
    <View style={styles.artworkCard}>
      <Image source={{ uri: item.imageUrl }} style={styles.artworkImage} />
      <View style={styles.artworkInfo}>
        <View style={styles.artworkHeader}>
          <Text style={styles.artworkTitle} numberOfLines={1}>{item.title}</Text>
          {item.status === 'sold' && (
            <View style={styles.soldBadge}>
              <Text style={styles.soldBadgeText}>판매완료</Text>
            </View>
          )}
        </View>

        <Text style={styles.artworkCategory}>{item.category}</Text>
        {item.year && (
          <Text style={styles.artworkDetail}>{item.year}년 작</Text>
        )}
        {item.size && (
          <Text style={styles.artworkDetail}>{item.size}</Text>
        )}

        {item.isForSale && item.price > 0 && (
          <Text style={styles.artworkPrice}>
            ₩ {item.price.toLocaleString()}
          </Text>
        )}

        <View style={styles.artworkStats}>
          <View style={styles.statItem}>
            <Icon name="visibility" size={16} color="#666" />
            <Text style={styles.statText}>{item.views || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="favorite" size={16} color="#666" />
            <Text style={styles.statText}>{item.likes || 0}</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          {item.status === 'active' && item.isForSale && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleStatusToggle(item)}
            >
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.actionButtonText}>판매완료</Text>
            </TouchableOpacity>
          )}
          {item.status === 'sold' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleStatusToggle(item)}
            >
              <Icon name="refresh" size={20} color="#FF9800" />
              <Text style={styles.actionButtonText}>재판매</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEdit(item)}
          >
            <Icon name="edit" size={20} color="#4A90E2" />
            <Text style={styles.actionButtonText}>수정</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item.id)}
          >
            <Icon name="delete" size={20} color="#F44336" />
            <Text style={styles.actionButtonText}>삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const ListHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>내 작품 관리</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('ArtworkUpload')}
      >
        <Icon name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>작품 추가</Text>
      </TouchableOpacity>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="palette" size={80} color="#ddd" />
      <Text style={styles.emptyText}>등록된 작품이 없습니다</Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('ArtworkUpload')}
      >
        <Text style={styles.emptyButtonText}>첫 작품 등록하기</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={artworks}
        renderItem={renderArtwork}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={artworks.length === 0 && styles.emptyList}
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
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '600',
  },
  artworkCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  artworkImage: {
    width: 120,
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  artworkInfo: {
    flex: 1,
    padding: 12,
  },
  artworkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  artworkTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  soldBadge: {
    backgroundColor: '#FF5252',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  soldBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  artworkCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  artworkDetail: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  artworkPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginVertical: 4,
  },
  artworkStats: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
  },
  actionButtonText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#666',
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
    marginTop: 20,
    marginBottom: 30,
  },
  emptyButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyList: {
    flexGrow: 1,
  },
});

export default ArtworkListScreen;