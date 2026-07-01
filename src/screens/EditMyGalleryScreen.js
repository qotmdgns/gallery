// src/screens/EditMyGalleryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

const EditMyGalleryScreen = ({ navigation, route }) => {
  const { docId } = route.params;
  const currentUser = auth().currentUser;
  
  // 폼 상태 관리
  const [galleryName, setGalleryName] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [operatingHours, setOperatingHours] = useState({
    weekday: '10:00-19:00',
    weekend: '11:00-18:00',
  });
  const [facilities, setFacilities] = useState({
    parking: false,
    elevator: false,
    restroom: false,
    airConditioner: false,
    heating: false,
    wifi: false,
  });
  const [existingImages, setExistingImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [deletedImages, setDeletedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGalleryData();
  }, []);

  const fetchGalleryData = async () => {
    try {
      const doc = await firestore().collection('galleries').doc(docId).get();
      
      if (!doc.exists) {
        Alert.alert('오류', '갤러리 정보를 찾을 수 없습니다.');
        navigation.goBack();
        return;
      }

      const data = doc.data();
      
      // 소유자 확인
      if (data.ownerId !== currentUser.uid) {
        Alert.alert('권한 없음', '해당 갤러리를 수정할 권한이 없습니다.');
        navigation.goBack();
        return;
      }

      // 데이터 설정
      setGalleryName(data.galleryName || data.name || '');
      setLocation(data.location || '');
      setAddress(data.address || '');
      setPhoneNumber(data.phoneNumber || '');
      setPrice(data.price?.toString() || '');
      setArea(data.area?.toString() || '');
      setDescription(data.description || '');
      setExistingImages(data.imageUrls || []);
      
      if (data.operatingHours) {
        setOperatingHours(data.operatingHours);
      }
      
      // 편의시설 설정
      if (data.facilities && Array.isArray(data.facilities)) {
        const facilityMap = {
          '주차장': 'parking',
          '엘리베이터': 'elevator',
          '화장실': 'restroom',
          '에어컨': 'airConditioner',
          '난방': 'heating',
          'Wi-Fi': 'wifi',
        };
        
        const newFacilities = { ...facilities };
        data.facilities.forEach(facility => {
          const key = facilityMap[facility];
          if (key) newFacilities[key] = true;
        });
        setFacilities(newFacilities);
      }
    } catch (error) {
      console.error('갤러리 데이터 로드 오류:', error);
      Alert.alert('오류', '갤러리 정보를 불러오는 중 오류가 발생했습니다.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const selectImages = () => {
    const totalImages = existingImages.length + newImageFiles.length - deletedImages.length;
    
    if (totalImages >= 10) {
      Alert.alert('알림', '최대 10개까지만 업로드 가능합니다.');
      return;
    }

    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
      selectionLimit: 10 - totalImages,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets) {
        setNewImageFiles([...newImageFiles, ...response.assets]);
      }
    });
  };

  const removeExistingImage = (imageUrl) => {
    setDeletedImages([...deletedImages, imageUrl]);
  };

  const removeNewImage = (index) => {
    const updated = [...newImageFiles];
    updated.splice(index, 1);
    setNewImageFiles(updated);
  };

  const uploadNewImages = async () => {
    const uploadedUrls = [];
    
    for (const image of newImageFiles) {
      const filename = `galleries/${currentUser.uid}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const reference = storage().ref(filename);
      
      await reference.putFile(image.uri);
      const url = await reference.getDownloadURL();
      uploadedUrls.push(url);
    }
    
    return uploadedUrls;
  };

  const deleteImagesFromStorage = async () => {
    for (const imageUrl of deletedImages) {
      try {
        const reference = storage().refFromURL(imageUrl);
        await reference.delete();
      } catch (error) {
        console.error('이미지 삭제 실패:', error);
      }
    }
  };

  const handleSubmit = async () => {
    if (!galleryName || !location || !price) {
      Alert.alert('알림', '갤러리명, 위치, 가격은 반드시 입력해주세요.');
      return;
    }

    if (isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert('알림', '올바른 가격을 입력해주세요.');
      return;
    }

    if (area && (isNaN(Number(area)) || Number(area) <= 0)) {
      Alert.alert('알림', '올바른 면적을 입력해주세요.');
      return;
    }

    const remainingImages = existingImages.filter(img => !deletedImages.includes(img));
    const totalImages = remainingImages.length + newImageFiles.length;
    
    if (totalImages === 0) {
      Alert.alert('알림', '최소 1개 이상의 이미지를 업로드해주세요.');
      return;
    }

    setIsUploading(true);

    try {
      // 새 이미지 업로드
      const newImageUrls = await uploadNewImages();
      
      // 삭제된 이미지 스토리지에서 제거
      await deleteImagesFromStorage();
      
      // 최종 이미지 URL 배열
      const finalImageUrls = [...remainingImages, ...newImageUrls];

      // 선택된 편의시설 목록 생성
      const selectedFacilities = Object.entries(facilities)
        .filter(([_, value]) => value)
        .map(([key, _]) => {
          const facilityNames = {
            parking: '주차장',
            elevator: '엘리베이터',
            restroom: '화장실',
            airConditioner: '에어컨',
            heating: '난방',
            wifi: 'Wi-Fi',
          };
          return facilityNames[key];
        });

      // Firestore 업데이트
      const updateData = {
        name: galleryName,
        galleryName,
        location,
        address,
        phoneNumber: phoneNumber || null,
        price: Number(price),
        area: area ? Number(area) : null,
        description,
        imageUrls: finalImageUrls,
        facilities: selectedFacilities,
        operatingHours,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection('galleries').doc(docId).update(updateData);

      Alert.alert(
        '수정 완료',
        '갤러리 정보가 성공적으로 수정되었습니다.',
        [
          {
            text: '확인',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('갤러리 수정 오류:', error);
      Alert.alert('오류', '갤러리 수정 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>갤러리 정보를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* 기본 정보 섹션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>기본 정보</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>갤러리명 *</Text>
              <TextInput
                style={styles.input}
                value={galleryName}
                onChangeText={setGalleryName}
                placeholder="갤러리 이름을 입력해주세요"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>위치 *</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="예) 서울 강남구"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>상세 주소</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="예) 테헤란로 123 아트빌딩 2층"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>전화번호</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="예) 02-1234-5678 또는 010-1234-5678"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* 가격 및 규모 섹션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>가격 및 규모</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>대관료 (일) *</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="예) 500000"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>면적 (㎡)</Text>
              <TextInput
                style={styles.input}
                value={area}
                onChangeText={setArea}
                placeholder="예) 120"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* 운영 시간 섹션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>운영 시간</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>평일</Text>
              <TextInput
                style={styles.input}
                value={operatingHours.weekday}
                onChangeText={(text) => setOperatingHours({...operatingHours, weekday: text})}
                placeholder="예) 10:00-19:00"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>주말/공휴일</Text>
              <TextInput
                style={styles.input}
                value={operatingHours.weekend}
                onChangeText={(text) => setOperatingHours({...operatingHours, weekend: text})}
                placeholder="예) 11:00-18:00"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* 편의시설 섹션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>편의시설</Text>
            
            <View style={styles.facilitiesContainer}>
              {Object.entries(facilities).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.facilityItem, value && styles.facilityItemActive]}
                  onPress={() => setFacilities({...facilities, [key]: !value})}
                >
                  <Icon 
                    name={value ? "check-box" : "check-box-outline-blank"} 
                    size={20} 
                    color={value ? "#4B7BFF" : "#999"} 
                  />
                  <Text style={[styles.facilityText, value && styles.facilityTextActive]}>
                    {key === 'parking' && '주차장'}
                    {key === 'elevator' && '엘리베이터'}
                    {key === 'restroom' && '화장실'}
                    {key === 'airConditioner' && '에어컨'}
                    {key === 'heating' && '난방'}
                    {key === 'wifi' && 'Wi-Fi'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 설명 섹션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>갤러리 소개</Text>
            
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="갤러리의 특징, 시설, 주의사항 등을 자유롭게 작성해주세요"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* 이미지 섹션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>갤러리 이미지 *</Text>
            <Text style={styles.sectionSubtitle}>
              최대 10개, 각 5MB 이하 (첫 번째 이미지가 대표 이미지로 사용됩니다)
            </Text>
            
            {/* 기존 이미지 */}
            {existingImages.length > 0 && (
              <View>
                <Text style={styles.imageLabel}>현재 이미지</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.imagePreviewContainer}
                >
                  {existingImages.map((imageUrl, index) => {
                    if (deletedImages.includes(imageUrl)) return null;
                    
                    return (
                      <View key={index} style={styles.imagePreviewWrapper}>
                        <Image 
                          source={{ uri: imageUrl }} 
                          style={styles.imagePreview}
                        />
                        {index === 0 && !deletedImages.includes(imageUrl) && (
                          <View style={styles.mainImageBadge}>
                            <Text style={styles.mainImageText}>대표</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeExistingImage(imageUrl)}
                        >
                          <Icon name="close" size={16} color="white" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            
            {/* 새 이미지 추가 버튼 */}
            <TouchableOpacity 
              style={styles.imageButton} 
              onPress={selectImages}
              disabled={(existingImages.length - deletedImages.length + newImageFiles.length) >= 10}
            >
              <Icon name="add-photo-alternate" size={24} color="#4B7BFF" />
              <Text style={styles.imageButtonText}>
                이미지 추가 ({existingImages.length - deletedImages.length + newImageFiles.length}/10)
              </Text>
            </TouchableOpacity>

            {/* 새로 추가된 이미지 */}
            {newImageFiles.length > 0 && (
              <View>
                <Text style={styles.imageLabel}>새로 추가할 이미지</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.imagePreviewContainer}
                >
                  {newImageFiles.map((image, index) => (
                    <View key={index} style={styles.imagePreviewWrapper}>
                      <Image 
                        source={{ uri: image.uri }} 
                        style={styles.imagePreview}
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeNewImage(index)}
                      >
                        <Icon name="close" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* 버튼 영역 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.submitButton, 
                isUploading && styles.disabledButton
              ]}
              onPress={handleSubmit}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="check" size={20} color="white" />
                  <Text style={styles.submitButtonText}>수정 완료</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
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
  facilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    gap: 5,
  },
  facilityItemActive: {
    backgroundColor: '#E8F1FF',
    borderColor: '#4B7BFF',
  },
  facilityText: {
    fontSize: 14,
    color: '#666',
  },
  facilityTextActive: {
    color: '#4B7BFF',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 2,
    borderColor: '#4B7BFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    gap: 10,
  },
  imageButtonText: {
    fontSize: 16,
    color: '#4B7BFF',
  },
  imageLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    marginBottom: 10,
  },
  imagePreviewContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  imagePreviewWrapper: {
    marginRight: 10,
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  mainImageBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#4B7BFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mainImageText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#ccc',
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#4B7BFF',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default EditMyGalleryScreen;
