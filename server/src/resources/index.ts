/**
 * Resource Registry
 * Central export for MCP resource handlers
 * @module resources
 */

import type { McpResource, McpResourceTemplate } from '../types/mcp.js';
import { getResourceHandler } from './handlers.js';

/**
 * Static resource definitions
 */
export const resources: McpResource[] = [
  {
    uri: 'thunderbird://accounts',
    name: 'Thunderbird Accounts',
    description: 'List of all configured email accounts',
    mimeType: 'application/json',
  },
  {
    uri: 'thunderbird://inbox/unread',
    name: 'Unread Messages (All Accounts)',
    description: 'All unread messages across all accounts',
    mimeType: 'application/json',
  },
  {
    uri: 'thunderbird://contacts/recent',
    name: 'Recent Contacts',
    description: 'Recently used or modified contacts',
    mimeType: 'application/json',
  },
  {
    uri: 'thunderbird://calendar/today',
    name: 'Today\'s Events',
    description: 'Calendar events for today',
    mimeType: 'application/json',
  },
  {
    uri: 'thunderbird://calendar/upcoming',
    name: 'Upcoming Events',
    description: 'Calendar events for the next 7 days',
    mimeType: 'application/json',
  },
  {
    uri: 'thunderbird://tasks/pending',
    name: 'Pending Tasks',
    description: 'Incomplete tasks from all calendars',
    mimeType: 'application/json',
  },
];

/**
 * Resource templates (with parameters)
 */
export const resourceTemplates: McpResourceTemplate[] = [
  {
    uriTemplate: 'thunderbird://folders/{accountId}',
    name: 'Account Folder Tree',
    description: 'Hierarchical folder structure for a specific account',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'thunderbird://inbox/unread/{accountId}',
    name: 'Unread Messages (Specific Account)',
    description: 'Unread messages for a specific account',
    mimeType: 'application/json',
  },
];

/**
 * Check if a URI is a valid resource
 */
export function isValidResourceUri(uri: string): boolean {
  return getResourceHandler(uri) !== undefined;
}

/**
 * Export handler functions
 */
export { getResourceHandler } from './handlers.js';
