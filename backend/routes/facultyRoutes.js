/**
 * facultyRoutes.js
 *
 *   GET /api/faculty          → getFacultyList (protect, admin)
 *   GET /api/faculty/profile  → getProfile     (protect)
 *   PUT /api/faculty/profile  → updateProfile   (protect)
 */

const express = require('express');
const {
  getProfile,
  updateProfile,
  getFacultyList,
  getAdminFacultyList,
  updateFacultyStatus,
} = require('../controllers/facultyController');
const { protect } = require('../middlewares/authMiddleware');
const { authorise } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', protect, authorise('admin'), getFacultyList);
router.get('/admin/list', protect, authorise('admin'), getAdminFacultyList);
router.put('/admin/:id/status', protect, authorise('admin'), updateFacultyStatus);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

module.exports = router;
