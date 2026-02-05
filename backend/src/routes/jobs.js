const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { Job, User } = require('../models');
const { authenticate, authorize } = require('../middleware');
const { ROLES, JOB_STATUS } = require('../config/constants');
const JobStateMachine = require('../services/JobStateMachine');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs (filtered by role)
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { status, assignedTechnician, page = 1, limit = 20 } = req.query;

    // Build query based on role
    let filter = {};

    // Technicians can only see their assigned jobs
    if (req.user.role === ROLES.TECHNICIAN) {
      filter.assignedTechnician = req.user._id;
    }

    // Apply filters
    if (status) {
      filter.status = status;
    }
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
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/jobs/:id
 * @desc    Get single job by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('assignedTechnician', 'name email')
      .populate('createdBy', 'name email')
      .populate('statusHistory.changedBy', 'name email role');

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // Technicians can only view their assigned jobs
    if (
      req.user.role === ROLES.TECHNICIAN &&
      job.assignedTechnician?._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this job',
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/jobs
 * @desc    Create a new job
 * @access  Private (ADMIN only)
 */
router.post(
  '/',
  authorize(ROLES.ADMIN),
  [
    body('title').notEmpty().withMessage('Job title is required'),
    body('customerName').notEmpty().withMessage('Customer name is required'),
    body('customerEmail')
      .optional()
      .isEmail()
      .withMessage('Invalid customer email'),
    body('scheduledDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
    body('estimatedCost')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Estimated cost must be a positive number'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const jobData = {
        ...req.body,
        createdBy: req.user._id,
        status: JOB_STATUS.TENTATIVE,
        statusHistory: [
          {
            fromStatus: null,
            toStatus: JOB_STATUS.TENTATIVE,
            changedBy: req.user._id,
            notes: 'Job created',
          },
        ],
      };

      const job = await Job.create(jobData);
      await job.populate([
        { path: 'createdBy', select: 'name email' },
        { path: 'statusHistory.changedBy', select: 'name email role' },
      ]);

      res.status(201).json({
        success: true,
        data: job,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   PATCH /api/jobs/:id/status
 * @desc    Update job status (with state machine validation)
 * @access  Private (role-based)
 */
router.patch(
  '/:id/status',
  [
    body('status')
      .isIn(Object.values(JOB_STATUS))
      .withMessage(`Status must be one of: ${Object.values(JOB_STATUS).join(', ')}`),
    body('notes').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { status: newStatus, notes } = req.body;

      const job = await Job.findById(req.params.id);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      // Validate transition using state machine
      const validation = JobStateMachine.validateTransition(
        job.status,
        newStatus,
        req.user.role
      );

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error,
        });
      }

      // Additional validation for technician - must be assigned to the job
      if (req.user.role === ROLES.TECHNICIAN) {
        if (!job.assignedTechnician || 
            job.assignedTechnician.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            error: 'You are not assigned to this job',
          });
        }
      }

      // Add to status history
      job.statusHistory.push({
        fromStatus: job.status,
        toStatus: newStatus,
        changedBy: req.user._id,
        notes: notes || `Status changed from ${job.status} to ${newStatus}`,
      });

      // Update status and timestamps
      job.status = newStatus;

      if (newStatus === JOB_STATUS.COMPLETED) {
        job.completedAt = new Date();
      }
      if (newStatus === JOB_STATUS.BILLED) {
        job.billedAt = new Date();
      }

      await job.save();
      await job.populate([
        { path: 'assignedTechnician', select: 'name email' },
        { path: 'createdBy', select: 'name email' },
        { path: 'statusHistory.changedBy', select: 'name email role' },
      ]);

      res.json({
        success: true,
        data: job,
        message: `Job status updated to ${newStatus}`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   PATCH /api/jobs/:id/assign
 * @desc    Assign technician to job (also confirms job)
 * @access  Private (ADMIN only)
 */
router.patch(
  '/:id/assign',
  authorize(ROLES.ADMIN),
  [
    body('technicianId').isMongoId().withMessage('Valid technician ID required'),
    body('notes').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { technicianId, notes } = req.body;

      // Verify technician exists and has correct role
      const technician = await User.findById(technicianId);
      if (!technician) {
        return res.status(404).json({
          success: false,
          error: 'Technician not found',
        });
      }
      if (technician.role !== ROLES.TECHNICIAN) {
        return res.status(400).json({
          success: false,
          error: 'User is not a technician',
        });
      }

      const job = await Job.findById(req.params.id);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      // Job must be CONFIRMED to be assigned
      if (job.status !== JOB_STATUS.CONFIRMED) {
        return res.status(400).json({
          success: false,
          error: `Job must be in CONFIRMED status to assign. Current status: ${job.status}`,
        });
      }

      // Validate transition
      const validation = JobStateMachine.validateTransition(
        job.status,
        JOB_STATUS.ASSIGNED,
        req.user.role
      );

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error,
        });
      }

      // Assign technician and update status
      job.assignedTechnician = technicianId;
      job.statusHistory.push({
        fromStatus: job.status,
        toStatus: JOB_STATUS.ASSIGNED,
        changedBy: req.user._id,
        notes: notes || `Assigned to ${technician.name}`,
      });
      job.status = JOB_STATUS.ASSIGNED;

      await job.save();
      await job.populate([
        { path: 'assignedTechnician', select: 'name email' },
        { path: 'createdBy', select: 'name email' },
        { path: 'statusHistory.changedBy', select: 'name email role' },
      ]);

      res.json({
        success: true,
        data: job,
        message: `Job assigned to ${technician.name}`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/jobs/:id
 * @desc    Update job details (not status)
 * @access  Private (ADMIN, OFFICE_MANAGER)
 */
router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.OFFICE_MANAGER),
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('customerEmail')
      .optional()
      .isEmail()
      .withMessage('Invalid customer email'),
    body('scheduledDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
    body('estimatedCost')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Estimated cost must be positive'),
    body('actualCost')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Actual cost must be positive'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      // Prevent status updates through this endpoint
      const { status, statusHistory, ...updateData } = req.body;

      const job = await Job.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('assignedTechnician', 'name email')
        .populate('createdBy', 'name email')
        .populate('statusHistory.changedBy', 'name email role');

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/jobs/:id/history
 * @desc    Get job status history
 * @access  Private
 */
router.get('/:id/history', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .select('statusHistory status title')
      .populate('statusHistory.changedBy', 'name email role');

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

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
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/jobs/transitions/info
 * @desc    Get state machine information
 * @access  Private
 */
router.get('/transitions/info', (req, res) => {
  const stateMachine = JobStateMachine.describeStateMachine();
  const userTransitions = {};

  // Show what the current user can do for each status
  Object.values(JOB_STATUS).forEach((status) => {
    userTransitions[status] = JobStateMachine.getValidNextStatusesForRole(
      status,
      req.user.role
    );
  });

  res.json({
    success: true,
    data: {
      allTransitions: stateMachine,
      yourAllowedTransitions: userTransitions,
      yourRole: req.user.role,
    },
  });
});

module.exports = router;
