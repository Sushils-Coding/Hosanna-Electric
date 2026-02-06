const express = require('express');
const { body, validationResult } = require('express-validator');
const Job = require('../models/Job');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES, JOB_STATUS } = require('../config/constants');
const JobService = require('../services/JobService');

const router = express.Router();

router.use(authenticate);

// ── GET /api/jobs ────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, assignedTechnician, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === ROLES.TECHNICIAN) {
      filter.assignedTechnician = req.user._id;
    }
    if (status) filter.status = status;
    if (assignedTechnician && req.user.role !== ROLES.TECHNICIAN) {
      filter.assignedTechnician = assignedTechnician;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate('assignedTechnician', 'name email')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Job.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/jobs/:id ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('assignedTechnician', 'name email')
      .populate('createdBy', 'name email')
      .populate('statusHistory.changedBy', 'name email role');

    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    if (
      req.user.role === ROLES.TECHNICIAN &&
      job.assignedTechnician?._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this job' });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/jobs (ADMIN) ──────────────────────────────────────────
router.post(
  '/',
  authorize(ROLES.ADMIN),
  [
    body('title').notEmpty().withMessage('Job title is required'),
    body('customerName').notEmpty().withMessage('Customer name is required'),
    body('customerEmail').optional().isEmail().withMessage('Invalid customer email'),
    body('scheduledDate').optional().isISO8601().withMessage('Invalid date format'),
    body('estimatedCost').optional().isFloat({ min: 0 }).withMessage('Must be a positive number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const job = await JobService.createJob(req.body, req.user._id);
      res.status(201).json({ success: true, data: job });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ── PATCH /api/jobs/:id/status ──────────────────────────────────────
router.patch(
  '/:id/status',
  [
    body('status')
      .isIn(Object.values(JOB_STATUS))
      .withMessage(`Status must be one of: ${Object.values(JOB_STATUS).join(', ')}`),
    body('notes').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const result = await JobService.transitionStatus(
        req.params.id,
        req.body.status,
        req.user,
        req.body.notes
      );

      if (result.error) {
        return res.status(result.status).json({ success: false, error: result.error });
      }

      res.json({ success: true, data: result.data, message: `Status updated to ${req.body.status}` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ── PATCH /api/jobs/:id/assign (ADMIN) ──────────────────────────────
router.patch(
  '/:id/assign',
  authorize(ROLES.ADMIN),
  [
    body('technicianId').isMongoId().withMessage('Valid technician ID required'),
    body('notes').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const result = await JobService.assignTechnician(
        req.params.id,
        req.body.technicianId,
        req.user,
        req.body.notes
      );

      if (result.error) {
        return res.status(result.status).json({ success: false, error: result.error });
      }

      res.json({ success: true, data: result.data, message: 'Technician assigned' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ── PUT /api/jobs/:id (ADMIN, OFFICE_MANAGER) ───────────────────────
router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.OFFICE_MANAGER),
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('customerEmail').optional().isEmail().withMessage('Invalid customer email'),
    body('scheduledDate').optional().isISO8601().withMessage('Invalid date format'),
    body('estimatedCost').optional().isFloat({ min: 0 }).withMessage('Must be positive'),
    body('actualCost').optional().isFloat({ min: 0 }).withMessage('Must be positive'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const result = await JobService.updateJobDetails(req.params.id, req.body);
      if (result.error) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result.data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ── GET /api/jobs/:id/history ───────────────────────────────────────
router.get('/:id/history', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .select('statusHistory status title')
      .populate('statusHistory.changedBy', 'name email role');

    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    res.json({
      success: true,
      data: {
        jobId: job._id,
        title: job.title,
        currentStatus: job.status,
        history: job.statusHistory,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
