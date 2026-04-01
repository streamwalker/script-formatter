import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  LayoutDashboard,
  Lightbulb,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface CharacterScore {
  characterName: string;
  averageScore: number;
  totalIssues: number;
  commonIssues: string[];
  panelsWithIssues: number[];
}

interface PanelResult {
  panelId: number;
  pageNumber: number;
  overallScore: number;
  characterMatches: {
    characterName: string;
    matchScore: number;
    issues: string[];
  }[];
  generalIssues: string[];
}

interface DashboardData {
  overallScore: number;
  panelResults: PanelResult[];
  characterSummary: CharacterScore[];
  flaggedPanels: number[];
}

interface HistoryEntry {
  timestamp: string;
  overallScore: number;
  characterScores: Record<string, number>;
  panelCount: number;
}

interface ConsistencyDashboardProps {
  data: DashboardData | null;
  projectId?: string;
  trigger?: React.ReactNode;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function ConsistencyDashboard({ data, projectId, trigger }: ConsistencyDashboardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Load history from localStorage
  const history = useMemo(() => {
    if (!projectId) return [];
    try {
      const saved = localStorage.getItem(`consistency-history-${projectId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [projectId]);

  // Calculate trend
  const trend = useMemo(() => {
    if (history.length < 2 || !data) return null;
    const previousScore = history[history.length - 1]?.overallScore;
    if (previousScore === undefined) return null;
    const diff = data.overallScore - previousScore;
    return { diff, direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable' };
  }, [history, data]);

  // Prepare chart data
  const characterChartData = useMemo(() => {
    if (!data) return [];
    return data.characterSummary.map(char => ({
      name: char.characterName,
      score: char.averageScore,
      issues: char.totalIssues,
    }));
  }, [data]);

  const panelTimelineData = useMemo(() => {
    if (!data) return [];
    return data.panelResults.map(result => ({
      name: `P${result.panelId}`,
      panelId: result.panelId,
      page: result.pageNumber,
      score: result.overallScore,
    }));
  }, [data]);

  const issueDistributionData = useMemo(() => {
    if (!data) return [];
    
    const issueCategories: Record<string, number> = {
      'Hair': 0,
      'Face': 0,
      'Clothing': 0,
      'Accessories': 0,
      'Pose': 0,
      'Other': 0,
    };

    data.panelResults.forEach(result => {
      result.characterMatches.forEach(match => {
        match.issues.forEach(issue => {
          const lowerIssue = issue.toLowerCase();
          if (lowerIssue.includes('hair')) issueCategories['Hair']++;
          else if (lowerIssue.includes('face') || lowerIssue.includes('eye')) issueCategories['Face']++;
          else if (lowerIssue.includes('cloth') || lowerIssue.includes('outfit') || lowerIssue.includes('wear')) issueCategories['Clothing']++;
          else if (lowerIssue.includes('accessor')) issueCategories['Accessories']++;
          else if (lowerIssue.includes('pose') || lowerIssue.includes('position')) issueCategories['Pose']++;
          else issueCategories['Other']++;
        });
      });
    });

    return Object.entries(issueCategories)
      .filter(([, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));
  }, [data]);

  // Generate improvement suggestions
  const suggestions = useMemo(() => {
    if (!data) return [];
    const suggestions: { priority: 'high' | 'medium' | 'low'; text: string; action?: string }[] = [];

    // Low overall score
    if (data.overallScore < 70) {
      suggestions.push({
        priority: 'high',
        text: 'Overall consistency is low. Consider adding more reference images for each character.',
        action: 'Add References'
      });
    }

    // Character-specific issues
    data.characterSummary.forEach(char => {
      if (char.averageScore < 60) {
        suggestions.push({
          priority: 'high',
          text: `${char.characterName} has significant consistency issues (${char.averageScore}%). Review their profile and add more reference poses.`,
        });
      } else if (char.averageScore < 80) {
        suggestions.push({
          priority: 'medium',
          text: `${char.characterName} could use improvement. Most common issues: ${char.commonIssues.slice(0, 2).join(', ')}.`,
        });
      }
    });

    // Issue-based suggestions
    const hairIssues = issueDistributionData.find(d => d.name === 'Hair')?.value || 0;
    const clothingIssues = issueDistributionData.find(d => d.name === 'Clothing')?.value || 0;

    if (hairIssues > 3) {
      suggestions.push({
        priority: 'medium',
        text: 'Multiple hair consistency issues detected. Add detailed hair descriptions to character profiles.',
      });
    }

    if (clothingIssues > 3) {
      suggestions.push({
        priority: 'medium',
        text: 'Clothing varies across panels. Consider adding specific outfit reference images.',
      });
    }

    // Good performance
    if (data.overallScore >= 85 && suggestions.length === 0) {
      suggestions.push({
        priority: 'low',
        text: 'Great job! Character consistency is excellent. Keep using the current reference strategy.',
      });
    }

    return suggestions;
  }, [data, issueDistributionData]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!data) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Character Consistency Dashboard
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            <TabsTrigger value="characters" className="flex-1">Characters</TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
            <TabsTrigger value="suggestions" className="flex-1">Suggestions</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="overview" className="mt-0 space-y-4">
              {/* Overall Score */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center gap-8">
                    <div className="text-center">
                      <div className={`text-6xl font-bold ${getScoreColor(data.overallScore)}`}>
                        {data.overallScore}%
                      </div>
                      <p className="text-muted-foreground mt-2">Overall Score</p>
                    </div>
                    {trend && (
                      <div className="text-center">
                        <div className={`flex items-center gap-1 text-2xl font-bold ${
                          trend.direction === 'up' ? 'text-green-500' : 
                          trend.direction === 'down' ? 'text-red-500' : 'text-muted-foreground'
                        }`}>
                          {trend.direction === 'up' && <TrendingUp className="h-6 w-6" />}
                          {trend.direction === 'down' && <TrendingDown className="h-6 w-6" />}
                          {trend.direction === 'stable' && <Minus className="h-6 w-6" />}
                          {trend.diff > 0 ? '+' : ''}{trend.diff}%
                        </div>
                        <p className="text-sm text-muted-foreground">vs Previous</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold">{data.panelResults.length}</div>
                    <p className="text-xs text-muted-foreground">Panels Analyzed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold">{data.characterSummary.length}</div>
                    <p className="text-xs text-muted-foreground">Characters</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {data.panelResults.filter(r => r.overallScore >= 80).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Good Panels</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {data.flaggedPanels.length}
                    </div>
                    <p className="text-xs text-muted-foreground">Need Attention</p>
                  </CardContent>
                </Card>
              </div>

              {/* Issue Distribution Pie Chart */}
              {issueDistributionData.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Issue Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={issueDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {issueDistributionData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="characters" className="mt-0 space-y-4">
              {/* Character Bar Chart */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Character Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={characterChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip />
                        <Bar dataKey="score" fill="hsl(var(--primary))">
                          {characterChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={
                                entry.score >= 80 ? 'hsl(142, 76%, 36%)' : 
                                entry.score >= 60 ? 'hsl(48, 96%, 53%)' : 
                                'hsl(0, 84%, 60%)'
                              } 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Character Details */}
              <div className="space-y-3">
                {data.characterSummary.map((char, idx) => (
                  <Card key={idx}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {char.averageScore >= 80 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="font-medium">{char.characterName}</span>
                        </div>
                        <span className={`font-bold ${getScoreColor(char.averageScore)}`}>
                          {char.averageScore}%
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {char.totalIssues} issues across {char.panelsWithIssues.length} panels
                      </div>
                      {char.commonIssues.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {char.commonIssues.map((issue, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="mt-0 space-y-4">
              {/* Panel Timeline Chart */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Consistency Across Panels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={panelTimelineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload?.[0]) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                                  <p className="font-medium">Panel {data.panelId}</p>
                                  <p className="text-sm text-muted-foreground">Page {data.page}</p>
                                  <p className={`font-bold ${getScoreColor(data.score)}`}>
                                    Score: {data.score}%
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Threshold lines legend */}
              <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-500" />
                  Good (80%+)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-yellow-500" />
                  Needs Review (60-79%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-500" />
                  Issues ({`<`}60%)
                </span>
              </div>
            </TabsContent>

            <TabsContent value="suggestions" className="mt-0 space-y-4">
              <div className="space-y-3">
                {suggestions.map((suggestion, idx) => (
                  <Card key={idx} className={
                    suggestion.priority === 'high' ? 'border-red-500/50' :
                    suggestion.priority === 'medium' ? 'border-yellow-500/50' :
                    'border-green-500/50'
                  }>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className={`h-5 w-5 mt-0.5 ${
                          suggestion.priority === 'high' ? 'text-red-500' :
                          suggestion.priority === 'medium' ? 'text-yellow-500' :
                          'text-green-500'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm">{suggestion.text}</p>
                          {suggestion.action && (
                            <Button variant="link" size="sm" className="p-0 h-auto mt-1">
                              {suggestion.action} →
                            </Button>
                          )}
                        </div>
                        <Badge variant={
                          suggestion.priority === 'high' ? 'destructive' :
                          suggestion.priority === 'medium' ? 'secondary' :
                          'default'
                        }>
                          {suggestion.priority}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {suggestions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No specific suggestions at this time.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
