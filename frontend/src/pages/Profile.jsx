import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import UserInfo from "../profile/UserInfo";
import {
  ArrowLeft,
  Pencil,
  Loader2,
  LayoutGrid,
  Users,
  Calendar,
  Mail,
  User,
} from "lucide-react";

const BASE = "http://localhost:5000";

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

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
                    <span className="text-slate-700">@{profile.username}</span>
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
