# Dashboard UI/UX

Phase6 starts the Dashboard UI/UX foundation. The goal is not a marketing-style interface; it is a practical operations console for checking bot behavior quickly.

## Current Scope

- Shared Dashboard shell and navigation.
- Operations overview page.
- Logs explorer layout improvements.
- Settings panel layout improvements.
- Tested dashboard UI helper logic.
- Shared guild ID storage between Logs and Settings.
- Logs event presets for message, voice, Temp VC, recruitment, and audit checks.
- Readable log row summaries before raw payload inspection.

## Verification Focus

Use the Dashboard to move between:

- `/logs` for message, voice, audit, TempVC, and Recruitment events.
- `/settings` for Guild settings and Dashboard access state.
- `/` for the verification flow and quick links.

Phase6 does not yet implement full TempVC or Recruitment settings screens.
