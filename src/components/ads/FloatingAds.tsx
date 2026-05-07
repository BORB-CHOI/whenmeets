'use client';

import { usePathname } from 'next/navigation';
import AdSlot from './AdSlot';

const MOBILE_AD_HEIGHT_PX = 100;
const DESKTOP_SIDE_AD_WIDTH_PX = 160;
const DESKTOP_SIDE_AD_HEIGHT_PX = 600;

/**
 * Floating ad container. Renders only when the matching slot env var is set.
 *
 * Layout:
 * - Desktop (2xl, 1536px+): bottom-left and bottom-right vertical 160x600 units.
 *   Hidden below 2xl because narrower screens don't have enough gutter beside
 *   max-w-6xl (1152px) main content to avoid overlap.
 * - Mobile (<lg, 1024px): horizontal banner pinned to the bottom of the
 *   viewport. Hidden on /e/[id] where MobileBottomBar already occupies that
 *   spot — the editing controls there are functional, not optional.
 *
 * The mobile banner injects a body-level padding-bottom so footer + main
 * content scroll fully into view above the ad instead of being covered by it.
 */
export default function FloatingAds() {
  const pathname = usePathname() ?? '';
  const desktopLeft = process.env.NEXT_PUBLIC_ADSENSE_SLOT_DESKTOP_LEFT;
  const desktopRight = process.env.NEXT_PUBLIC_ADSENSE_SLOT_DESKTOP_RIGHT;
  const mobileBottom = process.env.NEXT_PUBLIC_ADSENSE_SLOT_MOBILE_BOTTOM;

  // Avoid stacking two fixed bottom bars on the event page where MobileBottomBar lives.
  const isEventPage = pathname.startsWith('/e/');
  const showMobileBottom = !isEventPage && !!mobileBottom;

  return (
    <>
      {desktopLeft && (
        <aside
          aria-label="광고"
          className="hidden 2xl:block fixed bottom-4 left-4 z-30 pointer-events-auto"
          style={{ width: DESKTOP_SIDE_AD_WIDTH_PX }}
        >
          <AdSlot
            slot={desktopLeft}
            format="vertical"
            responsive={false}
            style={{ width: DESKTOP_SIDE_AD_WIDTH_PX, height: DESKTOP_SIDE_AD_HEIGHT_PX }}
          />
        </aside>
      )}

      {desktopRight && (
        <aside
          aria-label="광고"
          className="hidden 2xl:block fixed bottom-4 right-4 z-30 pointer-events-auto"
          style={{ width: DESKTOP_SIDE_AD_WIDTH_PX }}
        >
          <AdSlot
            slot={desktopRight}
            format="vertical"
            responsive={false}
            style={{ width: DESKTOP_SIDE_AD_WIDTH_PX, height: DESKTOP_SIDE_AD_HEIGHT_PX }}
          />
        </aside>
      )}

      {showMobileBottom && (
        <>
          <aside
            aria-label="광고"
            className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <AdSlot
              slot={mobileBottom!}
              format="horizontal"
              responsive={true}
              style={{
                display: 'block',
                width: '100%',
                height: MOBILE_AD_HEIGHT_PX,
              }}
            />
          </aside>
          {/* Reserve scroll room equal to the ad height so footer + content are
              never covered. Scoped to the same breakpoint as the banner. */}
          <style>{`
            @media (max-width: 1023.98px) {
              body { padding-bottom: calc(${MOBILE_AD_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px)); }
            }
          `}</style>
        </>
      )}
    </>
  );
}
