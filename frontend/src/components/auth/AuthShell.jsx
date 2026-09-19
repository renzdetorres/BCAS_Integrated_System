export default function AuthShell({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-4 sm:p-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-card md:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-forest p-10 text-white md:flex">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.5) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.35) 0, transparent 45%)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,48,36,0.15),rgba(18,48,36,0.85))]"
            aria-hidden="true"
          />
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gold bg-white/10 text-lg font-extrabold text-gold">
                B
              </span>
              <span className="text-2xl font-extrabold tracking-wide">BCAS</span>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-white/80">
              Integrated Scholarship and Admissions Application Screening System
            </p>
          </div>
          <p className="relative z-10 italic text-sm text-white/85">
            "Your journey begins here. We make admissions and scholarship simple and efficient."
          </p>
        </div>

        <div className="flex flex-col justify-center p-8 sm:p-10">{children}</div>
      </div>
    </main>
  );
}
