import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus, AlertCircle, BookOpen, Eye, EyeOff, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';

interface LoginViewProps {
  onSuccess: (token: string, user: { id: string; username: string; nickname: string; grade?: number; school?: string; classroom?: string; role?: 'student' | 'teacher' | 'admin' }, rememberMe: boolean) => void;
  initialError?: string | null;
  onClearInitialError?: () => void;
}

const normalizeClassroom = (value: string): string => {
  let cleaned = value.trim();
  // Remove "Lớp" or "lop" prefixes (and surrounding spaces)
  cleaned = cleaned.replace(/^(lớp|lop)\s*/i, '');
  
  // Format separator into "." between grade number and class name (e.g., 6A1, 6/1, 6-1, 6.1, 6 1 -> 6.1)
  const regexNumSeparatorNum = /^(\d+)[a-zA-Z/\-.\s]+(\d+)$/;
  if (regexNumSeparatorNum.test(cleaned)) {
    cleaned = cleaned.replace(regexNumSeparatorNum, '$1.$2');
  } else {
    // Single alpha classes without spacer e.g. 6A, 6a -> 6.A
    const regexNumAlpha = /^(\d+)([a-zA-Z])$/;
    if (regexNumAlpha.test(cleaned)) {
      cleaned = cleaned.replace(regexNumAlpha, '$1.$2');
    } else {
      // Single alpha classes with spacer e.g. 6/A, 6-A -> 6.A
      const regexNumSeparatorAlpha = /^(\d+)[/\-.\s]+([a-zA-Z])$/;
      if (regexNumSeparatorAlpha.test(cleaned)) {
        cleaned = cleaned.replace(regexNumSeparatorAlpha, '$1.$2');
      }
    }
  }

  return cleaned.toUpperCase();
};

