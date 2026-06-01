import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  Download, 
  Calendar, 
  HardDrive, 
  AlertCircle,
  FileCode,
  FileSpreadsheet,
  Image,
  Sparkles,
  CheckCircle2,
  Bookmark,
  ChevronDown
} from 'lucide-react';
import { UserFile } from '../types';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../lib/firebase';

interface FileStorageViewProps {
  token: string;
  user?: {
    id: string;
    username: string;
    nickname: string;
    grade?: number;
    classroom?: string;
    role?: 'student' | 'teacher' | 'admin';
  };
}

export default function FileStorageView({ token, user }: FileStorageViewProps) {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default target grade for upload
  const [targetGrade, setTargetGrade] = useState<'all' | number>('all');

  const isEducator = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    fetchFiles();
  }, [token]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/files', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Không thể lấy danh sách tệp.');
      setFiles(data.files || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Limit size check: 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setError('Dung lượng tệp tin quá lớn! Vui lòng chọn tệp nhỏ hơn 5MB.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    if (isFirebaseConfigured && storage) {
      // Direct Firebase Storage upload
      try {
        const storagePath = `users/files/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadResult = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(uploadResult.ref);

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            fileSize: file.size,
            downloadUrl,
            storagePath,
            grade: targetGrade
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Lưu thông tin tệp thất bại.');

        setSuccessMsg(`Tải tài liệu "${file.name}" cho Khối lớp ${targetGrade === 'all' ? 'Tất cả' : targetGrade} thành công lên Firebase Storage! ✨`);
        fetchFiles();
      } catch (err: any) {
        setError(err.message || 'Lỗi khi đồng bộ tệp lên Firebase.');
      } finally {
        setUploading(false);
      }
    } else {
      // Local fallback Base64 upload
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Content = reader.result as string;
          const response = await fetch('/api/files/upload', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type || 'application/octet-stream',
              fileData: base64Content,
              grade: targetGrade
            })
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Tải tệp tin thất bại.');

          setSuccessMsg(`Tải tài liệu "${file.name}" cho Lớp ${targetGrade === 'all' ? 'Chung' : targetGrade} thành công! ✨`);
          fetchFiles();
        } catch (err: any) {
          setError(err.message);
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setError('Lỗi khi đọc dữ liệu tệp.');
        setUploading(false);
      };

      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async (fileId: string, fileName: string, storagePath?: string) => {
    if (!window.confirm(`Thầy/Cô có chắc chắn muốn xóa tài liệu "${fileName}" không?`)) {
      return;
    }

    try {
      if (storagePath && isFirebaseConfigured && storage) {
        try {
          const fileRef = ref(storage, storagePath);
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.warn('Lỗi khi xóa tệp trên Firebase Storage:', storageErr);
        }
      }

      const resp = await fetch(`/api/files/delete/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      
      if (!resp.ok) throw new Error(data.error || 'Xóa tệp thất bại.');
      
      setSuccessMsg(`Đã xóa tệp "${fileName}" thành công! ✨`);
      setFiles(files.filter(f => f.id !== fileId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <Image className="w-6 h-6 text-indigo-500" />;
    if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return <FileSpreadsheet className="w-6 h-6 text-emerald-500" />;
    if (mime.includes('pdf') || mime.includes('word') || mime.includes('text')) return <FileText className="w-6 h-6 text-sky-500" />;
    return <FileCode className="w-6 h-6 text-slate-500" />;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto font-sans">
      
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-linear-to-r from-slate-50 to-indigo-50/20 p-6 rounded-3xl border border-slate-100">
        <div>
          <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600 block mb-1">
            {isEducator ? 'ĐỐI VỚI GIÁO VIÊN' : 'TÀI LIỆU HỌC TẬP'}
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Học Liệu & Tài Bản Mềm 📚🗄️
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            {isEducator 
              ? 'Tải lên tài liệu tham khảo, bài ôn tập và đề thi bổ trợ được phân loại cụ thể theo từng khối lớp.'
              : `Các tài liệu bổ trợ kiến thức ôn tập chuẩn định dạng IC3 dành riêng cho khối Lớp ${user?.grade || 'của em'}.`}
          </p>
        </div>
        {/* Status badge removed for a cleaner UI */}
      </div>

      {/* Greeting Banner for Students only */}
      {!isEducator && (
        <div className="mb-6 p-5 bg-linear-to-r from-indigo-500 to-sky-500 rounded-3xl text-white shadow-md relative overflow-hidden flex items-center gap-4">
          <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="text-3xl animate-bounce select-none shrink-0">
            🦛
          </div>
          <div>
            <h3 className="font-extrabold text-base md:text-lg mb-0.5">
              Chào em học sinh Lớp {user?.grade}! ✨
            </h3>
            <p className="text-xs font-medium text-indigo-50/90 leading-relaxed">
              Dưới đây là các tài liệu ôn luyện bổ ích, bài tập phát triển tư duy chuẩn IC3 được Thầy/Cô chuẩn bị riêng cho em. Hãy bấm nút tải về để bắt đầu buổi tự học ngay nhé!
            </p>
          </div>
        </div>
      )}

      {/* Upload area for TEACHERS and ADMINS only */}
      {isEducator && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm mb-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-500" />
                Tải Lên Học Liệu Mới 🖥️
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Chọn khối lớp đích để học sinh dễ dàng tìm kiếm tài liệu tương ứng.</p>
            </div>
            
            {/* Target Grade Selector */}
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/60 w-full sm:w-auto">
              <span className="text-[10px] font-black text-indigo-600 block pl-2 shrink-0">BỐ TRÍ CHO:</span>
              <select
                value={targetGrade === 'all' ? 'all' : targetGrade}
                onChange={(e) => setTargetGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-white px-3 py-1.5 rounded-xl text-xs font-black text-slate-700 border border-slate-200 outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="all">Tất cả các lớp</option>
                <option value="3">Học sinh Lớp 3</option>
                <option value="4">Học sinh Lớp 4</option>
                <option value="5">Học sinh Lớp 5</option>
                <option value="6">Học sinh Lớp 6</option>
                <option value="7">Học sinh Lớp 7</option>
                <option value="8">Học sinh Lớp 8</option>
              </select>
            </div>
          </div>

          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`bg-slate-50/50 rounded-2xl border-2 border-dashed p-6 md:p-10 text-center transition-all relative ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-50/40 scale-[0.99]' 
                : 'border-slate-300 hover:border-indigo-400'
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              onChange={handleFileChange}
              className="hidden" 
            />
            
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-indigo-50 rounded-full text-indigo-600 relative">
                <UploadCloud className="w-10 h-10 animate-pulse" />
                <Sparkles className="absolute top-1 right-1 w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-base font-extrabold text-slate-800">Kéo và thả tài liệu vào vùng này</p>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">Hệ thống chấp nhận file định dạng PDF, Excel, Word, Hình ảnh, Tệp văn bản...</p>
              </div>

              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-2xl transition-all cursor-pointer shadow-md shadow-indigo-100"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Chọn tệp tài liệu từ máy tính 📁'
                )}
              </button>
              
              <span className="text-[10px] font-black text-slate-300 block">DUNG LƯỢNG CHO PHÉP TỐI ĐA: 5MB</span>
            </div>
          </div>
        </div>
      )}

      {/* Success / Error alerts */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-start gap-3 bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-2xl mb-6 text-sm font-semibold"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-start gap-3 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 p-4 rounded-2xl mb-6 text-sm font-semibold"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Files List display */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <HardDrive className="w-5 h-5 text-slate-400" />
          {isEducator 
            ? `Tổng số học liệu lưu trữ (${files.length} tệp)` 
            : `Tài liệu ôn luyện dành cho em (${files.length} tệp)`}
        </h3>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm font-medium">
            <div className="w-8 h-8 border-4 border-slate-300 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
            Đang tải danh sách tài liệu...
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-sm font-semibold text-slate-400">
            🦛 Hiện tại chưa có tài liệu nào thuộc khối lớp này được đưa lên. Hãy trò chuyện với Thầy/Cô giáo nhé!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map((file) => {
              const fileGrade = (file as any).grade;
              return (
                <motion.div
                  key={file.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl border-2 border-slate-100 p-4 md:p-5 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden"
                >
                  <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl shrink-0">
                      {getFileIcon(file.fileType)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-bold text-slate-900 text-sm truncate max-w-[200px] sm:max-w-[240px]" title={file.fileName}>
                          {file.fileName}
                        </h4>
                        
                        {/* Grade identifier tags & badges */}
                        {fileGrade === 'all' || !fileGrade ? (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600 shrink-0">
                            Chung tất cả
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                            Khối lớp {fileGrade}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(file.uploadedAt).toLocaleDateString('vi-VN')}
                        </span>
                        <span>•</span>
                        <span className="text-[11px]">{formatBytes(file.fileSize)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                    <a
                      href={`/api/files/download/${file.id}?token=${token}`}
                      download={file.fileName}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-2xl transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Tải về tài liệu"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải về</span>
                    </a>

                    {isEducator && (
                      <button
                        onClick={() => handleDelete(file.id, file.fileName, file.storagePath)}
                        className="p-2 sm:p-2.5 hover:bg-red-50 text-red-500 rounded-2xl hover:scale-105 transition-all cursor-pointer border border-transparent hover:border-red-100"
                        title="Xóa tài liệu khỏi hệ thống"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
