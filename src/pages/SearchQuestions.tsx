import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Info, FileSearch } from "lucide-react";
import { useState } from "react";

interface SearchResult {
  id: string;
  questionId: string;
  preview: string;
  subject: string;
  system: string;
  date: string;
  score: "correct" | "incorrect" | "omitted";
}

const mockResults: SearchResult[] = [];

const SearchQuestions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>(mockResults);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    setHasSearched(true);
    // Mock search - in real app this would query the backend
    if (searchQuery.trim()) {
      setResults([
        {
          id: "1",
          questionId: "Q12345",
          preview: "A 45-year-old woman presents with fatigue and weight gain...",
          subject: "Endocrinology",
          system: "Endocrine System",
          date: "Jan 15, 2026",
          score: "correct",
        },
        {
          id: "2",
          questionId: "Q23456",
          preview: "Which of the following is the most common cause of...",
          subject: "Pathology",
          system: "Cardiovascular",
          date: "Jan 10, 2026",
          score: "incorrect",
        },
      ]);
    } else {
      setResults([]);
    }
  };

  return (
    <AppLayout title="Search Questions">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Search Input */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Enter Question Id or Keywords"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleSearch}
                  >
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Info className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Area */}
        <Card className="min-h-[400px]">
          <CardContent className="p-6">
            {!hasSearched ? (
              <div className="flex flex-col items-center justify-center h-80 text-center">
                <div className="rounded-full bg-muted/30 p-6 mb-4">
                  <FileSearch className="h-16 w-16 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Please enter keywords to find previously tested questions
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-center">
                <div className="rounded-full bg-muted/30 p-6 mb-4">
                  <FileSearch className="h-16 w-16 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  No questions found matching your search
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Found {results.length} question(s) matching "{searchQuery}"
                </p>
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-primary">
                            {result.questionId}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {result.subject}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {result.system}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{result.preview}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground">{result.date}</span>
                        <span
                          className={`text-xs font-medium ${
                            result.score === "correct"
                              ? "text-[hsl(var(--badge-success))]"
                              : result.score === "incorrect"
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {result.score.charAt(0).toUpperCase() + result.score.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SearchQuestions;
