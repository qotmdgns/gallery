import React, { useEffect, useRef, lazy, Suspense } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import useLoginStore from './store/useLoginStore';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './screens/SplashScreen';

const LoginScreen = lazy(() => import('./screens/LoginScreen'));
const SignupScreen = lazy(() => import('./screens/SignupScreen'));
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const GallerySearchScreen = lazy(() => import('./screens/GallerySearchScreen'));
const BookingHistoryScreen = lazy(() => import('./screens/BookingHistoryScreen'));
const ChatListScreen = lazy(() => import('./screens/ChatListScreen'));
const MyPageScreen = lazy(() => import('./screens/MyPageScreen'));
const OwnerDashboardScreen = lazy(() => import('./screens/OwnerDashboardScreen'));
const ManageGalleryScreen = lazy(() => import('./screens/ManageGalleryScreen'));
const ManageBookingsScreen = lazy(() => import('./screens/ManageBookingsScreen'));
const RevenusScreen = lazy(() => import('./screens/RevenusScreen'));
const GalleryDetailScreen = lazy(() => import('./screens/GalleryDetailScreen'));
const ReservationScreen = lazy(() => import('./screens/ReservationScreen'));
const ChatDetailScreen = lazy(() => import('./screens/ChatDetailScreen'));
const ProfileEditScreen = lazy(() => import('./screens/ProfileEditScreen'));
const GalleryRegisterScreen = lazy(() => import('./screens/GalleryRegisterScreen'));
const EditGalleryScreen = lazy(() => import('./screens/EditGalleryScreen'));
const PhotosScreen = lazy(() => import('./screens/PhotosScreen'));
const WriteReviewScreen = lazy(() => import('./screens/WriteReviewScreen'));
const ReviewListScreen = lazy(() => import('./screens/ReviewListScreen'));
const MyReviewsScreen = lazy(() => import('./screens/MyReviewsScreen'));
const FavoriteGalleriesScreen = lazy(() => import('./screens/FavoriteGalleriesScreen'));
const ReservationCalendarScreen = lazy(() => import('./screens/ReservationCalendarScreen'));
const ReservationSettingsScreen = lazy(() => import('./screens/ReservationSettingsScreen'));
const NotificationSettingsScreen = lazy(() => import('./screens/NotificationSettingsScreen'));
const FindEmailScreen = lazy(() => import('./screens/FindEmailScreen'));
const ResetPasswordScreen = lazy(() => import('./screens/ResetPasswordScreen'));
const EmailVerificationScreen = lazy(() => import('./screens/EmailVerificationScreen'));
const PhoneVerificationScreen = lazy(() => import('./screens/PhoneVerificationScreen'));
const ArtistProfileScreen = lazy(() => import('./screens/ArtistProfileScreen'));
const ArtistPortfolioScreen = lazy(() => import('./screens/ArtistPortfolioScreen'));
const ArtistSearchScreen = lazy(() => import('./screens/ArtistSearchScreen'));
const ExhibitionProposalScreen = lazy(() => import('./screens/ExhibitionProposalScreen'));
const EditMyGalleryScreen = lazy(() => import('./screens/EditMyGalleryScreen'));
const ArtworkUploadScreen = lazy(() => import('./screens/ArtworkUploadScreen'));
const ArtworkListScreen = lazy(() => import('./screens/ArtworkListScreen'));
const ArtworkDetailScreen = lazy(() => import('./screens/ArtworkDetailScreen'));
const ArtworkEditScreen = lazy(() => import('./screens/ArtworkEditScreen'));
const ManualBookingScreen = lazy(() => import('./screens/ManualBookingScreen'));
const BookingDetailScreen = lazy(() => import('./screens/BookingDetailScreen'));

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#4B7BFF" />
  </View>
);

