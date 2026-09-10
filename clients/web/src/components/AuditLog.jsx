import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Search, ChevronLeft, ChevronRight, RefreshCw, Filter } from 'lucide-react';

const API = 'http://localhost:3001';

const ACTION_COLORS = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  LOGIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  SALE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
};

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auditLog?_sort=timestamp&_order=desc&_limit=200`);
      if (res.ok) setLogs(await res.json());
    } catch { setLogs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(l => {
    const matchSearch = l.userName?.toLowerCase().includes(search.toLowerCase()) ||
      l.resource?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      String(l.resourceId)?.includes(search);
    const matchAction = !actionFilter || l.action === actionFilter;
    const matchResource = !resourceFilter || l.resource === resourceFilter;
    return matchSearch && matchAction && matchResource;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueResources = [...new Set(logs.map(l => l.resource))];

  const formatTs = (ts) => {
    try { return new Date(ts).toLocaleString(); } catch { return ts; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-7 w-7 text-red-600" /> Full Audit Trail
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Every create, update, and delete — who did it, what changed, and when
          </p>
        </div>
        <button onClick={fetchLogs} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search user, resource, action..."
            className="pl-9 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm">
          <option value="">All Actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={resourceFilter} onChange={e => setResourceFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm">
          <option value="">All Resources</option>
          {uniqueResources.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={() => { setSearch(''); setActionFilter(''); setResourceFilter(''); setPage(1); }} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['Timestamp', 'User', 'Action', 'Resource', 'ID', 'Changes'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paged.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatTs(log.timestamp)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{log.userName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{log.resource}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{log.resourceId}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                      {log.oldValue && <div><span className="text-red-500">−</span> {String(log.oldValue).slice(0, 60)}</div>}
                      {log.newValue && <div><span className="text-green-500">+</span> {String(log.newValue).slice(0, 60)}</div>}
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">No audit log entries found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 disabled:opacity-40 text-gray-600 dark:text-gray-400">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1 disabled:opacity-40 text-gray-600 dark:text-gray-400">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
