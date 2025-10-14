import Rating from '../models/Rating.js';
import Test from '../models/Test.js';
import mongoose from 'mongoose';

// Submit or update a rating for a test
export const rateTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const { rating } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!rating || rating < 0.5 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 0.5 and 5'
      });
    }

    // Check if test exists
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Use upsert to either create new rating or update existing one
    const updatedRating = await Rating.findOneAndUpdate(
      { testId, userId },
      { 
        rating,
        updatedAt: new Date()
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    );

    // Calculate new average rating for the test
    const ratingStats = await calculateTestRating(testId);

    // Update the test document with aggregated rating data
    await Test.findByIdAndUpdate(testId, {
      averageRating: ratingStats.averageRating,
      totalRatings: ratingStats.totalRatings
    });

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully',
      data: {
        userRating: updatedRating,
        averageRating: ratingStats.averageRating,
        totalRatings: ratingStats.totalRatings
      }
    });

  } catch (error) {
    console.error('Error in rateTest:', error);
    
    // Handle duplicate key error (should not happen with upsert, but just in case)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this test'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit rating',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get rating statistics for a test
export const getTestRating = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user?.id; // Optional - user might not be logged in

    // Check if test exists
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Get rating statistics
    const ratingStats = await calculateTestRating(testId);
    
    // Get user's rating if user is logged in
    let userRating = null;
    if (userId) {
      const userRatingDoc = await Rating.findOne({ testId, userId });
      userRating = userRatingDoc ? userRatingDoc.rating : null;
    }

    res.status(200).json({
      success: true,
      data: {
        testId,
        averageRating: ratingStats.averageRating,
        totalRatings: ratingStats.totalRatings,
        userRating,
        ratingDistribution: ratingStats.distribution
      }
    });

  } catch (error) {
    console.error('Error in getTestRating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get test rating',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user's rating for a specific test
export const getUserRating = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user.id;

    const userRating = await Rating.findOne({ testId, userId });

    res.status(200).json({
      success: true,
      data: {
        testId,
        userId,
        rating: userRating ? userRating.rating : null,
        ratedAt: userRating ? userRating.updatedAt : null
      }
    });

  } catch (error) {
    console.error('Error in getUserRating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user rating',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to calculate test rating statistics
const calculateTestRating = async (testId) => {
  try {
    const pipeline = [
      { 
        $match: { 
          testId: new mongoose.Types.ObjectId(testId) 
        } 
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          ratings: { $push: '$rating' }
        }
      }
    ];

    const result = await Rating.aggregate(pipeline);
    
    if (!result || result.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        distribution: {
          5: 0, 4: 0, 3: 0, 2: 0, 1: 0
        }
      };
    }

    const stats = result[0];
    
    // Calculate rating distribution
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    stats.ratings.forEach(rating => {
      const rounded = Math.round(rating);
      if (distribution.hasOwnProperty(rounded)) {
        distribution[rounded]++;
      }
    });

    return {
      averageRating: Math.round(stats.averageRating * 10) / 10, // Round to 1 decimal
      totalRatings: stats.totalRatings,
      distribution
    };

  } catch (error) {
    console.error('Error calculating test rating:', error);
    return {
      averageRating: 0,
      totalRatings: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }
};