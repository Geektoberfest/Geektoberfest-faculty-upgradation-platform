/**
 * CourseManagement.jsx
 *
 * Administrator Course Management Interface.
 * Allows administrators to:
 *   - View all courses (published, draft, and deactivated)
 *   - Create new courses with nested module definitions
 *   - Edit existing course metadata and module list
 *   - Toggle publication status (Draft vs Published)
 *   - Deactivate courses safely (soft delete)
 */

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../components/common/AppLayout';
import { getCourses, createCourse, updateCourse, deleteCourse } from '../../api/courseApi';

const DIFFICULTY_OPTIONS = ['beginner', 'intermediate', 'advanced'];

/**
 * Validates and sanitizes URLs entered in the course form.
 * - Automatically prepends 'https://' to domain-only strings (e.g. www.example.com or example.com)
 * - Enforces http:// or https:// protocol
 * - Strictly rejects dangerous protocols (e.g. javascript:, data:, vbscript:)
 *
 * @param {string} rawUrl
 * @returns {{ isValid: boolean, sanitizedUrl: string, error?: string }}
 */
function sanitizeAndValidateUrl(rawUrl) {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { isValid: true, sanitizedUrl: '' };
  }

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return {
      isValid: false,
      sanitizedUrl: trimmed,
      error: 'URLs must start with http:// or https://',
    };
  }

  let formatted = trimmed;
  if (!/^https?:\/\//i.test(formatted)) {
    // If it has another scheme like ftp://, file://, mailto:
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(formatted)) {
      return {
        isValid: false,
        sanitizedUrl: formatted,
        error: 'URLs must start with http:// or https://',
      };
    }
    // Automatically prepend https:// to domain-only strings (e.g. example.com, www.example.com)
    formatted = `https://${formatted}`;
  }

  try {
    const parsed = new URL(formatted);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        isValid: false,
        sanitizedUrl: formatted,
        error: 'URLs must start with http:// or https://',
      };
    }
    if (!parsed.hostname || (parsed.hostname !== 'localhost' && !parsed.hostname.includes('.'))) {
      return {
        isValid: false,
        sanitizedUrl: formatted,
        error: 'URLs must start with http:// or https:// and include a valid domain name.',
      };
    }
    return { isValid: true, sanitizedUrl: formatted };
  } catch {
    return {
      isValid: false,
      sanitizedUrl: formatted,
      error: 'URLs must start with http:// or https://',
    };
  }
}

const INITIAL_COURSE_FORM = {
  title: '',
  description: '',
  category: 'General',
  provider: '',
  instructor: '',
  difficulty: 'beginner',
  duration: 0,
  credits: 0,
  tags: '',
  thumbnail: '',
  externalUrl: '',
  isPublished: false,
  modules: [],
};

