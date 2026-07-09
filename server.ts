import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, query, where, deleteDoc } from 'firebase/firestore';
import { baseQuestions } from './src/questionsData.ts';

// Suppress safe-to-ignore Firestore BloomFilter warning/error messages
(function() {
  try {
    const originalConsoleError = console.error;
    console.error = function(...args: any[]) {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      if (
        msg.includes('BloomFilter') || 
        msg.includes('BloomFilterError') || 
        msg.includes('Invalid hash count') ||
        msg.includes('hash count: 0')
      ) {
        return;
      }
      originalConsoleError.apply(console, args);
    };

    const originalConsoleWarn = console.warn;
    console.warn = function(...args: any[]) {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      if (
        msg.includes('BloomFilter') || 
        msg.includes('BloomFilterError') || 
        msg.includes('Invalid hash count') ||
        msg.includes('hash count: 0')
      ) {
        return;
      }
      originalConsoleWarn.apply(console, args);
    };
  } catch (e) {
    // Fail-safe
  }
})();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'wippo_ic3_super_secret_key_2026';

// Paths for persistent data directories
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Self-healing database initialization
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initial DB template
interface DBStructure {
  users: Record<string, {
    id: string;
    username: string;
    nickname: string;
    grade: number;
    school?: string;
    classroom?: string;
    passwordHash: string;
    salt: string;
    createdAt: string;
    role?: string;
  }>;
  students: Record<string, {
    id: string;
    username: string;
    nickname: string;
    grade: number;
    school?: string;
    classroom?: string;
    passwordHash: string;
    salt: string;
    createdAt: string;
    role?: string;
  }>;
  teachers: Record<string, {
    id: string;
    username: string;
    nickname: string;
    grade: number;
    passwordHash: string;
    salt: string;
    createdAt: string;
    role?: string;
  }>;
  progress: Record<string, {
    userId: string;
    grade: number;
    lessonId: string;
    completedQuestions: number;
    correctAnswers: number;
    totalQuestions: number;
    isCompleted: boolean;
    lastUpdated: string;
  }[]>;
  progressHomework?: Record<string, {
    userId: string;
    grade: number;
    lessonId: string;
    homeworkId: string;
    completedQuestions: number;
    correctAnswers: number;
    totalQuestions: number;
    isCompleted: boolean;
    lastUpdated: string;
  }[]>;
  exams: Record<string, {
    id: string;
    userId: string;
    grade: number;
    score: number;
    correctCount: number;
    totalQuestions: number;
    durationSeconds: number;
    createdAt: string;
  }[]>;
  files: Record<string, {
    id: string;
    userId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    physicalPath?: string;
    downloadUrl?: string;
    storagePath?: string;
    uploadedAt: string;
  }[]>;
  lessons?: Record<string, {
    id: string;
    grade: number;
    lessonNum: number;
    title: string;
    emoji: string;
    qCount: number;
    questions: any[];
    isCustom?: boolean;
  }[]>;
  homeworks?: {
    id: string;
    grade: number;
    school: string;
    classroom: string;
    lessonId: string;
    lessonTitle: string;
    assignedAt: string;
    deadline: string;
  }[];
  questions?: any[];
  questionsInitialized?: boolean;
}

const defaultDB: DBStructure = {
  users: {},
  students: {},
  teachers: {},
  progress: {},
  progressHomework: {},
  exams: {},
  files: {},
  lessons: {},
  homeworks: [],
  questions: [],
};

// Read database
function readDB(): DBStructure {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading database file, resetting to default', err);
  }
  return { ...defaultDB };
}

// Write database atomically
function writeDB(data: DBStructure) {
  try {
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing to database file', err);
  }
}

// --- FIREBASE FIRESTORE ADAPTER IMPLEMENTATION ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let dbFirestore: any = null;
let useFirestore = false;

const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
if (fs.existsSync(firebaseConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
    if (config && config.apiKey && config.projectId) {
      const fApp = initializeApp(config);
      dbFirestore = getFirestore(fApp, config.firestoreDatabaseId);
      useFirestore = true;
      console.log("Connect successfully to Firebase Firestore database ID:", config.firestoreDatabaseId);
    }
  } catch (err) {
    console.error("Failed to connect Firebase Firestore on server:", err);
  }
}

// Self-healing: active migration tool from local to Firestore database on startup
async function migrateLocalToFirestore() {
  if (!useFirestore || !dbFirestore) return;
  try {
    const localDB = readDB();
    let hasMigrated = false;

    // Migrate users
    const users = Object.values(localDB.users || {});
    if (users.length > 0) {
      console.log(`Migrating ${users.length} users to Firestore...`);
      for (const u of users) {
        await setDoc(doc(dbFirestore, 'users', u.id), u);
        const col = (u.role === 'teacher' || u.role === 'admin') ? 'teachers' : 'students';
        await setDoc(doc(dbFirestore, col, u.id), u);
      }
      hasMigrated = true;
    }

    // Migrate student-specific records
    const students = Object.values(localDB.students || {});
    if (students.length > 0) {
      console.log(`Migrating ${students.length} students to Firestore...`);
      for (const s of students) {
        await setDoc(doc(dbFirestore, 'students', s.id), s);
      }
      hasMigrated = true;
    }

    // Migrate teacher-specific records
    const teachers = Object.values(localDB.teachers || {});
    if (teachers.length > 0) {
      console.log(`Migrating ${teachers.length} teachers to Firestore...`);
      for (const t of teachers) {
        await setDoc(doc(dbFirestore, 'teachers', t.id), t);
      }
      hasMigrated = true;
    }

    // Migrate progress
    const progresses = Object.entries(localDB.progress);
    if (progresses.length > 0) {
      console.log('Migrating progresses to Firestore...');
      for (const [userId, items] of progresses) {
        for (const item of items) {
          const docId = `${userId}_${item.grade}_${item.lessonId}`;
          await setDoc(doc(dbFirestore, 'progress', docId), item);
        }
      }
      hasMigrated = true;
    }

    // Migrate exams
    const exams = Object.entries(localDB.exams);
    if (exams.length > 0) {
      console.log('Migrating exams to Firestore...');
      for (const [userId, items] of exams) {
        for (const item of items) {
          await setDoc(doc(dbFirestore, 'exams', item.id), item);
        }
      }
      hasMigrated = true;
    }

    // Migrate files
    const files = Object.entries(localDB.files);
    if (files.length > 0) {
      console.log('Migrating files metadata to Firestore...');
      for (const [userId, items] of files) {
        for (const item of items) {
          await setDoc(doc(dbFirestore, 'files', item.id), item);
        }
      }
      hasMigrated = true;
    }

    // Migrate lessons
    if (localDB.lessons && Object.keys(localDB.lessons).length > 0) {
      console.log('Migrating custom curriculum lessons to Firestore...');
      for (const [gradeKey, lessonList] of Object.entries(localDB.lessons)) {
        const gradeNum = Number(gradeKey.replace('grade_', ''));
        if (!isNaN(gradeNum) && Array.isArray(lessonList)) {
          for (const lesson of lessonList) {
            const docId = `grade_${gradeNum}_${lesson.id}`;
            await setDoc(doc(dbFirestore, 'lessons', docId), {
              ...lesson,
              grade: gradeNum
            });
          }
        }
      }
      hasMigrated = true;
    }

    if (hasMigrated) {
      // Clean local db to prevent duplicate migration operations next startup
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2), 'utf-8');
      console.log("Migration to Firebase completed successfully! 🚀");
    }
  } catch (err) {
    console.error("Local records migration to Firestore failed:", err);
  }
}

// Complete purge of all database collections on Firestore (including teachers, students, records) to clean the slate
async function purgeAllFirestoreDataOnce() {
  // Disabled completely to prevent automatic destructive purges of student records, progress, and lesson questions across server/container restarts.
  return;
}

// One-time startup purge of collection 'lessons' on Firestore to clear out legacy template data
async function cleanupExistingLessonsOnFirestoreOnce() {
  // Disabled to prevent purging custom compiled lessons and questions on server or container restarts
  return;
}

// User helper methods
async function getUser(userId: string): Promise<any> {
  if (useFirestore && dbFirestore) {
    try {
      // Look up in students
      let docSnap = await getDoc(doc(dbFirestore, 'students', userId));
      if (docSnap.exists()) {
        return docSnap.data();
      }
      // Look up in teachers
      docSnap = await getDoc(doc(dbFirestore, 'teachers', userId));
      if (docSnap.exists()) {
        return docSnap.data();
      }
      // Legacy users collection fallback
      docSnap = await getDoc(doc(dbFirestore, 'users', userId));
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    }
  }
  
  const db = readDB();
  if (db.students && db.students[userId]) {
    return db.students[userId];
  }
  if (db.teachers && db.teachers[userId]) {
    return db.teachers[userId];
  }
  return db.users[userId] || null;
}

async function findUserByUsername(username: string): Promise<any> {
  const cleanUsername = username.trim().toLowerCase();
  if (useFirestore && dbFirestore) {
    try {
      // Try students search
      let q = query(collection(dbFirestore, 'students'), where('username', '==', cleanUsername));
      let querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data();
      }
      // Try teachers search
      q = query(collection(dbFirestore, 'teachers'), where('username', '==', cleanUsername));
      querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data();
      }
      // Try legacy users search
      q = query(collection(dbFirestore, 'users'), where('username', '==', cleanUsername));
      querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data();
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users');
    }
  }

  const db = readDB();
  if (db.students) {
    const student = Object.values(db.students).find(u => u.username === cleanUsername);
    if (student) return student;
  }
  if (db.teachers) {
    const teacher = Object.values(db.teachers).find(u => u.username === cleanUsername);
    if (teacher) return teacher;
  }
  return Object.values(db.users || {}).find(u => u.username === cleanUsername) || null;
}

