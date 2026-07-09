import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, BookOpen, CheckCircle2, GraduationCap, LoaderCircle, LockKeyhole, School, Sparkles, UserRound } from 'lucide-react';

interface LoginViewProps {
  onSuccess: (token: string, user: { id: string; username: string; nickname: string; grade?: number; school?: string; classroom?: string; role?: 'student' | 'teacher' | 'admin' }, rememberMe: boolean) => void;
  initialError?: string | null;
  onClearInitialError?: () => void;
}

type SheetRecord = {
  id: string;
  name: string;
  classroom: string;
  school: string;
  password: string;
  grade?: number;
};

const fallbackRecords: SheetRecord[] = [
//   { id: 'local-1', name: 'Nguyễn An', classroom: '6A1', school: 'THCS Lê Quý Đôn', password: 'IC3@2026', grade: 6 },
//   { id: 'local-2', name: 'Trần Bình', classroom: '7B2', school: 'THCS Nguyễn Huệ', password: 'IC3@2026', grade: 7 },
//   { id: 'local-3', name: 'Lê Cường', classroom: '8C3', school: 'THPT Kim Đồng', password: 'IC3@2026', grade: 8 },
];

const normalizeText = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .trim();

const toSafeIdPart = (value: string) => normalizeText(value).replace(/\s+/g, '-');

const normalizeClassroom = (value: string) => {
  const cleaned = value.trim().toUpperCase();
  if (!cleaned) return '';
  const withPrefix = cleaned.replace(/^(LOP|LỚP)\s*/i, '');
  return withPrefix;
};

