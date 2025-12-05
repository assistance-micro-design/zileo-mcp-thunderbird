/**
 * Calendar Types (Experimental)
 * Types for Thunderbird Calendar/Lightning extension APIs
 * @module types/calendar
 */

// =============================================================================
// Calendar Types
// =============================================================================

/** Calendar types */
export type CalendarType = 'local' | 'caldav' | 'ics' | 'storage';

/** Calendar representation */
export interface Calendar {
  /** Unique calendar identifier */
  id: string;
  /** Display name */
  name: string;
  /** Calendar type */
  type: CalendarType;
  /** Calendar URL (for remote calendars) */
  url?: string;
  /** Whether calendar is read-only */
  readOnly: boolean;
  /** Whether calendar is enabled */
  enabled: boolean;
  /** Calendar color in hex format */
  color: string;
  /** Whether to show in "Today" pane */
  showInTodayPane?: boolean;
  /** Timezone ID */
  timezone?: string;
}

// =============================================================================
// Event Types
// =============================================================================

/** Event status */
export type EventStatus = 'tentative' | 'confirmed' | 'cancelled';

/** Event transparency (busy/free) */
export type EventTransparency = 'opaque' | 'transparent';

/** Calendar event */
export interface CalendarEvent {
  /** Unique event identifier */
  id: string;
  /** Calendar this event belongs to */
  calendarId: string;
  /** Event title/summary */
  title: string;
  /** Event description */
  description?: string;
  /** Location */
  location?: string;
  /** Start date/time (ISO 8601) */
  start: string;
  /** End date/time (ISO 8601) */
  end: string;
  /** Whether this is an all-day event */
  isAllDay: boolean;
  /** Event status */
  status: EventStatus;
  /** Busy/free indicator */
  transparency?: EventTransparency;
  /** Event categories/tags */
  categories?: string[];
  /** Recurrence rule (RRULE format) */
  recurrenceRule?: string;
  /** Recurrence info */
  recurrence?: RecurrenceInfo;
  /** List of attendees */
  attendees?: Attendee[];
  /** Organizer */
  organizer?: Attendee;
  /** Alarms/reminders */
  alarms?: Alarm[];
  /** UID from iCalendar */
  uid?: string;
  /** Created timestamp */
  created?: string;
  /** Last modified timestamp */
  lastModified?: string;
  /** Sequence number for updates */
  sequence?: number;
  /** Priority (1-9, 1 = highest) */
  priority?: number;
  /** URL associated with event */
  url?: string;
}

/** Recurrence information */
export interface RecurrenceInfo {
  /** Recurrence frequency */
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** Interval between occurrences */
  interval?: number;
  /** End date (ISO 8601) */
  until?: string;
  /** Number of occurrences */
  count?: number;
  /** Days of the week (for weekly) */
  byDay?: string[];
  /** Days of the month (for monthly) */
  byMonthDay?: number[];
  /** Months of the year (for yearly) */
  byMonth?: number[];
  /** Week position (for monthly by weekday) */
  bySetPos?: number[];
  /** Week start day */
  weekStart?: 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';
  /** Exception dates (dates to skip) */
  exceptionDates?: string[];
}

/** Event attendee */
export interface Attendee {
  /** Attendee name */
  name?: string;
  /** Attendee email */
  email: string;
  /** Attendee role */
  role?: 'chair' | 'required' | 'optional' | 'non-participant';
  /** Participation status */
  status?: 'needs-action' | 'accepted' | 'declined' | 'tentative' | 'delegated';
  /** Whether this is the organizer */
  isOrganizer?: boolean;
  /** RSVP requested */
  rsvp?: boolean;
}

/** Event alarm/reminder */
export interface Alarm {
  /** Alarm action */
  action: 'display' | 'email' | 'audio';
  /** Trigger (relative to event start, in minutes, negative = before) */
  trigger: number;
  /** Description for display/email alarms */
  description?: string;
  /** Summary for email alarms */
  summary?: string;
  /** Audio file URL for audio alarms */
  audioFile?: string;
  /** Repeat count */
  repeat?: number;
  /** Duration between repeats (ISO 8601 duration) */
  duration?: string;
}

// =============================================================================
// Task Types
// =============================================================================

/** Task status */
export type TaskStatus = 'needs-action' | 'in-process' | 'completed' | 'cancelled';

