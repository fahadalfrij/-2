
export type Category = 
  | 'ديني 🕋' 
  | 'جغرافيا 🌍' 
  | 'تاريخ 📜' 
  | 'علوم 🔬' 
  | 'رياضة 🏅' 
  | 'أدب 📚'
  | 'فن 🎨'
  | 'عشوائي 🎲';

export const CATEGORY_OPTIONS: Category[] = [
  'عشوائي 🎲', 'ديني 🕋', 'جغرافيا 🌍', 'علوم 🔬', 'تاريخ 📜', 'رياضة 🏅', 'أدب 📚', 'فن 🎨'
];

export type Difficulty = 'سهل' | 'متوسط' | 'صعب';

export const DIFFICULTY_OPTIONS: Difficulty[] = ['سهل', 'متوسط', 'صعب'];

export type Language = 'ar' | 'en';
export type QuestionSource = 'ai' | 'custom';

export interface QuestionData {
  question: string;
  answer: string;
  explanation?: string;
  category: Category;
  difficulty: Difficulty;
}

export interface CustomQuestion {
  id: string;
  question: string;
  answer: string;
  explanation?: string;
}

export interface Participant {
  id: string;
  name: string;
  color: string;
  score: number;
  lastPlayedTurn?: number;
}
