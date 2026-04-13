import express from 'express';
import { createDonationOrder, verifyDonation } from '../controllers/donationController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = express.Router();

router.post('/create-order', authenticateUser, createDonationOrder);
router.post('/verify', authenticateUser, verifyDonation);

export default router;
