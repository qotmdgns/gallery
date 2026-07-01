/**
 * Seed Data Generator
 *
 * 개발 및 테스트를 위한 시드 데이터 생성 함수들
 * 실제 같은 데이터로 Firestore를 채웁니다.
 */

import firestoreManager from './FirestoreManager';
import { UserTypes, ReservationStatus, ExhibitionStatus } from './schemas';
import auth from '@react-native-firebase/auth';

// 랜덤 헬퍼 함수들
const random = {
  pick: (array) => array[Math.floor(Math.random() * array.length)],
  number: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  boolean: () => Math.random() < 0.5,
  date: (daysFromNow = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  },
  phoneNumber: () => `010-${random.number(1000, 9999)}-${random.number(1000, 9999)}`,
  email: (name) => `${name.toLowerCase().replace(' ', '.')}@example.com`,
};

// 샘플 데이터
const sampleData = {
  // 갤러리 이름
  galleryNames: [
    '아트 스페이스 강남',
    '청담 갤러리',
    '한남동 예술공간',
    '성수 아트홀',
    '홍대 갤러리',
    '인사동 전시관',
    '북촌 아트센터',
    '서촌 갤러리',
    '이태원 스페이스',
    '삼청동 갤러리',
  ],

  // 지역
  locations: [
    '강남구',
    '서초구',
    '송파구',
    '마포구',
    '용산구',
    '종로구',
    '중구',
    '성동구',
    '강서구',
    '영등포구',
  ],

  // 상세 주소
  addresses: [
    '서울특별시 강남구 테헤란로 123',
    '서울특별시 서초구 강남대로 456',
    '서울특별시 송파구 올림픽로 789',
    '서울특별시 마포구 와우산로 321',
    '서울특별시 용산구 이태원로 654',
    '서울특별시 종로구 인사동길 987',
    '서울특별시 중구 명동길 147',
    '서울특별시 성동구 왕십리로 258',
    '서울특별시 강서구 공항대로 369',
    '서울특별시 영등포구 여의대로 741',
  ],

  // 갤러리 설명
  descriptions: [
    '현대 미술을 중심으로 다양한 전시를 기획하는 갤러리입니다.',
    '신진 작가들의 실험적인 작품을 소개하는 공간입니다.',
    '전통과 현대가 조화를 이루는 복합 문화 공간입니다.',
    '지역 예술가들과 함께 성장하는 커뮤니티 갤러리입니다.',
    '국내외 유명 작가들의 작품을 전시하는 전문 갤러리입니다.',
  ],

  // 카테고리
  categories: [
    '회화',
    '조각',
    '사진',
    '설치미술',
    '미디어아트',
    '공예',
    '판화',
    '서예',
    '일러스트',
    '디지털아트',
  ],

  // 아티스트 이름
  artistNames: [
    '김민수',
    '이서연',
    '박준호',
    '최지원',
    '정하늘',
    '강예진',
    '윤태양',
    '임소라',
    '한별이',
    '오달빛',
  ],

  // 아티스트 소개
  artistBios: [
    '자연과 인간의 조화를 탐구하는 작가입니다.',
    '도시의 일상을 독특한 시각으로 표현합니다.',
    '전통 기법을 현대적으로 재해석하는 작업을 합니다.',
    '색채와 형태의 실험을 통해 새로운 미학을 추구합니다.',
    '사회적 메시지를 예술로 전달하는 활동가입니다.',
  ],

  // 작품 제목
  artworkTitles: [
    '도시의 숨결',
    '자연의 속삭임',
    '시간의 흔적',
    '빛과 그림자',
    '내면의 풍경',
    '추상적 대화',
    '기억의 조각',
    '무한한 공간',
    '침묵의 소리',
    '색채의 향연',
  ],

  // 리뷰 내용
  reviewContents: [
    '정말 멋진 갤러리입니다. 작품 구성이 훌륭해요!',
    '조용하고 아늑한 분위기가 좋았습니다.',
    '직원분들이 친절하게 설명해주셔서 감사했어요.',
    '위치가 찾기 쉽고 접근성이 좋네요.',
    '다양한 작품을 볼 수 있어서 만족스러웠습니다.',
    '공간이 넓고 쾌적해서 관람하기 좋았어요.',
    '주차 시설이 잘 되어있어 편리했습니다.',
    '카페가 있어서 여유롭게 시간을 보낼 수 있었어요.',
    '정기적으로 방문하고 싶은 갤러리입니다.',
    '예술을 사랑하는 사람들에게 추천합니다.',
  ],

  // 이미지 URL (플레이스홀더)
  galleryImages: [
    'https://picsum.photos/800/600?random=1',
    'https://picsum.photos/800/600?random=2',
    'https://picsum.photos/800/600?random=3',
    'https://picsum.photos/800/600?random=4',
    'https://picsum.photos/800/600?random=5',
  ],

  artworkImages: [
    'https://picsum.photos/600/800?random=11',
    'https://picsum.photos/600/800?random=12',
    'https://picsum.photos/600/800?random=13',
    'https://picsum.photos/600/800?random=14',
    'https://picsum.photos/600/800?random=15',
  ],

  profileImages: [
    'https://picsum.photos/200/200?random=21',
    'https://picsum.photos/200/200?random=22',
    'https://picsum.photos/200/200?random=23',
    'https://picsum.photos/200/200?random=24',
    'https://picsum.photos/200/200?random=25',
  ],
};

