// src/hooks/useBackHandler.js
import { useEffect } from 'react';
import { BackHandler, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// 커스텀 훅 - 백 버튼 핸들러
export const useBackHandler = (customHandler) => {
  const navigation = useNavigation();
  
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (customHandler) {
          return customHandler();
        }
        
        // 기본 동작: 이전 화면으로 이동
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        
        // 더 이상 뒤로 갈 화면이 없으면 앱 종료 확인
        Alert.alert(
          '앱 종료',
          '앱을 종료하시겠습니까?',
          [
            { text: '취소', style: 'cancel' },
            { text: '종료', onPress: () => BackHandler.exitApp() },
          ],
        );
        return true;
      }
    );

    return () => backHandler.remove();
  }, [customHandler, navigation]);
};