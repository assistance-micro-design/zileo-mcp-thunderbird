/**
 * Tests for resource handlers
 * Validates URI routing, response format, and error handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the websocket client-adapter module
const mockSendRequest = vi.fn();
vi.mock("../../websocket/client-adapter.js", () => ({
  getNativeClient: (): { sendRequest: typeof mockSendRequest } => ({
    sendRequest: mockSendRequest,
  }),
}));

// Mock logger
vi.mock("../../utils/logger.js", () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  handleAccountsResource,
  handleFoldersResource,
  handleInboxUnreadResource,
  handleInboxUnreadAccountResource,
  handleContactsRecentResource,
  handleCalendarTodayResource,
  handleCalendarUpcomingResource,
  handleTasksPendingResource,
  getResourceHandler,
} from "../../resources/handlers.js";

describe("Resource Handlers", () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // getResourceHandler - URI routing
  // =========================================================================
  describe("getResourceHandler", () => {
    it("should resolve static resource URIs", () => {
      expect(getResourceHandler("thunderbird://accounts")).toBeDefined();
      expect(getResourceHandler("thunderbird://inbox/unread")).toBeDefined();
      expect(getResourceHandler("thunderbird://contacts/recent")).toBeDefined();
      expect(getResourceHandler("thunderbird://calendar/today")).toBeDefined();
      expect(
        getResourceHandler("thunderbird://calendar/upcoming"),
      ).toBeDefined();
      expect(getResourceHandler("thunderbird://tasks/pending")).toBeDefined();
    });

    it("should resolve template resource URIs", () => {
      expect(
        getResourceHandler("thunderbird://folders/account123"),
      ).toBeDefined();
      expect(
        getResourceHandler("thunderbird://inbox/unread/account456"),
      ).toBeDefined();
    });

    it("should return undefined for unknown URIs", () => {
      expect(getResourceHandler("thunderbird://unknown")).toBeUndefined();
      expect(getResourceHandler("invalid://uri")).toBeUndefined();
      expect(getResourceHandler("")).toBeUndefined();
    });
  });

  // =========================================================================
  // handleAccountsResource
  // =========================================================================
  describe("handleAccountsResource", () => {
    it("should return accounts on success", async () => {
      const mockAccounts = [{ id: "acc1", name: "Test" }];
      mockSendRequest.mockResolvedValue({
        success: true,
        data: mockAccounts,
      });

      const result = await handleAccountsResource("thunderbird://accounts");

      expect(result.uri).toBe("thunderbird://accounts");
      expect(result.mimeType).toBe("application/json");
      expect(JSON.parse(result.text as string)).toEqual(mockAccounts);
    });

    it("should throw on failure", async () => {
      mockSendRequest.mockResolvedValue({
        success: false,
        error: { message: "Connection failed" },
      });

      await expect(
        handleAccountsResource("thunderbird://accounts"),
      ).rejects.toThrow("Connection failed");
    });
  });

  // =========================================================================
  // handleFoldersResource
  // =========================================================================
  describe("handleFoldersResource", () => {
    it("should parse accountId from URI and return folders", async () => {
      const mockFolders = [{ id: "f1", name: "Inbox" }];
      mockSendRequest.mockResolvedValue({
        success: true,
        data: mockFolders,
      });

      const result = await handleFoldersResource(
        "thunderbird://folders/account123",
      );

      expect(result.uri).toBe("thunderbird://folders/account123");
      expect(result.mimeType).toBe("application/json");
      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          accountId: "account123",
          includeSubFolders: true,
        }),
      );
    });

    it("should throw on invalid URI", async () => {
      await expect(
        handleFoldersResource("thunderbird://folders/"),
      ).rejects.toThrow("Invalid folder resource URI");
    });
  });

  // =========================================================================
  // handleInboxUnreadResource
  // =========================================================================
  describe("handleInboxUnreadResource", () => {
    it("should return unread messages", async () => {
      const mockMessages = [{ id: 1, subject: "Test" }];
      mockSendRequest.mockResolvedValue({
        success: true,
        data: mockMessages,
      });

      const result = await handleInboxUnreadResource(
        "thunderbird://inbox/unread",
      );

      expect(result.mimeType).toBe("application/json");
      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ unread: true, limit: 100 }),
      );
    });

    it("should throw on failure", async () => {
      mockSendRequest.mockResolvedValue({
        success: false,
        error: { message: "Search failed" },
      });

      await expect(
        handleInboxUnreadResource("thunderbird://inbox/unread"),
      ).rejects.toThrow("Search failed");
    });
  });

  // =========================================================================
  // handleInboxUnreadAccountResource
  // =========================================================================
  describe("handleInboxUnreadAccountResource", () => {
    it("should parse accountId and search unread for that account", async () => {
      mockSendRequest.mockResolvedValue({
        success: true,
        data: [],
      });

      await handleInboxUnreadAccountResource(
        "thunderbird://inbox/unread/acc99",
      );

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ unread: true, accountId: "acc99" }),
      );
    });

    it("should throw on invalid URI", async () => {
      await expect(
        handleInboxUnreadAccountResource("thunderbird://inbox/unread/"),
      ).rejects.toThrow("Invalid inbox unread resource URI");
    });
  });

  // =========================================================================
  // handleContactsRecentResource
  // =========================================================================
  describe("handleContactsRecentResource", () => {
    it("should aggregate contacts from address books", async () => {
      mockSendRequest
        .mockResolvedValueOnce({
          success: true,
          data: [{ id: "book1" }, { id: "book2" }],
        })
        .mockResolvedValueOnce({
          success: true,
          data: [{ id: "c1", name: "Alice" }],
        })
        .mockResolvedValueOnce({
          success: true,
          data: [{ id: "c2", name: "Bob" }],
        });

      const result = await handleContactsRecentResource(
        "thunderbird://contacts/recent",
      );

      const parsed = JSON.parse(result.text as string);
      expect(parsed).toHaveLength(2);
    });

    it("should throw if address books fetch fails", async () => {
      mockSendRequest.mockResolvedValue({
        success: false,
        error: { message: "Not available" },
      });

      await expect(
        handleContactsRecentResource("thunderbird://contacts/recent"),
      ).rejects.toThrow("Not available");
    });
  });

  // =========================================================================
  // handleCalendarTodayResource
  // =========================================================================
  describe("handleCalendarTodayResource", () => {
    it("should search events for today", async () => {
      mockSendRequest.mockResolvedValue({
        success: true,
        data: [{ id: "ev1", title: "Meeting" }],
      });

      const result = await handleCalendarTodayResource(
        "thunderbird://calendar/today",
      );

      expect(result.mimeType).toBe("application/json");
      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          limit: 50,
          dateFrom: expect.any(String),
          dateTo: expect.any(String),
        }),
      );
    });
  });

  // =========================================================================
  // handleCalendarUpcomingResource
  // =========================================================================
  describe("handleCalendarUpcomingResource", () => {
    it("should search events for next 7 days", async () => {
      mockSendRequest.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await handleCalendarUpcomingResource(
        "thunderbird://calendar/upcoming",
      );

      expect(result.mimeType).toBe("application/json");
      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ limit: 100 }),
      );
    });
  });

  // =========================================================================
  // handleTasksPendingResource
  // =========================================================================
  describe("handleTasksPendingResource", () => {
    it("should return pending tasks", async () => {
      const mockTasks = [{ id: "t1", title: "Fix bug" }];
      mockSendRequest.mockResolvedValue({
        success: true,
        data: mockTasks,
      });

      const result = await handleTasksPendingResource(
        "thunderbird://tasks/pending",
      );

      expect(JSON.parse(result.text as string)).toEqual(mockTasks);
      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ completed: false, limit: 100 }),
      );
    });

    it("should throw on failure", async () => {
      mockSendRequest.mockResolvedValue({
        success: false,
        error: { message: "Tasks unavailable" },
      });

      await expect(
        handleTasksPendingResource("thunderbird://tasks/pending"),
      ).rejects.toThrow("Tasks unavailable");
    });
  });
});
