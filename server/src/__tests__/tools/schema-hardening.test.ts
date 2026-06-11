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
 * Tests for Fix 8: Schema Hardening (SEC-INPUT-001, SEC-INPUT-002)
 * Validates that Zod schemas enforce .max() on strings and .datetime() on date fields.
 *
 * Strategy: handlers catch all errors and return { isError: true, content: [...] }.
 * When Zod validation rejects input, the error text contains Zod-specific keywords
 * like "too_big" or "invalid_string". When it passes validation but the bridge
 * is not initialized, the error text contains "WebSocket bridge not initialized".
 * We test that overlength/invalid inputs produce Zod validation errors specifically.
 */

import { describe, it, expect } from "vitest";
import type { ToolCallResult } from "../../types/mcp.js";

/**
 * Generate a string of a given length
 */
function strOfLen(len: number): string {
  return "a".repeat(len);
}

/**
 * Extract the error text from a handler result
 */
function getErrorText(result: ToolCallResult): string {
  const firstContent = result.content[0];
  if ("text" in firstContent) {
    return firstContent.text;
  }
  return "";
}

/**
 * Assert that the result is a Zod validation error (not a runtime/bridge error)
 */
function expectZodValidationError(result: ToolCallResult): void {
  expect(result.isError).toBe(true);
  const text = getErrorText(result);
  // Zod errors produce messages with issue codes like "too_big", "invalid_string"
  // or human-readable messages like "String must contain at most" or "Invalid datetime"
  const isZodError =
    text.includes("too_big") ||
    text.includes("too_small") ||
    text.includes("invalid_string") ||
    text.includes("invalid_type") ||
    text.includes("String must contain at most") ||
    text.includes("Invalid datetime") ||
    text.includes("Invalid") ||
    text.includes("Array must contain at most");
  expect(isZodError).toBe(true);
}

// =============================================================================
// messages.ts schema tests
// =============================================================================