const toCsvExportUrl = (value: string) => {
  if (!value) return '';
  const trimmed = value.trim();

  if (trimmed.includes('docs.google.com/spreadsheets/d/')) {
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      const spreadsheetId = match[1];
      return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`;
    }
  }

  if (trimmed.includes('csv')) {
    return trimmed;
  }

  return trimmed;
};

const parseHtmlTable = (html: string): string[][] => {
  const rows: string[][] = [];
  const trMatch = html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  for (const match of trMatch) {
    const rowHtml = match[1];
    const cells = Array.from(rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi))
      .map((cellMatch) => cellMatch[1])
      .map((cell) => cell.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim());
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  return rows;
};

const parseCsv = (content: string): string[][] => {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    const cells = line
      .split(',')
      .map((cell) => cell.replace(/^"|"$/g, '').trim());

    if (cells.some((cell) => cell)) {
      rows.push(cells);
    }
  }

  return rows;
};

const findHeaderIndex = (headers: string[], aliases: string[]) => {
  const normalizedHeaders = headers.map((header) => normalizeText(header));
  return normalizedHeaders.findIndex((header) => aliases.some((alias) => header === normalizeText(alias)));
};

const loadRecordsFromContent = (content: string): SheetRecord[] => {
  const trimmed = content.trim();
  if (!trimmed) return fallbackRecords;

  const rows = trimmed.startsWith('<') ? parseHtmlTable(trimmed) : parseCsv(trimmed);
  if (rows.length < 2) return fallbackRecords;

  const headers = rows[0].map((header) => header.trim());
  const nameIndex = findHeaderIndex(headers, ['ten', 'hoten', 'studentname', 'name', 'student_name', 'fullname', 'hotenhs']);
  const classroomIndex = findHeaderIndex(headers, ['lop', 'class', 'classroom', 'lophoc']);
  const schoolIndex = findHeaderIndex(headers, ['truong', 'school', 'schoolname', 'truonghoc']);
  const passwordIndex = findHeaderIndex(headers, ['password', 'matkhau', 'pwd', 'newpassword', 'pass']);

  const records: SheetRecord[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    const name = (nameIndex >= 0 ? row[nameIndex] : '')?.trim() || '';
    const classroom = (classroomIndex >= 0 ? row[classroomIndex] : '')?.trim() || '';
    const school = (schoolIndex >= 0 ? row[schoolIndex] : '')?.trim() || '';
    const password = (passwordIndex >= 0 ? row[passwordIndex] : '')?.trim() || '';

    if (!name || !classroom || !school) continue;

    const gradeMatch = classroom.match(/(\d+)/);
    const grade = gradeMatch ? Number(gradeMatch[1]) : undefined;

    records.push({
      id: `${toSafeIdPart(name)}-${toSafeIdPart(classroom)}-${toSafeIdPart(school)}`,
      name,
      classroom: normalizeClassroom(classroom),
      school,
      password,
      grade,
    });
  }

  return records.length > 0 ? records : fallbackRecords;
};

export default function LoginViewGoogleSheets({ onSuccess, initialError, onClearInitialError }: LoginViewProps) {
  const [records, setRecords] = useState<SheetRecord[]>(fallbackRecords);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('wippo_remember_me') !== 'false');
  const [selectedName, setSelectedName] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (initialError) {
      setError(initialError);
      if (onClearInitialError) {
        onClearInitialError();
      }
    }
  }, [initialError, onClearInitialError]);

  useEffect(() => {
    const loadRecords = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/login-sheet-data');
        if (!response.ok) {
          throw new Error('Không thể tải dữ liệu từ Google Sheets.');
        }
        const responseText = await response.text();
        const parsedRecords = loadRecordsFromContent(responseText);
        setRecords(parsedRecords);

        if (parsedRecords.length > 0) {
          setError(null);
        } else {
          setError('Google Sheets không trả về bản ghi hợp lệ để đăng nhập.');
        }
      } catch (err) {
        setRecords([]);
        setError('Không thể đọc dữ liệu từ Google Sheets.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, []);

  const schools = useMemo(() => Array.from(new Set(records.map((record) => record.school))).sort(), [records]);
  const classrooms = useMemo(() => {
    if (!selectedSchool) return [];
    return Array.from(
      new Set(records.filter((record) => normalizeText(record.school) === normalizeText(selectedSchool)).map((record) => record.classroom))
    ).sort();
  }, [records, selectedSchool]);
  const names = useMemo(() => {
    if (!selectedSchool || !selectedClassroom) return [];
    return Array.from(
      new Set(
        records
          .filter(
            (record) =>
              normalizeText(record.school) === normalizeText(selectedSchool) &&
              normalizeText(record.classroom) === normalizeText(selectedClassroom)
          )
          .map((record) => record.name)
      )
    ).sort();
  }, [records, selectedSchool, selectedClassroom]);

  const handleSchoolChange = (value: string) => {
    setSelectedSchool(value);
    setSelectedClassroom('');
    setSelectedName('');
  };

  const handleClassroomChange = (value: string) => {
    setSelectedClassroom(value);
    setSelectedName('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!selectedSchool || !selectedClassroom || !selectedName) {
      setError('Vui lòng chọn trường học trước, rồi lớp học, sau đó mới chọn tên học sinh.');
      return;
    }

    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu mới để xác minh.');
      return;
    }

    const matchedRecord = records.find((record) =>
      normalizeText(record.name) === normalizeText(selectedName) &&
      normalizeText(record.classroom) === normalizeText(selectedClassroom) &&
      normalizeText(record.school) === normalizeText(selectedSchool)
    );

    if (!matchedRecord) {
      setError('Thông tin học sinh chưa khớp với dữ liệu trên Google Sheets.');
      return;
    }

    if (matchedRecord.password && matchedRecord.password.trim() !== password.trim()) {
      setError('Mật khẩu mới không khớp với dữ liệu trên Google Sheets.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/google-sheet-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: matchedRecord.name,
          classroom: matchedRecord.classroom,
          school: matchedRecord.school,
          password,
          grade: matchedRecord.grade,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Đăng nhập bằng Google Sheets thất bại.');
      }

      if (rememberMe) {
        localStorage.setItem('wippo_remembered_username', selectedName);
        localStorage.setItem('wippo_remember_me', 'true');
      } else {
        localStorage.removeItem('wippo_remembered_username');
        localStorage.setItem('wippo_remember_me', 'false');
      }

      onSuccess(data.token, data.user, rememberMe);
    } catch (err: any) {
      setError(err.message || 'Không thể đăng nhập bằng Google Sheets.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 110, damping: 18 }}
        className="w-full max-w-lg rounded-[2rem] border border-amber-300 bg-white/95 p-7 shadow-2xl shadow-amber-100"
      >

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <School className="h-4 w-4" /> Trường
              </span>
              <select
                value={selectedSchool}
                onChange={(event) => handleSchoolChange(event.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-vibrant-blue focus:bg-white"
              >
                <option value="">-- Chọn trường --</option>
                {schools.map((school) => (
                  <option key={school} value={school}>{school}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <GraduationCap className="h-4 w-4" /> Lớp
              </span>
              <select
                value={selectedClassroom}
                onChange={(event) => handleClassroomChange(event.target.value)}
                disabled={!selectedSchool}
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-vibrant-blue focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">-- Chọn lớp --</option>
                {classrooms.map((classroom) => (
                  <option key={classroom} value={classroom}>{classroom}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <UserRound className="h-4 w-4" /> Tên học sinh
            </span>
            <select
              value={selectedName}
              onChange={(event) => setSelectedName(event.target.value)}
              disabled={!selectedSchool || !selectedClassroom}
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-vibrant-blue focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">-- Chọn tên học sinh --</option>
              {names.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <LockKeyhole className="h-4 w-4" /> Mật khẩu mới
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu mới"
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-vibrant-blue focus:bg-white"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
            />
            Ghi nhớ thông tin đăng nhập
          </label>

          {error ? (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-vibrant-blue px-4 py-3 font-black text-white shadow-[0_4px_0_#2B69C1] transition hover:translate-y-0.5 hover:bg-vibrant-blue/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Đang tải dữ liệu...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Xác minh và đăng nhập
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