const withSuspense = (Component) => (props) => (
  <Suspense fallback={<LoadingScreen />}>
    <Component {...props} />
  </Suspense>
);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator 
      screenOptions={{ 
        headerShown: true,
        headerTintColor: '#4B7BFF',
        headerBackTitle: '뒤로',
      }}
    >
      <AuthStack.Screen
        name="Login"
        component={withSuspense(LoginScreen)} 
        options={{ 
          title: '로그인',
          headerShown: false 
        }} 
      />
      <AuthStack.Screen
        name="Signup"
        component={withSuspense(SignupScreen)} 
        options={{ 
          title: '회원가입' 
        }} 
      />
      <AuthStack.Screen
        name="FindEmail"
        component={withSuspense(FindEmailScreen)} 
        options={{ 
          title: '이메일 찾기',
          headerShown: false
        }} 
      />
      <AuthStack.Screen
        name="ResetPassword"
        component={withSuspense(ResetPasswordScreen)} 
        options={{ 
          title: '비밀번호 재설정',
          headerShown: false
        }} 
      />
      <AuthStack.Screen
        name="EmailVerification"
        component={withSuspense(EmailVerificationScreen)} 
        options={{ 
          title: '이메일 인증',
          headerShown: false
        }} 
      />
      <AuthStack.Screen
        name="PhoneVerification"
        component={withSuspense(PhoneVerificationScreen)} 
        options={{ 
          title: '전화번호 인증',
          headerShown: false
        }} 
      />
    </AuthStack.Navigator>
  );
}

function UserTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Search') {
            iconName = 'search';
          } else if (route.name === 'Bookings') {
            iconName = 'event';
          } else if (route.name === 'Chat') {
            iconName = 'chat';
          } else if (route.name === 'MyPage') {
            iconName = 'person';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4B7BFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        headerLeft: () => 
          navigation.canGoBack() ? (
            <Icon 
              name="arrow-back" 
              size={24} 
              color="#4B7BFF" 
              style={{ marginLeft: 10 }}
              onPress={() => navigation.goBack()}
            />
          ) : null,
        headerTintColor: '#4B7BFF',
      })}
    >
      <Tab.Screen name="Home" component={withSuspense(HomeScreen)} options={{ title: '홈', headerTitle: '홈' }} />
      <Tab.Screen name="Search" component={withSuspense(GallerySearchScreen)} options={{ title: '검색', headerTitle: '갤러리 검색' }} />
      <Tab.Screen name="Bookings" component={withSuspense(BookingHistoryScreen)} options={{ title: '예약', headerTitle: '예약 내역' }} />
      <Tab.Screen name="Chat" component={withSuspense(ChatListScreen)} options={{ title: '채팅', headerTitle: '채팅' }} />
      <Tab.Screen name="MyPage" component={withSuspense(MyPageScreen)} options={{ title: '마이페이지', headerTitle: '마이페이지' }} />
    </Tab.Navigator>
  );
}

function OwnerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Gallery') {
            iconName = 'store';
          } else if (route.name === 'Artists') {
            iconName = 'palette';
          } else if (route.name === 'Bookings') {
            iconName = 'event-note';
          } else if (route.name === 'Chat') {
            iconName = 'chat';
          } else if (route.name === 'MyPage') {
            iconName = 'person';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4B7BFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        headerLeft: () => 
          navigation.canGoBack() ? (
            <Icon 
              name="arrow-back" 
              size={24} 
              color="#4B7BFF" 
              style={{ marginLeft: 10 }}
              onPress={() => navigation.goBack()}
            />
          ) : null,
        headerTintColor: '#4B7BFF',
      })}
    >
      <Tab.Screen name="Dashboard" component={withSuspense(OwnerDashboardScreen)} options={{ title: '대시보드', headerTitle: '대시보드' }} />
      <Tab.Screen name="Gallery" component={withSuspense(ManageGalleryScreen)} options={{ title: '갤러리', headerTitle: '갤러리 관리' }} />
      <Tab.Screen name="Artists" component={withSuspense(ArtistSearchScreen)} options={{ title: '아티스트', headerTitle: '아티스트 찾기' }} />
      <Tab.Screen name="Bookings" component={withSuspense(ManageBookingsScreen)} options={{ title: '예약관리', headerTitle: '예약 관리' }} />
      <Tab.Screen
        name="Chat"
        component={withSuspense(ChatListScreen)}
        options={{ title: '채팅', headerTitle: '문의 관리' }}
        initialParams={{ viewMode: 'owner' }}
      />
      <Tab.Screen name="MyPage" component={withSuspense(MyPageScreen)} options={{ title: '마이페이지', headerTitle: '마이페이지' }} />
    </Tab.Navigator>
  );
}

function ArtistTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Portfolio') {
            iconName = 'photo-library';
          } else if (route.name === 'Search') {
            iconName = 'search';
          } else if (route.name === 'Chat') {
            iconName = 'chat';
          } else if (route.name === 'MyPage') {
            iconName = 'person';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4B7BFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        headerLeft: () => 
          navigation.canGoBack() ? (
            <Icon 
              name="arrow-back" 
              size={24} 
              color="#4B7BFF" 
              style={{ marginLeft: 10 }}
              onPress={() => navigation.goBack()}
            />
          ) : null,
        headerTintColor: '#4B7BFF',
      })}
    >
      <Tab.Screen name="Home" component={withSuspense(HomeScreen)} options={{ title: '홈', headerTitle: '홈' }} />
      <Tab.Screen name="Portfolio" component={withSuspense(ArtistPortfolioScreen)} options={{ title: '작품', headerTitle: '작품' }} />
      <Tab.Screen name="Search" component={withSuspense(GallerySearchScreen)} options={{ title: '갤러리', headerTitle: '갤러리 찾기' }} />
      <Tab.Screen name="Chat" component={withSuspense(ChatListScreen)} options={{ title: '채팅', headerTitle: '채팅' }} />
      <Tab.Screen name="MyPage" component={withSuspense(ArtistProfileScreen)} options={{ title: '프로필', headerTitle: '내 프로필' }} />
    </Tab.Navigator>
  );
}

