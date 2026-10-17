/**
 * facultyProfile.test.js — Tests for Faculty Profile Endpoints (GET/PUT /api/faculty/profile)
 *
 * Runs with Node.js built-in test runner:
 *   node --test tests/*.test.js
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../server');
const User = require('../models/User');

describe('Faculty Profile Endpoint Tests (GET/PUT /api/faculty/profile)', () => {
  let server;
  let baseUrl;
  const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_tests';
  process.env.JWT_SECRET = JWT_SECRET;

  const facultyUserId = new mongoose.Types.ObjectId();
  const facultyToken = jwt.sign({ id: facultyUserId.toString() }, JWT_SECRET);
  const adminUserId = new mongoose.Types.ObjectId();
  const adminToken = jwt.sign({ id: adminUserId.toString() }, JWT_SECRET);

  let originalUserFindById;
  let originalUserFindByIdAndUpdate;
  let originalUserFind;
  let originalUserFindOne;

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
    originalUserFindByIdAndUpdate = User.findByIdAndUpdate;
    originalUserFind = User.find;
    originalUserFindOne = User.findOne;
  });

  after(async () => {
    User.findById = originalUserFindById;
    User.findByIdAndUpdate = originalUserFindByIdAndUpdate;
    User.find = originalUserFind;
    User.findOne = originalUserFindOne;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('rejects unauthenticated GET /api/faculty/profile with 401', async () => {
    const res = await fetch(`${baseUrl}/api/faculty/profile`);
    assert.equal(res.status, 401);
  });

  it('rejects unauthenticated PUT /api/faculty/profile with 401', async () => {
    const res = await fetch(`${baseUrl}/api/faculty/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dr. Jane' }),
    });
    assert.equal(res.status, 401);
  });

  it('returns faculty profile for authenticated user', async () => {
    User.findById = function (id) {
      return {
        select: () =>
          Promise.resolve({
            _id: facultyUserId,
            name: 'Dr. Alan Turing',
            email: 'alan@example.com',
            role: 'faculty',
            department: 'Computer Science',
            designation: 'Professor',
            isActive: true,
          }),
      };
    };

    const res = await fetch(`${baseUrl}/api/faculty/profile`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.profile.name, 'Dr. Alan Turing');
    assert.equal(body.profile.department, 'Computer Science');
  });

  it('successfully updates whitelisted fields and returns updated user', async () => {
    let capturedUpdates = null;

    User.findById = function (id) {
      return {
        select: () =>
          Promise.resolve({
            _id: facultyUserId,
            name: 'Dr. Alan Turing',
            email: 'alan@example.com',
            role: 'faculty',
            isActive: true,
          }),
      };
    };

    User.findByIdAndUpdate = function (id, update, options) {
      capturedUpdates = update.$set;
      return {
        select: () =>
          Promise.resolve({
            _id: facultyUserId,
            name: update.$set.name,
            department: update.$set.department,
            designation: update.$set.designation,
            email: 'alan@example.com',
            role: 'faculty',
            isActive: true,
          }),
      };
    };

    const res = await fetch(`${baseUrl}/api/faculty/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Dr. Alan M. Turing',
        department: 'Mathematics & Computing',
        designation: 'Distinguished Professor',
        role: 'admin', // Should be ignored / discarded
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.profile.name, 'Dr. Alan M. Turing');
    assert.equal(capturedUpdates.name, 'Dr. Alan M. Turing');
    assert.equal(capturedUpdates.department, 'Mathematics & Computing');
    assert.equal(capturedUpdates.role, undefined); // role is NOT whitelisted
  });

  it('rejects empty name update with 400', async () => {
    User.findById = function () {
      return {
        select: () => Promise.resolve({ _id: facultyUserId, role: 'faculty', isActive: true }),
      };
    };

    const res = await fetch(`${baseUrl}/api/faculty/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '   ' }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Name cannot be empty/i);
  });

  it('rejects update when no whitelisted fields are sent with 400', async () => {
    User.findById = function () {
      return {
        select: () => Promise.resolve({ _id: facultyUserId, role: 'faculty', isActive: true }),
      };
    };

    const res = await fetch(`${baseUrl}/api/faculty/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${facultyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'newemail@example.com' }), // non-whitelisted
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /No updatable fields provided/i);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Admin Faculty Management Tests (GET /api/faculty/admin/list & PUT /:id/status)
  // ───────────────────────────────────────────────────────────────────────────
  it('rejects unauthenticated GET /api/faculty/admin/list with 401', async () => {
    const res = await fetch(`${baseUrl}/api/faculty/admin/list`);
    assert.equal(res.status, 401);
  });

  it('rejects non-admin GET /api/faculty/admin/list with 403', async () => {
    User.findById = function () {
      return {
        select: () => Promise.resolve({ _id: facultyUserId, role: 'faculty', isActive: true }),
      };
    };

    const res = await fetch(`${baseUrl}/api/faculty/admin/list`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('allows admin to fetch full faculty list (GET /api/faculty/admin/list)', async () => {
    User.findById = function () {
      return {
        select: () => Promise.resolve({ _id: adminUserId, role: 'admin', isActive: true }),
      };
    };

    const mockFaculty = [
      { _id: new mongoose.Types.ObjectId(), name: 'Prof. A', email: 'a@uni.edu', role: 'faculty', isActive: true },
      { _id: new mongoose.Types.ObjectId(), name: 'Prof. B', email: 'b@uni.edu', role: 'faculty', isActive: false },
    ];

    User.find = function () {
      return {
        select: () => ({
          sort: () => Promise.resolve(mockFaculty),
        }),
      };
    };

    const res = await fetch(`${baseUrl}/api/faculty/admin/list`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.count, 2);
    assert.equal(body.faculty.length, 2);
  });

  it('rejects non-boolean isActive in PUT /api/faculty/admin/:id/status with 400', async () => {
    User.findById = function () {
      return {
        select: () => Promise.resolve({ _id: adminUserId, role: 'admin', isActive: true }),
      };
    };

    const targetId = new mongoose.Types.ObjectId().toString();
    const res = await fetch(`${baseUrl}/api/faculty/admin/${targetId}/status`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive: 'invalid-string' }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /must be a boolean/i);
  });

  it('returns 404 when target faculty does not exist in PUT /api/faculty/admin/:id/status', async () => {
    User.findById = function () {
      return {
        select: () => Promise.resolve({ _id: adminUserId, role: 'admin', isActive: true }),
      };
    };

    User.findOne = function () {
      return {
        select: () => Promise.resolve(null),
      };
    };

    const targetId = new mongoose.Types.ObjectId().toString();
    const res = await fetch(`${baseUrl}/api/faculty/admin/${targetId}/status`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive: false }),
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /not found/i);
  });

  it('admin successfully updates faculty isActive status to false (deactivation)', async () => {
    User.findById = function () {
      return {
        select: () => Promise.resolve({ _id: adminUserId, role: 'admin', isActive: true }),
      };
    };

    const targetUser = {
      _id: facultyUserId,
      name: 'Dr. Ramesh Kumar',
      role: 'faculty',
      isActive: true,
      save: async function () {
        return this;
      },
    };

    User.findOne = function () {
      return {
        select: () => Promise.resolve(targetUser),
      };
    };

    const res = await fetch(`${baseUrl}/api/faculty/admin/${facultyUserId}/status`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive: false }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.faculty.isActive, false);
    assert.match(body.message, /deactivated successfully/i);
  });

});
