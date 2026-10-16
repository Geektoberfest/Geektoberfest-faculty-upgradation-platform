/**
 * EnrollmentOverview.jsx — Admin Enrollment Overview & Filterable Directory
 *
 * Centralized dashboard for administrators to view, search, and monitor
 * faculty course enrollments, module completion progress, and total awarded credits.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import AppLayout from '../../components/common/AppLayout';
import { getAllEnrollmentsAdmin } from '../../api/enrollmentApi';

function EnrollmentSkeleton() {
  return (
    <div className="glass-card animate-pulse p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-700/60" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-slate-700/50 rounded" />
          <div className="h-3 w-44 bg-slate-700/40 rounded" />
        </div>
      </div>
      <div className="h-4 w-40 bg-slate-700/40 rounded hidden md:block" />
      <div className="h-3 w-28 bg-slate-700/40 rounded hidden sm:block" />
      <div className="h-6 w-20 bg-slate-700/40 rounded-full" />
    </div>
  );
}

function EnrollmentOverview() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter !== 'All') {
        params.status = statusFilter;
      }
      const res = await getAllEnrollmentsAdmin(params);
      setEnrollments(res.data.enrollments || []);
    } catch {
      setError('Failed to fetch institutional enrollments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = enrollments.length;
    const inProgress = enrollments.filter(
      (e) => e.status === 'in-progress' || (e.status === 'enrolled' && e.progress > 0 && e.progress < 100)
    ).length;
    const completed = enrollments.filter((e) => e.status === 'completed').length;
    const totalCreditsAwarded = enrollments
      .filter((e) => e.status === 'completed')
      .reduce((sum, e) => sum + (e.course?.credits || 0), 0);

    return { total, inProgress, completed, totalCreditsAwarded };
  }, [enrollments]);

  // Unique Categories
  const categories = useMemo(() => {
    const cats = new Set(
      enrollments
        .map((e) => e.course?.category)
        .filter((c) => Boolean(c && c.trim()))
    );
    return ['All', ...[...cats].sort()];
  }, [enrollments]);

  // Filtered List
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((e) => {
      const facultyName = (e.faculty?.name || '').toLowerCase();
      const facultyEmail = (e.faculty?.email || '').toLowerCase();
      const courseTitle = (e.course?.title || '').toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !query ||
        facultyName.includes(query) ||
        facultyEmail.includes(query) ||
        courseTitle.includes(query);

      const matchesCategory =
        categoryFilter === 'All' || (e.course?.category || 'General') === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [enrollments, searchTerm, categoryFilter]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setCategoryFilter('All');
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Enrollment Overview</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Monitor institutional course enrollments, faculty progress, and credit completion analytics
            </p>
          </div>
          <button
            onClick={fetchEnrollments}
            className="btn-secondary self-start sm:self-auto text-xs flex items-center gap-2 cursor-pointer"
            disabled={loading}
          >
            <span>🔄</span> Refresh Data
          </button>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--color-primary-light)' }}
            >
              📚
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Total Enrollments
              </p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--color-text)' }}>
                {metrics.total}
              </p>
            </div>
          </div>

          <div className="glass-card p-4 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning)' }}
            >
              ⏳
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                In-Progress
              </p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--color-warning)' }}>
                {metrics.inProgress}
              </p>
            </div>
          </div>

          <div className="glass-card p-4 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--color-success)' }}
            >
              🎓
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Completed
              </p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--color-success)' }}>
                {metrics.completed}
              </p>
            </div>
          </div>

          <div className="glass-card p-4 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}
            >
              ⭐
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Credits Awarded
              </p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: '#c084fc' }}>
                {metrics.totalCreditsAwarded}
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
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
              id="enrollment-search"
              type="text"
              aria-label="Search enrollments by faculty name, email, or course title"
              placeholder="Search by faculty name, email, or course title…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>

          <select
            id="enrollment-status-filter"
            aria-label="Filter by enrollment status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field sm:w-44"
          >
            <option value="All">All Statuses</option>
            <option value="enrolled">Enrolled</option>
            <option value="in-progress">In-Progress</option>
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
          </select>

          <select
            id="enrollment-category-filter"
            aria-label="Filter by course category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field sm:w-44"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="mb-6 p-4 rounded-lg text-sm flex items-center justify-between"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
          >
            <span>⚠️ {error}</span>
            <button className="btn-secondary text-xs" onClick={fetchEnrollments}>
              Retry
            </button>
          </div>
        )}

        {/* Data Table / Loading States */}
        {loading ? (
          <div className="space-y-3">
            <EnrollmentSkeleton />
            <EnrollmentSkeleton />
            <EnrollmentSkeleton />
          </div>
        ) : filteredEnrollments.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-5xl mb-4">🔍</p>
            <p className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
              {enrollments.length === 0 ? 'No enrollments found' : 'No enrollments match your search criteria'}
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {enrollments.length === 0
                ? 'Course enrollments will appear here once faculty members enroll in courses.'
                : 'Try adjusting your search query or resetting the status and category filters.'}
            </p>
            {(searchTerm || statusFilter !== 'All' || categoryFilter !== 'All') && (
              <button
                className="btn-secondary mt-5 text-xs cursor-pointer"
                onClick={handleClearFilters}
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
                    <th scope="col" className="p-4">Course</th>
                    <th scope="col" className="p-4">Progress</th>
                    <th scope="col" className="p-4">Status</th>
                    <th scope="col" className="p-4 hidden sm:table-cell">Enrolled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredEnrollments.map((item) => {
                    const faculty = item.faculty || {};
                    const course = item.course || {};
                    const progress = item.progress ?? 0;
                    const initials = (faculty.name || 'F')
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    let statusBadge;
                    switch (item.status) {
                      case 'completed':
                        statusBadge = (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--color-success)' }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Completed
                          </span>
                        );
                        break;
                      case 'in-progress':
                        statusBadge = (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning)' }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            In-Progress
                          </span>
                        );
                        break;
                      case 'dropped':
                        statusBadge = (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(148,163,184,0.15)', color: '#94a3b8' }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Dropped
                          </span>
                        );
                        break;
                      default:
                        statusBadge = (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            Enrolled
                          </span>
                        );
                    }

                    return (
                      <tr key={item._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                              style={{
                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                                color: '#fff',
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-white leading-snug">{faculty.name || 'Unknown Faculty'}</p>
                              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                {faculty.email || '—'} {faculty.department ? `• ${faculty.department}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <p className="font-semibold text-white leading-snug">{course.title || 'Untitled Course'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--color-primary-light)' }}
                            >
                              {course.category || 'General'}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {course.credits ? `${course.credits} credits` : '0 credits'}
                            </span>
                          </div>
                        </td>

                        <td className="p-4 w-44">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span style={{ color: 'var(--color-text-muted)' }}>Progress</span>
                              <span className="font-semibold text-white">{progress}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${progress}%`,
                                  background:
                                    progress === 100
                                      ? 'var(--color-success)'
                                      : 'linear-gradient(90deg, var(--color-primary), var(--color-accent))',
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="p-4">{statusBadge}</td>

                        <td className="p-4 hidden sm:table-cell text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              className="p-4 border-t border-slate-800/50 flex items-center justify-between text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <span>
                Showing {filteredEnrollments.length} of {enrollments.length} enrollment{enrollments.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default EnrollmentOverview;
