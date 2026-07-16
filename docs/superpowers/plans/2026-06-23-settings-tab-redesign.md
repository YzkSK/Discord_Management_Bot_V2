# Settings Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename "Access" nav item to "Settings" and expand the settings page into a role-aware tabbed interface where viewers see personal settings only, admins see server feature settings, and owners see everything including access grants.

**Architecture:** A new tab bar in `SettingsPanel` renders different tabs based on role using the existing `canSeeItem` helper. Each server-settings tab is a self-contained component that fetches its own data. A new `PersonalSettingsTab` wraps the existing `TtsUserPersonalCard` and `TtsUserSettingsModal` with a UI language selector. The existing `AccessGrantsTab` and `useAccessGrants` hook are kept unchanged.

**Tech Stack:** Next.js 15 App Router, React, TypeScript, Tailwind CSS, `node:test` + `node:assert/strict` for unit tests.

## Global Constraints

- Tests use `node:test` + `node:assert/strict` — no Jest, no Vitest
- Run tests: `npm test` from `apps/dashboard/` (compiles TypeScript first, then runs node --test)
- Run typecheck: `npm run typecheck` from `apps/dashboard/`
- Styling: Discord dark theme — use existing Tailwind classes from surrounding code (e.g. `text-[#b5bac1]`, `border-[#1e1f22]`)
- No new dependencies
- All new `.tsx` files need `"use client"` as first line

---

### Task 1: Update navigation label and fix the existing snapshot test

**Files:**
- Modify: `apps/dashboard/src/app/dashboard-ui.ts`
- Modify: `apps/dashboard/src/app/dashboard-shell.tsx`
- Modify: `apps/dashboard/src/app/dashboard-ui.test.ts`

**Interfaces:**
- Produces: `getDashboardNavItems()` returns item at index 6 with `label: "Settings"` and no `minRole`; `getDashboardNavGroups()` reflects same change

- [ ] **Step 1: Update dashboard-ui.test.ts to expect the new label**

In `apps/dashboard/src/app/dashboard-ui.test.ts`, find the `"returns stable dashboard navigation items"` test and change the expected entry for `/settings`:

```ts
// was: ["/settings", "Access"]
["/settings", "Settings"]
```

Full replacement in the assertion:
```ts
assert.deepEqual(
  getDashboardNavItems().map((item) => [item.href, item.label]),
  [
    ["/", "Overview"],
    ["/voice", "Voice"],
    ["/recruitment", "Recruitment"],
    ["/tts", "TTS"],
    ["/health", "Health"],
    ["/logs", "Logs"],
    ["/settings", "Settings"]   // ← changed from "Access"
  ]
);
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd apps/dashboard && npm test 2>&1 | grep -A3 "stable dashboard navigation"
```

Expected: test fails — `"Access" != "Settings"`.

- [ ] **Step 3: Update dashboard-ui.ts — label and minRole**

In `apps/dashboard/src/app/dashboard-ui.ts`, make two edits:

**In `dashboardNavGroups` (System group):**
```ts
// Before:
{ href: "/settings", label: "Access", description: "Access grants and management roles", minRole: "owner" },
// After:
{ href: "/settings", label: "Settings", description: "Server and personal settings" },
```

**In `dashboardNavItems` (bottom of file):**
```ts
// Before:
{
  description: "Access grants and management roles",
  href: "/settings",
  label: "Access",
  minRole: "owner" as const,
}
// After:
{
  description: "Server and personal settings",
  href: "/settings",
  label: "Settings",
},
```

- [ ] **Step 4: Update dashboard-shell.tsx — swap icon for /settings**

In `apps/dashboard/src/app/dashboard-shell.tsx`, in the `icons` constant:
```ts
// Before:
"/settings": <KeyRound className="h-4 w-4 shrink-0" />,
// After:
"/settings": <Settings className="h-4 w-4 shrink-0" />,
```

`Settings` is already imported from `lucide-react` at line 14. Remove `KeyRound` from the import if it's not used elsewhere (check for other uses first):
```ts
// Remove from import if unused:
KeyRound,
```

- [ ] **Step 5: Run tests and typecheck**

```bash
cd apps/dashboard && npm test 2>&1 | grep -E "(pass|fail|Error)" | head -20
cd apps/dashboard && npm run typecheck 2>&1 | head -20
```

