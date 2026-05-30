import UploadButton from "./UploadButton";

const BASE = "http://localhost:5000";

function avatarSrc(avatarUrl) {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("http")) return avatarUrl;
  return `${BASE}${avatarUrl.startsWith("/") ? "" : "/"}${avatarUrl}`;
}

export default function UserInfo({
  profile,
  token,
  isEditing,
  onUploadSuccess,
}) {
  const name = profile?.displayName || profile?.username || "User";
  const initial = (profile?.username?.[0] || "U").toUpperCase();
  const src = avatarSrc(profile?.avatarUrl);

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
      <div className="relative shrink-0">
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-28 h-28 rounded-full object-cover ring-4 ring-blue-100"
          />
        ) : (
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-blue-100">
            {initial}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-slate-800 truncate">{name}</h1>
        <p className="text-slate-500 mt-1">@{profile?.username}</p>
        {profile?.email && (
          <p className="text-sm text-slate-500 mt-0.5 truncate">{profile.email}</p>
        )}
        {isEditing && (
          <div className="mt-3">
            <UploadButton token={token} onUploadSuccess={onUploadSuccess} />
          </div>
        )}
      </div>
    </div>
  );
}
