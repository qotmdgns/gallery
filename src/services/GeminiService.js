import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '@env';
import FirebaseService from './FirebaseService';

class GeminiService {
  constructor() {
    this.apiKey = GEMINI_API_KEY;
    this.genAI = null;
    this.model = null;
    this.firebaseService = FirebaseService;
    this.conversationHistory = [];
    this.isInitialized = false;

    // 환경 변수에서 API 키 자동 로드
    if (this.apiKey && this.apiKey !== 'your_gemini_api_key_here') {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      this.isInitialized = true;
    } else {
      console.warn('[GeminiService] API key is not configured.');
    }
  }

  async setAPIKey(apiKey) {
    this.apiKey = apiKey;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      this.isInitialized = true;
    } else {
      this.genAI = null;
      this.model = null;
      this.isInitialized = false;
    }
  }

  async initializeChat() {
    if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
      throw new Error('API_KEY_NOT_SET');
    }

    if (!this.model) {
      throw new Error('MODEL_NOT_INITIALIZED');
    }

    this.chat = this.model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });
    
    const systemPrompt = `당신은 갤러리 예약 시스템의 AI 어시스턴트입니다. 
    사용자가 갤러리를 검색하고 예약하는 것을 도와주세요.
    다음과 같은 질문에 답변할 수 있습니다:
    - 갤러리 추천
    - 위치별 갤러리 검색
    - 가격대별 갤러리 추천
    - 갤러리 예약 방법 안내
    - 전시 정보 제공
    
    항상 친절하고 도움이 되는 답변을 제공하세요.`;
    
    await this.chat.sendMessage(systemPrompt);
    this.conversationHistory = [];
  }

  async checkAPIKey() {
    return this.apiKey && this.apiKey !== 'your_gemini_api_key_here';
  }

  async sendMessage(message, galleryContext = null) {
    try {
      if (!this.isInitialized) {
        throw new Error('API_KEY_NOT_SET');
      }

      if (!this.chat) {
        await this.initializeChat();
      }

      let contextualMessage = message;
      
      if (galleryContext && galleryContext.length > 0) {
        const galleryInfo = galleryContext.map(g => 
          `- ${g.name}: ${g.category}, ${g.location}, ₩${g.pricePerHour}/시간`
        ).join('\n');
        
        contextualMessage = `
현재 검색된 갤러리 정보:
${galleryInfo}

사용자 질문: ${message}`;
      }

      const result = await this.chat.sendMessage(contextualMessage);
      const response = await result.response;
      const text = response.text();
      
      this.conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });
      
      this.conversationHistory.push({
        role: 'assistant',
        content: text,
        timestamp: new Date()
      });
      
      return text;
    } catch (error) {
      console.error('Gemini API Error:', error);
      return '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
  }

  async getGalleryRecommendations(preferences) {
    try {
      if (!this.isInitialized) {
        throw new Error('API_KEY_NOT_SET');
      }

      const { category, location, priceRange, date } = preferences;
      
      const prompt = `
사용자가 다음 조건으로 갤러리를 찾고 있습니다:
- 카테고리: ${category || '모든 카테고리'}
- 위치: ${location || '모든 지역'}
- 가격대: ${priceRange ? `₩${priceRange.min} - ₩${priceRange.max}` : '제한 없음'}
- 날짜: ${date || '미정'}

이 조건에 맞는 갤러리를 추천하고, 각 갤러리의 특징을 간단히 설명해주세요.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Recommendation Error:', error);
      return '추천을 생성하는 중 오류가 발생했습니다.';
    }
  }

  async analyzeUserQuery(query) {
    try {
      if (!this.isInitialized) {
        throw new Error('API_KEY_NOT_SET');
      }

      const prompt = `
사용자 질문: "${query}"

이 질문을 분석하여 다음 정보를 추출해주세요:
1. 검색 의도 (갤러리 검색, 예약 문의, 정보 요청 등)
2. 주요 키워드 (위치, 카테고리, 가격 등)
3. 추천 검색 필터

JSON 형식으로 응답해주세요.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
      }

      return {
        intent: 'general',
        keywords: [],
        filters: {}
      };
    } catch (error) {
      console.error('Query Analysis Error:', error);
      return {
        intent: 'error',
        keywords: [],
        filters: {}
      };
    }
  }

  async extractKeywordsFromQuery(query, currentKeywords = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('API_KEY_NOT_SET');
      }

      const prompt = `
당신은 갤러리 검색 AI입니다. 사용자의 요청에서 검색 키워드를 추출하세요.

현재 설정된 키워드: ${JSON.stringify(currentKeywords)}
사용자의 최신 메시지: "${query}"

다음 키워드를 추출하세요:
1. location: 지역 (예: "서울", "경기", "부산")
2. detailLocation: 상세 지역 (예: "강남구", "종로구", "해운대구")
3. category: 갤러리 카테고리 (예: "현대미술", "사진", "조각")
4. priceRange: 가격대 (예: "5만원 이하", "5만원~15만원", "15만원~30만원", "30만원 이상")

**중요:**
- 이전 조건은 무시하고 사용자의 최신 메시지에서만 키워드를 추출하세요.
- 추출한 키워드를 현재 키워드와 병합하세요.
- 다음 질문할 내용을 생성하세요.
- 다음 질문에 대한 선택지 버튼을 생성하세요.

출력 형식 (JSON):
{
  "keywords": {
    "location": "값 또는 null",
    "detailLocation": "값 또는 null",
    "category": "값 또는 null",
    "priceRange": "값 또는 null"
  },
  "next_question": "다음 질문 텍스트",
  "buttons": ["버튼1", "버튼2", ...],
  "is_final_question": false
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            keywords: parsed.keywords || {},
            next_question: parsed.next_question || '다른 조건이 있으신가요?',
            buttons: parsed.buttons || [],
            is_final_question: parsed.is_final_question || false
          };
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
      }

      return {
        keywords: currentKeywords,
        next_question: '조건을 다시 말씀해주시겠어요?',
        buttons: [],
        is_final_question: false
      };
    } catch (error) {
      console.error('Keyword Extraction Error:', error);
      throw error;
    }
  }

  async generateGalleryDescription(gallery) {
    try {
      if (!this.isInitialized) {
        throw new Error('API_KEY_NOT_SET');
      }

      const prompt = `
갤러리 정보:
- 이름: ${gallery.name}
- 카테고리: ${gallery.category}
- 위치: ${gallery.location}
- 가격: ₩${gallery.pricePerHour}/시간
- 시설: ${gallery.amenities?.join(', ') || '정보 없음'}

이 갤러리에 대한 매력적인 소개문을 100자 이내로 작성해주세요.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Description Generation Error:', error);
      return gallery.description || '멋진 갤러리 공간입니다.';
    }
  }

  getConversationHistory() {
    return this.conversationHistory;
  }

  clearConversationHistory() {
    this.conversationHistory = [];
    this.initializeChat();
  }
}

export default new GeminiService();
