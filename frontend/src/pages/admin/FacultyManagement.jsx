/**
 * FacultyManagement.jsx — Admin Faculty Management View & Status Control
 *
 * Provides administrators with a directory of all registered faculty,
 * search and filtering capabilities, status breakdown metrics, and
 * the ability to activate or deactivate faculty accounts with confirmation.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import AppLayout from '../../components/common/AppLayout';
import { getAdminFacultyList, updateFacultyStatus } from '../../api/facultyApi';

function FacultySkeleton() {
  return (
    <div className="glass-card animate-pulse p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-700/60" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-slate-700/50 rounded" />
          <div className="h-3 w-48 bg-slate-700/40 rounded" />
        </div>
      </div>
      <div className="h-4 w-24 bg-slate-700/40 rounded hidden sm:block" />
      <div className="h-6 w-16 bg-slate-700/40 rounded-full" />
      <div className="h-8 w-24 bg-slate-700/40 rounded" />
    </div>
  );
}

function FacultyManagement() {
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    faculty: null,
    targetStatus: false,
    isSubmitting: false,
  });

  const [notification, setNotification] = useState(null);

  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminFacultyList();
      setFacultyList(res.data.faculty || []);
    } catch {
      setError('Failed to fetch faculty directory. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  // Unique departments for filter dropdown
  const departments = useMemo(() => {
    const deps = new Set(
      facultyList.map((f) => f.department).filter((d) => Boolean(d && d.trim()))
    );
    return ['All', ...[...deps].sort()];
  }, [facultyList]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = facultyList.length;
    const active = facultyList.filter((f) => f.isActive !== false).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [facultyList]);

  // Filtered list
  const filteredFaculty = useMemo(() => {
    return facultyList.filter((f) => {
      const name = (f.name || '').toLowerCase();
      const email = (f.email || '').toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch = !query || name.includes(query) || email.includes(query);
      const matchesDept =
        departmentFilter === 'All' || (f.department || 'Unassigned') === departmentFilter;
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'active' && f.isActive !== false) ||
        (statusFilter === 'inactive' && f.isActive === false);

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [facultyList, searchTerm, departmentFilter, statusFilter]);

  // Prompt confirmation
  const handlePromptToggle = (faculty) => {
    const currentIsActive = faculty.isActive !== false;
    setConfirmModal({
      isOpen: true,
      faculty,
      targetStatus: !currentIsActive,
      isSubmitting: false,
    });
  };

  // Execute status change
  const handleConfirmToggle = async () => {
    if (!confirmModal.faculty) return;
    const target = confirmModal.faculty;
    const newStatus = confirmModal.targetStatus;

    setConfirmModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await updateFacultyStatus(target._id, newStatus);
      setFacultyList((prev) =>
        prev.map((f) => (f._id === target._id ? { ...f, isActive: newStatus } : f))
      );
      setNotification({
        type: 'success',
        message: `Faculty account for ${target.name} has been ${newStatus ? 'activated' : 'deactivated'}.`,
      });
      setTimeout(() => setNotification(null), 4000);
      setConfirmModal({ isOpen: false, faculty: null, targetStatus: false, isSubmitting: false });
    } catch {
      setNotification({
        type: 'error',
        message: 'Failed to update faculty account status. Please try again.',
      });
      setTimeout(() => setNotification(null), 4000);
      setConfirmModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto animate-fadeIn">
        {/* Notification Banner */}
        {notification && (
          <div
            className="mb-4 p-3.5 rounded-xl text-sm flex items-center justify-between animate-fadeIn"
            style={{
              background:
                notification.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${
                notification.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'
              }`,
              color: notification.type === 'success' ? '#34d399' : '#f87171',
            }}
          >
            <div className="flex items-center gap-2">
              <span>{notification.type === 'success' ? '✅' : '⚠️'}</span>
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs opacity-70 hover:opacity-100 cursor-pointer ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Faculty Management</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              View and manage institutional faculty profiles, departments, and account access
            </p>
          </div>
          <button
            onClick={fetchFaculty}
            className="btn-secondary self-start sm:self-auto text-xs flex items-center gap-2 cursor-pointer"
            disabled={loading}
          >
            <span>🔄</span> Refresh List
          </button>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--color-primary-light)' }}
            >
              👥
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Total Faculty
              </p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--color-text)' }}>
                {metrics.total}
              </p>
            </div>
          </div>

          <div className="glass-card p-4 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--color-success)' }}
            >
              ✅
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Active Accounts
              </p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--color-success)' }}>
                {metrics.active}
              </p>
            </div>
          </div>

          <div className="glass-card p-4 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--color-error)' }}
            >
              🚫
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Deactivated
              </p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--color-error)' }}>
                {metrics.inactive}
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{ color: 'var(--color-text-muted)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="faculty-search"
              type="text"
              aria-label="Search faculty by name or email"
              placeholder="Search by name or email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>

          <select
            id="faculty-department-filter"
            aria-label="Filter faculty by department"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="input-field sm:w-48"
          >
            {departments.map((dep) => (
              <option key={dep} value={dep}>
                {dep === 'All' ? 'All Departments' : dep}
              </option>
            ))}
          </select>

          <select
            id="faculty-status-filter"
            aria-label="Filter faculty by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field sm:w-40"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </select>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="mb-6 p-4 rounded-lg text-sm flex items-center justify-between"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
          >
            <span>⚠️ {error}</span>
            <button className="btn-secondary text-xs" onClick={fetchFaculty}>
              Retry
            </button>
          </div>
        )}

        {/* Directory Table / Loading States */}
        {loading ? (
          <div className="space-y-3">
            <FacultySkeleton />
            <FacultySkeleton />
            <FacultySkeleton />
          </div>
        ) : filteredFaculty.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-5xl mb-4">🔍</p>
            <p className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
              {facultyList.length === 0 ? 'No faculty accounts found' : 'No faculty match your search criteria'}
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {facultyList.length === 0
                ? 'Faculty accounts will appear here when registered or seeded.'
                : 'Try adjusting your search terms or clearing the filters.'}
            </p>
            {(searchTerm || departmentFilter !== 'All' || statusFilter !== 'All') && (
              <button
                className="btn-secondary mt-5 text-xs cursor-pointer"
                onClick={() => {
                  setSearchTerm('');
                  setDepartmentFilter('All');
                  setStatusFilter('All');
                }}
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" role="table">
                <thead
                  className="border-b text-xs uppercase tracking-wider font-semibold"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'var(--color-text-muted)' }}
                >
                  <tr>
                    <th scope="col" className="p-4">Faculty Member</th>
                    <th scope="col" className="p-4">Department</th>
                    <th scope="col" className="p-4 hidden md:table-cell">Designation</th>
                    <th scope="col" className="p-4 hidden sm:table-cell">Joined</th>
                    <th scope="col" className="p-4">Status</th>
                    <th scope="col" className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredFaculty.map((faculty) => {
                    const isActive = faculty.isActive !== false;
                    const initials = (faculty.name || 'F')
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <tr key={faculty._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {faculty.profilePicture ? (
                              <img
                                src={faculty.profilePicture}
                                alt={faculty.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs"
                                style={{
                                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                                  color: '#fff',
                                }}
                              >
                                {initials}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-white leading-snug">{faculty.name}</p>
                              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                {faculty.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text)' }}
                          >
                            {faculty.department || 'Unassigned'}
                          </span>
                        </td>

                        <td className="p-4 hidden md:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                          {faculty.designation || 'Faculty'}
                        </td>

                        <td className="p-4 hidden sm:table-cell text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {faculty.createdAt
                            ? new Date(faculty.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </td>

                        <td className="p-4">
                          {isActive ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={{
                                background: 'rgba(16,185,129,0.15)',
                                color: 'var(--color-success)',
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={{
                                background: 'rgba(239,68,68,0.15)',
                                color: 'var(--color-error)',
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              Deactivated
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-right">
                          <button
                            id={`toggle-status-${faculty._id}`}
                            aria-label={`${isActive ? 'Deactivate' : 'Activate'} account for ${faculty.name}`}
                            onClick={() => handlePromptToggle(faculty)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            style={
                              isActive
                                ? {
                                    background: 'rgba(239,68,68,0.12)',
                                    color: '#f87171',
                                    border: '1px solid rgba(239,68,68,0.25)',
                                  }
                                : {
                                    background: 'rgba(16,185,129,0.12)',
                                    color: '#34d399',
                                    border: '1px solid rgba(16,185,129,0.25)',
                                  }
                            }
                          >
                            {isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-800/50 flex items-center justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span>
                Showing {filteredFaculty.length} of {facultyList.length} faculty member{facultyList.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmModal.isOpen && confirmModal.faculty && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
          >
            <div className="glass-card max-w-md w-full p-6 animate-scaleUp">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">
                  {confirmModal.targetStatus ? '✅' : '⚠️'}
                </span>
                <h3 id="confirm-modal-title" className="text-lg font-bold text-white">
                  {confirmModal.targetStatus
                    ? 'Activate Faculty Account'
                    : 'Deactivate Faculty Account'}
                </h3>
              </div>

              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-text-muted)' }}>
                {confirmModal.targetStatus ? (
                  <>
                    Are you sure you want to activate the account for{' '}
                    <strong className="text-white">{confirmModal.faculty.name}</strong>? They will regain
                    immediate access to login and enroll in courses.
                  </>
                ) : (
                  <>
                    Are you sure you want to deactivate the account for{' '}
                    <strong className="text-white">{confirmModal.faculty.name}</strong>? The faculty member
                    will be blocked from logging in until their account is reactivated.
                  </>
                )}
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setConfirmModal({
                      isOpen: false,
                      faculty: null,
                      targetStatus: false,
                      isSubmitting: false,
                    })
                  }
                  className="btn-secondary text-xs px-4 py-2 cursor-pointer"
                  disabled={confirmModal.isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmToggle}
                  className="text-xs px-4 py-2 rounded-lg font-semibold text-white transition-opacity cursor-pointer disabled:opacity-50"
                  style={{
                    background: confirmModal.targetStatus
                      ? 'var(--color-success)'
                      : 'var(--color-error)',
                  }}
                  disabled={confirmModal.isSubmitting}
                >
                  {confirmModal.isSubmitting
                    ? 'Updating…'
                    : confirmModal.targetStatus
                    ? 'Yes, Activate'
                    : 'Yes, Deactivate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default FacultyManagement;
