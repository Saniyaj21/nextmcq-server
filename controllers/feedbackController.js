// File: server/controllers/feedbackController.js
// Feedback controller for handling feedback submissions

import Feedback from '../models/Feedback.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendMail.js';

/**
 * Submit feedback
 * POST /api/feedback/submit
 */
export const submitFeedback = async (req, res) => {
  try {
    const userId = req.userId;
    const { type, subject, message, email } = req.body;

    // Validation
    if (!type || !['general', 'bug', 'feature', 'question'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback type. Must be: general, bug, feature, or question',
      });
    }

    if (!subject || subject.trim().length < 5 || subject.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Subject must be between 5 and 100 characters',
      });
    }

    if (!message || message.trim().length < 10 || message.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message must be between 10 and 2000 characters',
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // Get user info for context
    const user = await User.findById(userId).select('name email role');

    // Create feedback
    const feedback = new Feedback({
      userId,
      type,
      subject: subject.trim(),
      message: message.trim(),
      email: email.trim().toLowerCase(),
      userAgent: req.headers['user-agent'] || null,
    });

    await feedback.save();

    // Send confirmation email to user (optional)
    try {
      await sendEmail({
        to: email.trim(),
        subject: 'Thank you for your feedback - NextMCQ',
        message: `Hi ${user?.name || 'there'},\n\nWe've received your ${type} feedback and appreciate you taking the time to help us improve NextMCQ.\n\nSubject: ${subject.trim()}\n\nOur team will review your feedback and get back to you if needed.\n\nBest regards,\nThe NextMCQ Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007bff;">Thank you for your feedback!</h2>
            <p>Hi ${user?.name || 'there'},</p>
            <p>We've received your ${type} feedback and appreciate you taking the time to help us improve NextMCQ.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Subject:</strong> ${subject.trim()}</p>
            </div>
            <p>Our team will review your feedback and get back to you if needed.</p>
            <p>Best regards,<br>The NextMCQ Team</p>
          </div>
        `,
      });
    } catch (emailError) {
      // Don't fail the request if email fails
      console.error('Failed to send feedback confirmation email:', emailError);
    }

    // Send notification to admin (optional - you can configure admin email)
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      try {
        await sendEmail({
          to: adminEmail,
          subject: `New ${type} feedback from NextMCQ`,
          message: `New ${type} feedback received from ${user?.name || 'Unknown'} (${user?.email || email})\n\nSubject: ${subject.trim()}\n\nMessage:\n${message.trim()}\n\nFeedback ID: ${feedback._id}\nSubmitted: ${new Date().toLocaleString()}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #007bff;">New Feedback Received</h2>
              <p><strong>Type:</strong> ${type}</p>
              <p><strong>User:</strong> ${user?.name || 'Unknown'} (${user?.email || email})</p>
              <p><strong>Role:</strong> ${user?.role || 'Unknown'}</p>
              <p><strong>Subject:</strong> ${subject.trim()}</p>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Message:</strong></p>
                <p style="margin-top: 10px; white-space: pre-wrap;">${message.trim()}</p>
              </div>
              <p><strong>Feedback ID:</strong> ${feedback._id}</p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            </div>
          `,
        });
      } catch (adminEmailError) {
        console.error('Failed to send admin notification email:', adminEmailError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        feedbackId: feedback._id,
        submittedAt: feedback.createdAt,
      },
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get user's feedback history (optional - for future use)
 * GET /api/feedback/my-feedback
 */
export const getMyFeedback = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const feedbacks = await Feedback.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('type subject status createdAt adminResponse respondedAt');

    const total = await Feedback.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: {
        feedbacks,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get my feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
    });
  }
};