describe("messages.ts schema hardening", () => {
  describe("messageSearchSchema max constraints", () => {
    it("should reject subject exceeding 1000 chars with Zod validation error", async () => {
      const { handleMessagesSearch } = await import("../../tools/messages.js");
      const result = await handleMessagesSearch({
        subject: strOfLen(1001),
      });
      expectZodValidationError(result);
    });

    it("should reject from exceeding 500 chars with Zod validation error", async () => {
      const { handleMessagesSearch } = await import("../../tools/messages.js");
      const result = await handleMessagesSearch({
        from: strOfLen(501),
      });
      expectZodValidationError(result);
    });

    it("should reject to exceeding 500 chars with Zod validation error", async () => {
      const { handleMessagesSearch } = await import("../../tools/messages.js");
      const result = await handleMessagesSearch({
        to: strOfLen(501),
      });
      expectZodValidationError(result);
    });

    it("should reject body exceeding 10000 chars with Zod validation error", async () => {
      const { handleMessagesSearch } = await import("../../tools/messages.js");
      const result = await handleMessagesSearch({
        body: strOfLen(10001),
      });
      expectZodValidationError(result);
    });

    it("should reject folderId exceeding 500 chars with Zod validation error", async () => {
      const { handleMessagesSearch } = await import("../../tools/messages.js");
      const result = await handleMessagesSearch({
        folderId: strOfLen(501),
      });
      expectZodValidationError(result);
    });

    it("should reject accountId exceeding 200 chars with Zod validation error", async () => {
      const { handleMessagesSearch } = await import("../../tools/messages.js");
      const result = await handleMessagesSearch({
        accountId: strOfLen(201),
      });
      expectZodValidationError(result);
    });
  });

  describe("messageSearchSchema datetime constraints", () => {
    it("should reject invalid dateFrom format with Zod validation error", async () => {
      const { handleMessagesSearch } = await import("../../tools/messages.js");
      const result = await handleMessagesSearch({
        dateFrom: "not-a-date",
      });
      expectZodValidationError(result);
    });

    it("should reject invalid dateTo format with Zod validation error", async () => {
      const { handleMessagesSearch } = await import("../../tools/messages.js");
      const result = await handleMessagesSearch({
        dateTo: "2024/01/01",
      });
      expectZodValidationError(result);
    });

    it("should accept valid ISO 8601 datetime with Z suffix", async () => {
      const { handleMessagesSearch } = await import("../../tools/messages.js");
      const result = await handleMessagesSearch({
        dateFrom: "2024-01-01T00:00:00Z",
      });
      // If error, it should NOT be a Zod validation error about datetime
      if (result.isError) {
        const text = getErrorText(result);
        expect(text).not.toContain("ISO 8601 with timezone offset");
        expect(text).not.toContain("invalid_string");
      }
    });

    it("should accept valid ISO 8601 datetime with offset", async () => {
      const { handleMessagesSearch } = await import("../../tools/messages.js");
      const result = await handleMessagesSearch({
        dateFrom: "2024-01-01T00:00:00+02:00",
      });
      if (result.isError) {
        const text = getErrorText(result);
        expect(text).not.toContain("ISO 8601 with timezone offset");
        expect(text).not.toContain("invalid_string");
      }
    });
  });

  describe("messagesListSchema max constraints", () => {
    it("should reject folderId exceeding 500 chars with Zod validation error", async () => {
      const { handleMessagesList } = await import("../../tools/messages.js");
      const result = await handleMessagesList({
        folderId: strOfLen(501),
      });
      expectZodValidationError(result);
    });
  });

  describe("messagesListUnreadSchema max constraints", () => {
    it("should reject accountId exceeding 200 chars with Zod validation error", async () => {
      const { handleMessagesListUnread } =
        await import("../../tools/messages.js");
      const result = await handleMessagesListUnread({
        accountId: strOfLen(201),
      });
      expectZodValidationError(result);
    });
  });

  describe("messagesMoveSchema max constraints", () => {
    it("should reject destinationFolderId exceeding 500 chars", async () => {
      const { handleMessagesMove } = await import("../../tools/messages.js");
      const result = await handleMessagesMove({
        messageIds: [1],
        destinationFolderId: strOfLen(501),
      });
      expectZodValidationError(result);
    });
  });

  describe("messagesListRecentSchema max constraints", () => {
    it("should reject accountId exceeding 200 chars", async () => {
      const { handleMessagesListRecent } =
        await import("../../tools/messages.js");
      const result = await handleMessagesListRecent({
        accountId: strOfLen(201),
      });
      expectZodValidationError(result);
    });
  });

  describe("messageIds array bound (audit hardening, max 1000)", () => {
    const tooManyIds = Array.from({ length: 1001 }, (_, i) => i + 1);

    it("messagesMoveSchema: rejects more than 1000 messageIds", async () => {
      const { handleMessagesMove } = await import("../../tools/messages.js");
      const result = await handleMessagesMove({
        messageIds: tooManyIds,
        destinationFolderId: "imap://user@host/Archive",
      });
      expectZodValidationError(result);
    });

    it("messagesCopySchema: rejects more than 1000 messageIds", async () => {
      const { handleMessagesCopy } = await import("../../tools/messages.js");
      const result = await handleMessagesCopy({
        messageIds: tooManyIds,
        destinationFolderId: "imap://user@host/Backup",
      });
      expectZodValidationError(result);
    });

    it("messagesDeleteSchema: rejects more than 1000 messageIds", async () => {
      const { handleMessagesDelete } = await import("../../tools/messages.js");
      const result = await handleMessagesDelete({
        messageIds: tooManyIds,
      });
      expectZodValidationError(result);
    });

    it("messagesArchiveSchema: rejects more than 1000 messageIds", async () => {
      const { handleMessagesArchive } = await import("../../tools/messages.js");
      const result = await handleMessagesArchive({
        messageIds: tooManyIds,
      });
      expectZodValidationError(result);
    });
  });

  describe("sortBy / sortOrder enum constraints (cross-schema)", () => {
    const sortByCases = [
      {
        name: "messageSearchSchema",
        handlerPath: "handleMessagesSearch" as const,
      },
      {
        name: "messagesListSchema",
        handlerPath: "handleMessagesList" as const,
        extraArgs: { folderId: "imap://user@host/INBOX" },
      },
      {
        name: "messagesListUnreadSchema",
        handlerPath: "handleMessagesListUnread" as const,
      },
      {
        name: "messagesListRecentSchema",
        handlerPath: "handleMessagesListRecent" as const,
      },
    ] as const;

    for (const tc of sortByCases) {
      it(`${tc.name}: rejects sortBy "random"`, async () => {
        const handlers = await import("../../tools/messages.js");
        const handler = handlers[tc.handlerPath];
        const result = await handler({
          ...("extraArgs" in tc ? tc.extraArgs : {}),
          sortBy: "random",
        });
        expectZodValidationError(result);
      });

      it(`${tc.name}: rejects sortOrder "ascending" (long form)`, async () => {
        const handlers = await import("../../tools/messages.js");
        const handler = handlers[tc.handlerPath];
        const result = await handler({
          ...("extraArgs" in tc ? tc.extraArgs : {}),
          sortOrder: "ascending",
        });
        expectZodValidationError(result);
      });

      it(`${tc.name}: accepts sortBy "author" and sortOrder "asc"`, async () => {
        const handlers = await import("../../tools/messages.js");
        const handler = handlers[tc.handlerPath];
        const result = await handler({
          ...("extraArgs" in tc ? tc.extraArgs : {}),
          sortBy: "author",
          sortOrder: "asc",
        });
        // Should pass Zod validation; runtime may fail because bridge is
        // not initialized — that's a different error class.
        if (result.isError) {
          const text = getErrorText(result);
          expect(text).not.toContain("invalid_enum_value");
          expect(text).not.toContain("Invalid enum value");
        }
      });
    }
  });
});

