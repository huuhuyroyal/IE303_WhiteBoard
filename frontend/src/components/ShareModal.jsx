import { useState, useEffect } from 'react';
import { Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ShareModal({ boardId, boardName, onConfirm, onCancel }) {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [owner, setOwner] = useState(null);
  const [sharedUsers, setSharedUsers] = useState([]);

  useEffect(() => {
    if (!boardId) return;

    const fetchMembers = async () => {
      try {
        const token = user?.token;
        const res = await fetch(`http://localhost:5000/api/board/${boardId}/members`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const data = await res.json();
          setOwner(data.owner || null);
          setSharedUsers(Array.isArray(data.members) ? data.members : []);
        }
      } catch (err) {
        console.error('Failed to fetch members:', err);
      }
    };

    fetchMembers();
  }, [boardId, user?.token]);

  const handleShare = async () => {
    if (!username.trim()) return;

    const targetUsername = username.trim();
    const success = await onConfirm(targetUsername, setError);

    if (success) {
      setSharedUsers((prev) => prev.includes(targetUsername) ? prev : [...prev, targetUsername]);
      setUsername('');
    }
  };

  const copyLink = async () => {
    const url = window.location.pathname.includes('/board/')
      ? window.location.href
      : window.location.origin;

    try {
      await navigator.clipboard.writeText(url);
      setError('');
    } catch {
      setError('Failed to copy link');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-[500px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-normal text-slate-800">Share "{boardName}"</h2>
        </div>

        <div className="mb-6 relative">
          <div className={`border rounded-lg transition-colors overflow-hidden ${isFocused ? 'border-blue-600 ring-1 ring-blue-600' : 'border-slate-400'}`}>
            <input
              type="text"
              placeholder="Add username"
              value={username}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(event) => {
                setUsername(event.target.value);
                setError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleShare();
              }}
              className="w-full px-4 py-3.5 text-sm text-slate-800 outline-none bg-transparent"
            />
          </div>
          {error && <p className="text-xs text-red-500 mt-1 absolute">{error}</p>}
        </div>

        <div className="mb-6">
          <h3 className="text-[13px] font-medium text-slate-700 mb-3">People with access</h3>

          <div className="flex flex-col gap-4">
            {owner && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm">
                    {owner[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-slate-800">
                      {owner} {owner === user?.username ? '(you)' : ''}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-slate-500">Owner</span>
              </div>
            )}

            {sharedUsers
              .filter((member) => member !== owner)
              .map((member) => (
                <div key={member} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                      {member[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[15px] font-medium text-slate-800">
                        {member} {member === user?.username ? '(you)' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600 px-1 py-1 rounded">
                    <span className="text-sm">Member</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium"
          >
            <LinkIcon size={16} />
            Copy Link
          </button>

          <button
            onClick={() => {
              if (username.trim()) handleShare();
              else onCancel();
            }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors"
          >
            {username.trim() ? 'Share now' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
