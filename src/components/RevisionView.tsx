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
  initialLessonId?: string | null;
  homeworkId?: string | null;
  isHomeworkMode?: boolean;
  onExitHomework?: () => void;
}

export default function RevisionView({ 
  grade, 
  token, 
  onBackToDashboard, 
  onProgressUpdated, 
  userRole = 'student', 
  initialLessonId = null,
  homeworkId = null,
  isHomeworkMode = false,
  onExitHomework
}: RevisionViewProps) {
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
  const [cheatType, setCheatType] = useState<'fullscreen' | 'tab' | 'blur' | null>(null);

  const handleExitLesson = () => {
    setSelectedLessonId(null);
    onExitHomework?.();
  };

  // Active playing questions: shuffled version for students
  const [playQuestions, setPlayQuestions] = useState<Question[]>([]);

  // New Lesson form states
  const [showAddLessonForm, setShowAddLessonForm] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonEmoji, setNewLessonEmoji] = useState('💻');
  const [newLessonStartIdx, setNewLessonStartIdx] = useState(1);
  const [newLessonEndIdx, setNewLessonEndIdx] = useState(10);

  // Edit Lesson range states
  const [editLessonTitle, setEditLessonTitle] = useState('');
  const [editLessonEmoji, setEditLessonEmoji] = useState('💻');
  const [editLessonStartIdx, setEditLessonStartIdx] = useState(1);
  const [editLessonEndIdx, setEditLessonEndIdx] = useState(10);

  // Bank questions state fetched on mount
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);

  // Filter questions that belong to the current grade (or have no grade which are general/base questions)
  const gradeQuestions = bankQuestions.filter(q => !q.grade || Number(q.grade) === Number(grade));

  useEffect(() => {
    if (selectedLessonId) {
      const active = lessons.find(l => l.id === selectedLessonId);
      if (active) {
        setEditLessonTitle(active.title || '');
        setEditLessonEmoji(active.emoji || '📖');
        setEditLessonStartIdx(active.startIdx !== undefined ? active.startIdx : 1);
        setEditLessonEndIdx(active.endIdx !== undefined ? active.endIdx : Math.min(gradeQuestions.length, 10));
      }
    }
  }, [selectedLessonId, lessons, gradeQuestions.length]);

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
  const [qDraftExplanation, setQDraftExplanation] = useState('');
  const [qDraftType, setQDraftType] = useState<'choice' | 'drag_text' | 'drag_image_text' | 'table_match'>('choice');
  const [qDraftLeftA, setQDraftLeftA] = useState('');
  const [qDraftLeftB, setQDraftLeftB] = useState('');
  const [qDraftLeftC, setQDraftLeftC] = useState('');
  const [qDraftLeftD, setQDraftLeftD] = useState('');
  const [qDraftImageA, setQDraftImageA] = useState('');
  const [qDraftImageB, setQDraftImageB] = useState('');
  const [qDraftImageC, setQDraftImageC] = useState('');
  const [qDraftImageD, setQDraftImageD] = useState('');

  // Customizable table matching question draft states
  const [qDraftTableHeaders, setQDraftTableHeaders] = useState<string[]>(['Nhập', 'Xuất']);
  const [qDraftTableRows, setQDraftTableRows] = useState<string[]>(['Bàn phím', 'Scanner', 'Màn hình']);
  const [qDraftTableCorrectAnswers, setQDraftTableCorrectAnswers] = useState<number[]>([0, 0, 1]);
  const [qDraftTableFontSize, setQDraftTableFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [qDraftTableWidth, setQDraftTableWidth] = useState<'compact' | 'normal' | 'wide'>('normal');

  // Track user selections for table matching cells per question
  const [tableAnswers, setTableAnswers] = useState<Record<number, Record<number, number>>>({});

  // Active quiz playing states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [selectedMultiOptions, setSelectedMultiOptions] = useState<number[]>([]);
  const [isMultiConfirmed, setIsMultiConfirmed] = useState<boolean>(false);
  const [showFinishedCard, setShowFinishedCard] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [testMatchingAnswers, setTestMatchingAnswers] = useState<Record<number, Record<number, string | null>>>( {});
  const [testAvailableCards, setTestAvailableCards] = useState<Record<number, string[]>>({});

  useEffect(() => {
    setSelectedMultiOptions([]);
    setIsMultiConfirmed(false);
  }, [currentIndex, selectedLessonId]);

  useEffect(() => {
    if (isTeacherMode) return;

    if (selectedLessonId !== null && viewTab === 'study' && !showFinishedCard) {
      // 1. Automatically request fullscreen
      const enterFullscreen = async () => {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
        } catch (err) {
          console.warn("Fullscreen request rejected or not supported:", err);
        }
      };
      enterFullscreen();

      // 2. Setup anti-cheating state listeners
      const handleFullscreenChange = () => {
        // If they exited fullscreen during revision, reset and show alert
        if (selectedLessonId !== null && viewTab === 'study' && !showFinishedCard && !document.fullscreenElement) {
          setCheatType('fullscreen');
          setSelectedLessonId(null);
        }
      };

      const handleVisibilityChange = () => {
        if (selectedLessonId !== null && viewTab === 'study' && !showFinishedCard && document.hidden) {
          setCheatType('tab');
          setSelectedLessonId(null);
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        }
      };

      const handleWindowBlur = () => {
        if (selectedLessonId !== null && viewTab === 'study' && !showFinishedCard) {
          setCheatType('blur');
          setSelectedLessonId(null);
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
  }, [selectedLessonId, viewTab, showFinishedCard, isTeacherMode]);

  // Matching Question interactive states
  const [matchingSlots, setMatchingSlots] = useState<Record<number, string | null>>({ 0: null, 1: null, 2: null, 3: null });
  const [availableCards, setAvailableCards] = useState<string[]>([]);
  const [selectedCardToPlace, setSelectedCardToPlace] = useState<string | null>(null);
  const [isMatchingCorrect, setIsMatchingCorrect] = useState<boolean | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [isDraggingOverAvailable, setIsDraggingOverAvailable] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragYRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (!isDragging) return;

    let animationFrameId: number;
    const tick = () => {
      if (dragYRef.current !== null) {
        const y = dragYRef.current;
        const threshold = 150; // pixels to top/bottom viewport where auto-scroll triggers
        const maxSpeed = 16;
        const height = window.innerHeight;

        if (y < threshold) {
          const ratio = (threshold - y) / threshold;
          const speed = -Math.ceil(ratio * maxSpeed);
          window.scrollBy(0, speed);
        } else if (y > height - threshold) {
          const ratio = (y - (height - threshold)) / threshold;
          const speed = Math.ceil(ratio * maxSpeed);
          window.scrollBy(0, speed);
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    const handleDragOver = (e: DragEvent) => {
      dragYRef.current = e.clientY;
    };

    window.addEventListener('dragover', handleDragOver);
    animationFrameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDragging]);

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

      // Pre-fetch central question bank details
      try {
        const qResp = await fetch('/api/questions', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const qData = await qResp.json();
        if (qResp.ok && qData.success) {
          setBankQuestions(qData.questions || []);
        }
      } catch (err) {
        console.error('Failed to pre-fetch bank questions:', err);
      }
    } catch (err) {
      setErrorMsg('Mất kết nối với máy chủ học tập.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadLessons();
      if (initialLessonId) {
        setSelectedLessonId(initialLessonId);
      } else {
        setSelectedLessonId(null);
      }
    };
    init();
    setShowFinishedCard(false);
  }, [grade, initialLessonId]);

  // Save edited lesson range and titles configurations
  const handleSaveLessonConfig = async () => {
    if (!editLessonTitle.trim()) {
      triggerAlert('Vui lòng nhập tên bài học!', 'error');
      return;
    }
    const start = Math.max(1, Number(editLessonStartIdx) || 1);
    const end = Math.min(gradeQuestions.length || 100, Math.max(start, Number(editLessonEndIdx) || start));
    const rangeQs = gradeQuestions.slice(start - 1, end);

    const updatedObj = {
      id: selectedLessonId,
      grade,
      title: editLessonTitle.trim(),
      emoji: editLessonEmoji,
      startIdx: start,
      endIdx: end,
      questions: rangeQs,
      qCount: rangeQs.length,
      isCustom: true
    };

    try {
      const resp = await fetch('/api/lessons/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ grade, lesson: updatedObj })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setLessons(data.lessons || []);
        triggerAlert('Đã lưu cấu hình bài học thành công!', 'success');
        setViewTab('study'); // switch back smoothly
      } else {
        triggerAlert('Không thể lưu cấu hình: ' + (data.error || ''), 'error');
      }
    } catch (err) {
      triggerAlert('Lỗi kết nối máy chủ.', 'error');
    }
  };

  // Find the active lesson details
  const activeLesson = lessons.find(l => l.id === selectedLessonId);
  const questions = activeLesson?.questions || [];
  const quizQuestions = playQuestions.length > 0 ? playQuestions : questions;

  // Set and shuffle questions for play mode on start
  const handleShuffleQuestions = () => {
    if (activeLesson) {
      const original = activeLesson.questions || [];
      const shuffled = [...original]
        .map(q => ({ q, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ q }) => {
          const optionsCopy = q.options ? [...q.options] : [];
          
          if (!q.type || q.type === 'choice') {
            const correctOpt = optionsCopy[q.correctIndex] || '';
            const shufOpts = [...optionsCopy]
              .map(o => ({ o, sort: Math.random() }))
              .sort((a, b) => a.sort - b.sort)
              .map(({ o }) => o);
            const newCorrectIdx = shufOpts.indexOf(correctOpt);
            return {
              ...q,
              options: shufOpts,
              correctIndex: newCorrectIdx >= 0 ? newCorrectIdx : 0
            };
          } else if (q.type === 'multi_choice') {
            const correctOpts = (q.correctIndices || []).map(index => optionsCopy[index] || '').filter(Boolean);
            const shufOpts = [...optionsCopy]
              .map(o => ({ o, sort: Math.random() }))
              .sort((a, b) => a.sort - b.sort)
              .map(({ o }) => o);
            const newCorrectIndices = correctOpts
              .map(opt => shufOpts.indexOf(opt))
              .filter(index => index >= 0)
              .sort((a, b) => a - b);
            return {
              ...q,
              options: shufOpts,
              correctIndices: newCorrectIndices,
              correctIndex: newCorrectIndices[0] || 0
            };
          } else if (q.type === 'drag_text' || q.type === 'drag_image_text') {
            const pairings = optionsCopy.map((option, i) => ({
              leftTerm: q.leftTerms?.[i] || '',
              leftImage: q.leftImages?.[i] || '',
              option: option
            }));
            const shufPairings = [...pairings]
              .map(p => ({ p, sort: Math.random() }))
              .sort((a, b) => a.sort - b.sort)
              .map(({ p }) => p);
            return {
              ...q,
              options: shufPairings.map(p => p.option),
              leftTerms: q.leftTerms ? shufPairings.map(p => p.leftTerm) : undefined,
              leftImages: q.leftImages ? shufPairings.map(p => p.leftImage) : undefined
            };
          } else if (q.type === 'table_match') {
            const rowsCopy = q.rows ? [...q.rows] : [];
            const correctCopy = q.correctAnswers ? [...q.correctAnswers] : [];
            const pairings = rowsCopy.map((row, i) => ({
              row,
              correctAnswer: correctCopy[i] !== undefined ? correctCopy[i] : 0
            }));
            const shufPairings = [...pairings]
              .map(p => ({ p, sort: Math.random() }))
              .sort((a, b) => a.sort - b.sort)
              .map(({ p }) => p);
            return {
              ...q,
              rows: shufPairings.map(p => p.row),
              correctAnswers: shufPairings.map(p => p.correctAnswer)
            };
          }
          return q;
        });
      setPlayQuestions(shuffled);
    }
  };

  useEffect(() => {
    if (selectedLessonId !== null && activeLesson) {
      handleShuffleQuestions();
    } else {
      setPlayQuestions([]);
    }
  }, [selectedLessonId, activeLesson?.id]);

  // Reset quiz progress whenever lesson changes
  useEffect(() => {
    if (selectedLessonId !== null) {
      setCurrentIndex(0);
      setUserAnswers({});
      setShowFinishedCard(false);
      setTestMatchingAnswers({});
      setTestAvailableCards({});
      setTableAnswers({});
    }
  }, [selectedLessonId]);

  // Initialize matching card elements whenever question or lesson changes
  useEffect(() => {
    const q = quizQuestions[currentIndex];
    if (q && (q.type === 'drag_text' || q.type === 'drag_image_text')) {
      if (isTestMode && testMatchingAnswers[currentIndex]) {
        setMatchingSlots(testMatchingAnswers[currentIndex]);
        setAvailableCards(testAvailableCards[currentIndex] || []);
        setIsMatchingCorrect(null);
        setSelectedCardToPlace(null);
      } else {
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
    }
  }, [currentIndex, selectedLessonId, quizQuestions, isTestMode]);

  // Synchronize matching answers and available cards to cache and silently evaluate answered status during test mode
  useEffect(() => {
    if (isTestMode && selectedLessonId !== null) {
      const q = quizQuestions[currentIndex];
      if (q && (q.type === 'drag_text' || q.type === 'drag_image_text')) {
        setTestMatchingAnswers(prev => ({ ...prev, [currentIndex]: matchingSlots }));
        setTestAvailableCards(prev => ({ ...prev, [currentIndex]: availableCards }));

        // Silently evaluate correctness
        const isCorrect0 = matchingSlots[0] === q.options[0];
        const isCorrect1 = matchingSlots[1] === q.options[1];
        const isCorrect2 = matchingSlots[2] === q.options[2];
        const isCorrect3 = matchingSlots[3] === q.options[3];
        const fullyCorrect = isCorrect0 && isCorrect1 && isCorrect2 && isCorrect3;

        const filledCount = Object.values(matchingSlots).filter(v => v !== null).length;
        if (filledCount === 4) {
          setUserAnswers(prev => ({ ...prev, [currentIndex]: fullyCorrect ? 100 : 200 }));
        } else {
          setUserAnswers(prev => {
            const next = { ...prev };
            delete next[currentIndex];
            return next;
          });
        }
      }
    }
  }, [matchingSlots, availableCards, isTestMode, currentIndex, selectedLessonId]);

  const handlePlaceCardInSlot = (cardText: string, slotIndex: number) => {
    if (userAnswers[currentIndex] !== undefined && !isTestMode) return; 
    
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
    if (userAnswers[currentIndex] !== undefined && !isTestMode) return;
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
      const q = quizQuestions[parsedIdx];
      if (!q) return acc;
      const val = updatedAnswers[parsedIdx];
      const checkCorrect = (q.type === 'drag_text' || q.type === 'drag_image_text' || q.type === 'table_match' || q.type === 'multi_choice' || q.type === 'image_choice') ? val === 100 : val === q.correctIndex;
      return checkCorrect ? acc + 1 : acc;
    }, 0);

    const answeredCount = Object.keys(updatedAnswers).length;
    if (!isTestMode) {
      saveProgressToServer(
        selectedLessonId!,
        answeredCount,
        correctCount,
        quizQuestions.length,
        answeredCount === quizQuestions.length
      );
    }
  };

  const handleCheckMatchingResult = () => {
    const q = quizQuestions[currentIndex];
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

  const handleSelectTableCell = (rowIdx: number, colIdx: number) => {
    const q = quizQuestions[currentIndex];
    const isAnswered = isTestMode ? false : userAnswers[currentIndex] !== undefined;
    if (isAnswered) return;

    const selections = tableAnswers[currentIndex] || {};
    const nextSelections = { ...selections, [rowIdx]: colIdx };
    setTableAnswers(prev => ({
      ...prev,
      [currentIndex]: nextSelections
    }));

    // In test mode, evaluate silently if all rows are answered
    if (isTestMode && q && q.type === 'table_match') {
      const rowsCount = q.rows?.length || 0;
      const filledCount = Object.keys(nextSelections).length;
      if (filledCount === rowsCount) {
        let isAllCorrect = true;
        for (let i = 0; i < rowsCount; i++) {
          if (nextSelections[i] !== q.correctAnswers?.[i]) {
            isAllCorrect = false;
            break;
          }
        }
        setUserAnswers(prev => ({ ...prev, [currentIndex]: isAllCorrect ? 100 : 200 }));
      } else {
        setUserAnswers(prev => {
          const next = { ...prev };
          delete next[currentIndex];
          return next;
        });
      }
    }
  };

  const handleCheckTableMatchResult = () => {
    const q = quizQuestions[currentIndex];
    if (!q || q.type !== 'table_match') return;

    const selections = tableAnswers[currentIndex] || {};
    const rowsCount = q.rows?.length || 0;

    if (Object.keys(selections).length < rowsCount) {
      triggerAlert('Vui lòng chọn đầy đủ đáp án cho tất cả các hàng trong bảng!', 'info');
      return;
    }

    let isAllCorrect = true;
    for (let i = 0; i < rowsCount; i++) {
      if (selections[i] !== q.correctAnswers?.[i]) {
        isAllCorrect = false;
        break;
      }
    }

    const correctAnsVal = isAllCorrect ? 100 : 200;
    const updatedAnswers = { ...userAnswers, [currentIndex]: correctAnsVal };
    setUserAnswers(updatedAnswers);

    // Sync progress to server for active study mode
    const correctCount = Object.keys(updatedAnswers).reduce((acc, qIdx) => {
      const parsedIdx = Number(qIdx);
      const q = quizQuestions[parsedIdx];
      if (!q) return acc;
      const val = updatedAnswers[parsedIdx];
      const checkCorrect = (q.type === 'drag_text' || q.type === 'drag_image_text' || q.type === 'table_match' || q.type === 'multi_choice' || q.type === 'image_choice') ? val === 100 : val === q.correctIndex;
      return checkCorrect ? acc + 1 : acc;
    }, 0);

    const answeredCount = Object.keys(updatedAnswers).length;
    saveProgressToServer(
      selectedLessonId!,
      answeredCount,
      correctCount,
      quizQuestions.length,
      answeredCount === quizQuestions.length
    );

    triggerAlert(isAllCorrect ? 'Tuyệt vời! Toàn bộ bảng đã khớp chính xác! 🎉' : 'Rất tiếc, vẫn còn một số hàng chưa chính xác. Hãy tiếp tục cố gắng nhé!', isAllCorrect ? 'success' : 'error');
  };

  const areArraysEqual = (arr1: number[], arr2: number[]) => {
    if (arr1.length !== arr2.length) return false;
    const s1 = [...arr1].sort((a, b) => a - b);
    const s2 = [...arr2].sort((a, b) => a - b);
    return s1.every((val, index) => val === s2[index]);
  };

  const handleToggleMultiOption = (optionIndex: number) => {
    if (!activeLesson) return;
    if (!isTestMode && isMultiConfirmed) return; // already confirmed in study mode

    let nextSelected: number[] = [];
    if (selectedMultiOptions.includes(optionIndex)) {
      nextSelected = selectedMultiOptions.filter(idx => idx !== optionIndex);
    } else {
      nextSelected = [...selectedMultiOptions, optionIndex].sort((a, b) => a - b);
    }
    setSelectedMultiOptions(nextSelected);

    if (isTestMode) {
      const q = quizQuestions[currentIndex];
      if (q) {
        if (nextSelected.length > 0) {
          const isCorrect = areArraysEqual(nextSelected, q.correctIndices || []);
          setUserAnswers(prev => ({ ...prev, [currentIndex]: isCorrect ? 100 : 200 }));
        } else {
          setUserAnswers(prev => {
            const copy = { ...prev };
            delete copy[currentIndex];
            return copy;
          });
        }
      }
    }
  };

  const handleConfirmMultiChoice = () => {
    const q = quizQuestions[currentIndex];
    if (!q || selectedMultiOptions.length === 0) return;

    const isCorrect = areArraysEqual(selectedMultiOptions, q.correctIndices || []);
    const updatedAnswers = { ...userAnswers, [currentIndex]: isCorrect ? 100 : 200 };
    setUserAnswers(updatedAnswers);
    setIsMultiConfirmed(true);

    const correctCount = Object.keys(updatedAnswers).reduce((acc, qIdx) => {
      const parsedIdx = Number(qIdx);
      const curQ = quizQuestions[parsedIdx];
      if (!curQ) return acc;
      const val = updatedAnswers[parsedIdx];
      const checkCorrect = (curQ.type === 'drag_text' || curQ.type === 'drag_image_text' || curQ.type === 'table_match' || curQ.type === 'multi_choice' || curQ.type === 'image_choice') ? val === 100 : val === curQ.correctIndex;
      return checkCorrect ? acc + 1 : acc;
    }, 0);

    const answeredCount = Object.keys(updatedAnswers).length;
    saveProgressToServer(
      selectedLessonId!,
      answeredCount,
      correctCount,
      quizQuestions.length,
      answeredCount === quizQuestions.length
    );

    triggerAlert(
      isCorrect 
        ? 'Tuyệt vời! Em đã chọn chính xác hoàn toàn các đáp án đúng! 🎉' 
        : 'Rất tiếc, câu trả lời chưa chính xác. Hãy ôn lại kiến thức và tiếp tục cố gắng nhé!', 
      isCorrect ? 'success' : 'error'
    );
  };

  // Handle quiz options selection (for multiple choice)
  const handleSelectOption = (optionIndex: number) => {
    if (!activeLesson) return;
    if (userAnswers[currentIndex] !== undefined && !isTestMode) return; // already answered
 
    const updatedAnswers = { ...userAnswers, [currentIndex]: optionIndex };
    setUserAnswers(updatedAnswers);
 
    if (!isTestMode) {
      const correctCount = Object.keys(updatedAnswers).reduce((acc, qIdx) => {
        const parsedIdx = Number(qIdx);
        const q = quizQuestions[parsedIdx];
        if (!q) return acc;
        const val = updatedAnswers[parsedIdx];
        const checkCorrect = (q.type === 'drag_text' || q.type === 'drag_image_text' || q.type === 'table_match' || q.type === 'multi_choice' || q.type === 'image_choice') ? val === 100 : val === q.correctIndex;
        return checkCorrect ? acc + 1 : acc;
      }, 0);
   
      const answeredCount = Object.keys(updatedAnswers).length;
      saveProgressToServer(
        selectedLessonId!,
        answeredCount,
        correctCount,
        quizQuestions.length,
        answeredCount === quizQuestions.length
      );
    }
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
      const endpoint = isHomeworkMode && homeworkId ? '/api/homework-progress/update' : '/api/progress/update';
      const payload = isHomeworkMode && homeworkId ? {
        grade,
        lessonId,
        homeworkId,
        completedQuestions: completed,
        correctAnswers: correct,
        totalQuestions: total,
        isCompleted
      } : {
        grade,
        lessonId,
        completedQuestions: completed,
        correctAnswers: correct,
        totalQuestions: total,
        isCompleted
      };

      await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      onProgressUpdated();
    } catch (err) {
      console.error('Failed to update lesson stats:', err);
    } finally {
      setSavingProgress(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      if (isTestMode) {
        // Compute correct count
        const correctCount = totalCorrect;
        const scoreVal = quizQuestions.length > 0 ? Math.round((correctCount / quizQuestions.length) * 100) : 0;

        // Fetch to save exam
        fetch('/api/exams/save', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            grade,
            score: scoreVal,
            correctCount: correctCount,
            totalQuestions: quizQuestions.length,
            durationSeconds: 0,
            isRevisionTest: true,
            lessonId: selectedLessonId,
            lessonTitle: activeLesson?.title || 'Bài học ôn tập'
          })
        })
        .then(res => res.json())
        .then(() => {
          onProgressUpdated(); // Reload both progress and exams!
        })
        .catch(err => {
          console.error('Lỗi khi lưu kết quả bài kiểm tra ôn tập:', err);
        });
      }
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
        handleShuffleQuestions();
        setUserAnswers({});
        setCurrentIndex(0);
        setShowFinishedCard(false);
        saveProgressToServer(selectedLessonId!, 0, 0, quizQuestions.length, false);
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

    const start = Math.max(1, Number(newLessonStartIdx) || 1);
    const end = Math.min(gradeQuestions.length || 10, Math.max(start, Number(newLessonEndIdx) || start));
    const selectedRangeQs = gradeQuestions.slice(start - 1, end);

    const newLessonObj = {
      id: `lesson_custom_${Date.now()}`,
      grade,
      title: newLessonTitle.trim(),
      emoji: newLessonEmoji,
      startIdx: start,
      endIdx: end,
      questions: selectedRangeQs,
      qCount: selectedRangeQs.length,
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
        setNewLessonStartIdx(1);
        setNewLessonEndIdx(Math.min(gradeQuestions.length, 10));
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

    // Initialize customizable table matching values
    if (q.type === 'table_match') {
      setQDraftTableHeaders(q.headers || ['Nhập', 'Xuất']);
      setQDraftTableRows(q.rows || ['Bàn phím', 'Scanner', 'Màn hình']);
      setQDraftTableCorrectAnswers(q.correctAnswers || [0, 0, 1]);
      setQDraftTableFontSize(q.tableFontSize || 'md');
      setQDraftTableWidth(q.tableWidth || 'normal');
    } else {
      setQDraftTableHeaders(['Nhập', 'Xuất']);
      setQDraftTableRows(['Bàn phím', 'Scanner', 'Màn hình']);
      setQDraftTableCorrectAnswers([0, 0, 1]);
      setQDraftTableFontSize('md');
      setQDraftTableWidth('normal');
    }
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
    setQDraftTableHeaders(['Nhập', 'Xuất']);
    setQDraftTableRows(['Bàn phím', 'Scanner', 'Màn hình']);
    setQDraftTableCorrectAnswers([0, 0, 1]);
    setQDraftTableFontSize('md');
    setQDraftTableWidth('normal');
  };

  // Save question additions/updates
  const handleSaveQuestionDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLesson) return;

    if (!qDraftText.trim()) {
      triggerAlert('Vui lòng điền nội dung câu hỏi!', 'error');
      return;
    }

    if (qDraftType !== 'table_match') {
      if (!qDraftOptionA.trim() || !qDraftOptionB.trim() || !qDraftOptionC.trim() || !qDraftOptionD.trim()) {
        triggerAlert('Vui lòng điền đầy đủ cả 4 phương án câu trả lời!', 'error');
        return;
      }
    } else {
      if (qDraftTableHeaders.length === 0 || qDraftTableRows.length === 0) {
        triggerAlert('Bảng tùy chỉnh phải có ít nhất 1 hàng và 1 cột!', 'error');
        return;
      }
      if (qDraftTableHeaders.some(h => !h.trim()) || qDraftTableRows.some(r => !r.trim())) {
        triggerAlert('Vui lòng nhập đầy đủ nội dung chữ cho tất cả các hàng và cột!', 'error');
        return;
      }
    }

    const draftQuestionObj: Question = {
      id: editingQuestionId || `q_custom_${Date.now()}`,
      text: qDraftText.trim(),
      options: qDraftType === 'table_match' ? [] : [qDraftOptionA.trim(), qDraftOptionB.trim(), qDraftOptionC.trim(), qDraftOptionD.trim()],
      correctIndex: qDraftType === 'table_match' ? 0 : qDraftCorrectIndex,
      explanation: qDraftExplanation.trim() || 'Đây là lý giải kiến thức chuẩn.',
      type: qDraftType,
      leftTerms: qDraftType === 'drag_text' ? [qDraftLeftA.trim(), qDraftLeftB.trim(), qDraftLeftC.trim(), qDraftLeftD.trim()] : undefined,
      leftImages: qDraftType === 'drag_image_text' ? [qDraftImageA.trim(), qDraftImageB.trim(), qDraftImageC.trim(), qDraftImageD.trim()] : undefined,
      headers: qDraftType === 'table_match' ? qDraftTableHeaders.map(h => h.trim()) : undefined,
      rows: qDraftType === 'table_match' ? qDraftTableRows.map(r => r.trim()) : undefined,
      correctAnswers: qDraftType === 'table_match' ? qDraftTableCorrectAnswers : undefined,
      tableFontSize: qDraftType === 'table_match' ? qDraftTableFontSize : undefined,
      tableWidth: qDraftType === 'table_match' ? qDraftTableWidth : undefined,
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
    const q = quizQuestions[parsedIdx];
    if (!q) return acc;
    const ansVal = userAnswers[parsedIdx];
    const isCorrect = (q.type === 'drag_text' || q.type === 'drag_image_text' || q.type === 'table_match' || q.type === 'multi_choice') ? ansVal === 100 : ansVal === q.correctIndex;
    return isCorrect ? acc + 1 : acc;
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

                <form onSubmit={handleAddLesson} className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <label className="text-xs font-black text-amber-800 block">Tên mục ôn tập/chủ đề mới:</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ví dụ: Ôn tập 1: Cơ bản về mạng máy tính"
                        value={newLessonTitle}
                        onChange={e => setNewLessonTitle(e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-slate-800 font-bold focus:border-amber-400 focus:outline-none placeholder-slate-300"
                      />
                    </div>

                    <div className="space-y-1.5 w-full md:w-36">
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
                  </div>

                  <div className="flex flex-col md:flex-row items-end justify-between gap-4 pt-2 bg-amber-50 rounded-2xl p-4 border border-amber-200/40">
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-amber-800 block">Lấy từ Câu số:</label>
                        <input 
                          type="number" 
                          required
                          min={1}
                          max={gradeQuestions.length || 100}
                          value={newLessonStartIdx}
                          onChange={e => setNewLessonStartIdx(Math.max(1, Number(e.target.value)))}
                          className="w-24 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-2xl text-slate-800 font-bold focus:border-amber-400 focus:outline-none text-center"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-amber-800 block">Đến Câu số:</label>
                        <input 
                          type="number" 
                          required
                          min={newLessonStartIdx}
                          max={gradeQuestions.length || 100}
                          value={newLessonEndIdx}
                          onChange={e => setNewLessonEndIdx(Math.max(newLessonStartIdx, Number(e.target.value)))}
                          className="w-24 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-2xl text-slate-800 font-bold focus:border-amber-400 focus:outline-none text-center"
                        />
                      </div>

                      <div className="text-slate-500 text-xs font-bold pt-2 md:pt-6 pl-1 h-full flex items-center">
                        💡 Thư mục ngân hàng hiện có{" "}<strong>{gradeQuestions.length} câu hỏi</strong>.
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl w-full md:w-auto text-xs cursor-pointer shadow-xs whitespace-nowrap self-stretch md:self-auto flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Tạo đề mới
                    </button>
                  </div>
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
                  
                  <div className="flex gap-2 justify-center md:justify-start flex-wrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsTestMode(false);
                        setSelectedLessonId(lesson.id);
                        setViewTab('study');
                      }}
                      className="px-5 py-2.5 bg-vibrant-yellow hover:bg-[#FFE066] text-vibrant-navy font-bold rounded-full text-xs shadow-[0_3px_0_#D9B632] hover:translate-y-0.5 transition-all cursor-pointer"
                    >
                      Bắt đầu ôn tập ▶️
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsTestMode(true);
                        setSelectedLessonId(lesson.id);
                        setViewTab('study');
                      }}
                      className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-full text-xs shadow-[0_3px_0_#0284C7] hover:translate-y-0.5 transition-all cursor-pointer"
                    >
                      Kiểm tra 📝
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

  // Inner helper function to render full question editor form
  const renderQuestionEditorForm = (isNew: boolean) => {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-amber-50/75 border-4 border-amber-300 p-6 rounded-[2.5rem] space-y-4 text-left"
      >
        <div className="flex justify-between items-center border-b-2 border-amber-200 pb-3">
          <h4 className="text-sm font-black text-amber-900 flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            {!isNew ? 'Sửa Câu Hỏi Đang Chọn' : 'Biên Soạn Câu Hỏi Mới'}
          </h4>
          <button
            type="button"
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
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-bold focus:outline-none focus:border-amber-500 text-xs"
                >
                  <option value="choice">🔘 Câu hỏi trắc nghiệm</option>
                  <option value="drag_text">🔀 Kéo thả ghép nối chữ</option>
                  <option value="drag_image_text">🖼️ Kéo thả ghép nối hình ảnh</option>
                  <option value="table_match">📊 Ghép nối bảng</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Gợi ý:</label>
                <div className="text-[11px] font-semibold text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                  {qDraftType === 'choice' && 'Học sinh sẽ được chọn một trong 4 đáp án liệt kê bên dưới.'}
                  {qDraftType === 'drag_text' && 'Lướt kéo thả để ghép khớp cặp chữ cột bên trái với định nghĩa cột bên phải.'}
                  {qDraftType === 'drag_image_text' && 'Học sinh sẽ thực hiện kéo thả các nhãn chữ khớp vào hình ảnh bên trái tương ứng.'}
                  {qDraftType === 'table_match' && 'Bảng thông tin hỏi đáp đa chiều: Bạn có thể tự do thêm bớt cột, hàng, tùy chỉnh chữ hay kích cỡ to nhỏ tùy ý. Học sinh sẽ nhấn chọn vào các ô tương ứng.'}
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
                </div>
              </div>
            )}

            {/* Table matching custom interactive builder */}
            {qDraftType === 'table_match' && (
              <div className="space-y-4 pt-4 border-t border-dashed border-slate-150">
                <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-[11px] text-indigo-700 font-bold leading-relaxed">
                  💡 Bạn đang biên soạn câu hỏi <strong className="text-indigo-900 font-extrabold text-[12px]">Ghép nối bảng (Matrix Question)</strong>. Thiết lập các Cột (đáp án phân loại) và các Hàng (thông tin cần phân loại), sau đó tick chọn đáp án đúng cho từng hàng trực tiếp trong lưới mô phỏng phía dưới!
                </div>

                {/* Left & Right Size Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700">Cỡ chữ trong bảng:</label>
                    <select
                      value={qDraftTableFontSize}
                      onChange={e => setQDraftTableFontSize(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="sm">🔎 Nhỏ (sm) - Thích hợp khi nhiều chữ</option>
                      <option value="md">👁️ Vừa (md) - Chuẩn mặc định</option>
                      <option value="lg">🔍 Lớn (lg) - Dành cho bảng ngắn, dễ đọc</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700">Độ rộng toàn bảng:</label>
                    <select
                      value={qDraftTableWidth}
                      onChange={e => setQDraftTableWidth(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="compact">📱 Gọn gàng (Compact)</option>
                      <option value="normal">💻 Bình thường (Normal)</option>
                      <option value="wide">🖥️ Rộng rãi (Wide) - Tràn chiều rộng</option>
                    </select>
                  </div>
                </div>

                {/* Column Headers Section */}
                <div className="p-4 bg-amber-50/20 rounded-2xl border border-dashed border-amber-200 space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs font-black text-amber-900 uppercase tracking-wider block">
                      Danh sách cột ({qDraftTableHeaders.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setQDraftTableHeaders(prev => [...prev, `Cột mới ${prev.length + 1}`]);
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] uppercase rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <span>➕ Thêm cột</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {qDraftTableHeaders.map((header, colIdx) => (
                      <div key={colIdx} className="flex items-center gap-2 p-1.5 px-2 bg-white border border-slate-250/80 rounded-xl shadow-xs">
                        <span className="text-[10px] font-black text-amber-700 shrink-0 bg-amber-50 w-5 h-5 rounded-md flex items-center justify-center border">
                          C{colIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={header}
                          required
                          placeholder={`Cột ${colIdx + 1}`}
                          onChange={e => {
                            const val = e.target.value;
                            setQDraftTableHeaders(prev => prev.map((h, idx) => idx === colIdx ? val : h));
                          }}
                          className="w-full bg-transparent font-bold text-xs text-slate-800 focus:outline-none focus:border-b-2 focus:border-amber-400"
                        />
                        {qDraftTableHeaders.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (qDraftTableHeaders.length <= 1) return;
                              setQDraftTableHeaders(prev => prev.filter((_, idx) => idx !== colIdx));
                              setQDraftTableCorrectAnswers(prev => prev.map(correctCol => {
                                if (correctCol === colIdx) return 0;
                                if (correctCol > colIdx) return correctCol - 1;
                                return correctCol;
                              }));
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rows & Correct Matches Realtime Simulator Table */}
                <div className="p-4 bg-sky-50/20 rounded-2xl border border-dashed border-sky-200 space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs font-black text-sky-950 uppercase tracking-wider block">
                      Danh sách hàng & Chọn đáp án chuẩn ({qDraftTableRows.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setQDraftTableRows(prev => [...prev, `Hàng mới ${prev.length + 1}`]);
                        setQDraftTableCorrectAnswers(prev => [...prev, 0]);
                      }}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-[10px] uppercase rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <span>➕ Thêm hàng</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                    <table className="w-full text-xs font-bold text-slate-700 border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <th className="p-2 text-left text-slate-500 w-[50%]">Hàng hỏi / Nhãn mô tả</th>
                          {qDraftTableHeaders.map((header, colIdx) => (
                            <th key={colIdx} className="p-2 text-center text-slate-500 text-[10px] uppercase tracking-wider border-l border-slate-100 min-w-[70px]">
                              {header || `Cột ${colIdx + 1}`}
                            </th>
                          ))}
                          <th className="p-2 text-center text-slate-500 w-12 border-l border-slate-100">Xóa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {qDraftTableRows.map((rowText, rowIdx) => (
                          <tr key={rowIdx} className="border-b last:border-0 hover:bg-slate-50/40">
                            {/* Row label edit input */}
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-sky-700 bg-sky-50 w-5 h-5 rounded-md flex items-center justify-center border shrink-0">
                                  H{rowIdx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={rowText}
                                  required
                                  placeholder={`Hàng ${rowIdx + 1}`}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setQDraftTableRows(prev => prev.map((r, idx) => idx === rowIdx ? val : r));
                                  }}
                                  className="w-full bg-slate-50/20 p-1 px-2 focus:bg-white border border-transparent hover:border-slate-200 focus:border-sky-400 rounded-lg text-xs font-extrabold focus:outline-none"
                                />
                              </div>
                            </td>

                            {/* Column matching radio options */}
                            {qDraftTableHeaders.map((_, colIdx) => {
                              const isChecked = qDraftTableCorrectAnswers[rowIdx] === colIdx;
                              return (
                                <td key={colIdx} className="p-2 text-center border-l border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQDraftTableCorrectAnswers(prev => prev.map((ans, idx) => idx === rowIdx ? colIdx : ans));
                                    }}
                                    className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-slate-250 hover:border-sky-400 hover:bg-sky-50 cursor-pointer transition-all mx-auto focus:outline-none"
                                  >
                                    <div className={`w-3.5 h-3.5 rounded-full transition-all flex items-center justify-center ${
                                      isChecked ? 'bg-sky-600 scale-110 shadow-xs' : 'bg-transparent border border-slate-300'
                                    }`}>
                                      {isChecked && <div className="w-1 h-1 bg-white rounded-full" />}
                                    </div>
                                  </button>
                                </td>
                              );
                            })}

                            {/* Delete row button */}
                            <td className="p-2 text-center border-l border-slate-100">
                              {qDraftTableRows.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (qDraftTableRows.length <= 1) return;
                                    setQDraftTableRows(prev => prev.filter((_, idx) => idx !== rowIdx));
                                    setQDraftTableCorrectAnswers(prev => prev.filter((_, idx) => idx !== rowIdx));
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-slate-300 text-[10px]">—</span>
                              )}
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
    );
  };

  // Active Lesson Screen - Tabbed split between "Quiz View" & "Teacher Editor View"
  return (
    <div className="p-6 max-w-3xl mx-auto font-sans">
      
      {/* Dynamic Header */}
      <div className="flex flex-col gap-4 bg-white rounded-[2rem] border-4 border-vibrant-blue p-5 mb-6 shadow-sm">
        
        {/* Navigation Action */}
        <div className="flex justify-between items-center w-full">
          <button
            onClick={handleExitLesson}
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
                    <span>Câu {currentIndex + 1} của {quizQuestions.length}</span>
                    {isTestMode ? (
                      <span className="text-vibrant-blue">Đã làm: {completedCount}/{quizQuestions.length} câu</span>
                    ) : (
                      <span className="text-vibrant-green">Đúng: {totalCorrect}/{completedCount}</span>
                    )}
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-200 shadow-inner">
                    <div 
                      className="h-full bg-vibrant-blue transition-all duration-300"
                      style={{ width: `${(quizQuestions.length > 0 ? ((currentIndex + 1) / quizQuestions.length) : 0) * 100}%` }}
                    />
                  </div>
                </div>

                {quizQuestions.length === 0 ? (
                  <div className="bg-white rounded-[2.5rem] border-4 border-dashed border-slate-300 p-8 text-center text-slate-400 font-bold">
                    Bài học này hiện chưa có câu hỏi nào. Nhấn mục sửa câu hỏi bên trên để thêm nhé!
                  </div>
                ) : (
                  <>
                    {/* Question card */}
                    <div className="bg-white rounded-[2.5rem] border-4 border-vibrant-pink p-8 shadow-sm relative overflow-hidden">
                      <span className="absolute top-4 right-4 text-3xl select-none" role="img" aria-label="decor">💡</span>
                      <span className={`inline-block py-1 px-3 font-black text-xs rounded-full mb-3 uppercase tracking-wider border ${
                        quizQuestions[currentIndex]?.type === 'drag_text'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : quizQuestions[currentIndex]?.type === 'drag_image_text'
                            ? 'bg-pink-50 text-pink-700 border-pink-200'
                            : quizQuestions[currentIndex]?.type === 'table_match'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : quizQuestions[currentIndex]?.type === 'image_choice'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {quizQuestions[currentIndex]?.type === 'drag_text' && '🔀 Ghép nối chữ'}
                        {quizQuestions[currentIndex]?.type === 'drag_image_text' && '🖼️ Ghép nối hình - chữ'}
                        {quizQuestions[currentIndex]?.type === 'table_match' && '📊 Ghép nối bảng'}
                        {quizQuestions[currentIndex]?.type === 'multi_choice' && '☑️ Trắc nghiệm chọn nhiều đáp án'}
                        {quizQuestions[currentIndex]?.type === 'image_choice' && '🖼️ Trắc nghiệm chọn hình ảnh'}
                        {(!quizQuestions[currentIndex]?.type || quizQuestions[currentIndex]?.type === 'choice') && '🔘 Trắc nghiệm chọn đáp án'}
                      </span>
                      
                      <h3 className="text-lg md:text-xl font-black font-display text-slate-800 leading-snug">
                        {quizQuestions[currentIndex]?.text}
                      </h3>
                    </div>

                    {/* Options grid / Drag matching board / Table matrix render */}
                    {quizQuestions[currentIndex]?.type === 'table_match' ? (
                      /* Table matching matrix rendering */
                      (() => {
                        const q = quizQuestions[currentIndex];
                        if (!q) return null;
                        
                        const selections = tableAnswers[currentIndex] || {};
                        const isAnswered = isTestMode ? false : userAnswers[currentIndex] !== undefined;
                        const rowsCount = q.rows?.length || 0;
                        
                        // Select styling values based on options
                        const sizeFontHeaders = q.tableFontSize === 'sm' ? 'text-[11px]' : q.tableFontSize === 'lg' ? 'text-[14px]' : 'text-xs md:text-sm';
                        const sizeFontCells = q.tableFontSize === 'sm' ? 'text-[10px]' : q.tableFontSize === 'lg' ? 'text-[13px]' : 'text-xs';
                        
                        const widthClass = q.tableWidth === 'compact' ? 'max-w-md mx-auto' : q.tableWidth === 'wide' ? 'w-full' : 'max-w-2xl mx-auto';
                        
                        return (
                          <div className={`space-y-6 ${widthClass}`}>
                            <div className="bg-white border-4 border-slate-100 p-4 md:p-6 rounded-[2rem] shadow-md overflow-hidden">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 text-center">
                                📊 Click / Tap vào các ô để khớp thông tin tương ứng:
                              </span>
                              
                              <div className="overflow-x-auto rounded-2xl border border-slate-150 shadow-xs">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                      <th className={`p-3 font-extrabold text-slate-600 ${sizeFontHeaders} w-[40%] bg-slate-50`}>
                                        Danh mục hỏi
                                      </th>
                                      {(q.headers || []).map((header, colIdx) => (
                                        <th 
                                          key={colIdx} 
                                          className={`p-3 font-black text-slate-800 border-l border-slate-100/80 text-center uppercase tracking-wider ${sizeFontHeaders}`}
                                        >
                                          {header}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(q.rows || []).map((rowText, rowIdx) => {
                                      // Check correctness status for row in current play session
                                      const rowChosenCol = selections[rowIdx];
                                      const rowCorrectCol = q.correctAnswers?.[rowIdx];
                                      const isRowCorrect = rowChosenCol === rowCorrectCol;
                                      
                                      return (
                                        <tr key={rowIdx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/20">
                                          {/* Row label */}
                                          <td className={`p-3 font-extrabold text-slate-700 leading-snug ${sizeFontCells} bg-slate-50/25`}>
                                            <div className="flex items-center gap-2">
                                              <span className="w-5 h-5 rounded-md bg-sky-50 text-sky-700 text-[10px] font-black flex items-center justify-center border">
                                                {rowIdx + 1}
                                              </span>
                                              <span>{rowText}</span>
                                              {isAnswered && (
                                                <span className={`text-[10px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded-md ${
                                                  isRowCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                }`}>
                                                  {isRowCorrect ? '✓' : '✗'}
                                                </span>
                                              )}
                                            </div>
                                          </td>

                                          {/* Options checkboxes */}
                                          {(q.headers || []).map((_, colIdx) => {
                                            const isSelected = rowChosenCol === colIdx;
                                            const isCorrectCell = rowCorrectCol === colIdx;
                                            
                                            let cellBg = "bg-white hover:bg-slate-50 cursor-pointer";
                                            let radioDotStyle = "border-slate-300";
                                            let showIcon: 'check' | 'cross' | 'check-dashed' | null = null;
                                            
                                            if (isAnswered) {
                                              if (isSelected && isCorrectCell) {
                                                cellBg = "bg-emerald-50 text-emerald-950 border-l-2 border-r-2 border-emerald-400 font-bold";
                                                radioDotStyle = "bg-emerald-500 border-emerald-500 scale-110";
                                                showIcon = 'check';
                                              } else if (isSelected && !isCorrectCell) {
                                                cellBg = "bg-rose-50 text-rose-950 border-l-2 border-r-2 border-rose-450 font-bold";
                                                radioDotStyle = "bg-rose-500 border-rose-500 scale-110";
                                                showIcon = 'cross';
                                              } else if (!isSelected && isCorrectCell) {
                                                cellBg = "bg-emerald-50/20 text-emerald-700 border border-dashed border-emerald-300";
                                                radioDotStyle = "border-dashed border-emerald-400";
                                                showIcon = 'check-dashed';
                                              } else {
                                                cellBg = "bg-slate-50/30 opacity-40 cursor-not-allowed";
                                                radioDotStyle = "border-slate-200/50";
                                              }
                                            } else {
                                              if (isSelected) {
                                                cellBg = "bg-indigo-50 border border-indigo-400 text-indigo-950 font-black shadow-inner scale-[1.01]";
                                                radioDotStyle = "bg-indigo-600 border-indigo-600 scale-110 shadow-xs";
                                              }
                                            }
                                            
                                            return (
                                              <td 
                                                key={colIdx} 
                                                onClick={() => !isAnswered && handleSelectTableCell(rowIdx, colIdx)}
                                                className={`p-3 text-center border-l border-slate-100 transition-all select-none ${cellBg}`}
                                              >
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                  <div className={`w-5 h-5 rounded-full border transition-all flex items-center justify-center ${radioDotStyle}`}>
                                                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                    {!isSelected && isAnswered && isCorrectCell && <div className="w-1 h-1 bg-emerald-500 rounded-full" />}
                                                  </div>
                                                  
                                                  {showIcon === 'check' && (
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase">Đúng</span>
                                                  )}
                                                  {showIcon === 'cross' && (
                                                    <span className="text-[10px] font-black text-rose-600">Sai</span>
                                                  )}
                                                  {showIcon === 'check-dashed' && (
                                                    <span className="text-[9px] font-bold text-emerald-600/80 uppercase">Đúng</span>
                                                  )}
                                                </div>
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Verification Button for learn mode */}
                            {!isTestMode && userAnswers[currentIndex] === undefined && (
                              <div className="pt-2 text-right">
                                <button
                                  onClick={handleCheckTableMatchResult}
                                  className="px-8 py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-black rounded-full shadow-[0_4px_0_#0D5B94] hover:translate-y-0.5 active:translate-y-1 transition-all flex items-center gap-2 justify-center ml-auto cursor-pointer text-xs"
                                >
                                  🏁 Xác nhận kết quả bảng ghép 🏁
                                </button>
                              </div>
                            )}

                            {/* Completed Status In Test Mode */}
                            {isTestMode && Object.keys(selections).length === rowsCount && (
                              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-[11px] text-emerald-800 font-bold text-center">
                                ✓ Đã ghi nhận đầy đủ tất cả đáp án trong bảng! Bạn có thể bấm để tiếp tục bài thi.
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : quizQuestions[currentIndex]?.type === 'drag_text' || quizQuestions[currentIndex]?.type === 'drag_image_text' ? (
                      /* Matching dragging board */
                      <div className="space-y-6">
                        <div className="bg-slate-50 border-2 border-slate-200/60 p-5 rounded-[2.5rem] space-y-4">
                          <span className="text-xs font-black text-slate-500 uppercase block mb-1">
                            Lắp ghép các cặp tương ứng song song:
                          </span>
                          
                          <div className="grid grid-cols-1 gap-4">
                            {[0, 1, 2, 3].map((slotIdx) => {
                              const leftTermVal = quizQuestions[currentIndex]?.leftTerms?.[slotIdx] || `Cột Trái ${slotIdx + 1}`;
                              const leftImgVal = quizQuestions[currentIndex]?.leftImages?.[slotIdx] || '';
                              const placedCard = matchingSlots[slotIdx];
                              const isAnswered = isTestMode ? false : userAnswers[currentIndex] !== undefined;
                              
                              // Correct option text for this specific slot position
                              const isSelfCorrect = placedCard === quizQuestions[currentIndex]?.options[slotIdx];
                              
                              return (
                                <div 
                                  key={slotIdx} 
                                  className="flex flex-row gap-2 sm:gap-4 items-center justify-between bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs w-full"
                                >
                                  {/* Left Item */}
                                  <div className="w-[45%] flex items-center gap-2 sm:gap-4 bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-100 shrink-0 select-none">
                                    <span className="w-5 h-5 sm:w-7 h-7 rounded-full bg-amber-500 text-white text-[10px] sm:text-xs font-black flex items-center justify-center border shrink-0">
                                      {String.fromCharCode(65 + slotIdx)}
                                    </span>
                                    {quizQuestions[currentIndex]?.type === 'drag_image_text' ? (
                                      <div className="flex items-center justify-center bg-white p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-150 shrink-0">
                                        {leftImgVal ? (
                                          <img 
                                            src={leftImgVal} 
                                            alt="" 
                                            className="w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg object-contain select-none transition-all shadow-xs" 
                                            referrerPolicy="no-referrer" 
                                          />
                                        ) : (
                                          <div className="w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-slate-100 rounded-lg flex items-center justify-center border text-[9px] sm:text-[11px] text-slate-400 font-bold shrink-0">Không có ảnh</div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[11px] sm:text-xs font-black text-amber-900 leading-relaxed truncate">{leftTermVal}</span>
                                    )}
                                  </div>
                                  
                                  {/* Arrow indicator */}
                                  <div className="flex flex-col items-center justify-center shrink-0">
                                    <span className="text-sm sm:text-lg font-black text-slate-300">➔</span>
                                  </div>
                                  
                                  {/* Drop Target Card Placement slot */}
                                  <div 
                                    onDragOver={(e) => { 
                                      if (!isAnswered) {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = "move";
                                        if (dragOverSlot !== slotIdx) {
                                          setDragOverSlot(slotIdx);
                                        }
                                      }
                                    }}
                                    onDragLeave={() => {
                                      if (dragOverSlot === slotIdx) {
                                        setDragOverSlot(null);
                                      }
                                    }}
                                    onDrop={(e) => { 
                                      if (isAnswered) return;
                                      setDragOverSlot(null);
                                      const cardText = e.dataTransfer.getData("text") || e.dataTransfer.getData("text/plain");
                                      if (cardText) {
                                        handlePlaceCardInSlot(cardText, slotIdx);
                                      }
                                    }}
                                    onClick={() => {
                                      if (isAnswered) return;
                                      if (selectedCardToPlace) {
                                        handlePlaceCardInSlot(selectedCardToPlace, slotIdx);
                                      } else if (placedCard) {
                                        handleRemoveCardFromSlot(slotIdx);
                                      }
                                    }}
                                    className={`flex-1 p-2 sm:p-3 min-h-[44px] sm:min-h-[56px] rounded-xl border-2 border-dashed flex items-center justify-between transition-all select-none gap-1.5 sm:gap-2 relative ${
                                      placedCard 
                                        ? isAnswered 
                                          ? isSelfCorrect 
                                            ? 'bg-emerald-50 border-emerald-400 text-emerald-850 font-bold' 
                                            : 'bg-rose-50 border-rose-400 text-rose-850 font-bold'
                                          : 'bg-indigo-50/50 border-indigo-400 text-indigo-900 font-bold cursor-grab active:cursor-grabbing hover:bg-slate-50' 
                                        : dragOverSlot === slotIdx
                                          ? 'border-amber-500 bg-amber-100/50 scale-[1.02] ring-2 ring-amber-300'
                                          : selectedCardToPlace 
                                            ? 'border-amber-400 bg-amber-50/30 cursor-pointer animate-pulse'
                                            : 'border-slate-250 bg-slate-50 text-slate-400 text-[10px] sm:text-xs italic'
                                    }`}
                                  >
                                    <div 
                                      draggable={placedCard ? !isAnswered : false}
                                      onDragStart={(e) => {
                                        if (placedCard && !isAnswered) {
                                          e.dataTransfer.setData("text", placedCard);
                                          e.dataTransfer.setData("text/plain", placedCard);
                                          e.dataTransfer.setData("originSlot", String(slotIdx));
                                          setIsDragging(true);
                                        }
                                      }}
                                      onDragEnd={() => setIsDragging(false)}
                                      className={`flex items-center gap-1.5 sm:gap-2 w-full ${placedCard ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
                                    >
                                      {placedCard ? (
                                        <span className="text-[11px] sm:text-xs font-bold leading-snug">☰ {placedCard}</span>
                                      ) : (
                                        <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 leading-tight">
                                          {selectedCardToPlace ? '👇 Chạm ráp' : 'Kéo thả hoặc chạm nhãn...'}
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
                        {(!isTestMode ? userAnswers[currentIndex] === undefined : true) && (
                          <div 
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDraggingOverAvailable(true);
                            }}
                            onDragLeave={() => {
                              setIsDraggingOverAvailable(false);
                            }}
                            onDrop={(e) => {
                              setIsDraggingOverAvailable(false);
                              const originSlotStr = e.dataTransfer.getData("originSlot");
                              if (originSlotStr !== undefined && originSlotStr !== "") {
                                handleRemoveCardFromSlot(Number(originSlotStr));
                              }
                            }}
                            className={`p-5 rounded-[2.5rem] space-y-3 border-2 transition-all ${
                              isDraggingOverAvailable 
                                ? 'bg-amber-100 border-amber-500 scale-[1.01]' 
                                : 'bg-amber-50/40 border-amber-200/60'
                            }`}
                          >
                            <span className="text-xs font-black text-amber-900 uppercase block tracking-wide">
                              Danh sách các nhãn chữ (Có thể Kéo thả trực tiếp hoặc Chạm chọn):
                            </span>
                            
                            <div className="flex flex-wrap gap-2.5">
                              {availableCards.length === 0 ? (
                                <span className="text-xs italic py-1.5 block text-slate-550 font-bold">
                                  {isTestMode ? 'Đã ráp đầy đủ các nhãn! Hãy xem lại các cặp ghép nối hoặc nhấn "Câu tiếp theo" nhé.' : 'Đã ráp đầy đủ các nhãn! Hãy nhấn Xác Nhận Kết Quả ghép đôi bên dưới.'}
                                </span>
                              ) : (
                                availableCards.map((card, idx) => {
                                  const isFocused = selectedCardToPlace === card;
                                  return (
                                    <div
                                      key={idx}
                                      draggable={true}
                                      onDragStart={(e) => { 
                                        e.dataTransfer.setData("text", card); 
                                        e.dataTransfer.setData("text/plain", card); 
                                        e.dataTransfer.effectAllowed = "move";
                                        setIsDragging(true);
                                      }}
                                      onDragEnd={() => setIsDragging(false)}
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
                        {!isTestMode && userAnswers[currentIndex] === undefined && (
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
                      /* Traditional or Image Multiple Choice Grid rendering */
                      quizQuestions[currentIndex]?.type === 'image_choice' ? (
                        /* GORGEOUS IMAGE CHOICE GRID RENDERING */
                        <div className="space-y-4 font-sans">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                            {quizQuestions[currentIndex]?.options.map((option, idx) => {
                              const curQ = quizQuestions[currentIndex];
                              const selectedOption = userAnswers[currentIndex];
                              const isAnswered = isTestMode ? false : selectedOption !== undefined;
                              
                              const isThisSelected = selectedMultiOptions.includes(idx);
                              const isCorrectOption = (curQ?.correctIndices || []).includes(idx);

                              let cardStyle = "";
                              if (isTestMode) {
                                if (isThisSelected) {
                                  cardStyle = "bg-indigo-50 border-3 border-indigo-500 shadow-[0_6px_0_#4F46E5] scale-[1.02] text-indigo-900";
                                } else {
                                  cardStyle = "bg-white border-3 border-slate-200 hover:border-indigo-400 shadow-[0_6px_0_#F1F5F9] hover:translate-y-[-2px] active:translate-y-0.5 text-slate-800";
                                }
                              } else {
                                if (isAnswered) {
                                  if (isCorrectOption) {
                                    cardStyle = "bg-emerald-50 text-emerald-950 border-3 border-emerald-500 font-bold shadow-[0_6px_0_#10B981]";
                                  } else if (isThisSelected) {
                                    cardStyle = "bg-rose-50 text-rose-950 border-3 border-rose-400 font-bold shadow-[0_6px_0_#F43F5E]";
                                  } else {
                                    cardStyle = "bg-slate-50/50 text-slate-400 border border-slate-200/40 opacity-40 cursor-not-allowed";
                                  }
                                } else {
                                  if (isThisSelected) {
                                    cardStyle = "bg-purple-50 border-3 border-purple-500 shadow-[0_6px_0_#8B5CF6] scale-[1.02] text-purple-900";
                                  } else {
                                    cardStyle = "bg-white border-3 border-slate-200 hover:border-purple-400 shadow-[0_6px_0_#F1F5F9] hover:translate-y-[-2px] active:translate-y-0.5 text-slate-800";
                                  }
                                }
                              }

                              return (
                                <motion.button
                                  key={idx}
                                  type="button"
                                  whileHover={!isAnswered ? { scale: 1.02 } : {}}
                                  whileTap={!isAnswered ? { scale: 0.98 } : {}}
                                  disabled={isAnswered}
                                  onClick={() => handleToggleMultiOption(idx)}
                                  className={`relative w-full rounded-3xl p-4 flex flex-col justify-between items-center transition-all cursor-pointer aspect-square bg-white border-3 overflow-hidden ${cardStyle}`}
                                >
                                  {/* Selection Checkbox/Checkbox Marker */}
                                  <div className="absolute top-3.5 right-3.5 z-10">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                      isThisSelected 
                                        ? 'bg-purple-600 border-2 border-white text-white scale-110 shadow-md' 
                                        : 'bg-white border-2 border-slate-300 text-transparent'
                                    }`}>
                                      <svg className="w-3.5 h-3.5 stroke-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    </span>
                                  </div>

                                  {/* Alphabet letter marker */}
                                  <div className="absolute top-3.5 left-3.5 z-10 text-[9px] font-black text-slate-400 px-2 py-0.5 bg-slate-100 rounded-lg border border-slate-200 select-none">
                                    {String.fromCharCode(65 + idx)}
                                  </div>

                                  {/* Image container */}
                                  <div className="w-full h-full flex items-center justify-center py-2">
                                    <img 
                                      src={option} 
                                      alt={`Đáp án ${String.fromCharCode(65 + idx)}`} 
                                      className="max-h-full max-w-full object-contain drop-shadow-sm select-none"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>

                          {/* Confirm button */}
                          {!isTestMode && userAnswers[currentIndex] === undefined && (
                            <div className="pt-2 text-right">
                              <button
                                type="button"
                                disabled={selectedMultiOptions.length === 0}
                                onClick={handleConfirmMultiChoice}
                                className={`px-8 py-3.5 text-white font-black rounded-full shadow-lg hover:translate-y-0.5 active:translate-y-1 transition-all flex items-center gap-2 justify-center ml-auto cursor-pointer text-xs ${
                                  selectedMultiOptions.length > 0
                                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_4px_0_#1E8449]'
                                    : 'bg-slate-300 shadow-[0_4px_0_#CBD5E1] cursor-not-allowed opacity-60'
                                }`}
                              >
                                🏁 Xác nhận câu trả lời 🏁
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Traditional Multiple Choice Grid rendering */
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-3">
                            {quizQuestions[currentIndex]?.options.map((option, idx) => {
                              const curQ = quizQuestions[currentIndex];
                              const isMultiChoice = curQ?.type === 'multi_choice';
                              const selectedOption = userAnswers[currentIndex];
                              const isAnswered = isTestMode ? false : selectedOption !== undefined;
                              
                              const isThisSelected = isMultiChoice 
                                ? selectedMultiOptions.includes(idx) 
                                : selectedOption === idx;
                              
                              const isCorrectOption = isMultiChoice 
                                ? (curQ.correctIndices || []).includes(idx) 
                                : idx === curQ?.correctIndex;

                              let optionStyle = "";
                              if (isTestMode) {
                                if (isThisSelected) {
                                  optionStyle = "bg-indigo-50 border-2 border-indigo-500 font-bold shadow-[0_4px_0_#4F46E5] text-indigo-900";
                                } else {
                                  optionStyle = "bg-white border-2 border-slate-200 hover:border-vibrant-blue shadow-[0_4px_0_#E2E8F0] active:translate-y-0.5 text-slate-800";
                                }
                              } else {
                                if (isAnswered) {
                                  if (isCorrectOption) {
                                    optionStyle = "bg-emerald-50 text-emerald-950 border-2 border-vibrant-green font-bold shadow-[0_4px_0_#2ECC71] text-emerald-900";
                                  } else if (isThisSelected) {
                                    optionStyle = "bg-rose-50 text-rose-950 border-2 border-vibrant-pink/80 font-bold shadow-[0_4px_0_#E74C3C] text-rose-955";
                                  } else {
                                    optionStyle = "bg-slate-50 text-slate-400 border border-slate-200/40 opacity-50 cursor-not-allowed";
                                  }
                                } else {
                                  if (isThisSelected && isMultiChoice) {
                                    optionStyle = "bg-purple-50 border-2 border-purple-500 font-bold shadow-[0_4px_0_#9333EA] text-purple-900";
                                  } else {
                                    optionStyle = "bg-white border-2 border-slate-200 hover:border-vibrant-blue shadow-[0_4px_0_#E2E8F0] active:translate-y-0.5 text-slate-800";
                                  }
                                }
                              }

                              return (
                                <motion.button
                                  key={idx}
                                  type="button"
                                  whileHover={!isAnswered ? { x: 4 } : {}}
                                  whileTap={!isAnswered ? { scale: 0.99 } : {}}
                                  disabled={isAnswered}
                                  onClick={() => isMultiChoice ? handleToggleMultiOption(idx) : handleSelectOption(idx)}
                                  className={`w-full text-left p-4 rounded-2xl font-semibold text-sm flex items-center justify-between transition-all cursor-pointer ${optionStyle}`}
                                >
                                  <div className="flex items-center gap-3 pr-2">
                                    <span className={`w-8 h-8 rounded-lg ${isThisSelected ? (isMultiChoice ? 'bg-purple-100 border-purple-300' : 'bg-[#EEF2FF] border-indigo-200') : isAnswered ? 'bg-[#D1FAE5]' : 'bg-slate-100'} border text-xs font-black flex items-center justify-center shrink-0`}>
                                      {isMultiChoice ? (
                                        <input 
                                          type="checkbox" 
                                          checked={isThisSelected} 
                                          readOnly 
                                          className="w-3.5 h-3.5 text-purple-600 rounded border-slate-3 rounded-md"
                                        />
                                      ) : String.fromCharCode(65 + idx)}
                                    </span>
                                    <span className="leading-snug">{option}</span>
                                  </div>

                                  {!isTestMode && isAnswered && isCorrectOption && (
                                    <CheckCircle className="w-5 h-5 text-vibrant-green shrink-0" />
                                  )}
                                  {!isTestMode && isAnswered && isThisSelected && !isCorrectOption && (
                                    <XCircle className="w-5 h-5 text-vibrant-pink shrink-0" />
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>

                          {/* Confirm button for multi-choice in study mode */}
                          {quizQuestions[currentIndex]?.type === 'multi_choice' && !isTestMode && userAnswers[currentIndex] === undefined && (
                            <div className="pt-2 text-right">
                              <button
                                type="button"
                                disabled={selectedMultiOptions.length === 0}
                                onClick={handleConfirmMultiChoice}
                                className={`px-8 py-3.5 text-white font-black rounded-full shadow-lg hover:translate-y-0.5 active:translate-y-1 transition-all flex items-center gap-2 justify-center ml-auto cursor-pointer text-xs ${
                                  selectedMultiOptions.length > 0
                                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_4px_0_#1E8449]'
                                    : 'bg-slate-300 shadow-[0_4px_0_#CBD5E1] cursor-not-allowed opacity-60'
                                }`}
                              >
                                🏁 Xác nhận câu trả lời (Chọn nhiều) 🏁
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {/* Response explanation box */}
                    <AnimatePresence>
                      {!isTestMode && userAnswers[currentIndex] !== undefined && (() => {
                        const q = quizQuestions[currentIndex];
                        const ansVal = userAnswers[currentIndex];
                        const isCorrect = (q.type === 'drag_text' || q.type === 'drag_image_text' || q.type === 'table_match' || q.type === 'multi_choice' || q.type === 'image_choice') ? ansVal === 100 : ansVal === q.correctIndex;
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
                              {quizQuestions[currentIndex]?.explanation}
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
                        onClick={() => {
                          if (currentIndex === quizQuestions.length - 1 && isTestMode) {
                            triggerConfirm(
                              'Nộp bài kiểm tra 📝',
                              'Con đã hoàn thành toàn bộ câu hỏi ôn tập. Con có muốn nộp bài để xem kết quả và lưu lại tiến trình không?',
                              () => {
                                handleNext();
                              }
                            );
                          } else {
                            handleNext();
                          }
                        }}
                        className={`flex items-center gap-2 px-6 py-3 bg-vibrant-blue text-white rounded-full text-sm font-black shadow-[0_4px_0_#2B69C1] hover:translate-y-0.5 active:translate-y-1 transition-all cursor-pointer ${
                          userAnswers[currentIndex] === undefined ? 'opacity-50 cursor-not-allowed shadow-none' : ''
                        }`}
                      >
                        {currentIndex === quizQuestions.length - 1 
                          ? (isTestMode ? 'Nộp bài kiểm tra 📝' : 'Xem kết quả') 
                          : 'Câu tiếp theo'}
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
                className={`bg-white rounded-[2.5rem] border-4 p-8 shadow-sm text-center space-y-6 ${
                  isTestMode ? 'border-cyan-500' : 'border-vibrant-green'
                }`}
              >
                <div className={`inline-block p-4 rounded-full relative ${
                  isTestMode ? 'bg-cyan-50' : 'bg-emerald-50'
                }`}>
                  <Trophy className={`w-16 h-16 animate-pulse ${
                    isTestMode ? 'text-cyan-500' : 'text-vibrant-green'
                  }`} />
                  <Sparkles className="absolute top-2 right-2 w-5 h-5 text-vibrant-yellow animate-spin" />
                </div>

                <div>
                  <h3 className={`text-3xl font-black font-display ${
                    isTestMode ? 'text-cyan-600' : 'text-vibrant-green'
                  }`}>
                    {isTestMode ? 'Hoàn thành bài kiểm tra!' : 'Hoàn thành bài ôn tập!'}
                  </h3>
                  <p className="text-slate-500 font-bold text-sm mt-1">
                    {isTestMode 
                      ? 'Tiến trình điểm số của con đã được tự động lưu lại hệ thống!' 
                      : 'Con đã rất nỗ lực học tập hôm nay!'
                    }
                  </p>
                </div>

                <div className="max-w-xs mx-auto border-2 border-vibrant-yellow bg-vibrant-bg/40 p-5 rounded-[2rem] grid grid-cols-2 gap-4">
                  <div className="text-center font-display">
                    <span className="block text-2xl font-black text-slate-800">
                      {totalCorrect}/{quizQuestions.length}
                    </span>
                    <span className="text-[10px] text-slate-400 font-black uppercase">Điểm Số ⭐</span>
                  </div>
                  <div className="text-center font-display">
                    <span className="block text-2xl font-black text-vibrant-blue">
                      {quizQuestions.length > 0 ? Math.round((totalCorrect / quizQuestions.length) * 100) : 0}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-black uppercase">Tỉ Lệ</span>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 border-2 border-orange-200 text-orange-950 text-sm font-bold rounded-2xl">
                  🌟 {totalCorrect === quizQuestions.length 
                    ? 'Tuyệt đỉnh! Con đã đạt trọn vẹn điểm tuyệt đối!'
                    : totalCorrect >= quizQuestions.length * 0.8 
                      ? 'Tuyệt vời! Con hiểu bài vô cùng chắc chắn đấy.'
                      : 'Làm tốt lắm con ơi! Ôn thêm một chút nữa thôi là điểm mười rồi.'
                  }
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleExitLesson}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-full transition-all cursor-pointer text-sm"
                  >
                    Xem chủ đề khác
                  </button>
                  <button
                    onClick={() => {
                      handleShuffleQuestions();
                      setUserAnswers({});
                      setCurrentIndex(0);
                      setShowFinishedCard(false);
                    }}
                    className={`flex-1 py-4 text-white font-black rounded-full shadow-lg transition-all cursor-pointer text-sm ${
                      isTestMode 
                        ? 'bg-cyan-500 hover:bg-cyan-600 shadow-[0_4px_0_#0284C7]' 
                        : 'bg-vibrant-green hover:bg-emerald-600 shadow-[0_4px_0_#1E8449]'
                    }`}
                  >
                    {isTestMode ? 'Làm lại kiểm tra 🔄' : 'Giải lại bài 🔄'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          /* VIEW 2: TEACHER EDIT QUESTIONS SYSTEMS PANEL (RANGE CONFIG ENGINE) */
          <div key="edit-view" className="space-y-6 text-left">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/70 border-2 border-amber-300 p-6 md:p-8 rounded-[2.5rem] shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-4">
                <div>
                  <h3 className="text-base font-black text-amber-900 flex items-center gap-1.5">
                    ⚙️ Cấu Hình Đề Ôn Tập: {activeLesson?.title}
                  </h3>
                  <p className="text-[11px] font-bold text-amber-700/85 mt-0.5">
                    Thay đổi tên bài học, biểu tượng và tinh chỉnh số câu hỏi lấy trực tiếp từ Ngân hàng Đề trung tâm.
                  </p>
                </div>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Mã bài: {activeLesson?.id}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-8 space-y-1.5">
                  <label className="text-xs font-black text-amber-900 block">Tên hiển thị của Bài ôn tập:</label>
                  <input
                    type="text"
                    required
                    value={editLessonTitle}
                    onChange={e => setEditLessonTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-amber-200/80 rounded-2xl text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none"
                    placeholder="Nhập tên bài học hiển thị cho học sinh..."
                  />
                </div>

                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-xs font-black text-amber-900 block">Biểu tượng hiển thị:</label>
                  <select
                    value={editLessonEmoji}
                    onChange={e => setEditLessonEmoji(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-amber-200/80 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 appearance-none text-center"
                  >
                    <option value="💻">💻 Máy tính</option>
                    <option value="🌐">🌐 Trực tuyến</option>
                    <option value="🛡️">🛡️ Bảo mật</option>
                    <option value="🔌">🔌 Thiết bị</option>
                    <option value="🏆">🏆 Điểm cao</option>
                    <option value="📝">📝 Bài giảng</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/80 p-5 rounded-2xl border border-amber-200/50">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-amber-900 block">
                    Bắt đầu lấy từ câu số (Question Start Index):
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={gradeQuestions.length || 100}
                    value={editLessonStartIdx}
                    onChange={e => setEditLessonStartIdx(Math.max(1, Number(e.target.value)))}
                    className="w-full px-4 py-3 bg-white border-2 border-amber-200/80 rounded-2xl text-xs font-bold text-center focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-amber-900 block">
                    Kết thúc tại câu số (Question End Index):
                  </label>
                  <input
                    type="number"
                    required
                    min={editLessonStartIdx}
                    max={gradeQuestions.length || 100}
                    value={editLessonEndIdx}
                    onChange={e => setEditLessonEndIdx(Math.max(editLessonStartIdx, Number(e.target.value)))}
                    className="w-full px-4 py-3 bg-white border-2 border-amber-200/80 rounded-2xl text-xs font-bold text-center focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center bg-amber-50/50 p-4 rounded-2xl border border-amber-200/40 gap-4">
                <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  🎯 Khoảng lựa chọn chứa: 
                  <strong className="text-amber-800 text-sm">
                    {Math.max(0, editLessonEndIdx - editLessonStartIdx + 1)} Câu hỏi
                  </strong> 
                  (Trên tổng số {gradeQuestions.length} câu trong ngân hàng ngân hàng đề).
                </span>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setViewTab('study')}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black rounded-xl transition-all cursor-pointer"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveLessonConfig}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    Lưu cấu hình
                  </button>
                </div>
              </div>
            </div>

            {/* LIVE PREVIEW OF CHOSEN QUESTIONS RANGE */}
            <div className="space-y-4">
              <div className="text-left py-2 border-b-2 border-dashed border-slate-200">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                  📝 Xem trước tức thời danh sách câu hỏi trong khoảng đã chọn:
                </h4>
              </div>

              {gradeQuestions.length === 0 ? (
                <div className="text-center py-10 font-bold text-xs text-slate-400">
                  ⚠️ Đang tải câu hỏi từ Ngân hàng đề trung tâm...
                </div>
              ) : gradeQuestions.slice(editLessonStartIdx - 1, editLessonEndIdx).length === 0 ? (
                <div className="text-center py-10 font-bold text-xs text-slate-400">
                  ⚠️ Không có câu hỏi nào trong khoảng chỉ số này. Hãy điều chỉnh lại chỉ số bắt đầu/kết thúc ở trên.
                </div>
              ) : (
                <div className="space-y-4">
                  {gradeQuestions.slice(editLessonStartIdx - 1, editLessonEndIdx).map((q, idx) => (
                    <div 
                      key={q.id} 
                      className="bg-white border-2 border-slate-100 p-5 rounded-[2rem] shadow-xs relative flex flex-col md:flex-row gap-4 items-start text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-100 font-extrabold text-xs flex items-center justify-center shrink-0 border border-slate-200 text-slate-600">
                        {idx + 1}
                      </div>

                      <div className="flex-1 space-y-2 w-full">
                        <div className="flex items-center gap-2">
                          <span className="bg-purple-100 text-purple-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                            Câu số {q.qNum} trong ngân hàng
                          </span>
                          
                          <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-200">
                            Loại: {q.type === 'table_match' ? 'Khớp lưới' : q.type === 'drag_text' ? 'Kéo thả' : 'Trắc nghiệm'}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-800 leading-normal">
                          {q.text}
                        </div>

                        {q.type !== 'table_match' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {q.options && q.options.map((opt, oIdx) => (
                              <div 
                                key={oIdx}
                                className={`p-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-2 ${
                                  oIdx === q.correctIndex 
                                    ? 'bg-emerald-50 text-emerald-800 border-vibrant-green font-bold' 
                                    : 'bg-slate-50 text-slate-400 border-slate-100'
                                }`}
                              >
                                <span className="font-black mr-1">{oIdx + 1}:</span>
                                <span>{opt}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100 text-[10px] font-bold space-y-1 leading-normal text-slate-500">
                            <div><strong className="text-slate-800">Cột phân loại:</strong> {q.headers?.join(' | ')}</div>
                            <div><strong className="text-slate-800">Hàng nội dung:</strong> {q.rows?.join(' | ')}</div>
                            <div className="text-emerald-700 font-extrabold">🎯 Đáp án nối (Cột index): {q.correctAnswers?.join(', ')}</div>
                          </div>
                        )}

                        {q.explanation && (
                          <div className="p-3 bg-amber-50/50 rounded-2xl leading-normal text-[10px] font-bold text-amber-900 border border-amber-100/50">
                            <strong className="text-amber-800 block text-[10px] uppercase font-black tracking-wider mb-0.5">💡 Giải thích chi tiết:</strong>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  "Em đã tự ý THOÁT CHẾ ĐỘ TOÀN MÀN HÌNH trong lúc làm bài ôn tập. Để đảm bảo tính trung thực, kết quả làm bài ôn luyện này đã bị hủy bỏ."}
                {cheatType === 'tab' && 
                  "Em đã CHUYỂN TAB hoặc ẨN TRÌNH DUYỆT trong lúc làm bài ôn tập. Để đảm bảo tính trung thực, kết quả làm bài ôn luyện này đã bị hủy bỏ."}
                {cheatType === 'blur' && 
                  "Em đã NHẤP CHUỘT RA NGOÀI hoặc CHUYỂN ĐỔI ỨNG DỤNG khác. Để đảm bảo tính trung thực, kết quả làm bài ôn luyện này đã bị hủy bỏ."}
              </p>
              <button
                onClick={() => setCheatType(null)}
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-500/20 transition-all cursor-pointer text-sm"
              >
                Trở về và làm lại từ đầu 🔄
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