// =============================================================================
// contacts.ts schema tests
// =============================================================================

describe("contacts.ts schema hardening", () => {
  describe("contactsSearchSchema constraints", () => {
    it("should reject query exceeding 500 chars", async () => {
      const { handleContactsSearch } = await import("../../tools/contacts.js");
      const result = await handleContactsSearch({
        query: strOfLen(501),
      });
      expectZodValidationError(result);
    });

    it("should reject addressBookId exceeding 200 chars", async () => {
      const { handleContactsSearch } = await import("../../tools/contacts.js");
      const result = await handleContactsSearch({
        query: "test",
        addressBookId: strOfLen(201),
      });
      expectZodValidationError(result);
    });
  });

  describe("contactsGetSchema constraints", () => {
    it("should reject contactId exceeding 200 chars", async () => {
      const { handleContactsGet } = await import("../../tools/contacts.js");
      const result = await handleContactsGet({
        contactId: strOfLen(201),
      });
      expectZodValidationError(result);
    });
  });

  describe("contactsCreateSchema constraints", () => {
    it("should reject vCard exceeding 50000 chars", async () => {
      const { handleContactsCreate } = await import("../../tools/contacts.js");
      const result = await handleContactsCreate({
        addressBookId: "book1",
        vCard: strOfLen(50001),
      });
      expectZodValidationError(result);
    });

    it("should reject property values exceeding 5000 chars", async () => {
      const { handleContactsCreate } = await import("../../tools/contacts.js");
      const result = await handleContactsCreate({
        addressBookId: "book1",
        properties: { DisplayName: strOfLen(5001) },
      });
      expectZodValidationError(result);
    });

    it("should reject addressBookId exceeding 200 chars", async () => {
      const { handleContactsCreate } = await import("../../tools/contacts.js");
      const result = await handleContactsCreate({
        addressBookId: strOfLen(201),
        properties: { DisplayName: "Test" },
      });
      expectZodValidationError(result);
    });

    it("should accept a valid string-to-string properties record", async () => {
      const { handleContactsCreate } = await import("../../tools/contacts.js");
      const result = await handleContactsCreate({
        addressBookId: "book1",
        properties: { DisplayName: "Test", Email: "a@b.c" },
      });
      // Should pass Zod validation; runtime may fail because bridge is
      // not initialized — that's a different error class.
      if (result.isError) {
        const text = getErrorText(result);
        expect(text).not.toContain("Validation error");
        expect(text).not.toContain("Invalid params");
      }
    });
  });

  describe("contactsDeleteSchema constraints", () => {
    it("should reject contactId exceeding 200 chars", async () => {
      const { handleContactsDelete } = await import("../../tools/contacts.js");
      const result = await handleContactsDelete({
        contactId: strOfLen(201),
      });
      expectZodValidationError(result);
    });
  });

  describe("addressBooksDeleteSchema constraints", () => {
    it("should reject addressBookId exceeding 200 chars", async () => {
      const { handleAddressBooksDelete } =
        await import("../../tools/contacts.js");
      const result = await handleAddressBooksDelete({
        addressBookId: strOfLen(201),
      });
      expectZodValidationError(result);
    });
  });
});

