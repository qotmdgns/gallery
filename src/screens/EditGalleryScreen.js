// src/screens/EditGalleryScreen.js - 백 버튼 처리 추가
import React, { useState, useEffect, useLayoutEffect } from 'react';
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
  BackHandler,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import useLoginStore from '../store/useLoginStore';

const EditGalleryScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { docId } = route.params;
  
  const isLogined = useLoginStore((state) => state.isLogined);

  // 수정할 필드 상태관리
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [createdDate, setCreatedDate] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // 원본 데이터 저장 (변경사항 확인용)
  const [originalData, setOriginalData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // 문서 로드
  useEffect(() => {
    fetchData();
  }, []);

  // 변경사항 감지
  useEffect(() => {
    const currentData = { title, artist, createdDate, category, description };
    const isChanged = 
      JSON.stringify(currentData) !== JSON.stringify(originalData) || 
      newImage !== null;
    setHasChanges(isChanged);
  }, [title, artist, createdDate, category, description, newImage, originalData]);

  // Android 백 버튼 처리
  useEffect(() => {
     const backAction = () => {
    if (hasChanges) {
      Alert.alert('작성 취소',
          '작성 중인 내용이 있습니다. 정말 나가시겠습니까?',
          [
            { text: '계속 작성', style: 'cancel' },
            { text: '나가기', onPress: () => navigation.goBack() },
          ]);
      return true;
    }
    return false;
  };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [hasChanges]);

  // 헤더 백 버튼 커스터마이징
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleBackPress}
          style={{ marginLeft: 15 }}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, hasChanges]);

  const handleBackPress = () => {
    if (hasChanges) {
      Alert.alert(
        '변경사항 저장',
        '저장하지 않은 변경사항이 있습니다.',
        [
          { text: '계속 편집', style: 'cancel' },
          { 
            text: '저장 안함', 
            style: 'destructive',
            onPress: () => navigation.goBack() 
          },
          { 
            text: '저장', 
            onPress: () => handleSubmit() 
          },
        ],
        { cancelable: true }
      );
    } else {
      navigation.goBack();
    }
  };

  const fetchData = async () => {
    try {
      const doc = await firestore().collection('galleries').doc(docId).get();
      
      if (!doc.exists) {
        Alert.alert('오류', '해당 갤러리 항목을 찾을 수 없습니다.');
        navigation.goBack();
        return;
      }

      const data = doc.data();
      setTitle(data.title || '');
      setArtist(data.artist || '');
      setCreatedDate(data.createdDate || '');
      setCategory(data.category || '');
      setDescription(data.description || '');
      setPhotoURL(data.photoURL || '');
      
      // 원본 데이터 저장
      setOriginalData({
        title: data.title || '',
        artist: data.artist || '',
        createdDate: data.createdDate || '',
        category: data.category || '',
        description: data.description || '',
      });
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      Alert.alert('오류', '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isLogined) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }

    if (!newImage && !photoURL) {
      Alert.alert('알림', '이미지를 선택해주세요.');
      return;
    }

    setIsUploading(true);

    try {
      let downloadURL = photoURL;
      
      // 새 이미지가 있으면 업로드
      if (newImage) {
        const timestamp = Date.now();
        const currentUser = auth().currentUser;
        if (!currentUser) {
          throw new Error('User not authenticated');
        }
        const fileName = `galleries/${currentUser.uid}/${timestamp}-${newImage.fileName}`;
        const reference = storage().ref(fileName);
        
        await reference.putFile(newImage.uri);
        downloadURL = await reference.getDownloadURL();
      }

      // Firestore 문서 업데이트
      await firestore().collection('galleries').doc(docId).update({
        title,
        artist,
        createdDate,
        category,
        description,
        photoURL: downloadURL,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // 원본 데이터 업데이트 (저장 후 변경사항 없음으로 표시)
      setOriginalData({ title, artist, createdDate, category, description });
      setNewImage(null);
      setHasChanges(false);

      Alert.alert(
        '성공', 
        '갤러리 항목이 수정되었습니다.',
        [{ text: '확인', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('수정 오류:', error);
      Alert.alert('오류', '수정 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // 나머지 컴포넌트 코드는 동일...
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 기존 UI 코드 */}
    </KeyboardAvoidingView>
  );
};

// 프로필 수정 화면 예시
const ProfileEditScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [originalData, setOriginalData] = useState({});
  
  const hasChanges = 
    name !== originalData.name || 
    email !== originalData.email || 
    phone !== originalData.phone;

  useEffect(() => {
    // 프로필 데이터 로드
    loadProfileData();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (hasChanges) {
        Alert.alert(
          '프로필 수정',
          '변경사항을 저장하시겠습니까?',
          [
            { text: '취소', style: 'cancel' },
            { text: '저장 안함', onPress: () => navigation.goBack() },
            { text: '저장', onPress: saveProfile },
          ]
        );
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [hasChanges]);

  const loadProfileData = async () => {
    // 프로필 데이터 로드 로직
    const userData = { name: 'John', email: 'john@email.com', phone: '010-1234-5678' };
    setName(userData.name);
    setEmail(userData.email);
    setPhone(userData.phone);
    setOriginalData(userData);
  };

  const saveProfile = async () => {
    // 프로필 저장 로직
    try {
      // API 호출 또는 Firestore 업데이트
      Alert.alert('성공', '프로필이 저장되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('오류', '저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="이름"
      />
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="이메일"
      />
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="전화번호"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  // 나머지 스타일...
});

export default EditGalleryScreen;
