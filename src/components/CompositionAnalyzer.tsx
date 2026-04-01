import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Eye, 
  Loader2,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Target,
  Scale,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CompositionScore {
  category: string;
  score: number;
  feedback: string;
  suggestions: string[];
}

interface CompositionAnalysis {
  overallScore: number;
  scores: CompositionScore[];
  summary: string;
  topSuggestions: string[];
}

interface CompositionAnalyzerProps {
  panelImage: string;
  panelId?: number;
  panelDescription?: string;
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

export function CompositionAnalyzer({
  panelImage,
  panelId,
  panelDescription,
  trigger,
  isOpen: controlledIsOpen,
  onClose,
}: CompositionAnalyzerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Support both controlled and uncontrolled modes
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (value: boolean) => {
    if (controlledIsOpen !== undefined) {
      if (!value && onClose) {
        onClose();
      }
    } else {
      setInternalIsOpen(value);
    }
  };
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CompositionAnalysis | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-composition', {
        body: {
          panelImage,
          panelDescription,
        },
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast.error('Rate limit reached. Please try again later.');
        } else if (error.message?.includes('402')) {
          toast.error('AI credits exhausted. Please add credits.');
        } else {
          toast.error('Analysis failed');
        }
        return;
      }

      if (data) {
        setAnalysis(data);
      }
    } catch (err) {
      console.error('Composition analysis error:', err);
      toast.error('Failed to analyze composition');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Excellent</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Good</Badge>;
    return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Needs Work</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'visual flow':
        return <ArrowRight className="h-4 w-4" />;
      case 'focal points':
        return <Target className="h-4 w-4" />;
      case 'balance':
        return <Scale className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Eye className="h-4 w-4" />
            Analyze
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Panel Composition Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Panel Preview */}
          <div className="relative rounded-lg overflow-hidden border">
            <img
              src={panelImage}
              alt={`Panel ${panelId}`}
              className="w-full h-48 object-contain bg-muted"
            />
            <Badge variant="secondary" className="absolute top-2 left-2">
              Panel {panelId}
            </Badge>
          </div>

          {/* Analysis Button or Results */}
          {!analysis && !isAnalyzing && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Analyze this panel's visual composition, focal points, and storytelling effectiveness.
              </p>
              <Button onClick={handleAnalyze}>
                <Eye className="h-4 w-4 mr-1" />
                Analyze Composition
              </Button>
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-8">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Analyzing visual composition...</p>
            </div>
          )}

          {analysis && (
            <ScrollArea className="h-[350px]">
              <div className="space-y-4 pr-4">
                {/* Overall Score */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className={`text-5xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                        {analysis.overallScore}%
                      </div>
                      <p className="text-muted-foreground mt-1">Overall Composition Score</p>
                      <div className="mt-3">{getScoreBadge(analysis.overallScore)}</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-foreground">{analysis.summary}</p>
                  </CardContent>
                </Card>

                {/* Category Scores */}
                <div className="space-y-3">
                  {analysis.scores.map((score, idx) => (
                    <Card key={idx}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            {getCategoryIcon(score.category)}
                            {score.category}
                          </CardTitle>
                          <span className={`font-bold ${getScoreColor(score.score)}`}>
                            {score.score}%
                          </span>
                        </div>
                        <Progress value={score.score} className="h-1.5 mt-2" />
                      </CardHeader>
                      <CardContent className="py-3 pt-0">
                        <p className="text-sm text-muted-foreground mb-2">{score.feedback}</p>
                        {score.suggestions.length > 0 && (
                          <div className="space-y-1">
                            {score.suggestions.map((suggestion, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <Lightbulb className="h-3 w-3 text-accent mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{suggestion}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Top Suggestions */}
                {analysis.topSuggestions.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-accent" />
                        Top Improvement Suggestions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-3 pt-0">
                      <ul className="space-y-2">
                        {analysis.topSuggestions.map((suggestion, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-muted-foreground">{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Actions */}
          {analysis && (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAnalysis(null)}>
                Re-analyze
              </Button>
              <Button onClick={() => setIsOpen(false)}>
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
