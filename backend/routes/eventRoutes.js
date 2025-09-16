// backend/routes/eventRoutes.js
import express from 'express';
import { protectUser } from '../middleware/authMiddleware.js';
import { getRecommendedEvents, joinEvent, getUserRecommendedEvents } from '../controllers/eventController.js';
import Event from '../models/Event.js'; // Import the Event model
import { getEventById } from '../controllers/eventController.js';

const router = express.Router();

router.get('/recommended', protectUser, getRecommendedEvents);
router.get('/userRecommended', protectUser, getUserRecommendedEvents);
router.post('/join', protectUser, joinEvent);
router.get('/allEvents', async (req, res) => {
  try {
    // Fetch all events from the 'events' collection, sorted by date in ascending order
    const events = await Event.find().sort({ date: 1 }); // 1 for ascending order
    res.status(200).json(events); // Send the sorted events as a JSON response
  } catch (err) {
    res.status(500).json({ message: 'Server Error while fetching events' });
  }
});
router.get('/:id', getEventById);

export default router;
