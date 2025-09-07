import express from 'express';
import {
  getInstitutes,
  createInstitute,
  getInstituteById,
  getPopularInstitutes,
  searchInstitutes
} from '../controllers/instituteController.js';

const router = express.Router();

// Institute routes
router.get('/search', searchInstitutes);           // GET /api/institutes/search?q=term - Search institutes
router.get('/popular', getPopularInstitutes);      // GET /api/institutes/popular - Get popular institutes
router.get('/:id', getInstituteById);              // GET /api/institutes/:id - Get institute by ID
router.get('/', getInstitutes);                    // GET /api/institutes - Get all institutes with optional search
router.post('/', createInstitute);                 // POST /api/institutes - Create new institute

export default router;