function CourseManagement() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [form, setForm] = useState(INITIAL_COURSE_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Deactivate Confirmation Modal State
  const [deactivatingCourse, setDeactivatingCourse] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const fetchAllCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getCourses();
      setCourses(res.data.courses || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load courses for administration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCourses();
  }, []);

  // Filtered courses
  const categories = useMemo(() => {
    const cats = [...new Set(courses.map((c) => c.category || 'General'))];
    return ['All', ...cats.sort()];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.instructor || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.category || '').toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === 'All' || (c.category || 'General') === categoryFilter;

      let matchesStatus = true;
      if (statusFilter === 'published') matchesStatus = c.isPublished && c.isActive;
      if (statusFilter === 'draft') matchesStatus = !c.isPublished && c.isActive;
      if (statusFilter === 'deactivated') matchesStatus = !c.isActive;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [courses, search, categoryFilter, statusFilter]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCourseId(null);
    setForm(INITIAL_COURSE_FORM);
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (course) => {
    setEditingCourseId(course._id);
    setForm({
      title: course.title || '',
      description: course.description || '',
      category: course.category || 'General',
      provider: course.provider || '',
      instructor: course.instructor || '',
      difficulty: course.difficulty || 'beginner',
      duration: course.duration || 0,
      credits: course.credits || 0,
      tags: Array.isArray(course.tags) ? course.tags.join(', ') : '',
      thumbnail: course.thumbnail || '',
      externalUrl: course.externalUrl || '',
      isPublished: course.isPublished || false,
      modules: course.modules ? course.modules.map((m) => ({ ...m })) : [],
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Module Management inside Form
  const handleAddModule = () => {
    setForm((prev) => ({
      ...prev,
      modules: [
        ...prev.modules,
        { title: '', description: '', duration: 0, order: prev.modules.length + 1, resourceUrl: '' },
      ],
    }));
  };

  const handleModuleChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.modules];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, modules: updated };
    });
  };

  const handleRemoveModule = (index) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.filter((_, i) => i !== index).map((m, idx) => ({ ...m, order: idx + 1 })),
    }));
  };

  // Save Course (Create or Update)
  const handleSubmitCourse = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.title.trim()) {
      setFormError('Course title is required.');
      return;
    }
    if (form.credits < 0) {
      setFormError('Credits cannot be negative.');
      return;
    }
    if (form.duration < 0) {
      setFormError('Duration cannot be negative.');
      return;
    }

    // Validate module titles
    for (let i = 0; i < form.modules.length; i++) {
      if (!form.modules[i].title.trim()) {
        setFormError(`Module ${i + 1} must have a title.`);
        return;
      }
    }

    // Validate and sanitize Thumbnail Image URL
    let sanitizedThumbnail = '';
    if (form.thumbnail && form.thumbnail.trim()) {
      const thumbValidation = sanitizeAndValidateUrl(form.thumbnail);
      if (!thumbValidation.isValid) {
        setFormError(`Thumbnail URL: ${thumbValidation.error}`);
        return;
      }
      sanitizedThumbnail = thumbValidation.sanitizedUrl;
    }

    // Validate and sanitize External Resource URL
    let sanitizedExternalUrl = '';
    if (form.externalUrl && form.externalUrl.trim()) {
      const extValidation = sanitizeAndValidateUrl(form.externalUrl);
      if (!extValidation.isValid) {
        setFormError(`External Resource URL: ${extValidation.error}`);
        return;
      }
      sanitizedExternalUrl = extValidation.sanitizedUrl;
    }

    // Validate module resource URLs
    const sanitizedModules = [];
    for (let i = 0; i < form.modules.length; i++) {
      const m = form.modules[i];
      let modResourceUrl = '';
      if (m.resourceUrl && m.resourceUrl.trim()) {
        const modValidation = sanitizeAndValidateUrl(m.resourceUrl);
        if (!modValidation.isValid) {
          setFormError(`Module ${i + 1} Resource URL: ${modValidation.error}`);
          return;
        }
        modResourceUrl = modValidation.sanitizedUrl;
      }
      sanitizedModules.push({
        ...m,
        title: m.title.trim(),
        duration: Number(m.duration) || 0,
        order: i + 1,
        resourceUrl: modResourceUrl,
      });
    }

    const payload = {
      ...form,
      title: form.title.trim(),
      thumbnail: sanitizedThumbnail,
      externalUrl: sanitizedExternalUrl,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      duration: Number(form.duration) || 0,
      credits: Number(form.credits) || 0,
      modules: sanitizedModules,
    };

    setSubmitting(true);
    try {
      if (editingCourseId) {
        await updateCourse(editingCourseId, payload);
        setSuccessMsg(`Course "${payload.title}" updated successfully.`);
      } else {
        await createCourse(payload);
        setSuccessMsg(`Course "${payload.title}" created successfully.`);
      }
      setIsModalOpen(false);
      fetchAllCourses();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save course.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Publication
  const handleTogglePublish = async (course) => {
    setError('');
    setSuccessMsg('');
    try {
      const nextPublished = !course.isPublished;
      await updateCourse(course._id, { isPublished: nextPublished });
      setSuccessMsg(`Course "${course.title}" ${nextPublished ? 'published' : 'saved as draft'}.`);
      fetchAllCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update publication status.');
    }
  };

  // Deactivate Course (Soft Delete)
  const handleConfirmDeactivate = async () => {
    if (!deactivatingCourse) return;
    setDeactivating(true);
    setError('');
    setSuccessMsg('');
    try {
      await deleteCourse(deactivatingCourse._id);
      setSuccessMsg(`Course "${deactivatingCourse.title}" has been deactivated.`);
      setDeactivatingCourse(null);
      fetchAllCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate course.');
    } finally {
      setDeactivating(false);
    }
  };

  // Reactivate Course
  const handleReactivate = async (course) => {
    setError('');
    setSuccessMsg('');
    try {
      await updateCourse(course._id, { isActive: true });
      setSuccessMsg(`Course "${course.title}" has been reactivated.`);
      fetchAllCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reactivate course.');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Course Management</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Create, edit, publish, draft, and deactivate faculty courses.
            </p>
          </div>
          <button
            className="btn-primary shrink-0 self-start sm:self-auto cursor-pointer"
            onClick={handleOpenCreateModal}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add New Course
          </button>
        </div>

        {/* Global Notifications */}
        {error && (
          <div
            className="mb-5 p-4 rounded-lg text-sm flex items-center justify-between"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
          >
            <span>{error}</span>
            <button className="btn-secondary text-xs" onClick={fetchAllCourses}>Retry</button>
          </div>
        )}
        {successMsg && (
          <div
            className="mb-5 p-4 rounded-lg text-sm"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }}
          >
            ✅ {successMsg}
          </div>
        )}

        {/* Filters */}
        <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              id="admin-search"
              type="text"
              placeholder="Search by title, instructor, or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
            />
          </div>
          <select
            id="admin-category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field sm:w-44"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            id="admin-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field sm:w-40"
          >
            <option value="All">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>

        {/* Table / Cards List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="w-8 h-8 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--color-primary-light)' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-4xl mb-3">📁</p>
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>No courses found</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {courses.length === 0 ? 'No courses in database. Click "Add New Course" or run DB seed.' : 'Try resetting your search filters.'}
            </p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                    <th className="p-3.5">Course Title</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Instructor</th>
                    <th className="p-3.5">Credits</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredCourses.map((course) => {
                    const isDraft = !course.isPublished;
                    const isDeactivated = !course.isActive;

                    return (
                      <tr key={course._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-medium" style={{ color: 'var(--color-text)' }}>
                          <div className="font-semibold">{course.title}</div>
                          <div className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>
                            {course.modules?.length || 0} module(s) · {course.duration || 0}h duration
                          </div>
                        </td>
                        <td className="p-3.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {course.category || 'General'}
                        </td>
                        <td className="p-3.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {course.instructor || '—'}
                        </td>
                        <td className="p-3.5 font-bold" style={{ color: 'var(--color-accent)' }}>
                          {course.credits}
                        </td>
                        <td className="p-3.5">
                          {isDeactivated ? (
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-red-500/20 text-red-400">
                              Inactive
                            </span>
                          ) : isDraft ? (
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-400">
                              Draft
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-green-500/20 text-green-400">
                              Published
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="btn-secondary text-xs py-1 px-2.5 cursor-pointer"
                              onClick={() => handleOpenEditModal(course)}
                            >
                              Edit
                            </button>

                            {course.isActive && (
                              <button
                                className={`text-xs py-1 px-2.5 rounded-md font-medium cursor-pointer transition-colors ${
                                  course.isPublished
                                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                                    : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                                }`}
                                onClick={() => handleTogglePublish(course)}
                              >
                                {course.isPublished ? 'Unpublish' : 'Publish'}
                              </button>
                            )}

                            {isDeactivated ? (
                              <button
                                className="text-xs py-1 px-2.5 rounded-md font-medium bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 cursor-pointer"
                                onClick={() => handleReactivate(course)}
                              >
                                Reactivate
                              </button>
                            ) : (
                              <button
                                className="text-xs py-1 px-2.5 rounded-md font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 cursor-pointer"
                                onClick={() => setDeactivatingCourse(course)}
                              >
                                Deactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Add / Edit Course Modal ── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
            <div
              className="glass-card w-full max-w-3xl p-6 max-h-[90vh] flex flex-col my-8"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                  {editingCourseId ? 'Edit Course' : 'Create New Course'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-white text-xl font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmitCourse} noValidate className="space-y-4 overflow-y-auto flex-1 pr-1">
                {formError && (
                  <div
                    className="p-3 rounded-lg text-sm mb-3"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
                  >
                    ⚠️ {formError}
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Advanced Pedagogy & Active Learning"
                    className="input-field"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Detailed explanation of the course objectives and content…"
                    className="input-field"
                  />
                </div>

                {/* Row: Category, Provider, Instructor */}
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      Category
                    </label>
                    <input
                      type="text"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder="e.g. Pedagogy, Technology"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      Provider
                    </label>
                    <input
                      type="text"
                      value={form.provider}
                      onChange={(e) => setForm({ ...form, provider: e.target.value })}
                      placeholder="e.g. NPTEL, Coursera, Internal"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      Instructor
                    </label>
                    <input
                      type="text"
                      value={form.instructor}
                      onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                      placeholder="e.g. Prof. Ananya Sharma"
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Row: Difficulty, Duration, Credits */}
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      Difficulty
                    </label>
                    <select
                      value={form.difficulty}
                      onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                      className="input-field capitalize"
                    >
                      {DIFFICULTY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      Duration (Hours)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      Credits
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.credits}
                      onChange={(e) => setForm({ ...form, credits: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Row: Thumbnail URL & External Resource URL */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      Thumbnail Image URL
                    </label>
                    <input
                      type="text"
                      value={form.thumbnail}
                      onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
                      onBlur={() => {
                        if (form.thumbnail && form.thumbnail.trim()) {
                          const res = sanitizeAndValidateUrl(form.thumbnail);
                          if (res.isValid && res.sanitizedUrl !== form.thumbnail) {
                            setForm((prev) => ({ ...prev, thumbnail: res.sanitizedUrl }));
                          }
                        }
                      }}
                      placeholder="https://example.com/image.jpg"
                      className="input-field"
                    />
                    {form.thumbnail && (
                      <div className="mt-2 flex items-center gap-3 p-2 rounded-md bg-slate-800/60 border border-slate-700">
                        <img
                          src={sanitizeAndValidateUrl(form.thumbnail).sanitizedUrl || form.thumbnail}
                          alt="Thumbnail preview"
                          className="h-10 w-16 object-cover rounded bg-slate-700 shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextSibling;
                            if (fallback) fallback.style.display = 'inline';
                          }}
                        />
                        <span style={{ display: 'none' }} className="text-xs text-amber-400">
                          ⚠️ Unable to load image preview
                        </span>
                        <span className="text-xs text-slate-400">Thumbnail Preview</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      External Resource URL
                    </label>
                    <input
                      type="text"
                      value={form.externalUrl}
                      onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                      onBlur={() => {
                        if (form.externalUrl && form.externalUrl.trim()) {
                          const res = sanitizeAndValidateUrl(form.externalUrl);
                          if (res.isValid && res.sanitizedUrl !== form.externalUrl) {
                            setForm((prev) => ({ ...prev, externalUrl: res.sanitizedUrl }));
                          }
                        }
                      }}
                      placeholder="https://..."
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="Pedagogy, Assessment, Flipped Classroom"
                    className="input-field"
                  />
                </div>

                {/* Publish Checkbox */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isPublished-check"
                    checked={form.isPublished}
                    onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="isPublished-check" className="text-sm font-medium cursor-pointer" style={{ color: 'var(--color-text)' }}>
                    Publish course immediately (visible to faculty)
                  </label>
                </div>

                {/* ── Modules Section inside Modal ── */}
                <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                      Course Modules ({form.modules.length})
                    </h3>
                    <button
                      type="button"
                      className="btn-secondary text-xs py-1 px-3 cursor-pointer"
                      onClick={handleAddModule}
                    >
                      + Add Module
                    </button>
                  </div>

                  {form.modules.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                      No modules added yet. Click "+ Add Module" to include modules.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {form.modules.map((mod, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg flex flex-col gap-2 relative"
                          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold" style={{ color: 'var(--color-primary-light)' }}>
                              Module {idx + 1}
                            </span>
                            <button
                              type="button"
                              className="text-xs text-red-400 hover:underline cursor-pointer"
                              onClick={() => handleRemoveModule(idx)}
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              required
                              placeholder="Module Title *"
                              value={mod.title}
                              onChange={(e) => handleModuleChange(idx, 'title', e.target.value)}
                              className="input-field text-xs"
                            />
                            <input
                              type="number"
                              min="0"
                              placeholder="Duration (mins)"
                              value={mod.duration}
                              onChange={(e) => handleModuleChange(idx, 'duration', e.target.value)}
                              className="input-field text-xs"
                            />
                          </div>

                          <input
                            type="text"
                            placeholder="Module Description (optional)"
                            value={mod.description}
                            onChange={(e) => handleModuleChange(idx, 'description', e.target.value)}
                            className="input-field text-xs"
                          />

                          <input
                            type="text"
                            placeholder="Resource URL (optional)"
                            value={mod.resourceUrl}
                            onChange={(e) => handleModuleChange(idx, 'resourceUrl', e.target.value)}
                            onBlur={() => {
                              if (mod.resourceUrl && mod.resourceUrl.trim()) {
                                const res = sanitizeAndValidateUrl(mod.resourceUrl);
                                if (res.isValid && res.sanitizedUrl !== mod.resourceUrl) {
                                  handleModuleChange(idx, 'resourceUrl', res.sanitizedUrl);
                                }
                              }
                            }}
                            className="input-field text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <button
                    type="button"
                    className="btn-secondary text-sm cursor-pointer"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary text-sm cursor-pointer"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving…' : editingCourseId ? 'Update Course' : 'Create Course'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Deactivate Confirmation Modal ── */}
        {deactivatingCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="glass-card w-full max-w-md p-6 text-center" style={{ background: 'var(--color-surface)' }}>
              <p className="text-4xl mb-3">⚠️</p>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                Deactivate Course?
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                Are you sure you want to deactivate <strong>"{deactivatingCourse.title}"</strong>? It will no longer be visible to faculty members.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  className="btn-secondary text-sm cursor-pointer"
                  onClick={() => setDeactivatingCourse(null)}
                  disabled={deactivating}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                  onClick={handleConfirmDeactivate}
                  disabled={deactivating}
                >
                  {deactivating ? 'Deactivating…' : 'Yes, Deactivate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default CourseManagement;
