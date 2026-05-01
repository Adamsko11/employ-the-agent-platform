import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-xs tracking-[0.2em] text-brass uppercase mb-4">EMPLOY THE AGENT</p>
      <h1 className="text-4xl md:text-6xl font-bold text-white max-w-3xl">
        Watch your agents work.
      </h1>
      <p className="mt-6 max-w-xl text-white/70">
        Multi-tenant operations and ROI dashboard for AI agents employed across your business.
      </p>
      <div className="mt-10 flex gap-4">
        <Link href="/login" className="px-6 py-3 rounded-lg bg-brass text-white font-medium hover:bg-brass-deep transition">
          Sign in
        </Link>
        <a href="https://employtheagent.com" className="px-6 py-3 rounded-lg border border-white/20 text-white/80 hover:bg-white/5 transition">
          Learn more
        </a>
      </div>
    </main>
  );
}
