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
- shadcn/ui-style local components for Button, Input, Select, Card, Badge, and Table.
- lucide-react icons for navigation and primary actions.

## Verification Focus

Use the Dashboard to move between:

- `/logs` for message, voice, audit, TempVC, and Recruitment events.
- `/settings` for Guild settings and Dashboard access state.
- `/` for the verification flow and quick links.

Phase6 does not yet implement full TempVC or Recruitment settings screens.

## Phase9 Settings Expansion

Phase9 reorganizes `/settings` into feature-oriented sections:

- Overview
- Logs
- Temp VC
- TTS
- Recruitment
- Dashboard Access

The page uses the feature-domain Settings API to show configured status and
keeps Dashboard labels localized in English and Japanese. Recruitment remains
read-only in Phase9 because it is still marker-based rather than persisted as a
`guild_configs` setting.
