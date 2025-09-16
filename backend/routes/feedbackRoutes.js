import express from 'express';
import { check } from 'express-validator';
import { protectUser } from '../middleware/authMiddleware.js';
import {
  submitFeedback,
  getMyFeedback,
  getAllFeedbackAdmin,
  updateFeedbackStatus,
  getEventFeedback,
  getUserEventFeedback
} from '../controllers/feedbackController.js';

const router = express.Router();

/**
 * @route   POST api/feedback/submit
 * @desc    Submit new feedback
 * @access  Private
 */
router.post(
  '/submit',
  [
    protectUser,
    [
      check('feedbackType', 'Feedback type is required')
        .not()
        .isEmpty()
        .isIn(['suggestion', 'bug', 'feature', 'praise']),
      check('subject', 'Subject is required')
        .not()
        .isEmpty()
        .trim(),
      check('message', 'Message is required')
        .not()
        .isEmpty()
        .trim(),
      check('rating', 'Rating must be between 1 and 5')
        .isInt({ min: 1, max: 5 })
    ]
  ],
  submitFeedback
);

/**
 * @route   GET api/feedback/my-feedback
 * @desc    Get all feedback submitted by current user
 * @access  Private
 */
router.get('/my-feedback', protectUser, getMyFeedback);

/**
 * @route   GET api/feedback/admin
 * @desc    Get all feedback (admin only)
 * @access  Private/Admin
 */
router.get('/admin', protectUser, getAllFeedbackAdmin);

/**
 * @route   PUT api/feedback/:id/status
 * @desc    Update feedback status (admin only)
 * @access  Private/Admin
 */
router.put(
  '/:id/status',
  [
    protectUser,
    [
      check('status', 'Status is required')
        .not()
        .isEmpty()
        .isIn(['pending', 'in-review', 'resolved', 'implemented', 'declined'])
    ]
  ],
  updateFeedbackStatus
);

router.get('/event/:eventId', protectUser, getEventFeedback);
router.get('/my-event-feedback/:eventId', protectUser, getUserEventFeedback);


export default router;
