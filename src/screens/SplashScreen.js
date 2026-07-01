// src/screens/SplashScreen.js
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Logo from '../components/Logo';
import useLoginStore from '../store/useLoginStore';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const SplashScreen = ({ navigation }) => {
  const { logined } = useLoginStore();

  useEffect(() => {
    const checkAuthState = async () => {
      const startTime = Date.now();
      let navigateTime = 1500;
      let targetRoute = 'Auth';

      try {
        const currentUser = auth().currentUser;
        if (currentUser) {
          const userDocPromise = firestore()
            .collection('users')
            .doc(currentUser.uid)
            .get();

          const [userDoc] = await Promise.all([
            userDocPromise,
            new Promise(resolve => setTimeout(resolve, 500))
          ]);

          if (userDoc.exists) {
            const userData = userDoc.data();
            logined(
              userData.displayName || currentUser.displayName || userData.userId || '사용자',
              userData.userType || 'user',
              currentUser.uid
            );
            targetRoute = 'MainApp';
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }

      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(navigateTime - elapsedTime, 0);

      setTimeout(() => {
        if (navigation && navigation.replace) {
          navigation.replace(targetRoute);
        }
      }, remainingTime);
    };

    checkAuthState();
  }, [navigation, logined]);

  return (
    <View style={styles.container}>
      <Logo size="large" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4B7BFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SplashScreen;
