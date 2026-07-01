// src/screens/GalleryRegisterScreen.js - 사용자 정보 연동 버전
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import { launchImageLibrary } from 'react-native-image-picker';
import useLoginStore from '../store/useLoginStore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import TextInput from '../components/KoreanTextInput';

const GalleryRegisterScreen = ({ navigation }) => {
  const isLoggedIn = useLoginStore((state) => state.isLoggedIn);
  const currentUser = auth().currentUser;
  const [userData, setUserData] = useState(null);

  // 폼 상태 관리
  const [galleryName, setGalleryName] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
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
  const [imageFiles, setImageFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    checkUserPermission();
  }, []);

  const checkUserPermission = async () => {
    if (!currentUser) {
      Alert.alert(
        '로그인 필요',
        '갤러리 등록은 로그인 후 이용 가능합니다.',
        [{ text: '확인', onPress: () => navigation.goBack() }]
      );
      return;
    }

    try {
      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        setUserData(userData);
        
        if (userData.userType !== 'owner') {
          Alert.alert(
            '권한 없음',
            '갤러리 등록은 갤러리 운영자만 가능합니다.',
            [{ text: '확인', onPress: () => navigation.goBack() }]
          );
        }
      } else {
        // 사용자 문서가 없는 경우 기본값 설정
        console.warn('사용자 문서를 찾을 수 없습니다:', currentUser.uid);
        setUserData({
          displayName: currentUser.displayName || '사용자',
          userType: 'user'
        });
      }
    } catch (error) {
      console.error('사용자 정보 확인 오류:', error);
      // 오류 발생 시에도 기본값 설정
      setUserData({
        displayName: currentUser.displayName || '사용자',
        userType: 'user'
      });
    }
  };

  // 폼 초기화
  const handleReset = () => {
    console.log('초기화 버튼 클릭됨');

    Alert.alert(
      '초기화',
      '입력한 내용을 모두 지우시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: () => {
            setGalleryName('');
            setLocation('');
            setAddress('');
            setPrice('');
            setArea('');
            setDescription('');
            setOperatingHours({
              weekday: '10:00-19:00',
              weekend: '11:00-18:00',
            });
            setFacilities({
              parking: false,
              elevator: false,
              restroom: false,
              airConditioner: false,
              heating: false,
              wifi: false,
            });
            setImageFiles([]);
          },
        },
      ]
    );
  };

  // 이미지 선택
  const selectImages = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
      selectionLimit: 10 - imageFiles.length,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets) {
        const newImages = response.assets.map(asset => ({
          uri: asset.uri,
          fileName: asset.fileName || `image-${Date.now()}.jpg`,
          fileSize: asset.fileSize,
        }));

        const validImages = newImages.filter(image => {
          if (image.fileSize > 5 * 1024 * 1024) {
            Alert.alert('알림', `파일이 5MB를 초과합니다.`);
            return false;
          }
          return true;
        });

        setImageFiles([...imageFiles, ...validImages]);
      }
    });
  };

  // 이미지 제거
  const removeImage = (index) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    setImageFiles(newFiles);
  };

  // 이미지 업로드
  const uploadImages = async () => {
    const uploadPromises = imageFiles.map(async (file, index) => {
      const timestamp = Date.now();
      const fileName = `galleries/${currentUser.uid}/${timestamp}-${index}-${file.fileName}`;
      const reference = storage().ref(fileName);
      await reference.putFile(file.uri);
      const downloadURL = await reference.getDownloadURL();
      return downloadURL;
    });

    return Promise.all(uploadPromises);
  };

  // 폼 제출
  const handleSubmit = async () => {
    console.log('갤러리 등록 버튼 클릭됨');

    // 유효성 검사
    if (!isLoggedIn || !currentUser) {
      Alert.alert('알림', '로그인 후에만 갤러리 정보를 저장할 수 있습니다.');
      return;
    }

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

    if (imageFiles.length === 0) {
      Alert.alert('알림', '최소 1개 이상의 이미지를 업로드해주세요.');
      return;
    }

    setIsUploading(true);

    try {
      // 이미지 업로드
      const imageUrls = await uploadImages();

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

      // Firestore에 저장
      const galleryData = {
        ownerId: currentUser.uid,
        ownerName: userData?.displayName || currentUser.displayName,
        name: galleryName,  // 'galleryName' 대신 'name' 사용
        galleryName,  // 호환성을 위해 두 필드 모두 저장
        location,
        address,
        phoneNumber: phoneNumber || null,
        price: Number(price),
        area: area ? Number(area) : null,
        description,
        imageUrls,
        facilities: selectedFacilities,
        operatingHours,
        status: 'active',
        isVerified: false,
        viewCount: 0,
        likeCount: 0,
        rating: 0,
        reviewCount: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await firestore().collection('galleries').add(galleryData);

      // 갤러리 운영자 정보 업데이트 (문서가 없으면 생성)
      try {
        const ownerRef = firestore().collection('gallery_owners').doc(currentUser.uid);
        const ownerDoc = await ownerRef.get();
        
        if (ownerDoc.exists) {
          await ownerRef.update({
            galleryCount: firestore.FieldValue.increment(1),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        } else {
          await ownerRef.set({
            userId: currentUser.uid,
            userName: userData?.displayName || currentUser.displayName || '사용자',
            galleryCount: 1,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        }
      } catch (ownerError) {
        // gallery_owners 업데이트 실패해도 갤러리는 등록됨
        console.error('갤러리 운영자 정보 업데이트 오류:', ownerError);
      }

      Alert.alert(
        '등록 완료',
        '갤러리가 성공적으로 등록되었습니다.',
        [
          {
            text: '확인',
            onPress: () => {
              // 이전 화면으로 돌아가기
              navigation.goBack();
            },
          },
        ]
      );

      // handleReset() 제거 - 등록 후 초기화하지 않음
    } catch (error) {
      console.error('저장 중 오류:', error);
      Alert.alert('오류', '저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>갤러리 정보 등록</Text>
        {userData?.isVerified && (
          <View style={styles.verifiedBadge}>
            <Icon name="verified" size={16} color="#4CAF50" />
            <Text style={styles.verifiedText}>인증된 갤러리 운영자</Text>
          </View>
        )}

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
                placeholder="예) 아트스페이스 강남"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>지역 *</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="예) 서울시 강남구"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
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
                autoCapitalize="none"
                autoCorrect={false}
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
                returnKeyType="next"
              />
            </View>
          </View>

          {/* 가격 및 규모 섹션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>가격 및 규모</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>1주 대관료 (원) *</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="예) 500000"
                placeholderTextColor="#999"
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>전시 공간 면적 (㎡)</Text>
              <TextInput
                style={styles.input}
                value={area}
                onChangeText={setArea}
                placeholder="예) 120"
                placeholderTextColor="#999"
                keyboardType="numeric"
                returnKeyType="next"
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
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* 이미지 섹션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>갤러리 이미지 *</Text>
            <Text style={styles.sectionSubtitle}>
              최대 10개, 각 5MB 이하 (첫 번째 이미지가 대표 이미지로 사용됩니다)
            </Text>
            
            <TouchableOpacity 
              style={styles.imageButton} 
              onPress={selectImages}
              disabled={imageFiles.length >= 10}
            >
              <Icon name="add-photo-alternate" size={24} color="#4B7BFF" />
              <Text style={styles.imageButtonText}>
                이미지 선택 ({imageFiles.length}/10)
              </Text>
            </TouchableOpacity>

            {imageFiles.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.imagePreviewContainer}
              >
                {imageFiles.map((image, index) => (
                  <View key={index} style={styles.imagePreviewWrapper}>
                    <Image 
                      source={{ uri: image.uri }} 
                      style={styles.imagePreview}
                    />
                    {index === 0 && (
                      <View style={styles.mainImageBadge}>
                        <Text style={styles.mainImageText}>대표</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Icon name="close" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* 버튼 영역 */}
          <View style={{ padding: 20 }}>
            {/* 갤러리 등록 버튼 */}
            <Pressable
              style={({ pressed }) => [
                {
                  backgroundColor: isUploading ? '#ccc' : (pressed ? '#3A6AC8' : '#4B7BFF'),
                  paddingVertical: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.8 : 1,
                }
              ]}
              onPress={() => {
                console.log('=== 갤러리 등록 버튼 Pressed ===');
                if (!isUploading) {
                  console.log('handleSubmit 함수 호출');
                  handleSubmit();
                } else {
                  console.log('업로드 중이므로 실행하지 않음');
                }
              }}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="check" size={20} color="white" />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>
                    갤러리 등록
                  </Text>
                </View>
              )}
            </Pressable>

            {/* 간격 */}
            <View style={{ height: 12 }} />

            {/* 초기화 버튼 */}
            <Pressable
              style={({ pressed }) => [
                {
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: pressed ? '#999' : '#ddd',
                  paddingVertical: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                }
              ]}
              onPress={() => {
                console.log('=== 초기화 버튼 Pressed ===');
                if (!isUploading) {
                  console.log('handleReset 함수 호출');
                  handleReset();
                } else {
                  console.log('업로드 중이므로 실행하지 않음');
                }
              }}
              disabled={isUploading}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="refresh" size={20} color="#666" />
                <Text style={{ color: '#666', fontSize: 16, marginLeft: 8 }}>
                  초기화
                </Text>
              </View>
            </Pressable>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 5,
  },
  verifiedText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  form: {
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#000',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  facilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    gap: 5,
  },
  facilityItemActive: {
    borderColor: '#4B7BFF',
    backgroundColor: '#f0f7ff',
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
    borderWidth: 2,
    borderColor: '#4B7BFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    gap: 10,
  },
  imageButtonText: {
    fontSize: 16,
    color: '#4B7BFF',
  },
  imagePreviewContainer: {
    marginTop: 15,
  },
  imagePreviewWrapper: {
    marginRight: 10,
    position: 'relative',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  mainImageBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#4B7BFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  mainImageText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonWrapper: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#4B7BFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resetButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  resetButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#666',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default GalleryRegisterScreen;
