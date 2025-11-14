export interface DerivativeWord {
  word: string;
  partOfSpeech: string;
  meaning: string;
}

export interface ConfusionWord {
  word: string;
  meaning: string;
  explanation: string;
}

export interface WordData {
  id: string;
  vol: number;
  day: number;
  number: number;
  word: string;
  koreanMeaning: string; // 한글 뜻 + 핵심 설명
  pronunciation: string; // [prəˈhɪbɪt]
  koreanPronunciation: string; // (프러히빗)
  derivatives: DerivativeWord[]; // 파생어들
  example: string; // 예문
  story: string; // 썰 (어원, 이미지 설명 등)
  englishDefinition: string; // 영어 정의
  confusionWords: ConfusionWord[]; // 혼동 단어
  synonyms: string[]; // 동의어
  antonyms: string[]; // 반의어
}
