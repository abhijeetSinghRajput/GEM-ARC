// backend/routes/authRoutes.js
import express from 'express';
import {
  userRegister,
  userLogin,
  adminLogin
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', userRegister);
router.post('/login', userLogin);
router.post('/admin/login', adminLogin);

export default router;