Expected: all tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/app/dashboard-ui.ts \
        apps/dashboard/src/app/dashboard-ui.test.ts \
        apps/dashboard/src/app/dashboard-shell.tsx
git commit -m "feat: rename Access nav item to Settings, open to all roles"
```

---

### Task 2: Open the settings page to all roles

**Files:**
- Modify: `apps/dashboard/src/app/settings/page.tsx`

**Interfaces:**
- Consumes: `getDashboardPageRole(guildId)` returns `"viewer" | "admin" | "owner" | null`
- Produces: `<SettingsPanel guildId={guildId} role={role} />` — `role` prop is new

- [ ] **Step 1: Rewrite settings/page.tsx**

Replace the entire file:

```ts
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getDashboardSession } from "../../auth";
import { getDashboardPageRole } from "../../dashboard-auth";
import { DashboardShell } from "../dashboard-shell";
import { SettingsPanel } from "./settings-panel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getDashboardSession();
  if (!session?.user) redirect("/login");

  const cookieStore = await cookies();
  const guildId = cookieStore.get("dashboard-guild-id")?.value;
  const guildNameRaw = cookieStore.get("dashboard-guild-name")?.value;
  const guildName = guildNameRaw ? decodeURIComponent(guildNameRaw) : null;

  if (!guildId) redirect("/guild");

  const role = await getDashboardPageRole(guildId);

  return (
    <DashboardShell
      currentPath="/settings"
      description="Server and personal settings"
      guildId={guildId}
      guildName={guildName}
      role={role}
      session={session}
      title="Settings"
    >
      <SettingsPanel guildId={guildId} role={role} />
    </DashboardShell>
  );
}
```

Key changes from original:
- Removed `if (role !== "owner") notFound()` — all roles can access
- `role` is passed to `SettingsPanel`
- `title` changed from `"Access"` to `"Settings"`
- `description` updated

- [ ] **Step 2: Typecheck (SettingsPanel doesn't accept role yet — expect an error)**

```bash
cd apps/dashboard && npm run typecheck 2>&1 | grep "settings"
```

Expected: error about `role` prop not existing on `SettingsPanel` — confirms Task 3/8 are needed.

- [ ] **Step 3: Commit (even with type error — it documents intent)**

Actually skip the commit here; commit together with Task 8 when SettingsPanel accepts `role`.

---

### Task 3: PersonalSettingsTab — TTS personal settings + UI language selector

**Files:**
- Create: `apps/dashboard/src/app/settings/components/PersonalSettingsTab.tsx`

**Interfaces:**
- Consumes:
  - `TtsUserPersonalCard({ guildId, guildDefaultSpeakerId })` from `../../tts/components/TtsUserPersonalCard`
  - `TtsUserSettingsModal` from `../../tts/components/TtsUserSettingsModal`
  - `getDashboardLocale`, `detectBrowserLanguage` from `../../../lib/locale`
  - `isGuildLanguage` from `@discord-bot/shared`
- Produces: `<PersonalSettingsTab guildId={string} uiLang={GuildLanguage} onUiLangChange={(lang: GuildLanguage) => void} />`

- [ ] **Step 1: Create PersonalSettingsTab.tsx**

```tsx
"use client";

import type { GuildLanguage } from "@discord-bot/shared";
import { isGuildLanguage } from "@discord-bot/shared";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Select } from "../../../components/ui/select";
import { TtsUserPersonalCard } from "../../tts/components/TtsUserPersonalCard";
import { TtsUserSettingsModal } from "../../tts/components/TtsUserSettingsModal";
import { getDashboardLocale } from "../../../lib/locale";

const UI_LANG_KEY = "dashboard-ui-lang";

interface PersonalSettingsTabProps {
  guildId: string;
  uiLang: GuildLanguage;
  onUiLangChange: (lang: GuildLanguage) => void;
}

