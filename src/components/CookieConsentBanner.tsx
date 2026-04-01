import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'celsius-cookie-consent';

type ConsentStatus = 'accepted' | 'rejected' | 'essential-only' | null;

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<ConsentStatus>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentStatus;
    if (!stored) {
      setVisible(true);
    } else {
      setConsent(stored);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setConsent('accepted');
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'essential-only');
    setConsent('essential-only');
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    setConsent('rejected');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4">
      <div className="max-w-3xl mx-auto bg-card border border-border rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <p className="text-sm text-foreground/90">
            We use cookies to provide essential functionality, analyze usage, and improve your experience.
            Read our <Link to="/cookies" className="text-primary hover:underline">Cookie Policy</Link> and{' '}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for details.
          </p>
          <button onClick={handleReject} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleAcceptAll}>Accept All</Button>
          <Button size="sm" variant="outline" onClick={handleEssentialOnly}>Essential Only</Button>
          <Button size="sm" variant="ghost" onClick={handleReject}>Reject All</Button>
        </div>
      </div>
    </div>
  );
}