/**
 * 사용자 생성
 */
export async function createSeedUsers(count = 10) {
  const users = [];

  try {
    for (let i = 0; i < count; i++) {
      const userType = random.pick(Object.values(UserTypes));
      const displayName = random.pick(sampleData.artistNames) + i;

      const userData = {
        uid: `seed_user_${i}`,
        email: random.email(displayName),
        displayName,
        userType,
        phoneNumber: random.phoneNumber(),
        profileImage: random.pick(sampleData.profileImages),
        bio: random.pick(sampleData.artistBios),
        notificationSettings: {
          push: true,
          email: true,
          sms: false,
          chat: true,
          reservation: true,
        },
        favoriteGalleries: [],
        followingArtists: [],
      };

      const user = await firestoreManager.create('users', userData, userData.uid);
      users.push(user);
      console.log(`Created user: ${displayName} (${userType})`);
    }

    return users;
  } catch (error) {
    console.error('Error creating seed users:', error);
    throw error;
  }
}

/**
 * 갤러리 생성
 */
export async function createSeedGalleries(owners, count = 20) {
  const galleries = [];

  try {
    for (let i = 0; i < count; i++) {
      const owner = random.pick(owners.filter(u => u.userType === UserTypes.OWNER));
      if (!owner) continue;

      const galleryData = {
        galleryName: sampleData.galleryNames[i % sampleData.galleryNames.length] + ` ${i}`,
        ownerId: owner.id,
        ownerName: owner.displayName,
        location: random.pick(sampleData.locations),
        address: random.pick(sampleData.addresses),
        latitude: 37.5665 + (Math.random() - 0.5) * 0.1,
        longitude: 126.9780 + (Math.random() - 0.5) * 0.1,
        description: random.pick(sampleData.descriptions),
        area: random.number(50, 500),
        floor: random.pick(['1층', '2층', '3층', 'B1', '옥상']),
        operatingHours: {
          monday: '10:00 - 18:00',
          tuesday: '10:00 - 18:00',
          wednesday: '10:00 - 18:00',
          thursday: '10:00 - 18:00',
          friday: '10:00 - 18:00',
          saturday: '11:00 - 17:00',
          sunday: '휴무',
        },
        closedDays: ['일요일', '공휴일'],
        facilities: {
          parking: random.boolean(),
          elevator: random.boolean(),
          wheelchair: random.boolean(),
          wifi: true,
          cafe: random.boolean(),
        },
        price: random.number(10, 100) * 10000,
        priceType: 'weekly',
        imageUrls: [
          random.pick(sampleData.galleryImages),
          random.pick(sampleData.galleryImages),
          random.pick(sampleData.galleryImages),
        ],
        thumbnailUrl: random.pick(sampleData.galleryImages),
        categories: [
          random.pick(sampleData.categories),
          random.pick(sampleData.categories),
        ],
        tags: ['갤러리', '전시', '예술'],
        rating: random.number(35, 50) / 10,
        reviewCount: random.number(0, 50),
        likeCount: random.number(0, 200),
        viewCount: random.number(100, 5000),
        phoneNumber: random.phoneNumber(),
        email: random.email(galleryData.galleryName),
        website: `https://gallery${i}.com`,
        instagram: `@gallery${i}`,
        isActive: true,
        isVerified: random.boolean(),
      };

      const gallery = await firestoreManager.create('galleries', galleryData);
      galleries.push(gallery);
      console.log(`Created gallery: ${galleryData.galleryName}`);
    }

    return galleries;
  } catch (error) {
    console.error('Error creating seed galleries:', error);
    throw error;
  }
}

