/**
 * creditCalculator.test.js — Unit Tests for Credit & Achievement Utility
 *
 * Runs with Node.js built-in test runner:
 *   npm test (or node --test tests/*.test.js)
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Credit = require('../models/Credit');
const Achievement = require('../models/Achievement');
const Enrollment = require('../models/Enrollment');
const {
  awardCreditsAndCheckAchievements,
  ACHIEVEMENT_RULES,
} = require('../utils/creditCalculator');

describe('ACHIEVEMENT_RULES Definition & Structure Tests', () => {
  it('should export ACHIEVEMENT_RULES as an array with 3 rules', () => {
    assert.ok(Array.isArray(ACHIEVEMENT_RULES), 'ACHIEVEMENT_RULES must be an array');
    assert.equal(ACHIEVEMENT_RULES.length, 3, 'Must define exactly 3 achievement rules');
  });

  it('should ensure every rule contains required properties and functions', () => {
    for (const rule of ACHIEVEMENT_RULES) {
      assert.ok(typeof rule.key === 'string' && rule.key.length > 0, 'Rule must have a key');
      assert.ok(typeof rule.title === 'string' && rule.title.length > 0, 'Rule must have a title');
      assert.ok(
        typeof rule.description === 'string' && rule.description.length > 0,
        'Rule must have a description'
      );
      assert.ok(typeof rule.icon === 'string' && rule.icon.length > 0, 'Rule must have an icon');
      assert.equal(typeof rule.check, 'function', 'Rule check must be a function');
    }
  });

  it('should have exact keys and metadata matching specifications', () => {
    const keys = ACHIEVEMENT_RULES.map((r) => r.key);
    assert.deepEqual(keys, ['first_course', 'five_courses', 'ten_courses']);

    const first = ACHIEVEMENT_RULES.find((r) => r.key === 'first_course');
    assert.equal(first.title, 'First Course Completed');
    assert.equal(first.icon, 'trophy');

    const five = ACHIEVEMENT_RULES.find((r) => r.key === 'five_courses');
    assert.equal(five.title, 'Learning Enthusiast');
    assert.equal(five.icon, 'star');

    const ten = ACHIEVEMENT_RULES.find((r) => r.key === 'ten_courses');
    assert.equal(ten.title, 'Knowledge Champion');
    assert.equal(ten.icon, 'medal');
  });
});

describe('ACHIEVEMENT_RULES Condition Logic Tests', () => {
  const firstRule = ACHIEVEMENT_RULES.find((r) => r.key === 'first_course');
  const fiveRule = ACHIEVEMENT_RULES.find((r) => r.key === 'five_courses');
  const tenRule = ACHIEVEMENT_RULES.find((r) => r.key === 'ten_courses');

  describe('first_course rule', () => {
    it('should fire when completed course count is exactly 1', () => {
      assert.equal(firstRule.check(1), true);
    });

    it('should not fire for non-matching counts (0, 2, 5, 10)', () => {
      assert.equal(firstRule.check(0), false);
      assert.equal(firstRule.check(2), false);
      assert.equal(firstRule.check(5), false);
      assert.equal(firstRule.check(10), false);
      assert.equal(firstRule.check(-1), false);
    });
  });

  describe('five_courses rule', () => {
    it('should fire when completed course count is exactly 5', () => {
      assert.equal(fiveRule.check(5), true);
    });

    it('should not fire for non-matching counts (0, 1, 4, 6, 10)', () => {
      assert.equal(fiveRule.check(0), false);
      assert.equal(fiveRule.check(1), false);
      assert.equal(fiveRule.check(4), false);
      assert.equal(fiveRule.check(6), false);
      assert.equal(fiveRule.check(10), false);
    });
  });

  describe('ten_courses rule', () => {
    it('should fire when completed course count is exactly 10', () => {
      assert.equal(tenRule.check(10), true);
    });

    it('should not fire for non-matching counts (0, 1, 5, 9, 11)', () => {
      assert.equal(tenRule.check(0), false);
      assert.equal(tenRule.check(1), false);
      assert.equal(tenRule.check(5), false);
      assert.equal(tenRule.check(9), false);
      assert.equal(tenRule.check(11), false);
    });
  });

  describe('Non-matching edge counts', () => {
    it('should not trigger any achievement for intermediate course counts', () => {
      const intermediateCounts = [0, 2, 3, 4, 6, 7, 8, 9, 11, 25, -1];
      for (const count of intermediateCounts) {
        const triggered = ACHIEVEMENT_RULES.filter((rule) => rule.check(count));
        assert.equal(
          triggered.length,
          0,
          `Expected no achievement rule to fire for count ${count}, but got: ${triggered.map((r) => r.key).join(', ')}`
        );
      }
    });
  });
});

describe('awardCreditsAndCheckAchievements Function Tests', () => {
  let originalCreditCreate;
  let originalEnrollmentCountDocuments;
  let originalAchievementFindOne;
  let originalAchievementCreate;

  beforeEach(() => {
    originalCreditCreate = Credit.create;
    originalEnrollmentCountDocuments = Enrollment.countDocuments;
    originalAchievementFindOne = Achievement.findOne;
    originalAchievementCreate = Achievement.create;
  });

  afterEach(() => {
    Credit.create = originalCreditCreate;
    Enrollment.countDocuments = originalEnrollmentCountDocuments;
    Achievement.findOne = originalAchievementFindOne;
    Achievement.create = originalAchievementCreate;
  });

  const facultyId = new mongoose.Types.ObjectId();
  const mockEnrollment = {
    _id: new mongoose.Types.ObjectId(),
    faculty: facultyId,
    status: 'completed',
    progress: 100,
  };
  const mockCourse = {
    _id: new mongoose.Types.ObjectId(),
    title: 'Cloud Computing Architecture',
    credits: 3,
  };

  it('should create credit record and award first_course achievement on 1st completion', async () => {
    let creditCreatedPayload = null;
    Credit.create = async (payload) => {
      creditCreatedPayload = payload;
      return { _id: new mongoose.Types.ObjectId(), ...payload };
    };

    Enrollment.countDocuments = async () => 1;

    let findOneQueried = null;
    Achievement.findOne = async (query) => {
      findOneQueried = query;
      return null; // does not exist yet
    };

    let achievementCreatedPayload = null;
    Achievement.create = async (payload) => {
      achievementCreatedPayload = payload;
      return { _id: new mongoose.Types.ObjectId(), ...payload };
    };

    const result = await awardCreditsAndCheckAchievements(facultyId, mockEnrollment, mockCourse);

    // Verify credit record creation
    assert.ok(result.credit, 'Must return created credit');
    assert.equal(creditCreatedPayload.faculty, facultyId);
    assert.equal(creditCreatedPayload.enrollment, mockEnrollment._id);
    assert.equal(creditCreatedPayload.course, mockCourse._id);
    assert.equal(creditCreatedPayload.creditsEarned, 3);
    assert.equal(creditCreatedPayload.note, 'Completed course: Cloud Computing Architecture');

    // Verify achievement creation
    assert.equal(findOneQueried.faculty, facultyId);
    assert.equal(findOneQueried.title, 'First Course Completed');
    assert.ok(achievementCreatedPayload, 'Achievement should have been created');
    assert.equal(achievementCreatedPayload.faculty, facultyId);
    assert.equal(achievementCreatedPayload.title, 'First Course Completed');
    assert.equal(achievementCreatedPayload.icon, 'trophy');

    // Verify returned payload
    assert.equal(result.newAchievements.length, 1);
    assert.equal(result.newAchievements[0].title, 'First Course Completed');
  });

  it('should create credit record but award 0 achievements when completedCount is not a milestone (e.g. 2)', async () => {
    Credit.create = async (payload) => ({ _id: new mongoose.Types.ObjectId(), ...payload });
    Enrollment.countDocuments = async () => 2;

    let achievementCreated = false;
    Achievement.create = async () => {
      achievementCreated = true;
    };

    const result = await awardCreditsAndCheckAchievements(facultyId, mockEnrollment, mockCourse);

    assert.ok(result.credit);
    assert.equal(achievementCreated, false, 'No achievement should be created for count = 2');
    assert.deepEqual(result.newAchievements, []);
  });

  it('should award five_courses achievement on 5th completion when not already awarded', async () => {
    Credit.create = async (payload) => ({ _id: new mongoose.Types.ObjectId(), ...payload });
    Enrollment.countDocuments = async () => 5;
    Achievement.findOne = async () => null;

    let createdTitle = null;
    Achievement.create = async (payload) => {
      createdTitle = payload.title;
      return { _id: new mongoose.Types.ObjectId(), ...payload };
    };

    const result = await awardCreditsAndCheckAchievements(facultyId, mockEnrollment, mockCourse);

    assert.equal(createdTitle, 'Learning Enthusiast');
    assert.equal(result.newAchievements.length, 1);
    assert.equal(result.newAchievements[0].title, 'Learning Enthusiast');
  });

  it('should award ten_courses achievement on 10th completion when not already awarded', async () => {
    Credit.create = async (payload) => ({ _id: new mongoose.Types.ObjectId(), ...payload });
    Enrollment.countDocuments = async () => 10;
    Achievement.findOne = async () => null;

    let createdTitle = null;
    Achievement.create = async (payload) => {
      createdTitle = payload.title;
      return { _id: new mongoose.Types.ObjectId(), ...payload };
    };

    const result = await awardCreditsAndCheckAchievements(facultyId, mockEnrollment, mockCourse);

    assert.equal(createdTitle, 'Knowledge Champion');
    assert.equal(result.newAchievements.length, 1);
    assert.equal(result.newAchievements[0].title, 'Knowledge Champion');
  });

  it('should not duplicate achievement if faculty already has it', async () => {
    Credit.create = async (payload) => ({ _id: new mongoose.Types.ObjectId(), ...payload });
    Enrollment.countDocuments = async () => 1;

    // Faculty already has the achievement
    Achievement.findOne = async () => ({
      _id: new mongoose.Types.ObjectId(),
      faculty: facultyId,
      title: 'First Course Completed',
    });

    let achievementCreated = false;
    Achievement.create = async () => {
      achievementCreated = true;
    };

    const result = await awardCreditsAndCheckAchievements(facultyId, mockEnrollment, mockCourse);

    assert.ok(result.credit);
    assert.equal(achievementCreated, false, 'Existing achievement must not be duplicated');
    assert.equal(result.newAchievements.length, 0);
  });

  it('should propagate errors if Credit.create fails', async () => {
    Credit.create = async () => {
      throw new Error('Database connection failed');
    };

    await assert.rejects(
      async () => {
        await awardCreditsAndCheckAchievements(facultyId, mockEnrollment, mockCourse);
      },
      {
        name: 'Error',
        message: 'Database connection failed',
      }
    );
  });
});
