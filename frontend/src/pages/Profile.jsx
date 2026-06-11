import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  Pencil,
  Loader2,
  LayoutGrid,
  Users,
  Calendar,
  Mail,
  User,
  Upload,
  Eye,
  EyeOff,
} from "lucide-react";

const BASE = "http://localhost:5000";

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [changePwError, setChangePwError] = useState("");
  const [changePwMessage, setChangePwMessage] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePwError("");
    setChangePwMessage("");

    if (newPassword !== confirmNewPassword) {
      setChangePwError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setChangePwLoading(true);
    try {
      const res = await fetch(`${BASE}/api/user/change-password`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChangePwError(data.error || "Không thể đổi mật khẩu");
        return;
      }
      setChangePwMessage("Đổi mật khẩu thành công!");
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => {
        setIsChangingPassword(false);
        setChangePwMessage("");
      }, 3000);
    } catch {
      setChangePwError("Không kết nối được máy chủ");
    } finally {
      setChangePwLoading(false);
    }
  };

  const authHeaders = (json = true) => ({
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
  });

  const fetchProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/user/profile`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể tải hồ sơ");
        setProfile(null);
        return;
      }
      setProfile(data);
      setDisplayName(data.displayName || "");
      setEmail(data.email || "");
      
      // Auto-sync global user context if avatarUrl exists and is different
      if (data.avatarUrl && data.avatarUrl !== user?.avatarUrl) {
        updateUser({ avatarUrl: data.avatarUrl });
      }
      if (data.displayName && data.displayName !== user?.displayName) {
        updateUser({ displayName: data.displayName });
      }
    } catch {
      setError("Không kết nối được máy chủ");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    fetchProfile();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const handleSave = async () => {
    if (!displayName.trim()) {
      setMessage("");
      setError("Tên hiển thị không được để trống");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${BASE}/api/user/profile`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ displayName: displayName.trim(), email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể cập nhật hồ sơ");
        return;
      }
      setProfile(data);
      setDisplayName(data.displayName || "");
      setEmail(data.email || "");
      setIsEditing(false);
      setMessage("Đã lưu thông tin");
      updateUser({ displayName: data.displayName });
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(profile?.displayName || "");
    setEmail(profile?.email || "");
    setIsEditing(false);
    setError("");
    setMessage("");
  };

  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("vi-VN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] font-sans">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Quay lại"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Pencil size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-800">Hồ sơ cá nhân</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {error && !profile && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm mb-6">
            {error}
          </div>
        )}

        {profile && (
          <div className="space-y-6">
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <UserInfo
                  profile={profile}
                  token={user?.token}
                  isEditing={isEditing}
                  onUploadSuccess={(updated) => {
                    setProfile(updated);
                    if (updated.avatarUrl) {
                      updateUser({ avatarUrl: updated.avatarUrl });
                    }
                    setMessage("Đã cập nhật ảnh đại diện");
                  }}
                />
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? "Đang lưu..." : "Lưu"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setMessage("");
                        setError("");
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      Chỉnh sửa
                    </button>
                  )}
                </div>
              </div>

              {(message || error) && (
                <p
                  className={`text-sm mb-4 ${error ? "text-red-600" : "text-green-600"}`}
                >
                  {error || message}
                </p>
              )}

              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Thông tin tài khoản
              </h2>

              <dl className="grid gap-4 sm:grid-cols-2">
                <Field
                  icon={User}
                  label="Tên hiển thị"
                  value={
                    isEditing ? (
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      profile.displayName
                    )
                  }
                />
                <Field
                  icon={User}
                  label="Username"
                  value={
                    <span className="text-slate-700">{profile.username}</span>
                  }
                />
                <Field
                  icon={Mail}
                  label="Email"
                  value={
                    isEditing ? (
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      profile.email || "Chưa cập nhật"
                    )
                  }
                />
                <Field
                  icon={Calendar}
                  label="Ngày tham gia"
                  value={joinedDate}
                />
              </dl>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Hoạt động trên Co-Canvas
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard
                  icon={LayoutGrid}
                  value={profile.ownedBoards ?? 0}
                  label="Bảng của tôi"
                />
                <StatCard
                  icon={Users}
                  value={profile.sharedBoards ?? 0}
                  label="Bảng được chia sẻ"
                />
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  Đổi mật khẩu
                </h2>
                {!isChangingPassword && (
                  <button
                    type="button"
                    onClick={() => { setIsChangingPassword(true); setChangePwError(""); setChangePwMessage(""); }}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    Đổi mật khẩu
                  </button>
                )}
              </div>

              {isChangingPassword && (
                <form onSubmit={handleChangePassword} className="space-y-4" autoComplete="off">
                  {/* Dummy inputs to prevent aggressive browser autofill */}
                  <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, overflow: 'hidden' }}>
                    <input type="text" name="username" autoComplete="username" tabIndex={-1} />
                    <input type="password" name="password" autoComplete="current-password" tabIndex={-1} />
                  </div>
                  
                  {changePwError && (
                    <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">
                      {changePwError}
                    </div>
                  )}
                  {changePwMessage && (
                    <div className="bg-green-50 text-green-700 rounded-lg p-3 text-sm">
                      {changePwMessage}
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                        Mật khẩu hiện tại
                      </label>
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          name="oldPassword"
                          value={oldPassword}
                          onChange={e => setOldPassword(e.target.value)}
                          placeholder="Nhập mật khẩu hiện tại"
                          required
                          autoComplete="new-password"
                          className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                          Mật khẩu mới
                        </label>
                        <div className="relative">
                          <input
                            type={showPw ? "text" : "password"}
                            name="newPassword"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Nhập mật khẩu mới"
                            required
                            autoComplete="new-password"
                            className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                          Xác nhận mật khẩu mới
                        </label>
                        <div className="relative">
                          <input
                            type={showPw ? "text" : "password"}
                            name="confirmNewPassword"
                            value={confirmNewPassword}
                            onChange={e => setConfirmNewPassword(e.target.value)}
                            placeholder="Nhập lại mật khẩu mới"
                            required
                            autoComplete="new-password"
                            className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { setIsChangingPassword(false); setOldPassword(""); setNewPassword(""); setConfirmNewPassword(""); }}
                      disabled={changePwLoading}
                      className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={changePwLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      {changePwLoading && <Loader2 size={14} className="animate-spin" />}
                      Cập nhật mật khẩu
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ icon, label, value }) {
  const IconComponent = icon;
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <IconComponent size={14} />
        {label}
      </dt>
      <dd className="mt-2 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  const IconComponent = icon;
  return (
    <article className="flex items-center gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
        <IconComponent size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-600">{label}</p>
      </div>
    </article>
  );
}

