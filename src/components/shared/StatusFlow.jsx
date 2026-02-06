// Job Status Flow Management
export const JOB_STATUSES = {
  QUOTE: 'quote',
  WAITING_SCHEDULE: 'waiting_schedule',
  WAITING_EXECUTION: 'waiting_execution',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const STATUS_CONFIG = {
  [JOB_STATUSES.QUOTE]: {
    value: 'quote',
    label: 'הצעת מחיר',
    color: '#6366f1'
  },
  [JOB_STATUSES.WAITING_SCHEDULE]: {
    value: 'waiting_schedule',
    label: 'ממתין לתזמון',
    color: '#f59e0b'
  },
  [JOB_STATUSES.WAITING_EXECUTION]: {
    value: 'waiting_execution',
    label: 'ממתין לביצוע',
    color: '#3b82f6'
  },
  [JOB_STATUSES.IN_PROGRESS]: {
    value: 'in_progress',
    label: 'בביצוע',
    color: '#8b5cf6'
  },
  [JOB_STATUSES.COMPLETED]: {
    value: 'completed',
    label: 'הושלם',
    color: '#10b981'
  },
  [JOB_STATUSES.CANCELLED]: {
    value: 'cancelled',
    label: 'בוטל',
    color: '#64748b'
  }
};

export const ALLOWED_TRANSITIONS = {
  [JOB_STATUSES.QUOTE]: [JOB_STATUSES.WAITING_SCHEDULE, JOB_STATUSES.CANCELLED],
  [JOB_STATUSES.WAITING_SCHEDULE]: [JOB_STATUSES.WAITING_EXECUTION, JOB_STATUSES.CANCELLED],
  [JOB_STATUSES.WAITING_EXECUTION]: [JOB_STATUSES.IN_PROGRESS, JOB_STATUSES.CANCELLED],
  [JOB_STATUSES.IN_PROGRESS]: [JOB_STATUSES.COMPLETED, JOB_STATUSES.CANCELLED],
  [JOB_STATUSES.COMPLETED]: [],
  [JOB_STATUSES.CANCELLED]: []
};

export const canTransitionStatus = (currentStatus, newStatus) => {
  return ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
};

export const getNextAllowedStatuses = (currentStatus) => {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
};