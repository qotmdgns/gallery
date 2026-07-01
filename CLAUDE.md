# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React Native 0.80.1 gallery booking platform with three user roles and AI-powered search:
- **Regular users**: AI-assisted gallery search, bookings, chat, reviews
- **Gallery owners**: Gallery management, booking management (including manual entry), revenue tracking, artist discovery
- **Artists**: Portfolio management, gallery search, exhibition proposals

## Development Commands

```bash
# Install dependencies
npm install

# Start Metro bundler (always required before running app)
npm start

# Start with cache reset (use after environment variable changes)
npm start -- --reset-cache

# Run on Android
npm run android

# Run on iOS (requires GoogleService-Info.plist in ios/ - currently missing)
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios

# Run ESLint
npm run lint

# Run tests
npm test

# Run specific test file
npm test -- __tests__/App.test.tsx
```

## Architecture

### Navigation Flow (`src/App.js`)
```
RootNavigator
├── SplashScreen (initial)
├── AuthNavigator (unauthenticated)
│   ├── LoginScreen
│   ├── SignupScreen
│   ├── FindEmailScreen
│   ├── ResetPasswordScreen
│   ├── EmailVerificationScreen
│   └── PhoneVerificationScreen
└── MainNavigator (authenticated)
    ├── UserTabNavigator (userType: 'user')
    ├── OwnerTabNavigator (userType: 'owner')
    ├── ArtistTabNavigator (userType: 'artist')
    └── Stack screens (shared across all user types)
```

### State Management
**Zustand Store** (`src/store/useLoginStore.js`):
```javascript
import useLoginStore from '../store/useLoginStore'; // Default export

const { isLoggedIn, userType, userName, userId } = useLoginStore();
const { logined, logout } = useLoginStore();

// userType values: 'user' | 'owner' | 'artist'
```

### Firebase Integration

**Configuration** (`src/config/firebaseConfig.js`):
- Project ID: `galleryproject-e61c4`
- Auto-initialized on import
- Android: `android/app/google-services.json` ✓
- iOS: `ios/GoogleService-Info.plist` ✗ (missing)

**Service Classes**:

1. **FirebaseService** (`src/services/FirebaseService.js`):
   - Centralized Firebase operations with retry logic (3 attempts, exponential backoff)
   - Methods organized by domain: artworks, users, galleries, reservations, reviews, chat, dashboard
   - Import: `import FirebaseService from '../services/FirebaseService';`

2. **FirestoreManager** (`src/utils/firestoreManager.js`):
   - Alternative abstraction with schema validation and client-side caching (5-min TTL)
   - Handles missing composite indexes with fallback queries
   - Import: `import { firestoreManager } from '../utils/firestoreManager';`

### Firestore Schema

| Collection | Key Fields | Description |
|------------|------------|-------------|
| `users` | userId, userType, email, displayName, phoneNumber, phoneNumberVerified, realEmail, realEmailVerified, favoriteGalleries[], fcmToken, bio | User profiles with verification status |
| `galleries` | ownerId, name, location, images[], rating, reviewCount | Gallery information |
| `reservations` | galleryId, userId, date, status, isManualBooking, startDate, endDate | Booking records |
| `reviews` | galleryId, userId, rating, content, createdAt | Gallery reviews |
| `chatRooms` | participants[], lastMessage, lastMessageTime, unreadCount | Chat metadata |
| `chatRooms/{id}/messages` | senderId, text, imageUrl, timestamp, read | Chat messages (subcollection) |
| `artists` | artistId, portfolio[], exhibitions[] | Artist profiles |
| `artworks` | artistId, imageUrl, title, price, status | Artist artworks |
| `email_verifications` | code, email, expiresAt, verified | Email verification tokens |
| `notifications` | to, type, title, body, data | Push notification queue |

### Screen Components (40 total)

Screens are organized by feature area in `src/screens/`:
- Authentication flow (6 screens)
- Gallery management (10 screens including ManualBookingScreen)
- Booking system (6 screens)
- Review system (3 screens)
- Chat functionality (3 screens)
- User profiles (3 screens)
- Owner dashboard (2 screens)
- Artist features (6 screens)
- Home screen

### Critical Import Patterns

```javascript
// Firebase modular imports (v22.4.0 - deprecation warnings expected until v23 migration)
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';

// Firebase service classes
import FirebaseService from '../services/FirebaseService';
import { firestoreManager } from '../utils/firestoreManager';

// Gemini AI service (requires GEMINI_API_KEY in .env)
import GeminiService from '../services/GeminiService';

// Environment variables (via react-native-dotenv)
import { GEMINI_API_KEY } from '@env';

// AsyncStorage (for chat message persistence and FCM tokens)
import AsyncStorage from '@react-native-async-storage/async-storage';

// Date picker (for booking calendar)
import DateTimePicker from '@react-native-community/datetimepicker';

// ALWAYS use KoreanTextInput instead of TextInput for Korean language support
import KoreanTextInput from '../components/KoreanTextInput';
```