function MainNavigator() {
  const { userType } = useLoginStore();
  
  const getTabNavigator = () => {
    switch(userType) {
      case 'owner':
        return OwnerTabNavigator;
      case 'artist':
        return ArtistTabNavigator;
      default:
        return UserTabNavigator;
    }
  };
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: '뒤로',
        headerTintColor: '#4B7BFF',
      }}
    >
      <Stack.Screen 
        name="Main" 
        component={getTabNavigator()}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GalleryDetail"
        component={withSuspense(GalleryDetailScreen)}
        options={{ title: '갤러리 상세' }}
      />
      <Stack.Screen
        name="GallerySearch"
        component={withSuspense(GallerySearchScreen)}
        options={{ title: '갤러리 찾기' }}
      />
      <Stack.Screen
        name="Reservation"
        component={withSuspense(ReservationCalendarScreen)}
        options={{ title: '예약하기' }}
      />
      <Stack.Screen
        name="ChatDetail"
        component={withSuspense(ChatDetailScreen)}
        options={{ title: '채팅' }}
      />
      <Stack.Screen
        name="ProfileEdit"
        component={withSuspense(ProfileEditScreen)}
        options={{ title: '프로필 수정' }}
      />
      <Stack.Screen
        name="GalleryRegister"
        component={withSuspense(GalleryRegisterScreen)}
        options={{ title: '갤러리 등록' }}
      />
      <Stack.Screen
        name="EditGallery"
        component={withSuspense(EditGalleryScreen)}
        options={{ title: '갤러리 수정' }}
      />
      <Stack.Screen
        name="Photos"
        component={withSuspense(PhotosScreen)}
        options={{ title: '사진' }}
      />
      <Stack.Screen
        name="WriteReview"
        component={withSuspense(WriteReviewScreen)}
        options={{ title: '리뷰 작성' }}
      />
      <Stack.Screen
        name="ReviewList"
        component={withSuspense(ReviewListScreen)}
        options={{ title: '리뷰' }}
      />
      <Stack.Screen
        name="MyReviews"
        component={withSuspense(MyReviewsScreen)}
        options={{ title: '내가 쓴 리뷰' }}
      />
      <Stack.Screen
        name="FavoriteGalleries"
        component={withSuspense(FavoriteGalleriesScreen)}
        options={{ title: '찜한 갤러리' }}
      />
      <Stack.Screen
        name="BookingHistory"
        component={withSuspense(BookingHistoryScreen)}
        options={{ title: '예약 내역' }}
      />
      <Stack.Screen
        name="ManageGalleries"
        component={withSuspense(ManageGalleryScreen)}
        options={{ title: '내 갤러리 관리' }}
      />
      <Stack.Screen
        name="Revenus"
        component={withSuspense(RevenusScreen)}
        options={{ title: '수익 관리' }}
      />
      <Stack.Screen
        name="ReservationSettings"
        component={withSuspense(ReservationSettingsScreen)}
        options={{ title: '예약 설정' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={withSuspense(NotificationSettingsScreen)}
        options={{ title: '알림 설정' }}
      />
      <Stack.Screen
        name="EmailVerification"
        component={withSuspense(EmailVerificationScreen)}
        options={{
          title: '이메일 인증',
          headerShown: false
        }}
      />
      <Stack.Screen
        name="PhoneVerification"
        component={withSuspense(PhoneVerificationScreen)}
        options={{
          title: '전화번호 인증',
          headerShown: false
        }}
      />
      <Stack.Screen
        name="ArtistProfile"
        component={withSuspense(ArtistProfileScreen)}
        options={{ title: '아티스트 프로필' }}
      />
      <Stack.Screen
        name="ArtistPortfolio"
        component={withSuspense(ArtistPortfolioScreen)}
        options={{ title: '작품' }}
      />
      <Stack.Screen
        name="ArtistSearch"
        component={withSuspense(ArtistSearchScreen)}
        options={{ title: '아티스트 찾기' }}
      />
      <Stack.Screen
        name="ExhibitionProposal"
        component={withSuspense(ExhibitionProposalScreen)}
        options={{ title: '전시 제안' }}
      />
      <Stack.Screen
        name="ArtworkUpload"
        component={withSuspense(ArtworkUploadScreen)}
        options={{ title: '작품 업로드' }}
      />
      <Stack.Screen
        name="ArtworkList"
        component={withSuspense(ArtworkListScreen)}
        options={{ title: '내 작품 관리' }}
      />
      <Stack.Screen
        name="ArtworkDetail"
        component={withSuspense(ArtworkDetailScreen)}
        options={{ title: '작품 상세' }}
      />
      <Stack.Screen
        name="ArtworkEdit"
        component={withSuspense(ArtworkEditScreen)}
        options={{ title: '작품 수정' }}
      />
      <Stack.Screen
        name="EditMyGallery"
        component={withSuspense(EditMyGalleryScreen)}
        options={{ title: '갤러리 수정' }}
      />
      <Stack.Screen
        name="ManualBooking"
        component={withSuspense(ManualBookingScreen)}
        options={{ title: '예약 직접 등록' }}
      />
      <Stack.Screen
        name="BookingDetail"
        component={withSuspense(BookingDetailScreen)}
        options={{ title: '예약 상세', headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { isLoggedIn } = useLoginStore();
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="MainApp" component={MainNavigator} />
      <Stack.Screen name="Auth" component={AuthNavigator} />
    </Stack.Navigator>
  );
}

let NotificationService = null;
let initSentry = null;
let setSentryUser = null;
let setupGlobalErrorHandler = null;

export default function App() {
  const [isReady, setIsReady] = React.useState(false);
  const navigationRef = useRef(null);
  const { isLoggedIn, userName } = useLoginStore();

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      setIsReady(true);
      return undefined;
    }

    const initializeApp = async () => {
      try {
        const [sentryModule, errorModule, notificationModule] = await Promise.all([
          import('./config/sentryConfig'),
          import('./utils/errorHandler'),
          import('./services/NotificationService')
        ]);

        initSentry = sentryModule.initSentry;
        setSentryUser = sentryModule.setSentryUser;
        setupGlobalErrorHandler = errorModule.setupGlobalErrorHandler;
        NotificationService = notificationModule.default;

        initSentry();
        setupGlobalErrorHandler();

        const notificationService = new NotificationService();
        await notificationService.initialize();

        notificationService.navigateToScreen = (screen, params) => {
          if (navigationRef.current?.isReady()) {
            navigationRef.current.navigate(screen, params);
          }
        };

        window.notificationServiceInstance = notificationService;

        setTimeout(() => {
          setIsReady(true);
        }, 100);
      } catch (error) {
        console.error('앱 초기화 실패:', error);
        setIsReady(true);
      }
    };

    initializeApp();

    return () => {
      if (window.notificationServiceInstance) {
        window.notificationServiceInstance.cleanup();
      }
    };
  }, []);

  useEffect(() => {
    if (setSentryUser) {
      if (isLoggedIn && userName) {
        setSentryUser({
          uid: userName,
          displayName: userName,
        });
      } else {
        setSentryUser(null);
      }
    }
  }, [isLoggedIn, userName]);

  if (!isReady) {
    return null; // 또는 로딩 컴포넌트
  }

  return (
    <ErrorBoundary navigation={navigationRef.current}>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </ErrorBoundary>
  );
}
