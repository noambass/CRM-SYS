export const JOB_STATUS_OPTIONS = [
  { value: 'all', label: 'כל הסטטוסים' },
  { value: 'quote', label: 'הצעת מחיר' },
  { value: 'waiting_schedule', label: 'ממתין לתזמון' },
  { value: 'waiting_execution', label: 'ממתין לביצוע' },
  { value: 'done', label: 'הושלם' }
];

export const JOB_STATUS_COLORS = {
  quote: '#6366f1',
  waiting_schedule: '#f59e0b',
  waiting_execution: '#3b82f6',
  done: '#10b981',
  // Legacy fallbacks
  new: '#3b82f6',
  scheduled: '#8b5cf6',
  in_progress: '#8b5cf6',
  on_the_way: '#06b6d4',
  completed: '#10b981',
  cancelled: '#64748b',
  pending_payment: '#f97316'
};