### Error Handling Architecture

**Global Error Handler** (`src/utils/errorHandler.js`):
- Error categorization and user-friendly messages
- Retry logic for transient failures (network, server errors)
- Integration with Sentry for production monitoring
- Classification: Network, Auth, Validation, Permission, Server, Client, Unknown

**Error Boundary** (`src/components/ErrorBoundary.js`):
- Wraps entire app in App.js
- Catches React component errors
- Provides fallback UI with reset option

**Loading/Error Components** (`src/components/LoadingErrorHandler.js`):
- `useLoadingError` hook for consistent error handling
- Pre-built loading, error, empty, and offline views

## Environment Variables

**Setup** (`.env` file in project root):
```bash
# Copy example file
cp .env.example .env

# Add your Gemini API key (get from https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=AIzaSy...your_actual_key
```

**Important**:
- Use `react-native-dotenv` (configured in `babel.config.js`)
- Import via: `import { GEMINI_API_KEY } from '@env';`
- After changing `.env`, restart Metro with cache reset: `npm start -- --reset-cache`
- `.env` is gitignored (use `.env.example` for documentation)

## Gemini AI Integration

**Model**: `gemini-2.0-flash-exp` (as of 2025 - Gemini 1.x models retired April 2025)

**Service** (`src/services/GeminiService.js`):
- Singleton instance with auto-initialization
- Methods:
  - `extractKeywordsFromQuery()` - Multi-stage keyword extraction
  - `sendMessage()` - Conversational search
  - `getGalleryRecommendations()` - Preference-based recommendations
  - `analyzeUserQuery()` - Intent detection
- Throws `API_KEY_NOT_SET` error if GEMINI_API_KEY is not configured

**Gallery Search Flow**:
1. User enters conversational query
2. Gemini extracts keywords (location, category, price, atmosphere)
3. Results filter dynamically based on accumulated selections
4. Reset buttons appear for partial condition removal

## Key Services

### ChatService (`src/services/ChatService.js`)
- Static methods for chat operations
- Room ID format: `{userId}_{galleryId}`
- Handles unread counts, message ordering, image uploads
- Extensive debug logging for troubleshooting

### NotificationService (`src/services/NotificationService.js`)
- FCM token management
- Android notification channels (booking, reminder, chat, promotion, system)
- Booking reminders: 4 timing options (day before, morning of, 1 hour, 30 min)
- Badge count management (iOS)

### Authentication & Verification
**Phone Verification**:
- Uses Firebase Phone Authentication with SMS
- Test mode available: `010-1234-5678` with code `123456`
- International format: converts `010-xxxx-xxxx` to `+8210xxxxxxxx`
- Verified phone numbers are locked from editing in profile
- `sendPhoneVerification()` and `verifyPhoneCode()` in FirebaseService

**Email Verification**:
- Primary email: Firebase Auth email verification
- Additional email: Custom verification with 6-digit code (10-min expiry)
- Verification codes stored in `email_verifications` collection
- `sendRealEmailVerification()` and `verifyRealEmailCode()` in FirebaseService
- Both verified emails display in profile with green badges

**Profile Integration** (`ProfileEditScreen.js`):
- Auto-loads verified phone and email on screen focus
- Phone number format conversion: `+8210xxxxxxxx` → `010-xxxx-xxxx`
- Verification status tracked: `phoneNumberVerified`, `realEmailVerified`
- Users can initiate verification from profile edit screen
- Changes auto-reflect after verification completes

### Manual Booking Feature (Gallery Owners)
The `ManualBookingScreen` allows owners to create bookings without customer app usage:
- Date range selection (startDate/endDate, not single dates)
- Customer info: name, phone, email
- Payment status tracking
- Guest count management
- Notes field for special requests

## Adding New Features

### Adding a New Screen
1. Create component in `src/screens/`
2. Add lazy import at top of `src/App.js`: `const NewScreen = lazy(() => import('./screens/NewScreen'));`
3. Add route to appropriate navigator (AuthNavigator, UserTabNavigator, OwnerTabNavigator, ArtistTabNavigator, or MainNavigator stack)
4. Component will auto-wrap with `withSuspense()` for code splitting

### Firestore Query Patterns
```javascript
// Batch queries (max 10 items per 'in' query)
const batchSize = 10;
for (let i = 0; i < ids.length; i += batchSize) {
  const batch = ids.slice(i, i + batchSize);
  const snapshot = await firestore()
    .collection('reservations')
    .where('galleryId', 'in', batch)
    .get();
}

// Handle missing composite indexes
try {
  // Try with orderBy (requires composite index)
  const snapshot = await query.orderBy('createdAt', 'desc').get();
} catch (error) {
  if (error.code === 'failed-precondition') {
    // Fallback without orderBy
    const snapshot = await query.get();
    // Sort client-side
    const sorted = snapshot.docs.sort((a, b) =>
      b.data().createdAt - a.data().createdAt
    );
  }
}
```

