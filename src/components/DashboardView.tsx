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
import { LessonProgress, ExamRecord } from '../types';

interface DashboardViewProps {
  user: { id: string; nickname: string; grade: number; school?: string; classroom?: string };
  token: string;
  revisionProgress: LessonProgress[];
  examRecords: ExamRecord[];
  fileCount: number;
}

export default function DashboardView({ user, token, revisionProgress, examRecords, fileCount }: DashboardViewProps) {
  // Overall metrics calculation
  const highestExamScore = examRecords.length > 0 
    ? Math.max(...examRecords.map(e => e.score)) 
    : 0;

  const totalExamsTaken = examRecords.length;

  const completedRevisionLessons = revisionProgress.filter(p => p.isCompleted).length;

  // Average score
  const avgExamScore = examRecords.length > 0
    ? Math.round(examRecords.reduce((acc, cr) => acc + cr.score, 0) / examRecords.length)
    : 0;

  // Mascot motivation quote depending on how they perform
  const getMotivationalStatement = (avg: number, totalExams: number, completedL: number) => {
    if (totalExams === 0 && completedL === 0) {
      return `Chào em! Hãy cùng bắt tay học cùng Wippo nhé! Bắt đầu bằng cách thử giải bài tập "Ôn tập bài học" thôi nào! Đừng ngần ngại nha! 🦛🎈`;
    }
    if (avg >= 85) {
      return `Quá tuyệt vời! Điểm trung bình bài kiểm tra của em đạt tận ${avg}/100! Thầy Wippo bái phục em rồi đó, hãy giữ vững phong độ đỉnh cao này nhé! ⭐✨`;
    }
    if (avg >= 50) {
      return `Làm tốt lắm con ơi! Điểm số ${avg}/100 cho thấy sự tiến bộ vô cùng triển vọng. Thử ôn luyện thêm một chút để lấy trọn 3 sao vàng nhé! 🚀`;
    }
    return `Wippo tin em làm được mà! Thất bại là mẹ của thành công, cùng Wippo giải thêm vài câu ôn tập nữa để ghi điểm cao hơn ở lần tới nha! 💪☀️`;
  };

  // Prepare chart series from exam records chronologically
  const chartData = [...examRecords]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((rec, i) => ({
      name: `Lần ${i + 1}`,
      'Điểm số': rec.score,
      date: new Date(rec.createdAt).toLocaleDateString('vi', { month: 'numeric', day: 'numeric' }),
      correct: `${rec.correctCount}/${rec.totalQuestions}`
    }));

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
              Chào mừng, {user.nickname}! 👋
            </h2>
            <div className="text-base font-medium text-slate-500 flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-3">
              <span>Hôm nay chúng mình cùng học và ôn tập kỹ năng số IC3 nhé!</span>
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

      {/* Overview Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
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

        {/* Highest Score */}
        <div className="bg-white p-5 rounded-[2rem] border-4 border-vibrant-pink shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-vibrant-pink/10 text-vibrant-pink rounded-2xl shrink-0">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Điểm cao nhất</p>
            <div className="flex items-end gap-1.5">
              <span className="text-3xl font-black text-vibrant-pink font-display">{highestExamScore}</span>
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

        {/* Resource Files Stat */}
        <div className="bg-white p-5 rounded-[2rem] border-4 border-vibrant-yellow shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-vibrant-yellow/15 text-[#D97706] rounded-2xl shrink-0">
            <FolderGit className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Tài liệu học</p>
            <div className="flex items-end gap-1.5">
              <span className="text-3xl font-black text-vibrant-navy font-display">{fileCount}</span>
              <span className="text-xs font-bold text-gray-400 mb-1">thư mục</span>
            </div>
          </div>
        </div>

      </div>

      {/* Mascot Custom Motivation Section */}
      <div className="bg-[#FFEDD5] rounded-[2rem] border-4 border-vibrant-yellow p-6 flex flex-col md:flex-row items-center gap-4">
        <span className="text-4xl select-none shrink-0" role="img" aria-label="mascot">🦛🏫</span>
        <p className="text-sm font-bold text-[#D97706] leading-relaxed text-center md:text-left">
          <strong>Wippo động viên:</strong> {getMotivationalStatement(avgExamScore, totalExamsTaken, completedRevisionLessons)}
        </p>
      </div>

      {/* Details analytics grid (Chart & detailed progress) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recharts score history line */}
        <div className="bg-white rounded-[2rem] border-4 border-vibrant-pink p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-vibrant-pink" />
            Lịch sử điểm số bài kiểm tra
          </h3>

          {examRecords.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center bg-vibrant-bg/40 border border-dashed rounded-2xl p-6 text-sm text-slate-400 font-semibold text-center">
              <span className="text-3xl mb-2 select-none" role="img" aria-label="clock">📊</span>
              Em chưa làm bài thi thử nào để tích lũy biểu đồ điểm!
              <p className="text-xs font-normal mt-1 text-slate-400">Hãy thử nhấn vào "Kiểm tra bài học" để tích lũy điểm ngay.</p>
            </div>
          ) : (
            <div className="h-64">
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
                    labelFormatter={(label) => `Lượt thi: ${label}`}
                  />
                  <Area type="monotone" dataKey="Điểm số" stroke="#FF8B8B" strokeWidth={3} fillOpacity={1} fill="url(#colorPoints)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Detailed lessons logs and success indicators */}
        <div className="bg-white rounded-[2rem] border-4 border-vibrant-blue p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-vibrant-blue animate-spin" />
            Tiến độ ôn luyện chi tiết
          </h3>

          <div className="space-y-4">
            {revisionProgress.length === 0 ? (
              <div className="p-12 text-center bg-vibrant-bg/40 border border-dashed rounded-3xl text-sm font-semibold text-slate-400">
                🦛 Em chưa tham gia ôn tập bài học nào cả!
              </div>
            ) : (
              revisionProgress.map((p, idx) => {
                const percent = Math.round((p.correctAnswers / p.totalQuestions) * 100);
                return (
                  <div key={idx} className="bg-vibrant-bg/50 border-2 border-vibrant-yellow p-4 rounded-3xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-sm text-slate-800">
                        Bài {p.lessonId.split('_')[1]}: {p.lessonId === 'lesson_1' ? 'Máy tính quanh ta' : p.lessonId === 'lesson_2' ? 'Phần mềm ứng dụng' : 'Khám phá thế giới trực tuyến'}
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

      </div>

    </div>
  );
}