/**
 * 아티스트 프로필 생성
 */
export async function createSeedArtists(users) {
  const artists = [];
  const artistUsers = users.filter(u => u.userType === UserTypes.ARTIST);

  try {
    for (const user of artistUsers) {
      const artistData = {
        artistId: `artist_${user.id}`,
        userId: user.id,
        displayName: user.displayName,
        profileImage: user.profileImage,
        bio: random.pick(sampleData.artistBios),
        statement: '예술은 삶의 거울입니다.',
        genre: [
          random.pick(sampleData.categories),
          random.pick(sampleData.categories),
        ],
        style: ['현대적', '실험적', '추상적'],
        medium: ['캔버스', '아크릴', '오일'],
        education: '홍익대학교 미술대학 졸업',
        awards: '2023 신진작가상 수상',
        exhibitions: [
          {
            title: '첫 개인전',
            gallery: '서울 갤러리',
            year: 2023,
          },
        ],
        experience: '10년 경력',
        email: user.email,
        phone: user.phoneNumber,
        website: `https://artist-${user.id}.com`,
        instagram: `@artist_${user.id}`,
        followersCount: random.number(100, 5000),
        worksCount: random.number(10, 100),
        exhibitionCount: random.number(1, 20),
        isActive: true,
        isVerified: random.boolean(),
      };

      const artist = await firestoreManager.create('artists', artistData, artistData.artistId);
      artists.push(artist);
      console.log(`Created artist profile: ${user.displayName}`);
    }

    return artists;
  } catch (error) {
    console.error('Error creating seed artists:', error);
    throw error;
  }
}

/**
 * 포트폴리오 작품 생성
 */
export async function createSeedPortfolio(artists, worksPerArtist = 5) {
  const portfolio = [];

  try {
    for (const artist of artists) {
      for (let i = 0; i < worksPerArtist; i++) {
        const workData = {
          artistId: artist.id,
          artistName: artist.displayName,
          title: random.pick(sampleData.artworkTitles) + ` ${i + 1}`,
          description: '작품에 대한 설명입니다.',
          imageUrl: random.pick(sampleData.artworkImages),
          thumbnailUrl: random.pick(sampleData.artworkImages),
          year: random.number(2020, 2024),
          medium: random.pick(['캔버스에 아크릴', '종이에 수채화', '디지털 프린트']),
          size: `${random.number(50, 150)}x${random.number(50, 150)}cm`,
          price: random.number(50, 500) * 10000,
          isAvailable: random.boolean(),
          isSold: random.boolean(),
          isExhibited: false,
        };

        const work = await firestoreManager.create('portfolio', workData);
        portfolio.push(work);
      }
      console.log(`Created ${worksPerArtist} works for artist: ${artist.displayName}`);
    }

    return portfolio;
  } catch (error) {
    console.error('Error creating seed portfolio:', error);
    throw error;
  }
}

