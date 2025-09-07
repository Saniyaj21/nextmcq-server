import express from 'express';
import { getBanners, createBanner } from '../controllers/bannerController.js';

const router = express.Router();

router.get('/get-banners', getBanners);
router.post('/create-banner', createBanner);

export default router;