export function PersonalSettingsTab({ guildId, uiLang, onUiLangChange }: PersonalSettingsTabProps) {
  const loc = getDashboardLocale(uiLang);

  function handleLangChange(value: string) {
    if (!isGuildLanguage(value)) return;
    localStorage.setItem(UI_LANG_KEY, value);
    onUiLangChange(value);
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>表示言語</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#b5bac1]">
            UI Language
            <Select value={uiLang} onChange={(e) => handleLangChange(e.target.value)}>
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </Select>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{loc.ttsPageTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <TtsUserPersonalCard guildId={guildId} guildDefaultSpeakerId={null} />
          <div className="flex justify-end">
            <TtsUserSettingsModal guildId={guildId} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/dashboard && npm run typecheck 2>&1 | grep "PersonalSettingsTab"
```

Expected: no errors for this file (errors elsewhere from Task 2 unresolved role prop are OK).

---

### Task 4: VoiceSettingsPanel — self-contained voice settings

**Files:**
- Create: `apps/dashboard/src/app/settings/components/VoiceSettingsPanel.tsx`

**Interfaces:**
- Consumes:
  - `fetchSettings`, `updateTempVcSettings`, `toSettingsError` from `../../../lib/settings-api`
  - `VoiceSettingsTab` from `./VoiceSettingsTab`
  - `getDashboardLocale` from `../../../lib/locale`
  - `type DashboardLoc`, `type SettingsResponse` from `./shared`
- Produces: `<VoiceSettingsPanel guildId={string} loc={DashboardLoc} />`

- [ ] **Step 1: Create VoiceSettingsPanel.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { fetchSettings, updateTempVcSettings, toSettingsError } from "../../../lib/settings-api";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { VoiceSettingsTab } from "./VoiceSettingsTab";
import type { DashboardLoc, SettingsResponse } from "./shared";

interface VoiceSettingsPanelProps {
  guildId: string;
  loc: DashboardLoc;
}

export function VoiceSettingsPanel({ guildId, loc }: VoiceSettingsPanelProps) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [createChannelId, setCreateChannelId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings(guildId)
      .then((s) => {
        setSettings(s);
        setCreateChannelId(s.features.tempVc.createChannelId ?? "");
        setCategoryId(s.features.tempVc.categoryId ?? "");
      })
      .catch((e: unknown) => toast.error(toSettingsError(e)));
  }, [guildId]);

  async function save() {
    setSaving(true);
    try {
      const updated = await updateTempVcSettings(guildId, createChannelId, categoryId);
      setSettings(updated);
      toast.success("Voice設定を保存しました。");
    } catch (e) {
      toast.error(toSettingsError(e));
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <VoiceSettingsTab
        settings={settings}
        tempVcCreateChannelId={createChannelId}
        tempVcCategoryId={categoryId}
        loc={loc}
        onTempVcCreateChannelIdChange={setCreateChannelId}
        onTempVcCategoryIdChange={setCategoryId}
      />
      <div className="flex justify-end">
        <Button disabled={saving} onClick={() => void save()} size="sm" type="button">
          <Save className="h-3.5 w-3.5" />
          {saving ? loc.saving : loc.saveChanges}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/dashboard && npm run typecheck 2>&1 | grep "VoiceSettingsPanel"
```

Expected: no errors for this file.

---

### Task 5: RecruitmentSettingsPanel — self-contained recruitment settings

**Files:**
- Create: `apps/dashboard/src/app/settings/components/RecruitmentSettingsPanel.tsx`

**Interfaces:**
- Consumes:
  - `fetchSettings`, `updateRecruitmentSettings`, `toSettingsError` from `../../../lib/settings-api`
  - `RecruitmentSettingsTab` from `./RecruitmentSettingsTab`
  - `type DashboardLoc`, `type SettingsResponse` from `./shared`
- Produces: `<RecruitmentSettingsPanel guildId={string} loc={DashboardLoc} />`

- [ ] **Step 1: Create RecruitmentSettingsPanel.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { fetchSettings, updateRecruitmentSettings, toSettingsError } from "../../../lib/settings-api";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { RecruitmentSettingsTab } from "./RecruitmentSettingsTab";
import type { DashboardLoc, SettingsResponse } from "./shared";

interface RecruitmentSettingsPanelProps {
  guildId: string;
  loc: DashboardLoc;
}

export function RecruitmentSettingsPanel({ guildId, loc }: RecruitmentSettingsPanelProps) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [channelId, setChannelId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings(guildId)
      .then((s) => {
        setSettings(s);
        setChannelId(s.features.recruitment.channelId ?? "");
      })
      .catch((e: unknown) => toast.error(toSettingsError(e)));
  }, [guildId]);

  async function save() {
    setSaving(true);
    try {
      const updated = await updateRecruitmentSettings(guildId, { channelId: channelId || null });
      setSettings(updated);
      toast.success("募集設定を保存しました。");
    } catch (e) {
      toast.error(toSettingsError(e));
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <RecruitmentSettingsTab
        settings={settings}
        recruitmentChannelId={channelId}
        loc={loc}
        onRecruitmentChannelIdChange={setChannelId}
      />
      <div className="flex justify-end">
        <Button disabled={saving} onClick={() => void save()} size="sm" type="button">
          <Save className="h-3.5 w-3.5" />
          {saving ? loc.saving : loc.saveChanges}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/dashboard && npm run typecheck 2>&1 | grep "RecruitmentSettingsPanel"
```

Expected: no errors for this file.

---

### Task 6: LogsSettingsPanel — self-contained logs settings

**Files:**
- Create: `apps/dashboard/src/app/settings/components/LogsSettingsPanel.tsx`

**Interfaces:**
- Consumes:
  - `fetchSettings`, `updateSettings`, `toSettingsError` from `../../../lib/settings-api`
  - `LogsSettingsTab` from `./LogsSettingsTab`
  - `isGuildLanguage` from `@discord-bot/shared`
  - `type DashboardLoc` from `./shared`
- Produces: `<LogsSettingsPanel guildId={string} loc={DashboardLoc} onUiLangChange={(lang) => void} />`

- [ ] **Step 1: Create LogsSettingsPanel.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { GuildLanguage } from "@discord-bot/shared";
import { isGuildLanguage } from "@discord-bot/shared";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { fetchSettings, updateSettings, toSettingsError } from "../../../lib/settings-api";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { LogsSettingsTab } from "./LogsSettingsTab";
import type { DashboardLoc } from "./shared";

interface LogsSettingsPanelProps {
  guildId: string;
  loc: DashboardLoc;
  onUiLangChange: (lang: GuildLanguage) => void;
}

export function LogsSettingsPanel({ guildId, loc, onUiLangChange }: LogsSettingsPanelProps) {
  const [logMode, setLogMode] = useState("full");
  const [language, setLanguage] = useState("en");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const logModeOptions = [
    { label: loc.logModeFull, value: "full" },
    { label: loc.logModeMetadataOnly, value: "metadata_only" },
    { label: loc.logModeDisabled, value: "disabled" },
  ];
  const languageOptions = [
    { label: loc.languageEn, value: "en" },
    { label: loc.languageJa, value: "ja" },
  ];

  useEffect(() => {
    fetchSettings(guildId)
      .then((s) => {
        setLogMode(s.logMode);
        setLanguage(s.language);
        setLoaded(true);
      })
      .catch((e: unknown) => toast.error(toSettingsError(e)));
  }, [guildId]);

  async function save() {
    setSaving(true);
    try {
      const updated = await updateSettings(guildId, logMode, language);
      setLogMode(updated.logMode);
      setLanguage(updated.language);
      toast.success(loc.settingsSaved);
    } catch (e) {
      toast.error(toSettingsError(e));
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <LogsSettingsTab
        logMode={logMode}
        language={language}
        logModeOptions={logModeOptions}
        languageOptions={languageOptions}
        loc={loc}
        onLogModeChange={setLogMode}
        onLanguageChange={setLanguage}
        onUiLangChange={(val) => {
          if (isGuildLanguage(val)) onUiLangChange(val);
        }}
      />
      <div className="flex justify-end">
        <Button disabled={saving} onClick={() => void save()} size="sm" type="button">
          <Save className="h-3.5 w-3.5" />
          {saving ? loc.saving : loc.saveChanges}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/dashboard && npm run typecheck 2>&1 | grep "LogsSettingsPanel"
```

Expected: no errors for this file.

---

### Task 7: TtsSettingsPanel — self-contained TTS server settings

**Files:**
- Create: `apps/dashboard/src/app/settings/components/TtsSettingsPanel.tsx`

**Interfaces:**
- Consumes:
  - `fetchSettings`, `updateTtsSettings`, `toSettingsError` from `../../../lib/settings-api`
  - `useTtsSettings` from `../hooks/useTtsSettings`
  - `TtsSettingsTab` from `./TtsSettingsTab`
  - `type DashboardLoc`, `type SettingsResponse` from `./shared`
- Produces: `<TtsSettingsPanel guildId={string} loc={DashboardLoc} />`

- [ ] **Step 1: Create TtsSettingsPanel.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { fetchSettings, updateTtsSettings, toSettingsError } from "../../../lib/settings-api";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { TtsSettingsTab } from "./TtsSettingsTab";
import { useTtsSettings } from "../hooks/useTtsSettings";
import type { DashboardLoc, SettingsResponse } from "./shared";

interface TtsSettingsPanelProps {
  guildId: string;
  loc: DashboardLoc;
}

export function TtsSettingsPanel({ guildId, loc }: TtsSettingsPanelProps) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [ttsTextChannelId, setTtsTextChannelId] = useState("");
  const [savingChannel, setSavingChannel] = useState(false);

  const tts = useTtsSettings(guildId, loc);

  useEffect(() => {
    fetchSettings(guildId)
      .then((s) => {
        setSettings(s);
        setTtsTextChannelId(s.features.tts.textChannelId ?? "");
      })
      .catch((e: unknown) => toast.error(toSettingsError(e)));
  }, [guildId]);

  async function saveTextChannel() {
    setSavingChannel(true);
    try {
      const updated = await updateTtsSettings(guildId, ttsTextChannelId);
      setSettings(updated);
      toast.success(loc.ttsSettingsSaved);
    } catch (e) {
      toast.error(toSettingsError(e));
    } finally {
      setSavingChannel(false);
    }
  }

  if (!settings) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  const canEditTts = settings.accessRole !== "viewer";

  return (
    <div className="grid gap-4">
      <TtsSettingsTab
        settings={settings}
        ttsSettings={tts.ttsSettings}
        ttsTextChannelId={ttsTextChannelId}
        ttsDefaultSpeakerId={tts.ttsDefaultSpeakerId}
        ttsUserSpeakerUserId={tts.ttsUserSpeakerUserId}
        ttsUserSpeakerId={tts.ttsUserSpeakerId}
        ttsDictionaryScope={tts.ttsDictionaryScope}
        ttsDictionaryUserId={tts.ttsDictionaryUserId}
        ttsDictionaryFromText={tts.ttsDictionaryFromText}
        ttsDictionaryToText={tts.ttsDictionaryToText}
        ttsDictionaryPriority={tts.ttsDictionaryPriority}
        ttsDictionaryEnabled={tts.ttsDictionaryEnabled}
        canEditTts={canEditTts}
        savingTtsDictionary={tts.savingTtsDictionary}
        savingTtsSpeaker={tts.savingTtsSpeaker}
        loc={loc}
        onTtsTextChannelIdChange={setTtsTextChannelId}
        onTtsDefaultSpeakerIdChange={tts.setTtsDefaultSpeakerId}
        onTtsUserSpeakerUserIdChange={tts.setTtsUserSpeakerUserId}
        onTtsUserSpeakerIdChange={tts.setTtsUserSpeakerId}
        onTtsDictionaryScopeChange={tts.setTtsDictionaryScope}
        onTtsDictionaryUserIdChange={tts.setTtsDictionaryUserId}
        onTtsDictionaryFromTextChange={tts.setTtsDictionaryFromText}
        onTtsDictionaryToTextChange={tts.setTtsDictionaryToText}
        onTtsDictionaryPriorityChange={tts.setTtsDictionaryPriority}
        onTtsDictionaryEnabledChange={tts.setTtsDictionaryEnabled}
        onSaveTtsDefaultSpeaker={() => void tts.saveTtsDefaultSpeaker()}
        onSaveTtsUserSpeaker={() => void tts.saveTtsUserSpeaker()}
        onDeleteTtsSpeaker={(input) => void tts.deleteTtsSpeaker(input)}
        onSaveTtsDictionaryEntry={() => void tts.saveTtsDictionaryEntry()}
        onDeleteTtsDictionary={(entry) => void tts.deleteTtsDictionary(entry)}
      />
      <div className="flex justify-end">
        <Button disabled={savingChannel || !canEditTts} onClick={() => void saveTextChannel()} size="sm" type="button">
          <Save className="h-3.5 w-3.5" />
          {savingChannel ? loc.saving : loc.saveTtsSettings}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/dashboard && npm run typecheck 2>&1 | grep "TtsSettingsPanel"
```

Expected: no errors for this file.

---

### Task 8: SettingsPanel — add tab UI and wire all panels

**Files:**
- Modify: `apps/dashboard/src/app/settings/settings-panel.tsx`

**Interfaces:**
- Consumes:
  - `PersonalSettingsTab` from `./components/PersonalSettingsTab`
  - `VoiceSettingsPanel` from `./components/VoiceSettingsPanel`
  - `TtsSettingsPanel` from `./components/TtsSettingsPanel`
  - `RecruitmentSettingsPanel` from `./components/RecruitmentSettingsPanel`
  - `LogsSettingsPanel` from `./components/LogsSettingsPanel`
  - `canSeeItem` from `../../lib/roles`
  - `isGuildLanguage` from `@discord-bot/shared`
- Produces: `<SettingsPanel guildId={string} role?={role} />` — accepts the new `role` prop

- [ ] **Step 1: Rewrite settings-panel.tsx**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import type { GuildLanguage } from "@discord-bot/shared";
import { isGuildLanguage } from "@discord-bot/shared";
import { getDashboardLocale, detectBrowserLanguage } from "../../lib/locale";
import { fetchSettings, toSettingsError } from "../../lib/settings-api";
import { canSeeItem } from "../../lib/roles";
import { AccessGrantsTab } from "./components/AccessGrantsTab";
import { PersonalSettingsTab } from "./components/PersonalSettingsTab";
import { VoiceSettingsPanel } from "./components/VoiceSettingsPanel";
import { TtsSettingsPanel } from "./components/TtsSettingsPanel";
import { RecruitmentSettingsPanel } from "./components/RecruitmentSettingsPanel";
import { LogsSettingsPanel } from "./components/LogsSettingsPanel";
import { ErrorAlert } from "../../components/error-alert";
import { LoadingSpinner } from "../../components/loading-spinner";
import { useAccessGrants } from "./hooks/useAccessGrants";
import type { SettingsResponse } from "./components/shared";

export type { SettingsResponse };

const UI_LANG_KEY = "dashboard-ui-lang";

interface Tab {
  key: string;
  label: string;
  minRole?: "admin" | "owner";
}

const ALL_TABS: Tab[] = [
  { key: "personal",    label: "個人設定" },
  { key: "voice",       label: "Voice",       minRole: "admin" },
  { key: "tts",         label: "TTS",         minRole: "admin" },
  { key: "recruitment", label: "Recruitment",  minRole: "admin" },
  { key: "logs",        label: "Logs",         minRole: "admin" },
  { key: "access",      label: "Access",       minRole: "owner" },
];

export function SettingsPanel({
  guildId,
  role,
}: {
  guildId: string;
  role?: "viewer" | "admin" | "owner" | null;
}) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("personal");

  const loc = getDashboardLocale(uiLang);
  const isOwner = settings?.accessRole === "owner";
  const access = useAccessGrants(settings?.guildId ?? null, isOwner, loc);

  const visibleTabs = ALL_TABS.filter((tab) => canSeeItem(tab.minRole, role));

  useEffect(() => {
    const stored = localStorage.getItem(UI_LANG_KEY);
    if (isGuildLanguage(stored ?? "")) setUiLang(stored as GuildLanguage);
    else setUiLang(detectBrowserLanguage());
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    fetchSettings(guildId)
      .then((data) => {
        setSettings(data);
        access.initManagementRoles(data.dashboardManagementRoleIds);
      })
      .catch((e: unknown) => setLoadError(toSettingsError(e)))
      .finally(() => setLoading(false));
  }, [guildId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner />;

  if (!settings) {
    return <ErrorAlert message={loadError ?? loc.failedToLoadSettings} onRetry={load} />;
  }

  return (
    <section className="max-w-3xl grid gap-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[#1e1f22]">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-md ${
              activeTab === tab.key
                ? "border-b-2 border-[#5865f2] text-[#c9cdfb]"
                : "text-[#b5bac1] hover:text-[#dbdee1]"
            }`}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "personal" && (
        <PersonalSettingsTab
          guildId={guildId}
          uiLang={uiLang}
          onUiLangChange={setUiLang}
        />
      )}
      {activeTab === "voice" && <VoiceSettingsPanel guildId={guildId} loc={loc} />}
      {activeTab === "tts" && <TtsSettingsPanel guildId={guildId} loc={loc} />}
      {activeTab === "recruitment" && <RecruitmentSettingsPanel guildId={guildId} loc={loc} />}
      {activeTab === "logs" && (
        <LogsSettingsPanel
          guildId={guildId}
          loc={loc}
          onUiLangChange={setUiLang}
        />
      )}
      {activeTab === "access" && (
        <AccessGrantsTab
          settings={settings}
          accessGrants={access.accessGrants}
          grantTargetType={access.grantTargetType}
          grantTargetId={access.grantTargetId}
          managementRoleIds={access.managementRoleIds}
          savingGrant={access.savingGrant}
          savingRoles={access.savingRoles}
          deletingGrantKey={access.deletingGrantKey}
          confirmRoleRemoval={access.confirmRoleRemoval}
          loc={loc}
          onGrantTargetTypeChange={access.setGrantTargetType}
          onGrantTargetIdChange={access.setGrantTargetId}
          onManagementRoleChange={(id, checked) => {
            access.setManagementRoleIds((prev) =>
              checked ? [...prev, id] : prev.filter((x) => x !== id)
            );
          }}
          onSaveAccessGrant={() => void access.saveAccessGrant()}
          onDeleteAccessGrant={(grant) => void access.deleteAccessGrant(grant)}
          onUpdateAccessGrantRole={(grant, r) => void access.updateAccessGrantRole(grant, r)}
          onRequestSaveManagementRoles={access.requestSaveManagementRoles}
          onConfirmRoleRemoval={() => void access.doSaveManagementRoles()}
          onCancelRoleRemoval={() => access.setConfirmRoleRemoval(false)}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 2: Run full typecheck**

```bash
cd apps/dashboard && npm run typecheck 2>&1
```

Expected: no errors. If errors appear, fix them before proceeding.

Common issues to check:
- `TtsUserSettingsModal` export name — verify it is a named export matching that exact name in `apps/dashboard/src/app/tts/components/TtsUserSettingsModal.tsx`
- `isGuildLanguage` may need to be imported from `@discord-bot/shared` — confirm the package exports it
- `loc.ttsPageTitle` and `loc.settingsSaved` — both defined in `locale.ts` type, safe to use

- [ ] **Step 3: Run full test suite**

```bash
cd apps/dashboard && npm test 2>&1
```

Expected: all tests pass.

- [ ] **Step 4: Commit everything**

```bash
git add \
  apps/dashboard/src/app/settings/page.tsx \
  apps/dashboard/src/app/settings/settings-panel.tsx \
  apps/dashboard/src/app/settings/components/PersonalSettingsTab.tsx \
  apps/dashboard/src/app/settings/components/VoiceSettingsPanel.tsx \
  apps/dashboard/src/app/settings/components/TtsSettingsPanel.tsx \
  apps/dashboard/src/app/settings/components/RecruitmentSettingsPanel.tsx \
  apps/dashboard/src/app/settings/components/LogsSettingsPanel.tsx
git commit -m "feat: settings page tabbed UI with role-based access"
```

---

## Self-Review

**Spec coverage:**
- ✅ Nav label "Access" → "Settings"
- ✅ Nav item `minRole: "owner"` removed
- ✅ Icon change `KeyRound` → `Settings`
- ✅ Settings page open to all roles (removed `notFound`)
- ✅ viewer sees only 個人設定 tab
- ✅ admin sees 個人設定 + Voice/TTS/Recruitment/Logs
- ✅ owner sees all tabs including Access
- ✅ PersonalSettingsTab: TTS personal settings (TtsUserPersonalCard + TtsUserSettingsModal)
- ✅ PersonalSettingsTab: UI language selector (localStorage-backed)
- ✅ UI language change propagates to parent SettingsPanel → updates `loc` for all server tabs

**Placeholder scan:** No TBD/TODO found.

**Type consistency:**
- `PersonalSettingsTab` props: `{ guildId: string; uiLang: GuildLanguage; onUiLangChange: (lang: GuildLanguage) => void }` — matches usage in Task 8 ✅
- `VoiceSettingsPanel` props: `{ guildId: string; loc: DashboardLoc }` — matches ✅
- `TtsSettingsPanel` props: `{ guildId: string; loc: DashboardLoc }` — matches ✅
- `RecruitmentSettingsPanel` props: `{ guildId: string; loc: DashboardLoc }` — matches ✅
- `LogsSettingsPanel` props: `{ guildId: string; loc: DashboardLoc; onUiLangChange: (lang: GuildLanguage) => void }` — matches ✅
- `SettingsPanel` new prop: `role?: "viewer" | "admin" | "owner" | null` — matches `settings/page.tsx` call ✅
- `canSeeItem(tab.minRole, role)` — `tab.minRole` is `"admin" | "owner" | undefined`, `role` is `"viewer" | "admin" | "owner" | null | undefined` — matches `roles.ts` signature ✅
