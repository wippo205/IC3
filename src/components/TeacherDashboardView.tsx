import React, { useState, useEffect, useMemo } from 'react';
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
  Inbox,
  Database,
  Plus,
  Trash,
  Trash2,
  Edit,
  Edit2,
  Save,
  X,
  HelpCircle,
  CheckCircle,
  FileText,
  Sun,
  Moon,
  Menu
} from 'lucide-react';
import RevisionView from './RevisionView';
import QuestionBankManager from './QuestionBankManager';
import FileStorageView from './FileStorageView';

interface TeacherDashboardViewProps {
  user: { id: string; username: string; nickname: string; grade?: number; school?: string; classroom?: string; role?: 'student' | 'teacher' | 'admin' };
  token: string;
  onLogout: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

// Compact, scrollable homework progress widget showing max 2 homeworks at a time with a scrollbar
function StudentHomeworkProgressList({ homeworkProgress }: { homeworkProgress: any[] }) {
  if (!homeworkProgress || homeworkProgress.length === 0) {
    return (
      <div className="p-4 bg-white border border-slate-100 rounded-2xl text-center text-xs text-slate-400 font-semibold shadow-xs">
        Em học sinh chưa thực hiện bài tập về nhà nào.
      </div>
    );
  }

  // Sort by lastUpdated descending, so the most recent is first
  const sortedHw = [...homeworkProgress].sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );

  return (
    <div 
      className="bg-white border border-slate-100 rounded-[1.5rem] p-3 space-y-2 shadow-xs overflow-y-auto max-h-[148px] pr-1.5 scrollbar-thin"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 transparent'
      }}
    >
      {sortedHw.map((hp: any, idx: number) => {
        const percent = hp.totalQuestions > 0 ? (hp.correctAnswers / hp.totalQuestions) * 100 : 0;
        const isPass = percent >= 90;
        return (
          <div key={idx} className="flex justify-between items-center p-2.5 border border-slate-50 hover:bg-slate-50 rounded-xl transition-all">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 block">
                {hp.lessonTitle || `Bài ${hp.lessonId}`}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                <Calendar className="w-3 h-3 text-slate-300" />
                <span>
                  {new Date(hp.lastUpdated).toLocaleDateString('vi-VN')} {new Date(hp.lastUpdated).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
            
            <div className="text-right shrink-0 pr-1 flex flex-col items-end justify-center">
              <span className={`px-2 py-0.5 text-[9px] font-black rounded border ${
                isPass ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'
              }`}>
                {isPass ? 'Đạt' : 'Chưa đạt'} ({Math.round(percent)}%)
              </span>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                {hp.correctAnswers}/{hp.totalQuestions} đúng
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Compact, scrollable student exam records history showing max 2 exams at a time with a scrollbar
function StudentExamHistoryList({ exams, grade }: { exams: any[]; grade: number }) {
  if (!exams || exams.length === 0) {
    return (
      <div className="p-4 bg-white border border-slate-100 rounded-2xl text-center text-xs text-slate-400 font-semibold shadow-xs">
        Em học sinh chưa thực hiện bài thi tự do nào.
      </div>
    );
  }

  // Sort by createdAt descending (most recent first)
  const sortedExams = [...exams].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="bg-white border border-slate-100 rounded-[1.5rem] p-3 space-y-2 shadow-xs overflow-y-auto max-h-[148px] pr-1.5 scrollbar-thin"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 transparent'
      }}
    >
      {sortedExams.map((ex: any, idx: number) => {
        const isHigh = ex.score > 100 ? ex.score >= 700 : ex.score >= 80;
        return (
          <div key={idx} className="flex justify-between items-center p-2.5 border border-slate-50 hover:bg-slate-50 rounded-xl transition-all">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 block">
                {(() => {
                  if (ex.lessonTitle) {
                    const lower = ex.lessonTitle.toLowerCase();
                    if (lower.startsWith('kiểm tra') || lower.startsWith('đề thi') || lower.startsWith('đề ôn tập')) {
                      return ex.lessonTitle;
                    }
                    return `Kiểm tra ${ex.lessonTitle}`;
                  }
                  if (ex.lessonId) {
                    const parts = ex.lessonId.split('_');
                    const lastPart = parts[parts.length - 1];
                    if (!isNaN(Number(lastPart))) {
                      return `Kiểm tra Bài ${lastPart}`;
                    }
                    return `Kiểm tra ${lastPart}`;
                  }
                  return `Kiểm tra IC3 Lớp ${ex.grade}`;
                })()}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                <span className="flex items-center gap-0.5">
                  <Calendar className="w-3 h-3 text-slate-300" />
                  {new Date(ex.createdAt).toLocaleDateString('vi-VN')}
                </span>
                <span>•</span>
                <span>Thời gian: {Math.floor(ex.durationSeconds / 60)}p {ex.durationSeconds % 60}s</span>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-sm font-black ${isHigh ? 'text-emerald-500' : 'text-slate-700'}`}>
                {ex.score > 100 ? `${ex.score}đ` : `${ex.score}%`}
              </span>
              <span className="text-[9px] text-slate-400 font-bold block">
                {ex.correctCount}/{ex.totalQuestions} đúng
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const isSchoolMatch = (s1: string, s2: string): boolean => {
  const clean = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, '');
  return clean(s1) === clean(s2);
};

const isClassroomMatch = (c1: string, c2: string): boolean => {
  const clean = (s: string) => (s || '').trim().toLowerCase().replace(/[^a-z0-9]/gi, '');
  return clean(c1) === clean(c2);
};

export default function TeacherDashboardView({ user, token, onLogout, isDarkMode, onToggleTheme }: TeacherDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'scoreboard' | 'curriculum' | 'questionbank' | 'materials'>(() => {
    return (localStorage.getItem('wippo_teacher_active_tab') as 'scoreboard' | 'curriculum' | 'questionbank' | 'materials') || 'scoreboard';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Scoreboard related states
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<number | 'all'>('all');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Homework/assignments states
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assigningClassInfo, setAssigningClassInfo] = useState<{
    school: string;
    grade: number;
    classroom: string;
  } | null>(null);
  const [classGradeLessons, setClassGradeLessons] = useState<any[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState<string | null>(null);

  // View state: tree vs list (Always default and lock to 'tree' to remove 'danh sách dẹt')
  const viewMode: 'tree' | 'list' = 'tree';

  // Tree toggle states
  const [expandedSchools, setExpandedSchools] = useState<Record<string, boolean>>({});
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  // Curriculum grade selection state for the active editor
  const [editorGrade, setEditorGrade] = useState<number>(() => {
    const saved = localStorage.getItem('wippo_teacher_editor_grade');
    return saved ? Number(saved) : 6;
  });

  // Keep state persistent across refresh
  useEffect(() => {
    localStorage.setItem('wippo_teacher_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('wippo_teacher_editor_grade', String(editorGrade));
  }, [editorGrade]);

  // End-of-year purge student data states
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeSuccessMsg, setPurgeSuccessMsg] = useState<string | null>(null);
  const [purgeErrorMsg, setPurgeErrorMsg] = useState<string | null>(null);
  const [confirmPhraseInput, setConfirmPhraseInput] = useState('');

  const handlePurgeStudentsData = async () => {
    if (confirmPhraseInput !== 'XÓA_HỌC_SINH') {
      setPurgeErrorMsg('Vui lòng nhập chính xác cụm từ để xác nhận.');
      return;
    }

    setIsPurging(true);
    setPurgeErrorMsg(null);
    setPurgeSuccessMsg(null);

    try {
      const resp = await fetch('/api/teacher/clear-students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await resp.json();
      if (resp.ok && result.success) {
        setPurgeSuccessMsg(result.message || 'Đã dọn dẹp dữ liệu học sinh thành công!');
        fetchScoreboardData();
        setTimeout(() => {
          setShowPurgeConfirm(false);
          setConfirmPhraseInput('');
          setPurgeSuccessMsg(null);
        }, 3000);
      } else {
        setPurgeErrorMsg(result.error || 'Có lỗi xảy ra khi dọn dẹp dữ liệu học sinh.');
      }
    } catch (err: any) {
      setPurgeErrorMsg('Không thể kết nối đến máy chủ để dọn dẹp.');
    } finally {
      setIsPurging(false);
    }
  };

  useEffect(() => {
    fetchScoreboardData();
    fetchAssignmentsData();
  }, [token]);

  const fetchAssignmentsData = async () => {
    try {
      const resp = await fetch('/api/homework/assignments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setAssignments(data.assignments || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải bài tập về nhà:', err);
    }
  };

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

  const handleOpenAssignModal = async (school: string, grade: number, classroom: string) => {
    setAssigningClassInfo({ school, grade, classroom });
    setLoadingLessons(true);
    setAssignSuccessMsg(null);
    setClassGradeLessons([]);
    try {
      const resp = await fetch(`/api/lessons?grade=${grade}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setClassGradeLessons(data.lessons || []);
      }
    } catch (e) {
      console.error("Lỗi tải bài ôn tập:", e);
    } finally {
      setLoadingLessons(false);
    }
  };

  const handleCreateAssignment = async (lesson: any) => {
    if (!assigningClassInfo) return;
    try {
      const resp = await fetch('/api/homework/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          grade: assigningClassInfo.grade,
          school: assigningClassInfo.school,
          classroom: assigningClassInfo.classroom,
          lessonId: lesson.id,
          lessonTitle: lesson.title
        })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setAssignSuccessMsg(`Đã giao bài tập "${lesson.title}" thành công cho Lớp ${assigningClassInfo.classroom}!`);
        fetchAssignmentsData(); // refresh list
        setTimeout(() => {
          setAssigningClassInfo(null);
          setAssignSuccessMsg(null);
        }, 2000);
      } else {
        alert(data.error || 'Có lỗi xảy ra khi giao bài tập.');
      }
    } catch (err) {
      alert('Không thể kết nối đến máy chủ.');
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

  // Filter and Search logic (memoized to prevent performance bottlenecks on large cohorts)
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = 
        (student.nickname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.school && (student.school || '').toLowerCase().includes(searchQuery.toLowerCase())) ||
        (student.classroom && (student.classroom || '').toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesGrade = selectedGradeFilter === 'all' || student.grade === Number(selectedGradeFilter);

      return matchesSearch && matchesGrade;
    });
  }, [students, searchQuery, selectedGradeFilter]);

  // Organize the tree structure (memoized to eliminate redundant layout computations and Vietnamese string comparisons)
  const treeData = useMemo(() => {
    const tree: {
      [school: string]: {
        [grade: number]: {
          [classroom: string]: any[]
        }
      }
    } = {};

    filteredStudents.forEach(student => {
      const schoolName = (student.school || "Trường chưa cập nhật").trim();
      const gradeVal = student.grade || 3;
      const classroomName = (student.classroom || "Chưa xếp lớp").trim();

      if (!tree[schoolName]) {
        tree[schoolName] = {};
      }
      if (!tree[schoolName][gradeVal]) {
        tree[schoolName][gradeVal] = {};
      }
      if (!tree[schoolName][gradeVal][classroomName]) {
        tree[schoolName][gradeVal][classroomName] = [];
      }
      tree[schoolName][gradeVal][classroomName].push(student);
    });

    // Sort students inside each classroom alphabetically by Vietnamese nickname
    Object.values(tree).forEach(gradesObj => {
      Object.values(gradesObj).forEach((classesObj: any) => {
        Object.values(classesObj).forEach((studentList: any) => {
          studentList.sort((a: any, b: any) => a.nickname.localeCompare(b.nickname, 'vi'));
        });
      });
    });

    return tree;
  }, [filteredStudents]);

  // Pre-expand nested lists by default when students list loaded
  useEffect(() => {
    if (students && students.length > 0) {
      const tree = treeData;
      const initialSchools: Record<string, boolean> = {};
      const initialGrades: Record<string, boolean> = {};
      
      Object.entries(tree).forEach(([schoolName, gradesObj]: [string, any]) => {
        initialSchools[schoolName] = true;
        Object.entries(gradesObj).forEach(([gradeVal, classesObj]: [string, any]) => {
          initialGrades[`${schoolName}|${gradeVal}`] = true;
        });
      });

      setExpandedSchools(prev => {
        if (Object.keys(prev).length === 0) return initialSchools;
        return prev;
      });
      setExpandedGrades(prev => {
        if (Object.keys(prev).length === 0) return initialGrades;
        return prev;
      });
    }
  }, [students, treeData]);

  const handleExpandAll = (treeData: any) => {
    const newSchools: Record<string, boolean> = {};
    const newGrades: Record<string, boolean> = {};
    const newClasses: Record<string, boolean> = {};

    Object.entries(treeData).forEach(([schoolName, gradesObj]: [string, any]) => {
      newSchools[schoolName] = true;
      Object.entries(gradesObj).forEach(([gradeVal, classesObj]: [string, any]) => {
        const gradeKey = `${schoolName}|${gradeVal}`;
        newGrades[gradeKey] = true;
        Object.entries(classesObj).forEach(([classroomName, studentList]: [string, any]) => {
          const classKey = `${schoolName}|${gradeVal}|${classroomName}`;
          newClasses[classKey] = true;
        });
      });
    });

    setExpandedSchools(newSchools);
    setExpandedGrades(newGrades);
    setExpandedClasses(newClasses);
  };

  const handleCollapseAll = () => {
    setExpandedSchools({});
    setExpandedGrades({});
    setExpandedClasses({});
  };

  const toggleSchool = (schoolName: string) => {
    setExpandedSchools(prev => ({
      ...prev,
      [schoolName]: !prev[schoolName]
    }));
  };

  const toggleGrade = (schoolName: string, gradeVal: number) => {
    const key = `${schoolName}|${gradeVal}`;
    setExpandedGrades(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleClass = (schoolName: string, gradeVal: number, classroomName: string) => {
    const key = `${schoolName}|${gradeVal}|${classroomName}`;
    setExpandedClasses(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderStudentCard = (student: any, sIdx: number) => {
    const isExpanded = expandedStudentId === student.id;

    // Find all homework assigned for this student's class (sorted to get the latest)
    const studentHws = assignments.filter((h: any) => 
      Number(h.grade) === Number(student.grade) && 
      isSchoolMatch(h.school, student.school || '') && 
      isClassroomMatch(h.classroom, student.classroom || '')
    );

    const studentHw = studentHws.length > 0 
      ? [...studentHws].sort((a: any, b: any) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())[0]
      : null;

    let hwText = 'Chưa giao';
    let hwColorClass = 'bg-slate-100 text-slate-500 border border-slate-200';

    if (studentHw) {
      const isCurrentActive = new Date().getTime() <= new Date(studentHw.deadline).getTime();
      const prog = (student.stats.homeworkProgress || []).find((p: any) => 
        p.lessonId === studentHw.lessonId && 
        p.homeworkId === studentHw.id
      );
      if (!prog) {
        if (isCurrentActive) {
          hwText = 'Chưa làm';
          hwColorClass = 'bg-rose-100/70 text-rose-600 border border-rose-200';
        } else {
          hwText = 'Quá hạn ⏰';
          hwColorClass = 'bg-slate-200 text-slate-600 border border-slate-300';
        }
      } else {
        const percent = prog.totalQuestions > 0 ? (prog.correctAnswers / prog.totalQuestions) * 100 : 0;
        if (percent >= 90) {
          hwText = `Đạt (${Math.round(percent)}%)`;
          hwColorClass = 'bg-emerald-100 text-emerald-700 border border-emerald-200';
        } else {
          if (isCurrentActive) {
            hwText = `Chưa đạt (${Math.round(percent)}%)`;
            hwColorClass = 'bg-amber-100 text-amber-700 border border-amber-200';
          } else {
            hwText = `Trễ hạn / Chưa đạt (${Math.round(percent)}%) ⏰`;
            hwColorClass = 'bg-slate-200 text-slate-500 border border-slate-300';
          }
        }
      }
    }

    return (
      <div
        key={`${student.id || 'student'}-${sIdx}`}
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
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5 flex-wrap">
                <span>{student.nickname}</span>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                  {student.username}
                </span>
              </h3>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1 text-orange-600">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Lớp {student.classroom ? `${student.classroom} (Khối ${student.grade})` : `Khối ${student.grade}`}
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

            <div className={`text-right px-3 py-1.5 rounded-xl ${hwColorClass}`}>
              <span className="text-[9px] font-bold block uppercase opacity-85">Bài tập về nhà</span>
              <span className="text-xs font-black">{hwText}</span>
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
                      <div 
                        className="bg-white border border-slate-100 rounded-[1.5rem] p-3.5 space-y-3 shadow-xs max-h-[344px] overflow-y-auto pr-1.5 scrollbar-thin"
                        style={{
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#cbd5e1 transparent'
                        }}
                      >
                        {student.stats.progress.map((prog: any, idx: number) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-800">
                                {prog.lessonTitle || (prog.lessonId.startsWith('lesson_custom_') ? 'Học phần tự biên soạn' : `Bài học ${prog.lessonId}`)} (Lớp {prog.grade})
                              </span>
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

                    <StudentExamHistoryList exams={student.stats.exams} grade={student.grade} />

                    {/* Detailed Homework Progress Table */}
                    <div className="pt-4 space-y-2.5">
                      <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-emerald-500" />
                        Bài tập về nhà (Homework Progress)
                      </h4>

                      <StudentHomeworkProgressList homeworkProgress={student.stats.homeworkProgress} />
                    </div>
                  </div>

                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      {/* CUTE ROUNDED SYSTEM NAVIGATION BAR FOR TEACHERS */}
      <header className="bg-white border-b-4 border-orange-200 sticky top-0 z-50 shadow-xs relative">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-x-4">
          
          {/* Logo with Mascot */}
          <div className="flex items-center gap-2 select-none group shrink-0">
            <img 
              src="/favicon.svg" 
              className="w-10 h-10 rounded-xl border-2 border-orange-200 group-hover:scale-110 transition-transform duration-300 shadow-xs object-cover" 
              alt="Wippo IC3 Logo"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-xl font-black font-display text-orange-600 tracking-tight flex items-center gap-1">
                Wippo Teacher Hub
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              </h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
                Trang quản trị cho Giáo viên Wippo IC3
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

          {/* Teacher Action Tabs (Visible ONLY on widescreen desktops lg) */}
          <nav className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('scoreboard');
                localStorage.setItem('wippo_teacher_active_tab', 'scoreboard');
              }}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'scoreboard' 
                  ? 'bg-orange-500 text-white shadow-md' 
                  : 'text-slate-600 hover:text-orange-500 hover:bg-orange-50'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Bảng điểm</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('curriculum');
                localStorage.setItem('wippo_teacher_active_tab', 'curriculum');
              }}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'curriculum' 
                  ? 'bg-sky-500 text-white shadow-md' 
                  : 'text-slate-600 hover:text-sky-500 hover:bg-sky-50'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Biên soạn</span>
            </button>

            {user.role === 'admin' && (
              <button
                onClick={() => {
                  setActiveTab('questionbank');
                  localStorage.setItem('wippo_teacher_active_tab', 'questionbank');
                }}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'questionbank' 
                    ? 'bg-purple-600 text-white shadow-md' 
                    : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50'
                }`}
              >
                <Database className="w-4 h-4 shrink-0" />
                <span>Ngân hàng Đề</span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab('materials');
                localStorage.setItem('wippo_teacher_active_tab', 'materials');
              }}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'materials' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Kho tài liệu</span>
            </button>
          </nav>

          {/* User badge and Log out trigger (Visible ONLY on desktop lg) */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex flex-col text-right">
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
              title="Đăng xuất tài khoản quản trị"
            >
              <span className="text-xs font-extrabold flex items-center gap-1">Rời phòng 🚪</span>
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
              className="lg:hidden absolute top-[calc(100%-4px)] left-0 right-0 bg-white border-b-4 border-orange-200 overflow-hidden shadow-xl z-50 animate-fade-in"
            >
              <div className="p-4 space-y-3 max-w-7xl mx-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                      <GraduationCap className="w-4 h-4 text-cyan-500" />
                      Thầy/Cô: {user.nickname}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-1">
                      {user.school ? `${user.school}` : 'Giáo viên IC3'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl transition-all cursor-pointer text-xs font-black"
                  >
                    Rời phòng 🚪
                  </button>
                </div>

                {/* Navigation Grid Buttons for mobile/tablet */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setActiveTab('scoreboard');
                      localStorage.setItem('wippo_teacher_active_tab', 'scoreboard');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                      activeTab === 'scoreboard' 
                        ? 'bg-orange-500 text-white shadow-md' 
                        : 'bg-slate-50 text-slate-600 hover:text-orange-500 hover:bg-orange-50 border border-slate-100'
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>Bảng điểm</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('curriculum');
                      localStorage.setItem('wippo_teacher_active_tab', 'curriculum');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                      activeTab === 'curriculum' 
                        ? 'bg-sky-500 text-white shadow-md' 
                        : 'bg-slate-50 text-slate-600 hover:text-sky-500 hover:bg-sky-50 border border-slate-100'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>Biên soạn</span>
                  </button>

                  {user.role === 'admin' && (
                    <button
                      onClick={() => {
                        setActiveTab('questionbank');
                        localStorage.setItem('wippo_teacher_active_tab', 'questionbank');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                        activeTab === 'questionbank' 
                          ? 'bg-purple-600 text-white shadow-md' 
                          : 'bg-slate-50 text-slate-600 hover:text-purple-600 hover:bg-purple-50 border border-slate-100'
                      }`}
                    >
                      <Database className="w-4 h-4 shrink-0" />
                      <span>Ngân hàng Đề</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setActiveTab('materials');
                      localStorage.setItem('wippo_teacher_active_tab', 'materials');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                      activeTab === 'materials' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-100'
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>Kho tài liệu</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

                {/* NEW YEAR RESET ACTION BOX FOR ADMIN ONLY */}
                {user.role === 'admin' && (
                  <div className="mt-6 pt-5 border-t-2 border-dashed border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-rose-50/40 p-4 rounded-3xl">
                    <div className="flex items-start gap-2 w-full sm:w-auto">
                      <span className="text-xl shrink-0">📅</span>
                      <div>
                        <h3 className="text-xs font-black text-rose-800">Dọn dẹp đón niên khóa mới (Hệ thống dành riêng cho Admin)</h3>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed max-w-xl">
                          Bắt đầu chu kỳ năm học mới bằng cách xóa sạch hồ sơ học sinh, lịch sử ôn tập, và bảng điểm, giúp hệ thống sẵn sàng hoạt động tối ưu.
                        </p>
                      </div>
                    </div>
                    <button
                      id="btn-purge-students"
                      onClick={() => setShowPurgeConfirm(true)}
                      className="w-full sm:w-auto shrink-0 bg-red-600 hover:bg-red-700 text-white font-black text-xs px-4 py-2.5 rounded-2xl cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      ♻️ Xóa sạch dữ liệu học sinh
                    </button>
                  </div>
                )}
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
                  
                  {/* Sơ đồ khối/lớp & Expand/Collapse All controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-100/60 border border-slate-200/50 p-2.5 rounded-2xl">
                    <div className="flex items-center gap-2 pl-2">
                      <span className="text-sm font-black text-slate-700 flex items-center gap-1.5">
                        🌳 Sơ đồ khối/lớp ({filteredStudents.length} học sinh)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleExpandAll(treeData)}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        ➕ Mở tất cả
                      </button>
                      <button
                        onClick={handleCollapseAll}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        ➖ Thu gọn tất cả
                      </button>
                    </div>
                  </div>

                  {/* Sơ đồ khối List only */}
                  {(() => {
                    const tree = treeData;
                    const sortedSchools = Object.keys(tree).sort((a, b) => a.localeCompare(b));

                    return (
                      <div className="space-y-4">
                        {sortedSchools.map(schoolName => {
                          const gradesObj = tree[schoolName];
                          const sortedGrades = Object.keys(gradesObj)
                            .map(Number)
                            .sort((a, b) => a - b);
                          const isSchoolExpanded = !!expandedSchools[schoolName];
                          
                          // Count total students in this school for badge
                          let schoolStudentCount = 0;
                          Object.values(gradesObj).forEach((classesObj: any) => {
                            Object.values(classesObj).forEach((studentList: any) => {
                              schoolStudentCount += studentList.length;
                            });
                          });

                          return (
                            <div key={schoolName} className="space-y-3 bg-white border-2 border-slate-100 rounded-[2rem] p-4 md:p-5 shadow-xs">
                              {/* School Header Row */}
                              <div 
                                onClick={() => toggleSchool(schoolName)}
                                className="flex items-center justify-between p-3 bg-slate-50 hover:bg-orange-50/20 border border-slate-100 rounded-2xl cursor-pointer select-none transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-orange-100/80 flex items-center justify-center border border-orange-200">
                                    <span className="text-xl">🏫</span>
                                  </div>
                                  <div>
                                    <h4 className="font-extrabold text-slate-800 text-sm md:text-base">
                                      {schoolName}
                                    </h4>
                                    <span className="text-[10px] bg-orange-100 text-orange-700 font-extrabold px-2 py-0.5 rounded-md mt-0.5 inline-block">
                                      {schoolStudentCount} em học sinh
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <motion.div
                                    animate={{ rotate: isSchoolExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                  </motion.div>
                                </div>
                              </div>

                              {/* Grades block */}
                              <AnimatePresence initial={false}>
                                {isSchoolExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden space-y-3 pl-3 md:pl-5 border-l-2 border-dashed border-orange-200/50 ml-5 py-2"
                                  >
                                    {sortedGrades.map(gradeVal => {
                                      const classesObj = gradesObj[gradeVal];
                                      const sortedClasses = Object.keys(classesObj).sort((a, b) => a.localeCompare(b));
                                      const gradeKey = `${schoolName}|${gradeVal}`;
                                      const isGradeExpanded = !!expandedGrades[gradeKey];

                                      // Count total students in this grade for badge
                                      let gradeStudentCount = 0;
                                      Object.values(classesObj).forEach((studentList: any) => {
                                        gradeStudentCount += studentList.length;
                                      });

                                      return (
                                        <div key={gradeVal} className="space-y-2">
                                          {/* Grade Header Row */}
                                          <div 
                                            onClick={() => toggleGrade(schoolName, gradeVal)}
                                            className="flex items-center justify-between p-2.5 bg-white border border-slate-100 hover:border-sky-200 rounded-xl cursor-pointer select-none transition-all shadow-2xs"
                                          >
                                            <div className="flex items-center gap-2.5">
                                              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center border border-sky-100">
                                                <GraduationCap className="w-4 h-4 text-sky-500" />
                                              </div>
                                              <div>
                                                <span className="font-bold text-slate-700 text-xs md:text-sm">
                                                  Khối Lớp {gradeVal}
                                                </span>
                                                <span className="text-[9px] bg-sky-50 text-sky-600 font-extrabold px-1.5 py-0.5 rounded-md ml-2">
                                                  {gradeStudentCount} em
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <motion.div
                                                animate={{ rotate: isGradeExpanded ? 180 : 0 }}
                                                transition={{ duration: 0.2 }}
                                              >
                                                <ChevronDown className="w-4 h-4 text-slate-400" />
                                              </motion.div>
                                            </div>
                                          </div>

                                          {/* Classes block */}
                                          <AnimatePresence initial={false}>
                                            {isGradeExpanded && (
                                              <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden space-y-2 pl-4 sm:pl-6 border-l-2 border-dotted border-slate-200 ml-4 py-1"
                                              >
                                                {sortedClasses.map(classroomName => {
                                                  const studentList = classesObj[classroomName];
                                                  const classKey = `${schoolName}|${gradeVal}|${classroomName}`;
                                                  const isClassExpanded = !!expandedClasses[classKey];

                                                  return (
                                                    <div key={classroomName} className="space-y-1.5">
                                                      {/* Class Header Row */}
                                                      {(() => {
                                                        const classHw = assignments.find((h: any) => 
                                                          Number(h.grade) === Number(gradeVal) && 
                                                          isSchoolMatch(h.school, schoolName) && 
                                                          isClassroomMatch(h.classroom, classroomName)
                                                        );

                                                        return (
                                                          <div 
                                                            onClick={() => toggleClass(schoolName, gradeVal, classroomName)}
                                                            className="flex items-center justify-between p-2 bg-slate-50 hover:bg-emerald-50/40 border border-slate-100 rounded-lg cursor-pointer select-none transition-all"
                                                          >
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                              <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center border border-emerald-100">
                                                                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                                                              </div>
                                                              <span className="font-bold text-slate-600 text-xs">
                                                                Lớp {classroomName}
                                                              </span>
                                                              <span className="text-[9px] bg-emerald-50 text-emerald-600 font-extrabold px-1.5 py-0.2 rounded-md">
                                                                {studentList.length} em
                                                              </span>
                                                              {classHw && (
                                                                <span className="text-[9px] bg-sky-100 text-sky-700 border border-sky-200 font-extrabold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1">
                                                                  📝 {classHw.lessonTitle}
                                                                </span>
                                                              )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                              <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  handleOpenAssignModal(schoolName, gradeVal, classroomName);
                                                                }}
                                                                className="px-2 py-0.5 bg-sky-500 hover:bg-sky-600 border border-sky-400 text-white text-[10px] font-black rounded-md flex items-center gap-0.5 shadow-xs transition-all cursor-pointer"
                                                              >
                                                                📝 Giao bài
                                                              </button>
                                                              <motion.div
                                                                animate={{ rotate: isClassExpanded ? 180 : 0 }}
                                                                transition={{ duration: 0.2 }}
                                                              >
                                                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                                              </motion.div>
                                                            </div>
                                                          </div>
                                                        );
                                                      })()}

                                                      {/* Student Cards in Classroom */}
                                                      <AnimatePresence initial={false}>
                                                        {isClassExpanded && (
                                                          <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="overflow-hidden space-y-2 mt-1 pl-1 md:pl-2"
                                                          >
                                                            {studentList.map((student, sIdx) => renderStudentCard(student, sIdx))}
                                                          </motion.div>
                                                        )}
                                                      </AnimatePresence>
                                                    </div>
                                                  );
                                                })}
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

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
                    {user.role === 'admin' ? 'Biên soạn học liệu & Câu hỏi 🛠️' : 'Kho học liệu & Ôn tập 📖'}
                  </h2>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    {user.role === 'admin' 
                      ? 'Chọn khối lớp cần biên soạn câu hỏi, thêm đề ôn tập hoặc xóa sửa chủ đề học tập.' 
                      : 'Trải nghiệm ôn tập học liệu. Lưu ý: Chỉ có tài khoản Quản trị viên (Admin) mới được quyền sửa hoặc xóa bài tập.'}
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
                  userRole={user.role === 'admin' ? 'teacher' : 'student'}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'questionbank' && user.role === 'admin' && (
            <motion.div
              key="questionbank"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <QuestionBankManager token={token} />
            </motion.div>
          )}

          {activeTab === 'materials' && (
            <motion.div
              key="materials"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <FileStorageView token={token} user={user} />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <footer className="bg-white border-t border-slate-100 py-4 text-center text-xs font-semibold text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>© 2026 Admin Teacher Wippo IC3. Giáo dục là bệ phóng tài năng Việt. 🦛🏫🌟</span>
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
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
          )}
        </div>
      </footer>

      {/* MODAL OVERLAY FOR YEARS FLUSH PURGE CONFIRM */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999]">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] border-4 border-red-500 max-w-md w-full p-6 shadow-2xl space-y-4 text-left"
          >
            <div className="flex items-center gap-2.5 text-red-600">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="text-lg font-black tracking-tight text-red-700">Hành động nguy hiểm!</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cảnh báo hệ thống cuối năm học</p>
              </div>
            </div>

            <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 space-y-2 text-xs">
              <p className="font-bold text-red-800">CẢNH BÁO: Thao tác này KHÔNG THỂ HOÀN TÁC.</p>
              <div className="text-slate-600 font-semibold leading-relaxed">
                Tất cả dữ liệu liên quan đến học sinh bao gồm: 
                <span className="block mt-1 pl-2 font-black text-rose-700">• Danh sách tài khoản học sinh (K3-K8)</span>
                <span className="block pl-2 font-black text-rose-700">• Tiến trình ôn bài của từng em</span>
                <span className="block pl-2 font-black text-rose-700">• Lịch sử điểm thi kiểm tra IC3</span>
                <span className="block pl-2 font-black text-rose-700">• Các tệp tin tài liệu học sinh đã tải lên</span>
              </div>
              <p className="text-slate-500 font-extrabold mt-1 pt-1 border-t border-red-100/30">
                Tài khoản Giáo viên và bộ đề câu hỏi biên soạn học liệu của thầy cô vẫn được giữ NGUYÊN VẸN 🧑‍🏫.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 block">
                Nhập chính xác cụm từ <span className="text-red-600 font-black underline select-all">XÓA_HỌC_SINH</span> để xác nhận đồng ý:
              </label>
              <input
                id="input-confirm-purge"
                type="text"
                value={confirmPhraseInput}
                onChange={(e) => setConfirmPhraseInput(e.target.value)}
                placeholder="XÓA_HỌC_SINH"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 hover:bg-slate-100 focus:outline-hidden focus:border-red-500 focus:bg-white text-center"
              />
            </div>

            {purgeErrorMsg && (
              <div className="p-3 bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200">
                ⚠️ {purgeErrorMsg}
              </div>
            )}

            {purgeSuccessMsg && (
              <div className="p-3 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200">
                ✅ {purgeSuccessMsg}
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                id="btn-cancel-purge"
                type="button"
                onClick={() => {
                  setShowPurgeConfirm(false);
                  setConfirmPhraseInput('');
                  setPurgeErrorMsg(null);
                  setPurgeSuccessMsg(null);
                }}
                disabled={isPurging}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl cursor-pointer transition-all"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-execute-purge"
                type="button"
                onClick={handlePurgeStudentsData}
                disabled={isPurging || confirmPhraseInput !== 'XÓA_HỌC_SINH'}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isPurging ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  'Xác nhận xóa ♻️'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL FOR ASSIGNING HOMEWORK */}
      {assigningClassInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999]">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] border-4 border-sky-500 max-w-lg w-full p-6 shadow-2xl space-y-4 text-left relative overflow-hidden"
          >
            <button
              onClick={() => setAssigningClassInfo(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-2.5 text-sky-600">
              <span className="text-3xl">📝</span>
              <div>
                <h3 className="text-base md:text-lg font-black tracking-tight text-slate-800">Giao Bài Tập Về Nhà</h3>
                <span className="text-[10px] bg-sky-50 text-sky-600 border border-sky-100 font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider block mt-0.5">
                  Lớp {assigningClassInfo.classroom} • Khối {assigningClassInfo.grade} • Trường {assigningClassInfo.school}
                </span>
              </div>
            </div>

            {assignSuccessMsg ? (
              <div className="p-8 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-center space-y-2">
                <span className="text-4xl">🎉</span>
                <p className="text-sm font-black text-emerald-800">{assignSuccessMsg}</p>
                <p className="text-xs text-emerald-600 font-bold">Hệ thống đang lưu trữ và gửi bài ôn luyện này tới các em học sinh...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50/85 p-3 rounded-2xl text-[11px] font-semibold text-slate-500 leading-relaxed border border-slate-100">
                  <span className="text-amber-600 font-black">💡 Quy luật tự động:</span> Khi giáo viên giao bài, thời hạn sẽ tự động là <span className="text-sky-600 font-black">7 ngày</span> để các em ôn tập và hoàn thành. Các em đạt từ <span className="text-emerald-500 font-black">90% trở lên</span> sẽ ở trạng thái <span className="text-emerald-600 font-extrabold">"Đạt"</span>.
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-black text-slate-500 block uppercase tracking-wider">
                    Chọn chủ đề / đề ôn tập cần giao:
                  </span>

                  {loadingLessons ? (
                    <div className="p-12 text-center text-xs font-bold text-slate-400 space-y-2">
                      <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <span>Đang tải danh sách bài ôn...</span>
                    </div>
                  ) : classGradeLessons.length === 0 ? (
                    <div className="p-8 text-center text-xs font-bold text-slate-450 bg-slate-50 rounded-2xl">
                      Khối lớp này chưa có bài học ôn tập nào được biên soạn.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {classGradeLessons.map((lesson) => (
                        <div 
                          key={lesson.id}
                          className="flex items-center justify-between p-3 border border-slate-100 hover:border-sky-300 hover:bg-sky-50/30 rounded-2xl transition-all"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl select-none">{lesson.emoji || '📖'}</span>
                            <div className="text-left">
                              <p className="text-xs font-black text-slate-800 leading-snug">{lesson.title}</p>
                              <p className="text-[10px] text-slate-400 font-bold">Quy mô: {lesson.qCount || (lesson.questions ? lesson.questions.length : 0)} câu hỏi</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCreateAssignment(lesson)}
                            className="shrink-0 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer"
                          >
                            Giao bài 🎯
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setAssigningClassInfo(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-black rounded-xl transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

    </div>
  );
}
