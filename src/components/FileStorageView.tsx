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
  CheckCircle2
} from 'lucide-react';
import { UserFile } from '../types';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../lib/firebase';

interface FileStorageViewProps {
  token: string;
}

export default function FileStorageView({ token }: FileStorageViewProps) {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Limit size check: e.g., 5MB limit
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
            storagePath
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Lưu thông tin tệp thất bại.');

        setSuccessMsg(`Tải tệp "${file.name}" lên Firebase Storage thành công! ✨`);
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
              fileData: base64Content
            })
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Tải tệp tin thất bại.');

          setSuccessMsg(`Tải tệp "${file.name}" thành công! ✨`);
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
    if (!window.confirm(`Em có chắc chắn muốn xóa tài liệu "${fileName}" không?`)) {
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
    <div className="p-6 max-w-4xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight flex items-center gap-2">
            Hộp Tài Liệu Học Tập 🗄️
          </h2>
          <p className="text-sm font-semibold text-slate-500">
            Nơi cất giữ bài tập làm văn, chứng nhận IC3, sơ đồ tư duy hoặc tài liệu của riêng em!
          </p>
        </div>
        <div>
          {isFirebaseConfigured ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Đã kết nối Firebase Storage ☁️
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200" title="Chưa có cấu hình Firebase Storage trong tệp .env">
              Lưu trữ Offline (Local Storage) 🗄️
            </span>
          )}
        </div>
      </div>

      {/* Upload Drag, Drop and Click Box */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`bg-white rounded-3xl border-4 border-dashed p-8 text-center transition-all relative ${
          dragActive 
            ? 'border-orange-500 bg-orange-50/50 scale-[0.99]' 
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          onChange={handleFileChange}
          className="hidden" 
        />
        
        <div className="flex flex-col items-center space-y-3">
          <div className="p-4 bg-orange-100 rounded-full text-orange-600 relative">
            <UploadCloud className="w-10 h-10 animate-pulse" />
            <Sparkles className="absolute top-1 right-1 w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-base font-extrabold text-slate-800">Kéo và thả tệp tài liệu của em vào đây</p>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Hoặc bấm nút phía dưới để tìm kiếm tệp trên máy tính</p>
          </div>

          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm rounded-2xl transition-all cursor-pointer shadow-md shadow-orange-100"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            ) : (
              'Chọn tệp từ máy tính 📁'
            )}
          </button>
          
          <span className="text-[10px] font-bold text-slate-300 block">DUNG LƯỢNG CHO PHÉP TỐI ĐA: 5MB</span>
        </div>
      </div>

      {/* Success / Error Toast Notification Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-start gap-3 bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-2xl mt-5 text-sm font-semibold"
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
            className="flex items-start gap-3 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 p-4 rounded-2xl mt-5 text-sm font-semibold animate-pulse"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Files List Display area */}
      <div className="mt-8 space-y-4">
        <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-1.5">
          <HardDrive className="w-5 h-5 text-slate-400" />
          Kho lưu trữ tệp của riêng em ({files.length} tệp)
        </h3>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm font-medium">
            <div className="w-8 h-8 border-4 border-slate-300 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
            Đang tìm kiếm tệp tài liệu...
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-sm font-semibold text-slate-400">
            🦛 Hòm tài liệu rỗng tuếch! Em chưa tải lên tệp tin nào cả.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map((file) => (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-3xl border-2 border-slate-100 p-5 shadow-sm hover:shadow-md transition-all flex justify-between items-center"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-3 bg-slate-50 border rounded-2xl shrink-0">
                    {getFileIcon(file.fileType)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-900 text-sm truncate" title={file.fileName}>
                      {file.fileName}
                    </h4>
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(file.uploadedAt).toLocaleDateString('vi-VN')}
                      </span>
                      <span>•</span>
                      <span>{formatBytes(file.fileSize)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`/api/files/download/${file.id}?token=${token}`}
                    download={file.fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 hover:bg-sky-50 text-sky-600 rounded-2xl hover:scale-105 transition-all"
                    title="Tải xuống tệp tin"
                  >
                    <Download className="w-4.5 h-4.5" />
                  </a>

                  <button
                    onClick={() => handleDelete(file.id, file.fileName, file.storagePath)}
                    className="p-3 hover:bg-red-50 text-red-500 rounded-2xl hover:scale-105 transition-all cursor-pointer"
                    title="Xóa tệp"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
