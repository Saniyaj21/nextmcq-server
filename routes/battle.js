import express from 'express';
import {
  createBattle,
  joinBattle,
  getBattle,
  submitAnswer,
  getBattleState,
  forfeitBattle,
  getSubjects
} from '../controllers/battleController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = express.Router();

router.get('/subjects', authenticateUser, getSubjects);
router.post('/create', authenticateUser, createBattle);
router.post('/join', authenticateUser, joinBattle);
router.get('/:battleId', authenticateUser, getBattle);
router.post('/:battleId/answer', authenticateUser, submitAnswer);
router.get('/:battleId/state', authenticateUser, getBattleState);
router.post('/:battleId/forfeit', authenticateUser, forfeitBattle);

export default router;
