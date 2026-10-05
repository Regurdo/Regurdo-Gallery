/**
 * Site footer. Rendered per page (not in the root layout) so each view can
 * control the center hint and the right-side counters, matching the
 * reference design:
 *   grid view:  "© 2025 REGURDO" · "20 FOTO DITAMPILKAN" · "20 KARYA"
 *   list view:  "© 2025 REGURDO" · "↑ ↓ BERPINDAH FOTO · KLIK FOTO …" · "20 KARYA"
 */
export function SiteFooter({
  center = "\u2191 \u2193 Berpindah foto \u00b7 Klik foto untuk perbesar",
  right,
}: {
  center?: string;
  right?: string;
}) {
  return (
    <footer className="mt-auto border-t border-line bg-background">
      <div className="flex flex-col items-center justify-between gap-1.5 px-4 py-4 sm:flex-row md:px-6">
        <p className="label-caps !text-[9px] text-faint">
          &copy; {new Date().getFullYear()} Regurdo
        </p>

        <p className="label-caps order-last text-center !text-[9px] text-faint sm:order-none">
          {center}
        </p>

        <p className="label-caps !text-[9px] text-faint">{right ?? "0 Karya"}</p>
      </div>
    </footer>
  );
}
