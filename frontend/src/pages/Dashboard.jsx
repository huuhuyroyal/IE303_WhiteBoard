import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Plus,
  Search,
  LayoutGrid,
  MoreHorizontal,
  Clock,
  Pencil,
  Trash2,
  X,
  LogOut,
} from "lucide-react";
import ShareModal from "../components/ShareModal";

function BoardThumbnail({ board }) {
  const gradients = [
    "from-violet-400 to-purple-600",
    "from-blue-400 to-cyan-500",
    "from-emerald-400 to-teal-600",
    "from-orange-400 to-red-500",
    "from-pink-400 to-rose-600",
    "from-indigo-400 to-blue-600",
    "from-amber-400 to-orange-500",
    "from-green-400 to-emerald-600",
  ];
  const idx = board.id ? board.id.charCodeAt(0) % gradients.length : 0;
  const gradient = gradients[idx];

  if (board.thumbnail) {
    return (
      <div className="w-full h-full relative bg-slate-50">
        <img
          src={board.thumbnail}
          alt="Thumbnail"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}
    >
      <div className="absolute top-4 left-4 w-12 h-12 bg-white/20 rounded-lg rotate-12" />
      <div className="absolute bottom-6 right-4 w-8 h-8 bg-white/15 rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-1 bg-white/30 rounded-full rotate-45" />
      <div className="absolute top-1/3 right-1/3 w-6 h-6 border-2 border-white/30 rounded-sm rotate-6" />
    </div>
  );
}

