import Link from "next/link";
import VoiceAgent from "@/components/VoiceAgent";

export default function Home() {
  const phone = process.env.NEXT_PUBLIC_AGENT_PHONE_NUMBER;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-4 py-12">
      <header className="text-center">
        <p className="text-sm uppercase tracking-widest text-sky-700 dark:text-sky-400">ElevenAgents demo</p>
        <h1 className="mt-2 text-3xl font-semibold">Oneroa Bay Kayaks</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-300">
          A voice agent that checks availability and books guided kayak trips on Waiheke Island. Talk to it here
          {phone ? (
            <>
              {" "}or call{" "}
              <a className="font-medium text-sky-700 underline dark:text-sky-400" href={`tel:${phone.replace(/\s/g, "")}`}>
                {phone}
              </a>
            </>
          ) : null}
          .
        </p>
      </header>

      <VoiceAgent />

      <p className="max-w-xl text-center text-sm text-zinc-500">
        Try: &ldquo;Can I book two kayaks for this Saturday afternoon?&rdquo; Sessions run at 9am, 12pm and 3pm, eight kayaks
        each. This is a demo business; no real bookings are made.
      </p>

      <nav className="flex gap-6 text-sm">
        <Link href="/calls" className="text-sky-700 underline dark:text-sky-400">
          Call log
        </Link>
        <a href="https://github.com/atodev/oneroa-voice-agent" className="text-sky-700 underline dark:text-sky-400">
          Source on GitHub
        </a>
      </nav>
    </main>
  );
}
