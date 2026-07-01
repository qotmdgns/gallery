// src/screens/GallerySearchScreen.js - 영상 기반 AI 검색 구현
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import GeminiService from '../services/GeminiService';
import KoreanTextInput from '../components/KoreanTextInput';

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2;

const GallerySearchScreen = ({ navigation }) => {
  const [galleries, setGalleries] = useState([]);
  const [filteredGalleries, setFilteredGalleries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('galleryName');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [loading, setLoading] = useState(true);
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const messageIdCounter = useRef(0);

  // Enhanced AI search states
  const [chatStep, setChatStep] = useState('START');
  const [selectedKeywords, setSelectedKeywords] = useState({});
  const [dynamicOptions, setDynamicOptions] = useState({
    atmospheres: [
      '깔끔한 분위기', '현대적인 분위기', '실험적인 분위기',
      '아방가르드한 분위기', '미니멀리즘한 분위기',
      '복고풍 분위기', '레트로한 분위기', '모던한 분위기',
      '전통적인 분위기', '아티스트 친화적 분위기',
      '친화적인 분위기', '세련된 분위기', '전문적인 분위기',
      '정돈된 분위기', '클래식한 분위기', '회화적인 분위기',
      '개방적인 분위기', '예술적인 분위기',
    ],
    mainLocations: ['서울', '경기', '부산'],
    detailLocations: {
      '경기': ['성남시', '오산시', '용인시', '화성시'],
      '서울': ['강남구', '서초구', '종로구', '마포구'],
      '부산': ['해운대구', '중구', '동구', '서구'],
    },
    priceRanges: [
      '5만원 이하',
      '5만원 이상 ~ 15만원 이하',
      '15만원 이상 ~ 30만원 이하',
      '30만원 이상',
    ],
  });
  const chatScrollRef = useRef(null);

  // 고유한 메시지 ID 생성 함수
  const generateMessageId = () => {
    messageIdCounter.current += 1;
    return `msg-${Date.now()}-${messageIdCounter.current}`;
  };

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) {
      return;
    }
    fetchGalleries();
    initializeAIChat();
  }, []);

  const initializeAIChat = async () => {
    try {
      await GeminiService.initializeChat();
      messageIdCounter.current = 0; // 카운터 초기화
      setChatMessages([{
        id: generateMessageId(),
        text: '안녕하세요! 원하시는 갤러리 조건을 말씀해주세요. 😊',
        sender: 'ai',
        timestamp: new Date(),
        buttons: ['분위기', '지역', '가격대 검색'],
        isGalleryList: false,
      }]);
      setChatStep('START');
      setSelectedKeywords({});
    } catch (error) {
      console.error('AI 챗봇 초기화 오류:', error);
      if (error.message === 'API_KEY_NOT_SET') {
        Alert.alert(
          'API 키 설정 필요',
          '.env 파일에 GEMINI_API_KEY를 설정해주세요.\n\nhttps://makersuite.google.com/app/apikey 에서 API 키를 발급받으세요.',
          [{ text: '확인' }]
        );
      }
    }
  };

  const handleAIButtonPress = () => {
    setShowAIChat(true);
  };

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      const querySnapshot = await firestore().collection('galleries').get();
      const galleryData = [];

      querySnapshot.forEach((doc) => {
        galleryData.push({ id: doc.id, ...doc.data() });
      });

      setGalleries(galleryData);
      setFilteredGalleries(galleryData);
    } catch (error) {
      console.error('갤러리 불러오기 오류:', error);
      Alert.alert('오류', '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    let results = [...galleries];

    if (searchTerm) {
      results = results.filter((gallery) => {
        const searchValue = gallery[searchType]?.toString().toLowerCase() || '';
        return searchValue.includes(searchTerm.toLowerCase());
      });
    }

    if (priceRange.min || priceRange.max) {
      results = results.filter((gallery) => {
        const price = gallery.price || 0;
        const minPrice = priceRange.min ? parseInt(priceRange.min) : 0;
        const maxPrice = priceRange.max ? parseInt(priceRange.max) : Infinity;
        return price >= minPrice && price <= maxPrice;
      });
    }

    setFilteredGalleries(results);
  };

  const handleReset = () => {
    setSearchTerm('');
    setPriceRange({ min: '', max: '' });
    setFilteredGalleries(galleries);
  };

  const filterGalleriesByKeywords = (keywords) => {
    let results = [...galleries];

    if (keywords.location) {
      const locationLower = keywords.location.toLowerCase();
      results = results.filter(g =>
        g.location?.toLowerCase().includes(locationLower)
      );
    }

    if (keywords.detailLocation) {
      const detailLower = keywords.detailLocation.toLowerCase();
      results = results.filter(g =>
        g.location?.toLowerCase().includes(detailLower)
      );
    }

    if (keywords.atmosphere) {
      const atmosphereLower = keywords.atmosphere.toLowerCase();
      results = results.filter(g =>
        g.description?.toLowerCase().includes(atmosphereLower) ||
        g.category?.toLowerCase().includes(atmosphereLower)
      );
    }

    if (keywords.priceRange) {
      results = results.filter(g => {
        const price = g.price || 0;

        if (keywords.priceRange.includes('이하')) {
          const match = keywords.priceRange.match(/(\d+)/);
          if (match) {
            const maxPrice = parseInt(match[1]) * 10000;
            return price <= maxPrice;
          }
        } else if (keywords.priceRange.includes('~')) {
          const parts = keywords.priceRange.split('~');
          const minMatch = parts[0].match(/(\d+)/);
          const maxMatch = parts[1].match(/(\d+)/);
          if (minMatch && maxMatch) {
            const minPrice = parseInt(minMatch[1]) * 10000;
            const maxPrice = parseInt(maxMatch[1]) * 10000;
            return price >= minPrice && price <= maxPrice;
          }
        } else if (keywords.priceRange.includes('이상')) {
          const match = keywords.priceRange.match(/(\d+)/);
          if (match) {
            const minPrice = parseInt(match[1]) * 10000;
            return price >= minPrice;
          }
        }
        return true;
      });
    }

    return results;
  };

  const addChatMessage = (message) => {
    setChatMessages(prev => [...prev, message]);
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleButtonPress = async (button) => {
    const userMessage = {
      id: generateMessageId(),
      text: button,
      sender: 'user',
      timestamp: new Date(),
      isGalleryList: false,
    };
    addChatMessage(userMessage);

    if (button === '새로운 조건으로 찾아보기' || button === '전체 조건 초기화') {
      setSelectedKeywords({});
      setChatStep('START');
      addChatMessage({
        id: generateMessageId(),
        text: '알겠습니다! 처음부터 다시 시작하겠습니다. 😊\n\n어떤 조건으로 찾으시나요?',
        sender: 'ai',
        timestamp: new Date(),
        buttons: ['분위기', '지역', '가격대 검색'],
        isGalleryList: false,
      });
      return;
    }

    if (button.includes('조건 초기화')) {
      handleResetCondition(button);
      return;
    }

    await processButtonSelection(button);
  };

  const handleResetCondition = (resetButton) => {
    const newKeywords = { ...selectedKeywords };

    if (resetButton.includes('분위기')) {
      delete newKeywords.atmosphere;
    } else if (resetButton.includes('지역')) {
      delete newKeywords.location;
      delete newKeywords.detailLocation;
    } else if (resetButton.includes('가격')) {
      delete newKeywords.priceRange;
    }

    setSelectedKeywords(newKeywords);

    const filtered = filterGalleriesByKeywords(newKeywords);
    const conditionText = Object.values(newKeywords).filter(v => v).join(', ');

    addChatMessage({
      id: generateMessageId(),
      text: `${resetButton}를 완료했습니다.\n현재 조건: ${conditionText || '없음'}`,
      sender: 'ai',
      timestamp: new Date(),
      isGalleryList: false,
    });

    if (filtered.length > 0) {
      addChatMessage({
        id: generateMessageId(),
        text: `${filtered.length}개의 갤러리를 찾았습니다!`,
        sender: 'ai',
        timestamp: new Date(),
        galleries: filtered.slice(0, 10),
        isGalleryList: true,
      });
    }

    const resetButtons = getResetButtons(newKeywords);
    addChatMessage({
      id: generateMessageId(),
      text: '다른 조건을 추가하거나 새로 검색하시겠어요?',
      sender: 'ai',
      timestamp: new Date(),
      buttons: ['새로운 조건으로 찾아보기'],
      resetButtons: resetButtons,
      isGalleryList: false,
    });
  };

  const getResetButtons = (keywords) => {
    const buttons = [];
    if (keywords.atmosphere) buttons.push('분위기 조건 초기화');
    if (keywords.location || keywords.detailLocation) buttons.push('지역 조건 초기화');
    if (keywords.priceRange) buttons.push('가격 조건 초기화');
    if (buttons.length > 0) buttons.push('전체 조건 초기화');
    return buttons;
  };

  const processButtonSelection = async (button) => {
    const newKeywords = { ...selectedKeywords };

    // 메인 카테고리
    if (button === '분위기') {
      setChatStep('ASK_ATMOSPHERE');
      addChatMessage({
        id: generateMessageId(),
        text: '원하시는 분위기를 선택해주세요!',
        sender: 'ai',
        timestamp: new Date(),
        buttons: dynamicOptions.atmospheres,
        isGalleryList: false,
      });
      return;
    }

    if (button === '지역') {
      setChatStep('ASK_LOCATION');
      addChatMessage({
        id: generateMessageId(),
        text: '원하는 지역을 선택해주세요!',
        sender: 'ai',
        timestamp: new Date(),
        buttons: dynamicOptions.mainLocations,
        isGalleryList: false,
      });
      return;
    }

    if (button === '가격대 검색') {
      setChatStep('ASK_PRICE');
      addChatMessage({
        id: generateMessageId(),
        text: '원하시는 가격대를 선택해주세요.',
        sender: 'ai',
        timestamp: new Date(),
        buttons: dynamicOptions.priceRanges,
        isGalleryList: false,
      });
      return;
    }

    // 분위기 선택
    if (chatStep === 'ASK_ATMOSPHERE' && dynamicOptions.atmospheres.includes(button)) {
      newKeywords.atmosphere = button;
      setSelectedKeywords(newKeywords);
      await showSearchResults(newKeywords);
      return;
    }

    // 메인 지역 선택
    if (chatStep === 'ASK_LOCATION' && dynamicOptions.mainLocations.includes(button)) {
      newKeywords.location = button;
      setSelectedKeywords(newKeywords);

      // 경기 선택 시 상세 지역 물어보기
      if (dynamicOptions.detailLocations[button]) {
        setChatStep('ASK_DETAIL_LOCATION');
        addChatMessage({
          id: generateMessageId(),
          text: `**${button}** 지역에서 **상세한 구/동 단위**를 선택해주시겠어요?`,
          sender: 'ai',
          timestamp: new Date(),
          buttons: dynamicOptions.detailLocations[button],
          isGalleryList: false,
        });
        return;
      }

      await showSearchResults(newKeywords);
      return;
    }

    // 상세 지역 선택
    if (chatStep === 'ASK_DETAIL_LOCATION') {
      const mainLocation = newKeywords.location;
      const detailLocations = dynamicOptions.detailLocations[mainLocation] || [];

      if (detailLocations.includes(button)) {
        newKeywords.detailLocation = button;
        setSelectedKeywords(newKeywords);
        await showSearchResults(newKeywords);
        return;
      }
    }

    // 가격대 선택
    if (chatStep === 'ASK_PRICE' && dynamicOptions.priceRanges.includes(button)) {
      newKeywords.priceRange = button;
      setSelectedKeywords(newKeywords);
      await showSearchResults(newKeywords);
      return;
    }
  };

  const showSearchResults = async (keywords) => {
    const filtered = filterGalleriesByKeywords(keywords);

    const conditionParts = [];
    if (keywords.atmosphere) conditionParts.push(keywords.atmosphere + '의');
    if (keywords.location) conditionParts.push(keywords.location);
    if (keywords.detailLocation) conditionParts.push(keywords.detailLocation);
    conditionParts.push('지역');
    if (keywords.priceRange) conditionParts.push(keywords.priceRange + ' 가격대');

    const conditionText = conditionParts.join(' ');

    if (filtered.length === 0) {
      const resetButtons = getResetButtons(keywords);
      addChatMessage({
        id: generateMessageId(),
        text: '죄송합니다. 조건에 맞는 갤러리를 찾지 못했습니다. 😢\n조건을 수정해보시겠어요?',
        sender: 'ai',
        timestamp: new Date(),
        buttons: ['새로운 조건으로 찾아보기'],
        resetButtons: resetButtons,
        isGalleryList: false,
      });
      return;
    }

    addChatMessage({
      id: generateMessageId(),
      text: `${conditionText}의 갤러리를 찾아봤어요. 목록을 확인해보세요!`,
      sender: 'ai',
      timestamp: new Date(),
      galleries: filtered.slice(0, 10),
      isGalleryList: true,
    });

    addChatMessage({
      id: generateMessageId(),
      text: '검색이 완료되었습니다.',
      sender: 'ai',
      timestamp: new Date(),
      isGalleryList: false,
    });

    const resetButtons = getResetButtons(keywords);
    const missingConditions = [];
    if (!keywords.atmosphere) missingConditions.push('분위기');
    if (!keywords.location) missingConditions.push('지역');
    if (!keywords.priceRange) missingConditions.push('가격대 검색');

    addChatMessage({
      id: generateMessageId(),
      text: '',
      sender: 'ai',
      timestamp: new Date(),
      buttons: missingConditions.length > 0 ? missingConditions : ['새로운 조건으로 찾아보기'],
      resetButtons: resetButtons,
      isGalleryList: false,
    });
  };

  const sendTextMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: generateMessageId(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      isGalleryList: false,
    };

    addChatMessage(userMessage);
    setInputMessage('');
    setIsAITyping(true);

    try {
      const aiResponse = await GeminiService.extractKeywordsFromQuery(
        inputMessage,
        selectedKeywords
      );

      const mergedKeywords = {
        ...selectedKeywords,
        ...Object.fromEntries(
          Object.entries(aiResponse.keywords).filter(([_, v]) => v !== null && v !== undefined)
        )
      };

      setSelectedKeywords(mergedKeywords);

      const aiMessage = {
        id: generateMessageId(),
        text: `알겠습니다! 조건을 확인했습니다.`,
        sender: 'ai',
        timestamp: new Date(),
        isGalleryList: false,
      };
      addChatMessage(aiMessage);

      await showSearchResults(mergedKeywords);

    } catch (error) {
      console.error('AI 메시지 전송 오류:', error);
      if (error.message === 'API_KEY_NOT_SET') {
        Alert.alert(
          'API 키 설정 필요',
          '.env 파일에 GEMINI_API_KEY를 설정해주세요.\n\nhttps://makersuite.google.com/app/apikey 에서 API 키를 발급받으세요.',
          [{ text: '확인' }]
        );
      } else {
        addChatMessage({
          id: generateMessageId(),
          text: '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.',
          sender: 'ai',
          timestamp: new Date(),
          buttons: ['새로운 조건으로 찾아보기'],
          isGalleryList: false,
        });
      }
    } finally {
      setIsAITyping(false);
    }
  };

  const renderGalleryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.galleryCard}
      onPress={() => {
        navigation.navigate('GalleryDetail', { galleryId: item.id });
      }}
      activeOpacity={0.8}
    >
      {item.imageUrls && item.imageUrls.length > 0 && (
        <Image
          source={{ uri: item.imageUrls[0] }}
          style={styles.galleryImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.galleryInfo}>
        <Text style={styles.galleryName}>{item.galleryName}</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={styles.infoText}>{item.location}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>💰</Text>
          <Text style={styles.infoText}>
            {item.price?.toLocaleString()}원
          </Text>
        </View>

        {item.area && (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📐</Text>
            <Text style={styles.infoText}>{item.area}㎡</Text>
          </View>
        )}

        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <Text style={styles.dateText}>
          등록일: {item.createdAt?.toDate?.()?.toLocaleDateString() || '정보 없음'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderChatMessage = ({ item }) => {
    const isUser = item.sender === 'user';

    if (item.isGalleryList && item.galleries) {
      return (
        <View style={styles.messageWrapper}>
          <View style={[styles.messageBubble, styles.aiBubble]}>
            <Text style={[styles.messageText, styles.aiText]}>{item.text}</Text>
          </View>
          <View style={styles.galleryGrid}>
            {item.galleries.slice(0, 4).map((gallery) => (
              <TouchableOpacity
                key={gallery.id}
                style={styles.galleryCardInChat}
                onPress={() => {
                  setShowAIChat(false);
                  navigation.navigate('GalleryDetail', { galleryId: gallery.id });
                }}
              >
                {gallery.imageUrls && gallery.imageUrls.length > 0 && (
                  <Image
                    source={{ uri: gallery.imageUrls[0] }}
                    style={styles.galleryCardImage}
                  />
                )}
                <View style={styles.galleryCardInfo}>
                  <Text style={styles.galleryCardName} numberOfLines={1}>
                    {gallery.galleryName}
                  </Text>
                  <Text style={styles.galleryCardLocation} numberOfLines={1}>
                    {gallery.location}
                  </Text>
                  <Text style={styles.galleryCardPrice}>
                    {gallery.price?.toLocaleString()}원 / 1주
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.messageWrapper}>
        {item.text && (
          <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
              {item.text}
            </Text>
          </View>
        )}
        {item.buttons && item.buttons.length > 0 && (
          <View style={styles.buttonContainer}>
            {item.buttons.map((btn, idx) => (
              <TouchableOpacity
                key={`${item.id}-btn-${idx}-${btn}`}
                style={styles.buttonStyle}
                onPress={() => handleButtonPress(btn)}
              >
                <Text style={styles.buttonTextStyle}>{btn}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {item.resetButtons && item.resetButtons.length > 0 && (
          <View style={styles.resetButtonContainer}>
            {item.resetButtons.map((btn, idx) => (
              <TouchableOpacity
                key={`${item.id}-reset-${idx}-${btn}`}
                style={styles.resetButtonStyle}
                onPress={() => handleButtonPress(btn)}
              >
                <Text style={styles.resetButtonTextStyle}>{btn}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // 선택된 조건 칩 컴포넌트
  const renderSelectedChips = () => {
    const chips = [];
    if (selectedKeywords.atmosphere) chips.push({ key: 'atmosphere', label: '분위기', value: selectedKeywords.atmosphere });
    if (selectedKeywords.location) chips.push({ key: 'location', label: '지역', value: selectedKeywords.location });
    if (selectedKeywords.detailLocation) chips.push({ key: 'detailLocation', label: '상세지역', value: selectedKeywords.detailLocation });
    if (selectedKeywords.priceRange) chips.push({ key: 'priceRange', label: '가격대', value: selectedKeywords.priceRange });

    if (chips.length === 0) return null;

    return (
      <ScrollView
        horizontal
        style={styles.selectedChipsContainer}
        showsHorizontalScrollIndicator={false}
      >
        {chips.map((chip) => (
          <View key={chip.key} style={styles.selectedChip}>
            <Text style={styles.selectedChipText}>{chip.value}</Text>
          </View>
        ))}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchForm}>
        <View style={styles.searchRow}>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={searchType}
              onValueChange={setSearchType}
              style={styles.picker}
            >
              <Picker.Item label="갤러리명" value="galleryName" />
              <Picker.Item label="위치" value="location" />
              <Picker.Item label="설명" value="description" />
            </Picker>
          </View>

          <KoreanTextInput
            style={styles.searchInput}
            placeholder="검색어를 입력하세요"
            placeholderTextColor="#999"
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>가격 범위:</Text>
          <TextInput
            style={styles.priceInput}
            placeholder="최소 가격"
            placeholderTextColor="#999"
            value={priceRange.min}
            onChangeText={(text) => setPriceRange({ ...priceRange, min: text })}
            keyboardType="numeric"
          />
          <Text style={styles.priceSeparator}>~</Text>
          <TextInput
            style={styles.priceInput}
            placeholder="최대 가격"
            placeholderTextColor="#999"
            value={priceRange.max}
            onChangeText={(text) => setPriceRange({ ...priceRange, max: text })}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.searchButton]}
            onPress={handleSearch}
          >
            <Text style={styles.buttonText}>검색</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.resetButton]}
            onPress={handleReset}
          >
            <Text style={styles.buttonText}>초기화</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.aiButton]}
            onPress={handleAIButtonPress}
          >
            <Icon name="smart-toy" size={20} color="#fff" />
            <Text style={styles.buttonText}>AI 도우미</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.resultCount}>
        검색 결과: {filteredGalleries.length}개
      </Text>

      <FlatList
        data={filteredGalleries}
        renderItem={renderGalleryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
          </View>
        }
      />

      <Modal
        visible={showAIChat}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAIChat(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.chatModal}>
            <View style={styles.chatHeader}>
              <TouchableOpacity onPress={() => setShowAIChat(false)} style={styles.backButton}>
                <Icon name="arrow-back" size={24} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.chatTitle}>Gallering AI</Text>
              <View style={styles.headerButtons} />
            </View>

            {renderSelectedChips()}

            <FlatList
              ref={chatScrollRef}
              data={chatMessages}
              renderItem={renderChatMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
              ListFooterComponent={
                isAITyping ? (
                  <View style={[styles.messageWrapper, styles.aiMessage]}>
                    <View style={[styles.messageBubble, styles.aiBubble]}>
                      <ActivityIndicator size="small" color="#007AFF" />
                    </View>
                  </View>
                ) : null
              }
            />

            <View style={styles.inputContainer}>
              <KoreanTextInput
                style={styles.messageInput}
                placeholder="갤러리에 대해 물어보세요..."
                value={inputMessage}
                onChangeText={setInputMessage}
                multiline
                maxHeight={100}
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={sendTextMessage}
                disabled={!inputMessage.trim() || isAITyping}
              >
                <Icon
                  name="send"
                  size={24}
                  color={inputMessage.trim() && !isAITyping ? '#007AFF' : '#ccc'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  searchForm: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  searchInput: {
    flex: 2,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#000',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  priceLabel: {
    marginRight: 10,
    fontSize: 16,
    color: '#333',
  },
  priceInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#000',
  },
  priceSeparator: {
    marginHorizontal: 10,
    fontSize: 16,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  searchButton: {
    backgroundColor: '#007AFF',
  },
  resetButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCount: {
    padding: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  listContainer: {
    padding: 15,
  },
  galleryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
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
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  galleryInfo: {
    padding: 15,
  },
  galleryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    lineHeight: 20,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  aiButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    gap: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  chatModal: {
    backgroundColor: '#fff',
    flex: 1,
    marginTop: 60,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 5,
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  settingsButton: {
    padding: 4,
  },
  selectedChipsContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    maxHeight: 50,
  },
  selectedChip: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  selectedChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesContent: {
    padding: 15,
  },
  messageWrapper: {
    marginBottom: 10,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: '#EAEAEA',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#000',
  },
  aiText: {
    color: '#000',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  buttonStyle: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  buttonTextStyle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  resetButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 6,
  },
  resetButtonStyle: {
    backgroundColor: '#666',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  resetButtonTextStyle: {
    color: '#fff',
    fontSize: 14,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 10,
  },
  galleryCardInChat: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  galleryCardImage: {
    width: '100%',
    height: 120,
  },
  galleryCardInfo: {
    padding: 10,
  },
  galleryCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  galleryCardLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  galleryCardPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 15,
    maxHeight: 100,
    backgroundColor: '#fff',
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GallerySearchScreen;
