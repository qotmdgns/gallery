import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import useLoginStore from '../store/useLoginStore';

const ArtistSearchScreen = ({ navigation }) => {
  const { userId, userType } = useLoginStore();
  const [loading, setLoading] = useState(false);
  const [artworks, setArtworks] = useState([]);
  const [filteredArtworks, setFilteredArtworks] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('전체');
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [portfolio, setPortfolio] = useState([]);

  const genres = ['전체', '회화', '조각', '사진', '설치미술', '미디어아트', '공예', '판화', '서예', '일러스트', '디지털아트'];

  console.log('=== ArtistSearchScreen 렌더링 ===');
  console.log('useLoginStore - userId:', userId);
  console.log('useLoginStore - userType:', userType);

  useEffect(() => {
    loadArtworks();
  }, []);

  useEffect(() => {
    filterArtworks();
  }, [searchText, selectedGenre, artworks]);

  const loadArtworks = async () => {
    try {
      setLoading(true);
      const artworksSnapshot = await firestore()
        .collection('artworks')
        .get();

      const artworkList = artworksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 각 작품에 대한 아티스트 정보 가져오기
      const artworkListWithArtists = await Promise.all(
        artworkList.map(async (artwork) => {
          try {
            const artistDoc = await firestore()
              .collection('users')
              .doc(artwork.artistId)
              .get();

            if (artistDoc.exists) {
              return {
                ...artwork,
                artistName: artistDoc.data().displayName || '알 수 없음',
                artistProfileImage: artistDoc.data().profileImage,
              };
            }
            return artwork;
          } catch (error) {
            console.error('아티스트 정보 로드 실패:', error);
            return artwork;
          }
        })
      );

      setArtworks(artworkListWithArtists);
      setFilteredArtworks(artworkListWithArtists);
    } catch (error) {
      console.error('작품 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterArtworks = () => {
    let filtered = [...artworks];

    if (searchText) {
      filtered = filtered.filter(artwork =>
        artwork.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        artwork.description?.toLowerCase().includes(searchText.toLowerCase()) ||
        artwork.artistName?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (selectedGenre !== '전체') {
      filtered = filtered.filter(artwork =>
        artwork.category === selectedGenre || artwork.genre === selectedGenre
      );
    }

    setFilteredArtworks(filtered);
  };

  const loadArtistPortfolio = async (artistId) => {
    try {
      const snapshot = await firestore()
        .collection('artworks')
        .where('artistId', '==', artistId)
        .get();

      // 클라이언트 사이드에서 정렬 (인덱스 불필요)
      const works = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => {
          // createdAt이 Firestore Timestamp인 경우
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime; // 최신순
        })
        .slice(0, 6); // 최대 6개만

      setPortfolio(works);
    } catch (error) {
      console.error('포트폴리오 로드 실패:', error);
    }
  };

  const openArtistDetail = async (artwork) => {
    try {
      // 작품의 아티스트 정보 가져오기
      const artistDoc = await firestore()
        .collection('users')
        .doc(artwork.artistId)
        .get();

      if (artistDoc.exists) {
        const artistData = {
          id: artistDoc.id,
          ...artistDoc.data()
        };
        setSelectedArtist(artistData);
        await loadArtistPortfolio(artistDoc.id);
        setModalVisible(true);
      }
    } catch (error) {
      console.error('아티스트 정보 로드 실패:', error);
    }
  };

  const startChat = async () => {
    // 아티스트와 직접 채팅 시작
    try {
      console.log('=== startChat 시작 (아티스트와 채팅) ===');

      // auth().currentUser 확인
      const currentUser = auth().currentUser;
      console.log('현재 사용자 uid:', currentUser?.uid);
      console.log('선택된 아티스트:', selectedArtist);

      // 로그인 확인
      if (!currentUser) {
        Alert.alert('알림', '로그인이 필요합니다.');
        navigation.navigate('Login');
        return;
      }

      if (!selectedArtist || !selectedArtist.id) {
        Alert.alert('알림', '아티스트 정보를 찾을 수 없습니다.');
        return;
      }

      // 아티스트를 "가상 갤러리"로 취급
      // 채팅방 ID: currentUser.uid_artist_artistId
      const virtualGalleryId = `artist_${selectedArtist.id}`;

      console.log('가상 갤러리 ID:', virtualGalleryId);
      console.log('아티스트 이름:', selectedArtist.displayName);

      // 채팅 시작 - 아티스트와 직접 채팅
      navigation.navigate('ChatDetail', {
        galleryId: virtualGalleryId,
        galleryName: `${selectedArtist.displayName || '아티스트'}`,
        isOwner: true,
        artistId: selectedArtist.id, // 아티스트 ID 전달
        artistName: selectedArtist.displayName,
      });
      setModalVisible(false);
    } catch (error) {
      console.error('채팅 시작 오류:', error);
      console.error('에러 상세:', error.message);
      Alert.alert('오류', `채팅을 시작할 수 없습니다: ${error.message}`);
    }
  };

  const navigateToArtworkDetail = (artworkId) => {
    navigation.navigate('ArtworkDetail', { artworkId });
  };

  const renderArtwork = ({ item }) => (
    <TouchableOpacity
      style={styles.artworkCard}
      onPress={() => navigateToArtworkDetail(item.id)}
    >
      <Image
        source={{ uri: item.imageUrl || 'https://via.placeholder.com/300' }}
        style={styles.artworkImage}
      />
      <View style={styles.artworkInfo}>
        <Text style={styles.artworkTitle} numberOfLines={1}>{item.title || '제목 없음'}</Text>
        <Text style={styles.artistName}>{item.artistName || '알 수 없음'}</Text>
        {item.category && (
          <Text style={styles.categoryTag}>{item.category}</Text>
        )}
        {item.price && (
          <Text style={styles.priceText}>
            {typeof item.price === 'number'
              ? `${item.price.toLocaleString()}원`
              : item.price}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>아티스트 찾기</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="작품명, 작가명으로 검색"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.genreFilter}
      >
        {genres.map((genre) => (
          <TouchableOpacity
            key={genre}
            style={[
              styles.genreButton,
              selectedGenre === genre && styles.genreButtonActive
            ]}
            onPress={() => setSelectedGenre(genre)}
          >
            <Text style={[
              styles.genreButtonText,
              selectedGenre === genre && styles.genreButtonTextActive
            ]}>
              {genre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : (
        <FlatList
          data={filteredArtworks}
          renderItem={renderArtwork}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.artworkList}
          columnWrapperStyle={styles.artworkRow}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="image-search" size={60} color="#ddd" />
              <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
            </View>
          }
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
            <Text style={styles.modalTitle}>아티스트 프로필</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedArtist && (
            <>
              <View style={styles.profileSection}>
                <Image 
                  source={{ uri: selectedArtist.profileImage || 'https://via.placeholder.com/150' }}
                  style={styles.profileImage}
                />
                <Text style={styles.profileName}>{selectedArtist.displayName}</Text>
                {selectedArtist.genre && (
                  <View style={styles.profileGenres}>
                    {selectedArtist.genre.map((g, index) => (
                      <Text key={index} style={styles.profileGenreTag}>{g}</Text>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>소개</Text>
                <Text style={styles.sectionContent}>
                  {selectedArtist.bio || '소개가 없습니다.'}
                </Text>
              </View>

              {selectedArtist.education && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>학력</Text>
                  <Text style={styles.sectionContent}>{selectedArtist.education}</Text>
                </View>
              )}

              {selectedArtist.awards && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>수상 경력</Text>
                  <Text style={styles.sectionContent}>{selectedArtist.awards}</Text>
                </View>
              )}

              {selectedArtist.experience && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>전시 경력</Text>
                  <Text style={styles.sectionContent}>{selectedArtist.experience}</Text>
                </View>
              )}

              {portfolio.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>포트폴리오</Text>
                  <View style={styles.portfolioGrid}>
                    {portfolio.map((work) => (
                      <TouchableOpacity
                        key={work.id}
                        style={styles.portfolioItem}
                        onPress={() => {
                          setModalVisible(false);
                          navigateToArtworkDetail(work.id);
                        }}
                      >
                        <Image source={{ uri: work.imageUrl }} style={styles.portfolioImage} />
                        <Text style={styles.portfolioTitle} numberOfLines={1}>
                          {work.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.contactSection}>
                {selectedArtist.website && (
                  <TouchableOpacity style={styles.contactButton}>
                    <Icon name="language" size={20} color="#666" />
                    <Text style={styles.contactText}>{selectedArtist.website}</Text>
                  </TouchableOpacity>
                )}
                {selectedArtist.instagram && (
                  <TouchableOpacity style={styles.contactButton}>
                    <Icon name="camera-alt" size={20} color="#666" />
                    <Text style={styles.contactText}>{selectedArtist.instagram}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {userType === 'owner' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.chatButton]}
                    onPress={startChat}
                  >
                    <Icon name="chat" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>메시지 보내기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.proposalButton]}
                    onPress={() => {
                      setModalVisible(false);
                      navigation.navigate('ExhibitionProposal', {
                        artistId: selectedArtist.id,
                        artistName: selectedArtist.displayName,
                      });
                    }}
                  >
                    <Icon name="send" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>전시 제안하기</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    height: 44,
    backgroundColor: '#f5f5f5',
    borderRadius: 22,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  genreFilter: {
    maxHeight: 50,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  genreButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  genreButtonActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  genreButtonText: {
    fontSize: 14,
    color: '#666',
  },
  genreButtonTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkList: {
    padding: 8,
  },
  artworkRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  artworkCard: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  artworkImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f5f5f5',
  },
  artworkInfo: {
    padding: 12,
  },
  artworkTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  artistName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  categoryTag: {
    fontSize: 11,
    color: '#FF6B6B',
    backgroundColor: '#FFE5E5',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  priceText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
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
  profileSection: {
    alignItems: 'center',
    padding: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  profileGenres: {
    flexDirection: 'row',
  },
  profileGenreTag: {
    fontSize: 14,
    color: '#FF6B6B',
    marginHorizontal: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
  },
  detailSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  sectionContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginHorizontal: -4,
  },
  portfolioItem: {
    width: '31%',
    marginHorizontal: '1.16%',
    marginBottom: 12,
  },
  portfolioImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  portfolioTitle: {
    marginTop: 4,
    fontSize: 11,
    color: '#666',
  },
  contactSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  chatButton: {
    backgroundColor: '#4CAF50',
  },
  proposalButton: {
    backgroundColor: '#FF6B6B',
  },
  actionButtonText: {
    marginLeft: 8,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ArtistSearchScreen;