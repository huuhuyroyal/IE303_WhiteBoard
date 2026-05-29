import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react';

const BASE = 'http://localhost:5000';

export default function RequestAccess() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.token || '';
  
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState('');

  const handleRequestAccess = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/api/board/${boardId}/request-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        setRequested(true);
      } else {
        const data = await res.json();
        if (data.error === 'Already requested') {
           setRequested(true);
        } else {
           setError(data.error || 'Failed to request access.');
        }
      }
    } catch (err) {
      setError('Network error. Could not request access.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-slate-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 mb-2">You need access</h1>
        <p className="text-slate-600 mb-8">
          Ask for access, or switch to an account with permission to view this board.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {requested ? (
          <div className="mb-8 p-4 bg-green-50 text-green-700 rounded-lg flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Request sent to the owner!</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mb-8">
            <button
              onClick={handleRequestAccess}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? 'Requesting...' : 'Request Access'}
            </button>
          </div>
        )}

        <div className="border-t border-slate-100 pt-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 font-medium transition-colors w-full"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
