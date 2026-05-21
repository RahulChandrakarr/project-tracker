/**
 * Brand assets. Plain <img> (the logos are small transparent PNGs, no need for
 * the image optimizer). Size with a className height, e.g. `h-8 w-auto`.
 */

/** Full "NJ DesignPark Tracker" lockup. */
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="NJ DesignPark Tracker" className={className} />
  );
}

/** Square "NJ" tile only, for compact spots. */
export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-mark.png" alt="NJ DesignPark" className={className} />
  );
}
