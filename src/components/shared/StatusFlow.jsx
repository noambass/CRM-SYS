// Job Status Flow Management
// 4 סטטוסים רשמיים בלבד (לפי אפיון)
export const JOB_STATUSES = {
  QUOTE: 'quote',
  WAITING_SCHEDULE: 'waiting_schedule',
  WAITING_EXECUTION: 'waiting_execution',
  DONE: 'done'
};

export const STATUS_CONFIG = {
  [JOB_STATUSES.QUOTE]: {
    value: 'quote',
    label: 'הצעת מחיר',
    color: '#6366f1'
  },
  [JOB_STATUSES.WAITING_SCHEDULE]: {
    value: 'waiting_schedule',
    label: 'מחכה לתזמון',
    color: '#f59e0b'
  },
  [JOB_STATUSES.WAITING_EXECUTION]: {
    value: 'waiting_execution',
    label: 'מחכה לביצוע',
    color: '#3b82f6'
  },
  [JOB_STATUSES.DONE]: {
    value: 'done',
    label: 'בוצע',
    color: '#10b981'
  }
};

export const ALLOWED_TRANSITIONS = {
  [JOB_STATUSES.QUOTE]: [JOB_STATUSES.WAITING_SCHEDULE],
  [JOB_STATUSES.WAITING_SCHEDULE]: [JOB_STATUSES.WAITING_EXECUTION],
  [JOB_STATUSES.WAITING_EXECUTION]: [JOB_STATUSES.DONE],
  [JOB_STATUSES.DONE]: []
};

export const canTransitionStatus = (currentStatus, newStatus) => {
  return ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
};

export const getNextAllowedStatuses = (currentStatus) => {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
};
