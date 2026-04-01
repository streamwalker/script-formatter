import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  ShieldCheck, 
  XCircle,
  BarChart3,
  FileText,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ParsedPage, LabeledReferenceImage } from '@/lib/scriptParser';

interface PanelConsistencyResult {
  panelId: number;
  pageNumber: number;
  overallScore: number;
  characterMatches: {
    characterName: string;
    matchScore: number;
    issues: string[];
    details: string;
  }[];
  generalIssues: string[];
}

interface BatchReportData {
  overallScore: number;
  panelResults: PanelConsistencyResult[];
  characterSummary: {
    characterName: string;
    averageScore: number;
    totalIssues: number;
    commonIssues: string[];
    panelsWithIssues: number[];
  }[];
  flaggedPanels: number[];
}

interface BatchConsistencyReportProps {
  pages: ParsedPage[];
  panelImages: Record<number, string>;
  labeledImages: LabeledReferenceImage[];
  onAutoFix?: (panelIds: number[]) => void;
}

export function BatchConsistencyReport({ 
  pages, 
  panelImages, 
  labeledImages,
  onAutoFix
}: BatchConsistencyReportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [report, setReport] = useState<BatchReportData | null>(null);
  const [selectedPanels, setSelectedPanels] = useState<Set<number>>(new Set());

  const runBatchAnalysis = async () => {
    const allPanels = pages.flatMap(page => 
      page.panels.map(panel => ({
        ...panel,
        pageNumber: page.pageNumber,
        image: panelImages[panel.id]
      }))
    ).filter(p => p.image);

    if (allPanels.length === 0) {
      toast.error('No generated panels to analyze');
      return;
    }

    if (labeledImages.length === 0) {
      toast.error('No character references available for comparison');
      return;
    }

    setIsAnalyzing(true);
    setProgress({ current: 0, total: allPanels.length });
    setReport(null);

    const panelResults: PanelConsistencyResult[] = [];

    try {
      for (let i = 0; i < allPanels.length; i++) {
        const panel = allPanels[i];
        setProgress({ current: i + 1, total: allPanels.length });

        const panelCharacters = [...(panel.characters || []), ...(panel.dialogueSpeakers || [])];

        const { data, error } = await supabase.functions.invoke('check-consistency', {
          body: {
            panelImage: panel.image,
            referenceImages: labeledImages,
            characterNames: panelCharacters.length > 0 ? panelCharacters : labeledImages.map(img => img.characterName),
          },
        });

        if (error) {
          console.error(`Error checking panel ${panel.id}:`, error);
          if (error.message?.includes('429')) {
            toast.error('Rate limit reached. Partial results will be shown.');
            break;
          }
          continue;
        }

        panelResults.push({
          panelId: panel.id,
          pageNumber: panel.pageNumber,
          overallScore: data.overallScore,
          characterMatches: data.characterMatches,
          generalIssues: data.generalIssues,
        });

        // Small delay to avoid rate limiting
        if (i < allPanels.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Generate summary report
      const overallScore = panelResults.length > 0 
        ? Math.round(panelResults.reduce((sum, r) => sum + r.overallScore, 0) / panelResults.length)
        : 0;

      // Character-level summary
      const characterMap = new Map<string, { scores: number[], issues: string[], panels: number[] }>();
      
      for (const result of panelResults) {
        for (const match of result.characterMatches) {
          const existing = characterMap.get(match.characterName) || { scores: [], issues: [], panels: [] };
          existing.scores.push(match.matchScore);
          existing.issues.push(...match.issues);
          if (match.matchScore < 70) {
            existing.panels.push(result.panelId);
          }
          characterMap.set(match.characterName, existing);
        }
      }

      const characterSummary = Array.from(characterMap.entries()).map(([name, data]) => {
        const issueCount = new Map<string, number>();
        data.issues.forEach(issue => {
          issueCount.set(issue, (issueCount.get(issue) || 0) + 1);
        });
        
        const commonIssues = Array.from(issueCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([issue]) => issue);

        return {
          characterName: name,
          averageScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
          totalIssues: data.issues.length,
          commonIssues,
          panelsWithIssues: [...new Set(data.panels)],
        };
      });

      // Flagged panels (score < 70)
      const flaggedPanels = panelResults
        .filter(r => r.overallScore < 70)
        .map(r => r.panelId);

      setReport({
        overallScore,
        panelResults,
        characterSummary,
        flaggedPanels,
      });

      // Auto-select flagged panels
      setSelectedPanels(new Set(flaggedPanels));

      toast.success(`Analyzed ${panelResults.length} panels`);
    } catch (err) {
      console.error('Batch analysis error:', err);
      toast.error('Failed to complete batch analysis');
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
    if (score >= 80) return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Good</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Needs Review</Badge>;
    return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Issues Found</Badge>;
  };

  const togglePanelSelection = (panelId: number) => {
    const newSelection = new Set(selectedPanels);
    if (newSelection.has(panelId)) {
      newSelection.delete(panelId);
    } else {
      newSelection.add(panelId);
    }
    setSelectedPanels(newSelection);
  };

  const handleAutoFix = () => {
    if (selectedPanels.size === 0) {
      toast.error('No panels selected for auto-fix');
      return;
    }
    onAutoFix?.(Array.from(selectedPanels));
    setIsOpen(false);
  };

  const generatedPanelCount = Object.keys(panelImages).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={generatedPanelCount === 0 || labeledImages.length === 0}
        >
          <BarChart3 className="h-4 w-4" />
          Batch Consistency Check
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Batch Character Consistency Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Analysis Controls */}
          {!report && (
            <div className="text-center py-8">
              {isAnalyzing ? (
                <div className="space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                  <p className="text-muted-foreground">
                    Analyzing panel {progress.current} of {progress.total}...
                  </p>
                  <Progress value={(progress.current / progress.total) * 100} className="max-w-xs mx-auto" />
                </div>
              ) : (
                <div className="space-y-4">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Analyze all {generatedPanelCount} generated panels for character consistency
                  </p>
                  <Button onClick={runBatchAnalysis} className="gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Start Analysis
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Report Results */}
          {report && (
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="summary" className="flex-1">Summary</TabsTrigger>
                <TabsTrigger value="characters" className="flex-1">By Character</TabsTrigger>
                <TabsTrigger value="panels" className="flex-1">By Panel</TabsTrigger>
                <TabsTrigger value="fix" className="flex-1">
                  Auto-Fix ({report.flaggedPanels.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-4">
                <div className="space-y-4">
                  {/* Overall Score Card */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className={`text-6xl font-bold ${getScoreColor(report.overallScore)}`}>
                          {report.overallScore}%
                        </div>
                        <p className="text-muted-foreground mt-2">Overall Consistency Score</p>
                        <div className="mt-4">
                          {getScoreBadge(report.overallScore)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-2xl font-bold text-foreground">{report.panelResults.length}</div>
                        <p className="text-sm text-muted-foreground">Panels Analyzed</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-2xl font-bold text-green-500">
                          {report.panelResults.filter(r => r.overallScore >= 80).length}
                        </div>
                        <p className="text-sm text-muted-foreground">Good Panels</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-2xl font-bold text-red-500">
                          {report.flaggedPanels.length}
                        </div>
                        <p className="text-sm text-muted-foreground">Need Attention</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="characters" className="mt-4">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {report.characterSummary.map((char, idx) => (
                      <Card key={idx}>
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              {char.averageScore >= 80 ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : char.averageScore >= 60 ? (
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              {char.characterName}
                            </CardTitle>
                            <span className={`font-bold ${getScoreColor(char.averageScore)}`}>
                              {char.averageScore}%
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="py-3 pt-0">
                          <div className="text-sm text-muted-foreground space-y-2">
                            <p>{char.totalIssues} total issues across {char.panelsWithIssues.length} panels</p>
                            {char.commonIssues.length > 0 && (
                              <div>
                                <p className="font-medium text-foreground text-xs mb-1">Common Issues:</p>
                                <ul className="list-disc list-inside text-xs">
                                  {char.commonIssues.map((issue, i) => (
                                    <li key={i}>{issue}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="panels" className="mt-4">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {report.panelResults.map((result) => (
                      <div
                        key={result.panelId}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          {result.overallScore >= 80 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : result.overallScore >= 60 ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-medium">
                            Page {result.pageNumber}, Panel {result.panelId}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${getScoreColor(result.overallScore)}`}>
                            {result.overallScore}%
                          </span>
                          {result.generalIssues.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {result.characterMatches.reduce((sum, m) => sum + m.issues.length, 0)} issues
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="fix" className="mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select panels to regenerate with enhanced character reference weighting. 
                    Flagged panels (score {"<"} 70%) are pre-selected.
                  </p>

                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {report.panelResults
                        .filter(r => r.overallScore < 80)
                        .map((result) => (
                          <div
                            key={result.panelId}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedPanels.has(result.panelId) 
                                ? 'bg-primary/10 border-primary' 
                                : 'bg-card hover:bg-muted/50'
                            }`}
                            onClick={() => togglePanelSelection(result.panelId)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedPanels.has(result.panelId)}
                              onChange={() => togglePanelSelection(result.panelId)}
                              className="h-4 w-4"
                            />
                            <div className="flex-1">
                              <span className="font-medium">
                                Page {result.pageNumber}, Panel {result.panelId}
                              </span>
                              <span className={`ml-2 ${getScoreColor(result.overallScore)}`}>
                                ({result.overallScore}%)
                              </span>
                            </div>
                            {result.characterMatches.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {result.characterMatches.map(m => m.characterName).join(', ')}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleAutoFix}
                      disabled={selectedPanels.size === 0}
                      className="flex-1 gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Auto-Fix {selectedPanels.size} Panel{selectedPanels.size !== 1 ? 's' : ''}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={runBatchAnalysis}
                      className="gap-2"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Re-analyze
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
