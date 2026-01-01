import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer } from "lucide-react";

const Performance = () => {
  const scoreData = {
    percentage: 79,
    totalCorrect: 63,
    totalIncorrect: 12,
    totalOmitted: 5,
  };

  const answerChanges = {
    correctToIncorrect: 0,
    incorrectToCorrect: 2,
    incorrectToIncorrect: 0,
  };

  const qbankUsage = {
    usedQuestions: 80,
    unusedQuestions: 3310,
    totalQuestions: 3390,
    percentUsed: 2,
  };

  const testCount = {
    testsCreated: 2,
    testsCompleted: 2,
    suspendedTests: 0,
  };

  const percentileRank = {
    yourScore: 79,
    yourRank: 84,
    medianScore: 63,
    medianRank: 49,
    avgTimeYou: 52,
    avgTimeOthers: 73,
  };

  return (
    <AppLayout title="Overall Performance">
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Statistics</CardTitle>
            <Button variant="ghost" className="gap-2 text-primary">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Score Section */}
              <div className="flex items-center gap-8">
                {/* Score Ring */}
                <div className="relative">
                  <svg width="160" height="160" className="-rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="transparent"
                      stroke="hsl(var(--muted))"
                      strokeWidth="12"
                      opacity="0.2"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="transparent"
                      stroke="hsl(var(--destructive))"
                      strokeWidth="12"
                      strokeDasharray={`${(12 / 80) * 2 * Math.PI * 70} ${2 * Math.PI * 70}`}
                      strokeDashoffset={0}
                      opacity="0.3"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="transparent"
                      stroke="hsl(var(--badge-success))"
                      strokeWidth="12"
                      strokeDasharray={`${(scoreData.percentage / 100) * 2 * Math.PI * 70} ${2 * Math.PI * 70}`}
                      strokeDashoffset={0}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-foreground">{scoreData.percentage}%</span>
                    <span className="text-sm text-muted-foreground">Correct</span>
                  </div>
                </div>

                {/* Score Details */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground">Your Score</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-8">
                      <span className="text-muted-foreground">Total Correct</span>
                      <span className="font-semibold text-foreground">{scoreData.totalCorrect}</span>
                    </div>
                    <div className="flex items-center justify-between gap-8">
                      <span className="text-muted-foreground">Total Incorrect</span>
                      <span className="font-semibold text-foreground">{scoreData.totalIncorrect}</span>
                    </div>
                    <div className="flex items-center justify-between gap-8">
                      <span className="text-muted-foreground">Total Omitted</span>
                      <span className="font-semibold text-foreground">{scoreData.totalOmitted}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Answer Changes */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Answer Changes</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-muted-foreground">Correct to Incorrect</span>
                    <span className="font-semibold text-foreground">{answerChanges.correctToIncorrect}</span>
                  </div>
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-muted-foreground">Incorrect to Correct</span>
                    <span className="font-semibold text-foreground">{answerChanges.incorrectToCorrect}</span>
                  </div>
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-muted-foreground">Incorrect to Incorrect</span>
                    <span className="font-semibold text-foreground">{answerChanges.incorrectToIncorrect}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QBank Usage & Test Count */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-8">
                {/* Usage Ring */}
                <div className="relative">
                  <svg width="120" height="120" className="-rotate-90">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="transparent"
                      stroke="hsl(var(--muted))"
                      strokeWidth="10"
                      opacity="0.2"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="transparent"
                      stroke="hsl(var(--primary))"
                      strokeWidth="10"
                      strokeDasharray={`${(qbankUsage.percentUsed / 100) * 2 * Math.PI * 50} ${2 * Math.PI * 50}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-foreground">{qbankUsage.percentUsed}%</span>
                    <span className="text-xs text-muted-foreground">Used</span>
                  </div>
                </div>

                {/* Usage Details */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground">QBank Usage</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-8">
                      <span className="text-muted-foreground">Used Questions</span>
                      <span className="font-semibold text-foreground">{qbankUsage.usedQuestions}</span>
                    </div>
                    <div className="flex items-center justify-between gap-8">
                      <span className="text-muted-foreground">Unused Questions</span>
                      <span className="font-semibold text-foreground">{qbankUsage.unusedQuestions}</span>
                    </div>
                    <div className="flex items-center justify-between gap-8">
                      <span className="text-muted-foreground">Total Questions</span>
                      <span className="font-semibold text-foreground">{qbankUsage.totalQuestions}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Test Count</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-muted-foreground">Tests Created</span>
                    <span className="font-semibold text-foreground">{testCount.testsCreated}</span>
                  </div>
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-muted-foreground">Tests Completed</span>
                    <span className="font-semibold text-foreground">{testCount.testsCompleted}</span>
                  </div>
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-muted-foreground">Suspended Tests</span>
                    <span className="font-semibold text-foreground">{testCount.suspendedTests}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Percentile Rank */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Bell Curve Visualization */}
              <div className="relative h-48 flex items-end justify-center">
                <svg viewBox="0 0 400 150" className="w-full h-full">
                  {/* Bell curve path */}
                  <path
                    d="M 20 140 Q 80 140, 120 100 Q 160 40, 200 30 Q 240 40, 280 100 Q 320 140, 380 140"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="2"
                  />
                  <path
                    d="M 20 140 Q 80 140, 120 100 Q 160 40, 200 30 Q 240 40, 280 100 Q 320 140, 380 140 L 380 150 L 20 150 Z"
                    fill="hsl(var(--muted))"
                    opacity="0.1"
                  />
                  
                  {/* Median line (49th percentile) */}
                  <line
                    x1="200"
                    y1="30"
                    x2="200"
                    y2="140"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                  />
                  <text x="200" y="20" textAnchor="middle" className="fill-primary text-xs font-medium">
                    49th
                  </text>
                  
                  {/* Your score (84th percentile) */}
                  <circle cx="300" cy="115" r="8" fill="hsl(var(--badge-success))" />
                  <text x="300" y="100" textAnchor="middle" className="fill-[hsl(var(--badge-success))] text-xs font-medium">
                    84th
                  </text>
                </svg>
              </div>

              {/* Percentile Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Percentile Rank</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-[hsl(var(--badge-success))]" />
                    <span className="text-muted-foreground">Your Score ({percentileRank.yourRank}th rank)</span>
                    <span className="ml-auto font-semibold text-foreground">{percentileRank.yourScore}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Median Score ({percentileRank.medianRank}th rank)</span>
                    <span className="ml-auto font-semibold text-foreground">{percentileRank.medianScore}%</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-muted-foreground">Your Average Time Spent (sec)</span>
                    <span className="font-semibold text-foreground">{percentileRank.avgTimeYou}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Other's Average Time Spent (sec)</span>
                    <span className="font-semibold text-foreground">{percentileRank.avgTimeOthers}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Performance;
