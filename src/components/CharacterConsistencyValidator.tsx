import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  User,
  Image,
  FileText,
  Zap,
  ChevronRight,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ValidationResult,
  ValidationIssue,
  CharacterValidation,
  IssueSeverity,
} from '@/lib/characterValidator';

interface CharacterConsistencyValidatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validationResult: ValidationResult | null;
  onProceed: () => void;
  onEditCharacter: (characterId: string) => void;
}

export function CharacterConsistencyValidator({
  open,
  onOpenChange,
  validationResult,
  onProceed,
  onEditCharacter,
}: CharacterConsistencyValidatorProps) {
  const canProceed = validationResult?.blockerCount === 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/20';
    if (score >= 60) return 'bg-yellow-500/20';
    return 'bg-destructive/20';
  };

  const getSeverityIcon = (severity: IssueSeverity) => {
    switch (severity) {
      case 'blocker':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityBadge = (severity: IssueSeverity) => {
    switch (severity) {
      case 'blocker':
        return <Badge variant="destructive">Blocker</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Warning</Badge>;
      case 'info':
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'reference':
        return <Image className="h-3 w-3" />;
      case 'profile':
        return <FileText className="h-3 w-3" />;
      case 'pose':
        return <User className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  if (!validationResult) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Pre-Generation Validation
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Overall Score */}
            <div className={`p-4 rounded-lg ${getScoreBg(validationResult.readinessScore)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Readiness Score</span>
                <span className={`text-2xl font-bold ${getScoreColor(validationResult.readinessScore)}`}>
                  {validationResult.readinessScore}%
                </span>
              </div>
              <Progress value={validationResult.readinessScore} className="h-2" />
              <div className="flex gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-destructive" />
                  {validationResult.blockerCount} Blockers
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  {validationResult.warningCount} Warnings
                </span>
                <span className="flex items-center gap-1">
                  <Info className="h-3 w-3 text-muted-foreground" />
                  {validationResult.infoCount} Info
                </span>
              </div>
            </div>

            <Separator />

            {/* Character Breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Character Breakdown
              </h3>

              <Accordion type="multiple" className="space-y-2">
                {validationResult.characterBreakdown.map((char) => (
                  <AccordionItem
                    key={char.characterId}
                    value={char.characterId}
                    className="border rounded-lg px-3"
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getScoreBg(char.score)}`}>
                          <span className={`text-xs font-bold ${getScoreColor(char.score)}`}>
                            {char.score}
                          </span>
                        </div>
                        <div className="flex-1 text-left">
                          <span className="font-medium">{char.characterName}</span>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>{char.referenceCount} refs</span>
                            <span>•</span>
                            <span>{char.profileCompleteness}% profile</span>
                          </div>
                        </div>
                        {char.hasBlockers && (
                          <Badge variant="destructive" className="mr-2">Has Blockers</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                      <div className="space-y-2">
                        {char.issues.length === 0 ? (
                          <div className="flex items-center gap-2 text-sm text-green-500">
                            <CheckCircle2 className="h-4 w-4" />
                            All checks passed
                          </div>
                        ) : (
                          char.issues.map((issue) => (
                            <div
                              key={issue.id}
                              className="flex items-start gap-2 p-2 rounded bg-muted/50"
                            >
                              {getSeverityIcon(issue.severity)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium">{issue.message}</span>
                                  <Badge variant="outline" className="text-xs gap-1">
                                    {getCategoryIcon(issue.category)}
                                    {issue.category}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {issue.suggestion}
                                </p>
                                {issue.affectedPanels && issue.affectedPanels.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Affects {issue.affectedPanels.length} panel(s)
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => onEditCharacter(char.characterId)}
                        >
                          Edit Character
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Missing Characters */}
            {validationResult.issues.some(i => i.characterId === 'missing') && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Characters Without Profiles
                  </h3>
                  <div className="space-y-2">
                    {validationResult.issues
                      .filter(i => i.characterId === 'missing')
                      .map((issue) => (
                        <div
                          key={issue.id}
                          className="flex items-center gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20"
                        >
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">{issue.message}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {canProceed ? (
            <Button onClick={onProceed}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Proceed with Generation
            </Button>
          ) : (
            <Button disabled variant="secondary">
              <XCircle className="h-4 w-4 mr-2" />
              Fix Blockers to Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
