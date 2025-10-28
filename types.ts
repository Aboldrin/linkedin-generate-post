export enum MessageAuthor {
  USER = 'user',
  BOT = 'bot',
  SYSTEM = 'system',
}

export interface ChatMessage {
  author: MessageAuthor;
  content: string;
}

export interface GroundingChunk {
  web?: {
    // FIX: Made uri and title optional to match the GroundingChunk type from the Gemini API response, which resolves a type error in `geminiService.ts`.
    uri?: string;
    title?: string;
  };
}

export interface GeneratedPost {
  id: string;
  postContent: string;
  hashtags: string[];
  sources: GroundingChunk[];
  imageUrl?: string;
}