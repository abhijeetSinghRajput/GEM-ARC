// routes/eventProposalRoutes.js
import express from 'express';
import {protectUser} from '../middleware/authMiddleware.js';
import { 
  proposeEvent, 
  getAllProposals, 
  getUserProposals,
  reviewProposal 
} from '../controllers/eventProposalController.js';

const router = express.Router();

// Submit a new event proposal
router.post('/propose', protectUser, proposeEvent);

// Get all event proposals (admin only)
router.get('/all', protectUser, getAllProposals);

// Get user's proposals
router.get('/my-proposals', protectUser, getUserProposals);

// Review a proposal (admin only)
router.put('/review/:proposalId', protectUser, reviewProposal);

export default router;
