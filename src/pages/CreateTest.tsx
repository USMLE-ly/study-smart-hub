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
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";
import { useTests } from "@/hooks/useTests";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Subject {
  id: string;
  name: string;
  count: number;
}

interface System {
  id: string;
  name: string;
  count: number;
}

const subjects: Subject[] = [
  { id: "anatomy", name: "Anatomy", count: 313 },
  { id: "behavioral", name: "Behavioral science", count: 261 },
  { id: "biochemistry", name: "Biochemistry", count: 164 },
  { id: "biostatistics", name: "Biostatistics", count: 121 },
  { id: "embryology", name: "Embryology", count: 77 },
  { id: "genetics", name: "Genetics", count: 109 },
  { id: "histology", name: "Histology", count: 29 },
  { id: "immunology", name: "Immunology", count: 132 },
  { id: "microbiology", name: "Microbiology", count: 352 },
  { id: "pathology", name: "Pathology", count: 850 },
  { id: "pathophysiology", name: "Pathophysiology", count: 493 },
  { id: "pharmacology", name: "Pharmacology", count: 553 },
  { id: "physiology", name: "Physiology", count: 278 },
];

const systems: System[] = [
  { id: "biochem-general", name: "Biochemistry (General Principles)", count: 0 },
  { id: "genetics-general", name: "Genetics (General Principles)", count: 0 },
  { id: "microbiology-general", name: "Microbiology (General Principles)", count: 0 },
  { id: "pathology-general", name: "Pathology (General Principles)", count: 0 },
  { id: "pharmacology-general", name: "Pharmacology (General Principles)", count: 0 },
  { id: "allergy", name: "Allergy & Immunology", count: 0 },
  { id: "cardiovascular", name: "Cardiovascular System", count: 0 },
  { id: "dermatology", name: "Dermatology", count: 0 },
  { id: "ent", name: "Ear, Nose & Throat (ENT)", count: 0 },
  { id: "endocrine", name: "Endocrine, Diabetes & Metabolism", count: 0 },
  { id: "female-repro", name: "Female Reproductive System & Breast", count: 0 },
  { id: "gi", name: "Gastrointestinal & Nutrition", count: 0 },
  { id: "heme-onc", name: "Hematology & Oncology", count: 0 },
  { id: "infectious", name: "Infectious Diseases", count: 0 },
  { id: "male-repro", name: "Male Reproductive System", count: 0 },
  { id: "nervous", name: "Nervous System", count: 0 },
  { id: "ophthalmology", name: "Ophthalmology", count: 0 },
  { id: "pregnancy", name: "Pregnancy, Childbirth & Puerperium", count: 0 },
  { id: "pulmonary", name: "Pulmonary & Critical Care", count: 0 },
  { id: "renal", name: "Renal, Urinary Systems & Electrolytes", count: 0 },
  { id: "rheumatology", name: "Rheumatology/Orthopedics & Sports", count: 0 },
];

const questionModes = [
  { id: "unused", label: "Unused", count: 3732 },
  { id: "incorrect", label: "Incorrect", count: 0 },
  { id: "marked", label: "Marked", count: 0 },
  { id: "omitted", label: "Omitted", count: 0 },
  { id: "correct", label: "Correct", count: 0 },
];

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

  const totalAvailable = 10; // We have 10 sample questions

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
              {questionModes.map((mode) => (
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
                      checked={selectedSubjects.length === subjects.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSubjects(subjects.map((s) => s.id));
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
                    <div key={subject.id} className="flex items-center gap-2">
                      <Checkbox
                        id={subject.id}
                        checked={selectedSubjects.includes(subject.id)}
                        onCheckedChange={() => toggleSubject(subject.id)}
                      />
                      <Label htmlFor={subject.id} className="flex items-center gap-2">
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
                      checked={selectedSystems.length === systems.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSystems(systems.map((s) => s.id));
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
                    <div key={system.id} className="flex items-center gap-2">
                      <Checkbox
                        id={system.id}
                        checked={selectedSystems.includes(system.id)}
                        onCheckedChange={() => toggleSystem(system.id)}
                        disabled={system.count === 0}
                      />
                      <Label
                        htmlFor={system.id}
                        className={cn(
                          "flex items-center gap-2",
                          system.count === 0 && "text-muted-foreground"
                        )}
                      >
                        {system.name}
                        <Badge variant="outline" className="font-normal">
                          {system.count}
                        </Badge>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Number of Questions */}
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