async function saveUser(userId: string, userData: any): Promise<void> {
  const isStaff = userData.role === 'teacher' || userData.role === 'admin';
  const targetCollection = isStaff ? 'teachers' : 'students';

  if (useFirestore && dbFirestore) {
    try {
      await setDoc(doc(dbFirestore, targetCollection, userId), userData);
      return; // Stop right here, do not run local filesystem DB falls
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${targetCollection}/${userId}`);
    }
  }
  
  const db = readDB();
  if (isStaff) {
    if (!db.teachers) db.teachers = {};
    db.teachers[userId] = userData;
  } else {
    if (!db.students) db.students = {};
    db.students[userId] = userData;
  }
  
  writeDB(db);
}

// Homework helper methods
async function getHomeworkAssignments(): Promise<any[]> {
  if (useFirestore && dbFirestore) {
    try {
      const q = query(collection(dbFirestore, 'homeworks'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (err) {
      console.error('Firestore homework load failure:', err);
    }
  }
  const db = readDB();
  return db.homeworks || [];
}

async function saveHomeworkAssignment(hw: any): Promise<void> {
  if (useFirestore && dbFirestore) {
    try {
      await setDoc(doc(dbFirestore, 'homeworks', hw.id), hw);
      return;
    } catch (err) {
      console.error('Firestore homework save failure:', err);
    }
  }
  const db = readDB();
  if (!db.homeworks) {
    db.homeworks = [];
  }
  const idx = db.homeworks.findIndex((h: any) => 
    h.grade === hw.grade && 
    h.school === hw.school && 
    h.classroom === hw.classroom && 
    h.lessonId === hw.lessonId
  );
  if (idx > -1) {
    db.homeworks[idx] = hw;
  } else {
    db.homeworks.push(hw);
  }
  writeDB(db);
}

// Progress helper methods
async function getUserProgress(userId: string): Promise<any[]> {
  if (useFirestore && dbFirestore) {
    try {
      const q = query(collection(dbFirestore, 'progress'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const firestoreProgress = querySnapshot.docs.map(doc => doc.data());
      if (firestoreProgress.length > 0) {
        return firestoreProgress;
      }
    } catch (err) {
      console.error('Firestore Error during getUserProgress list:', err);
    }
  }
  return readDB().progress[userId] || [];
}

async function saveUserProgress(
  userId: string,
  grade: number,
  lessonId: string,
  completedQuestions: number,
  correctAnswers: number,
  totalQuestions: number,
  isCompleted: boolean
): Promise<any[]> {
  const rawDocId = `${userId}_${grade}_${lessonId}`;
  const docId = rawDocId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedGrade = Math.round(Number(grade)) || 3;
  const sanitizedCompletedQuestions = Math.round(Number(completedQuestions)) || 0;
  const sanitizedCorrectAnswers = Math.round(Number(correctAnswers)) || 0;
  const sanitizedTotalQuestions = Math.round(Number(totalQuestions)) || 0;
  
  let newProgress: any = {
    userId,
    grade: sanitizedGrade,
    lessonId: String(lessonId),
    completedQuestions: sanitizedCompletedQuestions,
    correctAnswers: sanitizedCorrectAnswers,
    totalQuestions: sanitizedTotalQuestions,
    isCompleted: !!isCompleted,
    lastUpdated: new Date().toISOString(),
  };

  if (useFirestore && dbFirestore) {
    try {
      const progressRef = doc(dbFirestore, 'progress', docId);
      await setDoc(progressRef, newProgress);
    } catch (err) {
      console.error('Firestore Error during saveProgress setDoc:', err);
    }
  }

  // Always write to local DB so we have a completely robust real-time synchronization
  const db = readDB();
  if (!db.progress) {
    db.progress = {};
  }
  if (!db.progress[userId]) {
    db.progress[userId] = [];
  }
  
  const progressList = db.progress[userId];
  const existingIndex = progressList.findIndex(p => p.grade === sanitizedGrade && p.lessonId === String(lessonId));

  if (existingIndex > -1) {
    progressList[existingIndex] = newProgress;
  } else {
    progressList.push(newProgress);
  }

  writeDB(db);
  return progressList;
}

// Homework progress helper methods
async function getUserHomeworkProgress(userId: string): Promise<any[]> {
  if (useFirestore && dbFirestore) {
    try {
      const q = query(collection(dbFirestore, 'progressHomework'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const firestoreProgress = querySnapshot.docs.map(doc => doc.data());
      if (firestoreProgress.length > 0) {
        return firestoreProgress;
      }
    } catch (err) {
      console.error('Firestore Error during getUserHomeworkProgress list:', err);
    }
  }
  const db = readDB();
  return db.progressHomework?.[userId] || [];
}

async function saveUserHomeworkProgress(
  userId: string,
  grade: number,
  lessonId: string,
  homeworkId: string,
  completedQuestions: number,
  correctAnswers: number,
  totalQuestions: number,
  isCompleted: boolean
): Promise<any[]> {
  const rawDocId = `${userId}_${grade}_${lessonId}_${homeworkId}`;
  const docId = rawDocId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedGrade = Math.round(Number(grade)) || 3;
  const sanitizedCompletedQuestions = Math.round(Number(completedQuestions)) || 0;
  const sanitizedCorrectAnswers = Math.round(Number(correctAnswers)) || 0;
  const sanitizedTotalQuestions = Math.round(Number(totalQuestions)) || 0;
  
  let newProgress: any = {
    userId,
    grade: sanitizedGrade,
    lessonId: String(lessonId),
    homeworkId: String(homeworkId),
    completedQuestions: sanitizedCompletedQuestions,
    correctAnswers: sanitizedCorrectAnswers,
    totalQuestions: sanitizedTotalQuestions,
    isCompleted: !!isCompleted,
    lastUpdated: new Date().toISOString(),
  };

  if (useFirestore && dbFirestore) {
    try {
      const progressRef = doc(dbFirestore, 'progressHomework', docId);
      await setDoc(progressRef, newProgress);
    } catch (err) {
      console.error('Firestore Error during saveUserHomeworkProgress setDoc:', err);
    }
  }

  // Always write to local DB so we have a completely robust real-time synchronization
  const db = readDB();
  if (!db.progressHomework) {
    db.progressHomework = {};
  }
  if (!db.progressHomework[userId]) {
    db.progressHomework[userId] = [];
  }
  
  const progressList = db.progressHomework[userId];
  const existingIndex = progressList.findIndex(p => p.grade === sanitizedGrade && p.lessonId === String(lessonId) && p.homeworkId === String(homeworkId));

  if (existingIndex > -1) {
    progressList[existingIndex] = newProgress;
  } else {
    progressList.push(newProgress);
  }

  writeDB(db);
  return progressList;
}

// Exam helper methods
async function getUserExams(userId: string): Promise<any[]> {
  if (useFirestore && dbFirestore) {
    try {
      const q = query(collection(dbFirestore, 'exams'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const firestoreExams = querySnapshot.docs.map(doc => doc.data());
      if (firestoreExams.length > 0) {
        return firestoreExams;
      }
    } catch (err) {
      console.error('Firestore Error during getUserExams list:', err);
    }
  }
  return readDB().exams[userId] || [];
}

async function saveExamRecord(
  userId: string,
  grade: any,
  score: any,
  correctCount: any,
  totalQuestions: any,
  durationSeconds: any,
  isRevisionTest?: boolean,
  lessonId?: string,
  lessonTitle?: string
): Promise<any> {
  const examId = crypto.randomUUID();
  const sanitizedGrade = Math.round(Number(grade)) || 3;
  const sanitizedScore = Math.round(Number(score)) || 0;
  const sanitizedCorrectCount = Math.round(Number(correctCount)) || 0;
  const sanitizedTotalQuestions = Math.round(Number(totalQuestions)) || 0;
  const sanitizedDurationSeconds = Math.round(Number(durationSeconds)) || 0;

  const newExamRecord = {
    id: examId,
    userId,
    grade: sanitizedGrade,
    score: sanitizedScore,
    correctCount: sanitizedCorrectCount,
    totalQuestions: sanitizedTotalQuestions,
    durationSeconds: sanitizedDurationSeconds,
    isRevisionTest: !!isRevisionTest,
    lessonId: lessonId || '',
    lessonTitle: lessonTitle || '',
    createdAt: new Date().toISOString(),
  };

  if (useFirestore && dbFirestore) {
    try {
      await setDoc(doc(dbFirestore, 'exams', examId), newExamRecord);
    } catch (err) {
      console.error('Firestore Error during saveExamRecord setDoc:', err);
    }
  }

  // Always write to local database as a robust synchronization fallback
  const db = readDB();
  if (!db.exams[userId]) {
    db.exams[userId] = [];
  }
  db.exams[userId].push(newExamRecord);
  writeDB(db);

  return newExamRecord;
}

// Files helper methods
async function getUserFiles(user: any): Promise<any[]> {
  let allFiles: any[] = [];
  if (useFirestore && dbFirestore) {
    try {
      const q = query(collection(dbFirestore, 'files'));
      const querySnapshot = await getDocs(q);
      allFiles = querySnapshot.docs.map(doc => doc.data());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'files');
      // local fallback on error
      const db = readDB();
      for (const uId of Object.keys(db.files || {})) {
        allFiles.push(...(db.files[uId] || []));
      }
    }
  } else {
    const db = readDB();
    for (const uId of Object.keys(db.files || {})) {
      allFiles.push(...(db.files[uId] || []));
    }
  }

  // Filter based on user role and grade
  if (user.role === 'teacher' || user.role === 'admin') {
    // Teachers and Admins can see all files
    return allFiles;
  } else {
    // Students only see files they uploaded, OR files targetting their grade, OR general files
    const studentGrade = Number(user.grade);
    return allFiles.filter(f => {
      if (f.userId === user.id) return true;
      const fileGrade = f.grade;
      if (!fileGrade || fileGrade === 'all') return true;
      return Number(fileGrade) === studentGrade;
    });
  }
}

async function saveFileMeta(userId: string, fileMeta: any): Promise<void> {
  if (useFirestore && dbFirestore) {
    try {
      await setDoc(doc(dbFirestore, 'files', fileMeta.id), fileMeta);
      return; // Return immediately to bypass local fallback
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `files/${fileMeta.id}`);
    }
  }
  const db = readDB();
  if (!db.files[userId]) {
    db.files[userId] = [];
  }
  db.files[userId].push(fileMeta);
  writeDB(db);
}

async function getFileMeta(userId: string, fileId: string): Promise<any> {
  const u = await getUser(userId);
  if (!u) return null;
  const isPrivileged = u.role === 'teacher' || u.role === 'admin';

  if (useFirestore && dbFirestore) {
    try {
      const docSnap = await getDoc(doc(dbFirestore, 'files', fileId));
      if (docSnap.exists()) {
        const metadata = docSnap.data();
        if (metadata.userId === userId || isPrivileged) {
          return metadata;
        }
        // Also allow student if they match the designated grade or if is 'all'
        const studentGrade = Number(u.grade);
        const fileGrade = metadata.grade;
        if (!fileGrade || fileGrade === 'all' || Number(fileGrade) === studentGrade) {
          return metadata;
        }
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `files/${fileId}`);
    }
  }

  const db = readDB();
  for (const uId of Object.keys(db.files || {})) {
    const match = (db.files[uId] || []).find((f: any) => f.id === fileId);
    if (match) {
      if (match.userId === userId || isPrivileged) {
        return match;
      }
      const studentGrade = Number(u.grade);
      const fileGrade = (match as any).grade;
      if (!fileGrade || fileGrade === 'all' || Number(fileGrade) === studentGrade) {
        return match;
      }
    }
  }
  return null;
}

async function deleteFileMeta(userId: string, fileId: string): Promise<any> {
  const fileMeta = await getFileMeta(userId, fileId);
  if (!fileMeta) return null;

  if (useFirestore && dbFirestore) {
    try {
      await deleteDoc(doc(dbFirestore, 'files', fileId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `files/${fileId}`);
    }
  }

  const db = readDB();
  let found = false;
  for (const uId of Object.keys(db.files || {})) {
    const userFiles = db.files[uId] || [];
    const idx = userFiles.findIndex((f: any) => f.id === fileId);
    if (idx > -1) {
      userFiles.splice(idx, 1);
      db.files[uId] = userFiles;
      found = true;
    }
  }
  if (found) {
    writeDB(db);
  }
  return fileMeta;
}

// Lessons & Questions Curriculum management adapters

// getGradeLessons - retrieves curriculum-wide lessons, starting empty if none exist in DB so teachers can build custom curriculums
async function getGradeLessons(grade: number): Promise<any[]> {
  if (grade === undefined || grade === null || isNaN(Number(grade))) {
    return [];
  }
  const gradeNum = Number(grade);
  const dbKey = `grade_${gradeNum}`;
  
  if (useFirestore && dbFirestore) {
    try {
      const q = query(collection(dbFirestore, 'lessons'), where('grade', '==', gradeNum));
      const querySnapshot = await getDocs(q);
      const lessons = querySnapshot.docs.map(doc => doc.data());
      lessons.sort((a, b) => (a.lessonNum || 0) - (b.lessonNum || 0));
      return lessons;
    } catch (err) {
      console.error(`Firestore getGradeLessons error for grade ${gradeNum}:`, err);
    }
  }

  const db = readDB();
  if (db.lessons && db.lessons[dbKey]) {
    return db.lessons[dbKey];
  }

  return [];
}

async function saveGradeLessons(grade: number, lessons: any[]): Promise<void> {
  const dbKey = `grade_${grade}`;
  
  if (useFirestore && dbFirestore) {
    try {
      for (const lesson of lessons) {
        const docId = `grade_${grade}_${lesson.id}`;
        await setDoc(doc(dbFirestore, 'lessons', docId), lesson);
      }
    } catch (err) {
      console.error(`Firestore saveGradeLessons error for grade ${grade}:`, err);
    }
  }

  const db = readDB();
  if (!db.lessons) {
    db.lessons = {};
  }
  db.lessons[dbKey] = lessons;
  writeDB(db);
}

async function deleteGradeLesson(grade: number, lessonId: string): Promise<any[]> {
  const dbKey = `grade_${grade}`;
  
  if (useFirestore && dbFirestore) {
    try {
      const docId = `grade_${grade}_${lessonId}`;
      await deleteDoc(doc(dbFirestore, 'lessons', docId));
    } catch (err) {
      console.error(`Firestore deleteGradeLesson error for grade ${grade} lesson ${lessonId}:`, err);
    }
  }

  // Properly load current lessons to ensure consistency in both Local and Firestore configurations
  const currentLessons = await getGradeLessons(grade);
  const remainingLessons = currentLessons.filter((l: any) => l.id !== lessonId);
  
  // Normalize numbering
  remainingLessons.forEach((l: any, idx: number) => {
    l.lessonNum = idx + 1;
  });

  const db = readDB();
  if (!db.lessons) {
    db.lessons = {};
  }
  db.lessons[dbKey] = remainingLessons;
  writeDB(db);

  return remainingLessons;
}

// Question Bank database helper functions
async function getQuestionBank(): Promise<any[]> {
  let questions: any[] = [];
  let isFirestoreInitialized = false;
  
  if (useFirestore && dbFirestore) {
    try {
      const q = query(collection(dbFirestore, 'questions'));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => doc.data());
      
      if (docs.length > 0) {
        isFirestoreInitialized = true;
      }
      
      questions = docs;
    } catch (err) {
      console.error('Firestore getQuestionBank error:', err);
    }
  }

  // Fallback or read from local DB
  const db = readDB();
  
  let isMetadataInitialized = false;
  if (useFirestore && dbFirestore) {
    try {
      const snap = await getDoc(doc(dbFirestore, 'users', 'qb_metadata'));
      if (snap.exists() && snap.data()?.initialized === true) {
        isMetadataInitialized = true;
      }
    } catch (err) {
      console.error('Firestore check qb_metadata error:', err);
    }
  }

  const alreadyInitialized = db.questionsInitialized === true || 
                             isFirestoreInitialized || 
                             isMetadataInitialized ||
                             (db.questions && db.questions.length > 0);

  if (!useFirestore || questions.length === 0) {
    if (db.questions && db.questions.length > 0) {
      questions = db.questions;
    }
  }

  let cleanQuestions = questions.filter(q => q.id !== 'init_flag_marker' && q.id !== '__init_flag__' && (!q.id || !q.id.startsWith('hw_')));

  // Cleanup: Automatically and completely remove legacy indicators/hw_ questions if present
  if (useFirestore && dbFirestore) {
    try {
      const hasLegacyMarkers = questions.some(q => q.id === 'init_flag_marker' || (q.id && q.id.startsWith('hw_')));
      
      if (hasLegacyMarkers) {
        console.log('Completely deleting legacy question markers and default homework questions from Firestore...');
        await deleteDoc(doc(dbFirestore, 'questions', 'init_flag_marker'));
        for (const q of questions) {
          if (q.id && q.id.startsWith('hw_')) {
            await deleteDoc(doc(dbFirestore, 'questions', q.id));
          }
        }
        // Write the clean, hidden metadata marker to users/qb_metadata
        await setDoc(doc(dbFirestore, 'users', 'qb_metadata'), { initialized: true });
      }
    } catch (e) {
      console.error('Error cleaning up legacy indicators:', e);
    }
  }

  // If local DB questions array contains any hw_ or legacy questions, filter them out and save back to local DB
  if (db.questions && db.questions.some(q => q.id && (q.id === 'init_flag_marker' || q.id === '__init_flag__' || q.id.startsWith('hw_')))) {
    db.questions = db.questions.filter(q => q.id && q.id !== 'init_flag_marker' && q.id !== '__init_flag__' && !q.id.startsWith('hw_'));
    db.questionsInitialized = true;
    writeDB(db);
  }

  // Initialize with baseQuestions from src/questionsData.ts ONLY if completely empty and was never initialized before
  if (cleanQuestions.length === 0 && !alreadyInitialized) {
    console.log('Initializing Question Bank with base questions...');
    try {
      // We will assign a qNum (1-based index) to each question
      const initialized = baseQuestions.map((q, idx) => ({
        ...q,
        qNum: idx + 1,
        createdAt: new Date().toISOString()
      }));
      
      // Save them to Firestore if available
      if (useFirestore && dbFirestore) {
        for (const item of initialized) {
          await setDoc(doc(dbFirestore, 'questions', item.id), item);
        }
        
        // Save the clean metadata flag to Firestore users/qb_metadata (NOT the questions collection)
        await setDoc(doc(dbFirestore, 'users', 'qb_metadata'), { initialized: true });
      }
      
      db.questions = initialized;
      db.questionsInitialized = true;
      writeDB(db);
      
      cleanQuestions = initialized;
    } catch (err) {
      console.error('Error initializing Question Bank with baseQuestions:', err);
    }
  } else {
    // Make sure our local database shows we are initialized
    if (!db.questionsInitialized) {
      db.questionsInitialized = true;
      writeDB(db);
    }

    // Save metadata flag to Firestore users/qb_metadata if missing
    if (useFirestore && dbFirestore && !isMetadataInitialized) {
      try {
        await setDoc(doc(dbFirestore, 'users', 'qb_metadata'), { initialized: true });
      } catch (e) {
        // ignore
      }
    }
  }

  // Ensure questions are sorted by qNum ascending
  cleanQuestions.sort((a, b) => (a.qNum || 0) - (b.qNum || 0));

  // If any question doesn't have a qNum or order is messed up, assign it sequentially
  let updated = false;
  cleanQuestions.forEach((q, idx) => {
    if (q.qNum !== idx + 1) {
      q.qNum = idx + 1;
      updated = true;
    }
  });

  if (updated) {
    const dbSave = readDB();
    dbSave.questions = cleanQuestions;
    dbSave.questionsInitialized = true;
    writeDB(dbSave);
    if (useFirestore && dbFirestore) {
      try {
        for (const item of cleanQuestions) {
          await setDoc(doc(dbFirestore, 'questions', item.id), item);
        }
      } catch (err) {
        console.error('Error synchronizing corrected qNum back to Firestore:', err);
      }
    }
  }

  return cleanQuestions;
}

async function saveQuestionToBank(questionDraft: any): Promise<any[]> {
  const allQs = await getQuestionBank();
  const existIndex = allQs.findIndex(q => q.id === questionDraft.id);
  
  let updatedQs = [...allQs];
  if (existIndex >= 0) {
    // Keep qNum from the existing question
    questionDraft.qNum = allQs[existIndex].qNum;
    updatedQs[existIndex] = questionDraft;
  } else {
    // Assign a new qNum at the end
    questionDraft.qNum = allQs.length + 1;
    questionDraft.createdAt = new Date().toISOString();
    updatedQs.push(questionDraft);
  }

  // Save changes locally
  const db = readDB();
  db.questions = updatedQs;
  db.questionsInitialized = true;
  writeDB(db);

  // Save to Firestore
  if (useFirestore && dbFirestore) {
    try {
      await setDoc(doc(dbFirestore, 'questions', questionDraft.id), questionDraft);
    } catch (err) {
      console.error('Firestore saveQuestionToBank error:', err);
    }
  }

  return updatedQs;
}

async function deleteQuestionFromBank(questionId: string): Promise<any[]> {
  const allQs = await getQuestionBank();
  const remainingQs = allQs.filter(q => q.id !== questionId);
  
  // Re-index remaining questions sequentially 1 to (N-1)
  remainingQs.forEach((q, idx) => {
    q.qNum = idx + 1;
  });

  // Save changes locally
  const db = readDB();
  db.questions = remainingQs;
  db.questionsInitialized = true;
  writeDB(db);

  // Delete from Firestore, and also save re-indexed questions to Firestore
  if (useFirestore && dbFirestore) {
    try {
      await deleteDoc(doc(dbFirestore, 'questions', questionId));
      for (const q of remainingQs) {
        await setDoc(doc(dbFirestore, 'questions', q.id), q);
      }
    } catch (err) {
      console.error('Firestore deleteQuestionFromBank error:', err);
    }
  }

  return remainingQs;
}


// Token helper functions using standard cryptographic HMAC signatures (native crypto)
function generateToken(userId: string, sessionId?: string): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ userId, exp: expiresAt, sessionId })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const recomputedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
    if (signature !== recomputedSignature) return null;
    const payloadData = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (payloadData.exp < Date.now()) return null; // expired token
    return payloadData.userId;
  } catch {
    return null;
  }
}

function parseTokenPayload(token: string): { userId: string; sessionId?: string; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const recomputedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
    if (signature !== recomputedSignature) return null;
    const payloadData = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (payloadData.exp < Date.now()) return null;
    return payloadData;
  } catch {
    return null;
  }
}

// Make sure our server handles JSON requests with generous size limits for base64 file uploads
app.use(express.json({ limit: '50mb' }));

// Middleware to extract authentication from Bearer token
async function authMiddleware(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Bạn cần đăng nhập để tiếp tục.' });
    }
    const token = authHeader.substring(7);
    const payload = parseTokenPayload(token);
    if (!payload) {
      return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    }
    
    const { userId, sessionId } = payload;
    const user = await getUser(userId);
    if (!user) {
      return res.status(401).json({ error: 'Người dùng không tồn tại.' });
    }

    // Concurrent sessions prevention:
    // If user has a currentSessionId recorded, and the token is from an older session, block access.
    if (user.currentSessionId && sessionId && user.currentSessionId !== sessionId) {
      return res.status(401).json({
        error: 'Tài khoản của em đã được đăng nhập từ một thiết bị khác. Phiên làm việc này đã bị vô hiệu hóa để bảo mật!',
        concurrentLogout: true
      });
    }
    
    req.userId = userId;
    req.user = user;
    next();
  } catch (err: any) {
    console.error('Authentication middleware failure:', err);
    return res.status(401).json({ error: 'Lỗi xác thực hệ thống hoặc tải thông tin người dùng.' });
  }
}

// --- API ENDPOINTS ---

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, password, nickname, grade, school, classroom, role, regCode } = req.body;
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';
  const isStaff = isTeacher || isAdmin;

  if (isStaff) {
    if (!username || !password || !nickname || !regCode) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin: tên đăng nhập, mật khẩu, họ và tên, và mã đăng ký.' });
    }
    if (isTeacher && regCode !== 'GiaoVienTinHocIC3') {
      return res.status(400).json({ error: 'Mã đăng ký giáo viên không chính xác.' });
    }
    if (isAdmin && regCode !== 'NguyenHuuDaiMaiDinh123@TinHocDaiDuong') {
      return res.status(400).json({ error: 'Mã đăng ký admin không chính xác.' });
    }
  } else {
    if (!username || !password || !nickname || !grade || !school || !classroom) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin: tên đăng nhập, mật khẩu, họ và tên, trường, khối lớp và lớp.' });
    }
  }

  // Validate strong password requirements
  if (password.length < 8) {
    return res.status(400).json({ error: 'Mật khẩu đăng ký phải từ 8 ký tự trở lên để đảm bảo an toàn.' });
  }
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ error: 'Mật khẩu đăng ký phải chứa ít nhất 1 chữ cái viết hoa (A-Z).' });
  }
  if (!/[a-z]/.test(password)) {
    return res.status(400).json({ error: 'Mật khẩu đăng ký phải chứa ít nhất 1 chữ cái viết thường (a-z).' });
  }
  if (!/\d/.test(password)) {
    return res.status(400).json({ error: 'Mật khẩu đăng ký phải chứa ít nhất 1 chữ số (0-9).' });
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return res.status(400).json({ error: 'Mật khẩu đăng ký phải chứa ít nhất 1 ký tự đặc biệt (ví dụ: !, @, #, $, %,...).' });
  }
  const commonWeakPasswords = ['123456', '12345678', 'password', '111111', '123456789'];
  if (commonWeakPasswords.includes(password.trim())) {
    return res.status(400).json({ error: 'Mật khẩu này quá quen thuộc và dễ bị đoán. Hãy chọn mật khẩu khác an toàn hơn nhé!' });
  }

  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Tên đăng nhập tối thiểu phải có 3 ký tự.' });
  }

  // Grade support check: 3 to 8
  let selectedGrade = 6;
  if (!isStaff) {
    selectedGrade = Number(grade);
    if (isNaN(selectedGrade) || selectedGrade < 3 || selectedGrade > 8) {
      return res.status(400).json({ error: 'Khối lớp không hợp lệ. Vui lòng chọn khối lớp từ 3 đến 8.' });
    }
  }

  // Nickname validation (họ tên học sinh hoặc giáo viên)
  const cleanNickname = nickname.trim();
  if (cleanNickname.length < 4) {
    return res.status(400).json({ error: 'Họ và tên của em/thầy cô tối thiểu phải có từ 4 ký tự.' });
  }
  if (cleanNickname.length > 50) {
    return res.status(400).json({ error: 'Họ và tên không được vượt quá 50 ký tự.' });
  }

  // Reject numbers or special characters in human name
  const nameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơưáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐ\s]+$/;
  if (!nameRegex.test(cleanNickname)) {
    return res.status(400).json({ error: 'Họ và tên chỉ được chứa các chữ cái và khoảng trắng.' });
  }

  // Repeating character gibberish check (e.g. hhhhh, aaaaa)
  if (/(.)\1{3,}/i.test(cleanNickname)) {
    return res.status(400).json({ error: 'Họ và tên không hợp lệ vì chứa các ký tự lặp lại quá nhiều lần.' });
  }

  // School name validation
  let cleanSchool = '';
  if (!isStaff) {
    cleanSchool = school.trim();
    if (cleanSchool.length < 5) {
      return res.status(400).json({ error: 'Tên trường học tối thiểu phải có từ 5 ký tự.' });
    }
    if (cleanSchool.length > 100) {
      return res.status(400).json({ error: 'Tên trường học của em quá dài. Vui lòng nhập ngắn gọn dưới 100 ký tự.' });
    }

    // Mandated containment of THCS / THPT / TH
    const hasValidSchoolPrefix = /(thcs|thpt|\bth\b)/i.test(cleanSchool);
    if (!hasValidSchoolPrefix) {
      return res.status(400).json({ error: 'Tên trường học bắt buộc phải chứa cụm viết tắt cấp học tương ứng: TH, THCS, hoặc THPT (Ví dụ: Tiểu học TH Kim Đồng, THCS Lý Thường Kiệt...)' });
    }

    // Repeating characters school check
    if (/(.)\1{4,}/i.test(cleanSchool)) {
      return res.status(400).json({ error: 'Tên trường học không hợp lệ vì chứa các ký tự lặp lại liên tục bậy bạ.' });
    }
  }

  // Profanity blacklist check (Vietnamese and English)
  const blacklist = [
    'đéo', 'địt', 'lồn', 'buồi', 'cặc', 'vcl', 'clm', 'dcm', 'đm', 'vkl', 'đỉ', 'bú', 'chó', 'dâm', 'ngu',
    'fuck', 'bitch', 'shit', 'asshole', 'idiot', 'cac', 'lon', 'buoi', 'deo', 'dit', 'dm', 'con cac'
  ];
  
  const nicknameLower = cleanNickname.toLowerCase();
  const schoolLower = cleanSchool.toLowerCase();

  const getWords = (text: string) => 
    text.split(/[^a-z0-9àáâãèéêìíòóôõùúăđĩũơưăâêôơưáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/i).filter(Boolean);

  const checkProfanity = (textLower: string) => {
    const words = getWords(textLower);
    const hasExactBadWord = words.some(w => blacklist.includes(w));
    if (hasExactBadWord) return true;
    
    return blacklist.some(phrase => {
      if (phrase.includes(' ')) {
        const pattern = new RegExp(`(^|\\s)${phrase}($|\\s)`);
        return pattern.test(textLower);
      }
      return false;
    });
  };

  if (checkProfanity(nicknameLower)) {
    return res.status(400).json({ error: 'Tên học sinh của em chứa từ ngữ không phù hợp hoặc nhạy cảm. Vui lòng nhập tên thật!' });
  }

  if (!isStaff && checkProfanity(schoolLower)) {
    return res.status(400).json({ error: 'Tên trường học chứa từ ngữ không phù hợp hoặc nhạy cảm.' });
  }

  // Check duplicates
  const userExists = await findUserByUsername(cleanUsername);
  if (userExists) {
    return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại trên hệ thống.' });
  }

  // Create salt and hash
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  const id = crypto.randomUUID();

  const sessionId = Date.now() + '-' + Math.random().toString(36).substring(2, 9);

  const newUser = isStaff ? {
    id,
    username: cleanUsername,
    nickname: cleanNickname,
    role, // 'teacher' or 'admin'
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
    currentSessionId: sessionId,
  } : {
    id,
    username: cleanUsername,
    nickname: cleanNickname,
    grade: selectedGrade,
    school: cleanSchool,
    classroom: classroom.trim(),
    role: 'student',
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
    currentSessionId: sessionId,
  };

  await saveUser(id, newUser);

  const token = generateToken(id, sessionId);
  res.status(201).json({
    token,
    user: isStaff ? {
      id,
      username: cleanUsername,
      nickname: cleanNickname,
      role,
    } : {
      id,
      username: cleanUsername,
      nickname: cleanNickname,
      grade: selectedGrade,
      school: cleanSchool,
      classroom: classroom.trim(),
      role: 'student',
    }
  });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ tên đăng nhập và mật khẩu.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const user = await findUserByUsername(cleanUsername);
  if (!user) {
    return res.status(400).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
  }

  const computedHash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');
  if (user.passwordHash !== computedHash) {
    return res.status(400).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
  }

  // Create a new unique session identifier for this device login
  const sessionId = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  user.currentSessionId = sessionId;
  await saveUser(user.id, user);

  const token = generateToken(user.id, sessionId);
  const isStaff = user.role === 'teacher' || user.role === 'admin';
  res.json({
    token,
    user: isStaff ? {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      role: user.role,
    } : {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      grade: user.grade,
      school: user.school,
      classroom: user.classroom,
      role: user.role || 'student',
    }
  });
});

// Profile / Me
app.get('/api/auth/me', authMiddleware, (req: any, res) => {
  const isStaff = req.user.role === 'teacher' || req.user.role === 'admin';
  res.json({
    user: isStaff ? {
      id: req.user.id,
      username: req.user.username,
      nickname: req.user.nickname,
      role: req.user.role,
    } : {
      id: req.user.id,
      username: req.user.username,
      nickname: req.user.nickname,
      grade: req.user.grade,
      school: req.user.school,
      classroom: req.user.classroom,
      role: req.user.role || 'student',
    }
  });
});

// Change Password
app.post('/api/auth/change-password', authMiddleware, async (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới.' });
    }

    // Verify current password
    const computedHash = crypto.pbkdf2Sync(currentPassword, req.user.salt, 1000, 64, 'sha512').toString('hex');
    if (req.user.passwordHash !== computedHash) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác.' });
    }

    // Validate new password safety (uppercase, lowercase, number, special characters, and >= 8 chars)
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Mật khẩu mới phải từ 8 ký tự trở lên để đảm bảo an toàn.' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Mật khẩu mới phải chứa ít nhất 1 chữ cái viết hoa (A-Z).' });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Mật khẩu mới phải chứa ít nhất 1 chữ cái viết thường (a-z).' });
    }
    if (!/\d/.test(newPassword)) {
      return res.status(400).json({ error: 'Mật khẩu mới phải chứa ít nhất 1 chữ số (0-9).' });
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword)) {
      return res.status(400).json({ error: 'Mật khẩu mới phải chứa ít nhất 1 ký tự đặc biệt (ví dụ: !, @, #, $, %,...).' });
    }

    const commonWeakPasswords = ['123456', '12345678', 'password', 'abcdef', '111111', '123456789'];
    if (commonWeakPasswords.includes(newPassword.trim())) {
      return res.status(400).json({ error: 'Mật khẩu mới này quá yếu và dễ đoán. Hãy chọn mật khẩu khác an toàn hơn nhé!' });
    }

    // Hash and save new password
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.pbkdf2Sync(newPassword, salt, 1000, 64, 'sha512').toString('hex');

    const updatedUser = {
      ...req.user,
      passwordHash,
      salt
    };

    await saveUser(req.user.id, updatedUser);
    res.json({ status: 'ok', message: 'Đổi mật khẩu thành công!' });
  } catch (err: any) {
    console.error('Password change failure:', err);
    res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống khi đổi mật khẩu.' });
  }
});

// Reset Password (Forgot Password)
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { username, nickname, role, grade, classroom, regCode, newPassword } = req.body;
    if (!username || !nickname || !role || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ các thông tin bắt buộc.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = await findUserByUsername(cleanUsername);

    if (!user) {
      return res.status(400).json({ error: 'Không tìm thấy tài khoản với tên đăng nhập này.' });
    }

    // Check matching role
    const userRole = user.role || 'student';
    if (userRole !== role) {
      return res.status(400).json({ error: 'Vui lòng chọn chính xác loại tài khoản Học sinh/Giáo viên/Admin.' });
    }

    // Verify nickname case-insensitively
    if (user.nickname.trim().toLowerCase() !== nickname.trim().toLowerCase()) {
      return res.status(400).json({ error: 'Họ và tên không khớp với tài khoản đã đăng ký.' });
    }

    // Verification for each role
    if (role === 'student') {
      if (!grade || !classroom) {
        return res.status(400).json({ error: 'Vui lòng cung cấp khối lớp và lớp của em để xác minh.' });
      }
      if (Number(user.grade) !== Number(grade)) {
        return res.status(400).json({ error: 'Khối lớp học tập không trùng khớp.' });
      }
      
      const userClassNormal = (user.classroom || '').trim().replace(/[/\-.\s]+/g, '').toLowerCase();
      const inputClassNormal = String(classroom).trim().replace(/[/\-.\s]+/g, '').toLowerCase();
      if (userClassNormal !== inputClassNormal) {
        return res.status(400).json({ error: 'Lớp học của em không trùng khớp với tài khoản.' });
      }
    } else {
      // Teacher or Admin verification with registration code standard matching
      if (!regCode) {
        return res.status(400).json({ error: 'Vui lòng nhập mã đăng ký quyền tương ứng để xác minh.' });
      }
      const standardCode = role === 'teacher' ? 'GiaoVienTinHocIC3' : 'NguyenHuuDaiMaiDinh123@TinHocDaiDuong';
      if (regCode.trim() !== standardCode) {
        return res.status(400).json({ error: 'Mã đăng ký xác minh quyền không chính xác.' });
      }
    }

    // Validate new password rules (uppercase, lowercase, number, special characters, and >= 8 chars)
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Mật khẩu mới phải từ 8 ký tự trở lên để đảm bảo an toàn.' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Mật khẩu mới phải chứa ít nhất 1 chữ cái viết hoa (A-Z).' });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Mật khẩu mới phải chứa ít nhất 1 chữ cái viết thường (a-z).' });
    }
    if (!/\d/.test(newPassword)) {
      return res.status(400).json({ error: 'Mật khẩu mới phải chứa ít nhất 1 chữ số (0-9).' });
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword)) {
      return res.status(400).json({ error: 'Mật khẩu mới phải chứa ít nhất 1 ký tự đặc biệt (ví dụ: !, @, #, $, %,...).' });
    }
    const commonWeakPasswords = ['123456', '12345678', 'password', '111111', '123456789'];
    if (commonWeakPasswords.includes(newPassword.trim())) {
      return res.status(400).json({ error: 'Mật khẩu này quá quen thuộc và dễ bị đoán. Hãy chọn mật khẩu khác an toàn hơn nhé!' });
    }

    // Ok, hash the password
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.pbkdf2Sync(newPassword, salt, 1000, 64, 'sha512').toString('hex');

    const updatedUser = {
      ...user,
      passwordHash,
      salt
    };

    await saveUser(user.id, updatedUser);
    res.json({ status: 'ok', message: 'Đặt lại mật khẩu thành công! Bây giờ em đã có thể đăng nhập bằng mật khẩu mới này.' });
  } catch (err: any) {
    console.error('Password reset endpoint failure:', err);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi khôi phục đặt lại mật khẩu.' });
  }
});

// Get progress
app.get('/api/progress', authMiddleware, async (req: any, res) => {
  try {
    const userProgress = await getUserProgress(req.userId);
    const lessons = await getGradeLessons(req.user.grade);
    const joinedProgress = userProgress.map(p => {
      const lesson = lessons.find(l => l.id === p.lessonId);
      return {
        ...p,
        lessonTitle: lesson ? lesson.title : ''
      };
    });
    res.json({ progress: joinedProgress });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải tiến trình học tập: ' + err.message });
  }
});

// Get homework progress
app.get('/api/homework-progress', authMiddleware, async (req: any, res) => {
  try {
    const userProgress = await getUserHomeworkProgress(req.userId);
    const lessons = await getGradeLessons(req.user.grade);
    const joinedProgress = userProgress.map(p => {
      const lesson = lessons.find(l => l.id === p.lessonId);
      return {
        ...p,
        lessonTitle: lesson ? lesson.title : ''
      };
    });
    res.json({ progress: joinedProgress });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải tiến trình bài tập về nhà: ' + err.message });
  }
});

// Get all student results / scoreboards (Teacher & Admin)
app.get('/api/teacher/scoreboard', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ giáo viên hoặc quản trị viên mới được quyền truy cập bảng điểm học sinh.' });
  }

  try {
    let allStudents: any[] = [];
    let progressMap: Record<string, any[]> = {};
    let homeworkProgressMap: Record<string, any[]> = {};
    let examsMap: Record<string, any[]> = {};

    if (useFirestore && dbFirestore) {
      try {
        // Query from new students collection query
        const studentsSnapshot = await getDocs(collection(dbFirestore, 'students'));
        const studentsList = studentsSnapshot.docs.map(doc => doc.data());

        // Fetch fallback students from legacy users collection
        let legacyStudents: any[] = [];
        try {
          const usersSnapshot = await getDocs(collection(dbFirestore, 'users'));
          legacyStudents = usersSnapshot.docs.map(doc => doc.data()).filter(u => u.username && u.role !== 'teacher' && u.role !== 'admin');
        } catch (e) {
          // ignore
        }

        // Merge to prevent dropping any student records
        const studentMap = new Map();
        legacyStudents.forEach(s => studentMap.set(s.id, s));
        studentsList.forEach(s => studentMap.set(s.id, s));
        allStudents = Array.from(studentMap.values()).filter((student: any) => student.role !== 'teacher' && student.role !== 'admin');

        let allProgress: any[] = [];
        try {
          const progressSnapshot = await getDocs(collection(dbFirestore, 'progress'));
          allProgress = progressSnapshot.docs.map(doc => doc.data());
        } catch (perr) {
          console.error('Firestore scoreboard progress fetch fail, falling back to local:', perr);
          allProgress = [];
        }

        if (allProgress.length > 0) {
          for (const p of allProgress) {
            if (!progressMap[p.userId]) progressMap[p.userId] = [];
            progressMap[p.userId].push(p);
          }
        } else {
          progressMap = readDB().progress || {};
        }

        let allHomeworkProgress: any[] = [];
        try {
          const hpSnapshot = await getDocs(collection(dbFirestore, 'progressHomework'));
          allHomeworkProgress = hpSnapshot.docs.map(doc => doc.data());
        } catch (hperr) {
          console.error('Firestore scoreboard homework progress fetch fail, falling back to local:', hperr);
          allHomeworkProgress = [];
        }

        if (allHomeworkProgress.length > 0) {
          for (const hp of allHomeworkProgress) {
            if (!homeworkProgressMap[hp.userId]) homeworkProgressMap[hp.userId] = [];
            homeworkProgressMap[hp.userId].push(hp);
          }
        } else {
          homeworkProgressMap = readDB().progressHomework || {};
        }

        let allExams: any[] = [];
        try {
          const examsSnapshot = await getDocs(collection(dbFirestore, 'exams'));
          allExams = examsSnapshot.docs.map(doc => doc.data());
        } catch (eerr) {
          console.error('Firestore scoreboard exams fetch fail, falling back to local:', eerr);
          allExams = [];
        }

        if (allExams.length > 0) {
          for (const e of allExams) {
            if (!examsMap[e.userId]) examsMap[e.userId] = [];
            examsMap[e.userId].push(e);
          }
        } else {
          examsMap = readDB().exams || {};
        }
      } catch (fErr) {
        console.error('Firestore scoreboard loading error, using local fallback:', fErr);
        const db = readDB();
        progressMap = db.progress || {};
        homeworkProgressMap = db.progressHomework || {};
        examsMap = db.exams || {};
      }
    } else {
      const db = readDB();
      const localStudents = Object.values(db.students || {});
      const legacyStudents = Object.values(db.users || {}).filter((u: any) => u.username && u.role !== 'teacher' && u.role !== 'admin');
      const studentMap = new Map();
      legacyStudents.forEach(s => studentMap.set(s.id, s));
      localStudents.forEach(s => studentMap.set(s.id, s));
      allStudents = Array.from(studentMap.values()).filter((student: any) => student.role !== 'teacher' && student.role !== 'admin');

      progressMap = db.progress || {};
      homeworkProgressMap = db.progressHomework || {};
      examsMap = db.exams || {};
    }

    // Fetch all lessons from all supported grades 3 to 8 to map lessonId to lessonTitle
    const lessonTitleMap: Record<string, string> = {};
    for (let g = 3; g <= 8; g++) {
      try {
        const gradeLessons = await getGradeLessons(g);
        for (const l of gradeLessons) {
          lessonTitleMap[l.id] = l.title;
        }
      } catch (e) {
        // ignore
      }
    }

    // Students list is already compiled and filtered above
    const students = allStudents;

    // Aggregate scoreboard records
    const scoreboard = students.map(student => {
      const studentProgress = progressMap[student.id] || [];
      const studentHomeworkProgress = homeworkProgressMap[student.id] || [];
      const studentExams = examsMap[student.id] || [];

      const enrichedProgress = studentProgress.map(p => {
        return {
          ...p,
          lessonTitle: lessonTitleMap[p.lessonId] || ''
        };
      });

      const enrichedHomeworkProgress = studentHomeworkProgress.map(hp => {
        return {
          ...hp,
          lessonTitle: lessonTitleMap[hp.lessonId] || ''
        };
      });

      // Calculate stats
      const totalExams = studentExams.length;
      const highestScore = totalExams > 0 ? Math.max(...studentExams.map(e => e.score)) : 0;
      const averageScore = totalExams > 0 ? Math.round(studentExams.reduce((acc, cr) => acc + cr.score, 0) / totalExams) : 0;
      const completedRevisionLessons = enrichedProgress.filter(p => p.isCompleted).length;

      return {
        id: student.id,
        nickname: student.nickname,
        username: student.username,
        grade: student.grade,
        classroom: student.classroom || '',
        school: student.school || '',
        createdAt: student.createdAt,
        stats: {
          totalExams,
          highestScore,
          averageScore,
          completedRevision: completedRevisionLessons,
          progress: enrichedProgress,
          homeworkProgress: enrichedHomeworkProgress,
          exams: studentExams
        }
      };
    });

    res.json({ success: true, scoreboard });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi khi tải bảng điểm học sinh: ' + err.message });
  }
});

// Clear all student data for new school year (Admin Only)
app.post('/api/teacher/clear-students', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Tính năng dọn dẹp hệ thống này chỉ dành riêng cho tài khoản Quản trị viên (Admin).' });
  }

  try {
    if (useFirestore && dbFirestore) {
      // Query of student documents from Firestore
      const studentsSnapshot = await getDocs(collection(dbFirestore, 'students'));
      const firestoreStudentIds = studentsSnapshot.docs.map(doc => doc.id);

      // Delete from 'students'
      for (const sId of firestoreStudentIds) {
        await deleteDoc(doc(dbFirestore, 'students', sId));
      }

      // Delete from legacy 'users' collection where role !== 'teacher' and !== 'admin' or ID is a student
      const usersSnapshot = await getDocs(collection(dbFirestore, 'users'));
      for (const uDoc of usersSnapshot.docs) {
        const uData = uDoc.data();
        if (uData.role === 'student' || !uData.role || firestoreStudentIds.includes(uDoc.id)) {
          await deleteDoc(uDoc.ref);
        }
      }

      // Delete progress docs
      const progressSnapshot = await getDocs(collection(dbFirestore, 'progress'));
      for (const pDoc of progressSnapshot.docs) {
        const pData = pDoc.data();
        if (pData && (firestoreStudentIds.includes(pData.userId) || !pData.userId)) {
          await deleteDoc(pDoc.ref);
        }
      }

      // Delete exams docs
      const examsSnapshot = await getDocs(collection(dbFirestore, 'exams'));
      for (const eDoc of examsSnapshot.docs) {
        const eData = eDoc.data();
        if (eData && (firestoreStudentIds.includes(eData.userId) || !eData.userId)) {
          await deleteDoc(eDoc.ref);
        }
      }

      // Delete files docs (only those uploaded by students, keep teacher files)
      const filesSnapshot = await getDocs(collection(dbFirestore, 'files'));
      for (const fDoc of filesSnapshot.docs) {
        const fData = fDoc.data();
        if (fData && (firestoreStudentIds.includes(fData.userId) || !fData.userId)) {
          await deleteDoc(fDoc.ref);
        }
      }

      // Delete homeworks (bài tập về nhà) and progressHomework (tiến trình làm bài tập) docs for the new school year
      const homeworksSnapshot = await getDocs(collection(dbFirestore, 'homeworks'));
      for (const hwDoc of homeworksSnapshot.docs) {
        await deleteDoc(hwDoc.ref);
      }
      const progressHomeworkSnapshot = await getDocs(collection(dbFirestore, 'progressHomework'));
      for (const phDoc of progressHomeworkSnapshot.docs) {
        await deleteDoc(phDoc.ref);
      }
    } else {
      const db = readDB();
      // Clean up local database: keep ONLY teachers and admins, reset homeworks & progress too
      db.students = {};
      db.progress = {};
      db.exams = {};
      db.homeworks = [];
      db.progressHomework = {};
      
      // Keep only files uploaded by teachers or admins
      const newFiles: Record<string, any> = {};
      if (db.files) {
        for (const [key, value] of Object.entries(db.files)) {
          const isTeacherFile = db.teachers && db.teachers[key];
          const isAdminFile = db.users && db.users[key] && db.users[key].role === 'admin';
          if (isTeacherFile || isAdminFile) {
            newFiles[key] = value;
          }
        }
      }
      db.files = newFiles;

      // Filter db.users to keep ONLY teachers and admins
      const filteredUsers: Record<string, any> = {};
      if (db.users) {
        for (const [key, value] of Object.entries(db.users)) {
          const uRole = (value as any).role;
          if (uRole === 'teacher' || uRole === 'admin') {
            filteredUsers[key] = value;
          }
        }
      }
      db.users = filteredUsers;

      writeDB(db);
    }

    res.json({ success: true, message: 'Đã xóa toàn bộ dữ liệu học sinh thành công để chuẩn bị cho năm học mới!' });
  } catch (err: any) {
    console.error('Failed to clear students data list:', err);
    res.status(500).json({ error: 'Lỗi hệ thống khi thiết lập lại dữ liệu năm học mới.' });
  }
});

// Update progress
app.post('/api/progress/update', authMiddleware, async (req: any, res) => {
  const { grade, lessonId, completedQuestions, correctAnswers, totalQuestions, isCompleted } = req.body;
  
  if (grade === undefined || !lessonId || completedQuestions === undefined || correctAnswers === undefined || totalQuestions === undefined) {
    return res.status(400).json({ error: 'Giá trị thông số tiến trình không hợp lệ.' });
  }

  // Prevent teacher/admin actions from writing to database
  if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin')) {
    return res.json({ success: true, isDemo: true, progress: [] });
  }

  const progressList = await saveUserProgress(
    req.userId,
    grade,
    lessonId,
    completedQuestions,
    correctAnswers,
    totalQuestions,
    isCompleted
  );
  res.json({ success: true, progress: progressList });
});

// Update homework progress
app.post('/api/homework-progress/update', authMiddleware, async (req: any, res) => {
  const { grade, lessonId, homeworkId, completedQuestions, correctAnswers, totalQuestions, isCompleted } = req.body;
  
  if (grade === undefined || !lessonId || !homeworkId || completedQuestions === undefined || correctAnswers === undefined || totalQuestions === undefined) {
    return res.status(400).json({ error: 'Giá trị thông số tiến trình bài tập về nhà không hợp lệ.' });
  }

  // Prevent teacher/admin actions from writing to database
  if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin')) {
    return res.json({ success: true, isDemo: true, progress: [] });
  }

  try {
    const progressList = await saveUserHomeworkProgress(
      req.userId,
      grade,
      lessonId,
      homeworkId,
      completedQuestions,
      correctAnswers,
      totalQuestions,
      isCompleted
    );
    res.json({ success: true, progress: progressList });
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể cập nhật tiến độ bài tập: ' + err.message });
  }
});

// Get exam records
app.get('/api/exams', authMiddleware, async (req: any, res) => {
  try {
    const userExams = await getUserExams(req.userId);
    res.json({ exams: userExams });
  } catch (err: any) {
    console.error('Failed to get exam records:', err);
    res.status(500).json({ error: 'Lỗi đồng bộ danh sách bài thi: ' + err.message });
  }
});

// Save exam record
app.post('/api/exams/save', authMiddleware, async (req: any, res) => {
  const { grade, score, correctCount, totalQuestions, durationSeconds, isRevisionTest, lessonId, lessonTitle } = req.body;
  
  if (grade === undefined || score === undefined || correctCount === undefined || totalQuestions === undefined || durationSeconds === undefined) {
    return res.status(400).json({ error: 'Dữ liệu bài kiểm tra bị thiếu.' });
  }

  // Prevent teacher/admin actions from writing to database
  if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin')) {
    return res.status(201).json({ success: true, isDemo: true, record: {}, exams: [] });
  }

  const record = await saveExamRecord(
    req.userId,
    grade,
    score,
    correctCount,
    totalQuestions,
    durationSeconds,
    isRevisionTest,
    lessonId,
    lessonTitle
  );
  const exams = await getUserExams(req.userId);

  res.status(201).json({ success: true, record, exams });
});

// Homework/Assignments Management Endpoints
app.get('/api/homework/assignments', authMiddleware, async (req: any, res) => {
  try {
    const list = await getHomeworkAssignments();
    res.json({ success: true, assignments: list });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải danh sách bài tập về nhà: ' + err.message });
  }
});

app.post('/api/homework/assign', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ giáo viên hoặc quản trị viên mới được quyền giao bài tập.' });
  }
  const { grade, school, classroom, lessonId, lessonTitle } = req.body;
  if (!grade || !school || !classroom || !lessonId || !lessonTitle) {
    return res.status(400).json({ error: 'Dữ liệu giao bài tập bị thiếu.' });
  }

  // Set the deadline to 7 days from now, ending at exactly 23:59:59 in Vietnam Time (UTC+7)
  const nowUtc = new Date();
  // Shift to Vietnam Time (+7 hours) to determine target local date
  const nowVietnam = new Date(nowUtc.getTime() + (7 * 60 * 60 * 1000));
  const deadlineVietnam = new Date(nowVietnam);
  deadlineVietnam.setDate(deadlineVietnam.getDate() + 7);
  // Set to 23:59:59.999 of that target local day
  deadlineVietnam.setUTCHours(23, 59, 59, 999);
  // Convert back to real UTC date by subtracting 7 hours
  const deadlineDate = new Date(deadlineVietnam.getTime() - (7 * 60 * 60 * 1000));

  // Sanitize classroom and lessonId to make a strictly valid Firestore document ID matching: ^[a-zA-Z0-9_\-]+$
  const safeClassroom = String(classroom).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeLessonId = String(lessonId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const hwId = `hw_${grade}_${safeClassroom}_${safeLessonId}_${Date.now()}`;
  const newHw = {
    id: hwId,
    grade: Number(grade),
    school: String(school).trim(),
    classroom: String(classroom).trim(),
    lessonId: String(lessonId),
    lessonTitle: String(lessonTitle),
    assignedAt: new Date().toISOString(),
    deadline: deadlineDate.toISOString()
  };

  try {
    await saveHomeworkAssignment(newHw);
    res.status(201).json({ success: true, assignment: newHw });
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể giao bài tập về nhà: ' + err.message });
  }
});

// Curriculum/Lessons Management Endpoints
app.get('/api/lessons', authMiddleware, async (req: any, res) => {
  const grade = Number(req.query.grade) || 3;
  try {
    const lessons = await getGradeLessons(grade);
    const allQuestions = await getQuestionBank();
    const gradeQuestions = allQuestions.filter((q: any) => !q.grade || Number(q.grade) === grade);
    const resolvedLessons = lessons.map((lesson: any) => {
      if (lesson.startIdx !== undefined && lesson.endIdx !== undefined) {
        const start = Math.max(1, Number(lesson.startIdx) || 1);
        const end = Math.min(gradeQuestions.length, Number(lesson.endIdx) || start);
        const resolvedQs = gradeQuestions.slice(start - 1, end);
        return {
          ...lesson,
          questions: resolvedQs,
          qCount: resolvedQs.length,
        };
      }
      return lesson;
    });
    res.json({ success: true, lessons: resolvedLessons });
  } catch (err) {
    console.error('Failed to query lessons catalog:', err);
    res.status(500).json({ error: 'Không thể tải danh sách câu hỏi và học phần.' });
  }
});

// Create/Update lesson & questions catalog (Admin Only)
app.post('/api/lessons/save', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ tài khoản Quản trị viên (Admin) mới có quyền biên soạn và sửa bài tập/học phần.' });
  }
  const { grade, lesson } = req.body;
  if (!grade || !lesson || !lesson.id) {
    return res.status(400).json({ error: 'Cung cấp không đủ thông tin khối lớp hoặc chi tiết bài học.' });
  }

  try {
    const cleanLesson = {
      id: lesson.id,
      grade: Number(grade),
      lessonNum: Number(lesson.lessonNum) || 1,
      title: lesson.title || 'Bài học ôn tập',
      emoji: lesson.emoji || '📖',
      qCount: lesson.qCount !== undefined ? Number(lesson.qCount) : (Array.isArray(lesson.questions) ? lesson.questions.length : 0),
      questions: Array.isArray(lesson.questions) ? lesson.questions : [],
      isCustom: lesson.isCustom !== undefined ? lesson.isCustom : true,
      startIdx: lesson.startIdx !== undefined ? Number(lesson.startIdx) : undefined,
      endIdx: lesson.endIdx !== undefined ? Number(lesson.endIdx) : undefined
    };

    const currentLessons = await getGradeLessons(Number(grade));
    const existIndex = currentLessons.findIndex((l: any) => l.id === lesson.id);

    let updatedLessons = [...currentLessons];
    if (existIndex >= 0) {
      updatedLessons[existIndex] = cleanLesson;
    } else {
      cleanLesson.lessonNum = updatedLessons.length + 1;
      updatedLessons.push(cleanLesson);
    }

    updatedLessons.sort((a, b) => a.lessonNum - b.lessonNum);
    await saveGradeLessons(Number(grade), updatedLessons);

    // Resolve dynamic questions for all lessons before returning to UI
    const allQuestions = await getQuestionBank();
    const gradeNum = Number(grade);
    const gradeQuestions = allQuestions.filter((q: any) => !q.grade || Number(q.grade) === gradeNum);
    const resolvedLessons = updatedLessons.map((l: any) => {
      if (l.startIdx !== undefined && l.endIdx !== undefined) {
        const start = Math.max(1, Number(l.startIdx) || 1);
        const end = Math.min(gradeQuestions.length, Number(l.endIdx) || start);
        const resolvedQs = gradeQuestions.slice(start - 1, end);
        return {
          ...l,
          questions: resolvedQs,
          qCount: resolvedQs.length,
        };
      }
      return l;
    });

    res.json({ success: true, lesson: cleanLesson, lessons: resolvedLessons });
  } catch (err) {
    console.error('Failed to update curriculum lesson:', err);
    res.status(500).json({ error: 'Lỗi đồng bộ lưu trữ bài học.' });
  }
});

// Delete lesson & questions catalog (Admin Only)
app.post('/api/lessons/delete', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ tài khoản Quản trị viên (Admin) mới có quyền xóa bài tập/học phần.' });
  }
  const { grade, lessonId } = req.body;
  if (!grade || !lessonId) {
    return res.status(400).json({ error: 'Cung cấp thiếu thông tin khối lớp hoặc mã bài cần xóa.' });
  }

  try {
    const remainingLessons = await deleteGradeLesson(Number(grade), lessonId);
    
    // Normalize numbering
    remainingLessons.forEach((l: any, idx: number) => {
      l.lessonNum = idx + 1;
    });

    await saveGradeLessons(Number(grade), remainingLessons);

    // Resolve dynamic questions before returning to UI
    const allQuestions = await getQuestionBank();
    const gradeNum = Number(grade);
    const gradeQuestions = allQuestions.filter((q: any) => !q.grade || Number(q.grade) === gradeNum);
    const resolvedLessons = remainingLessons.map((l: any) => {
      if (l.startIdx !== undefined && l.endIdx !== undefined) {
        const start = Math.max(1, Number(l.startIdx) || 1);
        const end = Math.min(gradeQuestions.length, Number(l.endIdx) || start);
        const resolvedQs = gradeQuestions.slice(start - 1, end);
        return {
          ...l,
          questions: resolvedQs,
          qCount: resolvedQs.length,
        };
      }
      return l;
    });

    res.json({ success: true, lessons: resolvedLessons });
  } catch (err) {
    console.error('Failed to delete curriculum lesson:', err);
    res.status(500).json({ error: 'Lỗi hệ thống khi xóa bài học.' });
  }
});

// Question Bank API Endpoints (Admin Only)
app.get('/api/questions', authMiddleware, async (req: any, res) => {
  try {
    const list = await getQuestionBank();
    res.json({ success: true, questions: list });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi tải ngân hàng câu hỏi: ' + err.message });
  }
});

app.post('/api/questions/save', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ tài khoản Quản trị viên (Admin) mới có quyền biên soạn và sửa ngân hàng câu hỏi.' });
  }
  const { question } = req.body;
  if (!question || !question.id) {
    return res.status(400).json({ error: 'Thông tin câu hỏi không đầy đủ.' });
  }
  try {
    const updatedList = await saveQuestionToBank(question);
    res.json({ success: true, question, questions: updatedList });
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể lưu câu hỏi vào ngân hàng: ' + err.message });
  }
});

app.post('/api/questions/delete', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ tài khoản Quản trị viên (Admin) mới có quyền xóa câu hỏi khỏi ngân hàng.' });
  }
  const { questionId } = req.body;
  if (!questionId) {
    return res.status(400).json({ error: 'Mã câu hỏi cần xóa không hợp lệ.' });
  }
  try {
    const updatedList = await deleteQuestionFromBank(questionId);
    res.json({ success: true, questions: updatedList });
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể xóa câu hỏi: ' + err.message });
  }
});

// Reset lesson & questions catalog to initial generation standard (Admin Only)
app.post('/api/lessons/reset', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ tài khoản Quản trị viên (Admin) mới có quyền thiết lập lại học phần mặc định.' });
  }
  const { grade } = req.body;
  if (!grade) {
    return res.status(400).json({ error: 'Cung cấp thiếu thông tin khối lớp cần hoàn tác.' });
  }

  try {
    const gradeNum = Number(grade);
    const dbKey = `grade_${gradeNum}`;

    if (useFirestore && dbFirestore) {
      const q = query(collection(dbFirestore, 'lessons'), where('grade', '==', gradeNum));
      const docSnaps = await getDocs(q);
      for (const d of docSnaps.docs) {
        await deleteDoc(d.ref);
      }
    } else {
      const db = readDB();
      if (db.lessons && db.lessons[dbKey]) {
        delete db.lessons[dbKey];
        writeDB(db);
      }
    }

    const defaultLessons = await getGradeLessons(gradeNum);
    
    // Resolve dynamic questions before returning to UI
    const allQuestions = await getQuestionBank();
    const gradeQuestions = allQuestions.filter((q: any) => !q.grade || Number(q.grade) === gradeNum);
    const resolvedLessons = defaultLessons.map((l: any) => {
      if (l.startIdx !== undefined && l.endIdx !== undefined) {
        const start = Math.max(1, Number(l.startIdx) || 1);
        const end = Math.min(gradeQuestions.length, Number(l.endIdx) || start);
        const resolvedQs = gradeQuestions.slice(start - 1, end);
        return {
          ...l,
          questions: resolvedQs,
          qCount: resolvedQs.length,
        };
      }
      return l;
    });

    res.json({ success: true, lessons: resolvedLessons });
  } catch (err) {
    console.error('Failed to restore initial curriculum setting:', err);
    res.status(500).json({ error: 'Lỗi hệ thống khi thiết lập lại bài học.' });
  }
});

// Get user uploaded files list
app.get('/api/files', authMiddleware, async (req: any, res) => {
  try {
    const files = await getUserFiles(req.user);
    const userFiles = files.map(f => ({
      id: f.id,
      fileName: f.fileName,
      fileType: f.fileType,
      fileSize: f.fileSize,
      uploadedAt: f.uploadedAt,
      downloadUrl: f.downloadUrl,
      storagePath: f.storagePath,
      grade: f.grade || 'all',
    }));
    res.json({ files: userFiles });
  } catch (err: any) {
    console.error('Failed to get user files:', err);
    res.status(500).json({ error: 'Lỗi tải danh sách tài liệu: ' + err.message });
  }
});

// Upload file (Payload contains files: { fileName, fileType, fileData (Base64 string) } hoặc { fileName, fileType, fileSize, downloadUrl, storagePath, grade })
app.post('/api/files/upload', authMiddleware, async (req: any, res) => {
  const { fileName, fileType, fileData, fileSize, downloadUrl, storagePath, grade } = req.body;

  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'Cung cấp không đủ thông tin tệp tải lên (Tên, Loại).' });
  }

  try {
    const fileId = crypto.randomUUID();
    let fileMeta: any;

    if (downloadUrl) {
      // Firebase Storage upload registration
      fileMeta = {
        id: fileId,
        userId: req.userId,
        fileName,
        fileType,
        fileSize: Number(fileSize) || 0,
        downloadUrl,
        storagePath: storagePath || '',
        uploadedAt: new Date().toISOString(),
        grade: grade || 'all',
      };
    } else {
      // Local fallback file upload
      if (!fileData) {
        return res.status(400).json({ error: 'Thiếu dữ liệu tệp tin đính kèm.' });
      }

      // Generate secure file path on disk
      const sanitisedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const physicalFileName = `${fileId}_${sanitisedName}`;
      const physicalPath = path.join(UPLOADS_DIR, physicalFileName);

      // Convert base64 data to binary buffer
      const base64Content = fileData.split(';base64,').pop();
      const fileBuffer = Buffer.from(base64Content, 'base64');

      fs.writeFileSync(physicalPath, fileBuffer);

      fileMeta = {
        id: fileId,
        userId: req.userId,
        fileName,
        fileType,
        fileSize: fileBuffer.length,
        physicalPath,
        uploadedAt: new Date().toISOString(),
        grade: grade || 'all',
      };
    }

    await saveFileMeta(req.userId, fileMeta);

    res.status(201).json({
      success: true,
      file: {
        id: fileId,
        fileName,
        fileType,
        fileSize: fileMeta.fileSize,
        uploadedAt: fileMeta.uploadedAt,
        grade: fileMeta.grade,
      }
    });
  } catch (err) {
    console.error('File upload failed on server', err);
    res.status(500).json({ error: 'Tải tệp tin lên thất bại do lỗi hệ thống.' });
  }
});

// Download/View file
app.get('/api/files/download/:id', async (req: any, res) => {
  const fileId = req.params.id;
  const authHeader = req.query.token;

  if (!authHeader) {
    return res.status(401).send('Không được phép truy cập khi thiếu mã xác thực.');
  }

  const userId = verifyToken(authHeader);
  if (!userId) {
    return res.status(401).send('Mức ủy quyền tệp tin hết hạn.');
  }

  const fileMeta = await getFileMeta(userId, fileId);

  if (!fileMeta) {
    return res.status(404).send('Không tìm thấy tệp hoặc tệp không thuộc quyền quản lý của bạn.');
  }

  // If storing on Firebase Storage as direct download URL
  if (fileMeta.downloadUrl) {
    return res.redirect(fileMeta.downloadUrl);
  }

  if (!fileMeta.physicalPath || !fs.existsSync(fileMeta.physicalPath)) {
    return res.status(404).send('Tệp dữ liệu gốc không tồn tại trên máy chủ.');
  }

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileMeta.fileName)}"`);
  res.setHeader('Content-Type', fileMeta.fileType);
  res.sendFile(fileMeta.physicalPath);
});