function BoardCard({ board, nowMs, onOpen, onDelete, onRename }) {
  const [showMenu, setShowMenu] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(board.name || "Untitled");

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = nowMs - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div
      className="group relative cursor-pointer select-none"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        setShowMenu(false);
      }}
      onClick={() => !renaming && !showMenu && onOpen(board.id)}
    >
      <div className="relative rounded-xl overflow-hidden aspect-[4/3] mb-3 ring-1 ring-slate-200 group-hover:ring-blue-400 group-hover:shadow-lg transition-all duration-200">
        <BoardThumbnail board={board} />
        {hovering && (
          <div className="absolute inset-0 bg-black/10 transition-all" />
        )}
        <button
          className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu((v) => !v);
          }}
        >
          <MoreHorizontal size={14} className="text-slate-600" />
        </button>

        {showMenu && (
          <div
            className="absolute top-10 right-2 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-20 min-w-[140px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-left"
              onClick={() => {
                setRenaming(true);
                setShowMenu(false);
              }}
            >
              <Pencil size={13} /> Rename
            </button>
            <button
              className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 text-left"
              onClick={() => {
                onDelete(board.id);
                setShowMenu(false);
              }}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="px-0.5">
        {renaming ? (
          <input
            autoFocus
            value={newName}
            className="text-sm font-semibold text-slate-800 w-full border-b border-blue-500 outline-none bg-transparent pb-0.5"
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => {
              onRename(board.id, newName);
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename(board.id, newName);
                setRenaming(false);
              }
              if (e.key === "Escape") setRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="text-sm font-semibold text-slate-800 truncate">
            {board.name || "Untitled"}
          </p>
        )}
        {(board.displayTime || board.updatedAt) && (
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            <Clock size={10} /> {timeAgo(board.displayTime || board.updatedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

function NewBoardCard({ onCreate }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await onCreate();
    setLoading(false);
  };

  return (
    <div onClick={handleClick} className="group cursor-pointer select-none">
      <div className="relative rounded-xl overflow-hidden aspect-[4/3] mb-3 bg-blue-600 hover:bg-blue-700 ring-1 ring-blue-600 hover:ring-blue-700 shadow group-hover:shadow-xl transition-all duration-200 flex items-center justify-center">
        {loading ? (
          <div className="w-8 h-8 border-3 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-white">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Plus size={28} strokeWidth={2.5} />
            </div>
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-800 px-0.5">New board</p>
    </div>
  );
}

function DeleteModal({ boardName, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[360px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Delete board?</h3>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          <span className="font-semibold text-slate-700">"{boardName}"</span>{" "}
          will be permanently deleted. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-red-600 text-sm text-white font-semibold hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("team");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [nowMs] = useState(() => Date.now());

  const BASE = "http://localhost:5000";
  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
  });

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/board`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBoards(data.map((b) => ({ ...b, name: b.title })));
      }
    } catch (err) {
      console.error("Failed to fetch boards:", err);
    } finally {
      setLoading(false);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    fetchBoards();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const handleCreate = async () => {
    const newBoard = { title: "Untitled Board 1" };
    try {
      const res = await fetch(`${BASE}/api/board`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(newBoard),
      });
      if (res.ok) {
        const created = await res.json();
        const recent = JSON.parse(
          localStorage.getItem(`recent_boards_${user?.username}`) || "{}",
        );
        recent[created.id] = nowMs;
        localStorage.setItem(
          `recent_boards_${user?.username}`,
          JSON.stringify(recent),
        );
        navigate(`/board/${created.id}`);
      }
    } catch {
      console.error("Failed to create board");
    }
  };

  const handleOpen = (id) => {
    const recent = JSON.parse(
      localStorage.getItem(`recent_boards_${user?.username}`) || "{}",
    );
    recent[id] = nowMs;
    localStorage.setItem(
      `recent_boards_${user?.username}`,
      JSON.stringify(recent),
    );
    navigate(`/board/${id}`);
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${BASE}/api/board/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
    } catch {
      console.error("Failed to delete board");
    }
    setBoards((prev) => prev.filter((b) => b.id !== id));
    setDeleteTarget(null);
  };

  const handleRename = async (id, newName) => {
    try {
      await fetch(`${BASE}/api/board/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ title: newName }),
      });
    } catch {
      console.error("Failed to rename board");
    }
    setBoards((prev) =>
      prev.map((b) => (b.id === id ? { ...b, name: newName } : b)),
    );
  };

  const submitShare = async (username, setError) => {
    try {
      const res = await fetch(`${BASE}/api/board/${shareTarget.id}/share`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) return true;
        setError(data.error || "Failed to share board");
        return false;
      }
      return true;
    } catch {
      setError("Cannot connect to server");
      return false;
    }
  };

  const recentHistory = JSON.parse(
    localStorage.getItem(`recent_boards_${user?.username}`) || "{}",
  );
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const filtered = useMemo(
    () =>
      boards.filter((b) => {
        const matchesSearch = (b.name || "")
          .toLowerCase()
          .includes(search.toLowerCase());
        if (!matchesSearch) return false;

        if (activeTab === "recent") {
          const lastOpened = recentHistory[b.id] || 0;
          return lastOpened > 0 && nowMs - lastOpened <= ONE_DAY;
        }

        return true;
      }),
    [ONE_DAY, activeTab, boards, nowMs, recentHistory, search],
  );

  return (
    <div className="h-screen w-screen bg-[#f7f7f8] flex overflow-hidden font-sans">
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Pencil size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-800 text-base tracking-tight">
              Co-Canvas
            </span>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 p-2 rounded-lg">
            <div className="w-7 h-7 bg-blue-100 rounded-md flex items-center justify-center">
              <span className="text-blue-700 text-xs font-bold">
                {user?.username?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <span className="text-sm font-medium text-slate-700 flex-1 truncate">
              {user?.username || "Guest"}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          <button
            onClick={() => setActiveTab("team")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "team"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <LayoutGrid size={16} />
            All boards
          </button>
          <button
            onClick={() => setActiveTab("recent")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "recent"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <Clock size={16} />
            Recent
          </button>
        </nav>

        <div className="px-4 py-3 border-t border-slate-100 space-y-1">
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="w-full flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shrink-0">
          <div className="flex-1 max-w-md relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search boards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div
            title={user?.username}
            className="ml-auto flex items-center gap-3 w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center text-white text-sm font-bold cursor-default"
          >
            {user?.username?.[0]?.toUpperCase() || "U"}
          </div>
        </header>

        <main className="flex-1 overflow-auto px-8 py-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-6">
            {activeTab === "team" && "All boards"}
            {activeTab === "recent" && "Recent boards"}
          </h1>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {[...Array(5)].map((_, i) => (
                <div key={i}>
                  <div className="rounded-xl aspect-[4/3] bg-slate-200 animate-pulse mb-3" />
                  <div className="h-3 w-24 bg-slate-200 animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {activeTab === "team" && <NewBoardCard onCreate={handleCreate} />}

              {filtered.map((board) => {
                const localLastOpened = recentHistory[board.id] || 0;
                const createdAt = new Date(board.createdAt).getTime() || 0;
                const displayTime = Math.max(localLastOpened, createdAt);

                return (
                  <BoardCard
                    key={board.id}
                    board={{ ...board, displayTime }}
                    nowMs={nowMs}
                    onOpen={handleOpen}
                    onDelete={() =>
                      setDeleteTarget({ id: board.id, name: board.name })
                    }
                    onRename={handleRename}
                  />
                );
              })}
            </div>
          )}

          {!loading && filtered.length === 0 && search && (
            <div className="w-full text-center py-16 text-slate-400">
              <Search size={36} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                No boards matching "<strong>{search}</strong>"
              </p>
            </div>
          )}

          {!loading && filtered.length === 0 && !search && activeTab === "recent" && (
            <div className="w-full text-center py-16 text-slate-400">
              <Clock size={36} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                No recent boards opened
              </p>
            </div>
          )}
        </main>
      </div>

      {deleteTarget && (
        <DeleteModal
          boardName={deleteTarget.name}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget.id)}
        />
      )}

      {shareTarget && (
        <ShareModal
          boardId={shareTarget.id}
          boardName={shareTarget.name}
          onCancel={() => setShareTarget(null)}
          onConfirm={submitShare}
        />
      )}
    </div>
  );
}
