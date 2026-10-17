/**
 * creditCalculator.js
 *
 * Utility to award credits and trigger achievement checks
 * when a faculty member completes a course.
 *
 * Called by enrollmentController when progress reaches 100%
 * and status transitions to 'completed'.
 *
 * @param {string} facultyId    - ObjectId of the faculty User
 * @param {object} enrollment   - The completed Enrollment document
 * @param {object} course       - The associated Course document
 */

const Credit = require('../models/Credit');
const Achievement = require('../models/Achievement');

// Achievement definitions — server-side only, faculty cannot trigger these.
const ACHIEVEMENT_RULES = [
  {
    key: 'first_course',
    title: 'First Course Completed',
    description: 'Completed your very first course on the platform.',
    icon: 'trophy',
    // Triggered when total completed enrollments for the faculty equals 1
    check: (completedCount) => completedCount === 1,
  },
  {
    key: 'five_courses',
    title: 'Learning Enthusiast',
    description: 'Completed 5 courses on the platform.',
    icon: 'star',
    check: (completedCount) => completedCount === 5,
  },
  {
    key: 'ten_courses',
    title: 'Knowledge Champion',
    description: 'Completed 10 courses — a true champion of learning.',
    icon: 'medal',
    check: (completedCount) => completedCount === 10,
  },
];

/**
 * awardCreditsAndCheckAchievements
 *
 * 1. Creates a Credit document for the completed course.
 * 2. Counts total completed enrollments.
 * 3. Checks each achievement rule and awards it if:
 *    a) the rule fires for this count, AND
 *    b) the faculty hasn't already received that achievement.
 *
 * This is an internal utility — not exposed via HTTP directly.
 * All awarded credits/achievements are returned for logging.
 */
const awardCreditsAndCheckAchievements = async (facultyId, enrollment, course) => {
  const Enrollment = require('../models/Enrollment');

  // ── 1. Create credit record ────────────────────────────────────────────────
  const credit = await Credit.create({
    faculty: facultyId,
    enrollment: enrollment._id,
    course: course._id,
    creditsEarned: course.credits,
    note: `Completed course: ${course.title}`,
  });

  // ── 2. Count completed enrollments for this faculty ────────────────────────
  const completedCount = await Enrollment.countDocuments({
    faculty: facultyId,
    status: 'completed',
  });

  // ── 3. Check and award achievements ────────────────────────────────────────
  const newAchievements = [];

  for (const rule of ACHIEVEMENT_RULES) {
    if (rule.check(completedCount)) {
      // Check the faculty doesn't already have this achievement
      const exists = await Achievement.findOne({
        faculty: facultyId,
        title: rule.title,
      });

      if (!exists) {
        const achievement = await Achievement.create({
          faculty: facultyId,
          title: rule.title,
          description: rule.description,
          icon: rule.icon,
        });
        newAchievements.push(achievement);
      }
    }
  }

  return { credit, newAchievements };
};

module.exports = { awardCreditsAndCheckAchievements, ACHIEVEMENT_RULES };
