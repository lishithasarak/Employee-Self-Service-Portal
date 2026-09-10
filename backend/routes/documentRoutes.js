const express = require('express');
const multer = require('multer');
const db = require('../config/db');
const storageService = require('../utils/storageService');
const {
  authenticate,
  authorize
} = require('../middleware/authMiddleware');

const router = express.Router();

/*
 * Multer storage configuration
 * Uploaded documents are stored in:
 * backend/uploads/documents
 */
const storage = multer.memoryStorage();

/*
 * File upload configuration
 * Maximum file size: 10 MB
 */
const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          'Invalid file type. Allowed files are PDF, JPG, PNG, WEBP, DOC, and DOCX.'
        )
      );
    }

    cb(null, true);
  }
});

/*
 * Get documents accessible to the current user
 */
router.get(
  '/',
  authenticate,
  authorize('EMPLOYEE', 'ADMIN', 'MANAGER'),
  async (req, res, next) => {
    try {
      const role = req.user.role;

      let visibilityFilter = "visibility = 'ALL'";

      if (role === 'EMPLOYEE') {
        visibilityFilter =
          "(visibility = 'ALL' OR visibility = 'EMPLOYEE')";
      } else if (role === 'MANAGER') {
        visibilityFilter =
          "(visibility = 'ALL' OR visibility = 'MANAGER' OR visibility = 'EMPLOYEE')";
      } else if (role === 'ADMIN') {
        visibilityFilter = 'visibility IS NOT NULL';
      }

      const [documents] = await db.query(
        `SELECT
           id,
           title,
           category,
           file_url,
           visibility,
           created_at
         FROM documents
         WHERE is_active = 1
           AND ${visibilityFilter}
         ORDER BY created_at DESC`,
        []
      );

      const accessibleDocuments = await Promise.all((documents || []).map(async (document) => ({
        ...document,
        file_url: document.file_url ? await storageService.getDownloadUrl(document.file_url) : null,
      })));
      const categories = [
        ...new Set(
          accessibleDocuments.map(
            (document) => document.category
          )
        )
      ];

      res.status(200).json({
        documents: accessibleDocuments,
        categories
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * Get document by ID
 */
router.get(
  '/:id',
  authenticate,
  authorize('EMPLOYEE', 'ADMIN', 'MANAGER'),
  async (req, res, next) => {
    try {
      const documentId = req.params.id;
      const role = req.user.role;

      let visibilityFilter = "visibility = 'ALL'";

      if (role === 'EMPLOYEE') {
        visibilityFilter =
          "(visibility = 'ALL' OR visibility = 'EMPLOYEE')";
      } else if (role === 'MANAGER') {
        visibilityFilter =
          "(visibility = 'ALL' OR visibility = 'MANAGER' OR visibility = 'EMPLOYEE')";
      } else if (role === 'ADMIN') {
        visibilityFilter = 'visibility IS NOT NULL';
      }

      const [documents] = await db.query(
        `SELECT
           id,
           title,
           category,
           file_url,
           visibility,
           created_at
         FROM documents
         WHERE id = ?
           AND is_active = 1
           AND ${visibilityFilter}
         LIMIT 1`,
        [documentId]
      );

      if (!documents || documents.length === 0) {
        return res.status(404).json({
          message:
            'Document not found or access denied.'
        });
      }

      res.status(200).json({
        document: documents[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * Upload document
 * Admin only
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      const {
        title,
        category,
        visibility
      } = req.body;

      /*
       * Validate uploaded file
       */
      if (!req.file) {
        return res.status(400).json({
          message: 'Please select a file to upload.'
        });
      }

      /*
       * Validate title
       */
      if (!title || !String(title).trim()) {
        return res.status(400).json({
          message: 'Document title is required.'
        });
      }

      /*
       * Validate category
       */
      if (!category || !String(category).trim()) {
        return res.status(400).json({
          message: 'Document category is required.'
        });
      }

      /*
       * Validate visibility
       */
      const allowedVisibility = [
        'ALL',
        'EMPLOYEE',
        'MANAGER',
        'ADMIN'
      ];

      if (
        !allowedVisibility.includes(
          visibility || 'ALL'
        )
      ) {
        return res.status(400).json({
          message: 'Invalid document visibility.'
        });
      }

      /*
       * Validate text lengths
       */
      if (
        String(title).trim().length > 150 ||
        String(category).trim().length > 80
      ) {
        return res.status(400).json({
          message:
            'Document title or category exceeds the allowed length.'
        });
      }

      /*
       * Generate public file URL
       */
      const fileUrl = await storageService.save({
        folder: 'documents', originalName: req.file.originalname,
        buffer: req.file.buffer, contentType: req.file.mimetype,
      });

      /*
       * Save document information in database
       */
      const [result] = await db.query(
        `INSERT INTO documents
          (
            title,
            category,
            file_url,
            uploaded_by,
            visibility,
            is_active
          )
         VALUES (?, ?, ?, ?, ?, 1)`,
        [
          String(title).trim(),
          String(category).trim(),
          fileUrl,
          req.user.id,
          visibility || 'ALL'
        ]
      );

      /*
       * Fetch created document
       */
      const [newDoc] = await db.query(
        `SELECT
           id,
           title,
           category,
           file_url,
           visibility,
           created_at
         FROM documents
         WHERE id = ?
         LIMIT 1`,
        [result.insertId]
      );

      res.status(201).json({
        message:
          'Document uploaded successfully.',
        document: newDoc[0] ? { ...newDoc[0], file_url: await storageService.getDownloadUrl(newDoc[0].file_url) } : null
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
