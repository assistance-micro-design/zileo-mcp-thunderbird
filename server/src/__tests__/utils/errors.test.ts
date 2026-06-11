/**
 * Tests for error handling utilities
 * SEC-ERR-002: Verify nativeErrorToJsonRpc does not leak stack traces
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  nativeErrorToJsonRpc,
  createInternalError,
  createInvalidParamsError,
  createThunderbirdNotRunningError,
  createResourceNotFoundError,
  OperationTimeoutError,
} from "../../utils/errors.js";

describe("nativeErrorToJsonRpc", () => {
  it("should not include stack trace in returned error for Error instances", () => {
    const error = new Error("Something went wrong");
    // Ensure the error has a stack (it always does in Node)
    expect(error.stack).toBeDefined();

    const result = nativeErrorToJsonRpc(error);

    // The error message should be preserved
    expect(result.message).toBe("Something went wrong");
    // The data field must NOT contain the full error object or stack
    expect(result.data).toBeUndefined();
  });

  it("should not include the full error object as data for unknown objects", () => {
    const error = { something: "unexpected", nested: { deep: true } };

    const result = nativeErrorToJsonRpc(error);

    // Must not leak the full object
    expect(result.data).toBeUndefined();
    expect(result.message).toBe("Unknown error");
  });

  it("should handle string errors without leaking data", () => {
    const result = nativeErrorToJsonRpc("plain string error");

    expect(result.message).toBe("Unknown error");
    expect(result.data).toBeUndefined();
  });

  it("should handle null/undefined without leaking data", () => {
    const resultNull = nativeErrorToJsonRpc(null);
    expect(resultNull.message).toBe("Unknown error");
    expect(resultNull.data).toBeUndefined();

    const resultUndefined = nativeErrorToJsonRpc(undefined);
    expect(resultUndefined.message).toBe("Unknown error");
    expect(resultUndefined.data).toBeUndefined();
  });

  it("should map native messaging error codes correctly", () => {
    const notConnected = nativeErrorToJsonRpc({
      code: "NOT_CONNECTED",
      message: "Not connected",
    });
    expect(notConnected.message).toBe(
      "Thunderbird is not running or extension is not connected",
    );

    const notFound = nativeErrorToJsonRpc({
      code: "NOT_FOUND",
      message: "Resource missing",
    });
    expect(notFound.message).toBe("Resource not found");
  });

  it("should handle native errors with code and details without leaking stack", () => {
    const error = {
      code: "SOME_UNKNOWN_CODE",
      message: "Custom error",
      details: "some detail",
    };

    const result = nativeErrorToJsonRpc(error);
    expect(result.message).toBe("Custom error");
    // details from native messaging errors with known structure are allowed
    expect(result.data).toBe("some detail");
  });
});

describe("createInternalError", () => {
  it("should create error with code -32603", () => {
    const error = createInternalError("test message");
    expect(error.code).toBe(-32603);
    expect(error.message).toBe("test message");
  });

  it("should not include data when no details provided", () => {
    const error = createInternalError("test");
    expect(error.data).toBeUndefined();
  });
});

describe("createInvalidParamsError", () => {
  it("should create error with code -32602", () => {
    const error = createInvalidParamsError("missing field");
    expect(error.code).toBe(-32602);
    expect(error.message).toBe("Invalid params");
    expect(error.data).toBe("missing field");
  });
});

describe("createThunderbirdNotRunningError", () => {
  it("should create error with code -32000", () => {
    const error = createThunderbirdNotRunningError();
    expect(error.code).toBe(-32000);
  });
});

describe("createResourceNotFoundError", () => {
  it("should create error with code -32003 and resource info", () => {
    const error = createResourceNotFoundError("inbox");
    expect(error.code).toBe(-32003);
    expect(error.data).toEqual({ resource: "inbox" });
  });
});

describe("nativeErrorToJsonRpc - ZodError mapping", () => {
  const schema = z.object({
    dateFrom: z.string().datetime({ offset: true }),
    limit: z.number().int(),
  });

  function getZodError(input: unknown): z.ZodError {
    const result = schema.safeParse(input);
    if (result.success) {
      throw new Error("expected validation failure");
    }
    return result.error;
  }

  it("should map ZodError to InvalidParams (-32602), not InternalError", () => {
    const error = getZodError({ dateFrom: "2026-01-15", limit: 1 });

    const result = nativeErrorToJsonRpc(error);

    expect(result.code).toBe(-32602);
  });

  it("should produce an actionable message with the failing field path", () => {
    const error = getZodError({ dateFrom: "2026-01-15", limit: 1 });

    const result = nativeErrorToJsonRpc(error);

    expect(result.message).toMatch(/^Invalid params: /);
    expect(result.message).toContain("dateFrom");
    // The raw stringified issues array must not be the message
    expect(result.message).not.toMatch(/^\[/);
  });

  it("should join multiple issues with '; '", () => {
    const error = getZodError({ dateFrom: "not-a-date", limit: 1.5 });

    const result = nativeErrorToJsonRpc(error);

    expect(result.message).toContain("dateFrom");
    expect(result.message).toContain("limit");
    expect(result.message).toContain("; ");
  });

  it("should render root-level issues as (root)", () => {
    const rootResult = z.string().safeParse(42);
    expect(rootResult.success).toBe(false);
    if (rootResult.success) return;

    const result = nativeErrorToJsonRpc(rootResult.error);

    expect(result.code).toBe(-32602);
    expect(result.message).toContain("(root)");
  });

  it("should not leak issue details in the data field", () => {
    const error = getZodError({ dateFrom: "2026-01-15", limit: 1 });

    const result = nativeErrorToJsonRpc(error);

    expect(result.data).toBeUndefined();
  });
});

describe("OperationTimeoutError (audit: typed bridge timeouts)", () => {
  it("should carry the native TIMEOUT code and a -32004 JSON-RPC error", () => {
    const error = new OperationTimeoutError("messages.list", 30000);

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("TIMEOUT");
    expect(error.message).toBe("Request timeout: messages.list (30000ms)");
    expect(error.jsonRpc.code).toBe(-32004);
    expect(error.jsonRpc.data).toEqual({
      operation: "messages.list",
      timeout: 30000,
    });
  });

  it("should be mapped to OperationTimeout (-32004) by nativeErrorToJsonRpc", () => {
    const error = new OperationTimeoutError("calendar.listEvents", 5000);
    const jsonRpc = nativeErrorToJsonRpc(error);

    expect(jsonRpc.code).toBe(-32004);
    expect(jsonRpc.message).toBe("Operation timeout");
  });
});