// =============================================================================
// calendar.ts schema tests
// =============================================================================

describe("calendar.ts schema hardening", () => {
  describe("eventsSearchSchema datetime constraints", () => {
    it("should reject invalid dateFrom (not ISO datetime)", async () => {
      const { handleEventsSearch } = await import("../../tools/calendar.js");
      const result = await handleEventsSearch({
        dateFrom: "not-a-date",
        dateTo: "2024-12-31T23:59:59Z",
      });
      expectZodValidationError(result);
    });

    it("should reject invalid dateTo (not ISO datetime)", async () => {
      const { handleEventsSearch } = await import("../../tools/calendar.js");
      const result = await handleEventsSearch({
        dateFrom: "2024-01-01T00:00:00Z",
        dateTo: "next-week",
      });
      expectZodValidationError(result);
    });
  });

  describe("eventsSearchSchema max constraints", () => {
    it("should reject query exceeding 1000 chars (audit hardening)", async () => {
      const { handleEventsSearch } = await import("../../tools/calendar.js");
      const result = await handleEventsSearch({
        query: strOfLen(1001),
        dateFrom: "2024-01-01T00:00:00Z",
        dateTo: "2024-12-31T23:59:59Z",
      });
      expectZodValidationError(result);
    });

    it("should reject calendarId exceeding 200 chars", async () => {
      const { handleEventsSearch } = await import("../../tools/calendar.js");
      const result = await handleEventsSearch({
        calendarId: strOfLen(201),
        dateFrom: "2024-01-01T00:00:00Z",
        dateTo: "2024-12-31T23:59:59Z",
      });
      expectZodValidationError(result);
    });
  });

  describe("eventsCreateSchema datetime constraints", () => {
    it("should reject invalid start datetime", async () => {
      const { handleEventsCreate } = await import("../../tools/calendar.js");
      const result = await handleEventsCreate({
        calendarId: "cal1",
        title: "Test",
        start: "tomorrow",
        end: "2024-01-02T10:00:00Z",
      });
      expectZodValidationError(result);
    });

    it("should reject invalid end datetime", async () => {
      const { handleEventsCreate } = await import("../../tools/calendar.js");
      const result = await handleEventsCreate({
        calendarId: "cal1",
        title: "Test",
        start: "2024-01-01T09:00:00Z",
        end: "next-day",
      });
      expectZodValidationError(result);
    });

    it("should accept valid ISO datetime with offset", async () => {
      const { handleEventsCreate } = await import("../../tools/calendar.js");
      const result = await handleEventsCreate({
        calendarId: "cal1",
        title: "Test",
        start: "2024-01-01T09:00:00+02:00",
        end: "2024-01-01T10:00:00+02:00",
      });
      if (result.isError) {
        const text = getErrorText(result);
        expect(text).not.toContain("ISO 8601 with timezone offset");
        expect(text).not.toContain("invalid_string");
      }
    });
  });

  describe("eventsCreateSchema max constraints", () => {
    it("should reject description exceeding 10000 chars", async () => {
      const { handleEventsCreate } = await import("../../tools/calendar.js");
      const result = await handleEventsCreate({
        calendarId: "cal1",
        title: "Test",
        start: "2024-01-01T09:00:00Z",
        end: "2024-01-01T10:00:00Z",
        description: strOfLen(10001),
      });
      expectZodValidationError(result);
    });

    it("should reject calendarId exceeding 200 chars", async () => {
      const { handleEventsCreate } = await import("../../tools/calendar.js");
      const result = await handleEventsCreate({
        calendarId: strOfLen(201),
        title: "Test",
        start: "2024-01-01T09:00:00Z",
        end: "2024-01-01T10:00:00Z",
      });
      expectZodValidationError(result);
    });
  });

  describe("eventsGetSchema max constraints", () => {
    it("should reject eventId exceeding 200 chars", async () => {
      const { handleEventsGet } = await import("../../tools/calendar.js");
      const result = await handleEventsGet({
        eventId: strOfLen(201),
        calendarId: "cal1",
      });
      expectZodValidationError(result);
    });

    it("should reject calendarId exceeding 200 chars", async () => {
      const { handleEventsGet } = await import("../../tools/calendar.js");
      const result = await handleEventsGet({
        eventId: "evt1",
        calendarId: strOfLen(201),
      });
      expectZodValidationError(result);
    });
  });

  describe("eventsMoveSchema datetime constraints", () => {
    it("should reject invalid newStart datetime", async () => {
      const { handleEventsMove } = await import("../../tools/calendar.js");
      const result = await handleEventsMove({
        eventId: "evt1",
        calendarId: "cal1",
        newStart: "invalid-date",
        newEnd: "2024-01-02T10:00:00Z",
      });
      expectZodValidationError(result);
    });

    it("should reject invalid newEnd datetime", async () => {
      const { handleEventsMove } = await import("../../tools/calendar.js");
      const result = await handleEventsMove({
        eventId: "evt1",
        calendarId: "cal1",
        newStart: "2024-01-01T09:00:00Z",
        newEnd: "invalid-date",
      });
      expectZodValidationError(result);
    });
  });

  describe("eventsDeleteSchema max constraints", () => {
    it("should reject eventId exceeding 200 chars", async () => {
      const { handleEventsDelete } = await import("../../tools/calendar.js");
      const result = await handleEventsDelete({
        eventId: strOfLen(201),
        calendarId: "cal1",
      });
      expectZodValidationError(result);
    });
  });
});

