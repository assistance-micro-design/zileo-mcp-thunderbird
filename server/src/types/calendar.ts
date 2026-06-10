/**
 * Calendar Types (Experimental)
 * Types for the Thunderbird calendar experiment APIs.
 *
 * Audit 2026-06-10: the aspirational iCalendar model (CalendarEvent,
 * CalendarTask, RecurrenceInfo, Attendee, Alarm, query/modification params)
 * was removed — it never matched what the extension actually returns. The
 * real event/task payload shapes live in types/action-results.ts
 * (CalendarItemResult, TaskItemResult), verified against
 * extension/api/calendar.js formatters.
 * @module types/calendar
 */

/** Calendar types */
export type CalendarType = "local" | "caldav" | "ics" | "storage";

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
