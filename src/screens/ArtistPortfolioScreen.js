import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import useLoginStore from '../store/useLoginStore';
import FirebaseService from '../services/FirebaseService';
import KoreanTextInput from '../components/KoreanTextInput';

const { width } = Dimensions.get('window');
const imageSize = (width - 48) / 3;

const ArtistPortfolioScreen = ({ navigation }) => {
  const { userId } = useLoginStore();
  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [artworks, setArtworks] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWork, setSelectedWork] = useState(null);
  const [activeTab, setActiveTab] = useState('artworks'); // 판매 작품만 표시
  const [newWork, setNewWork] = useState({
    title: '',
    description: '',
    year: '',
    medium: '',
    size: '',
    price: '',
    imageUrl: null,
    imageUri: null,
  });
  const firebaseService = new FirebaseService();

  useEffect(() => {
    loadPortfolio();
    loadArtworks();
  }, []);

  const loadPortfolio = async () => {
    try {
      setLoading(true);

      // 먼저 인덱스 없이 쿼리를 시도하고, 실패하면 클라이언트 정렬
      let works = [];

      try {
        // 인덱스가 있는 경우 서버에서 정렬
        const snapshot = await firestore()
          .collection('portfolio')
          .where('artistId', '==', userId)
          .orderBy('createdAt', 'desc')
          .get();

        works = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (indexError) {
        // 인덱스 오류가 발생하면 정렬 없이 가져온 후 클라이언트에서 정렬
        console.log('인덱스 없음, 클라이언트 정렬 사용');
        const snapshot = await firestore()
          .collection('portfolio')
          .where('artistId', '==', userId)
          .get();

        works = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // 클라이언트에서 createdAt으로 정렬
        works.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
          const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
          return bTime - aTime; // 최신순
        });
      }

      setPortfolio(works);
    } catch (error) {
      console.error('포트폴리오 로드 실패:', error);
      // 오류가 발생해도 빈 배열로 설정
      setPortfolio([]);
    } finally {
      setLoading(false);
    }
  };

  const loadArtworks = async () => {
    try {
      const data = await firebaseService.getArtistArtworks(userId);
      setArtworks(data);
    } catch (error) {
      console.error('작품 목록 로드 실패:', error);
    }
  };

  const selectImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
    };

    launchImageLibrary(options, (response) => {
      if (!response.didCancel && response.assets) {
        const imageUri = response.assets[0].uri;
        setNewWork(prev => ({ 
          ...prev, 
          imageUri: imageUri,
          imageUrl: imageUri 
        }));
      }
    });
  };

  const uploadWorkImage = async (imageUri) => {
    try {
      const filename = `portfolio/${userId}/${Date.now()}.jpg`;
      const reference = storage().ref(filename);
      await reference.putFile(imageUri);
      const url = await reference.getDownloadURL();
      return url;
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      throw error;
    }
  };

  const saveWork = async () => {
    if (!newWork.title || !newWork.imageUri) {
      Alert.alert('알림', '작품 제목과 이미지는 필수입니다.');
      return;
    }

    try {
      setLoading(true);
      
      const imageUrl = await uploadWorkImage(newWork.imageUri);
      
      // undefined 값을 제거하고 필요한 필드만 포함
      const workData = {
        title: newWork.title,
        description: newWork.description || '',
        year: newWork.year || '',
        medium: newWork.medium || '',
        size: newWork.size || '',
        price: newWork.price || '',
        imageUrl: imageUrl,
        artistId: userId,
        createdAt: firestore.FieldValue.serverTimestamp(),
        likes: 0,
        views: 0,
      };

      if (selectedWork) {
        // 업데이트 시 createdAt 제외
        const { createdAt, ...updateData } = workData;
        await firestore()
          .collection('portfolio')
          .doc(selectedWork.id)
          .update({
            ...updateData,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
      } else {
        await firestore()
          .collection('portfolio')
          .add(workData);
      }

      Alert.alert('성공', '작품이 저장되었습니다.');
      setModalVisible(false);
      resetForm();
      loadPortfolio();
    } catch (error) {
      console.error('작품 저장 실패:', error);
      Alert.alert('오류', '작품 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const deleteWork = async (workId) => {
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
              await firestore()
                .collection('portfolio')
                .doc(workId)
                .delete();
              loadPortfolio();
            } catch (error) {
              Alert.alert('오류', '작품 삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setNewWork({
      title: '',
      description: '',
      year: '',
      medium: '',
      size: '',
      price: '',
      imageUrl: null,
      imageUri: null,
    });
    setSelectedWork(null);
  };

  const openEditModal = (work) => {
    setSelectedWork(work);
    setNewWork({
      title: work.title,
      description: work.description || '',
      year: work.year || '',
      medium: work.medium || '',
      size: work.size || '',
      price: work.price || '',
      imageUrl: work.imageUrl,
      imageUri: null,
    });
    setModalVisible(true);
  };

  const renderWorkItem = ({ item }) => (
    <TouchableOpacity
      style={styles.workItem}
      onPress={() => openEditModal(item)}
      onLongPress={() => deleteWork(item.id)}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.workImage} />
      <Text style={styles.workTitle} numberOfLines={1}>{item.title}</Text>
      {item.year && <Text style={styles.workYear}>{item.year}</Text>}
    </TouchableOpacity>
  );

  const renderArtworkItem = ({ item }) => (
    <TouchableOpacity
      style={styles.workItem}
      onPress={() => navigation.navigate('ArtworkDetail', { artworkId: item.id })}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.workImage} />
      {item.status === 'sold' && (
        <View style={styles.soldOverlay}>
          <Text style={styles.soldText}>판매완료</Text>
        </View>
      )}
      <Text style={styles.workTitle} numberOfLines={1}>{item.title}</Text>
      {item.price > 0 && (
        <Text style={styles.workPrice}>₩{item.price.toLocaleString()}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>판매 작품 관리</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ArtworkUpload')}
            style={styles.headerIconButton}
          >
            <Icon name="add-photo-alternate" size={24} color="#4A90E2" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('ArtworkList')}
            style={styles.headerIconButton}
          >
            <Icon name="list" size={24} color="#4A90E2" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : artworks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="palette" size={80} color="#ddd" />
          <Text style={styles.emptyText}>아직 등록된 판매 작품이 없습니다</Text>
          <Text style={styles.emptySubText}>작품을 등록하여 판매를 시작해보세요</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('ArtworkUpload')}
          >
            <Text style={styles.addButtonText}>판매 작품 등록하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={artworks}
          renderItem={renderArtworkItem}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedWork ? '작품 수정' : '작품 등록'}
            </Text>
            <TouchableOpacity onPress={saveWork}>
              <Text style={styles.saveButton}>저장</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.imageUpload} onPress={selectImage}>
            {newWork.imageUrl ? (
              <Image source={{ uri: newWork.imageUrl }} style={styles.uploadedImage} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Icon name="add-photo-alternate" size={60} color="#999" />
                <Text style={styles.uploadText}>작품 이미지 선택</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.inputSection}>
            <Text style={styles.label}>작품 제목 *</Text>
            <KoreanTextInput
              style={[styles.input, { color: '#000' }]}
              value={newWork.title}
              onChangeText={(text) => setNewWork(prev => ({ ...prev, title: text }))}
              placeholder="작품 제목을 입력하세요"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>작품 설명</Text>
            <KoreanTextInput
              style={[styles.input, styles.textArea, { color: '#000' }]}
              value={newWork.description}
              onChangeText={(text) => setNewWork(prev => ({ ...prev, description: text }))}
              placeholder="작품에 대한 설명을 입력하세요"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputSection, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>제작년도</Text>
              <KoreanTextInput
                style={[styles.input, { color: '#000' }]}
                value={newWork.year}
                onChangeText={(text) => setNewWork(prev => ({ ...prev, year: text }))}
                placeholder="2024"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputSection, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>재료/기법</Text>
              <KoreanTextInput
                style={[styles.input, { color: '#000' }]}
                value={newWork.medium}
                onChangeText={(text) => setNewWork(prev => ({ ...prev, medium: text }))}
                placeholder="캔버스에 유화"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputSection, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>크기</Text>
              <KoreanTextInput
                style={[styles.input, { color: '#000' }]}
                value={newWork.size}
                onChangeText={(text) => setNewWork(prev => ({ ...prev, size: text }))}
                placeholder="100x80cm"
                placeholderTextColor="#999"
              />
            </View>

            <View style={[styles.inputSection, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>가격 (선택)</Text>
              <KoreanTextInput
                style={[styles.input, { color: '#000' }]}
                value={newWork.price}
                onChangeText={(text) => setNewWork(prev => ({ ...prev, price: text }))}
                placeholder="문의"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#bbb',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  grid: {
    padding: 16,
  },
  workItem: {
    width: imageSize,
    marginRight: 8,
    marginBottom: 16,
  },
  workImage: {
    width: imageSize,
    height: imageSize,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  workTitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#333',
  },
  workYear: {
    fontSize: 10,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageUpload: {
    margin: 16,
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadPlaceholder: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  uploadText: {
    marginTop: 8,
    color: '#999',
    fontSize: 14,
  },
  inputSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  workPrice: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '600',
    marginTop: 2,
  },
  soldOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  soldText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ArtistPortfolioScreen;
