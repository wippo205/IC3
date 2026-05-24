import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  BookOpen, 
  Search, 
  Filter, 
  Trophy, 
  Award, 
  Activity, 
  Calendar,
  ChevronDown,
  ChevronUp, 
  BookMarked,
  UserCheck, 
  GraduationCap,
  Sparkles,
  RefreshCw,
  School,
  Inbox
} from 'lucide-react';
import RevisionView from './RevisionView';

interface TeacherDashboardViewProps {
  user: { id: string; username: string; nickname: string; grade: number; school?: string; classroom?: string; role?: 'student' | 'teacher' };
  token: string;
  onLogout: () => void;
}

export default function TeacherDashboardView({ user, token, onLogout }: TeacherDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'scoreboard' | 'curriculum'>('scoreboard');
  
  // Scoreboard related states
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<number | 'all'>('all');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Curriculum grade selection state for the active editor
  const [editorGrade, setEditorGrade] = useState<number>(6);

  useEffect(() => {
    fetchScoreboardData();
  }, [token]);

  const fetchScoreboardData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const resp = await fetch('/api/teacher/scoreboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setStudents(data.scoreboard || []);
      } else {
        setErrorMsg(data.error || 'Không thể tải dữ liệu bảng điểm học sinh.');
      }
    } catch (err: any) {
      setErrorMsg('Mất kết nối máy chủ khi lấy dữ liệu bảng điểm.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle details card for a specific student
  const toggleStudentExpand = (studentId: string) => {
    if (expandedStudentId === studentId) {
      setExpandedStudentId(null);
    } else {
      setExpandedStudentId(studentId);
    }
  };

  // Calculate aggregated metrics
  const totalStudentsCount = students.length;
  const examTakers = students.filter(s => s.stats.totalExams > 0);
  const averageExamScoreOverall = examTakers.length > 0 
    ? Math.round(examTakers.reduce((acc, curr) => acc + curr.stats.averageScore, 0) / examTakers.length) 
    : 0;
  const topScorer = examTakers.length > 0
    ? examTakers.reduce((prev, curr) => (curr.stats.highestScore > prev.stats.highestScore ? curr : prev), examTakers[0])
    : null;

  // Filter and Search logic
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.school && student.school.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.classroom && student.classroom.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesGrade = selectedGradeFilter === 'all' || student.grade === Number(selectedGradeFilter);

    return matchesSearch && matchesGrade;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      {/* CUTE ROUNDED SYSTEM NAVIGATION BAR FOR TEACHERS */}
      <header className="bg-white border-b-4 border-orange-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          
          {/* Logo with Mascot */}
          <div className="flex items-center gap-2 select-none group">
            <span className="text-3xl">🧑‍🏫</span>
            <div>
              <h1 className="text-xl font-black font-display text-orange-600 tracking-tight flex items-center gap-1">
                Wippo Teacher Hub
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              </h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Trang quản trị cho Giáo viên Wippo IC3
              </span>
            </div>
          </div>

          {/* Teacher Action Tabs */}
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('scoreboard')}
              className={`flex items-center gap-1 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'scoreboard' 
                  ? 'bg-orange-500 text-white shadow-md' 
                  : 'text-slate-600 hover:text-orange-500 hover:bg-orange-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Bảng điểm Học sinh</span>
            </button>

            <button
              onClick={() => setActiveTab('curriculum')}
              className={`flex items-center gap-1 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'curriculum' 
                  ? 'bg-sky-500 text-white shadow-md' 
                  : 'text-slate-600 hover:text-sky-500 hover:bg-sky-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Biên soạn Câu hỏi</span>
            </button>
          </nav>

          {/* User badge and Log out trigger */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1 justify-end">
                <GraduationCap className="w-4 h-4 text-cyan-500" />
                Thầy/Cô: {user.nickname}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {user.school ? `${user.school}` : 'Giáo viên IC3'}
              </span>
            </div>
            
            <button
              onClick={onLogout}
              className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl transition-all cursor-pointer"
              title="Đăng xuất tài quản trị"
            >
              <span className="text-xs font-extrabold flex items-center gap-1">Rời phòng 🚪</span>
            </button>
          </div>

        </div>
      </header>

      {/* SUB-VIEW CONTAINER */}
      <main className="flex-1 bg-radial from-orange-50/10 to-slate-100/50 pb-12 p-4 md:p-6 max-w-6xl w-full mx-auto">
        <AnimatePresence mode="wait">
          
          {activeTab === 'scoreboard' && (
            <motion.div
              key="scoreboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Teacher Greetings and Overview Cards */}
              <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-6 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/30 rounded-full -translate-y-8 translate-x-8 pointer-events-none" />
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  Chào mừng Thầy/Cô quay lại! 👋
                </h2>
                <p className="text-sm font-semibold text-slate-500 mt-1">
                  Đây là trang thông tin quản trị trung tâm, nơi thống kê chi tiết tiến độ ôn bài, kết quả kiểm tra chất lượng đề IC3 của tất cả học sinh đang tham gia nền tảng.
                </p>

                {/* Scoreboard aggregated Stats Bento grids */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  <div className="p-5 bg-orange-50/50 border border-orange-100 rounded-3xl flex items-center gap-4">
                    <div className="p-3 bg-orange-500 rounded-2xl text-white shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Sĩ số học sinh</span>
                      <span className="text-2xl font-black text-slate-800">{totalStudentsCount} em học sinh</span>
                    </div>
                  </div>

                  <div className="p-5 bg-sky-50/50 border border-sky-100 rounded-3xl flex items-center gap-4">
                    <div className="p-3 bg-sky-500 rounded-2xl text-white shrink-0">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Đểm thi Trung Bình</span>
                      <span className="text-2xl font-black text-slate-800">{averageExamScoreOverall}% / 100</span>
                    </div>
                  </div>

                  <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-3xl flex items-center gap-4">
                    <div className="p-3 bg-amber-500 rounded-2xl text-white shrink-0">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Thần đồng IC3</span>
                      <span className="text-sm font-black text-slate-800 truncate block max-w-44">
                        {topScorer ? `${topScorer.nickname} (${topScorer.stats.highestScore}%)` : 'Chưa có dữ liệu'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search, Filter Toolbar & Reload Button */}
              <div className="bg-white border-2 border-slate-100 rounded-3xl p-4 flex flex-col md:flex-row justify-between items-center gap-3 shadow-xs">
                
                {/* Search Box */}
                <div className="relative w-full md:w-96">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Tìm theo tên học sinh, lớp, trường..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-orange-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Grade and Actions Filters */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-2xl p-1 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 pl-2 pr-1 flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Filter:
                    </span>
                    <button
                      onClick={() => setSelectedGradeFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedGradeFilter === 'all' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Tất cả
                    </button>
                    {[3, 4, 5, 6, 7, 8].map(g => (
                      <button
                        key={g}
                        onClick={() => setSelectedGradeFilter(g)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedGradeFilter === g ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        K{g}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={fetchScoreboardData}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all border border-slate-200 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                    title="Tải lại danh sách"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Reload</span>
                  </button>
                </div>
              </div>

              {/* Main Scoreboard Content Listing */}
              {loading ? (
                <div className="bg-white rounded-[2rem] border-2 border-slate-100 py-16 text-center text-slate-400 text-sm font-semibold shadow-xs">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
                  Đang thu thập và xếp hạng dữ liệu học tập...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-12 text-center text-slate-400 font-semibold shadow-xs flex flex-col items-center justify-center space-y-3">
                  <Inbox className="w-12 h-12 text-slate-300 animate-bounce" />
                  <p>Kho lưu trữ không tìm thấy học sinh nào phù hợp với bộ lọc hiển thị.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredStudents.map((student) => {
                    const isExpanded = expandedStudentId === student.id;
                    return (
                      <motion.div
                        key={student.id}
                        layout="position"
                        className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xs hover:border-orange-200 hover:shadow-md transition-all divide-y divide-slate-100"
                      >
                        {/* Student Main Row */}
                        <div 
                          onClick={() => toggleStudentExpand(student.id)}
                          className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-xl shrink-0 border border-orange-200">
                              🏫
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                                {student.nickname}
                                <span className="text-[10px] bg-slate-100 text-slate-500 font-extrabold px-2 py-0.5 rounded-md">
                                  {student.username}
                                </span>
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs font-semibold text-slate-400">
                                <span className="flex items-center gap-1 text-orange-600">
                                  <GraduationCap className="w-3.5 h-3.5" />
                                  Lớp {student.classroom ? `${student.classroom} (Khối ${student.grade})` : `Khối {student.grade}`}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <School className="w-3.5 h-3.5" />
                                  {student.school || 'Chưa cập nhật trường'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Mini Stats Column */}
                          <div className="flex flex-wrap items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="text-right px-3 py-1.5 bg-slate-50 rounded-xl">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Hoàn thành</span>
                              <span className="text-xs font-black text-slate-800">{student.stats.completedRevision} bài ôn</span>
                            </div>

                            <div className="text-right px-3 py-1.5 bg-sky-50 rounded-xl">
                              <span className="text-[9px] font-bold text-sky-500 block uppercase">Kiểm tra</span>
                              <span className="text-xs font-black text-sky-700">{student.stats.totalExams} lần</span>
                            </div>

                            <div className="text-right px-3 py-1.5 bg-amber-50 rounded-xl">
                              <span className="text-[9px] font-bold text-amber-500 block uppercase">Trung Bình</span>
                              <span className="text-xs font-black text-amber-700">{student.stats.averageScore}% / 100</span>
                            </div>

                            <button 
                              type="button"
                              className="p-2 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                            </button>
                          </div>
                        </div>

                        {/* Student Expanded History Section */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden bg-slate-50/50"
                            >
                              <div className="p-6 space-y-6">
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  
                                  {/* Detailed Revision Topics */}
                                  <div className="space-y-2.5">
                                    <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                      <BookMarked className="w-4 h-4 text-orange-500" />
                                      Chi tiết tiến trình ôn luyện
                                    </h4>
                                    
                                    {student.stats.progress.length === 0 ? (
                                      <div className="p-4 bg-white border border-slate-100 rounded-2xl text-center text-xs text-slate-400 font-semibold shadow-xs">
                                        Em học sinh chưa lưu tiến trình ôn tập bài nào.
                                      </div>
                                    ) : (
                                      <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3.5 shadow-xs max-h-60 overflow-y-auto">
                                        {student.stats.progress.map((prog: any, idx: number) => (
                                          <div key={idx} className="space-y-1">
                                            <div className="flex justify-between items-center text-xs">
                                              <span className="font-bold text-slate-800">Bài {prog.lessonId} (Lớp {prog.grade})</span>
                                              <span className="font-black text-orange-600">
                                                {prog.correctAnswers}/{prog.totalQuestions} Câu hỏi đúng
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                  className="h-full bg-emerald-500 rounded-full" 
                                                  style={{ width: `${(prog.correctAnswers / prog.totalQuestions) * 100}%` }}
                                                />
                                              </div>
                                              <span className="text-[10px] font-bold text-slate-400">
                                                {prog.isCompleted ? '✓ Đã xong' : 'Đang học'}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Detailed Exams History */}
                                  <div className="space-y-2.5">
                                    <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                      <Award className="w-4 h-4 text-sky-500" />
                                      Lịch sử kiểm tra (Exam Records)
                                    </h4>

                                    {student.stats.exams.length === 0 ? (
                                      <div className="p-4 bg-white border border-slate-100 rounded-2xl text-center text-xs text-slate-400 font-semibold shadow-xs">
                                        Em học sinh chưa thực hiện bài thi tự do nào.
                                      </div>
                                    ) : (
                                      <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2.5 shadow-xs max-h-60 overflow-y-auto">
                                        {student.stats.exams.map((ex: any, idx: number) => {
                                          const isHigh = ex.score >= 80;
                                          return (
                                            <div key={idx} className="flex justify-between items-center p-2.5 border border-slate-50 hover:bg-slate-50 rounded-xl">
                                              <div className="space-y-0.5">
                                                <span className="text-xs font-bold text-slate-800 block">Kiểm tra IC3 Lớp {ex.grade}</span>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                                                  <span className="flex items-center gap-0.5">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(ex.createdAt).toLocaleDateString('vi-VN')}
                                                  </span>
                                                  <span>•</span>
                                                  <span>Thời gian: {Math.floor(ex.durationSeconds / 60)}p {ex.durationSeconds % 60}s</span>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <span className={`text-sm font-black ${isHigh ? 'text-emerald-500' : 'text-slate-700'}`}>
                                                  {ex.score}%
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-bold block">
                                                  {ex.correctCount}/{ex.totalQuestions} đúng
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>

                                </div>

                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'curriculum' && (
            <motion.div
              key="curriculum"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Grade selector bar specifically for curriculum editing */}
              <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    Biên soạn học liệu & Câu hỏi 🛠️
                  </h2>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    Chọn khối lớp cần biên soạn câu hỏi, thêm đề ôn tập hoặc xóa sửa chủ đề học tập.
                  </p>
                </div>
                
                {/* Grade Selection Slider */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-200 shrink-0">
                  {[3, 4, 5, 6, 7, 8].map(g => (
                    <button
                      key={g}
                      onClick={() => setEditorGrade(g)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        editorGrade === g 
                          ? 'bg-sky-500 text-white shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      Lớp {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mounted RevisionView for management */}
              <div className="bg-white rounded-[2.5rem] border-4 border-slate-100 p-1 md:p-4 shadow-sm relative overflow-hidden">
                <RevisionView 
                  grade={editorGrade}
                  token={token}
                  onBackToDashboard={() => setActiveTab('scoreboard')}
                  onProgressUpdated={() => {}}
                  userRole="teacher"
                />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <footer className="bg-white border-t border-slate-100 py-4 text-center text-xs font-semibold text-slate-400">
        <span>© 2026 Admin Teacher Wippo IC3. Giáo dục là bệ phóng tài năng Việt. 🦛🏫🌟</span>
      </footer>

    </div>
  );
}