/**
 * 예약 생성
 */
export async function createSeedReservations(users, galleries, count = 30) {
  const reservations = [];
  const regularUsers = users.filter(u => u.userType === UserTypes.USER);

  try {
    for (let i = 0; i < count; i++) {
      const user = random.pick(regularUsers);
      const gallery = random.pick(galleries);
      const startDate = random.date(random.number(-30, 30));
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const reservationData = {
        reservationId: `RES${Date.now()}${i}`,
        galleryId: gallery.id,
        galleryName: gallery.galleryName,
        userId: user.id,
        userName: user.displayName,
        startDate,
        endDate,
        purpose: '개인 전시',
        requirements: '조명 설치 필요',
        totalPrice: gallery.price,
        deposit: gallery.price * 0.3,
        paidAmount: random.boolean() ? gallery.price : 0,
        status: random.pick(Object.values(ReservationStatus)),
        isManualBooking: false,
      };

      const reservation = await firestoreManager.create('reservations', reservationData);
      reservations.push(reservation);
      console.log(`Created reservation: ${reservationData.reservationId}`);
    }

    return reservations;
  } catch (error) {
    console.error('Error creating seed reservations:', error);
    throw error;
  }
}

/**
 * 리뷰 생성
 */
export async function createSeedReviews(users, galleries, count = 50) {
  const reviews = [];
  const regularUsers = users.filter(u => u.userType === UserTypes.USER);

  try {
    for (let i = 0; i < count; i++) {
      const user = random.pick(regularUsers);
      const gallery = random.pick(galleries);

      const reviewData = {
        galleryId: gallery.id,
        galleryName: gallery.galleryName,
        userId: user.id,
        userName: user.displayName,
        userProfileImage: user.profileImage,
        rating: random.number(3, 5),
        content: random.pick(sampleData.reviewContents),
        imageUrls: random.boolean() ? [random.pick(sampleData.galleryImages)] : [],
        likes: random.number(0, 50),
        isEdited: false,
      };

      const review = await firestoreManager.create('reviews', reviewData);
      reviews.push(review);
      console.log(`Created review for ${gallery.galleryName}`);
    }

    return reviews;
  } catch (error) {
    console.error('Error creating seed reviews:', error);
    throw error;
  }
}

/**
 * 채팅방 생성
 */
export async function createSeedChatRooms(users, galleries, count = 20) {
  const chatRooms = [];

  try {
    for (let i = 0; i < count; i++) {
      const user = random.pick(users.filter(u => u.userType !== UserTypes.OWNER));
      const gallery = random.pick(galleries);

      const chatRoomId = `${user.id}_${gallery.id}`;
      const chatRoomData = {
        participants: [user.id, gallery.ownerId],
        userId: user.id,
        userName: user.displayName,
        userType: user.userType,
        galleryId: gallery.id,
        galleryName: gallery.galleryName,
        ownerId: gallery.ownerId,
        lastMessage: '안녕하세요, 문의드립니다.',
        lastMessageTime: new Date(),
        lastMessageSenderId: user.id,
        unreadCount: {
          user: 0,
          owner: 1,
        },
        isActive: true,
        isBlocked: false,
      };

      const chatRoom = await firestoreManager.create('chatRooms', chatRoomData, chatRoomId);

      // 샘플 메시지 추가
      await firestoreManager.create(`chatRooms/${chatRoomId}/messages`, {
        text: '안녕하세요, 갤러리 대관 문의드립니다.',
        senderId: user.id,
        senderName: user.displayName,
        type: user.userType,
        isRead: false,
      });

      chatRooms.push(chatRoom);
      console.log(`Created chat room between ${user.displayName} and ${gallery.galleryName}`);
    }

    return chatRooms;
  } catch (error) {
    console.error('Error creating seed chat rooms:', error);
    throw error;
  }
}

