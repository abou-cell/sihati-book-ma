export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-slate-500 sm:px-6 lg:px-8">
        © {new Date().getFullYear()} Sihati. All rights reserved.
      </div>
    </footer>
  );
}
