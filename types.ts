export enum MessageAuthor {
  USER = 'user',
  BOT = 'bot',
  SYSTEM = 'system',
}

export interface ChatMessage {
  author: MessageAuthor;
  content: string;
}

export interface Poll {
  question: string;
  options: string[];
}

export interface GroundingSource {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GeneratedPost {
  id: string;
  postContent: string;
  hashtags: string[];
  sources: GroundingSource[];
  imageUrl?: string;
  originalImagePrompt?: string;
  poll?: Poll;
  memeText?: string;
  memeTextColor?: string;
  memeStrokeColor?: string;
}

export interface ContentToLoad {
    type: 'image' | 'text';
    data: string;
    name: string;
}

export interface LibraryItem {
  id:string;
  name: string;
  type: 'image' | 'text';
  data: string; // base64 for image, raw text for text
  mimeType?: string; // for images
}

export interface PlannedPost {
  date: string; // ISO string YYYY-MM-DD
  postType: string;
  topic: string;
  generatedPost: GeneratedPost;
}

export interface ProactiveSuggestion {
    date: string; // YYYY-MM-DD
    postType: string;
    topic: string;
}

export interface QuickQueryMessage {
    author: 'user' | 'bot';
    text: string;
    suggestedPost?: GeneratedPost;
    suggestionDetails?: ProactiveSuggestion;
}