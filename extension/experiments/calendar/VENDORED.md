# Vendored Calendar Experiments

Thunderbird has no official WebExtension calendar API. The experiments in this
directory are vendored from the community **calendar experiment APIs**
maintained by the Thunderbird team:

- Upstream: https://github.com/thunderbird/webext-experiments
  (historic upstream: https://github.com/jobisoft/webext-experiments-calendar)
- Imported for Thunderbird 128+ (MV3 event pages)

## Kept (registered in manifest.json `experiment_apis`)

| File | API | Used by |
|------|-----|---------|
| `parent/ext-calendar-calendars.js` + `schema/calendar-calendars.json` | `browser.calendar.calendars` | `extension/api/calendar.js` (calendars_list/get tools) |
| `parent/ext-calendar-items.js` + `schema/calendar-items.json` | `browser.calendar.items` | `extension/api/calendar.js` (7 event tools + 6 task tools) |
| `parent/ext-calendar-timezones.js`, `child/ext-calendar-timezones.js` + `schema/calendar-timezones.json` | `browser.calendar.timezones` | Declared, reserved for future timezone support |
| `ext-calendar-utils.sys.mjs` | Shared helpers | The registered experiments above |

## Removed on 2026-06-10 (audit fixes, v1.4.0)

The following upstream files were vendored but NEVER loaded: they were absent
from `experiment_apis` in manifest.json, so Thunderbird never executed them,
and no MCP tool can exploit them (they are UI/provider extension points for
humans interacting with the Thunderbird window):

| File | Upstream role |
|------|---------------|
| `parent/ext-calendar-provider.js` | "Provider" API: lets an extension act as a calendar backend (new synchronized source) |
| `child/ext-calendar-provider-actor.sys.mjs` | Child actor for the provider API |
| `schema/calendar-provider.json` | Schema for the provider API |
| `parent/ext-calendarItemAction.js` + `schema/calendarItemAction.json` | UI extension point: action buttons on calendar items |
| `parent/ext-calendarItemDetails.js` + `schema/calendarItemDetails.json` | UI extension point: custom panel in the item detail view |

To re-import them later (e.g. to expose provider capabilities), fetch the
current versions from the upstream repository above — git history of this
repo also retains the removed copies (removed in the v1.4.0 audit commit).