// Delete file
app.delete('/api/files/delete/:id', authMiddleware, async (req: any, res) => {
  const fileId = req.params.id;
  const fileMeta = await getFileMeta(req.userId, fileId);

  if (!fileMeta) {
    return res.status(404).json({ error: 'Không tìm thấy tài liệu này trong kho lưu trữ của bạn.' });
  }

  try {
    if (fileMeta.physicalPath && fs.existsSync(fileMeta.physicalPath)) {
      fs.unlinkSync(fileMeta.physicalPath);
    }
  } catch (err) {
    console.error(`Could not delete physically stored file: ${fileMeta.physicalPath}`, err);
  }

  await deleteFileMeta(req.userId, fileId);

  res.json({ success: true, message: 'Đã xóa tệp tin thành công.' });
});

// --- COMBINED VITE/EXPRESS SERVING LOGIC ---

async function startServer() {
  // Run on startup: Purge Firestore data if the purge flag does not exist
  if (useFirestore) {
    await purgeAllFirestoreDataOnce();
    await migrateLocalToFirestore();
    await cleanupExistingLessonsOnFirestoreOnce();
  }

  if (process.env.NODE_ENV !== 'production') {
    // Mounting Vite middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving of built assets in dist/
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wippo IC3 server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to launch application server: ', err);
});
