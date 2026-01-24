// File: ./controllers/batchController.js
import Batch from '../models/Batch.js';
import User from '../models/User.js';
import Test from '../models/Test.js';

/**
 * Create a new batch
 * POST /api/batches
 */
export const createBatch = async (req, res) => {
  try {
    const teacherId = req.user._id;

    // Verify user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can create batches'
      });
    }

    const { name, studentIds = [] } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Batch name is required'
      });
    }

    // Validate student IDs if provided
    if (studentIds.length > 0) {
      const validStudents = await User.find({
        _id: { $in: studentIds },
        role: 'student'
      }).select('_id');

      const validStudentIds = validStudents.map(s => s._id.toString());
      const invalidIds = studentIds.filter(id => !validStudentIds.includes(id.toString()));

      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid student IDs: ${invalidIds.join(', ')}`
        });
      }
    }

    // Create batch
    const batch = new Batch({
      name: name.trim(),
      createdBy: teacherId,
      students: studentIds
    });

    await batch.save();

    // Populate createdBy and students for response
    await batch.populate('createdBy', 'name email');
    await batch.populate('students', 'name email profileImage');

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: batch
    });

  } catch (error) {
    console.error('Create Batch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create batch',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all batches created by the teacher
 * GET /api/batches
 */
export const getBatches = async (req, res) => {
  try {
    const teacherId = req.user._id;

    // Verify user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access batches'
      });
    }

    const batches = await Batch.find({ createdBy: teacherId })
      .select('name students createdAt updatedAt')
      .populate('students', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Format response with student count
    const formattedBatches = batches.map(batch => ({
      _id: batch._id,
      name: batch.name,
      studentCount: batch.students?.length || 0,
      students: batch.students || [],
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: formattedBatches
    });

  } catch (error) {
    console.error('Get Batches Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batches',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get batch details by ID
 * GET /api/batches/:batchId
 */
export const getBatchById = async (req, res) => {
  try {
    const { batchId } = req.params;
    const teacherId = req.user._id;

    // Verify user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access batches'
      });
    }

    const batch = await Batch.findOne({
      _id: batchId,
      createdBy: teacherId
    })
      .populate('createdBy', 'name email')
      .populate('students', 'name email profileImage');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found or you do not have permission to access it'
      });
    }

    res.status(200).json({
      success: true,
      data: batch
    });

  } catch (error) {
    console.error('Get Batch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a batch
 * PUT /api/batches/:batchId
 */
export const updateBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const teacherId = req.user._id;
    const { name, studentIds } = req.body;

    // Verify user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can update batches'
      });
    }

    const batch = await Batch.findOne({
      _id: batchId,
      createdBy: teacherId
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found or you do not have permission to update it'
      });
    }

    // Update fields
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Batch name cannot be empty'
        });
      }
      batch.name = name.trim();
    }

    // Update students if provided
    if (studentIds !== undefined) {
      // Validate student IDs
      if (Array.isArray(studentIds) && studentIds.length > 0) {
        const validStudents = await User.find({
          _id: { $in: studentIds },
          role: 'student'
        }).select('_id');

        const validStudentIds = validStudents.map(s => s._id.toString());
        const invalidIds = studentIds.filter(id => !validStudentIds.includes(id.toString()));

        if (invalidIds.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid student IDs: ${invalidIds.join(', ')}`
          });
        }

        batch.students = studentIds;
      } else {
        batch.students = [];
      }
    }

    batch.updatedAt = new Date();
    await batch.save();

    // Populate for response
    await batch.populate('createdBy', 'name email');
    await batch.populate('students', 'name email profileImage');

    res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      data: batch
    });

  } catch (error) {
    console.error('Update Batch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update batch',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a batch
 * DELETE /api/batches/:batchId
 */
export const deleteBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const teacherId = req.user._id;

    // Verify user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can delete batches'
      });
    }

    const batch = await Batch.findOne({
      _id: batchId,
      createdBy: teacherId
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found or you do not have permission to delete it'
      });
    }

    // Remove batch from all tests that reference it
    await Test.updateMany(
      { allowedBatches: batchId },
      { $pull: { allowedBatches: batchId } }
    );

    // Delete the batch
    await Batch.deleteOne({ _id: batchId });

    res.status(200).json({
      success: true,
      message: 'Batch deleted successfully'
    });

  } catch (error) {
    console.error('Delete Batch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete batch',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add students to a batch
 * POST /api/batches/:batchId/students
 */
export const addStudentsToBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const teacherId = req.user._id;
    const { studentIds } = req.body;

    // Verify user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can manage batch students'
      });
    }

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Student IDs array is required'
      });
    }

    const batch = await Batch.findOne({
      _id: batchId,
      createdBy: teacherId
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found or you do not have permission to modify it'
      });
    }

    // Validate student IDs
    const validStudents = await User.find({
      _id: { $in: studentIds },
      role: 'student'
    }).select('_id');

    const validStudentIds = validStudents.map(s => s._id.toString());
    const invalidIds = studentIds.filter(id => !validStudentIds.includes(id.toString()));

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid student IDs: ${invalidIds.join(', ')}`
      });
    }

    // Add students (avoid duplicates)
    const existingStudentIds = batch.students.map(s => s.toString());
    const newStudentIds = studentIds.filter(id => !existingStudentIds.includes(id.toString()));
    
    if (newStudentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All students are already in the batch'
      });
    }

    batch.students.push(...newStudentIds);
    batch.updatedAt = new Date();
    await batch.save();

    // Populate for response
    await batch.populate('students', 'name email profileImage');

    res.status(200).json({
      success: true,
      message: `Added ${newStudentIds.length} student(s) to batch`,
      data: batch
    });

  } catch (error) {
    console.error('Add Students to Batch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add students to batch',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Remove a student from a batch
 * DELETE /api/batches/:batchId/students/:studentId
 */
export const removeStudentFromBatch = async (req, res) => {
  try {
    const { batchId, studentId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Allow both teachers and students to remove students
    // Teachers can remove any student from their batches
    // Students can only remove themselves
    let batch;
    
    if (userRole === 'teacher') {
      // Teacher can remove any student from their own batches
      batch = await Batch.findOne({
        _id: batchId,
        createdBy: userId
      });
    } else if (userRole === 'student') {
      // Student can only remove themselves
      if (studentId !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only remove yourself from batches'
        });
      }
      // Find batch where student is a member
      batch = await Batch.findOne({
        _id: batchId,
        students: userId
      });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only teachers and students can manage batch membership'
      });
    }

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found or you do not have permission to modify it'
      });
    }

    // Remove student
    const initialLength = batch.students.length;
    batch.students = batch.students.filter(
      s => s.toString() !== studentId
    );

    if (batch.students.length === initialLength) {
      return res.status(400).json({
        success: false,
        message: 'Student not found in batch'
      });
    }

    batch.updatedAt = new Date();
    await batch.save();

    // Populate for response
    await batch.populate('createdBy', 'name email profileImage');
    await batch.populate('students', 'name email profileImage');

    res.status(200).json({
      success: true,
      message: userRole === 'student' ? 'You have left the batch successfully' : 'Student removed from batch successfully',
      data: batch
    });

  } catch (error) {
    console.error('Remove Student from Batch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove student from batch',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all batches that a student belongs to
 * GET /api/batches/student/my-batches
 */
export const getStudentBatches = async (req, res) => {
  try {
    const studentId = req.user._id;

    // Verify user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can access their batches'
      });
    }

    // Find all batches where this student is a member
    const batches = await Batch.find({ students: studentId })
      .select('name createdBy students createdAt updatedAt')
      .populate('createdBy', 'name email profileImage')
      .populate('students', 'name email profileImage')
      .sort({ createdAt: -1 })
      .lean();

    // Format response
    const formattedBatches = batches.map(batch => ({
      _id: batch._id,
      name: batch.name,
      createdBy: {
        _id: batch.createdBy._id,
        name: batch.createdBy.name,
        email: batch.createdBy.email,
        profileImage: batch.createdBy.profileImage
      },
      students: batch.students || [],
      studentCount: batch.students?.length || 0,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: formattedBatches
    });

  } catch (error) {
    console.error('Get Student Batches Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student batches',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

