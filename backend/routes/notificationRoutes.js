// backend/routes/notificationRoutes.js
import express from 'express';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification,
  createNotification
} from '../controllers/notificationController.js';
import { protectUser } from '../middleware/authMiddleware.js';

const router = express.Router();


router.post('/add', createNotification); // Assuming you have a function to create notifications
// Get all notifications for authenticated user
router.get('/', protectUser, getNotifications);

// Mark a notification as read
router.put('/:id/read', protectUser, markAsRead);

// Mark all notifications as read
router.put('/read-all', protectUser, markAllAsRead);

// Delete a notification
router.delete('/:id', protectUser, deleteNotification);

export default router;