/**
 * 전시 제안 생성
 */
export async function createSeedExhibitionProposals(artists, galleries, count = 10) {
  const proposals = [];

  try {
    for (let i = 0; i < count; i++) {
      const artist = random.pick(artists);
      const gallery = random.pick(galleries);

      const proposalData = {
        proposalId: `PROP${Date.now()}${i}`,
        galleryId: gallery.id,
        galleryName: gallery.galleryName,
        ownerId: gallery.ownerId,
        artistId: artist.id,
        artistName: artist.displayName,
        title: `${artist.displayName} 개인전`,
        description: '이번 전시는 현대 사회의 모습을 담은 작품들로 구성됩니다.',
        proposedStartDate: random.date(30),
        proposedEndDate: random.date(60),
        commissionRate: random.number(20, 40),
        rentalFee: random.number(100, 500) * 10000,
        requirements: '조명 및 설치 지원 필요',
        status: random.pick(Object.values(ExhibitionStatus)),
        message: '멋진 갤러리에서 전시를 열고 싶습니다.',
      };

      const proposal = await firestoreManager.create('exhibitionProposals', proposalData);
      proposals.push(proposal);
      console.log(`Created exhibition proposal: ${proposalData.title}`);
    }

    return proposals;
  } catch (error) {
    console.error('Error creating seed exhibition proposals:', error);
    throw error;
  }
}

/**
 * 모든 시드 데이터 생성
 */
export async function seedAllData() {
  console.log('Starting seed data generation...');

  try {
    // 1. 사용자 생성
    console.log('\n1. Creating users...');
    const users = await createSeedUsers(30);

    // 2. 갤러리 생성
    console.log('\n2. Creating galleries...');
    const galleries = await createSeedGalleries(users, 20);

    // 3. 아티스트 프로필 생성
    console.log('\n3. Creating artist profiles...');
    const artists = await createSeedArtists(users);

    // 4. 포트폴리오 생성
    console.log('\n4. Creating portfolio...');
    await createSeedPortfolio(artists, 5);

    // 5. 예약 생성
    console.log('\n5. Creating reservations...');
    await createSeedReservations(users, galleries, 30);

    // 6. 리뷰 생성
    console.log('\n6. Creating reviews...');
    await createSeedReviews(users, galleries, 50);

    // 7. 채팅방 생성
    console.log('\n7. Creating chat rooms...');
    await createSeedChatRooms(users, galleries, 20);

    // 8. 전시 제안 생성
    console.log('\n8. Creating exhibition proposals...');
    await createSeedExhibitionProposals(artists, galleries, 10);

    console.log('\n✅ Seed data generation completed successfully!');

    return {
      users,
      galleries,
      artists,
    };
  } catch (error) {
    console.error('❌ Error generating seed data:', error);
    throw error;
  }
}

/**
 * 모든 데이터 삭제 (위험: 개발 환경에서만 사용)
 */
export async function clearAllData() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot clear data in production environment');
  }

  console.log('⚠️ Clearing all data...');

  const collections = [
    'users',
    'galleries',
    'artists',
    'portfolio',
    'reservations',
    'reviews',
    'chatRooms',
    'exhibitionProposals',
    'notifications',
    'statistics',
  ];

  try {
    for (const collection of collections) {
      await firestoreManager.clearCollection(collection);
      console.log(`Cleared ${collection}`);
    }

    console.log('✅ All data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  }
}

// 테스트용 실행 함수
export async function testSeedData() {
  try {
    // 현재 사용자 확인
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('Please login first to run seed data');
      return;
    }

    console.log('Running seed data test...');

    // 소량의 테스트 데이터 생성
    const users = await createSeedUsers(3);
    const galleries = await createSeedGalleries(users, 2);
    const artists = await createSeedArtists(users);

    console.log('Test seed data created successfully!');

    return { users, galleries, artists };
  } catch (error) {
    console.error('Test seed data failed:', error);
    throw error;
  }
}