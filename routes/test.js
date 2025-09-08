import express from 'express';
import { getTests, createTest } from '../controllers/testController.js';

const router = express.Router();

router.get('/get-tests', getTests);
router.post('/create-test', createTest);

export default router;