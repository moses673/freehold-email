import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

const STATUS_STYLES = {
  pending:     'bg-yellow-100 text-yellow-800',
  provisioned: 'bg-green-100 text-green-800',
  declined:    'bg-gray-100 text-gray-500',
};

export default function SignupsPage() {
  const [signups, setSignups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [editingNote, setEditingNote] = useState({}); // { [id]: string }

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchSignups();
  }, []);

  async function fetchSignups() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/signups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load signups');
      const data = await res.json();
      setSignups(data.signups);
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateSignup(id, patch) {
    setUpdatingId(id);
    try {
      const res = await fetch(`${API_URL}/api/signups/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('Update failed');
      const data = await res.json();
      setSignups(prev => prev.map(s => s.id === id ? data.signup : s));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  function formatDate(dt) {
    return new Date(dt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg text-red-700">{error}</div>
    );
  }

  const slotsFilled = stats ? stats.limit - stats.remaining : 0;
  const pct = stats ? Math.round((slotsFilled / stats.limit) * 100) : 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Founding Users</h1>
          <p className="text-sm text-gray-500 mt-1">
            People who claimed a free founding copy from freeholdtools.com
          </p>
        </div>
        <button
          onClick={fetchSignups}
          className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600"
        >
          Refresh
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              Founding slots: <strong>{slotsFilled}</strong> / {stats.limit} claimed
            </span>
            <span className="text-sm text-gray-500">{stats.remaining} remaining</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex gap-6 mt-4 text-sm">
            <span className="text-yellow-700">
              <strong>{stats.pending}</strong> pending
            </span>
            <span className="text-green-700">
              <strong>{stats.provisioned}</strong> provisioned
            </span>
            <span className="text-gray-500">
              <strong>{stats.declined}</strong> declined
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      {signups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-lg">No signups yet.</p>
          <p className="text-gray-400 text-sm mt-1">
            They'll appear here when someone claims a founding copy on freeholdtools.com.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 font-medium text-gray-600">Signed up</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Notes</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {signups.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <a
                      href={`mailto:${s.email}`}
                      className="hover:text-indigo-600 hover:underline"
                    >
                      {s.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {formatDate(s.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[s.status]}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {editingNote[s.id] !== undefined ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={editingNote[s.id]}
                          onChange={e => setEditingNote(prev => ({ ...prev, [s.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateSignup(s.id, { notes: editingNote[s.id] });
                              setEditingNote(prev => { const n = { ...prev }; delete n[s.id]; return n; });
                            }
                            if (e.key === 'Escape') {
                              setEditingNote(prev => { const n = { ...prev }; delete n[s.id]; return n; });
                            }
                          }}
                          className="text-xs border border-gray-300 rounded px-2 py-1 w-40 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          autoFocus
                          placeholder="Add note..."
                        />
                        <button
                          onClick={() => {
                            updateSignup(s.id, { notes: editingNote[s.id] });
                            setEditingNote(prev => { const n = { ...prev }; delete n[s.id]; return n; });
                          }}
                          className="text-xs text-green-600 hover:text-green-800 px-1"
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <span
                        className="text-gray-500 cursor-pointer hover:text-gray-700 text-xs"
                        onClick={() => setEditingNote(prev => ({ ...prev, [s.id]: s.notes || '' }))}
                        title="Click to edit"
                      >
                        {s.notes || <span className="italic text-gray-300">add note</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {s.status !== 'provisioned' && (
                        <button
                          onClick={() => updateSignup(s.id, { status: 'provisioned' })}
                          disabled={updatingId === s.id}
                          className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition disabled:opacity-50"
                        >
                          Provision
                        </button>
                      )}
                      {s.status !== 'pending' && (
                        <button
                          onClick={() => updateSignup(s.id, { status: 'pending' })}
                          disabled={updatingId === s.id}
                          className="px-2 py-1 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 transition disabled:opacity-50"
                        >
                          Pending
                        </button>
                      )}
                      {s.status !== 'declined' && (
                        <button
                          onClick={() => updateSignup(s.id, { status: 'declined' })}
                          disabled={updatingId === s.id}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition disabled:opacity-50"
                        >
                          Decline
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
