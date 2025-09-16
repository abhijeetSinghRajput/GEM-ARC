// backend/routes/chatbotRoutes.js
import express from 'express';
import { processQuery } from '../controllers/chatbotController.js';
import { protectUser } from '../middleware/authMiddleware.js'; // Assuming you have an auth middleware

const router = express.Router();

// Process chatbot query - protected route requiring authentication
router.post('/query', protectUser, processQuery);
router.get('/test', (req, res) => {
    res.json({ message: "Chatbot API is working" });
  });
  
  // Unprotected version for testing if auth is causing issues
  router.post('/query-test', processQuery);

export default router;