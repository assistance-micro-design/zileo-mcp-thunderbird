/**
 * Calendar API - Wrapper for browser.calendar.* (experimental)
 * Provides calendar, events, and tasks operations
 */

export const CalendarAPI = {
  // ==================== CALENDARS ====================

  /**
   * List all calendars
   * @returns {Promise<Array>} Array of calendars
   */
  async listCalendars() {
    console.log('[CalendarAPI] listCalendars called');
    console.log('[CalendarAPI] browser.calendar exists:', !!browser.calendar);
    if (browser.calendar) {
      console.log('[CalendarAPI] browser.calendar.calendars exists:', !!browser.calendar.calendars);
      console.log('[CalendarAPI] browser.calendar.calendars.query exists:', typeof browser.calendar.calendars.query);
    }
    try {
      console.log('[CalendarAPI] Calling query...');
      const result = await browser.calendar.calendars.query({});
      console.log('[CalendarAPI] Result:', result);
      return result;
    } catch (error) {
      console.error('[CalendarAPI] Error name:', error.name);
      console.error('[CalendarAPI] Error message:', error.message);
      console.error('[CalendarAPI] Error stack:', error.stack);
      console.error('[CalendarAPI] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw error;
    }
  },

  /**
   * Get a specific calendar by ID
   * @param {string} calendarId - Calendar ID
   * @returns {Promise<Object>} Calendar object
   */
  async getCalendar(calendarId) {
    return await browser.calendar.calendars.get(calendarId);
  },

  // ==================== EVENTS ====================

  /**
   * Search for events within a date range
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Array of events
   */
  async searchEvents(params) {
    const {
      calendarId,
      dateFrom,
      dateTo,
      query,
      limit = 100
    } = params;

    const queryOptions = {
      type: 'event',
      returnFormat: 'jcal'
    };

    if (calendarId) {
      queryOptions.calendarId = calendarId;
    }
    if (dateFrom) {
      queryOptions.rangeStart = this._toICalDate(dateFrom);
    }
    if (dateTo) {
      queryOptions.rangeEnd = this._toICalDate(dateTo);
    }

    console.log('[CalendarAPI] searchEvents queryOptions:', JSON.stringify(queryOptions));

    const items = await browser.calendar.items.query(queryOptions);

    // Filter by query if provided and limit results
    let results = items;
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = items.filter(item => {
        const title = this._extractTitle(item);
        const description = this._extractDescription(item);
        const location = this._extractLocation(item);
        return (
          title.toLowerCase().includes(lowerQuery) ||
          description.toLowerCase().includes(lowerQuery) ||
          location.toLowerCase().includes(lowerQuery)
        );
      });
    }

    return results.slice(0, limit).map(item => this._formatCalendarItem(item));
  },

  /**
   * List events in a specific calendar within a date range
   * @param {string} calendarId - Calendar ID
   * @param {string} dateFrom - Start date (ISO 8601)
   * @param {string} dateTo - End date (ISO 8601)
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} Array of events
   */
  async listEvents(calendarId, dateFrom, dateTo, limit = 100) {
    const queryOptions = {
      calendarId,
      type: 'event',
      rangeStart: this._toICalDate(dateFrom),
      rangeEnd: this._toICalDate(dateTo),
      returnFormat: 'jcal'
    };
    console.log('[CalendarAPI] listEvents queryOptions:', JSON.stringify(queryOptions));

    const items = await browser.calendar.items.query(queryOptions);

    return items.slice(0, limit).map(item => this._formatCalendarItem(item));
  },

  /**
   * Get a specific event
   * @param {string} calendarId - Calendar ID
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} Event object
   */
  async getEvent(calendarId, eventId) {
    const item = await browser.calendar.items.get(calendarId, eventId, {
      returnFormat: 'jcal'
    });
    return this._formatCalendarItem(item);
  },

  /**
   * Create a new event
   * @param {string} calendarId - Calendar ID
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Created event
   */
  async createEvent(calendarId, eventData) {
    const { title, start, end, description, location, attendees, recurrence } = eventData;

    // Build iCal VEVENT
    const icalEvent = this._buildICalEvent({
      title,
      start,
      end,
      description,
      location,
      attendees,
      recurrence
    });

    const result = await browser.calendar.items.create(calendarId, {
      type: 'event',
      format: 'ical',
      item: icalEvent,
      returnFormat: 'jcal'
    });

    return this._formatCalendarItem(result);
  },

  /**
   * Update an existing event
   * @param {string} calendarId - Calendar ID
   * @param {string} eventId - Event ID
   * @param {Object} updateData - Updated event data
   * @returns {Promise<Object>} Updated event
   */
  async updateEvent(calendarId, eventId, updateData) {
    // Get existing event first
    const existing = await browser.calendar.items.get(calendarId, eventId, {
      returnFormat: 'jcal'
    });

    // Merge with updates and create new iCal
    const merged = { ...this._formatCalendarItem(existing), ...updateData };
    const icalEvent = this._buildICalEvent(merged);

    const result = await browser.calendar.items.update(calendarId, eventId, {
      format: 'ical',
      item: icalEvent,
      returnFormat: 'jcal'
    });

    return this._formatCalendarItem(result);
  },

  /**
   * Move an event to a different time
   * @param {string} calendarId - Calendar ID
   * @param {string} eventId - Event ID
   * @param {string} newStart - New start time (ISO 8601)
   * @param {string} newEnd - New end time (ISO 8601)
   * @returns {Promise<Object>} Updated event
   */
  async moveEvent(calendarId, eventId, newStart, newEnd) {
    return await this.updateEvent(calendarId, eventId, {
      start: newStart,
      end: newEnd
    });
  },

  /**
   * Delete an event
   * @param {string} calendarId - Calendar ID
   * @param {string} eventId - Event ID
   * @returns {Promise<void>}
   */
  async deleteEvent(calendarId, eventId) {
    await browser.calendar.items.remove(calendarId, eventId);
  },

  // ==================== TASKS ====================

  /**
   * List tasks with optional filters
   * @param {Object} params - Filter parameters
   * @returns {Promise<Array>} Array of tasks
   */
  async listTasks(params = {}) {
    const {
      calendarId,
      completed,
      dueBefore,
      dueAfter,
      limit = 100
    } = params;

    const queryOptions = {
      type: 'task',
      returnFormat: 'jcal'
    };

    if (calendarId) {
      queryOptions.calendarId = calendarId;
    }
    if (dueAfter) {
      queryOptions.rangeStart = dueAfter;
    }
    if (dueBefore) {
      queryOptions.rangeEnd = dueBefore;
    }

    let items = await browser.calendar.items.query(queryOptions);

    // Filter by completion status if specified
    if (completed !== undefined) {
      items = items.filter(item => {
        const isCompleted = this._isTaskCompleted(item);
        return completed ? isCompleted : !isCompleted;
      });
    }

    return items.slice(0, limit).map(item => this._formatTask(item));
  },

  /**
   * Get a specific task
   * @param {string} calendarId - Calendar ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task object
   */
  async getTask(calendarId, taskId) {
    const item = await browser.calendar.items.get(calendarId, taskId, {
      returnFormat: 'jcal'
    });
    return this._formatTask(item);
  },

  /**
   * Create a new task
   * @param {string} calendarId - Calendar ID
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Created task
   */
  async createTask(calendarId, taskData) {
    const { title, description, dueDate, priority } = taskData;

    const icalTask = this._buildICalTask({
      title,
      description,
      dueDate,
      priority
    });

    const result = await browser.calendar.items.create(calendarId, {
      type: 'task',
      format: 'ical',
      item: icalTask,
      returnFormat: 'jcal'
    });

    return this._formatTask(result);
  },

  /**
   * Update an existing task
   * @param {string} calendarId - Calendar ID
   * @param {string} taskId - Task ID
   * @param {Object} updateData - Updated task data
   * @returns {Promise<Object>} Updated task
   */
  async updateTask(calendarId, taskId, updateData) {
    const existing = await browser.calendar.items.get(calendarId, taskId, {
      returnFormat: 'jcal'
    });

    const merged = { ...this._formatTask(existing), ...updateData };
    const icalTask = this._buildICalTask(merged);

    const result = await browser.calendar.items.update(calendarId, taskId, {
      format: 'ical',
      item: icalTask,
      returnFormat: 'jcal'
    });

    return this._formatTask(result);
  },

  /**
   * Mark a task as completed
   * @param {string} calendarId - Calendar ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Updated task
   */
  async completeTask(calendarId, taskId) {
    return await this.updateTask(calendarId, taskId, {
      completed: true
    });
  },

  /**
   * Delete a task
   * @param {string} calendarId - Calendar ID
   * @param {string} taskId - Task ID
   * @returns {Promise<void>}
   */
  async deleteTask(calendarId, taskId) {
    await browser.calendar.items.remove(calendarId, taskId);
  },

  // ==================== HELPERS ====================

  /**
   * Format a calendar item (event) for consistent output
   * @private
   */
  _formatCalendarItem(item) {
    if (!item) return null;

    console.log('[CalendarAPI] Raw item:', JSON.stringify(item));

    // jCal format: item.item is the jCal array
    // Structure: ["vcalendar", [props], [["vevent", [props], []]]]
    // Or directly: ["vevent", [props], []]
    const jcal = item.item;
    let props = [];

    if (jcal && Array.isArray(jcal)) {
      if (jcal[0] === 'vcalendar' && Array.isArray(jcal[2])) {
        // Find vevent or vtodo in subcomponents
        const subcomp = jcal[2].find(c => c[0] === 'vevent' || c[0] === 'vtodo');
        if (subcomp) {
          props = subcomp[1] || [];
        }
      } else if (jcal[0] === 'vevent' || jcal[0] === 'vtodo') {
        props = jcal[1] || [];
      }
    }

    console.log('[CalendarAPI] Extracted props:', JSON.stringify(props));

    return {
      id: item.id,
      calendarId: item.calendarId,
      type: item.type,
      title: this._getProp(props, 'summary'),
      start: this._getProp(props, 'dtstart'),
      end: this._getProp(props, 'dtend'),
      description: this._getProp(props, 'description'),
      location: this._getProp(props, 'location'),
      attendees: this._getAttendees(props)
    };
  },

  /**
   * Get a property value from jCal props array
   * jCal prop format: ["propname", {params}, "type", value]
   * @private
   */
  _getProp(props, name) {
    if (!Array.isArray(props)) return null;
    const prop = props.find(p => Array.isArray(p) && p[0] === name);
    return prop ? prop[3] : null;
  },

  /**
   * Get attendees from jCal props
   * @private
   */
  _getAttendees(props) {
    if (!Array.isArray(props)) return [];
    return props
      .filter(p => Array.isArray(p) && p[0] === 'attendee')
      .map(p => {
        const val = p[3] || '';
        return val.replace('mailto:', '');
      });
  },

  /**
   * Format a task for consistent output
   * @private
   */
  _formatTask(item) {
    if (!item) return null;

    return {
      id: item.id,
      calendarId: item.calendarId,
      type: 'task',
      title: this._extractTitle(item),
      description: this._extractDescription(item),
      dueDate: this._extractDueDate(item),
      completed: this._isTaskCompleted(item),
      priority: this._extractPriority(item)
    };
  },

  /**
   * Extract title from jCal item
   * @private
   */
  _extractTitle(item) {
    try {
      if (item.item && Array.isArray(item.item)) {
        const props = item.item[1];
        const summary = props.find(p => p[0] === 'summary');
        return summary ? summary[3] : '';
      }
    } catch (e) {}
    return '';
  },

  /**
   * Extract description from jCal item
   * @private
   */
  _extractDescription(item) {
    try {
      if (item.item && Array.isArray(item.item)) {
        const props = item.item[1];
        const desc = props.find(p => p[0] === 'description');
        return desc ? desc[3] : '';
      }
    } catch (e) {}
    return '';
  },

  /**
   * Extract location from jCal item
   * @private
   */
  _extractLocation(item) {
    try {
      if (item.item && Array.isArray(item.item)) {
        const props = item.item[1];
        const loc = props.find(p => p[0] === 'location');
        return loc ? loc[3] : '';
      }
    } catch (e) {}
    return '';
  },

  /**
   * Extract start date from jCal item
   * @private
   */
  _extractStart(item) {
    try {
      if (item.item && Array.isArray(item.item)) {
        const props = item.item[1];
        const dtstart = props.find(p => p[0] === 'dtstart');
        return dtstart ? dtstart[3] : null;
      }
    } catch (e) {}
    return null;
  },

  /**
   * Extract end date from jCal item
   * @private
   */
  _extractEnd(item) {
    try {
      if (item.item && Array.isArray(item.item)) {
        const props = item.item[1];
        const dtend = props.find(p => p[0] === 'dtend');
        return dtend ? dtend[3] : null;
      }
    } catch (e) {}
    return null;
  },

  /**
   * Extract due date from jCal task
   * @private
   */
  _extractDueDate(item) {
    try {
      if (item.item && Array.isArray(item.item)) {
        const props = item.item[1];
        const due = props.find(p => p[0] === 'due');
        return due ? due[3] : null;
      }
    } catch (e) {}
    return null;
  },

  /**
   * Extract attendees from jCal item
   * @private
   */
  _extractAttendees(item) {
    try {
      if (item.item && Array.isArray(item.item)) {
        const props = item.item[1];
        return props
          .filter(p => p[0] === 'attendee')
          .map(a => a[3].replace('mailto:', ''));
      }
    } catch (e) {}
    return [];
  },

  /**
   * Extract priority from jCal task
   * @private
   */
  _extractPriority(item) {
    try {
      if (item.item && Array.isArray(item.item)) {
        const props = item.item[1];
        const priority = props.find(p => p[0] === 'priority');
        return priority ? parseInt(priority[3]) : 0;
      }
    } catch (e) {}
    return 0;
  },

  /**
   * Check if task is completed
   * @private
   */
  _isTaskCompleted(item) {
    try {
      if (item.item && Array.isArray(item.item)) {
        const props = item.item[1];
        const status = props.find(p => p[0] === 'status');
        return status ? status[3] === 'COMPLETED' : false;
      }
    } catch (e) {}
    return false;
  },

  /**
   * Build iCal VEVENT string
   * @private
   */
  _buildICalEvent({ title, start, end, description, location, attendees, recurrence }) {
    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@thunderbird-mcp`;
    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dtstart = this._formatICalDate(start);
    const dtend = this._formatICalDate(end);

    let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Thunderbird MCP//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${this._escapeICalText(title || '')}`;

    if (description) {
      ical += `\nDESCRIPTION:${this._escapeICalText(description)}`;
    }
    if (location) {
      ical += `\nLOCATION:${this._escapeICalText(location)}`;
    }
    if (attendees && attendees.length > 0) {
      for (const attendee of attendees) {
        ical += `\nATTENDEE:mailto:${attendee}`;
      }
    }
    if (recurrence) {
      ical += `\n${this._buildRRule(recurrence)}`;
    }

    ical += `\nEND:VEVENT
END:VCALENDAR`;

    return ical;
  },

  /**
   * Build iCal VTODO string
   * @private
   */
  _buildICalTask({ title, description, dueDate, priority, completed }) {
    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@thunderbird-mcp`;
    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Thunderbird MCP//EN
BEGIN:VTODO
UID:${uid}
DTSTAMP:${dtstamp}
SUMMARY:${this._escapeICalText(title || '')}`;

    if (description) {
      ical += `\nDESCRIPTION:${this._escapeICalText(description)}`;
    }
    if (dueDate) {
      ical += `\nDUE:${this._formatICalDate(dueDate)}`;
    }
    if (priority !== undefined && priority > 0) {
      ical += `\nPRIORITY:${priority}`;
    }
    if (completed) {
      ical += `\nSTATUS:COMPLETED`;
      ical += `\nCOMPLETED:${dtstamp}`;
    }

    ical += `\nEND:VTODO
END:VCALENDAR`;

    return ical;
  },

  /**
   * Convert ISO date string to iCal format for API queries
   * @private
   */
  _toICalDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  },

  /**
   * Format date for iCal (alias for compatibility)
   * @private
   */
  _formatICalDate(dateStr) {
    return this._toICalDate(dateStr);
  },

  /**
   * Escape text for iCal
   * @private
   */
  _escapeICalText(text) {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  },

  /**
   * Build RRULE from recurrence object
   * @private
   */
  _buildRRule(recurrence) {
    if (!recurrence || !recurrence.frequency) return '';

    const freq = recurrence.frequency.toUpperCase();
    let rrule = `RRULE:FREQ=${freq}`;

    if (recurrence.interval && recurrence.interval > 1) {
      rrule += `;INTERVAL=${recurrence.interval}`;
    }
    if (recurrence.count) {
      rrule += `;COUNT=${recurrence.count}`;
    }
    if (recurrence.until) {
      rrule += `;UNTIL=${this._formatICalDate(recurrence.until)}`;
    }

    return rrule;
  }
};