### Platform-Specific Code
```javascript
import { Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
    // iOS-specific shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
      },
      android: {
        elevation: 5,
      },
    }),
  },
});
```

## Known Issues & Solutions

### Jest Configuration
Add to `jest.config.js` for React Navigation:
```javascript
transformIgnorePatterns: [
  'node_modules/(?!(react-native|@react-native|@react-navigation)/)'
]
```

### React Hook Dependencies
Either fix with `useCallback` or suppress:
```javascript
// eslint-disable-next-line react-hooks/exhaustive-deps
```

### Firestore Limitations
- Maximum 10 items in `in` queries - use batching
- Composite indexes required for compound queries with orderBy
- Client-side sorting fallback when indexes unavailable

### Korean Input Handling (CRITICAL)
**ALWAYS** use `KoreanTextInput` instead of React Native's `TextInput` for any user input:
```javascript
import KoreanTextInput from '../components/KoreanTextInput';

<KoreanTextInput
  value={text}
  onChangeText={setText}
  placeholder="한글 입력"
  multiline={false}  // optional
/>
```

**Why**: React Native's default TextInput has issues with Korean character composition (jamo). KoreanTextInput handles:
- Proper Korean character rendering
- Disables autocorrect/autocomplete that interferes with Korean input
- Platform-specific fixes for Android/iOS Korean keyboards

### Firebase Deprecation Warnings
React Native Firebase v22.4.0 shows deprecation warnings about namespaced API:
- **Current status**: Warnings are safe to ignore - code works correctly
- **Action required**: None until upgrading to v23+
- **Future migration**: v23 will require switching to modular API (similar to Firebase Web SDK v9)

Current pattern (v22 - correct):
```javascript
const snapshot = await firestore().collection('users').doc('userId').get();
```

Future pattern (v23+ - not yet implemented):
```javascript
import { getFirestore, collection, doc, getDoc } from '@react-native-firebase/firestore';
const db = getFirestore();
const snapshot = await getDoc(doc(db, 'users', 'userId'));
```

## Chat Room ID Convention
Chat rooms use deterministic ID format: `{userId}_{galleryId}`
- Ensures single conversation per user-gallery pair
- Created via `ChatService.createOrGetChatRoom()`
- Messages stored in subcollection: `chatRooms/{roomId}/messages`

## Performance Optimizations
- **Code Splitting**: All 40+ screens lazy-loaded with Suspense
- **Caching**: 5-minute TTL in FirestoreManager for frequent queries
- **Batching**: Firestore queries batch by 10 items max
- **Metro Config**: Terser minification with `keep_fnames: true` for debugging

## Dependencies & Requirements

- Node.js 18+
- React Native 0.80.1
- React 19.1.0
- @react-native-firebase/* 22.4.0
- @google/generative-ai 0.24.1
- zustand 5.0.7
- Platform minimum versions:
  - Android: minSdkVersion 23
  - iOS: iOS 13.4+

## Troubleshooting

### Metro bundler not picking up .env changes
```bash
npm start -- --reset-cache
```

### Korean text not displaying in TextInput
Replace `<TextInput>` with `<KoreanTextInput>` from `src/components/KoreanTextInput.js`

### Gemini API 404 errors
- Check model name is `gemini-2.0-flash-exp` (older models like `gemini-pro`, `gemini-1.5-flash` retired in 2025)
- Verify GEMINI_API_KEY is set in `.env`
- Restart Metro with cache reset after .env changes

### Chat debugging
ChatService includes extensive logging. Check console for:
- Room creation details
- Message send/receive events
- Undefined field warnings
- Participant type mismatches

### Fast Refresh after code changes
- **Android**: Press `R` twice in terminal, or `Ctrl+M` then select "Reload"
- **iOS**: Press `R` in simulator

## File Structure
```
MyApp/
├── src/
│   ├── App.js                 # Navigation setup, lazy loading
│   ├── screens/               # 40 screen components
│   ├── components/            # Reusable UI components
│   ├── services/              # Firebase, Gemini, Chat, Notification services
│   ├── config/                # Firebase, Sentry configuration
│   ├── store/                 # Zustand state management
│   └── utils/                 # Error handling, FirestoreManager, helpers
├── functions/                 # Firebase Cloud Functions
├── android/                   # Android native code
├── ios/                      # iOS native code (missing GoogleService-Info.plist)
└── __tests__/                # Jest test files
```