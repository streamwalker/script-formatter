import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EULADialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export function EULADialog({ isOpen, onClose, onAccept }: EULADialogProps) {
  const [hasReadToBottom, setHasReadToBottom] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 20) {
      setHasReadToBottom(true);
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-lg">End-User License Agreement</DialogTitle>
          <p className="text-xs text-muted-foreground">Please read the entire agreement. You must scroll to the bottom to accept.</p>
        </DialogHeader>

        <div
          ref={viewportRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto pr-2 text-xs text-foreground/85 leading-relaxed space-y-4 max-h-[55vh]"
        >
          <p className="font-semibold">Celsius — End-User License Agreement</p>
          <p>Last updated: March 9, 2026</p>

          <p>By creating an account on the Celsius platform ("Service"), operated by Celsius Inc. ("Company"), you ("User") agree to be bound by this End-User License Agreement ("EULA"). If you do not agree, you may not create an account or use the Service.</p>

          <p className="font-semibold mt-4">1. LICENSE GRANT</p>
          <p>The Company grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for personal or internal business purposes, subject to this EULA and all applicable policies.</p>

          <p className="font-semibold mt-4">2. USER CONTENT & INTELLECTUAL PROPERTY</p>
          <p>You retain ownership of content you create. By using the Service, you grant the Company a worldwide, non-exclusive, royalty-free license to use your content solely to operate and improve the Service. AI-generated content may be similar to content generated for other users. You are responsible for reviewing generated content before use.</p>

          <p className="font-semibold mt-4">3. PROHIBITED CONDUCT</p>
          <p>You may not: use the Service for illegal purposes; generate CSAM, deepfakes, or non-consensual imagery; harass others; upload malware; attempt unauthorized access; reverse engineer the Service; use automated scraping tools; or create competing products using the Service.</p>

          <p className="font-semibold mt-4">4. AI-GENERATED CONTENT</p>
          <p>You acknowledge that: (a) AI outputs may contain errors and require review; (b) similar content may be generated for other users; (c) you must comply with our Acceptable Use Policy when using AI features; (d) you are responsible for ensuring generated content does not infringe third-party rights; and (e) the Company makes no guarantees regarding intellectual property ownership of AI-generated content.</p>

          <p className="font-semibold mt-4">5. PRIVACY & DATA PROTECTION</p>
          <p>Your personal data is processed in accordance with our Privacy Policy, GDPR, CCPA, and applicable data protection laws. You have rights to access, rectify, erase, port, and object to processing of your data. See our Privacy Policy for details.</p>

          <p className="font-semibold mt-4">6. PAYMENT & BILLING</p>
          <p>Paid features are billed as specified at purchase. Payments are processed through PCI-DSS Level 1 compliant processors. Fees are non-refundable except as required by law. Pricing changes require 30 days' notice.</p>

          <p className="font-semibold mt-4">7. ACCOUNT SECURITY</p>
          <p>You are responsible for maintaining the security of your account credentials. Notify us immediately of any unauthorized access. We implement industry-standard security measures including encryption, MFA, and regular audits per our SOC 2 Type II and ISO 27001 certifications.</p>

          <p className="font-semibold mt-4">8. DISCLAIMER OF WARRANTIES</p>
          <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. THE COMPANY DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>

          <p className="font-semibold mt-4">9. LIMITATION OF LIABILITY</p>
          <p>THE COMPANY'S TOTAL LIABILITY SHALL NOT EXCEED THE GREATER OF THE AMOUNT YOU PAID IN THE PRECEDING 12 MONTHS OR $100. THE COMPANY SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.</p>

          <p className="font-semibold mt-4">10. INDEMNIFICATION</p>
          <p>You agree to indemnify and hold harmless the Company from any claims arising from your use of the Service, your User Content, or your violation of this EULA or applicable law.</p>

          <p className="font-semibold mt-4">11. DISPUTE RESOLUTION</p>
          <p>Disputes shall first be addressed informally by contacting legal@celsius.io. Unresolved disputes shall be resolved by binding arbitration under AAA Commercial Arbitration Rules in Delaware. YOU WAIVE THE RIGHT TO PARTICIPATE IN CLASS ACTIONS.</p>

          <p className="font-semibold mt-4">12. TERMINATION</p>
          <p>We may terminate your account for any reason. Upon termination, you have 30 days to export your data. All provisions that should survive termination shall survive.</p>

          <p className="font-semibold mt-4">13. GOVERNING LAW</p>
          <p>This EULA is governed by the laws of the State of Delaware, United States. EU users retain rights under mandatory consumer protection laws of their country of residence.</p>

          <p className="font-semibold mt-4">14. MODIFICATIONS</p>
          <p>We may modify this EULA with 30 days' notice. Continued use after notice constitutes acceptance. Material changes will be communicated via email or in-app notification.</p>

          <p className="font-semibold mt-4">15. ENTIRE AGREEMENT</p>
          <p>This EULA, together with the Terms of Service, Privacy Policy, Cookie Policy, Acceptable Use Policy, and Data Processing Agreement, constitutes the entire agreement between you and the Company.</p>

          <p className="font-semibold mt-4">16. CONTACT</p>
          <p>Legal: legal@celsius.io | DPO: dpo@celsius.io | Celsius Inc., 1209 Orange Street, Wilmington, DE 19801, United States.</p>

          <div className="h-4" />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={onAccept}
            disabled={!hasReadToBottom}
            className={!hasReadToBottom ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {hasReadToBottom ? 'I Accept' : 'Scroll to bottom to accept'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
