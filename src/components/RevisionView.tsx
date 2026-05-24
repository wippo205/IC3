import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Question } from '../types';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Trophy, 
  BookOpen, 
  Award,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Save,
  Undo2,
  Settings,
  X,
  FileText,
  Check
} from 'lucide-react';

interface RevisionViewProps {
  grade: number;
  token: string;
  onBackToDashboard: () => void;
  onProgressUpdated: () => void;
  userRole?: 'student' | 'teacher';
}

export default function RevisionView({ grade, token, onBackToDashboard, onProgressUpdated, userRole = 'student' }: RevisionViewProps) {
  // Curriculum status
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Mode status 
  const [isTeacherMode, setIsTeacherMode] = useState(userRole === 'teacher');

  useEffect(() => {
    setIsTeacherMode(userRole === 'teacher');
  }, [userRole]);

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'study' | 'edit'>('study');

  // New Lesson form states
  const [showAddLessonForm, setShowAddLessonForm] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonEmoji, setNewLessonEmoji] = useState('💻');

  // Question editing form states
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [showAddQuestionForm, setShowAddQuestionForm] = useState(false);
  
  // Question form draft fields
  const [qDraftText, setQDraftText] = useState('');
  const [qDraftOptionA, setQDraftOptionA] = useState('');
  const [qDraftOptionB, setQDraftOptionB] = useState('');
  const [qDraftOptionC, setQDraftOptionC] = useState('');
  const [qDraftOptionD, setQDraftOptionD] = useState('');
  const [qDraftCorrectIndex, setQDraftCorrectIndex] = useState(0);
  const [qDraftCategory, setQDraftCategory] = useState<'hardware' | 'software' | 'network' | 'safety' | 'skills'>('hardware');
  const [qDraftExplanation, setQDraftExplanation] = useState('');
  const [qDraftType, setQDraftType] = useState<'choice' | 'drag_text' | 'drag_image_text'>('choice');
  const [qDraftLeftA, setQDraftLeftA] = useState('');
  const [qDraftLeftB, setQDraftLeftB] = useState('');
  const [qDraftLeftC, setQDraftLeftC] = useState('');
  const [qDraftLeftD, setQDraftLeftD] = useState('');
  const [qDraftImageA, setQDraftImageA] = useState('');
  const [qDraftImageB, setQDraftImageB] = useState('');
  const [qDraftImageC, setQDraftImageC] = useState('');
  const [qDraftImageD, setQDraftImageD] = useState('');

  // Active quiz playing states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showFinishedCard, setShowFinishedCard] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  // Matching Question interactive states
  const [matchingSlots, setMatchingSlots] = useState<Record<number, string | null>>({ 0: null, 1: null, 2: null, 3: null });
  const [availableCards, setAvailableCards] = useState<string[]>([]);
  const [selectedCardToPlace, setSelectedCardToPlace] = useState<string | null>(null);
  const [isMatchingCorrect, setIsMatchingCorrect] = useState<boolean | null>(null);

  // Custom confirmation modal states
  const [customConfirm, setCustomConfirm] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Custom alert/toast popup notification states
  const [customAlert, setCustomAlert] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setCustomConfirm({
      show: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setCustomConfirm(null);
      }
    });
  };

  const triggerAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setCustomAlert({
      show: true,
      type,
      message
    });
    // Auto clear alert
    setTimeout(() => {
      setCustomAlert(prev => prev && prev.message === message ? null : prev);
    }, 4500);
  };

  // Load lessons catalog on startup or scale change
  const loadLessons = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const resp = await fetch(`/api/lessons?grade=${grade}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setLessons(data.lessons || []);
      } else {
        setErrorMsg(data.error || 'Không thể tải chương trình học của khối lớp này.');
      }
    } catch (err) {
      setErrorMsg('Mất kết nối với máy chủ học tập.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLessons();
    setSelectedLessonId(null);
    setShowFinishedCard(false);
  }, [grade]);

  // Find the active lesson details
  const activeLesson = lessons.find(l => l.id === selectedLessonId);
  const questions = activeLesson?.questions || [];

  // Reset quiz progress whenever lesson changes
  useEffect(() => {
    if (selectedLessonId !== null) {
      setCurrentIndex(0);
      setUserAnswers({});
      setShowFinishedCard(false);
    }
  }, [selectedLessonId]);

  // Initialize matching card elements whenever question or lesson changes
  useEffect(() => {
    const q = questions[currentIndex];
    if (q && (q.type === 'drag_text' || q.type === 'drag_image_text')) {
      const initialOptions = [...q.options];
      const shuffled = initialOptions
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
      
      setAvailableCards(shuffled);
      setMatchingSlots({ 0: null, 1: null, 2: null, 3: null });
      setSelectedCardToPlace(null);
      setIsMatchingCorrect(null);
    }
  }, [currentIndex, selectedLessonId, questions]);

  const handlePlaceCardInSlot = (cardText: string, slotIndex: number) => {
    if (userAnswers[currentIndex] !== undefined) return; 
    
    const currentSlotCard = matchingSlots[slotIndex];
    let newAvailable = [...availableCards].filter(c => c !== cardText);
    if (currentSlotCard) {
      newAvailable.push(currentSlotCard);
    }
    
    const updatedSlots = { ...matchingSlots };
    for (const key in updatedSlots) {
      if (updatedSlots[key] === cardText) {
        updatedSlots[key] = null;
      }
    }
    
    updatedSlots[slotIndex] = cardText;
    setMatchingSlots(updatedSlots);
    setAvailableCards(newAvailable);
    setSelectedCardToPlace(null);
  };

  const handleRemoveCardFromSlot = (slotIndex: number) => {
    if (userAnswers[currentIndex] !== undefined) return;
    const currentSlotCard = matchingSlots[slotIndex];
    if (!currentSlotCard) return;
    
    const updatedSlots = { ...matchingSlots, [slotIndex]: null };
    setMatchingSlots(updatedSlots);
    setAvailableCards([...availableCards, currentSlotCard]);
    setSelectedCardToPlace(null);
  };

  const handleMatchQuestionAnswer = (isCorrect: boolean) => {
    if (!activeLesson) return;
    if (userAnswers[currentIndex] !== undefined) return;

    const ansVal = isCorrect ? 100 : 200;
    const updatedAnswers = { ...userAnswers, [currentIndex]: ansVal };
    setUserAnswers(updatedAnswers);

    const correctCount = Object.keys(updatedAnswers).reduce((acc, qIdx) => {
      const parsedIdx = Number(qIdx);
      const q = questions[parsedIdx];
      if (!q) return acc;
      const val = updatedAnswers[parsedIdx];
      const checkCorrect = (q.type === 'drag_text' || q.type === 'drag_image_text') ? val === 100 : val === q.correctIndex;
      return checkCorrect ? acc + 1 : acc;
    }, 0);

    const answeredCount = Object.keys(updatedAnswers).length;
    saveProgressToServer(
      selectedLessonId!,
      answeredCount,
      correctCount,
      questions.length,
      answeredCount === questions.length
    );
  };

  const handleCheckMatchingResult = () => {
    const q = questions[currentIndex];
    if (!q) return;
    
    const filledCount = Object.values(matchingSlots).filter(v => v !== null).length;
    if (filledCount < 4) {
      triggerAlert('Vui lòng kéo thả hoặc nhấn chọn lắp ráp đầy đủ cả 4 ô trống nhé!', 'info');
      return;
    }
    
    const isCorrect0 = matchingSlots[0] === q.options[0];
    const isCorrect1 = matchingSlots[1] === q.options[1];
    const isCorrect2 = matchingSlots[2] === q.options[2];
    const isCorrect3 = matchingSlots[3] === q.options[3];
    
    const correctPercent = (isCorrect0 ? 25 : 0) + (isCorrect1 ? 25 : 0) + (isCorrect2 ? 25 : 0) + (isCorrect3 ? 25 : 0);
    const fullyCorrect = correctPercent === 100;
    
    setIsMatchingCorrect(fullyCorrect);
    handleMatchQuestionAnswer(fullyCorrect);
  };

  // Handle quiz options selection (for multiple choice)
  const handleSelectOption = (optionIndex: number) => {
    if (!activeLesson) return;
    if (userAnswers[currentIndex] !== undefined) return; // already answered
 
    const updatedAnswers = { ...userAnswers, [currentIndex]: optionIndex };
    setUserAnswers(updatedAnswers);
 
    const correctCount = Object.keys(updatedAnswers).reduce((acc, qIdx) => {
      const parsedIdx = Number(qIdx);
      const q = questions[parsedIdx];
      if (!q) return acc;
      const val = updatedAnswers[parsedIdx];
      const checkCorrect = (q.type === 'drag_text' || q.type === 'drag_image_text') ? val === 100 : val === q.correctIndex;
      return checkCorrect ? acc + 1 : acc;
    }, 0);
 
    const answeredCount = Object.keys(updatedAnswers).length;
    saveProgressToServer(
      selectedLessonId!,
      answeredCount,
      correctCount,
      questions.length,
      answeredCount === questions.length
    );
  };

  const saveProgressToServer = async (
    lessonId: string, 
    completed: number, 
    correct: number, 
    total: number, 
    isCompleted: boolean
  ) => {
    setSavingProgress(true);
    try {
      await fetch('/api/progress/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          grade,
          lessonId,
          completedQuestions: completed,
          correctAnswers: correct,
          totalQuestions: total,
          isCompleted
        })
      });
      onProgressUpdated();
    } catch (err) {
      console.error('Failed to update lesson stats:', err);
    } finally {
      setSavingProgress(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowFinishedCard(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleResetLessonQuiz = () => {
    triggerConfirm(
      'Ôn tập lại từ đầu',
      'Em có chắc muốn ôn tập lại bài này từ đầu không?',
      () => {
        setUserAnswers({});
        setCurrentIndex(0);
        setShowFinishedCard(false);
        saveProgressToServer(selectedLessonId!, 0, 0, questions.length, false);
      }
    );
  };

  // --- TEACHER ACTIONS ---

  // Reset to default configuration
  const handleResetToDefault = async () => {
    triggerConfirm(
      'Cảnh báo đặt lại',
      'Thao tác này sẽ đặt lại toàn bộ bài học & câu hỏi của khối Lớp này về mặc định hệ thống. Mọi nội dung tùy chỉnh sẽ bị xóa. Bạn có chắc chắn không?',
      async () => {
        try {
          const resp = await fetch('/api/lessons/reset', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ grade })
          });
          const data = await resp.json();
          if (resp.ok && data.success) {
            setLessons(data.lessons || []);
            setSelectedLessonId(null);
            triggerAlert('Khôi phục danh sách bài học mặc định thành công!', 'success');
          } else {
            triggerAlert('Đặt lại thất bại: ' + (data.error || '🔑'), 'error');
          }
        } catch (err) {
          triggerAlert('Lỗi kết nối máy chủ khi khôi phục bài học.', 'error');
        }
      }
    );
  };

  // Create a new lesson
  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;

    const newLessonObj = {
      id: `lesson_custom_${Date.now()}`,
      grade,
      title: newLessonTitle.trim(),
      emoji: newLessonEmoji,
      questions: [
        {
          id: `q_${Date.now()}_1`,
          text: 'Thiết bị nào sau đây là thiết bị thu nhận thông tin (đầu vào) của máy tính?',
          options: ['Bàn phím và Chuột', 'Màn hình hiển thị', 'Máy in màu', 'Loa âm thanh'],
          correctIndex: 0,
          explanation: 'Bàn phím và chuột là thiết bị giúp đưa thông tin từ người dùng vào máy tính xử lý.',
          category: 'hardware'
        }
      ],
      isCustom: true
    };

    try {
      const resp = await fetch('/api/lessons/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ grade, lesson: newLessonObj })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setLessons(data.lessons || []);
        setNewLessonTitle('');
        setShowAddLessonForm(false);
        triggerAlert('Đã thêm bài học ôn tập mới thành công!', 'success');
      } else {
        triggerAlert('Không thể thêm bài học: ' + (data.error || ''), 'error');
      }
    } catch {
      triggerAlert('Lỗi hệ thống khi tạo bài ôn tập mới.', 'error');
    }
  };

  // Delete an entire lesson
  const handleDeleteLesson = async (lessonId: string, title: string) => {
    triggerConfirm(
      'Xác nhận xóa bài học',
      `Bạn có chắc chắn muốn XÓA bài học "${title}" cùng toàn bộ danh sách câu hỏi đi kèm không? Hành động này không thể hoàn tác.`,
      async () => {
        try {
          const resp = await fetch('/api/lessons/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ grade, lessonId })
          });
          const data = await resp.json();
          if (resp.ok && data.success) {
            setLessons(data.lessons || []);
            if (selectedLessonId === lessonId) {
              setSelectedLessonId(null);
            }
            triggerAlert('Đã xóa học phần thành công.', 'success');
          } else {
            triggerAlert('Xóa bài học thất bại: ' + (data.error || ''), 'error');
          }
        } catch {
          triggerAlert('Lỗi mạng khi xóa bài học.', 'error');
        }
      }
    );
  };

  // Start question edit draft
  const handleStartEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setShowAddQuestionForm(false);
    setQDraftText(q.text);
    setQDraftOptionA(q.options[0] || '');
    setQDraftOptionB(q.options[1] || '');
    setQDraftOptionC(q.options[2] || '');
    setQDraftOptionD(q.options[3] || '');
    setQDraftCorrectIndex(q.correctIndex);
    setQDraftCategory(q.category || 'hardware');
    setQDraftExplanation(q.explanation);
    setQDraftType(q.type || 'choice');
    setQDraftLeftA(q.leftTerms?.[0] || '');
    setQDraftLeftB(q.leftTerms?.[1] || '');
    setQDraftLeftC(q.leftTerms?.[2] || '');
    setQDraftLeftD(q.leftTerms?.[3] || '');
    setQDraftImageA(q.leftImages?.[0] || '');
    setQDraftImageB(q.leftImages?.[1] || '');
    setQDraftImageC(q.leftImages?.[2] || '');
    setQDraftImageD(q.leftImages?.[3] || '');
  };

  // Start new question draft
  const handleStartAddQuestion = () => {
    setEditingQuestionId(null);
    setShowAddQuestionForm(true);
    setQDraftText('');
    setQDraftOptionA('');
    setQDraftOptionB('');
    setQDraftOptionC('');
    setQDraftOptionD('');
    setQDraftCorrectIndex(0);
    setQDraftCategory('hardware');
    setQDraftExplanation('');
    setQDraftType('choice');
    setQDraftLeftA('');
    setQDraftLeftB('');
    setQDraftLeftC('');
    setQDraftLeftD('');
    setQDraftImageA('');
    setQDraftImageB('');
    setQDraftImageC('');
    setQDraftImageD('');
  };

  // Save question additions/updates
  const handleSaveQuestionDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLesson) return;
    if (!qDraftText.trim() || !qDraftOptionA.trim() || !qDraftOptionB.trim() || !qDraftOptionC.trim() || !qDraftOptionD.trim()) {
      triggerAlert('Vui lòng điền đầy đủ câu hỏi và cả 4 phương án câu trả lời!', 'error');
      return;
    }

    const draftQuestionObj: Question = {
      id: editingQuestionId || `q_custom_${Date.now()}`,
      text: qDraftText.trim(),
      options: [qDraftOptionA.trim(), qDraftOptionB.trim(), qDraftOptionC.trim(), qDraftOptionD.trim()],
      correctIndex: qDraftCorrectIndex,
      explanation: qDraftExplanation.trim() || 'Đây là lý giải kiến thức chuẩn.',
      category: qDraftCategory || 'hardware',
      type: qDraftType,
      leftTerms: qDraftType === 'drag_text' ? [qDraftLeftA.trim(), qDraftLeftB.trim(), qDraftLeftC.trim(), qDraftLeftD.trim()] : undefined,
      leftImages: qDraftType === 'drag_image_text' ? [qDraftImageA.trim(), qDraftImageB.trim(), qDraftImageC.trim(), qDraftImageD.trim()] : undefined
    };

    let updatedQuestionsList = [...questions];
    if (editingQuestionId) {
      updatedQuestionsList = updatedQuestionsList.map(q => q.id === editingQuestionId ? draftQuestionObj : q);
    } else {
      updatedQuestionsList.push(draftQuestionObj);
    }

    const updatedLessonObj = {
      ...activeLesson,
      questions: updatedQuestionsList,
      qCount: updatedQuestionsList.length
    };

    try {
      const resp = await fetch('/api/lessons/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ grade, lesson: updatedLessonObj })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setLessons(data.lessons);
        setEditingQuestionId(null);
        setShowAddQuestionForm(false);
        triggerAlert('Lưu câu hỏi thành công!', 'success');
      } else {
        triggerAlert('Lưu câu hỏi thất bại: ' + (data.error || ''), 'error');
      }
    } catch {
      triggerAlert('Lỗi mạng khi lưu chỉnh sửa câu hỏi.', 'error');
    }
  };

  // Delete a specific question
  const handleDeleteQuestion = async (qId: string) => {
    if (!activeLesson) return;
    if (questions.length <= 1) {
      triggerAlert('Một bài ôn tập cần sở hữu ít nhất 1 câu hỏi để hoạt động. Bạn không thể xóa câu hỏi duy nhất.', 'error');
      return;
    }

    triggerConfirm(
      'Xác nhận xóa câu hỏi',
      'Bạn có thực sự muốn xóa câu hỏi này khỏi học phần ôn tập này không?',
      async () => {
        const updatedQuestionsList = questions.filter(q => q.id !== qId);
        const updatedLessonObj = {
          ...activeLesson,
          questions: updatedQuestionsList,
          qCount: updatedQuestionsList.length
        };

        try {
          const resp = await fetch('/api/lessons/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ grade, lesson: updatedLessonObj })
          });
          const data = await resp.json();
          if (resp.ok && data.success) {
            setLessons(data.lessons);
            triggerAlert('Đã xóa câu hỏi thành công.', 'success');
          } else {
            triggerAlert('Xóa câu hỏi thất bại: ' + (data.error || ''), 'error');
          }
        } catch {
          triggerAlert('Lỗi mạng khi xóa câu hỏi.', 'error');
        }
      }
    );
  };

  // Helper Stats calculation
  const totalCorrect = Object.keys(userAnswers).reduce((acc, qIdx) => {
    const parsedIdx = Number(qIdx);
    return userAnswers[parsedIdx] === questions[parsedIdx]?.correctIndex ? acc + 1 : acc;
  }, 0);

  const completedCount = Object.keys(userAnswers).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <RefreshCw className="w-12 h-12 text-vibrant-blue animate-spin" />
        <p className="text-sm font-bold text-slate-500">Đang đồng bộ chương trình học và câu hỏi...</p>
      </div>
    );
  }

  // --- RENDERING VIEWS ---

  // 1. Topic selector view
  if (selectedLessonId === null) {
    return (
      <div className="p-6 max-w-4xl mx-auto font-sans">
        {/* Top Controls Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onBackToDashboard}
              className="p-3 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl shadow-sm hover:border-orange-200 hover:bg-orange-50 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div>
              <h2 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">Ôn tập IC3 - Lớp {grade} 🦛</h2>
              <p className="text-sm font-semibold text-slate-500">
                {isTeacherMode ? 'Chế độ Giáo viên: Bạn có quyền tùy biến, biên soạn câu hỏi của bài học này!' : 'Hãy chọn bài học dưới đây để bắt đầu ôn luyện nhé!'}
              </p>
            </div>
          </div>


        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-red-600 text-xs font-bold mb-6">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Add Lesson Form Inline */}
        {isTeacherMode && (
          <div className="mb-8">
            {!showAddLessonForm ? (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setShowAddLessonForm(true)}
                className="w-full py-5 bg-dashed border-2 border-slate-300 rounded-[2.5rem] hover:border-amber-500 hover:bg-amber-50/50 text-slate-500 hover:text-amber-800 transition-all font-black text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Thêm Mục Ôn Tập Mới (Giáo viên)
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50/70 border-2 border-amber-200 p-6 rounded-[2.5rem] space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-black text-amber-900 flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Thêm Mục Ôn Tập Mới
                  </h3>
                  <button 
                    onClick={() => setShowAddLessonForm(false)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-full cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddLesson} className="flex flex-col md:flex-row items-end gap-3">
                  <div className="flex-1 space-y-1.5 w-full">
                    <label className="text-xs font-black text-amber-800 block">Tên mục ôn tập/chủ đề mới:</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ví dụ: Ôn tập 1: Cơ bản về mạng máy tính"
                      value={newLessonTitle}
                      onChange={e => setNewLessonTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-slate-800 font-bold focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 w-full md:w-32">
                    <label className="text-xs font-black text-amber-800 block">Biểu tượng:</label>
                    <select 
                      value={newLessonEmoji}
                      onChange={e => setNewLessonEmoji(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-slate-800 font-bold focus:outline-none focus:border-amber-400 appearance-none text-center"
                    >
                      <option value="💻">💻 Máy tính</option>
                      <option value="🌐">🌐 Trực tuyến</option>
                      <option value="🛡️">🛡️ Bảo mật</option>
                      <option value="🔌">🔌 Thiết bị</option>
                      <option value="🏆">🏆 Điểm cao</option>
                      <option value="📝">📝 Bài giảng</option>
                    </select>
                  </div>

                  <button 
                    type="submit"
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl w-full md:w-auto text-sm cursor-pointer shadow-xs"
                  >
                    Tạo mục mới
                  </button>
                </form>
              </motion.div>
            )}
          </div>
        )}

        {/* Lessons List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lessons.map((lesson, idx) => {
            const lessonNum = lesson.lessonNum || (idx + 1);
            
            const getLessonBg = (num: number) => {
              if (num % 5 === 1) return 'bg-blue-50';
              if (num % 5 === 2) return 'bg-amber-50';
              if (num % 5 === 3) return 'bg-red-50';
              if (num % 5 === 4) return 'bg-emerald-50';
              return 'bg-indigo-50';
            };

            return (
              <motion.div
                key={lesson.id}
                whileHover={{ y: -4, scale: 1.01 }}
                className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-slate-100 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group hover:border-vibrant-blue transition-all cursor-pointer"
                onClick={() => {
                  setSelectedLessonId(lesson.id);
                  setViewTab(isTeacherMode ? 'edit' : 'study');
                }}
              >
                {/* Delete Lesson Button (Teacher Only) */}
                {isTeacherMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLesson(lesson.id, lesson.title);
                    }}
                    className="absolute top-2.5 left-2.5 p-2 bg-red-50 hover:bg-red-100 hover:text-red-700 text-slate-400 rounded-xl cursor-pointer z-20 border border-slate-100 transition-all"
                    title="Xóa bài học này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <div className="absolute top-0 right-0 bg-vibrant-blue text-white px-4 py-1.5 rounded-bl-[1.25rem] text-[10px] font-black uppercase tracking-wider">
                  MỤC SỐ {lessonNum}
                </div>

                <div className={`w-20 h-20 ${getLessonBg(lessonNum)} rounded-3xl flex items-center justify-center text-4xl shrink-0 border border-slate-100 shadow-inner`}>
                  {lesson.emoji || '📖'}
                </div>

                <div className="flex-1 text-center md:text-left w-full">
                  <h4 className="text-base font-black text-slate-800 mb-1 leading-snug pr-6">
                    Bài {lessonNum}: {lesson.title}
                  </h4>
                  <p className="text-xs font-bold text-slate-400 mb-3">
                    {lesson.questions?.length || 0} câu hỏi • {lesson.isCustom ? 'Tùy chỉnh (Giáo viên)' : 'Học chuẩn'}
                  </p>
                  
                  <div className="flex gap-2 justify-center md:justify-start">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLessonId(lesson.id);
                        setViewTab('study');
                      }}
                      className="px-5 py-2.5 bg-vibrant-yellow hover:bg-[#FFE066] text-vibrant-navy font-bold rounded-full text-xs shadow-[0_3px_0_#D9B632] hover:translate-y-0.5 transition-all cursor-pointer"
                    >
                      Bắt đầu ôn tập ▶️
                    </button>

                    {isTeacherMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLessonId(lesson.id);
                          setViewTab('edit');
                        }}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-bold rounded-full text-xs border border-slate-200 transition-all cursor-pointer"
                        title="Biên soạn câu hỏi"
                      >
                        <Settings className="w-3.5 h-3.5 inline mr-1" />
                        Sửa câu hỏi
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Custom Confirmation Dialog */}
        <AnimatePresence>
          {customConfirm && customConfirm.show && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 w-full max-w-md text-slate-800"
              >
                <h3 className="text-sm font-black text-rose-600 mb-2 uppercase tracking-wide flex items-center gap-2">
                  ⚠️ Xác nhận hành động
                </h3>
                <p className="text-xs font-semibold text-slate-600 mb-6 leading-relaxed">
                  {customConfirm.message}
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setCustomConfirm(null)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="button"
                    onClick={customConfirm.onConfirm}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Xác nhận Đồng ý
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Custom Alert/Toast popup notification */}
        <AnimatePresence>
          {customAlert && customAlert.show && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white font-bold text-xs border border-white/20 ${
                customAlert.type === 'success' 
                  ? 'bg-emerald-600 shadow-emerald-600/25' 
                  : customAlert.type === 'error'
                    ? 'bg-rose-600 shadow-rose-600/25'
                    : 'bg-indigo-600 shadow-indigo-600/25'
              }`}
            >
              <span>{customAlert.type === 'success' ? '✓' : 'ℹ'}</span>
              <span>{customAlert.message}</span>
              <button 
                type="button" 
                onClick={() => setCustomAlert(null)} 
                className="ml-3 hover:opacity-80 transition-opacity cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Active Lesson Screen - Tabbed split between "Quiz View" & "Teacher Editor View"
  return (
    <div className="p-6 max-w-3xl mx-auto font-sans">
      
      {/* Dynamic Header */}
      <div className="flex flex-col gap-4 bg-white rounded-[2rem] border-4 border-vibrant-blue p-5 mb-6 shadow-sm">
        
        {/* Navigation Action */}
        <div className="flex justify-between items-center w-full">
          <button
            onClick={() => setSelectedLessonId(null)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-vibrant-blue hover:text-white text-slate-700 font-black rounded-full text-xs transition-all cursor-pointer border border-transparent"
          >
            <ArrowLeft className="w-4 h-4" />
            Lớp {grade} list
          </button>

          <div className="text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">BÀI ÔN TẬP</span>
            <span className="text-sm font-black text-vibrant-blue font-display">{activeLesson?.title}</span>
          </div>

          <button
            onClick={handleResetLessonQuiz}
            className="p-2 bg-vibrant-bg hover:bg-vibrant-pink/15 text-vibrant-pink rounded-xl transition-all cursor-pointer hover:rotate-180 duration-500"
            title="Làm mới bài này"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle between Student View and Teacher View */}
        {isTeacherMode && (
          <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full">
            <button
              onClick={() => { setViewTab('study'); setShowAddQuestionForm(false); setEditingQuestionId(null); }}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex justify-center items-center gap-1 cursor-pointer ${
                viewTab === 'study' ? 'bg-white text-vibrant-blue shadow-xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Luyện Tập (Học Sinh)
            </button>
            <button
              onClick={() => { setViewTab('edit'); }}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex justify-center items-center gap-1 cursor-pointer ${
                viewTab === 'edit' ? 'bg-amber-100 text-amber-900 shadow-xs border border-amber-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Tự Chỉnh Câu Hỏi (Giáo Viên)
            </button>
          </div>
        )}
      </div>

      {/* RENDER SPLIT TAB CONTENT */}

      <AnimatePresence mode="wait">
        
        {viewTab === 'study' ? (
          
          /* VIEW 1: STUDY QUIZ PLAYING VIEWS */
          <div key="study-view">
            {!showFinishedCard ? (
              <motion.div
                key="question-box"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Progress indicators wrapper */}
                <div>
                  <div className="flex justify-between items-center text-xs font-black text-slate-500 mb-1.5">
                    <span>Câu {currentIndex + 1} của {questions.length}</span>
                    <span className="text-vibrant-green">Đúng: {totalCorrect}/{completedCount}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-200 shadow-inner">
                    <div 
                      className="h-full bg-vibrant-blue transition-all duration-300"
                      style={{ width: `${(questions.length > 0 ? ((currentIndex + 1) / questions.length) : 0) * 100}%` }}
                    />
                  </div>
                </div>

                {questions.length === 0 ? (
                  <div className="bg-white rounded-[2.5rem] border-4 border-dashed border-slate-300 p-8 text-center text-slate-400 font-bold">
                    Bài học này hiện chưa có câu hỏi nào. Nhấn mục sửa câu hỏi bên trên để thêm nhé!
                  </div>
                ) : (
                  <>
                    {/* Question card */}
                    <div className="bg-white rounded-[2.5rem] border-4 border-vibrant-pink p-8 shadow-sm relative overflow-hidden">
                      <span className="absolute top-4 right-4 text-3xl select-none" role="img" aria-label="decor">💡</span>
                      <span className={`inline-block py-1 px-3 font-black text-xs rounded-full mb-3 uppercase tracking-wider border ${
                        questions[currentIndex]?.type === 'drag_text'
                          ? 'bg-purple-50 text-purple-705 border-purple-200 text-purple-700'
                          : questions[currentIndex]?.type === 'drag_image_text'
                            ? 'bg-pink-50 text-pink-705 border-pink-200 text-pink-700'
                            : 'bg-blue-50 text-blue-705 border-blue-200 text-blue-700'
                      }`}>
                        {questions[currentIndex]?.type === 'drag_text' && '🔀 Ghép nối chữ'}
                        {questions[currentIndex]?.type === 'drag_image_text' && '🖼️ Ghép nối hình - chữ'}
                        {(!questions[currentIndex]?.type || questions[currentIndex]?.type === 'choice') && '🔘 Trắc nghiệm chọn đáp án'}
                      </span>
                      
                      <h3 className="text-lg md:text-xl font-black font-display text-slate-800 leading-snug">
                        {questions[currentIndex]?.text}
                      </h3>
                    </div>

                    {/* Options grid / Drag matching board dynamic render */}
                    {questions[currentIndex]?.type === 'drag_text' || questions[currentIndex]?.type === 'drag_image_text' ? (
                      /* Matching dragging board */
                      <div className="space-y-6">
                        <div className="bg-slate-50 border-2 border-slate-200/60 p-5 rounded-[2.5rem] space-y-4">
                          <span className="text-xs font-black text-slate-500 uppercase block mb-1">
                            Lắp ghép các cặp tương ứng song song:
                          </span>
                          
                          <div className="grid grid-cols-1 gap-4">
                            {[0, 1, 2, 3].map((slotIdx) => {
                              const leftTermVal = questions[currentIndex]?.leftTerms?.[slotIdx] || `Cột Trái ${slotIdx + 1}`;
                              const leftImgVal = questions[currentIndex]?.leftImages?.[slotIdx] || '';
                              const placedCard = matchingSlots[slotIdx];
                              const isAnswered = userAnswers[currentIndex] !== undefined;
                              
                              // Correct option text for this specific slot position
                              const isSelfCorrect = placedCard === questions[currentIndex]?.options[slotIdx];
                              
                              return (
                                <div 
                                  key={slotIdx} 
                                  className="flex flex-col md:flex-row gap-4 items-stretch md:items-center bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs"
                                >
                                  {/* Left Item */}
                                  <div className="w-full md:w-5/12 flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 shrink-0">
                                    <span className="w-6 h-6 rounded-md bg-amber-500 text-white text-[10px] font-black flex items-center justify-center border shrink-0">
                                      {String.fromCharCode(65 + slotIdx)}
                                    </span>
                                    {questions[currentIndex]?.type === 'drag_image_text' ? (
                                      <div className="flex items-center gap-2">
                                        {leftImgVal ? (
                                          <img 
                                            src={leftImgVal} 
                                            alt="" 
                                            className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 select-none shadow-xs" 
                                            referrerPolicy="no-referrer" 
                                          />
                                        ) : (
                                          <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center border text-xs text-slate-400 font-bold shrink-0">Gặp lỗi ảnh</div>
                                        )}
                                        <div className="text-xs font-bold text-slate-600">Hình ảnh gốc</div>
                                      </div>
                                    ) : (
                                      <span className="text-xs font-black text-amber-900 leading-relaxed">{leftTermVal}</span>
                                    )}
                                  </div>
                                  
                                  {/* Arrow indicator */}
                                  <div className="hidden md:flex flex-col items-center justify-center shrink-0">
                                    <span className="text-xl font-bold text-slate-300">⇄</span>
                                  </div>
                                  
                                  {/* Drop Target Card Placement slot */}
                                  <div 
                                    onDragOver={(e) => { if (!isAnswered) e.preventDefault(); }}
                                    onDrop={(e) => { 
                                      if (isAnswered) return;
                                      const cardText = e.dataTransfer.getData("text");
                                      if (cardText) handlePlaceCardInSlot(cardText, slotIdx);
                                    }}
                                    onClick={() => {
                                      if (isAnswered) return;
                                      if (selectedCardToPlace) {
                                        handlePlaceCardInSlot(selectedCardToPlace, slotIdx);
                                      } else if (placedCard) {
                                        handleRemoveCardFromSlot(slotIdx);
                                      }
                                    }}
                                    className={`flex-1 p-3 min-h-[56px] rounded-xl border-2 border-dashed flex items-center justify-between transition-all select-none gap-2 relative ${
                                      placedCard 
                                        ? isAnswered 
                                          ? isSelfCorrect 
                                            ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold' 
                                            : 'bg-rose-50 border-rose-400 text-rose-800 font-bold'
                                          : 'bg-indigo-50/50 border-indigo-400 text-indigo-900 font-bold cursor-pointer hover:bg-slate-50' 
                                        : selectedCardToPlace 
                                          ? 'border-amber-400 bg-amber-50/30 cursor-pointer animate-pulse'
                                          : 'border-slate-250 bg-slate-50 text-slate-400 text-xs italic'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {placedCard ? (
                                        <span className="text-xs font-bold leading-snug">{placedCard}</span>
                                      ) : (
                                        <span className="text-[11px] font-bold text-slate-400">
                                          {selectedCardToPlace ? '👇 Chạm vào đây để xếp ghép' : '⚙️ Lắp ghép nhãn khớp tương đồng...'}
                                        </span>
                                      )}
                                    </div>
                                    
                                    {placedCard && !isAnswered && (
                                      <button 
                                        type="button" 
                                        onClick={(e) => { e.stopPropagation(); handleRemoveCardFromSlot(slotIdx); }}
                                        className="text-slate-400 hover:text-red-500 font-bold text-sm cursor-pointer p-1 shrink-0"
                                        title="Gỡ nhãn này"
                                      >
                                        ✕
                                      </button>
                                    )}
                                    
                                    {isAnswered && (
                                      <span className={`text-[10px] uppercase font-black tracking-wider shrink-0 px-2 py-0.5 rounded-full block ${
                                        isSelfCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                      }`}>
                                        {isSelfCorrect ? '✓ Đúng' : '✗ Sai'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Available source card nodes list */}
                        {userAnswers[currentIndex] === undefined && (
                          <div className="bg-amber-50/40 border-2 border-amber-200/60 p-5 rounded-[2.5rem] space-y-3">
                            <span className="text-xs font-black text-amber-900 uppercase block tracking-wide">
                              Danh sách các nhãn chữ (Chọn 1 nhãn rồi ấn tiếp vào khung rỗng ở trên):
                            </span>
                            
                            <div className="flex flex-wrap gap-2.5">
                              {availableCards.length === 0 ? (
                                <span className="text-xs italic text-slate-400 py-1.5 block">Đã ráp đầy đủ các nhãn! Hãy nhấn Xác Nhận Kết Quả ghép đôi bên dưới.</span>
                              ) : (
                                availableCards.map((card, idx) => {
                                  const isFocused = selectedCardToPlace === card;
                                  return (
                                    <div
                                      key={idx}
                                      draggable={true}
                                      onDragStart={(e) => { e.dataTransfer.setData("text", card); }}
                                      onClick={() => setSelectedCardToPlace(isFocused ? null : card)}
                                      className={`px-3 py-2 rounded-xl border border-slate-200 shadow-sm font-bold text-xs cursor-grab active:cursor-grabbing transition-all select-none ${
                                        isFocused 
                                          ? 'bg-amber-400 border-amber-600 text-slate-900 shadow-md scale-105' 
                                          : 'bg-white hover:border-amber-400 hover:text-amber-800'
                                      }`}
                                    >
                                      ☰ {card}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}

                        {/* Verification matching trigger */}
                        {userAnswers[currentIndex] === undefined && (
                          <div className="pt-2 text-right">
                            <button
                              onClick={handleCheckMatchingResult}
                              className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-full shadow-[0_4px_0_#1E8449] hover:translate-y-0.5 active:translate-y-1 transition-all flex items-center gap-2 justify-center ml-auto cursor-pointer text-xs"
                            >
                              🏁 Xác nhận kết quả ghép đối đầu 🏁
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Traditional Multiple Choice Grid rendering */
                      <div className="grid grid-cols-1 gap-3">
                        {questions[currentIndex]?.options.map((option, idx) => {
                          const selectedOption = userAnswers[currentIndex];
                          const isAnswered = selectedOption !== undefined;
                          const isThisSelected = selectedOption === idx;
                          const isCorrectOption = idx === questions[currentIndex].correctIndex;
                          let optionStyle = "bg-white border-2 border-slate-200 hover:border-vibrant-blue hover:text-vibrant-blue text-slate-800";
                          
                          if (isAnswered) {
                            if (isCorrectOption) {
                              optionStyle = "bg-[#ECFDF5] border-4 border-vibrant-green text-[#065F46] font-extrabold";
                            } else if (isThisSelected) {
                              optionStyle = "bg-[#FEF2F2] border-4 border-vibrant-pink text-[#991B1B] font-extrabold";
                            } else {
                              optionStyle = "bg-slate-50 border-2 border-slate-100 text-slate-400 opacity-60";
                            }
                          }

                          return (
                            <motion.button
                              key={idx}
                              whileHover={!isAnswered ? { x: 4 } : {}}
                              whileTap={!isAnswered ? { scale: 0.99 } : {}}
                              disabled={isAnswered}
                              onClick={() => handleSelectOption(idx)}
                              className={`w-full text-left p-4 rounded-2xl font-semibold text-sm flex items-center justify-between transition-all cursor-pointer ${optionStyle}`}
                            >
                              <div className="flex items-center gap-3 pr-2">
                                <span className={`w-8 h-8 rounded-lg ${isAnswered ? 'bg-[#D1FAE5]' : 'bg-slate-100'} border text-xs font-black flex items-center justify-center shrink-0`}>
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="leading-snug">{option}</span>
                              </div>

                              {isAnswered && isCorrectOption && (
                                <CheckCircle className="w-5 h-5 text-vibrant-green shrink-0" />
                              )}
                              {isAnswered && isThisSelected && !isCorrectOption && (
                                <XCircle className="w-5 h-5 text-vibrant-pink shrink-0" />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    {/* Response explanation box */}
                    <AnimatePresence>
                      {userAnswers[currentIndex] !== undefined && (() => {
                        const q = questions[currentIndex];
                        const ansVal = userAnswers[currentIndex];
                        const isCorrect = (q.type === 'drag_text' || q.type === 'drag_image_text') ? ansVal === 100 : ansVal === q.correctIndex;
                        return (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className={`border-4 p-5 rounded-[2rem] ${
                              isCorrect 
                                ? 'bg-[#ECFDF5] border-vibrant-green/50' 
                                : 'bg-[#FEF2F2] border-vibrant-pink/50'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {isCorrect ? (
                                <>
                                  <span className="text-2xl select-none animate-bounce">🎉</span>
                                  <span className="font-extrabold text-[#065F46] text-sm md:text-base">Tuyệt vời! Câu trả lời hoàn toàn chính xác</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-2xl select-none animate-pulse">😢</span>
                                  <span className="font-extrabold text-[#991B1B] text-sm md:text-base">Chưa đúng rồi! Hãy cùng học nhé</span>
                                </>
                              )}
                            </div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                              📖 Kiến thức giải thích đầy đủ:
                            </div>
                            <p className="text-sm text-slate-700 font-bold leading-relaxed">
                              {questions[currentIndex]?.explanation}
                            </p>
                          </motion.div>
                        );
                      })()}
                    </AnimatePresence>

                    {/* Bottom quiz navigation */}
                    <div className="flex justify-between items-center py-2">
                      <button
                        disabled={currentIndex === 0}
                        onClick={handlePrev}
                        className="flex items-center gap-1.5 px-6 py-3 bg-white border-2 border-slate-200 hover:border-vibrant-blue rounded-full text-sm font-black text-slate-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Quay lại
                      </button>

                      <button
                        disabled={userAnswers[currentIndex] === undefined}
                        onClick={handleNext}
                        className={`flex items-center gap-2 px-6 py-3 bg-vibrant-blue text-white rounded-full text-sm font-black shadow-[0_4px_0_#2B69C1] hover:translate-y-0.5 active:translate-y-1 transition-all cursor-pointer ${
                          userAnswers[currentIndex] === undefined ? 'opacity-50 cursor-not-allowed shadow-none' : ''
                        }`}
                      >
                        {currentIndex === questions.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              /* Completed score view */
              <motion.div
                key="finished-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] border-4 border-vibrant-green p-8 shadow-sm text-center space-y-6"
              >
                <div className="inline-block p-4 bg-emerald-50 rounded-full relative">
                  <Trophy className="w-16 h-16 text-vibrant-green animate-pulse" />
                  <Sparkles className="absolute top-2 right-2 w-5 h-5 text-vibrant-yellow animate-spin" />
                </div>

                <div>
                  <h3 className="text-3xl font-black font-display text-vibrant-green">Hoàn thành bài ôn tập!</h3>
                  <p className="text-slate-500 font-bold text-sm mt-1">Con đã rất nỗ lực học tập hôm nay!</p>
                </div>

                <div className="max-w-xs mx-auto border-2 border-vibrant-yellow bg-vibrant-bg/40 p-5 rounded-[2rem] grid grid-cols-2 gap-4">
                  <div className="text-center font-display">
                    <span className="block text-2xl font-black text-slate-800">
                      {totalCorrect}/{questions.length}
                    </span>
                    <span className="text-[10px] text-slate-400 font-black uppercase">Đúng</span>
                  </div>
                  <div className="text-center font-display">
                    <span className="block text-2xl font-black text-vibrant-blue">
                      {questions.length > 0 ? Math.round((totalCorrect / questions.length) * 100) : 0}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-black uppercase">Tỉ Lệ</span>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 border-2 border-orange-200 text-orange-950 text-sm font-bold rounded-2xl">
                  🌟 {totalCorrect === questions.length 
                    ? 'Tuyệt đỉnh! Con đã đạt trọn vẹn điểm tuyệt đối 100%'
                    : totalCorrect >= questions.length * 0.8 
                      ? 'Tuyệt vời! Con hiểu bài vô cùng chắc chắn đấy.'
                      : 'Làm tốt lắm con ơi! Ôn thêm một chút nữa thôi là điểm mười rồi.'
                  }
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setSelectedLessonId(null)}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-full transition-all cursor-pointer text-sm"
                  >
                    Xem chủ đề khác
                  </button>
                  <button
                    onClick={() => {
                      setUserAnswers({});
                      setCurrentIndex(0);
                      setShowFinishedCard(false);
                    }}
                    className="flex-1 py-4 bg-vibrant-green text-white font-black rounded-full shadow-[0_4px_0_#1E8449] hover:translate-y-0.5 transition-all cursor-pointer text-sm"
                  >
                    Giải lại bài 🔄
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          
          /* VIEW 2: TEACHER EDIT QUESTIONS SYSTEMS PANEL */
          <div key="edit-view" className="space-y-6">
            <div className="flex justify-between items-center bg-amber-50/50 p-4 rounded-2xl border-2 border-amber-200/60">
              <span className="text-xs font-black text-amber-900 uppercase">
                ⚙️ Danh sách biên soạn: {questions.length} Câu Hỏi
              </span>
              
              {!showAddQuestionForm && editingQuestionId === null && (
                <button
                  onClick={handleStartAddQuestion}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl cursor-pointer flex items-center gap-1 shadow-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm câu hỏi mới
                </button>
              )}
            </div>

            {/* Editing Box Form */}
            {(showAddQuestionForm || editingQuestionId !== null) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-50/75 border-4 border-amber-300 p-6 rounded-[2.5rem] space-y-4"
              >
                <div className="flex justify-between items-center border-b-2 border-amber-200 pb-3">
                  <h4 className="text-sm font-black text-amber-900 flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    {editingQuestionId ? 'Sửa Câu Hỏi Đang Chọn' : 'Biên Soạn Câu Hỏi Mới'}
                  </h4>
                  <button
                    onClick={() => { setShowAddQuestionForm(false); setEditingQuestionId(null); }}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-full cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveQuestionDraft} className="space-y-4">
                  
                  {/* 1. Nội dung câu hỏi ôn tập & Dạng câu hỏi */}
                  <div className="bg-white border-2 border-slate-100 p-5 rounded-3xl space-y-4">
                    <span className="text-xs font-black text-amber-900 uppercase block tracking-wider">
                      1. Nội dung câu hỏi và thể loại 📝
                    </span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-800">Dạng câu hỏi ôn luyện:</label>
                        <select
                          value={qDraftType}
                          onChange={e => setQDraftType(e.target.value as any)}
                          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-bold focus:outline-none focus:border-amber-500"
                        >
                          <option value="choice">🔘 Câu hỏi trắc nghiệm (Chọn 1 đáp án)</option>
                          <option value="drag_text">🔀 Kéo thả ghép nối chữ (Trái chữ - Phải chữ)</option>
                          <option value="drag_image_text">🖼️ Kéo thả ghép nối hình ảnh (Trái hình - Phải chữ)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Gợi ý:</label>
                        <div className="text-[11px] font-semibold text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                          {qDraftType === 'choice' && 'Học sinh sẽ được chọn một trong 4 đáp án liệt kê bên dưới.'}
                          {qDraftType === 'drag_text' && 'Lướt kéo thả để ghép khớp cặp chữ cột bên trái với định nghĩa cột bên phải.'}
                          {qDraftType === 'drag_image_text' && 'Học sinh sẽ thực hiện kéo thả các nhãn chữ khớp vào hình ảnh bên trái tương ứng.'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-amber-800 block">Nội dung câu hỏi / Câu lệnh hướng dẫn:</label>
                      <textarea
                        required
                        placeholder="Ví dụ: Em hãy lựa chọn đáp án phù hợp nhất... hoặc Kéo thả ghép nối các thiết bị..."
                        value={qDraftText}
                        onChange={e => setQDraftText(e.target.value)}
                        rows={2}
                        className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold focus:outline-amber-400 focus:outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* 2. các câu đáp án */}
                  <div className="bg-white border-2 border-slate-100 p-5 rounded-3xl space-y-4">
                    <span className="text-xs font-black text-amber-900 uppercase block tracking-wider">
                      2. Các câu đáp án 💡
                    </span>

                    {/* Choice matching inputs */}
                    {qDraftType === 'choice' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 block flex items-center gap-1">
                            <span className="w-5 h-5 bg-sky-50 text-sky-700 text-[10px] font-black rounded-md flex items-center justify-center border">A</span>
                            Phương án A:
                          </label>
                          <input
                            type="text"
                            required
                            value={qDraftOptionA}
                            onChange={e => setQDraftOptionA(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 block flex items-center gap-1">
                            <span className="w-5 h-5 bg-sky-50 text-sky-700 text-[10px] font-black rounded-md flex items-center justify-center border">B</span>
                            Phương án B:
                          </label>
                          <input
                            type="text"
                            required
                            value={qDraftOptionB}
                            onChange={e => setQDraftOptionB(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 block flex items-center gap-1">
                            <span className="w-5 h-5 bg-sky-50 text-sky-700 text-[10px] font-black rounded-md flex items-center justify-center border">C</span>
                            Phương án C:
                          </label>
                          <input
                            type="text"
                            required
                            value={qDraftOptionC}
                            onChange={e => setQDraftOptionC(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 block flex items-center gap-1">
                            <span className="w-5 h-5 bg-sky-50 text-sky-700 text-[10px] font-black rounded-md flex items-center justify-center border">D</span>
                            Phương án D:
                          </label>
                          <input
                            type="text"
                            required
                            value={qDraftOptionD}
                            onChange={e => setQDraftOptionD(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* Drag Text matching inputs */}
                    {qDraftType === 'drag_text' && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 italic mb-2">Thực hiện ghép từ bên trái khớp với định nghĩa bên phải. Hệ thống sẽ tự đảo ngẫu nhiên khi hiển thị.</p>
                        
                        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-dashed border-slate-200">
                          <span className="text-[11px] font-black text-amber-800">Từ Khóa Trái</span>
                          <span className="text-[11px] font-black text-sky-800">Định Nghĩa Phải Tương Ứng</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            placeholder="Ví dụ: RAM"
                            value={qDraftLeftA}
                            onChange={e => setQDraftLeftA(e.target.value)}
                            className="w-full px-3 py-2 bg-amber-50/20 border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Đáp án khớp: Bộ nhớ truy cập ngẫu nhiên"
                            value={qDraftOptionA}
                            onChange={e => setQDraftOptionA(e.target.value)}
                            className="w-full px-3 py-2 bg-sky-50/20 border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            placeholder="Ví dụ: ROM"
                            value={qDraftLeftB}
                            onChange={e => setQDraftLeftB(e.target.value)}
                            className="w-full px-3 py-2 bg-amber-50/20 border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Đáp án khớp: Bộ nhớ chỉ đọc dữ liệu"
                            value={qDraftOptionB}
                            onChange={e => setQDraftOptionB(e.target.value)}
                            className="w-full px-3 py-2 bg-sky-50/20 border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            placeholder="Ví dụ: CPU"
                            value={qDraftLeftC}
                            onChange={e => setQDraftLeftC(e.target.value)}
                            className="w-full px-3 py-2 bg-amber-50/20 border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Đáp án khớp: Bộ điều khiển xử lý trung tâm"
                            value={qDraftOptionC}
                            onChange={e => setQDraftOptionC(e.target.value)}
                            className="w-full px-3 py-2 bg-sky-50/20 border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            placeholder="Ví dụ: Router"
                            value={qDraftLeftD}
                            onChange={e => setQDraftLeftD(e.target.value)}
                            className="w-full px-3 py-2 bg-amber-50/20 border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Đáp án khớp: Thiết bị định tuyến và truyền mạng"
                            value={qDraftOptionD}
                            onChange={e => setQDraftOptionD(e.target.value)}
                            className="w-full px-3 py-2 bg-sky-50/20 border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* Drag Image and Text matching inputs */}
                    {qDraftType === 'drag_image_text' && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 italic mb-2">
                          Thêm liên kết ảnh trái (lấy từ các file tải lên ở Kho lưu trữ) khớp với nhãn chữ tương ứng ở bên phải.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-dashed border-slate-200">
                          <span className="text-[11px] font-black text-amber-800">Liên Kết Hình Ảnh Trái (Link URL)</span>
                          <span className="text-[11px] font-black text-sky-800">Nhãn Khớp Chữ Phải</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            placeholder="Đường dẫn ảnh: e.g. /favicon.png"
                            value={qDraftImageA}
                            onChange={e => setQDraftImageA(e.target.value)}
                            className="w-full px-3 py-2 bg-amber-50/20 border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Nhãn khớp: e.g. Thùng rác máy tính"
                            value={qDraftOptionA}
                            onChange={e => setQDraftOptionA(e.target.value)}
                            className="w-full px-3 py-2 bg-sky-50/20 border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            placeholder="Liên kết hình ảnh B"
                            value={qDraftImageB}
                            onChange={e => setQDraftImageB(e.target.value)}
                            className="w-full px-3 py-2 bg-amber-50/20 border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Nhãn khớp B"
                            value={qDraftOptionB}
                            onChange={e => setQDraftOptionB(e.target.value)}
                            className="w-full px-3 py-2 bg-sky-50/20 border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            placeholder="Liên kết hình ảnh C"
                            value={qDraftImageC}
                            onChange={e => setQDraftImageC(e.target.value)}
                            className="w-full px-3 py-2 bg-amber-50/20 border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Nhãn khớp C"
                            value={qDraftOptionC}
                            onChange={e => setQDraftOptionC(e.target.value)}
                            className="w-full px-3 py-2 bg-sky-50/20 border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            placeholder="Liên kết hình ảnh D"
                            value={qDraftImageD}
                            onChange={e => setQDraftImageD(e.target.value)}
                            className="w-full px-3 py-2 bg-amber-50/20 border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Nhãn khớp D"
                            value={qDraftOptionD}
                            onChange={e => setQDraftOptionD(e.target.value)}
                            className="w-full px-3 py-2 bg-sky-50/20 border border-slate-300 rounded-xl font-semibold text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. đáp đúng */}
                  {qDraftType === 'choice' ? (
                    <div className="bg-white border-2 border-slate-100 p-5 rounded-3xl space-y-2">
                      <span className="text-xs font-black text-amber-900 uppercase block tracking-wider">
                        3. Đáp án đúng chuẩn xác 🌐
                      </span>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-500">Lựa chọn một phương án làm đáp án đúng:</label>
                        <select
                          value={qDraftCorrectIndex}
                          onChange={e => setQDraftCorrectIndex(Number(e.target.value))}
                          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-bold focus:outline-none focus:border-amber-500 text-xs"
                        >
                          <option value={0}>Phương án A</option>
                          <option value={1}>Phương án B</option>
                          <option value={2}>Phương án C</option>
                          <option value={3}>Phương án D</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border-2 border-slate-100 p-5 rounded-3xl">
                      <span className="text-xs font-black text-amber-900 uppercase block tracking-wider mb-1">
                        3. Thiết lập nối khớp đúng ✔️
                      </span>
                      <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 leading-snug">
                        Hệ thống tự động sử dụng cấu hình đối đầu song song: 
                        <br />• <strong>Cột Trái A</strong> sẽ ghép khớp chuẩn với <strong>Cặp Phải A</strong>
                        <br />• <strong>Cột Trái B</strong> khớp chuẩn với <strong>Cặp Phải B</strong>...
                        <br />Khi học sinh tham gia học tập, hệ thống sẽ tự động xáo trộn vị trí ngẫu nhiên để thử thách!
                      </p>
                    </div>
                  )}

                  {/* 4. Lời giải thích */}
                  <div className="bg-white border-2 border-slate-100 p-5 rounded-3xl space-y-2">
                    <span className="text-xs font-black text-amber-900 uppercase block tracking-wider">
                      4. Lời giải thích chi tiết lý do chuẩn 📚
                    </span>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-500 block">Cung cấp lý do để hỗ trợ học sinh học tập:</label>
                      <textarea
                        placeholder="Ví dụ: Định dạng MP4 là một định dạng nén video chuẩn chất lượng cao phổ biến..."
                        value={qDraftExplanation}
                        onChange={e => setQDraftExplanation(e.target.value)}
                        rows={2}
                        className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold focus:outline-amber-400 focus:outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* Form Submission Controls */}
                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowAddQuestionForm(false); setEditingQuestionId(null); }}
                      className="px-5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-500 font-bold text-xs cursor-pointer"
                    >
                      Bỏ qua
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Lưu thông tin
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Simple list view of questions */}
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div 
                  key={q.id}
                  className="bg-white border-2 border-slate-100 p-5 rounded-[2rem] shadow-xs relative hover:border-amber-200 transition-all flex flex-col md:flex-row gap-4 items-start"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 font-black text-xs flex items-center justify-center shrink-0 border border-slate-200 text-slate-700">
                    {idx + 1}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-2">
                      <span className={`py-0.5 px-2.5 border font-bold text-[10px] rounded-full uppercase tracking-wider block ${
                        q.type === 'drag_text' 
                          ? 'bg-purple-50 text-purple-700 border-purple-200' 
                          : q.type === 'drag_image_text'
                            ? 'bg-pink-50 text-pink-700 border-pink-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {q.type === 'drag_text' && '🔀 Ghép nối chữ'}
                        {q.type === 'drag_image_text' && '🖼️ Ghép nối hình - chữ'}
                        {(!q.type || q.type === 'choice') && '🔘 Trắc nghiệm'}
                      </span>
                      {(!q.type || q.type === 'choice') && (
                        <span className="text-[10px] font-black text-emerald-600">
                          ✔️ Đáp án chuẩn: {String.fromCharCode(65 + q.correctIndex)}
                        </span>
                      )}
                    </div>

                    <h5 className="font-extrabold text-sm text-slate-800 leading-snug">{q.text}</h5>

                    {q.type === 'drag_text' && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 items-center text-xs font-semibold py-1 bg-slate-50/50 p-3 rounded-2xl border border-dotted">
                        {[0, 1, 2, 3].map(i => (
                          <div key={i} className="p-1 px-2.5 bg-white border rounded-xl text-[11px] leading-snug">
                            <span className="text-amber-700 font-extrabold text-[10px]">{q.leftTerms?.[i] || `Từ ${i+1}`}</span>
                            <div className="text-slate-500 truncate">{q.options[i]}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'drag_image_text' && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 items-center text-xs font-semibold py-1 bg-slate-50/50 p-3 rounded-2xl border border-dotted">
                        {[0, 1, 2, 3].map(i => (
                          <div key={i} className="p-1 px-2.5 bg-white border rounded-xl text-[11px] leading-snug flex items-center gap-2">
                            {q.leftImages?.[i] ? (
                              <img src={q.leftImages?.[i]} alt="" className="w-8 h-8 rounded-md object-cover border border-slate-100 shrink-0" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-8 h-8 bg-slate-100 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-400">?</div>
                            )}
                            <div className="text-slate-500 truncate">{q.options[i]}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(!q.type || q.type === 'choice') && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 py-1 text-xs font-semibold text-slate-500">
                        {q.options.map((opt, oIdx) => (
                          <div 
                            key={oIdx}
                            className={`p-2 rounded-lg border ${
                              oIdx === q.correctIndex 
                                ? 'bg-emerald-50 text-emerald-800 border-vibrant-green font-bold' 
                                : 'bg-slate-50 text-slate-500 border-slate-100'
                            }`}
                          >
                            <span className="font-black mr-1">{String.fromCharCode(65 + oIdx)}:</span>
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.explanation && (
                      <div className="p-2.5 bg-slate-50 rounded-xl leading-relaxed text-[11px] text-slate-400 font-bold border border-slate-100">
                        <span className="text-amber-700 block text-[10px] uppercase font-black tracking-wider mb-0.5">💡 Lý giải:</span>
                        {q.explanation}
                      </div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex md:flex-col gap-1.5 shrink-0 w-full md:w-auto text-right">
                    <button
                      onClick={() => handleStartEditQuestion(q)}
                      className="flex-1 px-3 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 border border-slate-200 font-black text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="flex-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 hover:text-red-700 text-slate-400 border border-slate-200/50 font-black text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Dialog */}
      <AnimatePresence>
        {customConfirm && customConfirm.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 w-full max-w-md text-slate-800"
            >
              <h3 className="text-sm font-black text-rose-600 mb-2 uppercase tracking-wide flex items-center gap-2">
                ⚠️ Xác nhận hành động
              </h3>
              <p className="text-xs font-semibold text-slate-600 mb-6 leading-relaxed">
                {customConfirm.message}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCustomConfirm(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="button"
                  onClick={customConfirm.onConfirm}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Xác nhận Đồng ý
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Alert/Toast popup notification */}
      <AnimatePresence>
        {customAlert && customAlert.show && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white font-bold text-xs border border-white/20 ${
              customAlert.type === 'success' 
                ? 'bg-emerald-600 shadow-emerald-600/25' 
                : customAlert.type === 'error'
                  ? 'bg-rose-600 shadow-rose-600/25'
                  : 'bg-indigo-600 shadow-indigo-600/25'
            }`}
          >
            <span>{customAlert.type === 'success' ? '✓' : 'ℹ'}</span>
            <span>{customAlert.message}</span>
            <button 
              type="button" 
              onClick={() => setCustomAlert(null)} 
              className="ml-3 hover:opacity-80 transition-opacity cursor-pointer text-sm font-bold"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
