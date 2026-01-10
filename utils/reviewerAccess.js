/**
 * Reviewer Access Utility
 * Handles Google Play Console reviewer access bypass for OTP authentication
 */

/**
 * Get reviewer test account email
 * @returns {string} - Test account email for reviewers
 */
export function getReviewerTestEmail() {
  return process.env.REVIEWER_TEST_EMAIL || 'playreviewer@testmail.com';
}

/**
 * Check if an email is the reviewer test email
 * @param {string} email - Email address to check
 * @returns {boolean} - True if email matches the reviewer test email
 */
export function isReviewerEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailLower = email.toLowerCase();
  const testEmail = getReviewerTestEmail().toLowerCase();
  
  // Check if email matches the test email
  return emailLower === testEmail;
}

/**
 * Get the fixed OTP for reviewers
 * @returns {string} - Fixed OTP code for reviewers
 */
export function getReviewerOTP() {
  // Get fixed OTP from environment variable, default to 123456
  return process.env.REVIEWER_OTP || '123456';
}

/**
 * Check if reviewer bypass is enabled
 * @returns {boolean} - True if reviewer bypass is enabled
 */
export function isReviewerBypassEnabled() {
  // Reviewer bypass is enabled by default in production
  // Can be disabled by setting REVIEWER_BYPASS_ENABLED=false
  return process.env.REVIEWER_BYPASS_ENABLED !== 'false';
}

