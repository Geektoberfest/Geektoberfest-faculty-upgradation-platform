/**
 * CourseDetail.jsx
 *
 * Fetches a single course by ID and enables faculty to:
 *   - Inspect course details, learning objectives, and module list
 *   - Access external learning resources safely
 *   - Enroll in the course (POST /api/enrollments/:courseId)
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '../../components/common/AppLayout';
import { getCourseById } from '../../api/courseApi';
import { enrollInCourse, getMyEnrollments } from '../../api/enrollmentApi';
import { useToast } from '../../context/ToastContext';

const DIFFICULTY_COLOR = {
  beginner: 'var(--color-success)',
  intermediate: 'var(--color-warning)',
  advanced: 'var(--color-error)',
};

// Safe URL validator
function getSafeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('www.')) {
    return `https://${trimmed}`;
  }
  return null;
}

function ModuleItem({ mod, index }) {
  const safeResource = getSafeUrl(mod.resourceUrl);

  return (
    <div
      className="flex items-start gap-4 p-4 rounded-lg transition-colors"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ background: 'rgba(99,102,241,0.2)', color: 'var(--color-primary-light)' }}
      >
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{mod.title}</p>
        {mod.description && (
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {mod.description}
          </p>
        )}
        {mod.duration > 0 && (
          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {mod.duration} mins
          </p>
        )}
      </div>
      {safeResource && (
        <a
          href={safeResource}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs shrink-0 px-3 py-1 rounded-full font-medium transition-colors"
          style={{ background: 'rgba(6,182,212,0.15)', color: 'var(--color-accent)', textDecoration: 'none' }}
        >
          Resource ↗
        </a>
      )}
    </div>
  );
}

function CourseDetail() {
  const { id } = useParams();
  const { toast } = useToast();

  const [course, setCourse] = useState(null);
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const [courseRes, enrollRes] = await Promise.all([
          getCourseById(id),
          getMyEnrollments(),
        ]);

        if (!cancelled) {
          setCourse(courseRes.data.course);

          const existingEnrollments = enrollRes.data.enrollments || [];
          const found = existingEnrollments.find(
            (e) => (e.course?._id || e.course) === id || (e.course?._id || e.course)?.toString() === id
          );
          if (found) {
            setAlreadyEnrolled(true);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load course details.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [id]);

  const handleEnroll = async () => {
    setError('');
    setSuccessMsg('');
    setEnrolling(true);

    try {
      const res = await enrollInCourse(id);
      setAlreadyEnrolled(true);
      const msg = res.data.message || 'Successfully enrolled!';
      setSuccessMsg(msg);
      toast.success(msg);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;

      if (status === 409) {
        setAlreadyEnrolled(true);
        const warning = 'You are already enrolled in this course.';
        setSuccessMsg(warning);
        toast.info(warning);
      } else {
        const errorMsg = msg || 'Enrollment failed. Please try again.';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setEnrolling(false);
    }
  };

  const diffColor = DIFFICULTY_COLOR[course?.difficulty] || 'var(--color-text-muted)';
  const safeExternalUrl = getSafeUrl(course?.externalUrl);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto animate-fadeIn">

        {/* Back link */}
        <Link
          to="/courses"
          className="inline-flex items-center gap-1.5 text-sm mb-6 font-medium hover:underline"
          style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Course Catalog
        </Link>

        {/* Error */}
        {error && (
          <div
            className="mb-5 p-4 rounded-lg text-sm flex items-center justify-between"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
          >
            <span>⚠️ {error}</span>
            <button className="btn-secondary text-xs" onClick={fetchData}>Retry</button>
          </div>
        )}

        {/* Success */}
        {successMsg && (
          <div
            className="mb-5 p-4 rounded-lg text-sm"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }}
          >
            ✅ {successMsg}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <svg className="w-8 h-8 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--color-primary-light)' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : !course ? (
          <div className="glass-card p-12 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>Course not found</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              The requested course may have been unpublished or removed.
            </p>
            <Link to="/courses" className="btn-primary mt-4 text-xs">Return to Courses</Link>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Course Thumbnail Image if present */}
            {course.thumbnail && (
              <div className="h-56 w-full overflow-hidden rounded-xl bg-slate-800">
                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Course header card */}
            <div className="glass-card p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--color-primary-light)' }}
                >
                  {course.category || 'General'}
                </span>
                <span
                  className="text-xs font-semibold capitalize px-2.5 py-1 rounded-full"
                  style={{ background: `${diffColor}20`, color: diffColor }}
                >
                  {course.difficulty}
                </span>
                {course.provider && (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
                  >
                    Provider: {course.provider}
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                {course.title}
              </h1>

              {course.instructor && (
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
                  Instructor / Facilitator: <span className="font-medium" style={{ color: 'var(--color-text)' }}>{course.instructor}</span>
                </p>
              )}

              {course.description && (
                <p className="text-sm md:text-base leading-relaxed mb-6" style={{ color: 'var(--color-text-muted)' }}>
                  {course.description}
                </p>
              )}

              {/* Meta row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)' }}>
                <div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Modules</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{course.modules?.length || 0}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Duration</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{course.duration || 0} Hours</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Credits Awarded</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>{course.credits || 0}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Level</p>
                  <p className="text-lg font-bold capitalize" style={{ color: diffColor }}>{course.difficulty}</p>
                </div>
              </div>

              {/* External Resource Link */}
              {safeExternalUrl && (
                <div className="mb-6">
                  <a
                    href={safeExternalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold"
                    style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
                  >
                    Official External Course Link ↗
                  </a>
                </div>
              )}

              {/* Enroll / Already Enrolled Action */}
              <div>
                {alreadyEnrolled ? (
                  <div className="flex flex-wrap items-center gap-4">
                    <div
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
                      style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--color-success)', border: '1px solid rgba(34,197,94,0.3)' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Enrolled in Course
                    </div>
                    <Link to="/my-courses" className="btn-primary text-sm">
                      Go to My Courses →
                    </Link>
                  </div>
                ) : (
                  <button
                    id="enroll-btn"
                    className="btn-primary text-sm py-3 px-6 cursor-pointer"
                    onClick={handleEnroll}
                    disabled={enrolling}
                    style={{ opacity: enrolling ? 0.7 : 1 }}
                  >
                    {enrolling ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Enrolling…
                      </>
                    ) : (
                      'Enroll in this Course'
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Modules List */}
            {course.modules?.length > 0 && (
              <div className="glass-card p-6 md:p-8">
                <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-muted)' }}>
                  Course Curriculum ({course.modules.length} Modules)
                </h2>
                <div className="space-y-3">
                  {[...course.modules]
                    .sort((a, b) => a.order - b.order)
                    .map((mod, idx) => (
                      <ModuleItem key={mod._id || idx} mod={mod} index={idx} />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default CourseDetail;
