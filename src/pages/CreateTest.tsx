import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Info, Rocket, Plus, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";
import { useTests } from "@/hooks/useTests";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubjectCount {
  name: string;
  count: number;
}

interface SystemCount {
  name: string;
  count: number;
}

interface CategoryCount {
  name: string;
  count: number;
}

const CreateTest = () => {
  const navigate = useNavigate();
  const { createTest } = useTests();
  const [testMode, setTestMode] = useState<"tutor" | "timed">("tutor");
  const [questionMode, setQuestionMode] = useState<"standard" | "custom">("standard");
  const [selectedModes, setSelectedModes] = useState<string[]>(["unused"]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [subjectsOpen, setSubjectsOpen] = useState(true);
  const [systemsOpen, setSystemsOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [subjects, setSubjects] = useState<SubjectCount[]>([]);
  const [systems, setSystems] = useState<SystemCount[]>([]);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [totalAvailable, setTotalAvailable] = useState(0);

  // Fetch counts from database - optimized with aggregate queries
  useEffect(() => {
    const fetchCounts = async () => {
      // Use RPC or optimized queries - fetch distinct subjects, systems, and categories with counts
      const [subjectResult, systemResult, categoryResult] = await Promise.all([
        supabase
          .from("questions")
          .select("subject")
          .limit(5000),
        supabase
          .from("questions")
          .select("system")
          .limit(5000),
        supabase
          .from("questions")
          .select("category")
          .not("category", "is", null)
          .limit(5000),
      ]);

      if (subjectResult.data) {
        const subjectCounts: Record<string, number> = {};
        subjectResult.data.forEach((q) => {
          subjectCounts[q.subject] = (subjectCounts[q.subject] || 0) + 1;
        });
        const subjectList = Object.entries(subjectCounts).map(([name, count]) => ({
          name,
          count,
        })).sort((a, b) => a.name.localeCompare(b.name));
        setSubjects(subjectList);
        setTotalAvailable(subjectResult.data.length);
      }

      if (systemResult.data) {
        const systemCounts: Record<string, number> = {};
        systemResult.data.forEach((q) => {
          systemCounts[q.system] = (systemCounts[q.system] || 0) + 1;
        });
        const systemList = Object.entries(systemCounts).map(([name, count]) => ({
          name,
          count,
        })).sort((a, b) => a.name.localeCompare(b.name));
        setSystems(systemList);
      }

      if (categoryResult.data) {
        const categoryCounts: Record<string, number> = {};
        categoryResult.data.forEach((q) => {
          if (q.category) {
            categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
          }
        });
        const categoryList = Object.entries(categoryCounts).map(([name, count]) => ({
          name,
          count,
        })).sort((a, b) => a.name.localeCompare(b.name));
        setCategories(categoryList);
      }
    };

    fetchCounts();
  }, []);

  const toggleMode = (modeId: string) => {
    setSelectedModes((prev) =>
      prev.includes(modeId)
        ? prev.filter((m) => m !== modeId)
        : [...prev, modeId]
    );
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((s) => s !== subjectId)
        : [...prev, subjectId]
    );
  };

  const toggleSystem = (systemId: string) => {
    setSelectedSystems((prev) =>
      prev.includes(systemId)
        ? prev.filter((s) => s !== systemId)
        : [...prev, systemId]
    );
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleGenerateTest = async () => {
    setIsGenerating(true);
    try {
      // Fetch random questions from the database
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("id")
        .limit(Math.min(questionCount, 10));

      if (questionsError || !questions || questions.length === 0) {
        toast.error("No questions available. Import some questions first.");
        setIsGenerating(false);
        return;
      }

      // Create the test
      const testName = `Test ${new Date().toLocaleDateString()} - ${testMode === "tutor" ? "Tutor" : "Timed"}`;
      const { data: test, error: testError } = await createTest({
        name: testName,
        mode: testMode,
        timerType: testMode === "timed" ? "block" : "question",
        timeLimitSeconds: testMode === "timed" ? questionCount * 90 : undefined,
        questionCount: questions.length,
        subjects: selectedSubjects,
        systems: selectedSystems,
      });

      if (testError || !test) {
        toast.error("Failed to create test");
        setIsGenerating(false);
        return;
      }

      // Create test answers (question placeholders)
      const testAnswers = questions.map((q, index) => ({
        test_id: test.id,
        question_id: q.id,
        question_order: index + 1,
      }));

      const { error: answersError } = await supabase
        .from("test_answers")
        .insert(testAnswers);

      if (answersError) {
        toast.error("Failed to set up test questions");
        setIsGenerating(false);
        return;
      }

      toast.success("Test created successfully!");
      navigate(`/qbank/practice/${test.id}`);
    } catch (error) {
      toast.error("Something went wrong");
      console.error(error);
    }
    setIsGenerating(false);
  };

  return (
    <AppLayout title="Create Test">
      <div className="space-y-6 max-w-4xl">
        {/* Header with Import Link */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Create a New Test</h2>
            <p className="text-sm text-muted-foreground">Configure your test settings</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild className="gap-2">
              <Link to="/qbank/import">
                <Upload className="h-4 w-4" />
                Import Questions
              </Link>
            </Button>
            <Button variant="link" className="text-primary gap-2">
              <Rocket className="h-4 w-4" />
              Launch Tutorial
            </Button>
          </div>
        </div>

        {/* Test Mode Section */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-medium">Test Mode</CardTitle>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <Switch
                  checked={testMode === "tutor"}
                  onCheckedChange={(checked) => setTestMode(checked ? "tutor" : "timed")}
                />
                <Label className={cn(testMode === "tutor" ? "text-foreground" : "text-muted-foreground")}>
                  Tutor
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={testMode === "timed"}
                  onCheckedChange={(checked) => setTestMode(checked ? "timed" : "tutor")}
                />
                <Label className={cn(testMode === "timed" ? "text-foreground" : "text-muted-foreground")}>
                  Timed
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Mode Section */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-medium">Question Mode</CardTitle>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Total Available</span>
                <Badge variant="default">{totalAvailable}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Standard/Custom Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={questionMode === "standard" ? "default" : "outline"}
                size="sm"
                onClick={() => setQuestionMode("standard")}
              >
                Standard
              </Button>
              <Button
                variant={questionMode === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setQuestionMode("custom")}
              >
                Custom
              </Button>
            </div>

            {/* Question Filters */}
            <div className="flex flex-wrap items-center gap-4">
              {[
                { id: "unused", label: "Unused", count: totalAvailable },
                { id: "incorrect", label: "Incorrect", count: 0 },
                { id: "marked", label: "Marked", count: 0 },
                { id: "omitted", label: "Omitted", count: 0 },
                { id: "correct", label: "Correct", count: 0 },
              ].map((mode) => (
                <div key={mode.id} className="flex items-center gap-2">
                  <Checkbox
                    id={mode.id}
                    checked={selectedModes.includes(mode.id)}
                    onCheckedChange={() => toggleMode(mode.id)}
                  />
                  <Label htmlFor={mode.id} className="flex items-center gap-2">
                    {mode.label}
                    <Badge variant="outline" className="font-normal">
                      {mode.count}
                    </Badge>
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Subjects Section */}
        <Collapsible open={subjectsOpen} onOpenChange={setSubjectsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedSubjects.length === subjects.length && subjects.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSubjects(subjects.map((s) => s.name));
                        } else {
                          setSelectedSubjects([]);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <CardTitle className="text-base font-medium">Subjects</CardTitle>
                  </div>
                  {subjectsOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {subjects.map((subject) => (
                    <div key={subject.name} className="flex items-center gap-2">
                      <Checkbox
                        id={`subject-${subject.name}`}
                        checked={selectedSubjects.includes(subject.name)}
                        onCheckedChange={() => toggleSubject(subject.name)}
                      />
                      <Label htmlFor={`subject-${subject.name}`} className="flex items-center gap-2">
                        {subject.name}
                        <Badge variant="outline" className="font-normal">
                          {subject.count}
                        </Badge>
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Systems Section */}
        <Collapsible open={systemsOpen} onOpenChange={setSystemsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedSystems.length === systems.length && systems.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSystems(systems.map((s) => s.name));
                        } else {
                          setSelectedSystems([]);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <CardTitle className="text-base font-medium">Systems</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="link" size="sm" className="text-primary gap-1" onClick={(e) => e.stopPropagation()}>
                      <Plus className="h-4 w-4" />
                      Expand All
                    </Button>
                    {systemsOpen ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {systems.map((system) => (
                    <div key={system.name} className="flex items-center gap-2">
                      <Checkbox
                        id={`system-${system.name}`}
                        checked={selectedSystems.includes(system.name)}
                        onCheckedChange={() => toggleSystem(system.name)}
                      />
                      <Label
                        htmlFor={`system-${system.name}`}
                        className="flex items-center gap-2"
                      >
                        {system.name}
                        <Badge variant="outline" className="font-normal">
                          {system.count}
                        </Badge>
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Categories Section */}
        {categories.length > 0 && (
          <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedCategories.length === categories.length && categories.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCategories(categories.map((c) => c.name));
                          } else {
                            setSelectedCategories([]);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <CardTitle className="text-base font-medium">Categories / Topics</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{selectedCategories.length} selected</Badge>
                      {categoriesOpen ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {categories.map((category) => (
                      <div key={category.name} className="flex items-center gap-2">
                        <Checkbox
                          id={`category-${category.name}`}
                          checked={selectedCategories.includes(category.name)}
                          onCheckedChange={() => toggleCategory(category.name)}
                        />
                        <Label
                          htmlFor={`category-${category.name}`}
                          className="flex items-center gap-2 text-sm"
                        >
                          {category.name}
                          <Badge variant="outline" className="font-normal text-xs">
                            {category.count}
                          </Badge>
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">No. of Questions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 0)}
                className="w-24"
                min={1}
                max={40}
              />
              <span className="text-sm text-muted-foreground">
                Max allowed per block <Badge variant="outline">40</Badge>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Generate Test Button */}
        <div className="flex justify-center pt-4">
          <Button size="lg" className="px-12" onClick={handleGenerateTest} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate Test"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default CreateTest;
