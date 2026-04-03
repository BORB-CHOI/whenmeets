# Changelog

All notable changes to WhenMeets will be documented in this file.

## [0.1.0.0] - 2026-04-04

### Added
- Create group scheduling events with title, dates, and time range
- Calendar-style date picker with multi-select
- Touch and mouse drag grid for marking availability (Available / If Needed / Unavailable)
- Password protection for private events with cookie-based auth
- Results heatmap showing group availability with color intensity
- Participant filtering on results page
- Auto-save with 500ms debounce and sendBeacon on tab close
- Realtime updates via Supabase subscriptions
- Share link with clipboard copy
- Mobile-first responsive design
- Korean language interface

### Fixed
- DatePicker buttons no longer trigger parent form submission
- Dragging on already-selected cells now correctly toggles them off
- Timezone-safe date handling prevents off-by-one day shifts
- sendBeacon auth token now sent in request body for compatibility
