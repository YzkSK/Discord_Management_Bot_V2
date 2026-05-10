const phase0Items = [
  "Workspace",
  "Config validation",
  "Database schema",
  "Docker Compose",
  "CI checks",
  "Issue workflow"
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="border-b border-slate-700 pb-5">
          <p className="text-sm uppercase tracking-wide text-cyan-300">
            Phase0 Foundation
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            Discord Integrated Management Bot
          </h1>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {phase0Items.map((item) => (
            <div
              className="rounded border border-slate-700 bg-slate-900 p-4"
              key={item}
            >
              <p className="text-sm text-slate-300">{item}</p>
            </div>
          ))}
        </div>

        <a
          className="inline-flex h-11 w-fit items-center border border-teal-500 px-4 text-sm font-semibold text-teal-200 hover:bg-teal-500 hover:text-slate-950"
          href="/logs"
        >
          Open Logs
        </a>
      </section>
    </main>
  );
}
