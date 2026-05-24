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
  token: string;
  onBackToDashboard: () => void;
  onExamSaved: () => void;
}

export default function ExamView({ grade, token, onBackToDashboard, onExamSaved }: ExamViewProps) {
  const getExamConfig = (g: number) => {
    switch (g) {
      case 3: return { qCount: 20, timeMins: 20 };
      case 4: return { qCount: 25, timeMins: 25 };
      case 5: return { qCount: 30, timeMins: 30 };
      case 6: return { qCount: 45, timeMins: 45 }; // 45 questions, 45 mins
      case 7: return { qCount: 40, timeMins: 45 }; // 40 questions, 45 mins
      case 8: return { qCount: 40, timeMins: 45 };
      default: return { qCount: 30, timeMins: 30 };
    }
  };

  const config = getExamConfig(grade);
  const [examStarted, setExamStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Track user selected option for each question index
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scorePercentage, setScorePercentage] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [savingRecord, setSavingRecord] = useState(false);

  // Timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load random questions from different lessons to make a comprehensive final exam
  const handleStartExam = () => {
    // Generate static seed for final exam based on exam initiation
    // Combines elements from Lesson 1, 2, 3 to ensure standard distribution
    const count = config.qCount;
    const itemsPart1 = generateQuestionsForLesson(grade, 1, Math.ceil(count / 2));
    const itemsPart2 = generateQuestionsForLesson(grade, 2, Math.floor(count / 2));
    
    // Shuffle and merge
    const merged = [...itemsPart1, ...itemsPart2].slice(0, count);
    
    setQuestions(merged);
    setUserAnswers({});
    setCurrentIndex(0);
    setTimeLeft(config.timeMins * 60);
    setExamStarted(true);
    setIsSubmitted(false);
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

    const percent = Math.round((corrects / questions.length) * 100);
    setCorrectCount(corrects);
    setScorePercentage(percent);
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
        body: JSON.stringify({
          grade,
          score: percent,
          correctCount: corrects,
          totalQuestions: questions.length,
          durationSeconds: (config.timeMins * 60) - timeLeft
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
            <h2 className="text-3xl font-black font-display text-slate-800 mt-2">Bài Kiểm Tra IC3 Lớp {grade} 🏆</h2>
            <p className="text-sm font-bold text-slate-400 mt-2">
              Hãy chứng minh năng lực tin học IC3 của em thông qua bài kiểm tra toàn diện này!
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
              <span className="block text-2xl font-black text-vibrant-blue font-display">100 điểm</span>
              <span className="text-xs text-slate-400 font-bold">THANG ĐIỂM</span>
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
              onClick={handleStartExam}
              className="flex-1 py-4 bg-vibrant-blue hover:bg-vibrant-blue/90 text-white font-black rounded-full shadow-[0_4px_0_#2B69C1] hover:translate-y-0.5 transition-all cursor-pointer text-sm"
            >
              Bắt đầu thi ngay! 🎯
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
                <span className="h-4 w-0.5 bg-slate-200" />
                <span>{currentQuestion?.category}</span>
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
                  {scorePercentage >= 50 ? 'ĐẠT ✅' : 'HỎNG ❌'}
                </span>
                <span className="text-[10px] text-slate-400 font-black uppercase">Trạng thái</span>
              </div>
            </div>

            {/* Achievement star visual depending on score */}
            <div className="flex justify-center gap-2 text-3xl select-none">
              <span className={scorePercentage >= 35 ? "opacity-100" : "opacity-30"}>⭐</span>
              <span className={scorePercentage >= 70 ? "opacity-100 transition-all scale-125 mx-2 font-bold" : "opacity-30"}>⭐</span>
              <span className={scorePercentage >= 90 ? "opacity-100" : "opacity-30"}>⭐</span>
            </div>

            {/* Custom feedback message */}
            <div className="p-4 bg-[#FFEDD5] border-2 border-vibrant-yellow text-[#D97706] text-sm font-bold rounded-[2rem] max-w-md mx-auto">
              🦛 <strong>Wippo nhận xét:</strong> {scorePercentage === 100 
                ? 'Xuất chúng vô song! Em là thiên tài tin học IC3 chính hiệu!' 
                : scorePercentage >= 80 
                  ? 'Tuyệt đỉnh học giỏi! Chứng nhận IC3 đang rất gần em rồi!'
                  : scorePercentage >= 50 
                    ? 'Làm tốt lắm! Em đã vượt qua kỳ thi để đạt xếp hạng tốt!'
                    : 'Đừng buồn nhé! Hãy cùng ôn luyện lại các bài tập để giành điểm cao hơn ở lần sau nhé! Wippo tin em làm được! 💪'
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

    </div>
  );
}