// =============================================================================
// compose.ts schema tests
// =============================================================================

describe("compose.ts schema hardening", () => {
  describe("composeBeginNewSchema max constraints", () => {
    it("should reject subject exceeding 1000 chars", async () => {
      const { handleComposeBeginNew } = await import("../../tools/compose.js");
      const result = await handleComposeBeginNew({
        subject: strOfLen(1001),
      });
      expectZodValidationError(result);
    });

    it("should reject body exceeding 500000 chars", async () => {
      const { handleComposeBeginNew } = await import("../../tools/compose.js");
      const result = await handleComposeBeginNew({
        body: strOfLen(500001),
      });
      expectZodValidationError(result);
    });

    it("should reject identityId exceeding 200 chars", async () => {
      const { handleComposeBeginNew } = await import("../../tools/compose.js");
      const result = await handleComposeBeginNew({
        identityId: strOfLen(201),
      });
      expectZodValidationError(result);
    });

    it("should reject to array exceeding 200 entries", async () => {
      const { handleComposeBeginNew } = await import("../../tools/compose.js");
      const emails = Array.from(
        { length: 201 },
        (_, i) => `user${i}@example.com`,
      );
      const result = await handleComposeBeginNew({
        to: emails,
      });
      expectZodValidationError(result);
    });

    it("should reject cc array exceeding 200 entries", async () => {
      const { handleComposeBeginNew } = await import("../../tools/compose.js");
      const emails = Array.from(
        { length: 201 },
        (_, i) => `cc${i}@example.com`,
      );
      const result = await handleComposeBeginNew({
        cc: emails,
      });
      expectZodValidationError(result);
    });

    it("should reject bcc array exceeding 200 entries", async () => {
      const { handleComposeBeginNew } = await import("../../tools/compose.js");
      const emails = Array.from(
        { length: 201 },
        (_, i) => `bcc${i}@example.com`,
      );
      const result = await handleComposeBeginNew({
        bcc: emails,
      });
      expectZodValidationError(result);
    });
  });

  describe("messageId / tabId integer bounds (audit hardening)", () => {
    it("composeBeginReplySchema: rejects negative messageId", async () => {
      const { handleComposeBeginReply } =
        await import("../../tools/compose.js");
      const result = await handleComposeBeginReply({ messageId: -1 });
      expectZodValidationError(result);
    });

    it("composeBeginReplySchema: rejects non-integer messageId", async () => {
      const { handleComposeBeginReply } =
        await import("../../tools/compose.js");
      const result = await handleComposeBeginReply({ messageId: 1.5 });
      expectZodValidationError(result);
    });

    it("composeBeginForwardSchema: rejects negative messageId", async () => {
      const { handleComposeBeginForward } =
        await import("../../tools/compose.js");
      const result = await handleComposeBeginForward({ messageId: -42 });
      expectZodValidationError(result);
    });

    it("composeGetDetailsSchema: rejects negative tabId", async () => {
      const { handleComposeGetDetails } =
        await import("../../tools/compose.js");
      const result = await handleComposeGetDetails({ tabId: -1 });
      expectZodValidationError(result);
    });

    it("composeSendSchema: rejects non-integer tabId", async () => {
      const { handleComposeSend } = await import("../../tools/compose.js");
      const result = await handleComposeSend({ tabId: 3.14 });
      expectZodValidationError(result);
    });
  });

  describe("composeSetDetailsSchema max constraints", () => {
    it("should reject subject exceeding 1000 chars", async () => {
      const { handleComposeSetDetails } =
        await import("../../tools/compose.js");
      const result = await handleComposeSetDetails({
        tabId: 1,
        subject: strOfLen(1001),
      });
      expectZodValidationError(result);
    });

    it("should reject body exceeding 500000 chars", async () => {
      const { handleComposeSetDetails } =
        await import("../../tools/compose.js");
      const result = await handleComposeSetDetails({
        tabId: 1,
        body: strOfLen(500001),
      });
      expectZodValidationError(result);
    });
  });
});

