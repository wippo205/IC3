import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  BookOpen, 
  FolderGit, 
  LogOut, 
  Home, 
  GraduationCap, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import RevisionView from './components/RevisionView';
import ExamView from './components/ExamView';
import FileStorageView from './components/FileStorageView';
import TeacherDashboardView from './components/TeacherDashboardView';
import { LessonProgress, ExamRecord } from './types';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('wippo_token'));
  const [user, setUser] = useState<{ id: string; username: string; nickname: string; grade: number; school?: string; classroom?: string; role?: 'student' | 'teacher' } | null>(
    localStorage.getItem('wippo_user') ? JSON.parse(localStorage.getItem('wippo_user')!) : null
  );

  const [activeTab, setActiveTab] = useState<'dashboard' | 'revision' | 'exam' | 'files'>('dashboard');

  // Stats loaded from server
  const [revisionProgress, setRevisionProgress] = useState<LessonProgress[]>([]);
  const [examRecords, setExamRecords] = useState<ExamRecord[]>([]);
  const [fileCount, setFileCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);

  // Authenticate from token on startup
  useEffect(() => {
    if (token) {
      verifyUserSession();
    }
  }, [token]);

  // Sync details from server
  useEffect(() => {
    if (token && user) {
      fetchUserStats();
    }
  }, [token, user]);

  const verifyUserSession = async () => {
    try {
      const resp = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (resp.ok) {
        setUser(data.user);
        localStorage.setItem('wippo_user', JSON.stringify(data.user));
      } else {
        // Clear expired session
        handleLogout();
      }
    } catch {
      // offline or server sleep
      console.warn('Network issue verifying user session.');
    }
  };

  const fetchUserStats = async () => {
    setLoadingStats(true);
    try {
      // Parallel fetch to make loading extremely agile and robust
      const [progressResp, examsResp, filesResp] = await Promise.all([
        fetch('/api/progress', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/exams', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/files', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const progressData = await progressResp.json();
      const examsData = await examsResp.json();
      const filesData = await filesResp.json();

      if (progressResp.ok) setRevisionProgress(progressData.progress || []);
      if (examsResp.ok) setExamRecords(examsData.exams || []);
      if (filesResp.ok) setFileCount(filesData.files?.length || 0);

    } catch (err) {
      console.error('Failed to sync student stats from server:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLoginSuccess = (newToken: string, newUser: { id: string; username: string; nickname: string; grade: number; school?: string; classroom?: string; role?: 'student' | 'teacher' }) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('wippo_token', newToken);
    localStorage.setItem('wippo_user', JSON.stringify(newUser));
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setRevisionProgress([]);
    setExamRecords([]);
    setFileCount(0);
    localStorage.removeItem('wippo_token');
    localStorage.removeItem('wippo_user');
  };

  // Switch tabs/views
  const handleNavigation = (tab: 'dashboard' | 'revision' | 'exam' | 'files') => {
    setActiveTab(tab);
    // Refresh stats when switching to dashboard
    if (tab === 'dashboard' && token) {
      fetchUserStats();
    }
  };

  if (!token || !user) {
    return <LoginView onSuccess={handleLoginSuccess} />;
  }

  // Teacher Separate Interface
  if (user.role === 'teacher') {
    return (
      <TeacherDashboardView 
        user={user} 
        token={token} 
        onLogout={handleLogout} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      {/* CUTE ROUNDED SYSTEM NAVIGATION BAR */}
      <header className="bg-white border-b-4 border-amber-200 sticky top-0 z-55 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          
          {/* Logo with Mascot interaction */}
          <div 
            onClick={() => handleNavigation('dashboard')} 
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform">🦛</span>
            <div>
              <h1 className="text-xl font-black font-display text-orange-600 tracking-tight flex items-center gap-1">
                Wippo IC3
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              </h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
                Hành trình chinh phục kỹ năng số!
              </span>
            </div>
          </div>

          {/* Nav links (Horizontal on desktop, neat pills on mobile) */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => handleNavigation('dashboard')}
              className={`flex items-center gap-1 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-orange-500 text-white shadow-md' 
                  : 'text-slate-600 hover:text-orange-500 hover:bg-orange-50'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Trang chủ</span>
            </button>

            <button
              onClick={() => handleNavigation('revision')}
              className={`flex items-center gap-1 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'revision' 
                  ? 'bg-sky-500 text-white shadow-md' 
                  : 'text-slate-600 hover:text-sky-500 hover:bg-sky-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Ôn tập</span>
            </button>

            <button
              onClick={() => handleNavigation('exam')}
              className={`flex items-center gap-1 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'exam' 
                  ? 'bg-amber-500 text-white shadow-md' 
                  : 'text-slate-600 hover:text-amber-500 hover:bg-amber-50'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Kiểm tra</span>
            </button>

            <button
              onClick={() => handleNavigation('files')}
              className={`flex items-center gap-1 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'files' 
                  ? 'bg-indigo-500 text-white shadow-md' 
                  : 'text-slate-600 hover:text-indigo-500 hover:bg-indigo-50'
              }`}
            >
              <FolderGit className="w-4 h-4" />
              <span className="hidden sm:inline">Tài liệu</span>
            </button>
          </nav>

          {/* User badge and Log out trigger with high accessibility size */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1 justify-end">
                <GraduationCap className="w-4 h-4 text-cyan-500" />
                Em: {user.nickname}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {user.classroom ? `Lớp ${user.classroom}` : `Khối ${user.grade}`}
                {user.school ? ` • ${user.school}` : ''}
              </span>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-all border border-red-200 cursor-pointer"
              title="Đăng xuất tài khoản"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>

        </div>
      </header>

      {/* SUB-VIEW CONTAINER */}
      <main className="flex-1 bg-radial from-orange-50/20 to-slate-100/50 pb-12">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="db"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DashboardView 
                user={user} 
                token={token} 
                revisionProgress={revisionProgress} 
                examRecords={examRecords}
                fileCount={fileCount}
              />
            </motion.div>
          )}

          {activeTab === 'revision' && (
            <motion.div
              key="rev"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <RevisionView 
                grade={user.grade} 
                token={token} 
                onBackToDashboard={() => handleNavigation('dashboard')} 
                onProgressUpdated={fetchUserStats}
                userRole="student"
              />
            </motion.div>
          )}

          {activeTab === 'exam' && (
            <motion.div
              key="ex"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ExamView 
                grade={user.grade} 
                token={token} 
                onBackToDashboard={() => handleNavigation('dashboard')} 
                onExamSaved={fetchUserStats}
              />
            </motion.div>
          )}

          {activeTab === 'files' && (
            <motion.div
              key="fl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <FileStorageView token={token} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FLOATING QUICK NAVIGATION FOOTER FOR COMPACT INTERFACES */}
      <footer className="bg-white border-t border-slate-100 py-4 text-center text-xs font-semibold text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© 2026 Wippo IC3. Đồng hành học tập và sát cánh vượt trùng khơi. 🦛🏫🌟</span>
          <div className="flex gap-4">
            <span className="hover:text-amber-500 cursor-pointer" onClick={() => handleNavigation('dashboard')}>Bảng Vàng</span>
            <span className="hover:text-sky-500 cursor-pointer" onClick={() => handleNavigation('revision')}>Học Tập</span>
            <span className="hover:text-indigo-500 cursor-pointer" onClick={() => handleNavigation('files')}>Hộp Tệp Tin</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
