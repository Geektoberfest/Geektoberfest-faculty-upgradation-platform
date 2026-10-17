/**
 * CourseBrowser.jsx
 *
 * Faculty Course Browser.
 * Lists all published and active courses from GET /api/courses.
 * Supports text search, category filtering, difficulty filtering,
 * skeleton loaders, error retry, and thumbnail fallback image handling.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppLayout from '../../components/common/AppLayout';
import { getCourses } from '../../api/courseApi';
import useDebounce from '../../hooks/useDebounce';

const DIFFICULTY_COLOR = {
  beginner: 'var(--color-success)',
  intermediate: 'var(--color-warning)',
  advanced: 'var(--color-error)',
};

function CourseThumbnail({ thumbnail, title, category }) {
  const [imgError, setImgError] = useState(false);

  if (thumbnail && !imgError) {
    return (
      <div className="h-40 w-full overflow-hidden rounded-t-lg bg-slate-800">
        <img
          src={thumbnail}
          alt={title}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
    );
  }

  // Fallback gradient badge when thumbnail is missing or fails to load
  return (
    <div
      className="h-32 w-full rounded-t-lg flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.3), rgba(6,182,212,0.2))' }}
      aria-hidden="true"
    >
      <div className="text-center z-10">
        <span className="text-3xl" role="img" aria-hidden="true">🎓</span>
        <p className="text-xs font-semibold mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {category || 'Faculty Course'}
        </p>
      </div>
    </div>
  );
}

function CourseCard({ course }) {
  const diffColor = DIFFICULTY_COLOR[course.difficulty] || 'var(--color-text-muted)';
  const accessibleLabel = `View course: ${course.title}, ${course.credits ? `${course.credits} credits` : '0 credits'}, ${course.difficulty || 'unspecified'} level`;

  return (
    <article
      role="article"
      aria-label={course.title}
      className="h-full"
    >
      <Link
        to={`/courses/${course._id}`}
        aria-label={accessibleLabel}
        className="block h-full rounded-2xl"
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <div
          className="glass-card flex flex-col h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer overflow-hidden"
          style={{ borderTop: `3px solid var(--color-primary)` }}
        >
          <CourseThumbnail
            thumbnail={course.thumbnail}
            title={course.title}
            category={course.category}
          />

          <div className="p-5 flex flex-col flex-1 gap-3">
            {/* Category + difficulty row */}
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--color-primary-light)' }}
              >
                {course.category || 'General'}
              </span>
              <span
                className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full"
                style={{ background: `${diffColor}20`, color: diffColor }}
              >
                {course.difficulty}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold leading-snug" style={{ color: 'var(--color-text)' }}>
              {course.title}
            </h3>

            {/* Description */}
            <p
              className="text-sm flex-1 line-clamp-3"
              style={{ color: 'var(--color-text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}
            >
              {course.description || 'No description available.'}
            </p>

            {/* Footer meta */}
            <div
              className="flex items-center gap-4 pt-3 text-xs mt-auto"
              style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              {course.instructor && (
                <span className="flex items-center gap-1 truncate">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="truncate">{course.instructor}</span>
                </span>
              )}
              {course.credits > 0 && (
                <span className="flex items-center gap-1 ml-auto font-semibold shrink-0" style={{ color: 'var(--color-accent)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {course.credits} credits
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

function CourseSkeleton() {
  return (
    <div className="glass-card h-80 animate-pulse p-5 flex flex-col gap-3">
      <div className="h-32 bg-slate-700/40 rounded-lg w-full mb-2" />
      <div className="h-4 bg-slate-700/50 rounded w-1/3" />
      <div className="h-5 bg-slate-700/60 rounded w-3/4" />
      <div className="h-4 bg-slate-700/40 rounded w-full" />
      <div className="h-4 bg-slate-700/40 rounded w-2/3" />
    </div>
  );
}

function CourseBrowser() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL search params as single source of truth
  const urlSearch = searchParams.get('search') || '';
  const categoryFilter = searchParams.get('category') || 'All';
  const difficultyFilter = searchParams.get('difficulty') || 'All';
  const currentPage = parseInt(searchParams.get('page'), 10) || 1;

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(urlSearch);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search query by 300ms
  const debouncedSearch = useDebounce(search, 300);

  // Synchronize debounced search to URL query parameter
  useEffect(() => {
    setSearchParams((prev) => {
      const currentParam = prev.get('search') || '';
      const trimmed = debouncedSearch.trim();
      if (currentParam === trimmed) return prev;

      const next = new URLSearchParams(prev);
      if (trimmed) {
        next.set('search', trimmed);
      } else {
        next.delete('search');
      }
      next.delete('page');
      return next;
    }, { replace: true });
  }, [debouncedSearch, setSearchParams]);

  // Synchronize local input state if URL search param changes externally (e.g. Back/Forward)
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const fetchCourses = useCallback(() => {
    setLoading(true);
    setError('');

    const params = { page: currentPage, limit: 9 };
    if (urlSearch.trim()) params.search = urlSearch.trim();
    if (categoryFilter !== 'All') params.category = categoryFilter;
    if (difficultyFilter !== 'All') params.difficulty = difficultyFilter;

    getCourses(params)
      .then((res) => {
        setCourses(res.data.courses || []);
        setTotalPages(res.data.totalPages || 1);
      })
      .catch(() => {
        setError('Failed to load courses from server. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [urlSearch, categoryFilter, difficultyFilter, currentPage]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val && val !== 'All') {
        next.set('category', val);
      } else {
        next.delete('category');
      }
      next.delete('page');
      return next;
    });
  };

  const handleDifficultyChange = (e) => {
    const val = e.target.value;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val && val !== 'All') {
        next.set('difficulty', val);
      } else {
        next.delete('difficulty');
      }
      next.delete('page');
      return next;
    });
  };

  const handlePageChange = (newPage) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPage > 1) {
        next.set('page', newPage.toString());
      } else {
        next.delete('page');
      }
      return next;
    });
  };

  const handleClearFilters = () => {
    setSearch('');
    setSearchParams({});
  };

  // Categories (including any preselected category from URL)
  const categories = useMemo(() => {
    const catSet = new Set(courses.map((c) => c.category || 'General'));
    if (categoryFilter && categoryFilter !== 'All') {
      catSet.add(categoryFilter);
    }
    return ['All', ...[...catSet].sort()];
  }, [courses, categoryFilter]);

  // Filtered
  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        !urlSearch ||
        c.title.toLowerCase().includes(urlSearch.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(urlSearch.toLowerCase()) ||
        (c.instructor || '').toLowerCase().includes(urlSearch.toLowerCase());

      const matchesCategory =
        categoryFilter === 'All' || (c.category || 'General') === categoryFilter;

      const matchesDifficulty =
        difficultyFilter === 'All' || c.difficulty === difficultyFilter;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [courses, urlSearch, categoryFilter, difficultyFilter]);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto animate-fadeIn">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold gradient-text">Browse Courses</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Explore available professional development courses for faculty skill upgradation
          </p>
        </div>

        {/* Search + Filter Controls */}
        <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              style={{ color: 'var(--color-text-muted)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="course-search"
              type="text"
              aria-label="Search courses by title, description, or instructor"
              placeholder="Search by title, description, or instructor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>

          <select
            id="course-category-filter"
            aria-label="Filter courses by category"
            value={categoryFilter}
            onChange={handleCategoryChange}
            className="input-field sm:w-44"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            id="course-difficulty-filter"
            aria-label="Filter courses by difficulty"
            value={difficultyFilter}
            onChange={handleDifficultyChange}
            className="input-field sm:w-40"
          >
            <option value="All">All Difficulties</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* Error State with Retry */}
        {error && (
          <div
            className="mb-6 p-4 rounded-lg text-sm flex items-center justify-between"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
          >
            <span>⚠️ {error}</span>
            <button className="btn-secondary text-xs" onClick={fetchCourses}>Retry</button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <CourseSkeleton />
            <CourseSkeleton />
            <CourseSkeleton />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-5xl mb-4">🔍</p>
            <p className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
              {courses.length === 0 ? 'No published courses available yet' : 'No courses match your search criteria'}
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {courses.length === 0
                ? 'An administrator will publish courses shortly. Check back soon.'
                : 'Try adjusting your search terms or clearing difficulty/category filters.'}
            </p>
            {(search || categoryFilter !== 'All' || difficultyFilter !== 'All') && (
              <button
                className="btn-secondary mt-5 text-xs cursor-pointer"
                onClick={handleClearFilters}
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Showing {filtered.length} of {courses.length} course{courses.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" role="region" aria-label="Course list">
              {filtered.map((course) => (
                <CourseCard key={course._id} course={course} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-700/50">
                <button
                  id="pagination-prev"
                  aria-label="Go to previous page"
                  className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1 || loading}
                >
                  ← Previous
                </button>
                <div className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  Page <span className="font-semibold text-white">{currentPage}</span> of{' '}
                  <span className="font-semibold text-white">{totalPages}</span>
                </div>
                <button
                  id="pagination-next"
                  aria-label="Go to next page"
                  className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages || loading}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}


export default CourseBrowser;