/** Task priority levels */
export type TaskPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Calendar task (VTODO) */
export interface CalendarTask {
  /** Unique task identifier */
  id: string;
  /** Calendar this task belongs to */
  calendarId: string;
  /** Task title/summary */
  title: string;
  /** Task description */
  description?: string;
  /** Location */
  location?: string;
  /** Due date/time (ISO 8601) */
  dueDate?: string;
  /** Start date/time (ISO 8601) */
  startDate?: string;
  /** Completion date/time (ISO 8601) */
  completedDate?: string;
  /** Task status */
  status: TaskStatus;
  /** Priority (1 = highest, 9 = lowest) */
  priority?: TaskPriority;
  /** Percent complete (0-100) */
  percentComplete?: number;
  /** Task categories/tags */
  categories?: string[];
  /** Recurrence info */
  recurrence?: RecurrenceInfo;
  /** Alarms/reminders */
  alarms?: Alarm[];
  /** UID from iCalendar */
  uid?: string;
  /** Created timestamp */
  created?: string;
  /** Last modified timestamp */
  lastModified?: string;
  /** Sequence number for updates */
  sequence?: number;
  /** URL associated with task */
  url?: string;
}

// =============================================================================
// Query Types
// =============================================================================

/** Event search/query parameters */
export interface EventQuery {
  /** Search in title/summary */
  query?: string;
  /** Limit to specific calendar */
  calendarId?: string;
  /** Start of date range (ISO 8601) */
  dateFrom: string;
  /** End of date range (ISO 8601) */
  dateTo: string;
  /** Maximum results */
  limit?: number;
  /** Filter by categories */
  categories?: string[];
  /** Filter by status */
  status?: EventStatus;
  /** Include recurring event instances */
  expandRecurring?: boolean;
}

/** Task search/query parameters */
export interface TaskQuery {
  /** Limit to specific calendar */
  calendarId?: string;
  /** Filter by completion status */
  completed?: boolean;
  /** Tasks due before this date (ISO 8601) */
  dueBefore?: string;
  /** Tasks due after this date (ISO 8601) */
  dueAfter?: string;
  /** Maximum results */
  limit?: number;
  /** Filter by priority */
  priority?: TaskPriority;
  /** Filter by categories */
  categories?: string[];
  /** Filter by status */
  status?: TaskStatus;
}

// =============================================================================
// Event/Task Modification Types
// =============================================================================

/** Scope for modifying recurring events */
export type RecurrenceScope = 'this' | 'all' | 'future';

/** Event modifications */
export interface EventModifications {
  /** New title */
  title?: string;
  /** New description */
  description?: string;
  /** New location */
  location?: string;
  /** New start date/time */
  start?: string;
  /** New end date/time */
  end?: string;
  /** Change to all-day status */
  isAllDay?: boolean;
  /** New status */
  status?: EventStatus;
  /** New transparency */
  transparency?: EventTransparency;
  /** New categories */
  categories?: string[];
  /** New/updated recurrence */
  recurrence?: RecurrenceInfo;
  /** Updated attendees */
  attendees?: Attendee[];
  /** Updated alarms */
  alarms?: Alarm[];
  /** Updated priority */
  priority?: number;
  /** Updated URL */
  url?: string;
}

/** Task modifications */
export interface TaskModifications {
  /** New title */
  title?: string;
  /** New description */
  description?: string;
  /** New location */
  location?: string;
  /** New due date */
  dueDate?: string;
  /** New start date */
  startDate?: string;
  /** New status */
  status?: TaskStatus;
  /** New priority */
  priority?: TaskPriority;
  /** New percent complete */
  percentComplete?: number;
  /** New categories */
  categories?: string[];
  /** Updated alarms */
  alarms?: Alarm[];
  /** Updated recurrence */
  recurrence?: RecurrenceInfo;
  /** Updated URL */
  url?: string;
}

// =============================================================================
// Export All Types
// =============================================================================

export type {
  CalendarType,
  Calendar,
  EventStatus,
  EventTransparency,
  CalendarEvent,
  RecurrenceInfo,
  Attendee,
  Alarm,
  TaskStatus,
  TaskPriority,
  CalendarTask,
  EventQuery,
  TaskQuery,
  RecurrenceScope,
  EventModifications,
  TaskModifications,
};
