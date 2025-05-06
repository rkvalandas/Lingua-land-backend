export interface User {
  id: number;
  username: string;
  email: string;
  created_at: Date;
}

export interface Conversation {
  id: number;
  user_id: number;
  language: string;
  created_at: Date;
}

export interface Message {
  id: number;
  conversation_id: number;
  is_user: boolean;
  content: string;
  created_at: Date;
}

export interface UserSettings {
  user_id: number;
  language_preference: string;
}
