// File: ./routes/batch.js
import express from 'express';
import { authenticateUser } from '../middlewares/auth.js';
import {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  addStudentsToBatch,
  removeStudentFromBatch,
  getStudentBatches
} from '../controllers/batchController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Batch CRUD operations
router.post('/', createBatch); // POST /api/batches
router.get('/', getBatches); // GET /api/batches
router.get('/:batchId', getBatchById); // GET /api/batches/:batchId
router.put('/:batchId', updateBatch); // PUT /api/batches/:batchId
router.delete('/:batchId', deleteBatch); // DELETE /api/batches/:batchId

// Batch student management
router.post('/:batchId/students', addStudentsToBatch); // POST /api/batches/:batchId/students
router.delete('/:batchId/students/:studentId', removeStudentFromBatch); // DELETE /api/batches/:batchId/students/:studentId

// Student batch operations
router.get('/student/my-batches', getStudentBatches); // GET /api/batches/student/my-batches

export default router;

