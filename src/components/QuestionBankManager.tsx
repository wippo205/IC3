import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  Plus, 
  Trash2, 
  Edit, 
  X, 
  Search, 
  Save, 
  HelpCircle, 
  CheckCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { Question } from '../types';

interface QuestionBankManagerProps {
  token: string;
}

export default function QuestionBankManager({ token }: QuestionBankManagerProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'all' | 3 | 4 | 5 | 6 | 7 | 8 | 'unassigned'>('all');
  
  // Edit & Add Form states
  const [showEditor, setShowEditor] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  
  // Temp form fields
  const [formText, setFormText] = useState('');
  const [formType, setFormType] = useState<'choice' | 'drag_text' | 'drag_image_text' | 'table_match'>('choice');
  const [formExplanation, setFormExplanation] = useState('');
  const [formCorrectIndex, setFormCorrectIndex] = useState<number>(0);
  const [formGrade, setFormGrade] = useState<number | ''>('');

  // Choice inputs
  const [formOptionA, setFormOptionA] = useState('');
  const [formOptionB, setFormOptionB] = useState('');
  const [formOptionC, setFormOptionC] = useState('');
  const [formOptionD, setFormOptionD] = useState('');

  // Drag Left items
  const [formLeftA, setFormLeftA] = useState('');
  const [formLeftB, setFormLeftB] = useState('');
  const [formLeftC, setFormLeftC] = useState('');
  const [formLeftD, setFormLeftD] = useState('');

  // Drag Image items
  const [formImageA, setFormImageA] = useState('');
  const [formImageB, setFormImageB] = useState('');
  const [formImageC, setFormImageC] = useState('');
  const [formImageD, setFormImageD] = useState('');

  // Table Match configurations
  const [formTableHeaders, setFormTableHeaders] = useState<string[]>(['Nhập', 'Xuất']);
  const [formTableRows, setFormTableRows] = useState<string[]>(['Bàn phím', 'Scanner', 'Màn hình']);
  const [formTableCorrectAnswers, setFormTableCorrectAnswers] = useState<number[]>([0, 0, 1]);
  const [formTableFontSize, setFormTableFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [formTableWidth, setFormTableWidth] = useState<'compact' | 'normal' | 'wide'>('normal');

  // Custom confirmation modal states
  const [customConfirm, setCustomConfirm] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Custom alert states
  const [customAlert, setCustomAlert] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

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
    setTimeout(() => {
      setCustomAlert(prev => prev && prev.message === message ? null : prev);
    }, 4500);
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/questions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setQuestions(data.questions || []);
      } else {
        setErrorMsg(data.error || 'Không thể tải ngân hàng câu hỏi.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAdd = () => {
    setEditingQuestion(null);
    setFormText('');
    setFormType('choice');
    setFormExplanation('');
    setFormCorrectIndex(0);
    if (selectedGradeFilter !== 'all' && selectedGradeFilter !== 'unassigned') {
      setFormGrade(selectedGradeFilter);
    } else {
      setFormGrade('');
    }

    // Option defaults
    setFormOptionA('');
    setFormOptionB('');
    setFormOptionC('');
    setFormOptionD('');

    // Drag left defaults
    setFormLeftA('');
    setFormLeftB('');
    setFormLeftC('');
    setFormLeftD('');

    // Image defaults
    setFormImageA('');
    setFormImageB('');
    setFormImageC('');
    setFormImageD('');

    // TableMatch defaults
    setFormTableHeaders(['Nhập', 'Xuất']);
    setFormTableRows(['Bàn phím', 'Scanner', 'Màn hình']);
    setFormTableCorrectAnswers([0, 0, 1]);
    setFormTableFontSize('md');
    setFormTableWidth('normal');

    setShowEditor(true);
  };

  const handleStartEdit = (q: Question) => {
    setEditingQuestion(q);
    setFormText(q.text || '');
    setFormType(q.type || 'choice');
    setFormExplanation(q.explanation || '');
    setFormCorrectIndex(q.correctIndex !== undefined ? q.correctIndex : 0);
    setFormGrade(q.grade || '');

    // Populate standard options list
    setFormOptionA(q.options?.[0] || '');
    setFormOptionB(q.options?.[1] || '');
    setFormOptionC(q.options?.[2] || '');
    setFormOptionD(q.options?.[3] || '');

    // Populate Left Terms
    setFormLeftA(q.leftTerms?.[0] || '');
    setFormLeftB(q.leftTerms?.[1] || '');
    setFormLeftC(q.leftTerms?.[2] || '');
    setFormLeftD(q.leftTerms?.[3] || '');

    // Populate Left Images
    setFormImageA(q.leftImages?.[0] || '');
    setFormImageB(q.leftImages?.[1] || '');
    setFormImageC(q.leftImages?.[2] || '');
    setFormImageD(q.leftImages?.[3] || '');

    // Populate Custom Interactive Matrix states
    setFormTableHeaders(q.headers || ['Nhập', 'Xuất']);
    setFormTableRows(q.rows || ['Bàn phím', 'Scanner', 'Màn hình']);
    setFormTableCorrectAnswers(q.correctAnswers || [0, 0, 1]);
    setFormTableFontSize(q.tableFontSize || 'md');
    setFormTableWidth(q.tableWidth || 'normal');
    
    setShowEditor(true);
  };

  const handleDelete = (questionId: string) => {
    triggerConfirm(
      'Xác nhận xóa câu hỏi khỏi ngân hàng',
      'Bạn có thực sự chắc chắn muốn xóa câu hỏi này khỏi Ngân Hàng Đề không? Thao tác này sẽ cập nhật lại hệ thống chỉ số (qNum) của các câu hỏi đằng sau để giữ tính liên tục.',
      async () => {
        try {
          const response = await fetch('/api/questions/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ questionId })
          });
          const data = await response.json();
          if (data.success) {
            setQuestions(data.questions || []);
            setErrorMsg(null);
            triggerAlert('Đã xóa câu hỏi khỏi ngân hàng thành công!', 'success');
          } else {
            triggerAlert(data.error || 'Không thể xóa câu hỏi.', 'error');
          }
        } catch (err) {
          triggerAlert('Đã xảy ra lỗi kết nối máy chủ khi xóa.', 'error');
        }
      }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formText.trim()) {
      triggerAlert('Vui lòng nhập nội dung câu hỏi.', 'error');
      return;
    }

    if (formType !== 'table_match') {
      if (!formOptionA.trim() || !formOptionB.trim() || !formOptionC.trim() || !formOptionD.trim()) {
        triggerAlert('Vui lòng điền đầy đủ cả 4 phương án câu trả lời!', 'error');
        return;
      }
    } else {
      if (formTableHeaders.length === 0 || formTableRows.length === 0) {
        triggerAlert('Bảng tùy chỉnh phải có ít nhất 1 hàng và 1 cột!', 'error');
        return;
      }
      if (formTableHeaders.some(h => !h.trim()) || formTableRows.some(r => !r.trim())) {
        triggerAlert('Vui lòng nhập đầy đủ nội dung chữ cho tất cả các hàng và cột!', 'error');
        return;
      }
    }

    const qId = editingQuestion?.id || `q_bank_${Date.now()}`;
    const questionPayload: any = {
      id: qId,
      text: formText.trim(),
      type: formType,
      explanation: formExplanation.trim() || 'Đây là lý giải kiến thức chuẩn.',
    };

    if (formGrade !== '') {
      questionPayload.grade = Number(formGrade);
    }

    if (formType === 'choice') {
      questionPayload.options = [formOptionA.trim(), formOptionB.trim(), formOptionC.trim(), formOptionD.trim()];
      questionPayload.correctIndex = Number(formCorrectIndex);
    } else if (formType === 'drag_text') {
      questionPayload.options = [formOptionA.trim(), formOptionB.trim(), formOptionC.trim(), formOptionD.trim()];
      questionPayload.leftTerms = [formLeftA.trim(), formLeftB.trim(), formLeftC.trim(), formLeftD.trim()];
      questionPayload.correctIndex = Number(formCorrectIndex);
    } else if (formType === 'drag_image_text') {
      questionPayload.options = [formOptionA.trim(), formOptionB.trim(), formOptionC.trim(), formOptionD.trim()];
      questionPayload.leftImages = [formImageA.trim(), formImageB.trim(), formImageC.trim(), formImageD.trim()];
      questionPayload.correctIndex = Number(formCorrectIndex);
    } else if (formType === 'table_match') {
      questionPayload.headers = formTableHeaders.map(h => h.trim());
      questionPayload.rows = formTableRows.map(r => r.trim());
      questionPayload.correctAnswers = formTableCorrectAnswers;
      questionPayload.tableFontSize = formTableFontSize;
      questionPayload.tableWidth = formTableWidth;
      questionPayload.options = [];
      questionPayload.correctIndex = 0;
    }

    try {
      const response = await fetch('/api/questions/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: questionPayload })
      });
      const data = await response.json();
      if (data.success) {
        setQuestions(data.questions || []);
        setShowEditor(false);
        setEditingQuestion(null);
        setErrorMsg(null);
        triggerAlert('Đã lưu dữ liệu câu hỏi vào ngân hàng đề thành công!', 'success');
      } else {
        triggerAlert(data.error || 'Lỗi lưu câu hỏi.', 'error');
      }
    } catch (err) {
      triggerAlert('Lỗi kết nối khi gửi dữ liệu.', 'error');
    }
  };

  const getTypeName = (t?: string) => {
    switch (t) {
      case 'choice': return 'Trắc nghiệm chọn 1 đáp án';
      case 'drag_text': return 'Kéo thả chữ ghép cặp';
      case 'drag_image_text': return 'Kéo thả hình ghép cặp';
      case 'table_match': return 'Ghép lưới (Bảng nối cột)';
      default: return 'Trắc nghiệm';
    }
  };

  // Filter logic
  const filteredQuestions = questions.filter(q => {
    if (selectedGradeFilter !== 'all') {
      if (selectedGradeFilter === 'unassigned') {
        if (q.grade !== undefined && q.grade !== null && q.grade !== 0 && q.grade !== '') {
          return false;
        }
      } else {
        if (q.grade !== selectedGradeFilter) {
          return false;
        }
      }
    }
    return (q.text || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
           ((q.explanation || '').toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const gradeTabs: { value: 'all' | 3 | 4 | 5 | 6 | 7 | 8 | 'unassigned'; label: string; count: number }[] = [
    { value: 'all', label: 'Tất cả', count: questions.length },
    { value: 3, label: 'Khối 3', count: questions.filter(q => q.grade === 3).length },
    { value: 4, label: 'Khối 4', count: questions.filter(q => q.grade === 4).length },
    { value: 5, label: 'Khối 5', count: questions.filter(q => q.grade === 5).length },
    { value: 6, label: 'Khối 6', count: questions.filter(q => q.grade === 6).length },
    { value: 7, label: 'Khối 7', count: questions.filter(q => q.grade === 7).length },
    { value: 8, label: 'Khối 8', count: questions.filter(q => q.grade === 8).length },
    { value: 'unassigned', label: 'Chưa phân lớp', count: questions.filter(q => !q.grade).length },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-600 animate-pulse" />
            Ngân Hàng Đề Thi & Câu Hỏi Trung Tâm 🗄️
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-0.5 max-w-2xl">
            Tổng hợp toàn bộ các câu hỏi có sẵn trong hệ thống (từ Câu 1 đến câu {questions.length}). 
            Khi bạn tạo hoặc chỉnh sửa đề ôn tập, các câu hỏi sẽ được liên kết trực tiếp từ Ngân hàng đề trung tâm này.
          </p>
        </div>
        
        <button
          onClick={handleStartAdd}
          className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Thêm câu hỏi mới ({selectedGradeFilter !== 'all' && selectedGradeFilter !== 'unassigned' ? `Khối ${selectedGradeFilter}` : 'Ngân hàng'})
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-red-600 text-xs font-bold">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* GRADE TABS DIVISION SELECTOR */}
      <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-5 shadow-xs space-y-3">
        <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 pr-2">
          <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
          Lọc câu hỏi ôn tập theo khối lớp:
        </span>
        <div className="flex flex-wrap gap-2">
          {gradeTabs.map(tab => {
            const isActive = selectedGradeFilter === tab.value;
            return (
              <button
                key={tab.value.toString()}
                onClick={() => setSelectedGradeFilter(tab.value)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border-2 ${
                  isActive
                    ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-205 text-slate-600'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-purple-800 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SEARCH AND FILTER WORKBAR */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 p-3.5 rounded-[2rem] border-2 border-slate-100">
        <div className="md:col-span-10 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <input 
            type="text" 
            placeholder="Tìm kiếm câu hỏi hay đáp án..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200/80 rounded-2xl text-xs font-semibold focus:border-purple-400 focus:outline-none focus:ring-0"
          />
        </div>

        <div className="md:col-span-2 flex items-center justify-end text-xs font-bold text-purple-700 bg-purple-50 px-4 py-2 rounded-2xl border border-purple-100">
          Kết quả: {filteredQuestions.length} câu
        </div>
      </div>

      {/* MODAL EDITOR FORM */}
      {showEditor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] border-4 border-purple-650 max-w-2xl w-full p-6 md:p-8 shadow-2xl space-y-6 text-left max-h-[90vh] overflow-y-auto scrollbar-none"
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-purple-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-600" />
                {editingQuestion ? `Chỉnh sửa Câu Hỏi số ${editingQuestion.qNum}` : 'Thêm Câu Hỏi Mới vào Ngân Hàng'}
              </h3>
              <button 
                onClick={() => { setShowEditor(false); setEditingQuestion(null); }}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Type and hint description */}
              <div className="bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">Dạng câu hỏi ôn tập:</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                  >
                    <option value="choice">🔘 Trắc nghiệm chọn đáp án (Chọn 1 trong 4)</option>
                    <option value="drag_text">🔀 Kéo thả khớp chữ (Trái chữ - Phải chữ)</option>
                    <option value="drag_image_text">🖼️ Kéo thả khớp hình ảnh (Trái hình - Phải chữ)</option>
                    <option value="table_match">📊 Ghép nối bảng (Tùy chỉnh hàng, cột & click trỏ chuột)</option>
                  </select>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                  {formType === 'choice' && '✓ Học sinh sẽ được chọn một trong 4 phương án liệt kê bên dưới.'}
                  {formType === 'drag_text' && '✓ Lướt kéo thả để ghép khớp cặp chữ cột bên trái với định nghĩa cột bên phải.'}
                  {formType === 'drag_image_text' && '✓ Học sinh sẽ thực hiện kéo thả các nhãn chữ khớp vào hình ảnh bên trái tương ứng.'}
                  {formType === 'table_match' && '✓ Bảng thông tin hỏi đáp đa chiều: Giáo viên có thể tự do thêm bớt cột, hàng, tùy chỉnh chữ và click để cấu hình đáp án đúng trực tếp.'}
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700">Nội dung câu hỏi (Đề bài):</label>
                <textarea
                  required
                  rows={2}
                  value={formText}
                  onChange={e => setFormText(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi hoặc hướng dẫn làm bài..."
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:border-purple-400 focus:outline-none"
                />
              </div>

              {/* RENDER DYNAMIC FIELD DETAILS BASED ON TYPE */}
              {formType === 'choice' && (
                <div className="space-y-4 bg-purple-50/50 p-5 rounded-2xl border border-purple-100">
                  <span className="text-xs font-black text-purple-900 block mb-1">Cấu hình các đáp án trắc nghiệm:</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 block flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="correct-choice-index"
                          checked={formCorrectIndex === 0}
                          onChange={() => setFormCorrectIndex(0)}
                          className="w-3.5 h-3.5 text-purple-600 focus:ring-0"
                        />
                        <span className="w-5 h-5 bg-sky-100 text-sky-800 text-[9px] font-black rounded-lg flex items-center justify-center border border-sky-200">A</span>
                        Phương án A:
                      </label>
                      <input
                        type="text"
                        required
                        value={formOptionA}
                        onChange={e => setFormOptionA(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-400"
                        placeholder="Có thể cắm thiết bị lưu trữ flash USB..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 block flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="correct-choice-index"
                          checked={formCorrectIndex === 1}
                          onChange={() => setFormCorrectIndex(1)}
                          className="w-3.5 h-3.5 text-purple-600 focus:ring-0"
                        />
                        <span className="w-5 h-5 bg-sky-100 text-sky-800 text-[9px] font-black rounded-lg flex items-center justify-center border border-sky-200">B</span>
                        Phương án B:
                      </label>
                      <input
                        type="text"
                        required
                        value={formOptionB}
                        onChange={e => setFormOptionB(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-400"
                        placeholder="Nội dung đáp án B..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 block flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="correct-choice-index"
                          checked={formCorrectIndex === 2}
                          onChange={() => setFormCorrectIndex(2)}
                          className="w-3.5 h-3.5 text-purple-600 focus:ring-0"
                        />
                        <span className="w-5 h-5 bg-sky-100 text-sky-800 text-[9px] font-black rounded-lg flex items-center justify-center border border-sky-200">C</span>
                        Phương án C:
                      </label>
                      <input
                        type="text"
                        required
                        value={formOptionC}
                        onChange={e => setFormOptionC(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-400"
                        placeholder="Nội dung đáp án C..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 block flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="correct-choice-index"
                          checked={formCorrectIndex === 3}
                          onChange={() => setFormCorrectIndex(3)}
                          className="w-3.5 h-3.5 text-purple-600 focus:ring-0"
                        />
                        <span className="w-5 h-5 bg-sky-100 text-sky-800 text-[9px] font-black rounded-lg flex items-center justify-center border border-sky-200">D</span>
                        Phương án D:
                      </label>
                      <input
                        type="text"
                        required
                        value={formOptionD}
                        onChange={e => setFormOptionD(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-400"
                        placeholder="Nội dung đáp án D..."
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-purple-700 font-bold block mt-1">💡 Hãy tích chọn chấm tròn ở đáp án chính xác nhất để hệ thống nhận diện.</span>
                </div>
              )}

              {formType === 'drag_text' && (
                <div className="space-y-4 bg-purple-50/50 p-5 rounded-2xl border border-purple-100">
                  <span className="text-xs font-black text-purple-900 block">Cấu hình Kéo thả Khớp các Cặp Chữ:</span>
                  <p className="text-[10px] font-bold text-slate-400 italic">Thực hiện ghép vế Trái khớp với định nghĩa vế Phải tương ứng. Hệ thống sẽ tự đảo ngẫu nhiên khi hiển thị.</p>
                  
                  <div className="grid grid-cols-2 gap-3 pb-1 border-b border-dashed border-slate-200">
                    <span className="text-[11px] font-black text-purple-800">Từ Khóa Vế Trái (Cố định)</span>
                    <span className="text-[11px] font-black text-blue-800">Nhãn Khớp Vế Phải (Kéo thả)</span>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: RAM"
                        value={formLeftA}
                        onChange={e => setFormLeftA(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-500"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Khớp: Bộ nhớ truy cập ngẫu nhiên"
                        value={formOptionA}
                        onChange={e => setFormOptionA(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: ROM"
                        value={formLeftB}
                        onChange={e => setFormLeftB(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-500"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Khớp: Bộ nhớ chỉ đọc dữ liệu"
                        value={formOptionB}
                        onChange={e => setFormOptionB(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: CPU"
                        value={formLeftC}
                        onChange={e => setFormLeftC(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-500"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Khớp: Bộ điều khiển xử lý trung tâm"
                        value={formOptionC}
                        onChange={e => setFormOptionC(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: SSD"
                        value={formLeftD}
                        onChange={e => setFormLeftD(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-500"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Khớp: Ổ đĩa cứng thể rắn tốc độ cao"
                        value={formOptionD}
                        onChange={e => setFormOptionD(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formType === 'drag_image_text' && (
                <div className="space-y-4 bg-purple-50/50 p-5 rounded-2xl border border-purple-100">
                  <span className="text-xs font-black text-purple-900 block">Cấu hình Kéo thả Khớp Ảnh - Chữ:</span>
                  <p className="text-[10px] font-bold text-slate-400 italic">Nhập đường dẫn hình ảnh cột vế Trái khớp với đáp án chữ vế Phải tương ứng.</p>
                  
                  <div className="grid grid-cols-2 gap-3 pb-1 border-b border-dashed border-slate-200">
                    <span className="text-[11px] font-black text-purple-800">Đường dẫn ảnh Trái (Link URL)</span>
                    <span className="text-[11px] font-black text-blue-800">Nhãn Khớp Chữ Phải</span>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="/favicon.png hoặc URL ảnh..."
                        value={formImageA}
                        onChange={e => setFormImageA(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-500"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Nhãn khớp: e.g. Thùng rác máy tính"
                        value={formOptionA}
                        onChange={e => setFormOptionA(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="URL hình ảnh B..."
                        value={formImageB}
                        onChange={e => setFormImageB(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-500"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Nhãn khớp B"
                        value={formOptionB}
                        onChange={e => setFormOptionB(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="URL hình ảnh C..."
                        value={formImageC}
                        onChange={e => setFormImageC(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-500"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Nhãn khớp C"
                        value={formOptionC}
                        onChange={e => setFormOptionC(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="URL hình ảnh D..."
                        value={formImageD}
                        onChange={e => setFormImageD(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-500"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Nhãn khớp D"
                        value={formOptionD}
                        onChange={e => setFormOptionD(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formType === 'table_match' && (
                <div className="space-y-4 bg-purple-50/50 p-5 rounded-2xl border border-purple-100">
                  <span className="text-xs font-black text-purple-900 block">Cấu hình Bảng nối cột (Lưới khớp ô):</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-3.5 rounded-2xl border border-slate-150">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-700">Cỡ chữ trong bảng:</label>
                      <select
                        value={formTableFontSize}
                        onChange={e => setFormTableFontSize(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold"
                      >
                        <option value="sm">🔎 Nhỏ (sm) - Nhiều chữ</option>
                        <option value="md">👁️ Vừa (md) - Chuẩn mặc định</option>
                        <option value="lg">🔍 Lớn (lg) - Tiêu đề ngắn</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-700">Độ rộng bảng:</label>
                      <select
                        value={formTableWidth}
                        onChange={e => setFormTableWidth(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold"
                      >
                        <option value="compact">📱 Gọn gàng (Compact)</option>
                        <option value="normal">💻 Bình thường (Normal)</option>
                        <option value="wide">🖥️ Rộng rãi (Wide)</option>
                      </select>
                    </div>
                  </div>

                  {/* Column headers editing */}
                  <div className="p-4 bg-white rounded-2xl border border-purple-200 space-y-3">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs font-black text-purple-950 block">Danh sách các CỘT ({formTableHeaders.length})</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormTableHeaders(prev => [...prev, `Cột mới ${prev.length + 1}`]);
                        }}
                        className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10px] uppercase rounded-lg shadow-sm"
                      >
                        ➕ Thêm cột
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {formTableHeaders.map((header, colIdx) => (
                        <div key={colIdx} className="flex items-center gap-1.5 p-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[9px] font-black text-purple-700 shrink-0 bg-white border w-5 h-5 rounded-md flex items-center justify-center">
                            C{colIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={header}
                            required
                            placeholder={`Cột ${colIdx + 1}`}
                            onChange={e => {
                              const val = e.target.value;
                              setFormTableHeaders(prev => prev.map((h, idx) => idx === colIdx ? val : h));
                            }}
                            className="w-full bg-transparent font-bold text-xs text-slate-800 focus:outline-none"
                          />
                          {formTableHeaders.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (formTableHeaders.length <= 1) return;
                                setFormTableHeaders(prev => prev.filter((_, idx) => idx !== colIdx));
                                setFormTableCorrectAnswers(prev => prev.map(correctCol => {
                                  if (correctCol === colIdx) return 0;
                                  if (correctCol > colIdx) return correctCol - 1;
                                  return correctCol;
                                }));
                              }}
                              className="text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rows Matrix rendering with clickable cells */}
                  <div className="p-4 bg-white rounded-2xl border border-sky-100 space-y-3">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs font-black text-purple-950 block">Danh sách các HÀNG & Click trỏ đáp án đúng ({formTableRows.length})</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormTableRows(prev => [...prev, `Hàng mới ${prev.length + 1}`]);
                          setFormTableCorrectAnswers(prev => [...prev, 0]);
                        }}
                        className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-[10px] uppercase rounded-lg shadow-sm"
                      >
                        ➕ Thêm hàng
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                      <table className="w-full text-xs font-bold text-slate-700 border-collapse table-fixed">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-150">
                            <th className="p-2 text-left text-slate-500 w-[50%]">Hàng hỏi / Nhãn mô tả</th>
                            {formTableHeaders.map((header, colIdx) => (
                              <th key={colIdx} className="p-2 text-center text-slate-500 text-[10px] uppercase truncate border-l border-slate-100">
                                {header || `Cột ${colIdx + 1}`}
                              </th>
                            ))}
                            <th className="p-2 text-center text-slate-500 w-12 border-l border-slate-100">Xóa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formTableRows.map((rowText, rowIdx) => (
                            <tr key={rowIdx} className="border-b last:border-0 hover:bg-slate-50/40">
                              <td className="p-2">
                                <div className="flex items-center gap-1.5">
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
                                      setFormTableRows(prev => prev.map((r, idx) => idx === rowIdx ? val : r));
                                    }}
                                    className="w-full bg-slate-100/50 p-1 px-2 focus:bg-white border border-slate-200 focus:border-purple-400 rounded-lg text-xs font-extrabold focus:outline-none"
                                  />
                                </div>
                              </td>

                              {formTableHeaders.map((_, colIdx) => {
                                const isChecked = formTableCorrectAnswers[rowIdx] === colIdx;
                                return (
                                  <td key={colIdx} className="p-2 text-center border-l border-slate-100">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormTableCorrectAnswers(prev => prev.map((ans, idx) => idx === rowIdx ? colIdx : ans));
                                      }}
                                      className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-slate-250 hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all mx-auto focus:outline-none"
                                    >
                                      <div className={`w-3.5 h-3.5 rounded-full transition-all flex items-center justify-center ${
                                        isChecked ? 'bg-purple-600 scale-110' : 'bg-transparent border border-slate-300'
                                      }`}>
                                        {isChecked && <div className="w-1 h-1 bg-white rounded-full" />}
                                      </div>
                                    </button>
                                  </td>
                                );
                              })}

                              <td className="p-2 text-center border-l border-slate-100">
                                {formTableRows.length > 1 ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (formTableRows.length <= 1) return;
                                      setFormTableRows(prev => prev.filter((_, idx) => idx !== rowIdx));
                                      setFormTableCorrectAnswers(prev => prev.filter((_, idx) => idx !== rowIdx));
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

              {/* Grade Selection */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700">Khối lớp (Phân loại câu hỏi):</label>
                <select
                  value={formGrade}
                  onChange={e => setFormGrade(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition-all focus:outline-none focus:border-purple-500"
                >
                  <option value="">Chưa phân lớp</option>
                  <option value="3">Khối lớp 3</option>
                  <option value="4">Khối lớp 4</option>
                  <option value="5">Khối lớp 5</option>
                  <option value="6">Khối lớp 6</option>
                  <option value="7">Khối lớp 7</option>
                  <option value="8">Khối lớp 8</option>
                </select>
              </div>

              {/* Guide and Explanations */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700">Lời giải chi tiết (Hướng dẫn giải):</label>
                <textarea
                  rows={2}
                  value={formExplanation}
                  onChange={e => setFormExplanation(e.target.value)}
                  placeholder="Giải thích rõ kiến thức tại sao đáp án này là đúng..."
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:border-purple-400 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowEditor(false); setEditingQuestion(null); }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  Lưu Lại
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* RENDER THE MAJESTIC BASE LIST OF PORTFOLIO QUESTIONS */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-400">Đang tải Ngân Hàng Câu Hỏi... Vui lòng đợi</span>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="bg-white p-16 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center space-y-3">
          <Database className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-slate-700 font-extrabold text-sm">Không tìm thấy câu hỏi phù hợp</h4>
          <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto">
            Không có câu hỏi nào khớp với từ khóa tìm kiếm bạn nhập. Thử thay đổi từ khóa nhé!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredQuestions.map((q, idx) => {
            return (
              <motion.div
                key={q.id}
                layoutId={`q_card_${q.id}`}
                className="bg-white border-2 border-slate-100 hover:border-purple-300 p-5 rounded-[2rem] shadow-xs relative hover:shadow-md transition-all flex flex-col md:flex-row gap-4 items-start"
              >
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Câu số {q.qNum}
                    </span>

                    <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-full border border-slate-200">
                      Loại: {getTypeName(q.type)}
                    </span>

                    {q.grade ? (
                      <span className="bg-sky-100 text-sky-800 text-[10px] font-black px-2.5 py-1 rounded-full border border-sky-200">
                        Khối Lớp {q.grade}
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2.5 py-1 rounded-full border border-slate-200 uppercase">
                        Chưa phân lớp
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-black text-slate-800 leading-relaxed">
                    {q.text}
                  </div>

                  {/* Options List Preview */}
                  {q.type !== 'table_match' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                      {q.options && q.options.map((opt, oIdx) => {
                        const isCorrect = oIdx === q.correctIndex;
                        const leftConcept = q.type === 'drag_text' ? q.leftTerms?.[oIdx] : q.type === 'drag_image_text' ? q.leftImages?.[oIdx] : null;

                        return (
                          <div 
                            key={oIdx} 
                            className={`text-[11px] font-bold p-2.5 rounded-xl border flex flex-col gap-1.5 ${
                              isCorrect 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-inner' 
                                : 'bg-slate-50 text-slate-500 border-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[9px] px-1.5 py-0.5 rounded-md bg-stone-100 border border-stone-200 select-none">
                                {oIdx + 1}
                              </span>
                              {leftConcept && (
                                <span className="bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] text-[9.5px] px-1.5 py-0.5 rounded-[6px] font-black shrink-0 max-w-[130px] truncate" title={leftConcept}>
                                  {leftConcept}
                                </span>
                              )}
                              <span className="line-clamp-2 pl-0.5 flex-1">{opt}</span>
                              {isCorrect && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100 text-[10px] font-semibold space-y-1.5 pl-4">
                      <span className="text-purple-900 font-extrabold block">Bảng liên kết các ô:</span>
                      <div className="flex flex-col gap-1 text-slate-600">
                        <div><strong className="text-slate-800">Cột phân loại:</strong> {q.headers?.join(' | ')}</div>
                        <div><strong className="text-slate-800">Hàng nội dung:</strong> {q.rows?.join(' | ')}</div>
                        <div className="text-emerald-700 font-bold">🎯 Đáp án đúng (vị trí tương ứng): {q.correctAnswers?.join(', ')}</div>
                      </div>
                    </div>
                  )}

                  {q.explanation && (
                    <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-3.5 flex items-start gap-2 text-[10px] font-bold text-amber-900 leading-normal">
                      <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-800">Giải thích chỉ dẫn:</strong> {q.explanation}
                      </div>
                    </div>
                  )}
                </div>

                {/* Operations Control Box */}
                <div className="flex md:flex-col gap-2 shrink-0 w-full md:w-auto items-end justify-end md:justify-start">
                  <button
                    onClick={() => handleStartEdit(q)}
                    className="p-2.5 bg-slate-100 hover:bg-purple-100 hover:text-purple-900 text-slate-500 rounded-xl cursor-pointer border border-transparent hover:border-purple-200 transition-all text-xs font-black flex items-center gap-1.5 w-full md:w-auto justify-center"
                    title="Chỉnh sửa câu hỏi này"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span className="md:hidden animate-pulse">Sửa</span>
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl cursor-pointer border border-transparent hover:border-rose-200 transition-all text-xs font-black flex items-center gap-1.5 w-full md:w-auto justify-center"
                    title="Xóa khỏi ngân hàng"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="md:hidden">Xóa</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CUSTOM CONFIRM MODAL */}
      <AnimatePresence>
        {customConfirm && customConfirm.show && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] border-4 border-rose-500 max-w-md w-full p-6 shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-600">
                <Trash2 className="w-6 h-6 animate-bounce" />
              </div>
              <h3 className="text-base font-black text-slate-800">{customConfirm.title}</h3>
              <p className="text-xs font-bold text-slate-400 leading-normal">{customConfirm.message}</p>
              <div className="flex justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomConfirm(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={customConfirm.onConfirm}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl cursor-pointer shadow-xs"
                >
                  Xác nhận xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM ALERT POPUP */}
      <AnimatePresence>
        {customAlert && customAlert.show && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white font-bold text-xs border border-white/20 ${
              customAlert.type === 'success'
                ? 'bg-emerald-600 shadow-emerald-500/20'
                : customAlert.type === 'error'
                  ? 'bg-rose-600 shadow-rose-500/20'
                  : 'bg-purple-600 shadow-purple-500/20'
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
