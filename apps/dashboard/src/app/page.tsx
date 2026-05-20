import { redirect } from "next/navigation";

import { getDashboardSession } from "../auth";

import { DashboardShell } from "./dashboard-shell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getDashboardSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardShell
      currentPath="/"
      description="動作確認に必要な入口をまとめた運用コンソールです。まずGuild IDを確認し、LogsとSettingsを往復して機能ごとの挙動を見ます。"
      eyebrow="Phase6 UI/UX"
      session={session}
      title="Operations Overview"
    >
      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded border border-slate-800 bg-slate-950/60 p-5">
          <h2 className="text-lg font-semibold text-white">Verification Flow</h2>
          <div className="mt-4 grid gap-3">
            <OverviewStep
              body="Discord側で /setup logs、/setup temp-vc、/setup recruitment を実行して検証対象を作ります。"
              index="1"
              title="Setup from Discord"
            />
            <OverviewStep
              body="LogsでGuild IDを入れて、message、voice、audit、temp-vc、recruitment系イベントを確認します。"
              index="2"
              title="Watch Logs"
            />
            <OverviewStep
              body="Settingsで対象Guildのアクセス権限とログ設定を確認します。"
              index="3"
              title="Review Settings"
            />
          </div>
        </section>

        <section className="rounded border border-slate-800 bg-slate-950/60 p-5">
          <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
          <div className="mt-4 grid gap-3">
            <QuickAction
              body="イベント検索、realtime状態、payload詳細を確認します。"
              href="/logs"
              title="Open Logs"
            />
            <QuickAction
              body="Guild設定、アクセス権限、log modeを確認します。"
              href="/settings"
              title="Open Settings"
            />
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function OverviewStep({
  body,
  index,
  title
}: {
  body: string;
  index: string;
  title: string;
}) {
  return (
    <div className="grid grid-cols-[36px_1fr] gap-3 rounded border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded bg-teal-500 text-sm font-bold text-slate-950">
        {index}
      </div>
      <div>
        <h3 className="font-semibold text-slate-100">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p>
      </div>
    </div>
  );
}

function QuickAction({
  body,
  href,
  title
}: {
  body: string;
  href: string;
  title: string;
}) {
  return (
    <a
      className="block rounded border border-slate-800 bg-slate-900/60 p-4 hover:border-teal-500"
      href={href}
    >
      <h3 className="font-semibold text-teal-100">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p>
    </a>
  );
}
