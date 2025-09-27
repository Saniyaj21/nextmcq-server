// File: ./utils/timeValidator.js
// Time validation utilities to prevent timer manipulation

/**
 * Validate test time spent to prevent cheating
 * @param {Object} attempt - TestAttempt document
 * @param {Date|string} clientEndTime - Client submitted end time
 * @returns {Object} - Validation result
 */
export const validateTestTime = (attempt, clientEndTime) => {
  const serverTime = new Date();
  const serverStartTime = attempt.serverStartTime;
  const clientTime = new Date(clientEndTime);

  // Calculate time spent according to server and client
  const serverTimeSpent = Math.floor((serverTime - serverStartTime) / 1000);
  const clientTimeSpent = Math.floor((clientTime - serverStartTime) / 1000);

  // Allow 5% tolerance for network delays, with minimum 30 seconds
  const tolerance = Math.max(30, serverTimeSpent * 0.05);
  const timeDifference = Math.abs(serverTimeSpent - clientTimeSpent);

  const isValid = timeDifference <= tolerance;

  return {
    serverTimeSpent,
    clientTimeSpent,
    timeDifference,
    tolerance,
    isValid,
    validatedTimeSpent: isValid ? clientTimeSpent : serverTimeSpent
  };
};

/**
 * Validate individual question time spent
 * @param {number} questionTimeSpent - Time spent on question (seconds)
 * @param {number} maxTimePerQuestion - Maximum allowed time per question (seconds)
 * @returns {boolean} - Is time valid
 */
export const validateQuestionTime = (questionTimeSpent, maxTimePerQuestion = 3600) => {
  // Question time should be reasonable (not negative, not too long)
  return questionTimeSpent >= 0 && questionTimeSpent <= maxTimePerQuestion;
};

/**
 * Check if test attempt has timed out
 * @param {Object} attempt - TestAttempt document
 * @returns {Object} - Timeout status
 */
export const checkTimeout = (attempt) => {
  if (!attempt.timeLimit || attempt.timeLimit === 0) {
    return { timedOut: false, timeRemaining: null };
  }

  const now = new Date();
  const elapsed = Math.floor((now - attempt.serverStartTime) / 1000);
  const timeLimitSeconds = attempt.timeLimit * 60;
  const timeRemaining = Math.max(0, timeLimitSeconds - elapsed);

  return {
    timedOut: timeRemaining <= 0,
    timeRemaining,
    elapsed,
    timeLimitSeconds
  };
};

/**
 * Generate server timestamp for test start
 * @returns {Date} - Server timestamp
 */
export const generateServerTimestamp = () => {
  return new Date();
};

/**
 * Format time for logging
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
export const formatTimeForLogging = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};