// =============================================================================
// tasks.ts schema tests
// =============================================================================

describe("tasks.ts schema hardening", () => {
  describe("tasksListSchema datetime constraints", () => {
    it("should reject invalid dueBefore format", async () => {
      const { handleTasksList } = await import("../../tools/tasks.js");
      const result = await handleTasksList({
        dueBefore: "not-a-date",
      });
      expectZodValidationError(result);
    });

    it("should reject invalid dueAfter format", async () => {
      const { handleTasksList } = await import("../../tools/tasks.js");
      const result = await handleTasksList({
        dueAfter: "2024/01/01",
      });
      expectZodValidationError(result);
    });

    it("should accept valid ISO datetime with offset for dueBefore", async () => {
      const { handleTasksList } = await import("../../tools/tasks.js");
      const result = await handleTasksList({
        dueBefore: "2024-12-31T23:59:59+01:00",
      });
      if (result.isError) {
        const text = getErrorText(result);
        expect(text).not.toContain("ISO 8601 with timezone offset");
        expect(text).not.toContain("invalid_string");
      }
    });
  });

  describe("tasksListSchema max constraints", () => {
    it("should reject calendarId exceeding 200 chars", async () => {
      const { handleTasksList } = await import("../../tools/tasks.js");
      const result = await handleTasksList({
        calendarId: strOfLen(201),
      });
      expectZodValidationError(result);
    });
  });

  describe("tasksCreateSchema datetime constraints", () => {
    it("should reject invalid dueDate format", async () => {
      const { handleTasksCreate } = await import("../../tools/tasks.js");
      const result = await handleTasksCreate({
        calendarId: "cal1",
        title: "Test task",
        dueDate: "next friday",
      });
      expectZodValidationError(result);
    });
  });

  describe("tasksCreateSchema max constraints", () => {
    it("should reject description exceeding 10000 chars", async () => {
      const { handleTasksCreate } = await import("../../tools/tasks.js");
      const result = await handleTasksCreate({
        calendarId: "cal1",
        title: "Test task",
        description: strOfLen(10001),
      });
      expectZodValidationError(result);
    });

    it("should reject calendarId exceeding 200 chars", async () => {
      const { handleTasksCreate } = await import("../../tools/tasks.js");
      const result = await handleTasksCreate({
        calendarId: strOfLen(201),
        title: "Test task",
      });
      expectZodValidationError(result);
    });
  });

  describe("tasksGetSchema max constraints", () => {
    it("should reject taskId exceeding 200 chars", async () => {
      const { handleTasksGet } = await import("../../tools/tasks.js");
      const result = await handleTasksGet({
        taskId: strOfLen(201),
        calendarId: "cal1",
      });
      expectZodValidationError(result);
    });

    it("should reject calendarId exceeding 200 chars", async () => {
      const { handleTasksGet } = await import("../../tools/tasks.js");
      const result = await handleTasksGet({
        taskId: "task1",
        calendarId: strOfLen(201),
      });
      expectZodValidationError(result);
    });
  });

  describe("tasksDeleteSchema max constraints", () => {
    it("should reject taskId exceeding 200 chars", async () => {
      const { handleTasksDelete } = await import("../../tools/tasks.js");
      const result = await handleTasksDelete({
        taskId: strOfLen(201),
        calendarId: "cal1",
      });
      expectZodValidationError(result);
    });
  });

  describe("tasksCompleteSchema max constraints", () => {
    it("should reject taskId exceeding 200 chars", async () => {
      const { handleTasksComplete } = await import("../../tools/tasks.js");
      const result = await handleTasksComplete({
        taskId: strOfLen(201),
        calendarId: "cal1",
      });
      expectZodValidationError(result);
    });
  });

  describe("tasksUpdateSchema constraints", () => {
    it("should reject invalid dueDate format", async () => {
      const { handleTasksUpdate } = await import("../../tools/tasks.js");
      const result = await handleTasksUpdate({
        taskId: "task1",
        calendarId: "cal1",
        dueDate: "invalid",
      });
      expectZodValidationError(result);
    });

    it("should reject description exceeding 10000 chars", async () => {
      const { handleTasksUpdate } = await import("../../tools/tasks.js");
      const result = await handleTasksUpdate({
        taskId: "task1",
        calendarId: "cal1",
        description: strOfLen(10001),
      });
      expectZodValidationError(result);
    });
  });
});

