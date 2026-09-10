const express = require('express');
const multer = require('multer');

const db = require('../config/db');
const storageService = require('../utils/storageService');
const {
  authenticate,
  authorize,
} = require('../middleware/authMiddleware');

const router = express.Router();

/* =========================================================
   PROFILE PHOTO UPLOAD CONFIGURATION
========================================================= */

const storage = multer.memoryStorage();

// Allow only image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Only JPG, JPEG, PNG, and WEBP images are allowed.'
      )
    );
  }
};

// Maximum file size: 5 MB
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

/* =========================================================
   HELPER FUNCTION - GET COMPLETE PROFILE
========================================================= */

const getEmployeeProfile = async (userId) => {
  const [rows] = await db.query(
    `SELECT
       u.id AS user_id,
       u.name,
       u.email,
       r.name AS role,

       e.id AS employee_id,
       e.employee_code,
       d.name AS department,
       e.designation,
       e.phone,
       e.address,
       e.emergency_contact_name,
       e.emergency_contact_phone,
       e.joining_date,
       e.profile_photo,

       mu.name AS manager_name

     FROM users u

     INNER JOIN roles r
       ON r.id = u.role_id

     LEFT JOIN employees e
       ON e.user_id = u.id

     LEFT JOIN departments d
       ON d.id = e.department_id

     LEFT JOIN employees m
       ON m.id = e.manager_id

     LEFT JOIN users mu
       ON mu.id = m.user_id

     WHERE u.id = ?

     LIMIT 1`,
    [userId]
  );

  if (!rows || rows.length === 0) {
    return null;
  }

  const employee = rows[0];

  return {
    id: employee.employee_id,
    user_id: employee.user_id,
    employee_code: employee.employee_code,
    name: employee.name,
    email: employee.email,
    role: employee.role,
    department: employee.department || null,
    designation: employee.designation || null,
    phone: employee.phone || null,
    address: employee.address || null,
    emergency_contact_name:
      employee.emergency_contact_name || null,
    emergency_contact_phone:
      employee.emergency_contact_phone || null,
    joining_date: employee.joining_date || null,
    profile_photo: employee.profile_photo || null,
    manager_name: employee.manager_name || null,
  };
};

/* =========================================================
   GET LOGGED-IN USER PROFILE
========================================================= */

router.get(
  '/me',
  authenticate,
  authorize('EMPLOYEE', 'MANAGER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const employee = await getEmployeeProfile(
        req.user.id
      );

      if (!employee) {
        return res.status(404).json({
          message: 'Employee profile not found.',
        });
      }

      employee.profile_photo = employee.profile_photo
        ? await storageService.getDownloadUrl(employee.profile_photo)
        : null;
      res.status(200).json({
        employee,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   UPDATE LOGGED-IN USER PROFILE
========================================================= */

router.put(
  '/me',
  authenticate,
  authorize('EMPLOYEE', 'MANAGER', 'ADMIN'),
  upload.single('profile_photo'),

  async (req, res, next) => {
    try {
      const updates = req.body || {};

      const name =
        typeof updates.name === 'string'
          ? updates.name.trim()
          : null;

      const phone =
        typeof updates.phone === 'string'
          ? updates.phone.trim()
          : null;

      const address =
        typeof updates.address === 'string'
          ? updates.address.trim()
          : null;

      const emergencyContactName =
        typeof updates.emergency_contact_name === 'string'
          ? updates.emergency_contact_name.trim()
          : null;

      const emergencyContactPhone =
        typeof updates.emergency_contact_phone === 'string'
          ? updates.emergency_contact_phone.trim()
          : null;

      // Update user name
      if (name) {
        await db.query(
          `UPDATE users
           SET name = ?
           WHERE id = ?`,
          [name, req.user.id]
        );
      }

      // Get current employee photo
      const [currentEmployeeRows] = await db.query(
        `SELECT profile_photo
         FROM employees
         WHERE user_id = ?
         LIMIT 1`,
        [req.user.id]
      );

      if (
        !currentEmployeeRows ||
        currentEmployeeRows.length === 0
      ) {
        return res.status(404).json({
          message: 'Employee profile not found.',
        });
      }

      let profilePhoto =
        currentEmployeeRows[0].profile_photo;

      // If a new photo was uploaded
      if (req.file) {
        profilePhoto = await storageService.save({
          folder: 'profiles', originalName: req.file.originalname,
          buffer: req.file.buffer, contentType: req.file.mimetype,
        });

        // Delete old profile photo if it exists
        const oldPhoto =
          currentEmployeeRows[0].profile_photo;

        if (oldPhoto) await storageService.remove(oldPhoto);
      }

      // Update employee information
      await db.query(
        `UPDATE employees
         SET phone = ?,
             address = ?,
             emergency_contact_name = ?,
             emergency_contact_phone = ?,
             profile_photo = ?
         WHERE user_id = ?`,
        [
          phone || null,
          address || null,
          emergencyContactName || null,
          emergencyContactPhone || null,
          profilePhoto || null,
          req.user.id,
        ]
      );

      const employee = await getEmployeeProfile(req.user.id);
      if (employee?.profile_photo) employee.profile_photo = await storageService.getDownloadUrl(employee.profile_photo);

      res.status(200).json({
        message: 'Profile updated successfully.',
        employee,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   MULTER ERROR HANDLING
========================================================= */

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message:
          'Profile photo must be smaller than 5 MB.',
      });
    }

    return res.status(400).json({
      message: error.message,
    });
  }

  if (error) {
    return res.status(400).json({
      message:
        error.message ||
        'Failed to upload profile photo.',
    });
  }

  next();
});

module.exports = router;
