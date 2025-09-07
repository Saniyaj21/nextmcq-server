import Institute from '../models/Institute.js';
import validator from 'validator';

/**
 * Get all institutes with optional search
 * GET /api/institutes
 */
export const getInstitutes = async (req, res) => {
  try {
    const { search, limit = 50, type } = req.query;
    
    // Build query filters
    let query = { isActive: true };
    
    // Add type filter if provided
    if (type && ['school', 'college', 'university', 'academy', 'institute'].includes(type)) {
      query.type = type;
    }
    
    // Convert limit to number and validate
    const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100 results
    
    let institutes;
    
    if (search && search.trim()) {
      // Use the search method from the model
      institutes = await Institute.searchInstitutes(search.trim(), limitNum);
    } else {
      // Get all institutes with sorting
      institutes = await Institute.find(query)
        .select('name location type studentCount teacherCount')
        .sort({ studentCount: -1, teacherCount: -1, name: 1 }) // Popular first, then alphabetical
        .limit(limitNum);
    }
    
    res.status(200).json({
      success: true,
      message: 'Institutes retrieved successfully',
      data: {
        institutes,
        count: institutes.length,
        hasMore: institutes.length === limitNum // Indicates if there might be more results
      }
    });

  } catch (error) {
    console.error('Get Institutes Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve institutes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new institute
 * POST /api/institutes
 */
export const createInstitute = async (req, res) => {
  try {
    const { name, location, type } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Institute name is required'
      });
    }

    // Validate name length
    if (name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Institute name must be between 2 and 100 characters'
      });
    }

    // Validate location if provided
    if (location && location.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Location cannot exceed 100 characters'
      });
    }

    // Validate type if provided
    if (type && !['school', 'college', 'university', 'academy', 'institute'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid institute type. Must be one of: school, college, university, academy, institute'
      });
    }

    // Check if institute with same name already exists
    const existingInstitute = await Institute.findByName(name.trim());
    if (existingInstitute) {
      return res.status(409).json({
        success: false,
        message: 'An institute with this name already exists',
        data: {
          existingInstitute: {
            _id: existingInstitute._id,
            name: existingInstitute.name,
            location: existingInstitute.location,
            type: existingInstitute.type
          }
        }
      });
    }

    // Get user ID from JWT token (if available)
    let createdBy = null;
    if (req.user && req.user.userId) {
      createdBy = req.user.userId;
    }

    // Create new institute
    const instituteData = {
      name: name.trim(),
      type: type || 'school'
    };

    if (location && location.trim()) {
      instituteData.location = location.trim();
    }

    if (createdBy) {
      instituteData.createdBy = createdBy;
    }

    const newInstitute = await Institute.create(instituteData);

    res.status(201).json({
      success: true,
      message: 'Institute created successfully',
      data: {
        institute: {
          _id: newInstitute._id,
          name: newInstitute.name,
          location: newInstitute.location,
          type: newInstitute.type,
          studentCount: newInstitute.studentCount,
          teacherCount: newInstitute.teacherCount
        }
      }
    });

  } catch (error) {
    console.error('Create Institute Error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An institute with this name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create institute',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get institute by ID
 * GET /api/institutes/:id
 */
export const getInstituteById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid institute ID format'
      });
    }

    const institute = await Institute.findById(id)
      .select('name location type studentCount teacherCount createdAt')
      .populate('createdBy', 'name email');

    if (!institute || !institute.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Institute retrieved successfully',
      data: { institute }
    });

  } catch (error) {
    console.error('Get Institute By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve institute',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get popular institutes (most students/teachers)
 * GET /api/institutes/popular
 */
export const getPopularInstitutes = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 20, 50); // Max 50 results

    const institutes = await Institute.getPopularInstitutes(limitNum);

    res.status(200).json({
      success: true,
      message: 'Popular institutes retrieved successfully',
      data: {
        institutes,
        count: institutes.length
      }
    });

  } catch (error) {
    console.error('Get Popular Institutes Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve popular institutes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Search institutes by name or location
 * GET /api/institutes/search?q=searchTerm
 */
export const searchInstitutes = async (req, res) => {
  try {
    const { q: searchTerm, limit = 20 } = req.query;

    if (!searchTerm || !searchTerm.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const limitNum = Math.min(parseInt(limit) || 20, 50); // Max 50 results
    const institutes = await Institute.searchInstitutes(searchTerm.trim(), limitNum);

    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: {
        searchTerm: searchTerm.trim(),
        institutes,
        count: institutes.length
      }
    });

  } catch (error) {
    console.error('Search Institutes Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search institutes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
