export interface User {
  id: string;
  username: string;
  nickname: string;
  grade?: number; // 3, 4, 5, 6, 7, 8 (optional for teachers)
  school?: string;
  classroom?: string;
  createdAt: string;
  role?: 'student' | 'teacher' | 'admin';
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number; // 0-based
  explanation: string;
  grade?: number; // 3, 4, 5, 6, 7, 8 (associating with specific grades)
  type?: 'choice' | 'drag_text' | 'drag_image_text' | 'table_match';
  leftTerms?: string[];
  leftImages?: string[];
  // For custom table matching question types
  headers?: string[];
  rows?: string[];
  correctAnswers?: number[];
  tableFontSize?: 'sm' | 'md' | 'lg';
  tableWidth?: 'compact' | 'normal' | 'wide';
}

export interface LessonProgress {
  lessonId: string;
  grade: number;
  completedQuestions: number; // number of answered questions
  correctAnswers: number;
  totalQuestions: number;
  isCompleted: boolean;
  lastUpdated: string;
  lessonTitle?: string;
}

export interface HomeworkProgress extends LessonProgress {
  homeworkId: string;
}

export interface ExamRecord {
  id: string;
  grade: number;
  score: number; // percentage or points / 100
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number;
  createdAt: string;
  isRevisionTest?: boolean;
  lessonId?: string;
  lessonTitle?: string;
}

export interface UserFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number; // in bytes
  uploadedAt: string;
  downloadUrl?: string;
  storagePath?: string;
  grade?: number | 'all';
}
