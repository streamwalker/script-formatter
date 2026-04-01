import { useMemo } from 'react';
import { AlertCircle, Check, FileText, Users, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RegexValidation {
  pattern: string;
  isValid: boolean;
  error?: string;
}

interface PreviewResult {
  pageCount: number;
  panelCount: number;
  characterCount: number;
  pageMatches: string[];
  panelMatches: string[];
  dialogueMatches: string[];
  narrationMatches: string[];
  characterMatches: string[];
}

interface TemplatePreviewPanelProps {
  sampleText: string;
  patterns: {
    pageMarkerPattern: string;
    panelPattern: string;
    dialoguePattern: string;
    narrationPattern: string;
    characterNamePattern: string;
  };
}

function validateRegex(pattern: string): RegexValidation {
  if (!pattern || pattern === '$^') {
    return { pattern, isValid: true };
  }
  try {
    new RegExp(pattern, 'gim');
    return { pattern, isValid: true };
  } catch (e) {
    return { pattern, isValid: false, error: (e as Error).message };
  }
}

function safeMatch(text: string, pattern: string, flags = 'gim'): string[] {
  if (!pattern || pattern === '$^' || !text) return [];
  try {
    const regex = new RegExp(pattern, flags);
    const matches = text.match(regex) || [];
    return matches.slice(0, 10); // Limit to 10 matches for display
  } catch {
    return [];
  }
}

export function TemplatePreviewPanel({ sampleText, patterns }: TemplatePreviewPanelProps) {
  // Validate all patterns
  const validations = useMemo(() => ({
    pageMarker: validateRegex(patterns.pageMarkerPattern),
    panel: validateRegex(patterns.panelPattern),
    dialogue: validateRegex(patterns.dialoguePattern),
    narration: validateRegex(patterns.narrationPattern),
    characterName: validateRegex(patterns.characterNamePattern),
  }), [patterns]);

  // Get preview results
  const preview = useMemo((): PreviewResult => {
    if (!sampleText.trim()) {
      return {
        pageCount: 0,
        panelCount: 0,
        characterCount: 0,
        pageMatches: [],
        panelMatches: [],
        dialogueMatches: [],
        narrationMatches: [],
        characterMatches: [],
      };
    }

    const pageMatches = safeMatch(sampleText, patterns.pageMarkerPattern);
    const panelMatches = safeMatch(sampleText, patterns.panelPattern);
    const dialogueMatches = safeMatch(sampleText, patterns.dialoguePattern);
    const narrationMatches = safeMatch(sampleText, patterns.narrationPattern);
    const characterMatches = safeMatch(sampleText, patterns.characterNamePattern);

    // Deduplicate character names
    const uniqueCharacters = [...new Set(characterMatches.map(c => c.trim().toUpperCase()))];

    return {
      pageCount: pageMatches.length || 1,
      panelCount: panelMatches.length,
      characterCount: uniqueCharacters.length,
      pageMatches,
      panelMatches,
      dialogueMatches,
      narrationMatches,
      characterMatches: uniqueCharacters,
    };
  }, [sampleText, patterns]);

  const hasErrors = Object.values(validations).some(v => !v.isValid);

  return (
    <div className="space-y-4 border-t border-border pt-4 mt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Live Preview</h4>
        {hasErrors && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            Invalid patterns
          </Badge>
        )}
      </div>

      {/* Pattern validation status */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <PatternStatus label="Page Marker" validation={validations.pageMarker} />
        <PatternStatus label="Panel" validation={validations.panel} />
        <PatternStatus label="Dialogue" validation={validations.dialogue} />
        <PatternStatus label="Narration" validation={validations.narration} />
        <PatternStatus label="Character" validation={validations.characterName} />
      </div>

      {/* Parsing results summary */}
      {sampleText.trim() && !hasErrors && (
        <div className="flex items-center gap-4 p-3 bg-primary/10 rounded-lg">
          <div className="flex items-center gap-1 text-sm">
            <FileText className="w-4 h-4 text-primary" />
            <span className="font-medium">{preview.pageCount}</span>
            <span className="text-muted-foreground">page{preview.pageCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Layers className="w-4 h-4 text-primary" />
            <span className="font-medium">{preview.panelCount}</span>
            <span className="text-muted-foreground">panel{preview.panelCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-medium">{preview.characterCount}</span>
            <span className="text-muted-foreground">character{preview.characterCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Matched content preview */}
      {sampleText.trim() && !hasErrors && (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          <MatchSection title="Pages Found" matches={preview.pageMatches} />
          <MatchSection title="Panels Found" matches={preview.panelMatches} maxItems={5} />
          <MatchSection title="Dialogue Detected" matches={preview.dialogueMatches} maxItems={5} />
          <MatchSection title="Characters Detected" matches={preview.characterMatches} maxItems={10} />
        </div>
      )}

      {!sampleText.trim() && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Enter sample text above to see parsing results
        </p>
      )}
    </div>
  );
}

function PatternStatus({ label, validation }: { label: string; validation: RegexValidation }) {
  return (
    <div className="flex items-center gap-2">
      {validation.isValid ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <AlertCircle className="w-3 h-3 text-destructive" />
      )}
      <span className={validation.isValid ? 'text-foreground' : 'text-destructive'}>
        {label}
      </span>
      {!validation.isValid && validation.error && (
        <span className="text-destructive truncate" title={validation.error}>
          ({validation.error.slice(0, 30)})
        </span>
      )}
    </div>
  );
}

function MatchSection({ title, matches, maxItems = 5 }: { title: string; matches: string[]; maxItems?: number }) {
  if (matches.length === 0) return null;

  const displayMatches = matches.slice(0, maxItems);
  const remaining = matches.length - maxItems;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{title} ({matches.length})</p>
      <div className="flex flex-wrap gap-1">
        {displayMatches.map((match, i) => (
          <Badge 
            key={i} 
            variant="secondary" 
            className="text-xs font-mono truncate max-w-[200px]"
            title={match}
          >
            {match.slice(0, 40)}{match.length > 40 ? '...' : ''}
          </Badge>
        ))}
        {remaining > 0 && (
          <Badge variant="outline" className="text-xs">
            +{remaining} more
          </Badge>
        )}
      </div>
    </div>
  );
}
