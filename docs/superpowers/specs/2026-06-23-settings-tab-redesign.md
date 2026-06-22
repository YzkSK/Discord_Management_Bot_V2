# Settings Tab Redesign

**Date:** 2026-06-23  
**Status:** Approved

## Summary

Rename the "Access" navigation item to "Settings" and expand the settings page into a role-aware tabbed interface. Viewers see only personal settings (TTS personal config + UI language). Admins see server feature settings (Voice, TTS, Recruitment, Logs) plus personal settings. Owners see all tabs including Access grants.

## Goals

- Make settings accessible to all roles (currently owner-only)
- Provide a unified settings entry point replacing scattered per-page setting modals
- Viewers can configure personal TTS settings and UI display language

## Tab Visibility by Role

| Tab        | viewer | admin | owner |
|------------|--------|-------|-------|
| 個人設定    | ✓      | ✓     | ✓     |
| Voice      |        | ✓     | ✓     |
| TTS        |        | ✓     | ✓     |
| Recruitment |       | ✓     | ✓     |
| Logs       |        | ✓     | ✓     |
| Access     |        |       | ✓     |

## Architecture

### Modified Files

**`apps/dashboard/src/app/dashboard-ui.ts`**
- `label: "Access"` → `"Settings"` (2 occurrences: `dashboardNavGroups` and `dashboardNavItems`)
- `minRole: "owner"` → removed (all roles can see the nav item)

**`apps/dashboard/src/app/dashboard-shell.tsx`**
- `/settings` icon: `<KeyRound>` → `<Settings>` (already imported)

**`apps/dashboard/src/app/settings/page.tsx`**
- Remove `if (role !== "owner") notFound()` guard
- Pass `role` prop to `SettingsPanel`
- Update `title` and `description` to match new purpose

**`apps/dashboard/src/app/settings/settings-panel.tsx`**
- Accept `role?: "viewer" | "admin" | "owner" | null` prop
- Add `activeTab` state (default: `"personal"`)
- Build visible tabs array using `canSeeItem(minRole, role)` from `../../lib/roles`
- Render tab bar + conditional tab content
- Keep existing `useAccessGrants` + `AccessGrantsTab` logic unchanged, only shown for `activeTab === "access"`

### New Files

**`apps/dashboard/src/app/settings/components/PersonalSettingsTab.tsx`**
- Self-contained: no props except `guildId`
- UI language selector Card: `<Select>` ja/en → persists to `localStorage` key `"dashboard-ui-lang"`, updates parent uiLang state
- TTS personal section: embeds `TtsUserPersonalCard` (display) + `TtsUserSettingsModal` trigger button (edit)

**`apps/dashboard/src/app/settings/components/VoiceSettingsPanel.tsx`**
- Self-contained: `guildId` + `loc` props
- Fetches settings via `fetchSettings(guildId)` on mount
- Manages `createChannelId`, `categoryId` state locally
- Saves via `updateTempVcSettings`
- Renders `VoiceSettingsTab` + Save button

**`apps/dashboard/src/app/settings/components/TtsSettingsPanel.tsx`**
- Self-contained: `guildId` + `loc` + `canEditTts: boolean` props
- Uses existing `useTtsSettings(guildId, loc)` hook
- Renders existing `TtsSettingsTab` with all hook-provided props

**`apps/dashboard/src/app/settings/components/RecruitmentSettingsPanel.tsx`**
- Self-contained: `guildId` + `loc` props
- Fetches settings on mount, manages `channelId` state locally
- Saves via `updateRecruitmentSettings`
- Renders `RecruitmentSettingsTab` + Save button

**`apps/dashboard/src/app/settings/components/LogsSettingsPanel.tsx`**
- Self-contained: `guildId` + `loc` props
- Fetches settings on mount, manages `logMode`, `language` state locally
- Saves via `updateSettings`
- Renders `LogsSettingsTab` + Save button

### Unchanged Files

- `settings/components/VoiceSettingsTab.tsx` — dumb presenter, no changes
- `settings/components/TtsSettingsTab.tsx` — dumb presenter, no changes
- `settings/components/RecruitmentSettingsTab.tsx` — dumb presenter, no changes
- `settings/components/LogsSettingsTab.tsx` — dumb presenter, no changes
- `settings/components/AccessGrantsTab.tsx` — no changes
- `settings/hooks/useAccessGrants.ts` — no changes
- `settings/hooks/useTtsSettings.ts` — no changes
- Feature action files (`voice-settings-action.tsx` etc.) — no changes

## Data Flow

```
settings/page.tsx (server component)
  └─ getDashboardPageRole(guildId) → role
  └─ SettingsPanel { guildId, role }
       ├─ [personal tab] PersonalSettingsTab { guildId }
       │    ├─ UI lang: localStorage "dashboard-ui-lang"
       │    └─ TtsUserPersonalCard + TtsUserSettingsModal
       ├─ [voice tab]   VoiceSettingsPanel { guildId, loc }
       ├─ [tts tab]     TtsSettingsPanel { guildId, loc, canEditTts }
       ├─ [recruitment tab] RecruitmentSettingsPanel { guildId, loc }
       ├─ [logs tab]    LogsSettingsPanel { guildId, loc }
       └─ [access tab]  AccessGrantsTab (existing, props from useAccessGrants)
```

## Edge Cases

- **Viewer on TTS tab**: Not visible (tab filtered out). Only Personal tab shown.
- **Admin with no TTS configured**: TtsSettingsPanel shows unset state, saves empty/null.
- **Tab default**: Always defaults to `"personal"` regardless of role. If personal tab is visible, it's always selected first.
- **Settings page load for non-owners**: `fetchSettings` returns `availableRoles: undefined` for non-owners — AccessGrantsTab is never rendered for them so no issue.
- **canEditTts for TtsSettingsPanel**: Derived from `settings.accessRole` field in SettingsResponse — passed as `canEditTts={settings.accessRole !== "viewer"}`.
