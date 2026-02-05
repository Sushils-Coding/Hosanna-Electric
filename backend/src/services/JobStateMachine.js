/**
 * Job State Machine
 * Handles validation of job status transitions based on user roles
 */

const { JOB_STATUS, STATUS_TRANSITIONS, ROLES } = require('../config/constants');

class JobStateMachine {
  /**
   * Check if a status transition is valid
   * @param {string} currentStatus - Current job status
   * @param {string} newStatus - Requested new status
   * @returns {boolean}
   */
  static isValidTransition(currentStatus, newStatus) {
    // Same status is not a transition
    if (currentStatus === newStatus) {
      return false;
    }

    const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions) {
      return false;
    }

    return newStatus in allowedTransitions;
  }

  /**
   * Check if a user role can perform a specific transition
   * @param {string} currentStatus - Current job status
   * @param {string} newStatus - Requested new status
   * @param {string} userRole - Role of the user attempting the transition
   * @returns {boolean}
   */
  static canRolePerformTransition(currentStatus, newStatus, userRole) {
    if (!this.isValidTransition(currentStatus, newStatus)) {
      return false;
    }

    const allowedRoles = STATUS_TRANSITIONS[currentStatus][newStatus];
    return allowedRoles.includes(userRole);
  }

  /**
   * Get all valid next statuses for a given current status
   * @param {string} currentStatus - Current job status
   * @returns {string[]} Array of valid next statuses
   */
  static getValidNextStatuses(currentStatus) {
    const transitions = STATUS_TRANSITIONS[currentStatus];
    return transitions ? Object.keys(transitions) : [];
  }

  /**
   * Get valid next statuses that a specific role can transition to
   * @param {string} currentStatus - Current job status
   * @param {string} userRole - User's role
   * @returns {string[]} Array of valid next statuses for this role
   */
  static getValidNextStatusesForRole(currentStatus, userRole) {
    const transitions = STATUS_TRANSITIONS[currentStatus];
    if (!transitions) return [];

    return Object.entries(transitions)
      .filter(([_, roles]) => roles.includes(userRole))
      .map(([status]) => status);
  }

  /**
   * Validate a transition and return detailed result
   * @param {string} currentStatus - Current job status
   * @param {string} newStatus - Requested new status
   * @param {string} userRole - Role of the user attempting the transition
   * @returns {{ valid: boolean, error?: string }}
   */
  static validateTransition(currentStatus, newStatus, userRole) {
    // Check if it's the same status
    if (currentStatus === newStatus) {
      return {
        valid: false,
        error: 'Job is already in this status',
      };
    }

    // Check if the transition is valid at all
    if (!this.isValidTransition(currentStatus, newStatus)) {
      const validNextStatuses = this.getValidNextStatuses(currentStatus);
      return {
        valid: false,
        error: `Invalid status transition from ${currentStatus} to ${newStatus}. Valid transitions: ${validNextStatuses.length > 0 ? validNextStatuses.join(', ') : 'none (terminal state)'}`,
      };
    }

    // Check if the user's role can perform this transition
    if (!this.canRolePerformTransition(currentStatus, newStatus, userRole)) {
      const allowedRoles = STATUS_TRANSITIONS[currentStatus][newStatus];
      return {
        valid: false,
        error: `Role ${userRole} cannot transition job from ${currentStatus} to ${newStatus}. Allowed roles: ${allowedRoles.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get the required role(s) for a specific transition
   * @param {string} currentStatus - Current job status
   * @param {string} newStatus - Target status
   * @returns {string[]|null} Array of allowed roles or null if invalid transition
   */
  static getRequiredRoles(currentStatus, newStatus) {
    const transitions = STATUS_TRANSITIONS[currentStatus];
    if (!transitions || !(newStatus in transitions)) {
      return null;
    }
    return transitions[newStatus];
  }

  /**
   * Get a human-readable description of the state machine
   * @returns {object} Description of all states and transitions
   */
  static describeStateMachine() {
    const description = {};

    Object.values(JOB_STATUS).forEach((status) => {
      const transitions = STATUS_TRANSITIONS[status] || {};
      description[status] = {
        transitions: Object.entries(transitions).map(([toStatus, roles]) => ({
          to: toStatus,
          allowedRoles: roles,
        })),
        isTerminal: Object.keys(transitions).length === 0,
      };
    });

    return description;
  }
}

module.exports = JobStateMachine;