// =============================================================================
// folders.ts schema tests (SEC-REVIEW-005)
// =============================================================================

describe("folders.ts schema hardening", () => {
  describe("foldersListSchema max constraints", () => {
    it("should reject accountId exceeding 200 chars", async () => {
      const { handleFoldersList } = await import("../../tools/folders.js");
      const result = await handleFoldersList({
        accountId: strOfLen(201),
      });
      expectZodValidationError(result);
    });
  });

  describe("foldersGetSchema max constraints", () => {
    it("should reject folderId exceeding 500 chars", async () => {
      const { handleFoldersGet } = await import("../../tools/folders.js");
      const result = await handleFoldersGet({
        folderId: strOfLen(501),
      });
      expectZodValidationError(result);
    });
  });

  describe("foldersCreateSchema max constraints", () => {
    it("should reject parentFolderId exceeding 500 chars", async () => {
      const { handleFoldersCreate } = await import("../../tools/folders.js");
      const result = await handleFoldersCreate({
        parentFolderId: strOfLen(501),
        name: "test",
      });
      expectZodValidationError(result);
    });
  });

  describe("foldersRenameSchema max constraints", () => {
    it("should reject folderId exceeding 500 chars", async () => {
      const { handleFoldersRename } = await import("../../tools/folders.js");
      const result = await handleFoldersRename({
        folderId: strOfLen(501),
        newName: "test",
      });
      expectZodValidationError(result);
    });
  });

  describe("foldersDeleteSchema max constraints", () => {
    it("should reject folderId exceeding 500 chars", async () => {
      const { handleFoldersDelete } = await import("../../tools/folders.js");
      const result = await handleFoldersDelete({
        folderId: strOfLen(501),
      });
      expectZodValidationError(result);
    });
  });

  describe("foldersMoveSchema max constraints", () => {
    it("should reject folderId exceeding 500 chars", async () => {
      const { handleFoldersMove } = await import("../../tools/folders.js");
      const result = await handleFoldersMove({
        folderId: strOfLen(501),
        destinationFolderId: "dest",
      });
      expectZodValidationError(result);
    });

    it("should reject destinationFolderId exceeding 500 chars", async () => {
      const { handleFoldersMove } = await import("../../tools/folders.js");
      const result = await handleFoldersMove({
        folderId: "src",
        destinationFolderId: strOfLen(501),
      });
      expectZodValidationError(result);
    });
  });

  describe("foldersMarkReadSchema max constraints", () => {
    it("should reject folderId exceeding 500 chars", async () => {
      const { handleFoldersMarkRead } = await import("../../tools/folders.js");
      const result = await handleFoldersMarkRead({
        folderId: strOfLen(501),
      });
      expectZodValidationError(result);
    });
  });
});

