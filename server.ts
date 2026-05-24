import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, query, where, deleteDoc } from 'firebase/firestore';

// Suppress safe-to-ignore Firestore BloomFilter warning messages
(function() {
  try {
    const originalConsoleError = console.error;
    console.error = function(...args: any[]) {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      if (
        msg.includes('BloomFilter error') || 
        msg.includes('BloomFilterError') || 
        msg.includes('Invalid hash count: 0')
      ) {
        return;
      }
      originalConsoleError.apply(console, args);
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
}

const defaultDB: DBStructure = {
  users: {},
  progress: {},
  exams: {},
  files: {},
  lessons: {},
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
    const users = Object.values(localDB.users);
    if (users.length > 0) {
      console.log(`Migrating ${users.length} users to Firestore...`);
      for (const u of users) {
        await setDoc(doc(dbFirestore, 'users', u.id), u);
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

    if (hasMigrated) {
      // Clean local db to prevent duplicate migration operations next startup
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2), 'utf-8');
      console.log("Migration to Firebase completed successfully! 🚀");
    }
  } catch (err) {
    console.error("Local records migration to Firestore failed:", err);
  }
}

// One-time startup purge of collection 'lessons' on Firestore to clear out legacy template data
async function cleanupExistingLessonsOnFirestoreOnce() {
  if (!useFirestore || !dbFirestore) return;
  const flagPath = path.join(DATA_DIR, 'lessons_purged.flag');
  if (fs.existsSync(flagPath)) {
    // Already purged once, skip
    return;
  }
  try {
    console.log("Purging legacy default curriculum lessons from Firestore...");
    const lessonsRef = collection(dbFirestore, 'lessons');
    const querySnapshot = await getDocs(lessonsRef);
    if (!querySnapshot.empty) {
      for (const d of querySnapshot.docs) {
        await deleteDoc(d.ref);
      }
      console.log(`Successfully purged ${querySnapshot.size} legacy lessons from Firestore!`);
    } else {
      console.log("No legacy lessons found on Firestore to purge.");
    }
    fs.writeFileSync(flagPath, 'purged', 'utf-8');
  } catch (err) {
    console.error("Failed to purge legacy lessons on Firestore:", err);
  }
}

// User helper methods
async function getUser(userId: string): Promise<any> {
  if (useFirestore && dbFirestore) {
    try {
      const docSnap = await getDoc(doc(dbFirestore, 'users', userId));
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    }
  }
  return readDB().users[userId] || null;
}

async function findUserByUsername(username: string): Promise<any> {
  const cleanUsername = username.trim().toLowerCase();
  if (useFirestore && dbFirestore) {
    try {
      const q = query(collection(dbFirestore, 'users'), where('username', '==', cleanUsername));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data();
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users');
    }
  }
  return Object.values(readDB().users).find(u => u.username === cleanUsername) || null;
}

async function saveUser(userId: string, userData: any): Promise<void> {
  if (useFirestore && dbFirestore) {
    try {
      await setDoc(doc(dbFirestore, 'users', userId), userData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
    }
  }
  const db = readDB();
  db.users[userId] = userData;
  writeDB(db);
}

// Progress helper methods
async function getUserProgress(userId: string): Promise<any[]> {
  if (useFirestore && dbFirestore) {
    try {
      const q = query(collection(dbFirestore, 'progress'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'progress');
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
  const docId = `${userId}_${grade}_${lessonId}`;
  
  let newProgress: any = {
    userId,
    grade: Number(grade),
    lessonId: String(lessonId),
    completedQuestions: Number(completedQuestions),
    correctAnswers: Number(correctAnswers),
    totalQuestions: Number(totalQuestions),
    isCompleted: !!isCompleted,
    lastUpdated: new Date().toISOString(),
  };

  if (useFirestore && dbFirestore) {
    try {
      const progressRef = doc(dbFirestore, 'progress', docId);
      const existingDoc = await getDoc(progressRef);
      if (existingDoc.exists()) {
        const existing = existingDoc.data();
        if (existing.correctAnswers > newProgress.correctAnswers && existing.totalQuestions === newProgress.totalQuestions) {
          newProgress.correctAnswers = existing.correctAnswers;
          newProgress.completedQuestions = existing.completedQuestions;
        }
      }
      await setDoc(progressRef, newProgress);
      return await getUserProgress(userId);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `progress/${docId}`);
    }
  }

  // Fallback to local DB
  const db = readDB();
  if (!db.progress[userId]) {
    db.progress[userId] = [];
  }
  
  const progressList = db.progress[userId];
  const existingIndex = progressList.findIndex(p => p.grade === Number(grade) && p.lessonId === String(lessonId));

  if (existingIndex > -1) {
    const existing = progressList[existingIndex];
    if (existing.correctAnswers > newProgress.correctAnswers && existing.totalQuestions === newProgress.totalQuestions) {
      newProgress.correctAnswers = existing.correctAnswers;
      newProgress.completedQuestions = existing.completedQuestions;
    }
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
      return querySnapshot.docs.map(doc => doc.data());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'exams');
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
  durationSeconds: any
): Promise<any> {
  const examId = crypto.randomUUID();
  const newExamRecord = {
    id: examId,
    userId,
    grade: Number(grade),
    score: Number(score),
    correctCount: Number(correctCount),
    totalQuestions: Number(totalQuestions),
    durationSeconds: Number(durationSeconds),
    createdAt: new Date().toISOString(),
  };

  if (useFirestore && dbFirestore) {
    try {
      await setDoc(doc(dbFirestore, 'exams', examId), newExamRecord);
      return newExamRecord;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `exams/${examId}`);
    }
  }

  const db = readDB();
  if (!db.exams[userId]) {
    db.exams[userId] = [];
  }
  db.exams[userId].push(newExamRecord);
  writeDB(db);
  return newExamRecord;
}

// Files helper methods
async function getUserFiles(userId: string): Promise<any[]> {
  if (useFirestore && dbFirestore) {
    try {
      const q = query(collection(dbFirestore, 'files'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'files');
    }
  }
  return readDB().files[userId] || [];
}

async function saveFileMeta(userId: string, fileMeta: any): Promise<void> {
  if (useFirestore && dbFirestore) {
    try {
      await setDoc(doc(dbFirestore, 'files', fileMeta.id), fileMeta);
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
  if (useFirestore && dbFirestore) {
    try {
      const docSnap = await getDoc(doc(dbFirestore, 'files', fileId));
      if (docSnap.exists()) {
        const metadata = docSnap.data();
        if (metadata.userId === userId) {
          return metadata;
        }
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `files/${fileId}`);
    }
  }
  const userFiles = readDB().files[userId] || [];
  return userFiles.find(f => f.id === fileId) || null;
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
  const userFiles = db.files[userId] || [];
  const fileIndex = userFiles.findIndex(f => f.id === fileId);
  if (fileIndex > -1) {
    userFiles.splice(fileIndex, 1);
    db.files[userId] = userFiles;
    writeDB(db);
  }
  return fileMeta;
}

// Lessons & Questions Curriculum management adapters

// getGradeLessons - retrieves curriculum-wide lessons, starting empty if none exist in DB so teachers can build custom curriculums
async function getGradeLessons(grade: number): Promise<any[]> {
  const dbKey = `grade_${grade}`;
  
  if (useFirestore && dbFirestore) {
    try {
      const q = query(collection(dbFirestore, 'lessons'), where('grade', '==', grade));
      const querySnapshot = await getDocs(q);
      const lessons = querySnapshot.docs.map(doc => doc.data());
      lessons.sort((a, b) => (a.lessonNum || 0) - (b.lessonNum || 0));
      return lessons;
    } catch (err) {
      console.error(`Firestore getGradeLessons error for grade ${grade}:`, err);
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


// Token helper functions using standard cryptographic HMAC signatures (native crypto)
function generateToken(userId: string): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ userId, exp: expiresAt })).toString('base64url');
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

// Make sure our server handles JSON requests with generous size limits for base64 file uploads
app.use(express.json({ limit: '50mb' }));

// Middleware to extract authentication from Bearer token
async function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Bạn cần đăng nhập để tiếp tục.' });
  }
  const token = authHeader.substring(7);
  const userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
  
  const user = await getUser(userId);
  if (!user) {
    return res.status(401).json({ error: 'Người dùng không tồn tại.' });
  }
  
  req.userId = userId;
  req.user = user;
  next();
}

// --- API ENDPOINTS ---

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, password, nickname, grade, school, classroom, role, regCode } = req.body;
  const isTeacher = role === 'teacher';

  if (isTeacher) {
    if (!username || !password || !nickname || !regCode) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin: tên đăng nhập, mật khẩu, họ và tên, và mã đăng ký giáo viên.' });
    }
    if (regCode !== 'NguyenHuuDaiMaiDinh123@TinHocDaiDuong') {
      return res.status(400).json({ error: 'Mã đăng ký giáo viên không chính xác.' });
    }
  } else {
    if (!username || !password || !nickname || !grade || !school || !classroom) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin: tên đăng nhập, mật khẩu, họ và tên, trường, khối lớp và lớp.' });
    }
  }

  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Tên đăng nhập tối thiểu phải có 3 ký tự.' });
  }

  // Grade support check: 3 to 8
  let selectedGrade = 6;
  if (!isTeacher) {
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
  if (!isTeacher) {
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

  if (!isTeacher && checkProfanity(schoolLower)) {
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

  const newUser = {
    id,
    username: cleanUsername,
    nickname: cleanNickname,
    grade: selectedGrade,
    school: cleanSchool,
    classroom: isTeacher ? '' : classroom.trim(),
    role: isTeacher ? 'teacher' : 'student',
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
  };

  await saveUser(id, newUser);

  const token = generateToken(id);
  res.status(201).json({
    token,
    user: {
      id,
      username: cleanUsername,
      nickname: cleanNickname,
      grade: selectedGrade,
      school: cleanSchool,
      classroom: isTeacher ? '' : classroom.trim(),
      role: newUser.role,
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

  const token = generateToken(user.id);
  res.json({
    token,
    user: {
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
  res.json({
    user: {
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

// Get progress
app.get('/api/progress', authMiddleware, async (req: any, res) => {
  const userProgress = await getUserProgress(req.userId);
  res.json({ progress: userProgress });
});

// Get all student results / scoreboards (Teacher Only)
app.get('/api/teacher/scoreboard', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Chỉ giáo viên mới được quyền truy cập bảng điểm học sinh.' });
  }

  try {
    let allUsers: any[] = [];
    let progressMap: Record<string, any[]> = {};
    let examsMap: Record<string, any[]> = {};

    if (useFirestore && dbFirestore) {
      try {
        const usersSnapshot = await getDocs(collection(dbFirestore, 'users'));
        allUsers = usersSnapshot.docs.map(doc => doc.data());

        const progressSnapshot = await getDocs(collection(dbFirestore, 'progress'));
        const allProgress = progressSnapshot.docs.map(doc => doc.data());
        for (const p of allProgress) {
          if (!progressMap[p.userId]) progressMap[p.userId] = [];
          progressMap[p.userId].push(p);
        }

        const examsSnapshot = await getDocs(collection(dbFirestore, 'exams'));
        const allExams = examsSnapshot.docs.map(doc => doc.data());
        for (const e of allExams) {
          if (!examsMap[e.userId]) examsMap[e.userId] = [];
          examsMap[e.userId].push(e);
        }
      } catch (fErr) {
        console.error('Firestore scoreboard load failure, falling back to local:', fErr);
        const db = readDB();
        allUsers = Object.values(db.users || {});
        progressMap = db.progress || {};
        examsMap = db.exams || {};
      }
    } else {
      const db = readDB();
      allUsers = Object.values(db.users || {});
      progressMap = db.progress || {};
      examsMap = db.exams || {};
    }

    // Filter to get only students (roles !== 'teacher')
    const students = allUsers.filter(u => u.role !== 'teacher');

    // Aggregate scoreboard records
    const scoreboard = students.map(student => {
      const studentProgress = progressMap[student.id] || [];
      const studentExams = examsMap[student.id] || [];

      // Calculate stats
      const totalExams = studentExams.length;
      const highestScore = totalExams > 0 ? Math.max(...studentExams.map(e => e.score)) : 0;
      const averageScore = totalExams > 0 ? Math.round(studentExams.reduce((acc, cr) => acc + cr.score, 0) / totalExams) : 0;
      const completedRevisionLessons = studentProgress.filter(p => p.isCompleted).length;

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
          progress: studentProgress,
          exams: studentExams
        }
      };
    });

    res.json({ success: true, scoreboard });
  } catch (err: any) {
    res.status(500).json({ error: 'Lỗi khi tải bảng điểm học sinh: ' + err.message });
  }
});

// Update progress
app.post('/api/progress/update', authMiddleware, async (req: any, res) => {
  const { grade, lessonId, completedQuestions, correctAnswers, totalQuestions, isCompleted } = req.body;
  
  if (grade === undefined || !lessonId || completedQuestions === undefined || correctAnswers === undefined || totalQuestions === undefined) {
    return res.status(400).json({ error: 'Giá trị thông số tiến trình không hợp lệ.' });
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

// Get exam records
app.get('/api/exams', authMiddleware, async (req: any, res) => {
  const userExams = await getUserExams(req.userId);
  res.json({ exams: userExams });
});

// Save exam record
app.post('/api/exams/save', authMiddleware, async (req: any, res) => {
  const { grade, score, correctCount, totalQuestions, durationSeconds } = req.body;
  
  if (grade === undefined || score === undefined || correctCount === undefined || totalQuestions === undefined || durationSeconds === undefined) {
    return res.status(400).json({ error: 'Dữ liệu bài kiểm tra bị thiếu.' });
  }

  const record = await saveExamRecord(
    req.userId,
    grade,
    score,
    correctCount,
    totalQuestions,
    durationSeconds
  );
  const exams = await getUserExams(req.userId);

  res.status(201).json({ success: true, record, exams });
});

// Curriculum/Lessons Management Endpoints
app.get('/api/lessons', authMiddleware, async (req: any, res) => {
  const grade = Number(req.query.grade) || 3;
  try {
    const lessons = await getGradeLessons(grade);
    res.json({ success: true, lessons });
  } catch (err) {
    console.error('Failed to query lessons catalog:', err);
    res.status(500).json({ error: 'Không thể tải danh sách câu hỏi và học phần.' });
  }
});

// Create/Update lesson & questions catalog
app.post('/api/lessons/save', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Chỉ giáo viên mới được quyền biên soạn câu hỏi.' });
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
      qCount: Array.isArray(lesson.questions) ? lesson.questions.length : 0,
      questions: Array.isArray(lesson.questions) ? lesson.questions : [],
      isCustom: lesson.isCustom !== undefined ? lesson.isCustom : true
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

    res.json({ success: true, lesson: cleanLesson, lessons: updatedLessons });
  } catch (err) {
    console.error('Failed to update curriculum lesson:', err);
    res.status(500).json({ error: 'Lỗi đồng bộ lưu trữ bài học.' });
  }
});

// Delete lesson & questions catalog
app.post('/api/lessons/delete', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Chỉ giáo viên mới được quyền xóa học phần.' });
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
    res.json({ success: true, lessons: remainingLessons });
  } catch (err) {
    console.error('Failed to delete curriculum lesson:', err);
    res.status(500).json({ error: 'Lỗi hệ thống khi xóa bài học.' });
  }
});

// Reset lesson & questions catalog to initial generation standard
app.post('/api/lessons/reset', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Chỉ giáo viên mới được quyền thiết lập lại học phần mặc định.' });
  }
  const { grade } = req.body;
  if (!grade) {
    return res.status(400).json({ error: 'Cung cấp thiếu thông tin khối lớp cần hoàn tác.' });
  }

  try {
    const dbKey = `grade_${grade}`;

    if (useFirestore && dbFirestore) {
      try {
        const q = query(collection(dbFirestore, 'lessons'), where('grade', '==', Number(grade)));
        const docSnaps = await getDocs(q);
        for (const d of docSnaps.docs) {
          await deleteDoc(d.ref);
        }
      } catch (fErr) {
        console.error('Firestore curriculum reset failed:', fErr);
      }
    }

    const db = readDB();
    if (db.lessons && db.lessons[dbKey]) {
      delete db.lessons[dbKey];
      writeDB(db);
    }

    const defaultLessons = await getGradeLessons(Number(grade));
    res.json({ success: true, lessons: defaultLessons });
  } catch (err) {
    console.error('Failed to restore initial curriculum setting:', err);
    res.status(500).json({ error: 'Lỗi hệ thống khi thiết lập lại bài học.' });
  }
});

// Get user uploaded files list
app.get('/api/files', authMiddleware, async (req: any, res) => {
  const files = await getUserFiles(req.userId);
  const userFiles = files.map(f => ({
    id: f.id,
    fileName: f.fileName,
    fileType: f.fileType,
    fileSize: f.fileSize,
    uploadedAt: f.uploadedAt,
    downloadUrl: f.downloadUrl,
    storagePath: f.storagePath,
  }));
  res.json({ files: userFiles });
});

// Upload file (Payload contains files: { fileName, fileType, fileData (Base64 string) } hoặc { fileName, fileType, fileSize, downloadUrl, storagePath })
app.post('/api/files/upload', authMiddleware, async (req: any, res) => {
  const { fileName, fileType, fileData, fileSize, downloadUrl, storagePath } = req.body;

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
  // Run on startup: Migrate any local database data to Firebase Firestore
  if (useFirestore) {
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
