// backend/routes/adminRoutes.js
import express from 'express';
import {
  createEvent,
  getAllEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  getAllEventProposals,
  approveEventProposal,
  rejectEventProposal,
  getAllFeedback,
  getDashboardStats,
  twilioTest
} from '../controllers/adminController.js';
import { isAdmin, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all routes with authentication and admin checks
// router.use(protect, isAdmin);

// Event routes
router.get('/twilio-test', twilioTest);
router.post('/create-event', createEvent);
router.get('/events', getAllEvents);
router.get('/events/:id', getEvent);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);

// Event proposal routes
router.get('/event-proposals/all', getAllEventProposals);
router.put('/event-proposals/approve/:id', approveEventProposal);
router.put('/event-proposals/reject/:id', rejectEventProposal);

// Feedback routes
router.get('/feedback/all', getAllFeedback);

// Dashboard stats
router.get('/dashboard-stats', getDashboardStats);

export default router;