import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LabeledReferenceImage } from '@/lib/scriptParser';

interface ConsistencyResult {
  overallScore: number;
  characterMatches: {
    characterName: string;
    matchScore: number;
    issues: string[];
    details: string;
  }[];
  generalIssues: string[];
}

interface ConsistencyCheckerProps {
  panelImage: string;
  panelId: number;
  labeledImages: LabeledReferenceImage[];
  panelCharacters?: string[];
}

export function ConsistencyChecker({ 
  panelImage, 
  panelId, 
  labeledImages, 
  panelCharacters 
}: ConsistencyCheckerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<ConsistencyResult | null>(null);

  const checkConsistency = async () => {
    if (!panelImage || labeledImages.length === 0) {
      toast.error('Need panel image and character references to check consistency');
      return;
    }

    setIsChecking(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('check-consistency', {
        body: {
          panelImage,
          referenceImages: labeledImages,
          characterNames: panelCharacters || labeledImages.map(img => img.characterName),
        },
      });

      if (error) {
        console.error('Consistency check error:', error);
        if (error.message?.includes('429')) {
          toast.error('Rate limit reached. Please wait and try again.');
        } else if (error.message?.includes('402')) {
          toast.error('AI credits exhausted. Please add credits to continue.');
        } else {
          toast.error('Failed to check consistency');
        }
        return;
      }

      setResult(data);
    } catch (err) {
      console.error('Error checking consistency:', err);
      toast.error('Failed to check character consistency');
    } finally {
      setIsChecking(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Good</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Needs Review</Badge>;
    return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Issues Found</Badge>;
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (score >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!panelImage || labeledImages.length === 0}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Check
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Character Consistency Check - Panel {panelId}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Panel Preview */}
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">Generated Panel</p>
              <img 
                src={panelImage} 
                alt={`Panel ${panelId}`}
                className="w-full rounded-lg border"
              />
            </div>
          </div>

          {/* Check Button */}
          {!result && (
            <Button 
              onClick={checkConsistency} 
              disabled={isChecking}
              className="w-full"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Check Character Consistency
                </>
              )}
            </Button>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Overall Score */}
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Overall Consistency</span>
                  {getScoreBadge(result.overallScore)}
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={result.overallScore} className="flex-1" />
                  <span className={`font-bold ${getScoreColor(result.overallScore)}`}>
                    {result.overallScore}%
                  </span>
                </div>
              </div>

              {/* Character Matches */}
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-3">
                  {result.characterMatches.map((match, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getScoreIcon(match.matchScore)}
                          <span className="font-medium">{match.characterName}</span>
                        </div>
                        <span className={`text-sm font-bold ${getScoreColor(match.matchScore)}`}>
                          {match.matchScore}%
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">{match.details}</p>
                      
                      {match.issues.length > 0 && (
                        <div className="space-y-1">
                          {match.issues.map((issue, issueIdx) => (
                            <div key={issueIdx} className="flex items-start gap-2 text-sm">
                              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
                              <span className="text-muted-foreground">{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* General Issues */}
                  {result.generalIssues.length > 0 && (
                    <div className="p-3 rounded-lg border bg-card">
                      <p className="font-medium mb-2">General Issues</p>
                      {result.generalIssues.map((issue, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{issue}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Re-check Button */}
              <Button 
                variant="outline" 
                onClick={checkConsistency} 
                disabled={isChecking}
                className="w-full"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Re-analyzing...
                  </>
                ) : (
                  'Check Again'
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