// =============================================================================
// tags.ts schema tests (SEC-REVIEW-006)
// =============================================================================

describe("tags.ts schema hardening", () => {
  describe("tagsUpdateSchema max constraints", () => {
    it("should reject key exceeding 50 chars", async () => {
      const { handleTagsUpdate } = await import("../../tools/tags.js");
      const result = await handleTagsUpdate({
        key: strOfLen(51),
        tag: "updated",
      });
      expectZodValidationError(result);
    });
  });

  describe("tagsDeleteSchema max constraints", () => {
    it("should reject key exceeding 50 chars", async () => {
      const { handleTagsDelete } = await import("../../tools/tags.js");
      const result = await handleTagsDelete({
        key: strOfLen(51),
      });
      expectZodValidationError(result);
    });
  });
});

// =============================================================================
// accounts.ts schema tests (SEC-REVIEW-006)
// =============================================================================

describe("accounts.ts schema hardening", () => {
  describe("accountsGetSchema max constraints", () => {
    it("should reject accountId exceeding 200 chars", async () => {
      const { handleAccountsGet } = await import("../../tools/accounts.js");
      const result = await handleAccountsGet({
        accountId: strOfLen(201),
      });
      expectZodValidationError(result);
    });
  });

  describe("identitiesListSchema max constraints", () => {
    it("should reject accountId exceeding 200 chars", async () => {
      const { handleIdentitiesList } = await import("../../tools/accounts.js");
      const result = await handleIdentitiesList({
        accountId: strOfLen(201),
      });
      expectZodValidationError(result);
    });
  });
});
