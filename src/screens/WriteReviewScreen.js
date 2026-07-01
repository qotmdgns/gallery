// src/screens/WriteReviewScreen.js
import React, { useState, useLayoutEffect } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import { launchImageLibrary } from 'react-native-image-picker';
import FirebaseService from '../services/FirebaseService';
import { handleError } from '../utils/errorHandler';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, CONFIRM_MESSAGES } from '../constants/errorMessages';

const WriteReviewScreen = ({ route, navigation }) => {
  const { galleryId, galleryName } = route.params;
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const currentUser = auth().currentUser;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '리뷰 작성',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            if (reviewText.trim() || images.length > 0) {
              Alert.alert(
                CONFIRM_MESSAGES.LEAVE.TITLE,
                CONFIRM_MESSAGES.LEAVE.REVIEW,
                [
                  { text: '계속 작성', style: 'cancel' },
                  { text: '나가기', onPress: () => navigation.goBack() },
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
          style={{ marginLeft: 15 }}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, reviewText, images]);

  const handleStarPress = (selectedRating) => {
    setRating(selectedRating);
  };

  const selectImages = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
      selectionLimit: 3 - images.length,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets) {
        const newImages = response.assets.map(asset => ({
          uri: asset.uri,
          fileName: asset.fileName || `review-${Date.now()}.jpg`,
        }));
        setImages([...images, ...newImages]);
      }
    });
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const uploadImages = async () => {
    const uploadPromises = images.map(async (image, index) => {
      const timestamp = Date.now();
      const fileName = `reviews/${galleryId}/${currentUser.uid}/${timestamp}-${index}.jpg`;
      const reference = storage().ref(fileName);
      
      await reference.putFile(image.uri);
      const downloadURL = await reference.getDownloadURL();
      return downloadURL;
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async () => {
    if (!reviewText.trim()) {
      Alert.alert('알림', ERROR_MESSAGES.REVIEW.EMPTY_CONTENT);
      return;
    }

    setUploading(true);

    try {
      let imageUrls = [];
      
      if (images.length > 0) {
        imageUrls = await uploadImages();
      }

      const firebaseService = new FirebaseService();
      await firebaseService.createReview({
        galleryId: galleryId,
        galleryName: galleryName,
        userId: currentUser.uid,
        userName: currentUser.displayName || '사용자',
        rating: rating,
        text: reviewText.trim(),
        imageUrls: imageUrls,
      });

      Alert.alert(
        '리뷰 작성 완료',
        SUCCESS_MESSAGES.REVIEW.CREATED,
        [
          {
            text: '확인',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      handleError(error, {
        screen: 'WriteReviewScreen',
        action: 'createReview',
        galleryId: galleryId
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.galleryName}>{galleryName}</Text>
        
        {/* 별점 선택 */}
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>평점을 선택해주세요</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleStarPress(star)}
                style={styles.starButton}
              >
                <Icon
                  name="star"
                  size={40}
                  color={star <= rating ? '#FFD700' : '#e0e0e0'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingText}>
            {rating === 5 && '아주 좋아요!'}
            {rating === 4 && '좋아요'}
            {rating === 3 && '보통이에요'}
            {rating === 2 && '별로예요'}
            {rating === 1 && '나빴어요'}
          </Text>
        </View>

        {/* 리뷰 작성 */}
        <View style={styles.reviewSection}>
          <Text style={styles.sectionTitle}>리뷰를 작성해주세요</Text>
          <TextInput
            style={styles.textArea}
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="갤러리 이용 경험을 자세히 들려주세요. 다른 사용자들에게 도움이 됩니다."
            placeholderTextColor="#999"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{reviewText.length} / 500</Text>
        </View>

        {/* 사진 첨부 */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>사진 첨부 (선택)</Text>
          <View style={styles.imageContainer}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: image.uri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(index)}
                >
                  <Icon name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            
            {images.length < 3 && (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={selectImages}
              >
                <Icon name="add-photo-alternate" size={32} color="#666" />
                <Text style={styles.addImageText}>
                  사진 추가 ({images.length}/3)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* 제출 버튼 */}
      <TouchableOpacity
        style={[styles.submitButton, uploading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.submitButtonText}>리뷰 작성 완료</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 20,
    borderRadius: 10,
  },
  galleryName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  starButton: {
    padding: 5,
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  reviewSection: {
    marginBottom: 30,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 150,
    backgroundColor: '#f9f9f9',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  imageSection: {
    marginBottom: 20,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  addImageText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default WriteReviewScreen;