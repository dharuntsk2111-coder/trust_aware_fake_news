export default function Section({ title, colour = "var(--color-accent)", children }) {
  return (
    <section className="border border-rule bg-card">
      <div
        className="flex items-center gap-3 border-b-2 border-rule-strong px-4 py-3 sm:px-6"
        style={{ background: "color-mix(in srgb, var(--color-paper) 55%, white)" }}
      >
        <span className="h-[17px] w-[3px] shrink-0" style={{ background: colour }} />
        <h2 className="text-[16px] font-semibold tracking-[-0.01em] sm:text-[17px]">
          {title}
        </h2>
      </div>
      <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}
