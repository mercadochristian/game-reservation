/**
 * Centralized human-readable label maps for database enum values.
 * Import from here rather than defining per-file to keep labels consistent.
 */

/** Maps skill_level enum values to display strings. */
export const SKILL_LEVEL_LABELS: Record<string, string> = {
  developmental: 'Developmental',
  developmental_plus: 'Developmental+',
  intermediate: 'Intermediate',
  intermediate_plus: 'Intermediate+',
  advanced: 'Advanced',
}

/** Maps preferred_position enum values to display strings. */
export const POSITION_LABELS: Record<string, string> = {
  open_spiker: 'Open Spiker',
  opposite_spiker: 'Opposite Spiker',
  middle_blocker: 'Middle Blocker',
  setter: 'Setter',
}

/** Maps schedule status enum values to display strings. */
export const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  full: 'Full',
  cancelled: 'Cancelled',
  completed: 'Completed',
}

/** Maps payment_status enum values to display strings. */
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  review: 'Under Review',
  paid: 'Paid',
  rejected: 'Rejected',
}
