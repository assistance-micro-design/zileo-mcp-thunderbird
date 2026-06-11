/*
 * Copyright 2025-2026 Assistance Micro Design
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
