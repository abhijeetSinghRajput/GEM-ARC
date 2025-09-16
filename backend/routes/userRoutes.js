// backend/routes/userRoutes.js
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { saveSkills, saveInterests, getProfile, updateProfile, getLeaderboard } from '../controllers/userController.js';
import { protectUser } from '../middleware/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();
  

// Routes
router.put('/update', protectUser, updateProfile);
router.post('/skills', protectUser, saveSkills);
router.post('/interests', protectUser, saveInterests);
router.get('/profile', protectUser, getProfile);
router.get('/leaderboard',protectUser, getLeaderboard);


export default router;
