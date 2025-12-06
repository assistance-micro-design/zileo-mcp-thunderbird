# Contribution to thunderbird/webext-experiments

## Issue: Calendar API fails with "System modules must be loaded from a trusted scheme"

### Bug Report / Pull Request Content

---

## Title
**Fix: Add resource:// URL mapping before importing ESModule in Calendar API**

---

## Description

When using the Calendar experimental API in a MailExtension, the `ChromeUtils.importESModule()` call fails with the following error:

```
Error: System modules must be loaded from a trusted scheme
```

This occurs because the `resource://experiments-calendar-{uuid}/...` URL is not registered before attempting to import the module.

### Environment
- **Thunderbird Version**: 128.0+
- **Extension Type**: MailExtension (Manifest V3)
- **OS**: Linux (also tested on Windows)

### Steps to Reproduce
1. Create a MailExtension using the Calendar experimental API
2. Configure `experiment_apis` in manifest.json as documented
3. Call any calendar API method (e.g., `browser.calendar.calendars.query({})`)
4. Observe error in Browser Console

### Error Message
```
Error: System modules must be loaded from a trusted scheme
    at getAPI (ext-calendar-calendars.js:27)
```

### Root Cause
The `ChromeUtils.importESModule()` function requires a registered `resource://` protocol mapping to load ES modules from extension directories. Without calling `Services.io.setSubstitution()` first, the resource protocol handler doesn't know how to resolve the custom `resource://experiments-calendar-{uuid}/` URL.

---

## Proposed Fix

Add `Services.io.setSubstitution()` before the `ChromeUtils.importESModule()` call in each parent script.

### Files to modify:
- `calendar/experiments/calendar/parent/ext-calendar-calendars.js`
- `calendar/experiments/calendar/parent/ext-calendar-items.js`
- `calendar/experiments/calendar/parent/ext-calendarItemDetails.js`

### Code Change

**Before:**
```javascript
this.calendar_calendars = class extends ExtensionAPI {
  getAPI(context) {
    const uuid = context.extension.uuid;
    const root = `experiments-calendar-${uuid}`;
    const query = context.extension.manifest.version;

    const {
      unwrapCalendar,
      getResolvedCalendarById,
      isOwnCalendar,
      convertCalendar,
    } = ChromeUtils.importESModule(
      `resource://${root}/experiments/calendar/ext-calendar-utils.sys.mjs?${query}`
    );
    // ...
  }
}
```

**After:**
```javascript
this.calendar_calendars = class extends ExtensionAPI {
  getAPI(context) {
    const uuid = context.extension.uuid;
    const root = `experiments-calendar-${uuid}`;
    const query = context.extension.manifest.version;

    // Set up resource:// mapping for ESModule import
    Services.io
      .getProtocolHandler("resource")
      .QueryInterface(Ci.nsIResProtocolHandler)
      .setSubstitution(root, context.extension.rootURI);

    const {
      unwrapCalendar,
      getResolvedCalendarById,
      isOwnCalendar,
      convertCalendar,
    } = ChromeUtils.importESModule(
      `resource://${root}/experiments/calendar/ext-calendar-utils.sys.mjs?${query}`
    );
    // ...
  }
}
```

---

## Full Diff

### ext-calendar-calendars.js

```diff
 this.calendar_calendars = class extends ExtensionAPI {
   getAPI(context) {
     const uuid = context.extension.uuid;
     const root = `experiments-calendar-${uuid}`;
     const query = context.extension.manifest.version;

+    // Set up resource:// mapping for ESModule import
+    Services.io
+      .getProtocolHandler("resource")
+      .QueryInterface(Ci.nsIResProtocolHandler)
+      .setSubstitution(root, context.extension.rootURI);
+
     const {
       unwrapCalendar,
       getResolvedCalendarById,
```

### ext-calendar-items.js

```diff
 this.calendar_items = class extends ExtensionAPI {
   getAPI(context) {
     const uuid = context.extension.uuid;
     const root = `experiments-calendar-${uuid}`;
     const query = context.extension.manifest.version;

+    // Set up resource:// mapping for ESModule import
+    Services.io
+      .getProtocolHandler("resource")
+      .QueryInterface(Ci.nsIResProtocolHandler)
+      .setSubstitution(root, context.extension.rootURI);
+
     const {
       getResolvedCalendarById,
       getCachedCalendar,
```

### ext-calendarItemDetails.js

The `onLoadCalendarItemPanel` and `onLoadSummary` methods already have the `setSubstitution` call (likely added for a similar reason), but verify consistency.

---

## Testing

After applying this fix:

1. Calendar API calls work correctly
2. `browser.calendar.calendars.query({})` returns calendar list
3. `browser.calendar.items.query({...})` returns events
4. Event creation/update/delete operations succeed

### Test Extension

We have a working implementation at:
https://github.com/assistance-micro-design/thunderbird-mcp

This MCP (Model Context Protocol) server uses the Calendar experimental API with this fix applied.

---

## Additional Notes

- The `ext-calendar-provider.js` file already has `setSubstitution` calls in some places, suggesting this pattern was intended but not consistently applied
- This fix is backward compatible - it simply ensures the resource mapping exists before use
- No cleanup (`setSubstitution(root, null)`) is needed in `getAPI()` as the extension lifecycle handles this

---

## Labels
- `bug`
- `calendar`
- `good first issue` (simple fix)

---

## Checklist for PR
- [x] Code follows MPL 2.0 license
- [x] Fix is minimal and focused
- [x] Tested with Thunderbird 128.0+
- [x] No breaking changes
- [x] eslint passes (no new code style issues)

---

## Contact

**Author**: Assistance Micro Design
**Project**: [thunderbird-mcp](https://github.com/assistance-micro-design/thunderbird-mcp)
**Email**: assistance-micro-design@pm.me
