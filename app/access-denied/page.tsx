import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="text-slate-700">You do not have permission to access this resource.</p>
      <Link href="/" className="inline-block rounded bg-black px-4 py-2 text-white">
        Return to home
      </Link>
    </main>
  );
}