function UserInfo({ profile, token, isEditing, onUploadSuccess }) {
  return (
    <article className="flex gap-4 items-center flex-[1_0_0] max-sm:flex-col max-sm:items-center max-sm:text-center">
      <div className="relative">
        <img
          src={profile?.avatarUrl || "https://via.placeholder.com/119"}
          alt={profile?.displayName}
          className="w-[80px] h-[80px] sm:w-[119px] sm:h-[119px] rounded-full object-cover border border-slate-200"
        />
      </div>
      <div className="flex flex-col gap-1 max-sm:items-center">
        <h1 className="text-[1.5rem] font-bold text-neutral-900">
          {profile?.displayName || profile?.username}
        </h1>
        <p className="text-[1.125rem] text-neutral-900 text-opacity-50">
          {profile?.email || "Chưa cập nhật email"}
        </p>
        {isEditing && (
          <div className="mt-2">
            <UploadButton token={token} onUploadSuccess={onUploadSuccess} />
          </div>
        )}
      </div>
    </article>
  );
}
function UploadButton({ token, onUploadSuccess }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file hình ảnh");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh không được vượt quá 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const res = await fetch(`${BASE}/api/user/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể tải ảnh lên");
        return;
      }
      onUploadSuccess?.(data.profile);
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
      >
        <Upload size={16} />
        {uploading ? "Đang tải..." : "Đổi ảnh đại diện"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
