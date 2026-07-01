import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FirebaseService from '../services/FirebaseService';

const ArtworkUploadScreen = ({ navigation }) => {
  const [artwork, setArtwork] = useState({
    title: '',
    description: '',
    category: '',
    medium: '', // 재료/기법
    size: '',
    year: '',
    price: '',
    isForSale: true,
  });
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const firebaseService = new FirebaseService();

  const categories = [
    '회화', '조각', '사진', '판화',
    '드로잉', '설치', '미디어아트', '공예', '기타'
  ];

  const selectImage = () => {
    const options = {
      mediaType: 'photo',
      maxWidth: 2000,
      maxHeight: 2000,
      quality: 0.8,
    };

    launchImageLibrary(options, response => {
      if (response.assets && response.assets[0]) {
        setImageUri(response.assets[0].uri);
      }
    });
  };

  const handleUpload = async () => {
    // 유효성 검사
    if (!artwork.title.trim()) {
      Alert.alert('알림', '작품 제목을 입력해주세요.');
      return;
    }
    if (!artwork.category) {
      Alert.alert('알림', '작품 카테고리를 선택해주세요.');
      return;
    }
    if (!imageUri) {
      Alert.alert('알림', '작품 이미지를 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 가격을 숫자로 변환
      const artworkData = {
        ...artwork,
        price: artwork.price ? parseInt(artwork.price.replace(/,/g, ''), 10) : 0,
        year: artwork.year ? parseInt(artwork.year, 10) : null,
      };

      await firebaseService.uploadArtwork(artworkData, imageUri);
      Alert.alert(
        '업로드 완료',
        '작품이 성공적으로 업로드되었습니다.',
        [
          {
            text: '확인',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('오류', '작품 업로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (value) => {
    // 숫자만 추출
    const numericValue = value.replace(/[^0-9]/g, '');
    // 천 단위 콤마 추가
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 이미지 선택 영역 */}
        <TouchableOpacity style={styles.imageSelector} onPress={selectImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.selectedImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="add-a-photo" size={50} color="#666" />
              <Text style={styles.imagePlaceholderText}>작품 이미지 선택</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 작품 정보 입력 */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>작품 제목 *</Text>
            <TextInput
              style={styles.input}
              value={artwork.title}
              onChangeText={(text) => setArtwork({...artwork, title: text})}
              placeholder="작품 제목을 입력하세요"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>카테고리 *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      artwork.category === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() => setArtwork({...artwork, category: cat})}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        artwork.category === cat && styles.categoryTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>작품 설명</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={artwork.description}
              onChangeText={(text) => setArtwork({...artwork, description: text})}
              placeholder="작품에 대한 설명을 입력하세요"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>재료/기법</Text>
            <TextInput
              style={styles.input}
              value={artwork.medium}
              onChangeText={(text) => setArtwork({...artwork, medium: text})}
              placeholder="예: 캔버스에 유화, 종이에 연필"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>크기</Text>
              <TextInput
                style={styles.input}
                value={artwork.size}
                onChangeText={(text) => setArtwork({...artwork, size: text})}
                placeholder="예: 50x70cm"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>제작년도</Text>
              <TextInput
                style={styles.input}
                value={artwork.year}
                onChangeText={(text) => setArtwork({...artwork, year: text})}
                placeholder="예: 2024"
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>판매 설정</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[
                  styles.saleButton,
                  artwork.isForSale && styles.saleButtonActive,
                ]}
                onPress={() => setArtwork({...artwork, isForSale: true})}
              >
                <Text
                  style={[
                    styles.saleButtonText,
                    artwork.isForSale && styles.saleButtonTextActive,
                  ]}
                >
                  판매중
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saleButton,
                  !artwork.isForSale && styles.saleButtonActive,
                ]}
                onPress={() => setArtwork({...artwork, isForSale: false})}
              >
                <Text
                  style={[
                    styles.saleButtonText,
                    !artwork.isForSale && styles.saleButtonTextActive,
                  ]}
                >
                  비매품
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {artwork.isForSale && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>가격 (원)</Text>
              <TextInput
                style={styles.input}
                value={artwork.price}
                onChangeText={(text) => setArtwork({...artwork, price: formatPrice(text)})}
                placeholder="판매 가격을 입력하세요"
                keyboardType="numeric"
              />
            </View>
          )}
        </View>

        {/* 업로드 버튼 */}
        <TouchableOpacity
          style={[styles.uploadButton, loading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.uploadButtonText}>작품 업로드</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageSelector: {
    height: 300,
    margin: 20,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  categoryButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 15,
  },
  halfWidth: {
    flex: 1,
  },
  saleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  saleButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  saleButtonText: {
    fontSize: 14,
    color: '#666',
  },
  saleButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#4A90E2',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ArtworkUploadScreen;