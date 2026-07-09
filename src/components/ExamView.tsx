import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { generateQuestionsForLesson } from '../questionsData';
import { Question } from '../types';
import { 
  ArrowLeft, 
  Clock, 
  Send, 
  CheckCircle, 
  Trophy, 
  AlertTriangle,
  Flame,
  Check,
  X,
  RefreshCw,
  HelpCircle
} from 'lucide-react';

interface ExamViewProps {
  grade: number;
  lessonId: number;
  token: string;
  onBackToDashboard: () => void;
  onExamSaved: () => void;
}

export default function ExamView({ grade,lessonId, token, onBackToDashboard, onExamSaved }: ExamViewProps) {
  const getExamConfig = (g: number) => {
    return { qCount: 45, timeMins: 45 }; // IC3 Exam Standard: exactly 45 questions, 45 minutes
  };

  const config = getExamConfig(grade);
  const [examStarted, setExamStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Track user selected option for each question index
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scorePercentage, setScorePercentage] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [savingRecord, setSavingRecord] = useState(false);

  // Timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [cheatType, setCheatType] = useState<'fullscreen' | 'tab' | 'blur' | null>(null);

  useEffect(() => {
    if (examStarted && !isSubmitted) {
      // 1. Enter fullscreen auto
      const enterFS = async () => {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
        } catch (err) {
          console.warn("Fullscreen request rejected or not supported:", err);
        }
      };
      enterFS();

      // 2. Setup listeners for anti-cheat and fullscreen compliance
      const handleFullscreenChange = () => {
        if (examStarted && !isSubmitted && !document.fullscreenElement) {
          setCheatType('fullscreen');
          setExamStarted(false);
          setQuestions([]);
        }
      };

      const handleVisibilityChange = () => {
        if (examStarted && !isSubmitted && document.hidden) {
          setCheatType('tab');
          setExamStarted(false);
          setQuestions([]);
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        }
      };

      const handleWindowBlur = () => {
        if (examStarted && !isSubmitted) {
          setCheatType('blur');
          setExamStarted(false);
          setQuestions([]);
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        }
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);

      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleWindowBlur);
      };
    }
  }, [examStarted, isSubmitted]);

  // Load random questions from different lessons to make a comprehensive final exam
  const handleStartExam = async () => {
    setLoading(true);
    const count = config.qCount;
    let selectedQuestions: Question[] = [];

    try {
      const qResp = await fetch('/api/questions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const qData = await qResp.json();
      if (qResp.ok && qData.success && Array.isArray(qData.questions)) {
        // Filter questions by grade
        const bankForGrade = qData.questions.filter((q: any) => !q.grade || Number(q.grade) === Number(grade));
        
        if (bankForGrade.length > 0) {
          // Shuffle the grade specific database questions
          const shuffledBank = [...bankForGrade].sort(() => 0.5 - Math.random());
          if (shuffledBank.length >= count) {
            selectedQuestions = shuffledBank.slice(0, count);
          } else {
            selectedQuestions = [...shuffledBank];
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch custom question bank:", err);
    }

    // No auto-add additions if custom questions exist in the database bank.
    // We only generate mockup questions if the grade database is completely empty.
    if (selectedQuestions.length === 0) {
      const generated1 = generateQuestionsForLesson(grade, 1, Math.ceil(count / 2));
      const generated2 = generateQuestionsForLesson(grade, 2, Math.floor(count / 2));
      selectedQuestions = [...generated1, ...generated2].sort(() => 0.5 - Math.random()).slice(0, count);
    }

    // Map necessary fields to match Question schema exactly
    const finalizedQuestions = selectedQuestions.map((q, idx) => ({
      ...q,
      id: q.id || `exam-${grade}-${idx}-${Date.now()}`
    }));

    setQuestions(finalizedQuestions);
    setUserAnswers({});
    setCurrentIndex(0);
    setTimeLeft(config.timeMins * 60);
    setIsSubmitted(false);
    setExamStarted(true);
    setLoading(false);
  };

  // Countdown effect
  useEffect(() => {
    if (examStarted && !isSubmitted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmitExam(true); // Auto-submit when time runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examStarted, isSubmitted, timeLeft]);

  // Handle select option
  const handleSelectOption = (optionIndex: number) => {
    if (isSubmitted) return;
    setUserAnswers({ ...userAnswers, [currentIndex]: optionIndex });
  };

  const handleSubmitExam = async (isAutoSubmit = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (!isAutoSubmit) {
      const unansweredCount = questions.length - Object.keys(userAnswers).length;
      if (unansweredCount > 0) {
        if (!window.confirm(`Em còn ${unansweredCount} câu hỏi chưa làm. Em có chắc muốn nộp bài sớm không?`)) {
          // Restart timer if canceled
          setTimeLeft((prev) => prev);
          return;
        }
      } else {
        if (!window.confirm('Em có thực sự chắc chắn muốn nộp bài thi không?')) {
          return;
        }
      }
    }

    // Tabulate score
    let corrects = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctIndex) {
        corrects++;
      }
    });

    const scorePoints = Math.round((corrects / questions.length) * 1000);
    setCorrectCount(corrects);
    setScorePercentage(scorePoints); // Store full 0-1000 points
    setIsSubmitted(true);

    // Save record to database
    setSavingRecord(true);
    try {
      await fetch('/api/exams/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // body: JSON.stringify({
        //   grade,
        //   score: scorePoints, // Save the 1000-based points
        //   correctCount: corrects,
        //   totalQuestions: questions.length,
        //   durationSeconds: (config.timeMins * 60) - timeLeft,
        //   isRevisionTest: false,
        //   lessonId: `exam_final_grade_${grade}`,
        //   lessonTitle: `Đề thi thử tổng hợp IC3 Lớp ${grade}`
        // })
        body: JSON.stringify({

  grade,

  score: scorePoints,

  correctCount: corrects,

  totalQuestions: questions.length,


  durationSeconds:
    (config.timeMins * 60) - timeLeft,


  isRevisionTest: true,


  lessonId: lessonId,

})
      });
      onExamSaved();
    } catch (err) {
      console.error('Failed to save exam score:', err);
    } finally {
      setSavingRecord(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!examStarted) {
    // Explanation prep window before launching
    return (
      <div className="p-6 max-w-2xl mx-auto font-sans">
        <div className="bg-white rounded-[2.5rem] border-4 border-vibrant-pink p-8 shadow-sm relative overflow-hidden text-center space-y-6">
          <div className="absolute top-0 left-0 w-full h-3 bg-vibrant-pink" />
          
          <div className="inline-block p-4 bg-vibrant-pink/10 rounded-full">
            <Trophy className="w-16 h-16 text-vibrant-pink animate-bounce" />
          </div>

          <div>
            <span className="p-2 py-1 bg-vibrant-blue/10 text-vibrant-blue font-black rounded-full text-xs uppercase tracking-wider">Phòng Thi Chính Thức</span>
            <h2 className="text-3xl font-black font-display text-slate-800 mt-2">Đề Thi Tin Học IC3 Lớp {grade} 🏆</h2>
            <p className="text-sm font-bold text-slate-400 mt-2">
              Hãy chứng minh năng lực tin học IC3 của em thông qua đề thi đánh giá toàn diện này!
            </p>
          </div>

          <div className="border-y-4 border-slate-100 py-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="block text-2xl font-black text-slate-800 font-display">{config.qCount}</span>
              <span className="text-xs text-slate-400 font-bold">TỔNG CÂU HỎI</span>
            </div>
            <div>
              <span className="block text-2xl font-black text-vibrant-pink font-display">{config.timeMins} phút</span>
              <span className="text-xs text-slate-400 font-bold">THỜI GIAN LÀM</span>
            </div>
            <div>
              <span className="block text-2xl font-black text-vibrant-blue font-display">1000 điểm</span>
              <span className="text-xs text-slate-400 font-bold">THANG ĐIỂM IC3</span>
            </div>
          </div>

          {/* Exam conditions list */}
          <div className="text-left bg-vibrant-bg/50 p-5 rounded-2xl space-y-3 border border-slate-200">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <span className="text-base select-none">📌</span>
              <span>Học sinh KHÔNG nhận phản hồi đúng/sai tức thì trong lúc làm bài.</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <span className="text-base select-none">⏱️</span>
              <span>Đồng hồ sẽ đếm ngược liên tục. Khi hết giờ, bài kiểm tra tự động nộp.</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <span className="text-base select-none">📊</span>
              <span>Điểm số, câu sai và lời giải hiển thị đầy đủ ngay sau khi nộp bài.</span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onBackToDashboard}
              className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-full transition-all cursor-pointer text-sm"
            >
              Quay lại Dashboard
            </button>
            <button
              disabled={loading}
              onClick={handleStartExam}
              className={`flex-1 py-4 text-white font-black rounded-full shadow-[0_4px_0_#2B69C1] hover:translate-y-0.5 transition-all text-sm cursor-pointer flex items-center justify-center gap-2 ${
                loading ? 'bg-vibrant-blue/60 cursor-not-allowed' : 'bg-vibrant-blue hover:bg-vibrant-blue/90'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Đang thiết lập bộ đề thi...
                </>
              ) : (
                'Bắt đầu thi ngay! 🎯'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Exam mode or Scoreboard
  const currentQuestion = questions[currentIndex];
  const selectedOption = userAnswers[currentIndex];
  const isAnswered = selectedOption !== undefined;

  return (
    <div className="p-6 max-w-4xl mx-auto font-sans grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {!isSubmitted ? (
        <>
          {/* Main Question Body (2 columns on LG screens) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header info */}
            <div className="flex justify-between items-center bg-white rounded-[2rem] border-4 border-vibrant-pink p-4 shadow-sm">
              <span className="py-1 px-3 bg-vibrant-pink/10 text-vibrant-pink font-black text-xs rounded-full uppercase tracking-wider">
                Bài thi Lớp {grade}
              </span>
              <div className="flex items-center gap-2 text-vibrant-pink font-mono font-black text-lg">
                <Clock className="w-5 h-5 animate-pulse" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            </div>

            {/* Current Question Display */}
            <div className="bg-white rounded-[2.5rem] border-4 border-vibrant-blue p-8 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                <span>Câu số {currentIndex + 1} của {questions.length}</span>
              </div>
              <h3 className="text-xl font-black font-display text-slate-800 leading-snug">
                {currentQuestion?.text}
              </h3>
            </div>

            {/* Options list */}
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion?.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-4 rounded-2xl font-semibold text-sm flex items-center justify-between transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-orange-50 border-4 border-vibrant-blue text-vibrant-blue shadow-xs'
                        : 'bg-white border-2 border-slate-200 hover:border-vibrant-blue hover:text-vibrant-blue text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-vibrant-blue text-white border-2 border-orange-100 shadow-xs' : 'bg-slate-100'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom mini-nav */}
            <div className="flex justify-between items-center">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className="px-6 py-3 bg-white border-2 border-slate-200 rounded-full text-sm font-black text-slate-500 disabled:opacity-30 cursor-pointer hover:border-vibrant-blue transition-all"
              >
                Trước đó
              </button>

              <button
                disabled={currentIndex === questions.length - 1}
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className="px-6 py-3 bg-white border-2 border-slate-200 rounded-full text-sm font-black text-slate-500 disabled:opacity-30 cursor-pointer hover:border-vibrant-blue transition-all"
              >
                Tiếp tục
              </button>
            </div>
          </div>

          {/* Right sidebar navigation and sheet navigation helper */}
          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] border-4 border-vibrant-blue p-6 shadow-sm flex flex-col justify-between min-h-[420px]">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm mb-4">Mạng lưới câu hỏi</h4>
                
                {/* Visual grid numbers 1 to Total questions */}
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((_, idx) => {
                    const answered = userAnswers[idx] !== undefined;
                    const active = currentIndex === idx;
                    
                    let bgStyle = "bg-slate-100 border text-slate-600 border-slate-200";
                    if (answered) {
                      bgStyle = "bg-vibrant-blue text-white border-vibrant-blue";
                    }
                    if (active) {
                      bgStyle = "bg-white text-vibrant-pink border-4 border-vibrant-pink font-black ring-4 ring-vibrant-pink/10";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-10 h-10 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${bgStyle}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6">
                <button
                  onClick={() => handleSubmitExam(false)}
                  className="w-full py-4 bg-vibrant-green hover:bg-vibrant-green/90 text-white font-black rounded-full shadow-[0_4px_0_#1E8449] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Nộp bài thi tự do 🔔
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* SCOREBOARD RESULTS DISPLAY */
        <div className="col-span-1 lg:col-span-3 space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] border-4 border-vibrant-pink p-8 shadow-sm text-center space-y-6 max-w-2xl mx-auto"
          >
            <div className="inline-block p-4 bg-vibrant-pink/10 rounded-full relative">
              <Trophy className="w-16 h-16 text-vibrant-pink" />
              <div className="absolute top-0 right-0 bg-vibrant-yellow border-2 border-white rounded-full px-2 py-0.5 text-[10px] font-black text-vibrant-navy shadow-xs">
                ĐỀ THI LỚP {grade}
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-black font-display text-vibrant-pink">Bài Thi Hoàn Tất!</h2>
              <p className="text-slate-500 text-sm font-bold mt-1">Hệ thống đã tự động lưu trữ nỗ lực học tập xuất sắc của em.</p>
            </div>

            {/* Complete points card */}
            <div className="max-w-md mx-auto bg-vibrant-bg/50 border-2 border-vibrant-yellow p-6 rounded-[2rem] grid grid-cols-3 gap-4 shadow-sm">
              <div className="text-center">
                <span className="block text-2xl font-black text-slate-800 font-display">
                  {correctCount}/{questions.length}
                </span>
                <span className="text-[10px] text-slate-400 font-black uppercase">Đúng</span>
              </div>
              <div className="text-center border-x-2 border-slate-200">
                <span className="block text-2xl font-black text-vibrant-pink font-display">
                  {scorePercentage}
                </span>
                <span className="text-[10px] text-slate-400 font-black uppercase">Điểm số</span>
              </div>
              <div className="text-center">
                <span className="block text-2xl font-black text-vibrant-blue font-display">
                  {scorePercentage >= 700 ? 'ĐẠT ✅' : 'CHƯA ĐẠT ❌'}
                </span>
                <span className="text-[10px] text-slate-400 font-black uppercase">Trạng thái</span>
              </div>
            </div>

            {/* Achievement star visual depending on score */}
            <div className="flex justify-center gap-2 text-3xl select-none">
              <span className={scorePercentage >= 350 ? "opacity-100" : "opacity-30"}>⭐</span>
              <span className={scorePercentage >= 700 ? "opacity-100 transition-all scale-125 mx-2 font-bold" : "opacity-30"}>⭐</span>
              <span className={scorePercentage >= 900 ? "opacity-100" : "opacity-30"}>⭐</span>
            </div>

            {/* Custom feedback message */}
            <div className="p-4 bg-[#FFEDD5] border-2 border-vibrant-yellow text-[#D97706] text-sm font-bold rounded-[2rem] max-w-md mx-auto">
              🦛 <strong>Wippo nhận xét:</strong> {scorePercentage === 1000 
                ? 'Xuất chúng vô song! Em đạt điểm tuyệt đối 1000/1000 rồi! Đích thực là thiên tài tin học IC3!' 
                : scorePercentage >= 800 
                  ? 'Tuyệt đỉnh học giỏi! Đạt điểm số xuất sắc chuẩn quốc tế! Em tự tin đi thi IC3 thật rồi đó!'
                  : scorePercentage >= 700 
                    ? 'Làm tốt lắm. Em đã vượt qua mốc điểm 700 và ĐẠT chuẩn kỳ thi IC3 quốc tế!'
                    : 'Đừng nản chí nhé con yêu! Ôn luyện thêm các bài tập với Wippo để vượt mốc 700 điểm ở lần thi tới nha! 💪'
              }
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto pt-2">
              <button
                onClick={onBackToDashboard}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-full transition-all cursor-pointer text-sm"
              >
                Về Trang Chủ
              </button>
              <button
                onClick={handleStartExam}
                className="flex-1 py-4 bg-vibrant-blue text-white font-black rounded-full shadow-[0_4px_0_#2B69C1] hover:translate-y-0.5 transition-all cursor-pointer text-sm"
              >
                Làm Đề Thi Khác 🔄
              </button>
            </div>
          </motion.div>

          {/* DETAIL EXAM HISTORY AUDIT TRAIL */}
          <div className="bg-white rounded-[2.5rem] border-4 border-vibrant-blue p-8 shadow-sm">
            <h3 className="text-xl font-black font-display text-slate-800 mb-4 flex items-center gap-2">
              <span className="p-2 py-1 bg-vibrant-blue/15 text-vibrant-blue text-xs rounded-full font-black uppercase">Phân tích</span>
              Chi Tiết Bài Thi Để Học Hỏi
            </h3>

            <div className="space-y-6">
              {questions.map((q, idx) => {
                const userAns = userAnswers[idx];
                const isCorrect = userAns === q.correctIndex;
                return (
                  <div key={idx} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-800 text-sm leading-snug">{q.text}</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-semibold">
                          <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                            isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50/70 border-red-100 text-red-900'
                          }`}>
                            <span className="text-slate-400 uppercase">Lựa chọn của em:</span>
                            {userAns !== undefined ? (
                              <>
                                <span>{q.options[userAns]}</span>
                                {isCorrect ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                              </>
                            ) : (
                              <span className="italic text-slate-400">Không trả lời</span>
                            )}
                          </div>

                          {!isCorrect && (
                            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center gap-2">
                              <span className="text-slate-400 uppercase">Đáp án đúng đúng:</span>
                              <span>{q.options[q.correctIndex]}</span>
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            </div>
                          )}
                        </div>

                        {/* Explanation block */}
                        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-xs text-slate-500">
                          <strong className="text-slate-600 block mb-0.5">💡 Giải thích từ Wippo:</strong>
                          {q.explanation}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Security alert modal for cheating regulation */}
      <AnimatePresence>
        {cheatType && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] max-w-md w-full border-2 border-red-500/30 text-center shadow-2xl relative"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl font-black">
                ⚠️
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">
                Phát Hiện Vi Phạm Quy Chế
              </h3>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                {cheatType === 'fullscreen' && 
                  "Em đã tự ý THOÁT CHẾ ĐỘ TOÀN MÀN HÌNH trong lúc làm bài thi. Để đảm bảo tính trung thực, kết quả làm bài thi này của em đã bị hủy bỏ."}
                {cheatType === 'tab' && 
                  "Em đã CHUYỂN TAB hoặc ẨN TRÌNH DUYỆT trong lúc làm bài thi. Để đảm bảo tính trung thực, kết quả làm bài thi này của em đã bị hủy bỏ."}
                {cheatType === 'blur' && 
                  "Em đã NHẤP CHUỘT RA NGOÀI hoặc CHUYỂN ĐỔI ỨNG DỤNG khác. Để đảm bảo tính trung thực, kết quả làm bài thi này của em đã bị hủy bỏ."}
              </p>
              <button
                onClick={() => setCheatType(null)}
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-500/20 transition-all cursor-pointer text-sm"
              >
                Trở về và thực hiện lại bài thi 🔄
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
