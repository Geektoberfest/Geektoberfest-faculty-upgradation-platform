/**
 * enrollmentAdmin.test.js — Tests for Admin Institutional Enrollment Overview Endpoint
 *
 * Runs with Node.js built-in test runner:
 *   npm test (or node --test tests/*.test.js)
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../server');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const { getAllEnrollmentsAdmin } = require('../controllers/enrollmentController');

describe('Admin Enrollment Overview Tests (GET /api/enrollments/admin/all)', () => {
  let server;
  let baseUrl;
  const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_tests';
  process.env.JWT_SECRET = JWT_SECRET;

  const adminId = new mongoose.Types.ObjectId();
  const facultyId = new mongoose.Types.ObjectId();

  const adminToken = jwt.sign({ id: adminId.toString() }, JWT_SECRET);
  const facultyToken = jwt.sign({ id: facultyId.toString() }, JWT_SECRET);

  let originalUserFindById;
  let originalEnrollmentFind;

  before(async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    originalUserFindById = User.findById;
    originalEnrollmentFind = Enrollment.find;
  });

  after(async () => {
    User.findById = originalUserFindById;
    Enrollment.find = originalEnrollmentFind;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('rejects unauthenticated GET /api/enrollments/admin/all with 401', async () => {
    const res = await fetch(`${baseUrl}/api/enrollments/admin/all`);
    assert.equal(res.status, 401);
  });

  it('rejects non-admin requests with 403', async () => {
    User.findById = function () {
      return {
        select: () => Promise.resolve({ _id: facultyId, role: 'faculty', isActive: true }),
      };
    };

    const res = await fetch(`${baseUrl}/api/enrollments/admin/all`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('allows admin to fetch all enrollments with populated fields', async () => {
    User.findById = function () {
      return {
        select: () => Promise.resolve({ _id: adminId, role: 'admin', isActive: true }),
      };
    };

    const mockEnrollments = [
      {
        _id: new mongoose.Types.ObjectId(),
        faculty: {
          _id: facultyId,
          name: 'Prof. Ramesh',
          email: 'ramesh@college.edu',
          department: 'Computer Science',
        },
        course: {
          _id: new mongoose.Types.ObjectId(),
          title: 'Machine Learning',
          credits: 4,
          category: 'Technology',
        },
        progress: 100,
        status: 'completed',
        createdAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        faculty: {
          _id: facultyId,
          name: 'Prof. Ramesh',
          email: 'ramesh@college.edu',
          department: 'Computer Science',
        },
        course: {
          _id: new mongoose.Types.ObjectId(),
          title: 'Pedagogy & Design',
          credits: 2,
          category: 'Pedagogy',
        },
        progress: 50,
        status: 'in-progress',
        createdAt: new Date(),
      },
    ];

    Enrollment.find = function (filter) {
      assert.deepEqual(filter, {});
      return {
        populate() {
          return {
            populate() {
              return {
                sort: () => Promise.resolve(mockEnrollments),
              };
            },
          };
        },
      };
    };

    const res = await fetch(`${baseUrl}/api/enrollments/admin/all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.count, 2);
    assert.equal(body.enrollments.length, 2);
    assert.equal(body.enrollments[0].course.title, 'Machine Learning');
    assert.equal(body.enrollments[0].faculty.name, 'Prof. Ramesh');
  });

  it('filters enrollments by status query parameter when specified', async () => {
    User.findById = function () {
      return {
        select: () => Promise.resolve({ _id: adminId, role: 'admin', isActive: true }),
      };
    };

    let receivedFilter = null;
    Enrollment.find = function (filter) {
      receivedFilter = filter;
      return {
        populate() {
          return {
            populate() {
              return {
                sort: () => Promise.resolve([]),
              };
            },
          };
        },
      };
    };

    const res = await fetch(`${baseUrl}/api/enrollments/admin/all?status=completed`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    assert.deepEqual(receivedFilter, { status: 'completed' });
  });

  it('unit test: getAllEnrollmentsAdmin handles error forwarding via next(err)', async () => {
    Enrollment.find = function () {
      throw new Error('Database failure');
    };

    let nextError = null;
    const req = { query: {} };
    const res = {};
    const next = (err) => {
      nextError = err;
    };

    await getAllEnrollmentsAdmin(req, res, next);
    assert.ok(nextError);
    assert.equal(nextError.message, 'Database failure');
  });
});
