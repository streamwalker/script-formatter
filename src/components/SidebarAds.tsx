import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

/* ─────────────────── Fallback Card ─────────────────── */
const AdFallback = () => (
  <div className="rounded-lg border border-border bg-card p-4 text-center space-y-2">
    <Sparkles className="h-5 w-5 mx-auto text-primary" />
    <p className="text-sm font-semibold text-foreground">Support Astralonaut Studios</p>
    <p className="text-xs text-muted-foreground">Help us keep creating amazing stories & tools.</p>
    <a
      href="https://script-formatter.lovable.app"
      className="inline-block mt-1 text-xs font-medium text-primary hover:underline"
    >
      Learn more →
    </a>
  </div>
);

/* ─────────────────── AdSense Unit ─────────────────── */
const AdSenseUnit = ({ slot, format = 'auto' }: { slot?: string; format?: string }) => {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      setIsBlocked(true);
      return;
    }

    const timer = setTimeout(() => {
      if (!window.adsbygoogle || (adRef.current && adRef.current.offsetHeight === 0)) {
        setIsBlocked(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isBlocked) return <AdFallback />;

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client="ca-pub-4031739871952197"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
};

/* ─────────────────── Stagger Wrapper ─────────────────── */
const StaggeredAd = ({ children, index }: { children: React.ReactNode; index: number }) => (
  <div className="animate-stagger-in" style={{ animationDelay: `${index * 150}ms` }}>
    {children}
  </div>
);

/* ─────────────────── Sidebar Composites ─────────────────── */

export const LeftSidebarAds = () => (
  <div className="space-y-4 w-[180px]">
    <StaggeredAd index={0}><AdSenseUnit /></StaggeredAd>
    <StaggeredAd index={1}><AdSenseUnit /></StaggeredAd>
  </div>
);

export const RightSidebarAds = () => (
  <div className="space-y-4 w-[180px]">
    <StaggeredAd index={0}><AdSenseUnit /></StaggeredAd>
    <StaggeredAd index={1}><AdSenseUnit /></StaggeredAd>
  </div>
);

export const BottomPicPoppitAds = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto px-4 py-8">
    <StaggeredAd index={0}><AdSenseUnit /></StaggeredAd>
    <StaggeredAd index={1}><AdSenseUnit /></StaggeredAd>
  </div>
);
