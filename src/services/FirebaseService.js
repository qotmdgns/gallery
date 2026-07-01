// src/services/FirebaseService.js
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { handleError, isRetryableError } from '../utils/errorHandler';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const DEBUG_FIREBASE = false;

const debugLog = (...args) => {
  if (__DEV__ && DEBUG_FIREBASE) {
    console.log(...args);
  }
};

class FirebaseService {
  constructor() {
    this.db = firestore();
    this.storage = storage();
    this.auth = auth();
  }

  // ?ъ떆??濡쒖쭅???ы븿??API ?몄텧
  async withRetry(fn, maxRetries = 3, context = {}) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (!isRetryableError(error) || i === maxRetries - 1) {
          throw error;
        }

        // 吏??諛깆삤??
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  // ========== ?묓뭹 愿由?(?꾪떚?ㅽ듃) ==========

  // ?묓뭹 ?낅줈??
  async uploadArtwork(artworkData, imageUri) {
    return this.withRetry(async () => {
      try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        let imageUrl = null;
        if (imageUri) {
          // ?대?吏 ?낅줈??
          const filename = `artworks/${currentUser.uid}/${Date.now()}.jpg`;
          const reference = this.storage.ref(filename);
          await reference.putFile(imageUri);
          imageUrl = await reference.getDownloadURL();
        }

        // Firestore???묓뭹 ?뺣낫 ???
        const artworkRef = await this.db.collection('artworks').add({
          ...artworkData,
          artistId: currentUser.uid,
          imageUrl,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
          likes: 0,
          views: 0,
          status: 'active', // active, sold, hidden
        });

        return { id: artworkRef.id, ...artworkData, imageUrl };
      } catch (error) {
        handleError(error, { context: 'uploadArtwork' });
        throw error;
      }
    }, 3, { operation: 'uploadArtwork' });
  }

  // ?꾪떚?ㅽ듃???묓뭹 紐⑸줉 議고쉶
  async getArtistArtworks(artistId = null) {
    return this.withRetry(async () => {
      try {
        const targetArtistId = artistId || this.auth.currentUser?.uid;
        if (!targetArtistId) {
          throw new Error('Artist ID required');
        }

        // 蹂듯빀 ?몃뜳??臾몄젣瑜??쇳븯湲??꾪빐 媛꾨떒??荑쇰━ ?ъ슜
        const snapshot = await this.db
          .collection('artworks')
          .where('artistId', '==', targetArtistId)
          .get();

        // ?대씪?댁뼵??痢≪뿉???꾪꽣留?諛??뺣젹
        const artworks = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
          }))
          .filter(artwork => artwork.status !== 'hidden')
          .sort((a, b) => {
            // status濡?癒쇱? ?뺣젹 (active > sold > 湲고?)
            const statusOrder = { active: 0, sold: 1 };
            const aOrder = statusOrder[a.status] ?? 2;
            const bOrder = statusOrder[b.status] ?? 2;

            if (aOrder !== bOrder) {
              return aOrder - bOrder;
            }

            // 媛숈? status硫??앹꽦??湲곗? ?대┝李⑥닚
            const aTime = a.createdAt?.getTime() || 0;
            const bTime = b.createdAt?.getTime() || 0;
            return bTime - aTime;
          });

        return artworks;
      } catch (error) {
        handleError(error, { context: 'getArtistArtworks' });
        throw error;
      }
    }, 3, { operation: 'getArtistArtworks' });
  }

  // ?묓뭹 ?뺣낫 ?낅뜲?댄듃
  async updateArtwork(artworkId, updates) {
    return this.withRetry(async () => {
      try {
        await this.db.collection('artworks').doc(artworkId).update({
          ...updates,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
      } catch (error) {
        handleError(error, { context: 'updateArtwork' });
        throw error;
      }
    }, 3, { operation: 'updateArtwork' });
  }

  // ?묓뭹 ?뺣낫? ?대?吏 ?낅뜲?댄듃
  async updateArtworkWithImage(artworkId, updates, imageUri) {
    return this.withRetry(async () => {
      try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        let imageUrl = null;
        if (imageUri) {
          // ???대?吏 ?낅줈??
          const filename = `artworks/${currentUser.uid}/${Date.now()}.jpg`;
          const reference = this.storage.ref(filename);
          await reference.putFile(imageUri);
          imageUrl = await reference.getDownloadURL();
        }

        // Firestore???묓뭹 ?뺣낫 ?낅뜲?댄듃
        await this.db.collection('artworks').doc(artworkId).update({
          ...updates,
          imageUrl,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, imageUrl };
      } catch (error) {
        handleError(error, { context: 'updateArtworkWithImage' });
        throw error;
      }
    }, 3, { operation: 'updateArtworkWithImage' });
  }

  // ?묓뭹 ??젣 (soft delete)
  async deleteArtwork(artworkId) {
    return this.withRetry(async () => {
      try {
        await this.db.collection('artworks').doc(artworkId).update({
          status: 'hidden',
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
      } catch (error) {
        handleError(error, { context: 'deleteArtwork' });
        throw error;
      }
    }, 3, { operation: 'deleteArtwork' });
  }

  // ========== FCM ?좏겙 愿由?==========

  async saveFCMToken(token) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) return;

      const deviceInfo = {
        token,
        platform: Platform.OS,
        deviceId: await DeviceInfo.getUniqueId(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await this.db.collection('users').doc(currentUser.uid).update({
        fcmToken: token,
        deviceInfo,
      });
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  async deleteFCMToken() {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) return;

      await this.db.collection('users').doc(currentUser.uid).update({
        fcmToken: firestore.FieldValue.delete(),
        deviceInfo: firestore.FieldValue.delete(),
      });
    } catch (error) {
      console.error('Error deleting FCM token:', error);
    }
  }

  // ========== ?ъ슜??愿??硫붿꽌??==========

  async getUserData(userId) {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        return { id: userDoc.id, ...userDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      throw error;
    }
  }

  async updateUserData(userId, data) {
    try {
      await this.db.collection('users').doc(userId).update({
        ...data,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  }

  async uploadProfileImage(userId, imageUri) {
    try {
      const reference = this.storage.ref(`profiles/${userId}/avatar.jpg`);
      await reference.putFile(imageUri);
      const downloadURL = await reference.getDownloadURL();

      await this.updateUserData(userId, { profileImage: downloadURL });
      return downloadURL;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw error;
    }
  }

  // ========== 媛ㅻ윭由?愿??硫붿꽌??==========

  async getGalleries(filters = {}) {
    try {
      let query = this.db.collection('galleries');

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }
      if (filters.location) {
        query = query.where('location', '==', filters.location);
      }
      if (filters.ownerId) {
        query = query.where('ownerId', '==', filters.ownerId);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();

      const galleries = [];
      snapshot.forEach(doc => {
        galleries.push({ id: doc.id, ...doc.data() });
      });

      return galleries;
    } catch (error) {
      console.error('Error getting galleries:', error);
      throw error;
    }
  }

  async getGalleryById(galleryId) {
    try {
      const doc = await this.db.collection('galleries').doc(galleryId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting gallery:', error);
      throw error;
    }
  }

  async searchGalleries(searchTerm) {
    try {
      // Firestore???꾨Ц 寃?됱쓣 吏?먰븯吏 ?딆쑝誘濡?
      // 湲곕낯?곸씤 寃?됰쭔 援ы쁽 (?대쫫 湲곗?)
      const galleries = await this.getGalleries();
      return galleries.filter(gallery =>
        gallery.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gallery.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching galleries:', error);
      throw error;
    }
  }

  // ========== ?뚯뀥 濡쒓렇??==========

  // Google 濡쒓렇??
  async signInWithGoogle() {
    try {
      // Google Play Services ?뺤씤
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Google 濡쒓렇??
      const { idToken } = await GoogleSignin.signIn();

      // Firebase ?몄쬆
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await this.auth.signInWithCredential(googleCredential);

      // ?좉퇋 ?ъ슜?먯씤 寃쎌슦 Firestore???꾨줈???앹꽦
      if (userCredential.additionalUserInfo?.isNewUser) {
        await this.createUserProfile(userCredential.user);
      }

      return userCredential.user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  // ?ъ슜???꾨줈???앹꽦
  async createUserProfile(user) {
    try {
      const userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        phoneNumber: user.phoneNumber || '',
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        userType: 'user', // 湲곕낯媛?
        favoriteGalleries: [],
        settings: {
          notifications: true,
          language: 'ko',
        },
      };

      await this.db.collection('users').doc(user.uid).set(userProfile, { merge: true });
      return userProfile;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // ========== ?몄쬆 愿??硫붿꽌??==========

  // ?꾪솕踰덊샇 ?щ㎎??
  formatPhoneNumber(phoneNumber) {
    // ?レ옄留?異붿텧
    const numbers = phoneNumber.replace(/[^0-9]/g, '');

    // ?쒓뎅 踰덊샇 ?뺤떇?쇰줈 蹂??
    if (numbers.startsWith('010')) {
      return '+82' + numbers.substring(1);
    } else if (numbers.startsWith('10')) {
      return '+82' + numbers;
    } else if (numbers.startsWith('82')) {
      return '+' + numbers;
    }

    return '+82' + numbers;
  }

  // ?꾪솕踰덊샇 ?몄쬆 ?쒖옉 (媛쒖꽑??踰꾩쟾)
  async sendPhoneVerification(phoneNumber) {
    try {
      // ?꾪솕踰덊샇 ?몄쬆???쒖꽦?붾릺???덈뒗吏 ?뺤씤
      const authSettings = this.auth.settings;

      // ?ㅼ젣 ?몄쬆 ?ъ슜 (??寃利??쒖꽦??
      // 二쇱쓽: SHA 吏臾몄씠 Firebase???깅줉?섏뼱 ?덉뼱????
      debugLog('Using real phone authentication with app verification');

      // ??寃利??쒖꽦??(湲곕낯媛?
      // this.auth.settings.appVerificationDisabledForTesting = false; // 紐낆떆?곸쑝濡?false ?ㅼ젙 遺덊븘??

      // 媛쒕컻 ?섍꼍?먯꽌 ?뚯뒪??踰덊샇留??쒓났 (?ㅼ젣 ?몄쬆怨?蹂묓뻾 媛??
      if (__DEV__) {
        debugLog('Development mode: Firebase test phone numbers are available.');
        // Firebase Console?먯꽌 ?ㅼ젙???뚯뒪??踰덊샇 ?ъ슜
        // ?뚯뒪??踰덊샇: +821012345678, ?몄쬆 肄붾뱶: 123456
        if (phoneNumber === '010-1234-5678' || phoneNumber === '01012345678') {
          debugLog('Using test phone number - code: 123456');
          return {
            success: true,
            isTestMode: true,
            phoneNumber: '+821012345678',
            message: '테스트 모드: 인증 코드 123456을 입력하세요.',
            confirm: async (code) => {
              if (code === '123456') {
                return { success: true };
              }
              throw new Error('?섎せ???뚯뒪???몄쬆 肄붾뱶?낅땲?? 123456???낅젰?섏꽭??');
            }
          };
        }
      }

      // ?쒓뎅 踰덊샇 ?뺤떇?쇰줈 蹂??(010-1234-5678 -> +821012345678)
      const formattedNumber = this.formatPhoneNumber(phoneNumber);

      // SMS ?몄쬆 肄붾뱶 諛쒖넚
      const confirmation = await this.auth.signInWithPhoneNumber(formattedNumber);

      return {
        success: true,
        confirmation,
        message: '?몄쬆 肄붾뱶媛 SMS濡?諛쒖넚?섏뿀?듬땲??'
      };
    } catch (error) {
      console.error('Error sending phone verification:', error);

      // ?먮윭 硫붿떆吏 媛쒖꽑
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('?꾪솕踰덊샇 ?몄쬆??鍮꾪솢?깊솕?섏뼱 ?덉뒿?덈떎. Firebase Console?먯꽌 Phone Authentication???쒖꽦?뷀빐二쇱꽭??');
      } else if (error.code === 'auth/invalid-phone-number') {
        throw new Error('?좏슚?섏? ?딆? ?꾪솕踰덊샇?낅땲?? ?щ컮瑜??뺤떇?쇰줈 ?낅젰?댁＜?몄슂.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('?덈Т 留롮? ?붿껌??諛쒖깮?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄?댁＜?몄슂.');
      }

      throw error;
    }
  }

  // ?꾪솕踰덊샇 ?몄쬆 肄붾뱶 ?뺤씤
  async verifyPhoneCode(confirmation, verificationCode, providedUserId = null) {
    try {
      // ?뚯뒪??紐⑤뱶 ?뺤씤
      if (confirmation.isTestMode) {
        const result = await confirmation.confirm(verificationCode);

        // ?뚯뒪??紐⑤뱶?먯꽌???ъ슜???뺣낫 ?낅뜲?댄듃
        const currentUser = this.auth.currentUser;
        const userId = providedUserId || currentUser?.uid;

        debugLog('Test mode - userId:', userId, 'currentUser:', currentUser?.uid);

        if (userId) {
          // ?ъ슜??臾몄꽌媛 議댁옱?섎뒗吏 ?뺤씤
          const userDoc = await this.db.collection('users').doc(userId).get();

          if (userDoc.exists) {
            debugLog('Updating existing user document:', userId);
            await this.db.collection('users').doc(userId).update({
              phoneNumber: confirmation.phoneNumber || '+821012345678',
              phoneNumberVerified: true,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
          } else {
            debugLog('Creating new user document:', userId);
            // 臾몄꽌媛 ?놁쑝硫??앹꽦
            await this.db.collection('users').doc(userId).set({
              uid: userId,
              phoneNumber: confirmation.phoneNumber || '+821012345678',
              phoneNumberVerified: true,
              createdAt: firestore.FieldValue.serverTimestamp(),
              updatedAt: firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          }
        } else {
          console.warn('No user ID available for phone verification');
        }

        return {
          success: true,
          user: currentUser
        };
      }

      // ?ㅼ젣 ?몄쬆 泥섎━
      const credential = await confirmation.confirm(verificationCode);

      // ?꾩옱 ?ъ슜?먯? ?곌껐
      const currentUser = this.auth.currentUser;
      const userId = providedUserId || currentUser?.uid || credential.user?.uid;

      debugLog('Real auth - userId:', userId, 'currentUser:', currentUser?.uid, 'credential user:', credential.user?.uid);

      if (currentUser && credential.user && credential.user.uid !== currentUser.uid) {
        // ?ㅻⅨ 怨꾩젙?대㈃ 留곹겕
        await currentUser.linkWithCredential(credential);
      }

      // ?ъ슜???뺣낫 ?낅뜲?댄듃 (臾몄꽌 議댁옱 ?щ? ?뺤씤)
      if (userId) {
        const userDocRef = this.db.collection('users').doc(userId);
        const userDoc = await userDocRef.get();

        if (userDoc.exists) {
          debugLog('Updating existing user document:', userId);
          // 臾몄꽌媛 ?덉쑝硫??낅뜲?댄듃
          await userDocRef.update({
            phoneNumber: credential.user?.phoneNumber || confirmation.phoneNumber,
            phoneNumberVerified: true,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        } else {
          debugLog('Creating new user document:', userId);
          // 臾몄꽌媛 ?놁쑝硫??앹꽦 (merge ?듭뀡?쇰줈 ?덉쟾?섍쾶)
          await userDocRef.set({
            uid: userId,
            phoneNumber: credential.user?.phoneNumber || confirmation.phoneNumber,
            phoneNumberVerified: true,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      } else {
        console.warn('No user ID available for phone verification');
      }

      return {
        success: true,
        user: credential.user || currentUser
      };
    } catch (error) {
      console.error('Error verifying phone code:', error);

      if (error.code === 'auth/invalid-verification-code') {
        throw new Error('?섎せ???몄쬆 肄붾뱶?낅땲??');
      } else if (error.code === 'auth/code-expired') {
        throw new Error('?몄쬆 肄붾뱶媛 留뚮즺?섏뿀?듬땲?? ?ㅼ떆 ?붿껌?댁＜?몄슂.');
      } else if (error.message?.includes('not found')) {
        throw new Error('?ъ슜???뺣낫瑜?李얠쓣 ???놁뒿?덈떎. ?ㅼ떆 濡쒓렇?명빐二쇱꽭??');
      }

      throw error;
    }
  }

  // ?쇰컲 ?대찓???몄쬆 諛쒖넚
  async sendEmailVerification() {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('?ъ슜?먭? 濡쒓렇?몃릺吏 ?딆븯?듬땲??');
      }

      await currentUser.sendEmailVerification();
      return {
        success: true,
        message: '?몄쬆 ?대찓?쇱씠 諛쒖넚?섏뿀?듬땲?? ?대찓?쇱쓣 ?뺤씤?댁＜?몄슂.'
      };
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw error;
    }
  }

  // ?ㅼ젣 ?대찓???몄쬆 (異붽? ?대찓?쇱슜)
  async sendRealEmailVerification(realEmail) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('?ъ슜?먭? 濡쒓렇?몃릺吏 ?딆븯?듬땲??');
      }

      // ?ъ슜??臾몄꽌媛 議댁옱?섎뒗吏 ?뺤씤
      const userDoc = await this.db.collection('users').doc(currentUser.uid).get();

      if (userDoc.exists) {
        // 臾몄꽌媛 ?덉쑝硫??낅뜲?댄듃
        await this.db.collection('users').doc(currentUser.uid).update({
          realEmail: realEmail,
          realEmailVerified: false,
        });
      } else {
        // 臾몄꽌媛 ?놁쑝硫??앹꽦
        await this.db.collection('users').doc(currentUser.uid).set({
          uid: currentUser.uid,
          realEmail: realEmail,
          realEmailVerified: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      // ?몄쬆 ?좏겙 ?앹꽦 (6?먮━ ?レ옄)
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10遺???留뚮즺

      // ?몄쬆 ?좏겙 ???
      await this.db.collection('email_verifications').doc(currentUser.uid).set({
        code: verificationCode,
        email: realEmail,
        expiresAt: firestore.Timestamp.fromDate(expiresAt),
        createdAt: firestore.FieldValue.serverTimestamp(),
        verified: false,
      });

      // Firebase Trigger Email Extension???듯븳 ?대찓??諛쒖넚
      // mail 而щ젆?섏뿉 臾몄꽌瑜?異붽??섎㈃ Extension???먮룞?쇰줈 ?대찓??諛쒖넚
      try {
        await this.db.collection('mail').add({
          to: realEmail,
          message: {
            subject: '媛ㅻ윭由???- ?대찓???몄쬆 肄붾뱶',
            text: `?덈뀞?섏꽭??\n\n?대찓???몄쬆 肄붾뱶??${verificationCode} ?낅땲??\n\n10遺??대궡???깆뿉???낅젰?댁＜?몄슂.\n\n媛먯궗?⑸땲??`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4B7BFF;">?대찓???몄쬆</h2>
                <p>?덈뀞?섏꽭??</p>
                <p>媛ㅻ윭由????대찓???몄쬆???꾪븳 ?몄쬆 肄붾뱶?낅땲??</p>
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <h1 style="color: #333; letter-spacing: 5px; margin: 0;">${verificationCode}</h1>
                </div>
                <p>??肄붾뱶??10遺??꾩뿉 留뚮즺?⑸땲??</p>
                <p style="color: #666; font-size: 14px;">???대찓?쇱쓣 ?붿껌?섏? ?딆쑝?⑤떎硫?臾댁떆?댁＜?몄슂.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">媛ㅻ윭由????</p>
              </div>
            `
          }
        });
      } catch (emailError) {
        console.error('Error adding email to mail collection:', emailError);
        // ?대찓??諛쒖넚 ?ㅽ뙣?대룄 ?몄쬆 肄붾뱶???앹꽦?섏뿀?쇰?濡?怨꾩냽 吏꾪뻾
      }

      // 媛쒕컻 ?섍꼍?먯꽌留?肄붾뱶 諛섑솚
      return {
        success: true,
        message: '?몄쬆 肄붾뱶媛 ?대찓?쇰줈 諛쒖넚?섏뿀?듬땲??',
      };
    } catch (error) {
      console.error('Error sending real email verification:', error);
      throw error;
    }
  }

  // ?ㅼ젣 ?대찓???몄쬆 肄붾뱶 ?뺤씤
  async verifyRealEmailCode(verificationCode) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('?ъ슜?먭? 濡쒓렇?몃릺吏 ?딆븯?듬땲??');
      }

      // ?몄쬆 肄붾뱶 ?뺤씤
      const verificationDoc = await this.db
        .collection('email_verifications')
        .doc(currentUser.uid)
        .get();

      if (!verificationDoc.exists) {
        throw new Error('?몄쬆 ?붿껌??李얠쓣 ???놁뒿?덈떎.');
      }

      const data = verificationDoc.data();

      // 留뚮즺 ?쒓컙 ?뺤씤
      if (data.expiresAt.toDate() < new Date()) {
        throw new Error('?몄쬆 肄붾뱶媛 留뚮즺?섏뿀?듬땲??');
      }

      // 肄붾뱶 ?뺤씤
      if (data.code !== verificationCode) {
        throw new Error('?섎せ???몄쬆 肄붾뱶?낅땲??');
      }

      // ?몄쬆 ?꾨즺 泥섎━
      const userDocRef = this.db.collection('users').doc(currentUser.uid);
      const userDoc = await userDocRef.get();

      if (userDoc.exists) {
        // 臾몄꽌媛 ?덉쑝硫??낅뜲?댄듃
        await userDocRef.update({
          realEmailVerified: true,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // 臾몄꽌媛 ?놁쑝硫??앹꽦
        await userDocRef.set({
          uid: currentUser.uid,
          realEmailVerified: true,
          realEmail: data.email, // email_verifications????λ맂 ?대찓???ъ슜
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      await this.db.collection('email_verifications').doc(currentUser.uid).update({
        verified: true,
      });

      return {
        success: true,
        message: '?대찓???몄쬆???꾨즺?섏뿀?듬땲??'
      };
    } catch (error) {
      console.error('Error verifying email code:', error);
      throw error;
    }
  }

  // 鍮꾨?踰덊샇 ?ъ꽕???대찓??諛쒖넚
  async sendPasswordResetEmail(email) {
    try {
      await this.auth.sendPasswordResetEmail(email);
      return {
        success: true,
        message: '鍮꾨?踰덊샇 ?ъ꽕???대찓?쇱씠 諛쒖넚?섏뿀?듬땲??'
      };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  // ========== 媛ㅻ윭由?愿由?==========

  // 媛ㅻ윭由??앹꽦
  async createGallery(galleryData) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const gallery = {
        ...galleryData,
        ownerId: currentUser.uid,
        rating: 0,
        reviewCount: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await this.db.collection('galleries').add(gallery);
      return { id: docRef.id, ...gallery };
    } catch (error) {
      console.error('Error creating gallery:', error);
      throw error;
    }
  }

  // 媛ㅻ윭由??낅뜲?댄듃
  async updateGallery(galleryId, updates) {
    try {
      await this.db.collection('galleries').doc(galleryId).update({
        ...updates,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating gallery:', error);
      throw error;
    }
  }

  // 媛ㅻ윭由??대?吏 ?낅줈??
  async uploadGalleryImage(galleryId, imageUri) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const filename = `galleries/${currentUser.uid}/${galleryId}_${Date.now()}.jpg`;
      const reference = this.storage.ref(filename);
      await reference.putFile(imageUri);
      const downloadURL = await reference.getDownloadURL();

      // 媛ㅻ윭由?臾몄꽌???대?吏 URL 異붽?
      const galleryDoc = await this.db.collection('galleries').doc(galleryId).get();
      const currentImages = galleryDoc.data().images || [];

      await this.db.collection('galleries').doc(galleryId).update({
        images: [...currentImages, downloadURL],
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      return downloadURL;
    } catch (error) {
      console.error('Error uploading gallery image:', error);
      throw error;
    }
  }

  // 媛ㅻ윭由???젣
  async deleteGallery(galleryId) {
    try {
      await this.db.collection('galleries').doc(galleryId).delete();
      return { success: true };
    } catch (error) {
      console.error('Error deleting gallery:', error);
      throw error;
    }
  }

  // 媛ㅻ윭由?李쒗븯湲?李?痍⑥냼
  async toggleFavoriteGallery(galleryId) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const userDoc = await this.db.collection('users').doc(currentUser.uid).get();
      const favoriteGalleries = userDoc.data().favoriteGalleries || [];

      let updatedFavorites;
      if (favoriteGalleries.includes(galleryId)) {
        // 李?痍⑥냼
        updatedFavorites = favoriteGalleries.filter(id => id !== galleryId);
      } else {
        // 李쒗븯湲?
        updatedFavorites = [...favoriteGalleries, galleryId];
      }

      await this.db.collection('users').doc(currentUser.uid).update({
        favoriteGalleries: updatedFavorites,
      });

      return {
        success: true,
        isFavorite: updatedFavorites.includes(galleryId)
      };
    } catch (error) {
      console.error('Error toggling favorite gallery:', error);
      throw error;
    }
  }

  // ========== ?덉빟 愿??硫붿꽌??==========

  // ?덉빟 ?앹꽦
  async createReservation(reservationData) {
    try {
      const docRef = await this.db.collection('reservations').add({
        ...reservationData,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // 媛ㅻ윭由??ㅻ꼫?먭쾶 ?몄떆 ?뚮┝ ?꾩넚
      await this.sendBookingNotificationToOwner(reservationData);

      return docRef.id;
    } catch (error) {
      console.error('Error creating reservation:', error);
      throw error;
    }
  }

  // ?섎룞 ?덉빟 ?앹꽦 (媛ㅻ윭由?二쇱씤??
  async createManualBooking(bookingData) {
    return this.withRetry(async () => {
      try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        // ?덉빟 ?곗씠???앹꽦
        const reservation = {
          ...bookingData,
          isManualBooking: true, // ?섎룞 ?덉빟 ?쒖떆
          createdBy: currentUser.uid, // ?깅줉??二쇱씤 ID
          status: 'confirmed', // 二쇱씤??吏곸젒 ?깅줉?섎?濡?諛붾줈 ?뺤젙
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await this.db.collection('reservations').add(reservation);

        return { id: docRef.id, ...reservation };
      } catch (error) {
        handleError(error, { context: 'createManualBooking' });
        throw error;
      }
    }, 3, { operation: 'createManualBooking' });
  }

  // ?덉빟 ?뚮┝ ?꾩넚 (?ㅻ꼫?먭쾶)
  async sendBookingNotificationToOwner(reservationData) {
    try {
      const { galleryId, userName, startDate, endDate } = reservationData;

      // 媛ㅻ윭由??뺣낫 媛?몄삤湲?
      const gallery = await this.getGalleryById(galleryId);
      if (!gallery) return;

      // ?ㅻ꼫 ?뺣낫 媛?몄삤湲?
      const ownerDoc = await this.db.collection('users').doc(gallery.ownerId).get();
      const ownerData = ownerDoc.data();

      if (ownerData?.fcmToken) {
        // FCM 硫붿떆吏 ?꾩넚???꾪븳 ?쒕쾭 ?⑥닔 ?몄텧
        // ?ㅼ젣濡쒕뒗 Cloud Functions??諛깆뿏???쒕쾭?먯꽌 泥섎━
        await this.db.collection('notifications').add({
          to: ownerData.fcmToken,
          type: 'booking',
          title: '?덈줈???덉빟 ?붿껌',
          body: `${userName}?섏씠 ${gallery.name} ?덉빟???붿껌?덉뒿?덈떎.`,
          data: {
            type: 'booking',
            bookingId: reservationData.id,
            galleryId: galleryId,
            galleryName: gallery.name,
            status: 'pending',
            reservationDate: `${startDate} ~ ${endDate}`
          },
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error sending booking notification:', error);
    }
  }

  // ?ъ슜???덉빟 紐⑸줉 媛?몄삤湲?
  async getUserReservations(userId) {
    try {
      const snapshot = await this.db
        .collection('reservations')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      const reservations = [];
      snapshot.forEach(doc => {
        reservations.push({ id: doc.id, ...doc.data() });
      });

      return reservations;
    } catch (error) {
      console.error('Error getting user reservations:', error);
      throw error;
    }
  }

  // 媛ㅻ윭由??덉빟 紐⑸줉 媛?몄삤湲?(媛ㅻ윭由??댁쁺?먯슜)
  async getGalleryReservations(galleryId) {
    try {
      const snapshot = await this.db
        .collection('reservations')
        .where('galleryId', '==', galleryId)
        .orderBy('createdAt', 'desc')
        .get();

      const reservations = [];
      snapshot.forEach(doc => {
        reservations.push({ id: doc.id, ...doc.data() });
      });

      return reservations;
    } catch (error) {
      console.error('Error getting gallery reservations:', error);
      throw error;
    }
  }

  // ?덉빟 ?곹깭 ?낅뜲?댄듃
  async updateReservationStatus(reservationId, status) {
    try {
      await this.db.collection('reservations').doc(reservationId).update({
        status,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating reservation status:', error);
      throw error;
    }
  }

  // ========== 由щ럭 愿??硫붿꽌??==========

  // 由щ럭 ?묒꽦
  async createReview(reviewData) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const review = {
        ...reviewData,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await this.db.collection('reviews').add(review);

      // 媛ㅻ윭由??됱젏 ?낅뜲?댄듃
      await this.updateGalleryRating(reviewData.galleryId);

      return { id: docRef.id, ...review };
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  // 媛ㅻ윭由?由щ럭 紐⑸줉 媛?몄삤湲?
  async getGalleryReviews(galleryId) {
    try {
      const snapshot = await this.db
        .collection('reviews')
        .where('galleryId', '==', galleryId)
        .orderBy('createdAt', 'desc')
        .get();

      const reviews = [];
      snapshot.forEach(doc => {
        reviews.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        });
      });

      return reviews;
    } catch (error) {
      console.error('Error getting gallery reviews:', error);
      throw error;
    }
  }

  // ?ъ슜??由щ럭 紐⑸줉 媛?몄삤湲?
  async getUserReviews(userId) {
    try {
      const snapshot = await this.db
        .collection('reviews')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      const reviews = [];
      snapshot.forEach(doc => {
        reviews.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        });
      });

      return reviews;
    } catch (error) {
      console.error('Error getting user reviews:', error);
      throw error;
    }
  }

  // 媛ㅻ윭由??됱젏 ?낅뜲?댄듃
  async updateGalleryRating(galleryId) {
    try {
      const reviews = await this.getGalleryReviews(galleryId);

      if (reviews.length === 0) {
        await this.db.collection('galleries').doc(galleryId).update({
          rating: 0,
          reviewCount: 0,
        });
        return;
      }

      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      await this.db.collection('galleries').doc(galleryId).update({
        rating: averageRating,
        reviewCount: reviews.length,
      });
    } catch (error) {
      console.error('Error updating gallery rating:', error);
    }
  }

  // ========== 梨꾪똿 愿??硫붿꽌??==========

  // 梨꾪똿諛??앹꽦
  async createChatRoom(galleryId, ownerId) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // ?대? 議댁옱?섎뒗 梨꾪똿諛??뺤씤
      const existingRoomQuery = await this.db
        .collection('chatRooms')
        .where('participants', 'array-contains', currentUser.uid)
        .get();

      for (const doc of existingRoomQuery.docs) {
        const roomData = doc.data();
        if (roomData.participants.includes(ownerId) && roomData.galleryId === galleryId) {
          return { id: doc.id, ...roomData };
        }
      }

      // ??梨꾪똿諛??앹꽦
      const chatRoom = {
        galleryId,
        participants: [currentUser.uid, ownerId],
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastMessage: '',
        lastMessageTime: firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await this.db.collection('chatRooms').add(chatRoom);
      return { id: docRef.id, ...chatRoom };
    } catch (error) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  }

  // 硫붿떆吏 ?꾩넚
  async sendMessage(chatRoomId, message) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const messageData = {
        senderId: currentUser.uid,
        text: message,
        timestamp: firestore.FieldValue.serverTimestamp(),
        read: false,
      };

      // 硫붿떆吏 異붽?
      await this.db
        .collection('chatRooms')
        .doc(chatRoomId)
        .collection('messages')
        .add(messageData);

      // 梨꾪똿諛??낅뜲?댄듃
      await this.db.collection('chatRooms').doc(chatRoomId).update({
        lastMessage: message,
        lastMessageTime: firestore.FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // 梨꾪똿 硫붿떆吏 媛?몄삤湲?
  async getChatMessages(chatRoomId) {
    try {
      const snapshot = await this.db
        .collection('chatRooms')
        .doc(chatRoomId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .get();

      const messages = [];
      snapshot.forEach(doc => {
        messages.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
        });
      });

      return messages;
    } catch (error) {
      console.error('Error getting chat messages:', error);
      throw error;
    }
  }

  // ?ъ슜??梨꾪똿諛?紐⑸줉 媛?몄삤湲?
  async getUserChatRooms(userId) {
    try {
      const snapshot = await this.db
        .collection('chatRooms')
        .where('participants', 'array-contains', userId)
        .orderBy('lastMessageTime', 'desc')
        .get();

      const chatRooms = [];
      snapshot.forEach(doc => {
        chatRooms.push({
          id: doc.id,
          ...doc.data(),
          lastMessageTime: doc.data().lastMessageTime?.toDate(),
        });
      });

      return chatRooms;
    } catch (error) {
      console.error('Error getting user chat rooms:', error);
      throw error;
    }
  }

  // ========== ??쒕낫???곗씠??==========

  async getOwnerDashboardStats(ownerId) {
    try {
      // 媛ㅻ윭由?紐⑸줉 媛?몄삤湲?
      const galleries = await this.getGalleries({ ownerId });
      const galleryIds = galleries.map(g => g.id);

      if (galleryIds.length === 0) {
        return {
          totalBookings: 0,
          todayBookings: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          activeGalleries: 0,
          pendingBookings: 0,
          recentBookings: [],
          unreadMessages: 0,
        };
      }

      // ?덉빟 ?듦퀎
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      let allReservations = [];
      for (const galleryId of galleryIds) {
        const reservations = await this.getGalleryReservations(galleryId);
        allReservations = [...allReservations, ...reservations];
      }

      const todayBookings = allReservations.filter(r => {
        const bookingDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
        return bookingDate >= today;
      }).length;

      const pendingBookings = allReservations.filter(r => r.status === 'pending').length;

      const recentBookings = allReservations
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        })
        .slice(0, 5);

      // ?섏씡 怨꾩궛 (?덉빟??totalAmount ?꾨뱶媛 ?덈떎怨?媛??
      const totalRevenue = allReservations
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + (r.totalAmount || 0), 0);

      const monthlyRevenue = allReservations
        .filter(r => {
          const bookingDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
          return bookingDate >= thisMonth && r.status === 'completed';
        })
        .reduce((sum, r) => sum + (r.totalAmount || 0), 0);

      // ?쎌? ?딆? 硫붿떆吏 ??(梨꾪똿諛⑹뿉??
      const chatRooms = await this.getUserChatRooms(ownerId);
      let unreadMessages = 0;
      for (const room of chatRooms) {
        const messages = await this.db
          .collection('chatRooms')
          .doc(room.id)
          .collection('messages')
          .where('senderId', '!=', ownerId)
          .where('read', '==', false)
          .get();
        unreadMessages += messages.size;
      }

      return {
        totalBookings: allReservations.length,
        todayBookings,
        totalRevenue,
        monthlyRevenue,
        activeGalleries: galleries.length,
        pendingBookings,
        recentBookings,
        unreadMessages,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }
}

export default FirebaseService;
