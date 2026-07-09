import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  Trophy, 
  BookOpen, 
  FolderGit, 
  Flame, 
  TrendingUp, 
  Clock, 
  Sparkles,
  HelpCircle,
  Activity
} from 'lucide-react';
import { LessonProgress, ExamRecord, HomeworkProgress } from '../types';

interface DashboardViewProps {
  user: { id: string; nickname: string; grade: number; school?: string; classroom?: string };
  token: string;
  revisionProgress: LessonProgress[];
  homeworkProgress?: HomeworkProgress[];
  examRecords: ExamRecord[];
  fileCount: number;
  onStartHomework: (lessonId: string, homeworkId: string) => void;
}

export default function DashboardView({ user, token, revisionProgress, homeworkProgress = [], examRecords, fileCount, onStartHomework }: DashboardViewProps) {
  const [assignments, setAssignments] = useState<any[]>([]);

  const sanitizeToken = (value: string | null | undefined) => {
    if (!value) return null;
    const cleaned = value.replace(/[^\u0000-\u007F]/g, '');
    return cleaned || null;
  };

  useEffect(() => {
    const fetchHomework = async () => {
      const safeToken = sanitizeToken(token);
      if (!safeToken) return;

      try {
        const resp = await fetch('/api/homework/assignments', {
          headers: { 'Authorization': `Bearer ${safeToken}` }
        });
        const data = await resp.json();
        if (resp.ok && data.success) {
          setAssignments(data.assignments || []);
        }
      } catch (err) {
        console.error("Lỗi khi tải bài tập về nhà:", err);
      }
    };
    fetchHomework();
  }, [token]);

  // 1. Filter to revision tests only
  const revisionExams = examRecords.filter(e => e.isRevisionTest);

  // Helper for soft comparison of school name (ignores whitespace and case-insensitive)
  const isSchoolMatch = (s1: string, s2: string): boolean => {
    const clean = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, '');
    return clean(s1) === clean(s2);
  };

  // Helper for comparing school classrooms very leniently (stripping non-alphanumeric e.g., 6/1, 6.1, 6-1, 61 -> 61)
  const isClassroomMatch = (c1: string, c2: string): boolean => {
    const clean = (s: string) => (s || '').trim().toLowerCase().replace(/[^a-z0-9]/gi, '');
    return clean(c1) === clean(c2);
  };

  // Filter and sort user's class assignments
  const myAssignments = assignments.filter((h: any) =>
    Number(h.grade) === Number(user.grade) &&
    isSchoolMatch(h.school, user.school || '') &&
    isClassroomMatch(h.classroom, user.classroom || '')
  );
  const sortedMyAssignments = [...myAssignments].sort((a, b) => 
    new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
  );

  // 2. Sort chronologically (show all attempts in history)
  const filteredExams = [...revisionExams].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Overall metrics calculation based on revision tests
  const highestExamScore = filteredExams.length > 0 
    ? Math.max(...filteredExams.map(e => e.score)) 
    : 0;

  const totalExamsTaken = filteredExams.length;

  const completedRevisionLessons = revisionProgress.filter(p => p.isCompleted).length;

  // Average score calculated of all taken attempts, normalized if any scores are on the 1000-point IC3 scale
  const avgExamScore = revisionExams.length > 0
    ? Math.round(revisionExams.reduce((acc, cr) => {
        const norm = cr.score > 100 ? Math.round(cr.score / 10) : cr.score;
        return acc + norm;
      }, 0) / revisionExams.length)
    : 0;

  // Mascot motivation quote depending on how they perform
  const getMotivationalStatement = (avg: number, totalExams: number, completedL: number) => {
    if (totalExams === 0 && completedL === 0) {
      return `Chào em! Hãy cùng bắt tay học cùng Wippo nhé! Bắt đầu bằng cách thử giải bài tập "Ôn tập bài học" thôi nào! Đừng ngần ngại nha! 🦛🎈`;
    }
    if (avg >= 85) {
      return `Quá tuyệt vời! Điểm trung bình bài kiểm tra của em đạt tận ${avg}%! Thầy Wippo bái phục em rồi đó, hãy giữ vững phong độ đỉnh cao này nhé! ⭐✨`;
    }
    if (avg >= 50) {
      return `Làm tốt lắm con ơi! Điểm số ôn tập trung bình đạt ${avg}% cho thấy sự tiến bộ vô cùng triển vọng. Thử ôn luyện thêm một chút để lấy trọn 3 sao vàng nhé! 🚀`;
    }
    return `Hành trình vĩ đại bắt đầu không phải bằng một bước nhảy, mà bằng một bước chân nhỏ bé. Học từ những điều cơ bản và nhỏ bé nhất! 💪☀️`;
  };

  // Prepare chart series from filtered exam records, converting 1000-pt scores to percentage for beautiful presentation
  const chartData = filteredExams.map((rec, i) => {
    const displayScore = rec.score > 100 ? Math.round(rec.score / 10) : rec.score;
    return {
      name: new Date(rec.createdAt).toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' }),
      'Điểm số': displayScore,
      formatterName: `Ngày ${new Date(rec.createdAt).toLocaleDateString('vi-VN')}`,
      correct: `${rec.correctCount}/${rec.totalQuestions}`
    };
  });

  return (
    <div className="space-y-8 font-sans p-6 max-w-6xl mx-auto">
      
      {/* Banner introduction with adorable custom mascot */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2rem] p-8 border-4 border-vibrant-pink shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-[-30px] right-[-30px] w-48 h-48 bg-vibrant-pink/10 rounded-full blur-xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <motion.div 
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="text-5xl bg-vibrant-pink text-white w-20 h-20 rounded-3xl flex items-center justify-center border-4 border-white shadow-lg shrink-0"
          >
            🦛
          </motion.div>
          <div className="text-center md:text-left space-y-2">
            <h2 className="text-3xl font-black font-display text-vibrant-blue tracking-tight">
              Chào mừng, em {user.nickname}! 👋
            </h2>
            <div className="text-base font-medium text-slate-500 flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-3">
              <div className="flex flex-wrap gap-1.5 select-none">
                <span className="inline-block bg-vibrant-yellow text-vibrant-navy px-3 py-1 rounded-full font-black text-xs border border-[#D9B632] shadow-xs">
                  Khối Lớp {user.grade}
                </span>
                {user.classroom && (
                  <span className="inline-block bg-vibrant-blue text-white px-3 py-1 rounded-full font-black text-xs shadow-xs">
                    Lớp: {user.classroom}
                  </span>
                )}
                {user.school && (
                  <span className="inline-block bg-vibrant-pink text-white px-3 py-1 rounded-full font-black text-xs shadow-xs">
                    Trường: {user.school}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Homework Alert */}
      {(() => {
        const studentActiveHws = assignments.filter((h: any) => 
          Number(h.grade) === Number(user.grade) && 
          isSchoolMatch(h.school, user.school || '') && 
          isClassroomMatch(h.classroom, user.classroom || '') &&
          new Date().getTime() <= new Date(h.deadline).getTime()
        );

        const activeHw = studentActiveHws.length > 0
          ? [...studentActiveHws].sort((a: any, b: any) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())[0]
          : null;

        if (!activeHw) return null;

        const progress = homeworkProgress.find(p => 
          p.lessonId === activeHw.lessonId && 
          p.homeworkId === activeHw.id
        );
        let statusText = 'Chưa làm 📚';
        let statusColor = 'bg-rose-50 border-rose-300 text-rose-800';
        let statusBadge = 'bg-rose-500 text-white';
        let detailText = 'Hãy bấm nút "Làm bài ngay" ở bên phải để ôn tập và tích lũy điểm số nhé!';
        let isHwCompleted = false;

        if (progress) {
          const percent = progress.totalQuestions > 0 ? (progress.correctAnswers / progress.totalQuestions) * 100 : 0;
          if (percent >= 90) {
            statusText = `Đạt (${Math.round(percent)}%) 🏆`;
            statusColor = 'bg-emerald-50 border-emerald-300 text-emerald-800';
            statusBadge = 'bg-emerald-500 text-white';
            detailText = `Tuyệt vời! Em đã hoàn thành xuất sắc mục tiêu bài tập về nhà với độ chính xác đạt ${Math.round(percent)}%!`;
            isHwCompleted = true;
          } else {
            statusText = `Chưa đạt (${Math.round(percent)}%) ⚠️`;
            statusColor = 'bg-amber-50 border-amber-300 text-amber-800';
            statusBadge = 'bg-amber-500 text-white';
            detailText = `Em đã làm bài (đạt ${Math.round(percent)}%) nhưng chưa chạm mốc 90% độ chính xác tối thiểu. Hãy luyện tập lại nhé!`;
          }
        }

        return (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[2rem] p-6 border-4 flex flex-col lg:flex-row items-center justify-between gap-5 ${statusColor} shadow-md overflow-hidden relative`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-200/10 rounded-full blur-lg" />
            <div className="flex items-center gap-4 z-10 text-left flex-1">
              <span className="text-4xl select-none">🕒</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm md:text-base font-black tracking-tight">
                    Bài Tập Về Nhà được giao: <span className="underline decoration-wavy decoration-sky-400">{activeHw.lessonTitle}</span>
                  </h3>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${statusBadge}`}>
                    Trạng thái: {statusText}
                  </span>
                </div>
                <p className="text-xs font-semibold opacity-90 mt-1 leading-relaxed">
                  {detailText}
                </p>
                <p className="text-[10px] font-bold opacity-75 mt-0.5">
                  📅 Ngày giao: {formatDateTime(activeHw.assignedAt)} • Hạn chót: <span className="font-extrabold underline">{formatDateTime(activeHw.deadline)}</span> <span className="text-slate-700 font-black">({getRemainingTimeText(activeHw.deadline)})</span>
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0 z-10 w-full lg:w-auto">
              <span className="text-[11px] font-extrabold bg-white/70 px-3 py-2 rounded-xl text-slate-800 border border-slate-200/80 shadow-xs select-none w-full sm:w-auto text-center">
                🎯 Chỉ tiêu: đúng từ 90% trở lên
              </span>
              {isHwCompleted ? (
                <div className="px-5 py-2.5 bg-emerald-500 border-2 border-emerald-400 text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 w-full sm:w-auto select-none">
                  <span>Hoàn thành 🎉</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onStartHomework(activeHw.lessonId, activeHw.id)}
                  className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 border-2 border-orange-400 hover:border-orange-500 text-white text-xs font-black rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto"
                >
                  <span>Làm bài ngay 🚀</span>
                </button>
              )}
            </div>
          </motion.div>
        );
      })()}

      {/* Overview Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Revision Stat */}
        <div className="bg-white p-5 rounded-[2rem] border-4 border-vibrant-blue shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-vibrant-blue/10 text-vibrant-blue rounded-2xl shrink-0">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Bài ôn tập</p>
            <div className="flex items-end gap-1.5">
              <span className="text-3xl font-black text-vibrant-blue font-display">{completedRevisionLessons}</span>
              <span className="text-xs font-bold text-gray-400 mb-1">hoàn thành</span>
            </div>
          </div>
        </div>

        {/* Highest Score changed to Average Score */}
        <div className="bg-white p-5 rounded-[2rem] border-4 border-vibrant-pink shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-vibrant-pink/10 text-vibrant-pink rounded-2xl shrink-0">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Điểm trung bình</p>
            <div className="flex items-end gap-1.5">
              <span className="text-3xl font-black text-vibrant-pink font-display">{avgExamScore}</span>
              <span className="text-xs font-bold text-gray-400 mb-1">/100</span>
            </div>
          </div>
        </div>

        {/* Total Exams */}
        <div className="bg-white p-5 rounded-[2rem] border-4 border-vibrant-green shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-vibrant-green/10 text-vibrant-green rounded-2xl shrink-0">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider font-display">Thi thử</p>
            <div className="flex items-end gap-1.5">
              <span className="text-3xl font-black text-vibrant-green font-display">{totalExamsTaken}</span>
              <span className="text-xs font-bold text-gray-400 mb-1">lần</span>
            </div>
          </div>
        </div>

      </div>

      {/* Mascot Custom Motivation Section */}
      <div className="bg-[#FFEDD5] rounded-[2rem] border-4 border-vibrant-yellow p-6 flex flex-col md:flex-row items-center gap-4">
        <span className="text-4xl select-none shrink-0" role="img" aria-label="mascot">🦛🏫</span>
        <p className="text-sm font-bold text-[#D97706] leading-relaxed text-center md:text-left">
          {getMotivationalStatement(avgExamScore, totalExamsTaken, completedRevisionLessons)}
        </p>
      </div>

      {/* Details analytics grid (Chart & detailed progress) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recharts score history line & scoreboard table */}
        <div className="bg-white rounded-[2rem] border-4 border-vibrant-pink p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-vibrant-pink" />
              Lịch sử điểm số bài kiểm tra
            </h3>

            {filteredExams.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center bg-vibrant-bg/40 border border-dashed rounded-2xl p-6 text-sm text-slate-400 font-semibold text-center">
                <span className="text-3xl mb-2 select-none" role="img" aria-label="clock">📊</span>
                Em chưa làm bài kiểm tra ôn tập nào để tích lũy biểu đồ điểm!
                <p className="text-xs font-normal mt-1 text-slate-400">Hãy thử nhấn vào "Kiểm tra 📝" trong bài học ôn tập để tích lũy điểm nhé.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF8B8B" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#FF8B8B" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" dy={10} />
                      <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} fontWeight="bold" />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: '2px solid #FF8B8B', fontWeight: 'bold', fontSize: '13px' }}
                        labelFormatter={(label, items) => {
                          const item = items?.[0]?.payload;
                          return item ? `${item.formatterName}` : `Lượt làm`;
                        }}
                      />
                      <Area type="monotone" dataKey="Điểm số" stroke="#FF8B8B" strokeWidth={3} fillOpacity={1} fill="url(#colorPoints)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Bảng điểm chi tiết */}
                <div className="border-2 border-slate-100 rounded-2xl overflow-hidden shadow-xs bg-slate-50/50 mt-4">
                  <div className="bg-vibrant-pink/10 px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-extrabold text-[10px] text-vibrant-pink uppercase tracking-wider">📊 Bảng Điểm Kiểm Tra</span>
                    <span className="text-[9px] font-bold text-slate-400 bg-white/80 py-0.5 px-2 rounded-md">Tất cả lượt làm bài ôn tập</span>
                  </div>
                  <div className="overflow-y-auto max-h-48 text-left">
                    <table className="w-full border-collapse text-xs font-bold text-slate-700">
                      <thead>
                        <tr className="bg-white border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider">
                          <th className="py-2 px-3 font-black text-center w-12">STT</th>
                          <th className="py-2 px-3 font-black">Tên bài kiểm tra</th>
                          <th className="py-2 px-3 font-black text-center w-28">Ngày làm</th>
                          <th className="py-2 px-3 font-black text-right w-20">Điểm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white/50">
                        {filteredExams.map((record, i) => (
                          <tr key={record.id} className="hover:bg-vibrant-pink/5 transition-colors">
                            <td className="py-2 px-3 font-mono text-center text-slate-400">{i + 1}</td>
                            <td className="py-2 px-3 text-slate-800 font-extrabold">
                              {(() => {
                                if (record.lessonTitle) {
                                  const lower = record.lessonTitle.toLowerCase();
                                  if (lower.startsWith('kiểm tra') || lower.startsWith('đề thi') || lower.startsWith('đề ôn tập')) {
                                    return record.lessonTitle;
                                  }
                                  return `Kiểm tra ${record.lessonTitle}`;
                                }
                                if (record.lessonId) {
                                  const parts = record.lessonId.split('_');
                                  const lastPart = parts[parts.length - 1];
                                  if (!isNaN(Number(lastPart))) {
                                    return `Kiểm tra Bài ${lastPart}`;
                                  }
                                  return `Kiểm tra ${lastPart}`;
                                }
                                return `Kiểm tra IC3 Lớp ${record.grade || user.grade}`;
                              })()}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-500 font-medium">
                              {new Date(record.createdAt).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className="font-black text-sm text-vibrant-pink">
                                {record.score > 100 ? `${record.score} điểm` : `${record.score}%`}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detailed progress and Homework Tracking Bar */}
        <div className="flex flex-col gap-6">
          {/* Detailed lessons logs and success indicators */}
          <div className="bg-white rounded-[2rem] border-4 border-vibrant-blue p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-vibrant-blue animate-spin" />
              Tiến độ ôn luyện chi tiết
            </h3>

            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
              {revisionProgress.length === 0 ? (
                <div className="p-12 text-center bg-vibrant-bg/40 border border-dashed rounded-3xl text-sm font-semibold text-slate-400">
                  🦛 Em chưa tham gia ôn tập bài học nào cả!
                </div>
              ) : (
                revisionProgress.map((p, idx) => {
                  const percent = Math.round((p.correctAnswers / p.totalQuestions) * 100);
                  return (
                    <div key={idx} className="bg-vibrant-bg/50 border-2 border-vibrant-yellow p-4 rounded-3xl space-y-2 text-left">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-sm text-slate-800">
                          {p.lessonTitle || (p.lessonId.startsWith('lesson_') ? `Chủ đề ${p.lessonId.split('_')[1]}` : p.lessonId)}
                        </span>
                        <span className={`py-1 px-2 text-[10px] font-black rounded-lg uppercase ${
                          p.isCompleted ? 'bg-vibrant-green text-white shadow-xs' : 'bg-vibrant-yellow text-vibrant-navy shadow-xs'
                        }`}>
                          {p.isCompleted ? 'Xong ✅' : 'Chưa xong ⏳'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
                        <span>Trả lời đúng: {p.correctAnswers}/{p.totalQuestions} câu</span>
                        <span>Chính xác {percent}%</span>
                      </div>

                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            p.isCompleted ? 'bg-vibrant-green' : 'bg-vibrant-yellow'
                          }`}
                          style={{ width: `${(p.completedQuestions / p.totalQuestions) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Homework Tracking Bar */}
          <div className="bg-white rounded-[2rem] border-4 border-orange-400 p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
              <span className="text-xl animate-bounce">📚</span>
              Thanh theo dõi bài tập về nhà
            </h3>

            <div className="space-y-3 max-h-[148px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-orange-200">
              {sortedMyAssignments.length === 0 ? (
                <div className="p-8 text-center bg-vibrant-bg/40 border border-dashed rounded-[1.5rem] text-sm font-semibold text-slate-400">
                  🦛 Em chưa được giao bài tập về nhà nào cả!
                </div>
              ) : (
                sortedMyAssignments.map((h, idx) => {
                  const isCurrentActive = new Date().getTime() <= new Date(h.deadline).getTime();
                  const prog = homeworkProgress.find(p => 
                    p.lessonId === h.lessonId && 
                    p.homeworkId === h.id
                  );

                  let statusText = 'Chưa làm ❌';
                  let statusClass = 'text-rose-600 bg-rose-50 border-rose-200';
                  let isDone = false;
                  
                  if (prog) {
                    const percent = prog.totalQuestions > 0 ? (prog.correctAnswers / prog.totalQuestions) * 100 : 0;
                    if (percent >= 90) {
                      statusText = `Đạt (${Math.round(percent)}%) ✅`;
                      statusClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                      isDone = true;
                    } else {
                      if (!isCurrentActive) {
                        statusText = `Chưa đạt (${Math.round(percent)}%) ❌`;
                        statusClass = 'text-rose-600 bg-rose-50 border-rose-200';
                      } else {
                        statusText = `Chưa đạt (${Math.round(percent)}%) ⚠️`;
                        statusClass = 'text-amber-700 bg-amber-50 border-amber-200';
                      }
                    }
                  } else {
                    if (!isCurrentActive) {
                      statusText = 'Quá hạn/Chưa làm ⏰';
                      statusClass = 'text-slate-500 bg-slate-100 border-slate-200';
                    }
                  }

                  return (
                    <div key={h.id || idx} className={`p-4 border-2 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${
                      isCurrentActive ? 'border-orange-300 bg-orange-50/25' : 'border-slate-100 bg-slate-50/30'
                    }`}>
                      <div className="text-left space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-800">
                            {h.lessonTitle}
                          </span>
                          {isCurrentActive && (
                            <span className="px-1.5 py-0.5 text-[8px] bg-sky-500 text-white font-black rounded uppercase animate-pulse">
                              Đang mở
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-450 font-bold font-display leading-relaxed">
                          📅 Giao: {formatDateTime(h.assignedAt)} <br/>
                          ⏰ Hạn chót: <span className="font-extrabold text-slate-600">{formatDateTime(h.deadline)}</span>
                          {isCurrentActive ? (
                            <span className="text-emerald-600 ml-1.5 font-black">({getRemainingTimeText(h.deadline)})</span>
                          ) : (
                            <span className="text-rose-500 ml-1.5 font-bold">(Đã hết hạn ⏰)</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                        <span className={`px-2.5 py-1 text-[10px] font-black border rounded-lg shrink-0 ${statusClass}`}>
                          {statusText}
                        </span>
                        {isCurrentActive && (
                          isDone ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-black rounded-lg select-none shrink-0">
                              Hoàn thành 🎉
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onStartHomework(h.lessonId, h.id)}
                              className="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 border border-sky-400 text-white text-[10px] font-black rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                              Làm bài
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
