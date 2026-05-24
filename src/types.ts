export interface User {
  id: string;
  username: string;
  nickname: string;
  grade: number; // 3, 4, 5, 6, 7, 8
  school?: string;
  classroom?: string;
  createdAt: string;
  role?: 'student' | 'teacher';
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number; // 0-based
  explanation: string;
  category: 'hardware' | 'software' | 'network' | 'safety' | 'skills';
  type?: 'choice' | 'drag_text' | 'drag_image_text';
  leftTerms?: string[];
  leftImages?: string[];
}

export interface LessonProgress {
  lessonId: string;
  grade: number;
  completedQuestions: number; // number of answered questions
  correctAnswers: number;
  totalQuestions: number;
  isCompleted: boolean;
  lastUpdated: string;
}

export interface ExamRecord {
  id: string;
  grade: number;
  score: number; // percentage or points / 100
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number;
  createdAt: string;
}

export interface UserFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number; // in bytes
  uploadedAt: string;
  downloadUrl?: string;
  storagePath?: string;
}
