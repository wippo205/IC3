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
  Sparkles,
  Key,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react';
import LoginViewGoogleSheets from './components/LoginViewGoogleSheets';
import DashboardView from './components/DashboardView';
import RevisionView from './components/RevisionView';
import ExamView from './components/ExamView';
import FileStorageView from './components/FileStorageView';
import TeacherDashboardView from './components/TeacherDashboardView';
import { LessonProgress, ExamRecord, HomeworkProgress } from './types';
import LoginView from './components/LoginView';

export default function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('wippo_token') || sessionStorage.getItem('wippo_token')
  );
  const [user, setUser] = useState<{ id: string; username: string; nickname: string; grade?: number; school?: string; classroom?: string; role?: 'student' | 'teacher' | 'admin' } | null>(
    localStorage.getItem('wippo_user') 
      ? JSON.parse(localStorage.getItem('wippo_user')!) 
      : (sessionStorage.getItem('wippo_user') ? JSON.parse(sessionStorage.getItem('wippo_user')!) : null)
  );

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('wippo_theme') === 'dark' || document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('wippo_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('wippo_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'revision' | 'exam' | 'files'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedHomeworkLessonId, setSelectedHomeworkLessonId] = useState<string | null>(null);
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<string | null>(null);
  const [isHomeworkMode, setIsHomeworkMode] = useState<boolean>(false);

  // Stats loaded from server
  const [revisionProgress, setRevisionProgress] = useState<LessonProgress[]>([]);
  const [homeworkProgress, setHomeworkProgress] = useState<HomeworkProgress[]>([]);
  const [examRecords, setExamRecords] = useState<ExamRecord[]>([]);
  const [fileCount, setFileCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);

  // Change password states
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const sanitizeToken = (value: string | null | undefined) => {
    if (!value) return null;
    const cleaned = value.replace(/[^\u0000-\u007F]/g, '');
    return cleaned || null;
  };

  const buildAuthHeaders = (value: string | null | undefined) => {
    const safeToken = sanitizeToken(value);
    if (!safeToken) return {};
    return { Authorization: `Bearer ${safeToken}` };
  };

  const normalizeHeaders = (headers?: HeadersInit) => {
    if (!headers) return undefined;

    const headerEntries: Record<string, string> = {};
    const normalizedHeaders = new Headers(headers);
    normalizedHeaders.forEach((value, key) => {
      headerEntries[key] = value.replace(/[^\u0000-\u007F]/g, '');
    });

    return headerEntries;
  };

  // Global fetch override to catch 401 concurrent logouts
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const safeInit = init ? { ...init, headers: normalizeHeaders(init.headers) } : undefined;
      const response = await originalFetch(input, safeInit);
      if (response.status === 401) {
        try {
          const clone = response.clone();
          const data = await clone.json();
          if (data && data.concurrentLogout) {
            setSessionError(data.error || 'Phiên làm việc của em đã bị vô hiệu hóa vì tài khoản đang được sử dụng ở thiết bị khác.');
            handleLogout();
          }
        } catch (e) {
          // ignore parsing error
        }
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Authenticate from token on startup
  useEffect(() => {
    if (token) {
      verifyUserSession();
    }
  }, [token]);

  // Sync details from server (optimized using user?.id primitive to prevent infinite re-fetches)
  const userId = user?.id;
  useEffect(() => {
    if (token && userId) {
      fetchUserStats();
    }
  }, [token, userId]);

  const verifyUserSession = async () => {
    const safeToken = sanitizeToken(token);
    if (!safeToken) {
      handleLogout();
      return;
    }

    try {
      const resp = await fetch('/api/auth/me', {
        headers: buildAuthHeaders(safeToken)
      });
      const data = await resp.json();
      if (resp.ok) {
        setUser(data.user);
        if (localStorage.getItem('wippo_token')) {
          localStorage.setItem('wippo_user', JSON.stringify(data.user));
        } else {
          sessionStorage.setItem('wippo_user', JSON.stringify(data.user));
        }
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
    const safeToken = sanitizeToken(token);
    if (!safeToken) {
      setLoadingStats(false);
      return;
    }

    setLoadingStats(true);
    try {
      // Parallel fetch to make loading extremely agile and robust
      const [progressResp, homeworkProgressResp, examsResp, filesResp] = await Promise.all([
        fetch('/api/progress', { headers: buildAuthHeaders(safeToken) }),
        fetch('/api/homework-progress', { headers: buildAuthHeaders(safeToken) }),
        fetch('/api/exams', { headers: buildAuthHeaders(safeToken) }),
        fetch('/api/files', { headers: buildAuthHeaders(safeToken) })
      ]);

      const progressData = await progressResp.json();
      const homeworkProgressData = await homeworkProgressResp.json();
      const examsData = await examsResp.json();
      const filesData = await filesResp.json();

      if (progressResp.ok) setRevisionProgress(progressData.progress || []);
      if (homeworkProgressResp.ok) setHomeworkProgress(homeworkProgressData.progress || []);
      if (examsResp.ok) setExamRecords(examsData.exams || []);
      if (filesResp.ok) setFileCount(filesData.files?.length || 0);

    } catch (err) {
      console.error('Failed to sync student stats from server:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLoginSuccess = (newToken: string, newUser: { id: string; username: string; nickname: string; grade?: number; school?: string; classroom?: string; role?: 'student' | 'teacher' | 'admin' }, rememberMe: boolean) => {
    const safeToken = sanitizeToken(newToken) || `gsheet-${newUser.id}`;
    setToken(safeToken);
    setUser(newUser);
    if (rememberMe) {
      localStorage.setItem('wippo_token', safeToken);
      localStorage.setItem('wippo_user', JSON.stringify(newUser));
      sessionStorage.removeItem('wippo_token');
      sessionStorage.removeItem('wippo_user');
    } else {
      sessionStorage.setItem('wippo_token', safeToken);
      sessionStorage.setItem('wippo_user', JSON.stringify(newUser));
      localStorage.removeItem('wippo_token');
      localStorage.removeItem('wippo_user');
    }
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
    sessionStorage.removeItem('wippo_token');
    sessionStorage.removeItem('wippo_user');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangePasswordError('Vui lòng điền đầy đủ tất cả các ô thông tin.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordError('Mật khẩu mới và xác nhận mật khẩu mới không trùng khớp.');
      return;
    }

    if (newPassword.length < 8) {
      setChangePasswordError('Mật khẩu mới phải từ 8 ký tự trở lên để đảm bảo an toàn.');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setChangePasswordError('Mật khẩu mới phải chứa ít nhất 1 chữ cái viết hoa (A-Z).');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setChangePasswordError('Mật khẩu mới phải chứa ít nhất 1 chữ cái viết thường (a-z).');
      return;
    }
    if (!/\d/.test(newPassword)) {
      setChangePasswordError('Mật khẩu mới phải chứa ít nhất 1 chữ số (0-9).');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword)) {
      setChangePasswordError('Mật khẩu mới phải chứa ít nhất 1 ký tự đặc biệt (ví dụ: !, @, #, $, %,...).');
      return;
    }

    setChangingPassword(true);
    try {
      const resp = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await resp.json();
      if (resp.ok) {
        setChangePasswordSuccess('Chúc mừng em! Đã cập nhật mật khẩu mới an toàn thành công. ✨');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowChangePasswordModal(false);
          setChangePasswordSuccess(null);
        }, 2200);
      } else {
        setChangePasswordError(data.error || 'Đổi mật khẩu thất bại.');
      }
    } catch (err) {
      setChangePasswordError('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Switch tabs/views
  const handleNavigation = (tab: 'dashboard' | 'revision' | 'exam' | 'files') => {
    setActiveTab(tab);
    setSelectedHomeworkLessonId(null);
    setSelectedHomeworkId(null);
    setIsHomeworkMode(false);
    setIsMobileMenuOpen(false);
    // Refresh stats when switching to dashboard
    if (tab === 'dashboard' && token) {
      fetchUserStats();
    }
  };

  if (!token || !user) {
    return (
      <LoginView
        onSuccess={handleLoginSuccess}
        initialError={sessionError}
        onClearInitialError={() => setSessionError(null)}
      />
    );
  }

  // Teacher/Admin Separate Interface
  if (user.role === 'teacher' || user.role === 'admin') {
    return (
      <TeacherDashboardView 
        user={user} 
        token={token} 
        onLogout={handleLogout} 
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      {/* CUTE ROUNDED SYSTEM NAVIGATION BAR */}
      <header className="bg-white border-b-4 border-amber-200 sticky top-0 z-55 shadow-sm relative">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-x-4">
          
          {/* Logo with Mascot interaction */}
          <div 
            onClick={() => handleNavigation('dashboard')} 
            className="flex items-center gap-2 cursor-pointer select-none group shrink-0"
          >
            <img 
              src="/favicon.svg" 
              className="w-10 h-10 rounded-xl border-2 border-amber-200 group-hover:scale-110 transition-transform duration-300 shadow-xs object-cover" 
              alt="Wippo IC3 Logo"
              referrerPolicy="no-referrer"
            />
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

          {/* Collapsible Mobile/Tablet Hamburger Trigger Button */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-orange-500 border border-slate-200 rounded-2xl transition-all cursor-pointer focus:outline-hidden"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Desktop Nav links (Visible ONLY on widescreen desktops lg) */}
          <nav className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => handleNavigation('dashboard')}
              className={`flex items-center gap-1 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-orange-500 text-white shadow-md' 
                  : 'text-slate-600 hover:text-orange-500 hover:bg-orange-50'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Trang chủ</span>
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
              <span>Trang thi</span>
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
              <span>Tài liệu</span>
            </button>
          </nav>

          {/* Desktop User badge and Log out trigger (Visible ONLY on desktop lg) */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
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
              onClick={() => {
                setChangePasswordError(null);
                setChangePasswordSuccess(null);
                setShowChangePasswordModal(true);
              }}
              className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-2xl transition-all border border-amber-200 cursor-pointer"
              title="Đổi mật khẩu tài khoản"
            >
              <Key className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={handleLogout}
              className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-all border border-red-200 cursor-pointer"
              title="Đăng xuất tài khoản"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>

        </div>

        {/* Mobile/Tablet dropdown overlay inside sticky header for absolute smooth scrolling (No layout reflows) */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden absolute top-[calc(100%-4px)] left-0 right-0 bg-white border-b-4 border-amber-200 overflow-hidden shadow-xl z-54"
            >
              <div className="p-4 space-y-3 max-w-6xl mx-auto">
              {/* User overview section in mobile menu */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                    <GraduationCap className="w-4.5 h-4.5 text-cyan-500" />
                    Em: {user.nickname}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 mt-1">
                    {user.classroom ? `Lớp ${user.classroom}` : `Khối ${user.grade}`}
                    {user.school ? ` • ${user.school}` : ''}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setChangePasswordError(null);
                      setChangePasswordSuccess(null);
                      setShowChangePasswordModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl transition-all border border-amber-200 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                    title="Đổi mật khẩu tài khoản"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Đổi mật khẩu</span>
                  </button>

                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all border border-red-200 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Thoát</span>
                  </button>
                </div>
              </div>

              {/* Navigation Grid Buttons for Mobile */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleNavigation('dashboard')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'dashboard' 
                      ? 'bg-orange-500 text-white shadow-md' 
                      : 'bg-slate-50 text-slate-600 hover:text-orange-500 hover:bg-orange-50 border border-slate-100'
                  }`}
                >
                  <Home className="w-4 h-4 shrink-0" />
                  <span>Trang chủ</span>
                </button>

                <button
                  onClick={() => handleNavigation('revision')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'revision' 
                      ? 'bg-sky-500 text-white shadow-md' 
                      : 'bg-slate-50 text-slate-600 hover:text-sky-500 hover:bg-sky-50 border border-slate-100'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>Ôn tập</span>
                </button>

                <button
                  onClick={() => handleNavigation('exam')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'exam' 
                      ? 'bg-amber-500 text-white shadow-md' 
                      : 'bg-slate-50 text-slate-600 hover:text-amber-500 hover:bg-amber-50 border border-slate-100'
                  }`}
                >
                  <Trophy className="w-4 h-4 shrink-0" />
                  <span>Trang thi</span>
                </button>

                <button
                  onClick={() => handleNavigation('files')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'files' 
                      ? 'bg-indigo-500 text-white shadow-md' 
                      : 'bg-slate-50 text-slate-600 hover:text-indigo-500 hover:bg-indigo-50 border border-slate-100'
                  }`}
                >
                  <FolderGit className="w-4 h-4 shrink-0" />
                  <span>Tài liệu</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
                homeworkProgress={homeworkProgress}
                examRecords={examRecords}
                fileCount={fileCount}
                onStartHomework={(lessonId, homeworkId) => {
                  setSelectedHomeworkLessonId(lessonId);
                  setSelectedHomeworkId(homeworkId);
                  setIsHomeworkMode(true);
                  setActiveTab('revision');
                }}
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
                initialLessonId={selectedHomeworkLessonId}
                homeworkId={selectedHomeworkId}
                isHomeworkMode={isHomeworkMode}
                onExitHomework={() => {
                  setSelectedHomeworkLessonId(null);
                  setSelectedHomeworkId(null);
                  setIsHomeworkMode(false);
                }}
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
              <FileStorageView token={token} user={user} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FLOATING QUICK NAVIGATION FOOTER FOR COMPACT INTERFACES */}
      <footer className="bg-white border-t border-slate-100 py-4 text-center text-xs font-semibold text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>© 2026 Wippo IC3. Đồng hành học tập và sát cánh vượt trùng khơi. 🦛🏫🌟</span>
          <div className="flex flex-wrap items-center gap-4 justify-center">
            <div className="flex gap-4">
              <span className="hover:text-amber-500 cursor-pointer" onClick={() => handleNavigation('dashboard')}>Bảng Vàng</span>
              <span className="hover:text-sky-500 cursor-pointer" onClick={() => handleNavigation('revision')}>Học Tập</span>
              <span className="hover:text-indigo-500 cursor-pointer" onClick={() => handleNavigation('files')}>Hộp Tệp Tin</span>
            </div>
            
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer select-none"
              title="Thay đổi giao diện Sáng / Tối"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Sáng ☀️</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Tối 🌙</span>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>

      {/* CHANGE PASSWORD MODAL */}
      <AnimatePresence>
        {showChangePasswordModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-150 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] border-4 border-amber-300 p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Cute corner decorations */}
              <div className="absolute top-[-20px] right-[-20px] w-12 h-12 bg-amber-100 rounded-full select-none pointer-events-none" />
              <div className="absolute bottom-[-15px] left-[-15px] w-10 h-10 bg-orange-100 rounded-full select-none pointer-events-none" />

              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🔐</span>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  Đổi mật khẩu tài khoản
                </h3>
              </div>

              <p className="text-xs font-bold text-slate-500 mb-4 bg-orange-50/70 border border-orange-100 rounded-xl p-3 leading-relaxed">
                💡 Mật khẩu an toàn mới của em bắt buộc phải có ít nhất 8 ký tự, bao gồm các thành phần: chữ cái in hoa (A-Z), chữ cái in thường (a-z), chữ số (0-9) và ít nhất 1 ký tự đặc biệt (như !, @, #, $, %,...) để đạt mức bảo mật tuyệt đối nhé!
              </p>

              {changePasswordError && (
                <div className="mb-4 p-3 bg-rose-50 border-2 border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 whitespace-normal">
                  <span>⚠️</span>
                  <span className="flex-1">{changePasswordError}</span>
                </div>
              )}

              {changePasswordSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 whitespace-normal">
                  <span>✅</span>
                  <span className="flex-1">{changePasswordSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3 text-left">
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Nhập mật khẩu hiện tại..."
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 text-sm font-semibold rounded-xl focus:border-amber-400 focus:bg-white focus:outline-hidden text-slate-700 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1">
                    Mật khẩu mới (Tối thiểu 6 ký tự)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Nhập mật khẩu an toàn mới..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 text-sm font-semibold rounded-xl focus:border-amber-400 focus:bg-white focus:outline-hidden text-slate-700 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Gõ lại mật khẩu mới để chắc chắn..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 text-sm font-semibold rounded-xl focus:border-amber-400 focus:bg-white focus:outline-hidden text-slate-700 transition-all shadow-inner"
                  />
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePasswordModal(false);
                      setChangePasswordError(null);
                      setChangePasswordSuccess(null);
                    }}
                    className="flex-1 py-2.5 border-2 border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-black rounded-xl transition-all cursor-pointer"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50"
                  >
                    {changingPassword ? 'Đang đổi...' : 'Đổi mật khẩu 🚀'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