export default function LoginView({ onSuccess, initialError, onClearInitialError }: LoginViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [username, setUsername] = useState(localStorage.getItem('wippo_remembered_username') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('wippo_remember_me') !== 'false');
  const [nickname, setNickname] = useState('');
  const [school, setSchool] = useState('');
  const [classroom, setClassroom] = useState('');
  const [grade, setGrade] = useState(6); // default to lớp 6
  const [regCode, setRegCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialError) {
      setError(initialError);
      if (onClearInitialError) {
        onClearInitialError();
      }
    }
  }, [initialError, onClearInitialError]);
  const [loading, setLoading] = useState(false);

  // States for Forgot Password (Quên mật khẩu)
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // States for interactive food elements
  const [bananaEaten, setBananaEaten] = useState(false);
  const [watermelonEaten, setWatermelonEaten] = useState(false);
  const [iceCreamEaten, setIceCreamEaten] = useState(false);
  const [breadEaten, setBreadEaten] = useState(false);
  const [isChewing, setIsChewing] = useState(false);
  const [isAntEating, setIsAntEating] = useState(false);

  const handleDragEnd = (event: any, info: any, foodType: 'banana' | 'watermelon' | 'icecream' | 'bread') => {
    const point = info.point;
    const targetId = (foodType === 'banana' || foodType === 'watermelon') ? 'hippo-mascot' : 'ant-mascot';
    const tEl = document.getElementById(targetId);
    if (tEl) {
      const rect = tEl.getBoundingClientRect();
      const paddingX = 40;
      const paddingY = 40;
      const inside = (
        point.x >= rect.left - paddingX &&
        point.x <= rect.right + paddingX &&
        point.y >= rect.top - paddingY &&
        point.y <= rect.bottom + paddingY
      );

      if (inside) {
        if (foodType === 'banana') {
          setBananaEaten(true);
          setIsChewing(true);
          setTimeout(() => setIsChewing(false), 1200);
        } else if (foodType === 'watermelon') {
          setWatermelonEaten(true);
          setIsChewing(true);
          setTimeout(() => setIsChewing(false), 1200);
        } else if (foodType === 'icecream') {
          setIceCreamEaten(true);
          setIsAntEating(true);
          setTimeout(() => setIsAntEating(false), 1200);
        } else if (foodType === 'bread') {
          setBreadEaten(true);
          setIsAntEating(true);
          setTimeout(() => setIsAntEating(false), 1200);
        }
      }
    }
  };

  const resetAllFoods = () => {
    setBananaEaten(false);
    setWatermelonEaten(false);
    setIceCreamEaten(false);
    setBreadEaten(false);
  };

  // Automatically determine selected role based on mascot feeding status
  useEffect(() => {
    const hippoFed = bananaEaten || watermelonEaten;
    const antFed = iceCreamEaten || breadEaten;

    if (hippoFed && antFed) {
      setRole('admin');
    } else if (antFed) {
      setRole('teacher');
    } else {
      setRole('student');
    }
  }, [bananaEaten, watermelonEaten, iceCreamEaten, breadEaten]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLogin) {
      // Validate Tên (nickname)
      const cleanNickname = nickname.trim();
      if (cleanNickname.length < 4) {
        setError(role === 'student' ? 'Họ và tên học sinh tối thiểu phải có từ 4 ký tự.' : 'Họ và tên tối thiểu phải có từ 4 ký tự.');
        return;
      }
      if (cleanNickname.length > 50) {
        setError(role === 'student' ? 'Họ và tên học sinh không được vượt quá 50 ký tự.' : 'Họ và tên không được vượt quá 50 ký tự.');
        return;
      }
      const nameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơưáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐ\s]+$/;
      if (!nameRegex.test(cleanNickname)) {
        setError(role === 'student' ? 'Tên học sinh của em chỉ được chứa các chữ cái và khoảng trắng.' : 'Họ và tên chỉ được chứa các chữ cái và khoảng trắng.');
        return;
      }
      if (/(.)\1{3,}/i.test(cleanNickname)) {
        setError(role === 'student' ? 'Tên học sinh không hợp lệ vì chứa các ký tự lặp lại quá nhiều.' : 'Họ và tên không hợp lệ.');
        return;
      }

      // Profanity Filter
      const blacklist = [
        'đéo', 'địt', 'lồn', 'buồi', 'cặc', 'vcl', 'clm', 'dcm', 'đm', 'vkl', 'đỉ', 'bú', 'chó', 'dâm', 'ngu',
        'fuck', 'bitch', 'shit', 'asshole', 'idiot', 'cac', 'lon', 'buoi', 'deo', 'dit', 'dm', 'con cac'
      ];
      const nicknameLower = cleanNickname.toLowerCase();

      // Split text into words/syllables by whitespace or non-alpha characters
      const getWords = (text: string) => 
        text.split(/[^a-z0-9àáâãèéêìíòóôõùúăđĩũơưăâêôơưáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/i).filter(Boolean);

      const checkProfanity = (textLower: string) => {
        const words = getWords(textLower);
        const hasExactBadWord = words.some(w => blacklist.includes(w));
        if (hasExactBadWord) return true;
        
        return blacklist.some(phrase => {
          if (phrase.includes(' ')) {
            const pattern = new RegExp(`(^|\\s)${phrase}($|\\s)`);
            return pattern.test(textLower);
          }
          return false;
        });
      };

      if (checkProfanity(nicknameLower)) {
        setError('Tên chưa phù hợp vui lòng nhập lại.');
        return;
      }

      if (role === 'student') {
        // Validate Trường học
        const cleanSchool = school.trim();
        if (cleanSchool.length < 5) {
          setError('Tên trường học tối thiểu phải có từ 5 ký tự.');
          return;
        }
        if (cleanSchool.length > 100) {
          setError('Tên trường học không được vượt quá 100 ký tự.');
          return;
        }

        const hasValidSchoolPrefix = /(thcs|thpt|\bth\b)/i.test(cleanSchool);
        if (!hasValidSchoolPrefix) {
          setError('Trường học của em phải chứa cụm từ TH, THCS, hoặc THPT để chọn cấp học (Ví dụ: Trường tiểu học TH Kim Đồng, THCS Lê Quý Đôn).');
          return;
        }
        if (/(.)\1{4,}/i.test(cleanSchool)) {
          setError('Tên trường học không hợp lệ vì chứa các ký tự lặp lại quá nhiều lần.');
          return;
        }

        const schoolLower = cleanSchool.toLowerCase();
        if (checkProfanity(schoolLower)) {
          setError('Tên trường học chứa từ ngữ không phù hợp.');
          return;
        }
      } else if (role === 'teacher') {
        // Validate Teacher registration code
        const cleanRegCode = regCode.trim();
        if (cleanRegCode !== 'GiaoVienTinHocIC3') {
          setError('Mã đăng ký giáo viên không chính xác.');
          return;
        }
      } else if (role === 'admin') {
        // Validate Admin registration code
        const cleanRegCode = regCode.trim();
        if (cleanRegCode !== 'NguyenHuuDaiMaiDinh123@TinHocDaiDuong') {
          setError('Mã đăng ký admin không chính xác.');
          return;
        }
      }

      // Enforce secure password constraints: at least 8 characters, containing uppercase, lowercase, numbers, and special characters
      if (password.length < 8) {
        setError('Mật khẩu đăng ký phải từ 8 ký tự trở lên để đảm bảo an toàn.');
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setError('Mật khẩu đăng ký phải chứa ít nhất 1 chữ cái viết hoa (A-Z).');
        return;
      }
      if (!/[a-z]/.test(password)) {
        setError('Mật khẩu đăng ký phải chứa ít nhất 1 chữ cái viết thường (a-z).');
        return;
      }
      if (!/\d/.test(password)) {
        setError('Mật khẩu đăng ký phải chứa ít nhất 1 chữ số (0-9).');
        return;
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
        setError('Mật khẩu đăng ký phải chứa ít nhất 1 ký tự đặc biệt (ví dụ: !, @, #, $, %,...).');
        return;
      }
      const commonWeakPasswords = ['123456', '12345678', 'password', '111111', '123456789'];
      if (commonWeakPasswords.includes(password.trim())) {
        setError('Mật khẩu này quá quen thuộc và dễ bị lộ. Em hãy tạo một mật khẩu khác an toàn hơn nhé!');
        return;
      }
    }

    setLoading(true);

    const payload = isLogin 
      ? { username, password }
      : { 
          username, 
          password, 
          nickname: nickname.trim(), 
          role,
          ...((role === 'teacher' || role === 'admin') 
            ? { regCode: regCode.trim() } 
            : { 
                grade, 
                school: school.trim(), 
                classroom: normalizeClassroom(classroom)
              })
        };

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
      }

      if (rememberMe) {
        localStorage.setItem('wippo_remembered_username', username);
        localStorage.setItem('wippo_remember_me', 'true');
      } else {
        localStorage.removeItem('wippo_remembered_username');
        localStorage.setItem('wippo_remember_me', 'false');
      }

      onSuccess(data.token, data.user, rememberMe);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validate new password rules (uppercase, lowercase, number, special character, at least 8 chars)
    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải từ 8 ký tự trở lên để đảm bảo an toàn.');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('Mật khẩu mới phải chứa ít nhất 1 chữ cái viết hoa (A-Z).');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setError('Mật khẩu mới phải chứa ít nhất 1 chữ cái viết thường (a-z).');
      return;
    }
    if (!/\d/.test(newPassword)) {
      setError('Mật khẩu mới phải chứa ít nhất 1 chữ số (0-9).');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword)) {
      setError('Mật khẩu mới phải chứa ít nhất 1 ký tự đặc biệt (ví dụ: !, @, #, $, %,...).');
      return;
    }
    const commonWeakPasswords = ['123456', '12345678', 'password', '111111', '123456789'];
    if (commonWeakPasswords.includes(newPassword.trim())) {
      setError('Mật khẩu này quá quen thuộc và dễ bị đoán. Hãy chọn mật khẩu khác an toàn hơn nhé!');
      return;
    }

    setLoading(true);

    const payload = {
      username,
      nickname: nickname.trim(),
      role,
      newPassword,
      ...(role === 'student'
        ? { grade, classroom: normalizeClassroom(classroom) }
        : { regCode: regCode.trim() })
    };

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
      }

      setSuccessMessage((data.message || 'Mật khẩu đã được đặt lại thành công!') + ' Đang tự động chuyển về trang đăng nhập...');
      setNewPassword('');
      
      // Auto-transition back to login after 3 seconds
      setTimeout(() => {
        setIsForgotPassword(false);
        setIsLogin(true);
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-vibrant-bg p-4 font-sans text-vibrant-navy">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl border-4 border-vibrant-yellow p-8 relative overflow-hidden"
      >
        {/* Adorable Background Bubbles */}
        <div className="absolute top-[-40px] left-[-40px] w-24 h-24 bg-vibrant-pink/15 rounded-full pointer-events-none" />
        <div className="absolute bottom-[-30px] right-[-30px] w-32 h-32 bg-vibrant-blue/15 rounded-full pointer-events-none" />

        {/* Mascot / App Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="relative inline-block">
            {/* The Hippo */}
            <div 
              id="hippo-mascot"
              onClick={resetAllFoods}
              className={`inline-flex text-7xl mb-4 select-none cursor-pointer duration-300 transition-transform ${isChewing ? 'scale-110 active:scale-95 animate-bounce' : 'hover:scale-105 active:scale-95'}`}
              role="img"
              aria-label="hippo"
              title="Click để hồi phục đồ ăn nha! 🦛"
            >
              🦛
            </div>
 
            {/* Draggable Food Items around the Hippo */}
            {/* Banana (Chuối) */}
            <motion.div
              drag
              animate={{ scale: bananaEaten ? 0 : 1, opacity: bananaEaten ? 0 : 1 }}
              dragConstraints={{ left: -220, right: 220, top: -150, bottom: 250 }}
              whileHover={{ scale: 1.25 }}
              whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
              onDragEnd={(e, info) => handleDragEnd(e, info, 'banana')}
              className="absolute text-3.5xl cursor-grab select-none active:cursor-grabbing p-1.5 touch-none z-10 filter drop-shadow-md"
              style={{ top: '85px', left: '-125px', rotate: '15deg' }}
              title="Học chăm ngoan, thưởng quả chuối! 🍌"
            >
              🍌
            </motion.div>
 
            {/* Watermelon (Dưa hấu) */}
            <motion.div
              drag
              animate={{ scale: watermelonEaten ? 0 : 1, opacity: watermelonEaten ? 0 : 1 }}
              dragConstraints={{ left: -220, right: 220, top: -150, bottom: 250 }}
              whileHover={{ scale: 1.25 }}
              whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
              onDragEnd={(e, info) => handleDragEnd(e, info, 'watermelon')}
              className="absolute text-3.5xl cursor-grab select-none active:cursor-grabbing p-1.5 touch-none z-10 filter drop-shadow-md"
              style={{ top: '35px', left: '-35px', rotate: '-25deg' }}
              title="Dưa hấu mát lành! 🍉"
            >
              🍉
            </motion.div>
 
            {/* Ice Cream (Kem) */}
            <motion.div
              drag
              animate={{ scale: iceCreamEaten ? 0 : 1, opacity: iceCreamEaten ? 0 : 1 }}
              dragConstraints={{ left: -220, right: 220, top: -150, bottom: 250 }}
              whileHover={{ scale: 1.25 }}
              whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
              onDragEnd={(e, info) => handleDragEnd(e, info, 'icecream')}
              className="absolute text-3.5xl cursor-grab select-none active:cursor-grabbing p-1.5 touch-none z-10 filter drop-shadow-md"
              style={{ top: '90px', right: '-80px', rotate: '5deg' }}
              title="Kem ngọt ngào! 🍦"
            >
              🍦
            </motion.div>
 
            {/* Bread (Bánh mì) */}
            <motion.div
              drag
              animate={{ scale: breadEaten ? 0 : 1, opacity: breadEaten ? 0 : 1 }}
              dragConstraints={{ left: -220, right: 220, top: -150, bottom: 250 }}
              whileHover={{ scale: 1.25 }}
              whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
              onDragEnd={(e, info) => handleDragEnd(e, info, 'bread')}
              className="absolute text-3.5xl cursor-grab select-none active:cursor-grabbing p-1.5 touch-none z-10 filter drop-shadow-md"
              style={{ top: '90px', right: '-125px', rotate: '-10deg' }}
              title="Bánh mì giòn rụm! 🍞"
            >
              🍞
            </motion.div>
          </div>
 
          <div className="relative inline-block mt-2">
            <h1 className="text-3xl font-black font-display text-vibrant-pink tracking-tight uppercase">Wippo IC3</h1>
            {/* Ant (Kiến) - Không thể kéo thả */}
            <motion.div
              id="ant-mascot"
              whileHover={{ scale: 1.25 }}
              animate={isAntEating ? { scale: [1, 1.4, 1.2, 1], rotate: [0, 15, -15, 0] } : {}}
              className="absolute text-[11px] select-none p-0.5 z-10 filter drop-shadow-md pointer-events-none"
              style={{ top: '-10px', right: '0px', transform: 'scaleX(-1) rotate(-15deg)' }}
              title="Bạn kiến nhỏ chăm chỉ! 🐜"
            >
              🐜
            </motion.div>
          </div>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Ứng dụng Ôn tập & Kiểm tra IC3 ✨
          </p>
        </div>

        {/* Tab Selection or Forgot Password back header */}
        {!isForgotPassword ? (
          <div className="flex bg-slate-50 border-2 border-slate-100 p-1.5 rounded-2xl mb-6">
            <button
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                isLogin 
                  ? 'bg-vibrant-pink text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-vibrant-bg/50'
              }`}
              onClick={() => {
                setIsLogin(true);
                setError(null);
              }}
            >
              <LogIn className="w-4 h-4" />
              Đăng nhập
            </button>
            <button
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                !isLogin 
                  ? 'bg-vibrant-pink text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-vibrant-bg/50'
              }`}
              onClick={() => {
                setIsLogin(false);
                setError(null);
              }}
            >
              <UserPlus className="w-4 h-4" />
              Đăng ký
            </button>
          </div>
        ) : (
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setError(null);
                setSuccessMessage(null);
              }}
              className="flex items-center gap-2 text-sm font-extrabold text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại đăng nhập
            </button>
            <span className="text-xs font-black bg-vibrant-pink/10 text-vibrant-pink px-3 py-1 rounded-full">
              Khôi phục mật khẩu
            </span>
          </div>
        )}

        {/* Error Indicator */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-start gap-3 bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-2xl mb-5 text-sm font-semibold"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Success Indicator */}
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-start gap-3 bg-emerald-50 border-2 border-emerald-200 text-emerald-800 p-4 rounded-2xl mb-5 text-sm font-semibold"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        {/* Form Container */}
        {isForgotPassword ? (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-1">
                Tên đăng nhập
              </label>
              <input
                type="text"
                required
                placeholder="Nhập tên đăng nhập của em..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl focus:border-vibrant-blue focus:bg-white focus:outline-hidden transition-all text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-1">
                Họ và tên hoặc Biệt danh chính xác
              </label>
              <input
                type="text"
                required
                placeholder="Nhập họ và tên đã đăng ký tài khoản..."
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl focus:border-vibrant-blue focus:bg-white focus:outline-hidden transition-all text-sm font-semibold"
              />
            </div>

            {role === 'student' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1 flex items-center gap-1.5 whitespace-nowrap">
                    <BookOpen className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    Khối lớp học tập
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(Number(e.target.value))}
                    className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl focus:border-vibrant-blue focus:bg-white focus:outline-hidden transition-all text-xs font-bold cursor-pointer"
                  >
                    <option value={3}>Học sinh Lớp 3</option>
                    <option value={4}>Học sinh Lớp 4</option>
                    <option value={5}>Học sinh Lớp 5</option>
                    <option value={6}>Học sinh Lớp 6</option>
                    <option value={7}>Học sinh Lớp 7</option>
                    <option value={8}>Học sinh Lớp 8</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1 whitespace-nowrap">
                    Lớp của em (Ví dụ: 6.1)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 6A1, 6/1, 6.1..."
                    value={classroom}
                    onChange={(e) => setClassroom(e.target.value)}
                    onBlur={(e) => setClassroom(normalizeClassroom(e.target.value))}
                    className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl focus:border-vibrant-blue focus:bg-white focus:outline-hidden transition-all text-xs font-semibold"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-extrabold text-slate-700 mb-1">
                  Mã đăng ký xác minh {role === 'teacher' ? 'giáo viên' : 'admin'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={role === 'teacher' ? 'Nhập mã đăng ký dành cho giáo viên...' : 'Nhập mã đăng ký dành cho admin...'}
                  value={regCode}
                  onChange={(e) => setRegCode(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl focus:border-vibrant-blue focus:bg-white focus:outline-hidden transition-all text-sm font-semibold"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-1">
                Mật khẩu mới muốn đổi
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  placeholder="Từ 8 ký tự gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl focus:border-vibrant-blue focus:bg-white focus:outline-hidden transition-all text-sm font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-hidden transition-colors cursor-pointer"
                  title={showNewPassword ? "Ẩn" : "Hiện"}
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99, y: 1 }}
              type="submit"
              disabled={loading}
              className={`w-full py-4 bg-vibrant-pink hover:bg-vibrant-pink/90 text-white font-black rounded-full shadow-[0_4px_0_#C92E6B] hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-5 h-5" />
                  Đặt lại mật khẩu mới!
                </>
              )}
            </motion.button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-1">
                Tên đăng nhập
              </label>
              <input
                type="text"
                required
                placeholder="Nhập tên đăng nhập của em..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl focus:border-vibrant-blue focus:bg-white focus:outline-hidden transition-all text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder={isLogin ? "Nhập mật khẩu của em..." : "Từ 8 ký tự gồm chữ hoa, chữ thường, chữ số, ký tự đặc biệt..."}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl focus:border-vibrant-blue focus:bg-white focus:outline-hidden transition-all text-sm font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-hidden transition-colors cursor-pointer"
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-between pt-1 select-none">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4.5 h-4.5 text-vibrant-pink border-2 border-slate-200 rounded-lg focus:ring-vibrant-pink/20 accent-vibrant-pink cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors">
                    Ghi nhớ đăng nhập
                  </span>
                </label>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-extrabold text-vibrant-pink hover:underline transition-all cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>
            )}

            {!isLogin && (
              <>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-1"
                >
                  <div>
                    <label className="block text-sm font-extrabold text-slate-700 mb-1">
                      {role === 'student' ? 'Họ và tên của em' : role === 'teacher' ? 'Họ và tên Thầy / Cô' : 'Họ và tên Admin'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={role === 'student' ? 'Ví dụ: Nguyễn Hữu Đại, Mai Thảo Chi...' : 'Ví dụ: Thầy Trần Quang Lâm, Cô Nguyễn Thị Mai...'}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl focus:border-vibrant-blue focus:bg-white focus:outline-hidden transition-all text-sm font-semibold"
                    />
                  </div>

                  {role === 'student' ? (
                    <>
                      <div>
                        <label className="block text-sm font-extrabold text-slate-700 mb-1 flex items-center justify-between">
                          <span>Trường học của em <span className="text-red-500">*</span></span>
                          <span className="text-[10px] text-vibrant-blue font-bold">(Yêu cầu chứa TH / THCS / THPT)</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ví dụ: TH Kim Đồng, THCS Lý Thường Kiệt... "
                          value={school}
                          onChange={(e) => setSchool(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl focus:border-vibrant-blue focus:bg-white focus:outline-hidden transition-all text-sm font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-extrabold text-slate-700 mb-1 flex items-center gap-1.5 whitespace-nowrap">
                            <BookOpen className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            Khối lớp học tập
                          </label>
                          <select
                            value={grade}
                            onChange={(e) => setGrade(Number(e.target.value))}
                            className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl focus:border-vibrant-blue focus:bg-white focus:outline-hidden transition-all text-xs font-bold cursor-pointer"
                          >
                            <option value={3}>Học sinh Lớp 3</option>
                            <option value={4}>Học sinh Lớp 4</option>
                            <option value={5}>Học sinh Lớp 5</option>
                            <option value={6}>Học sinh Lớp 6</option>
                            <option value={7}>Học sinh Lớp 7</option>
                            <option value={8}>Học sinh Lớp 8</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-extrabold text-slate-700 mb-1 whitespace-nowrap">
                            Lớp của em
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ví dụ: 6A1, 6/1, 6.1..."
                            value={classroom}
                            onChange={(e) => setClassroom(e.target.value)}
                            onBlur={(e) => setClassroom(normalizeClassroom(e.target.value))}
                            className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl focus:border-vibrant-blue focus:bg-white focus:outline-hidden transition-all text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-extrabold text-slate-700 mb-1">
                        Mã đăng ký {role === 'teacher' ? 'giáo viên' : 'admin'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={role === 'teacher' ? 'Nhập mã đăng ký dành cho giáo viên...' : 'Nhập mã đăng ký dành cho admin...'}
                        value={regCode}
                        onChange={(e) => setRegCode(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl focus:border-vibrant-blue focus:bg-white focus:outline-hidden transition-all text-sm font-semibold"
                      />
                    </div>
                  )}
                </motion.div>
              </>
            )}

            <motion.button
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99, y: 1 }}
              type="submit"
              disabled={loading}
              className={`w-full py-4 bg-vibrant-blue hover:bg-vibrant-blue/90 text-white font-black rounded-full shadow-[0_4px_0_#2B69C1] hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isLogin ? (
                <>
                  <LogIn className="w-5 h-5 animate-pulse" />
                  Vào học thôi nào!
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Đăng ký thành viên mới
                </>
              )}
            </motion.button>
          </form>
        )}

        <div className="mt-6 text-center text-xs font-semibold text-slate-400">
          Wippo IC3 đồng hành cùng các em ôn tập kỹ năng số! 🌟
        </div>
      </motion.div>
    </div>
  );
}
