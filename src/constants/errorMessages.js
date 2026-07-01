// src/constants/errorMessages.js

// 에러 메시지 한국어 상수
export const ERROR_MESSAGES = {
  // 인증 관련
  AUTH: {
    LOGIN_FAILED: '로그인에 실패했습니다.',
    INVALID_CREDENTIALS: '아이디 또는 비밀번호가 올바르지 않습니다.',
    USER_NOT_FOUND: '존재하지 않는 계정입니다.',
    EMAIL_ALREADY_IN_USE: '이미 사용 중인 이메일입니다.',
    WEAK_PASSWORD: '비밀번호는 6자 이상이어야 합니다.',
    INVALID_EMAIL: '올바른 이메일 형식이 아닙니다.',
    TOO_MANY_REQUESTS: '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.',
    ACCOUNT_DISABLED: '비활성화된 계정입니다.',
    EMAIL_NOT_VERIFIED: '이메일 인증이 필요합니다.',
    SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요.',
  },

  // 갤러리 관련
  GALLERY: {
    NOT_FOUND: '갤러리 정보를 찾을 수 없습니다.',
    LOAD_FAILED: '갤러리 정보를 불러오는데 실패했습니다.',
    CREATE_FAILED: '갤러리 등록에 실패했습니다.',
    UPDATE_FAILED: '갤러리 정보 수정에 실패했습니다.',
    DELETE_FAILED: '갤러리 삭제에 실패했습니다.',
    INVALID_DATA: '갤러리 정보가 올바르지 않습니다.',
  },

  // 예약 관련
  RESERVATION: {
    CREATE_FAILED: '예약 생성에 실패했습니다.',
    UPDATE_FAILED: '예약 수정에 실패했습니다.',
    CANCEL_FAILED: '예약 취소에 실패했습니다.',
    NOT_FOUND: '예약 정보를 찾을 수 없습니다.',
    ALREADY_BOOKED: '이미 예약된 시간입니다.',
    INVALID_DATE: '올바르지 않은 날짜입니다.',
    PAST_DATE: '과거 날짜는 예약할 수 없습니다.',
  },

  // 리뷰 관련
  REVIEW: {
    CREATE_FAILED: '리뷰 작성에 실패했습니다.',
    UPDATE_FAILED: '리뷰 수정에 실패했습니다.',
    DELETE_FAILED: '리뷰 삭제에 실패했습니다.',
    LOAD_FAILED: '리뷰를 불러오는데 실패했습니다.',
    EMPTY_CONTENT: '리뷰 내용을 입력해주세요.',
    ALREADY_REVIEWED: '이미 리뷰를 작성하셨습니다.',
  },

  // 채팅 관련
  CHAT: {
    ROOM_CREATE_FAILED: '채팅방 생성에 실패했습니다.',
    ROOM_NOT_FOUND: '채팅방을 찾을 수 없습니다.',
    MESSAGE_SEND_FAILED: '메시지 전송에 실패했습니다.',
    LOAD_FAILED: '메시지를 불러오는데 실패했습니다.',
    ROOM_NOT_READY: '채팅방을 준비 중입니다. 잠시만 기다려주세요.',
  },

  // 이미지 업로드 관련
  UPLOAD: {
    FAILED: '이미지 업로드에 실패했습니다.',
    SIZE_EXCEEDED: '파일 크기가 너무 큽니다. (최대 10MB)',
    INVALID_FORMAT: '지원하지 않는 파일 형식입니다.',
    PERMISSION_DENIED: '사진 접근 권한이 필요합니다.',
    SELECTION_FAILED: '이미지 선택에 실패했습니다.',
  },

  // 네트워크 관련
  NETWORK: {
    CONNECTION_FAILED: '네트워크 연결을 확인해주세요.',
    TIMEOUT: '요청 시간이 초과되었습니다.',
    SERVER_ERROR: '서버 오류가 발생했습니다.',
    OFFLINE: '오프라인 상태입니다.',
  },

  // 권한 관련
  PERMISSION: {
    DENIED: '권한이 없습니다.',
    LOCATION_DENIED: '위치 권한이 필요합니다.',
    CAMERA_DENIED: '카메라 권한이 필요합니다.',
    STORAGE_DENIED: '저장소 권한이 필요합니다.',
    NOTIFICATION_DENIED: '알림 권한이 필요합니다.',
  },

  // 유효성 검사
  VALIDATION: {
    REQUIRED_FIELD: '필수 입력 항목입니다.',
    INVALID_FORMAT: '올바른 형식이 아닙니다.',
    MIN_LENGTH: '최소 {min}자 이상 입력해주세요.',
    MAX_LENGTH: '최대 {max}자까지 입력 가능합니다.',
    INVALID_PHONE: '올바른 전화번호 형식이 아닙니다.',
    INVALID_PRICE: '올바른 가격을 입력해주세요.',
  },

  // 일반
  GENERAL: {
    UNKNOWN: '알 수 없는 오류가 발생했습니다.',
    TRY_AGAIN: '잠시 후 다시 시도해주세요.',
    CONTACT_SUPPORT: '문제가 지속되면 고객센터로 문의해주세요.',
    DATA_LOAD_FAILED: '데이터를 불러오는데 실패했습니다.',
    SAVE_FAILED: '저장에 실패했습니다.',
    DELETE_FAILED: '삭제에 실패했습니다.',
  },
};

// 성공 메시지
export const SUCCESS_MESSAGES = {
  AUTH: {
    LOGIN: '로그인되었습니다.',
    LOGOUT: '로그아웃되었습니다.',
    SIGNUP: '회원가입이 완료되었습니다.',
    PASSWORD_RESET: '비밀번호 재설정 이메일을 전송했습니다.',
  },
  GALLERY: {
    CREATED: '갤러리가 등록되었습니다.',
    UPDATED: '갤러리 정보가 수정되었습니다.',
    DELETED: '갤러리가 삭제되었습니다.',
  },
  RESERVATION: {
    CREATED: '예약이 완료되었습니다.',
    UPDATED: '예약이 수정되었습니다.',
    CANCELLED: '예약이 취소되었습니다.',
  },
  REVIEW: {
    CREATED: '리뷰가 작성되었습니다.',
    UPDATED: '리뷰가 수정되었습니다.',
    DELETED: '리뷰가 삭제되었습니다.',
  },
  PROFILE: {
    UPDATED: '프로필이 업데이트되었습니다.',
    IMAGE_UPLOADED: '프로필 이미지가 변경되었습니다.',
  },
};

// 확인 메시지
export const CONFIRM_MESSAGES = {
  DELETE: {
    TITLE: '삭제 확인',
    GALLERY: '정말 이 갤러리를 삭제하시겠습니까?',
    REVIEW: '이 리뷰를 삭제하시겠습니까?',
    RESERVATION: '이 예약을 취소하시겠습니까?',
    ACCOUNT: '정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
  },
  LEAVE: {
    TITLE: '나가기',
    UNSAVED: '저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?',
    CHAT: '작성 중인 메시지가 있습니다. 나가시겠습니까?',
    REVIEW: '작성 중인 리뷰가 있습니다. 정말 나가시겠습니까?',
  },
  ACTION: {
    LOGOUT: '로그아웃 하시겠습니까?',
    CANCEL_RESERVATION: '예약을 취소하시겠습니까?',
  },
};