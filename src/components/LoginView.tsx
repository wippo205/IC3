import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus, AlertCircle, BookOpen } from 'lucide-react';

interface LoginViewProps {
  onSuccess: (token: string, user: { id: string; username: string; nickname: string; grade: number; school?: string; classroom?: string; role?: 'student' | 'teacher' }) => void;
}

export default function LoginView({ onSuccess }: LoginViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [school, setSchool] = useState('');
  const [classroom, setClassroom] = useState('');
  const [grade, setGrade] = useState(6); // default to lớp 6
  const [regCode, setRegCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLogin) {
      // Validate Tên (nickname)
      const cleanNickname = nickname.trim();
      if (cleanNickname.length < 4) {
        setError(role === 'student' ? 'Họ và tên học sinh tối thiểu phải có từ 4 ký tự.' : 'Họ và tên giáo viên tối thiểu phải có từ 4 ký tự.');
        return;
      }
      if (cleanNickname.length > 50) {
        setError(role === 'student' ? 'Họ và tên học sinh không được vượt quá 50 ký tự.' : 'Họ và tên giáo viên không được vượt quá 50 ký tự.');
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
      } else {
        // Validate Teacher registration code
        const cleanRegCode = regCode.trim();
        if (cleanRegCode !== 'NguyenHuuDaiMaiDinh123@TinHocDaiDuong') {
          setError('Mã đăng ký giáo viên không chính xác.');
          return;
        }
      }
    }

    setLoading(true);

    const payload = isLogin 
      ? { username, password }
      : { 
          username, 
          password, 
          nickname: nickname.trim(), 
          grade: role === 'teacher' ? 6 : grade, 
          school: role === 'teacher' ? '' : school.trim(), 
          classroom: role === 'teacher' ? '' : classroom.trim(), 
          role,
          regCode: role === 'teacher' ? regCode.trim() : undefined
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

      onSuccess(data.token, data.user);
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
        <div className="text-center mb-8">
          <motion.div 
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="inline-flex relative w-16 h-16 bg-vibrant-pink rounded-2xl items-center justify-center text-white text-3xl shadow-lg mb-3 border-2 border-white"
          >
            {/* Cute Hippo Mascot */}
            <span className="select-none" role="img" aria-label="hippo">🦛</span>
            <div className="absolute -top-2 -right-2 bg-vibrant-yellow border-2 border-[#D9B632] rounded-full px-1.5 py-0.5 text-[9px] font-black text-vibrant-navy shadow-sm">
              IC3
            </div>
          </motion.div>
          <h1 className="text-3xl font-black font-display text-vibrant-pink tracking-tight uppercase">Wippo IC3</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Ứng dụng Ôn tập & Kiểm tra IC3 dễ thương dành cho em! ✨
          </p>
        </div>

        {/* Tab Selection */}
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

        {/* Form Container */}
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
            <input
              type="password"
              required
              placeholder="Nhập mật khẩu an toàn..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl focus:border-vibrant-blue focus:bg-white focus:outline-hidden transition-all text-sm font-semibold"
            />
          </div>

          {!isLogin && (
            <>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-1"
              >
                {/* Cute Role Selector Button Switch */}
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Em là học sinh hay là thầy cô? 🎭
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`py-2.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all border-2 cursor-pointer ${
                        role === 'student'
                          ? 'bg-sky-50 border-sky-400 text-sky-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      🎒 Học sinh
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('teacher')}
                      className={`py-2.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all border-2 cursor-pointer ${
                        role === 'teacher'
                          ? 'bg-orange-50 border-orange-400 text-orange-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      🧑‍🏫 Giáo viên
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-extrabold text-slate-700 mb-1">
                    {role === 'student' ? 'Tên học sinh' : 'Họ và tên giáo viên'}
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
                        placeholder="Ví dụ: TH Kim Đồng, THCS Lý Thường Kiệt, THPT Chu Văn An..."
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
                          placeholder="Ví dụ: 6A4, 7A2..."
                          value={classroom}
                          onChange={(e) => setClassroom(e.target.value)}
                          className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl focus:border-vibrant-blue focus:bg-white focus:outline-hidden transition-all text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-extrabold text-slate-700 mb-1">
                      Mã đăng ký giáo viên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nhập mã đăng ký dành cho giáo viên..."
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

        <div className="mt-6 text-center text-xs font-semibold text-slate-400">
          Wippo IC3 đồng hành cùng các em ôn tập kỹ năng số! 🌟
        </div>
      </motion.div>
    </div>
  );
}
