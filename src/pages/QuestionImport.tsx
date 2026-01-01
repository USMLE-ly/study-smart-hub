import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ParsedQuestion {
  question_text: string;
  subject: string;
  system: string;
  difficulty: string;
  explanation: string;
  options: {
    letter: string;
    text: string;
    is_correct: boolean;
    explanation?: string;
  }[];
  isValid: boolean;
  errors: string[];
}

interface ImportStats {
  total: number;
  valid: number;
  invalid: number;
  imported: number;
}

const QuestionImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [stats, setStats] = useState<ImportStats>({ total: 0, valid: 0, invalid: 0, imported: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = [
      "question_text",
      "subject",
      "system",
      "difficulty",
      "explanation",
      "option_a",
      "option_b",
      "option_c",
      "option_d",
      "option_e",
      "correct_answer",
      "option_a_explanation",
      "option_b_explanation",
      "option_c_explanation",
      "option_d_explanation",
      "option_e_explanation",
    ];
    
    const sampleRow = [
      "A 45-year-old man presents with chest pain. What is the most likely diagnosis?",
      "Cardiology",
      "Cardiovascular",
      "medium",
      "This is the explanation for the correct answer.",
      "Myocardial infarction",
      "Gastroesophageal reflux",
      "Pulmonary embolism",
      "Pneumonia",
      "Costochondritis",
      "A",
      "Correct! Classic presentation of MI.",
      "Unlikely given the symptoms.",
      "Would present differently.",
      "No respiratory symptoms.",
      "Tenderness would be present.",
    ];
    
    const csvContent = [headers.join(","), sampleRow.map(cell => `"${cell}"`).join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "question_import_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if ((char === "\n" || (char === "\r" && nextChar === "\n")) && !insideQuotes) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = "";
        if (char === "\r") i++;
      } else {
        currentCell += char;
      }
    }

    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell)) {
        rows.push(currentRow);
      }
    }

    return rows;
  };

  const validateQuestion = (row: string[], headers: string[]): ParsedQuestion => {
    const errors: string[] = [];
    const getValue = (key: string) => {
      const index = headers.indexOf(key);
      return index >= 0 ? row[index] || "" : "";
    };

    const questionText = getValue("question_text");
    const subject = getValue("subject");
    const system = getValue("system");
    const difficulty = getValue("difficulty") || "medium";
    const explanation = getValue("explanation");
    const correctAnswer = getValue("correct_answer").toUpperCase();

    if (!questionText) errors.push("Question text is required");
    if (!subject) errors.push("Subject is required");
    if (!system) errors.push("System is required");
    if (!correctAnswer || !["A", "B", "C", "D", "E"].includes(correctAnswer)) {
      errors.push("Valid correct answer (A-E) is required");
    }

    const options = ["A", "B", "C", "D", "E"]
      .map((letter) => {
        const text = getValue(`option_${letter.toLowerCase()}`);
        const optExplanation = getValue(`option_${letter.toLowerCase()}_explanation`);
        return {
          letter,
          text,
          is_correct: letter === correctAnswer,
          explanation: optExplanation,
        };
      })
      .filter((opt) => opt.text);

    if (options.length < 2) errors.push("At least 2 options are required");

    return {
      question_text: questionText,
      subject,
      system,
      difficulty,
      explanation,
      options,
      isValid: errors.length === 0,
      errors,
    };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsLoading(true);
    setParsedQuestions([]);

    try {
      const text = await selectedFile.text();
      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        toast.error("File must have at least a header row and one data row");
        setIsLoading(false);
        return;
      }

      const headers = rows[0].map((h) => h.toLowerCase().trim());
      const dataRows = rows.slice(1);

      const questions = dataRows.map((row) => validateQuestion(row, headers));
      const validCount = questions.filter((q) => q.isValid).length;

      setParsedQuestions(questions);
      setStats({
        total: questions.length,
        valid: validCount,
        invalid: questions.length - validCount,
        imported: 0,
      });

      toast.success(`Parsed ${questions.length} questions (${validCount} valid)`);
    } catch (error) {
      toast.error("Failed to parse file");
      console.error(error);
    }

    setIsLoading(false);
  };

  const handleImport = async () => {
    const validQuestions = parsedQuestions.filter((q) => q.isValid);
    if (validQuestions.length === 0) {
      toast.error("No valid questions to import");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    let imported = 0;

    for (let i = 0; i < validQuestions.length; i++) {
      const q = validQuestions[i];

      try {
        // Insert question
        const { data: questionData, error: questionError } = await supabase
          .from("questions")
          .insert({
            question_text: q.question_text,
            subject: q.subject,
            system: q.system,
            difficulty: q.difficulty,
            explanation: q.explanation,
          })
          .select()
          .single();

        if (questionError) throw questionError;

        // Insert options
        const optionsToInsert = q.options.map((opt) => ({
          question_id: questionData.id,
          option_letter: opt.letter,
          option_text: opt.text,
          is_correct: opt.is_correct,
          explanation: opt.explanation || null,
        }));

        const { error: optionsError } = await supabase
          .from("question_options")
          .insert(optionsToInsert);

        if (optionsError) throw optionsError;

        imported++;
      } catch (error) {
        console.error(`Failed to import question ${i + 1}:`, error);
      }

      setImportProgress(Math.round(((i + 1) / validQuestions.length) * 100));
    }

    setStats((prev) => ({ ...prev, imported }));
    setIsImporting(false);
    toast.success(`Successfully imported ${imported} questions`);
  };

  const clearFile = () => {
    setFile(null);
    setParsedQuestions([]);
    setStats({ total: 0, valid: 0, invalid: 0, imported: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <AppLayout title="Import Questions">
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Import Questions</h2>
            <p className="text-muted-foreground mt-1">
              Upload a CSV file to bulk import questions into the QBank
            </p>
          </div>
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </div>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload File</CardTitle>
            <CardDescription>
              Upload a CSV file with your questions. Download the template for the correct format.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
              >
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-foreground font-medium mb-1">Click to upload CSV file</p>
                <p className="text-sm text-muted-foreground">or drag and drop</p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        {parsedQuestions.length > 0 && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-semibold">{stats.total}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Total Questions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[hsl(var(--badge-success))]" />
                  <span className="text-2xl font-semibold">{stats.valid}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Valid</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="text-2xl font-semibold">{stats.invalid}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Invalid</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-semibold">{stats.imported}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Imported</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Import Progress */}
        {isImporting && (
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Importing questions...</span>
                <span className="text-sm text-muted-foreground">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Preview Table */}
        {parsedQuestions.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Preview</CardTitle>
                <CardDescription>Review parsed questions before importing</CardDescription>
              </div>
              <Button
                onClick={handleImport}
                disabled={stats.valid === 0 || isImporting}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Import {stats.valid} Questions
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="min-w-[300px]">Question</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>System</TableHead>
                      <TableHead>Options</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedQuestions.map((q, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          {q.isValid ? (
                            <Badge className="bg-[hsl(var(--badge-success))] text-[hsl(var(--badge-success-foreground))]">
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="cursor-help" title={q.errors.join(", ")}>
                              Invalid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="truncate">{q.question_text || "-"}</p>
                          {!q.isValid && (
                            <p className="text-xs text-destructive mt-1">{q.errors.join(", ")}</p>
                          )}
                        </TableCell>
                        <TableCell>{q.subject || "-"}</TableCell>
                        <TableCell>{q.system || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {q.options.map((opt) => (
                              <Badge
                                key={opt.letter}
                                variant={opt.is_correct ? "default" : "outline"}
                                className="text-xs"
                              >
                                {opt.letter}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Help Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>CSV Format Requirements</AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Required columns: question_text, subject, system, correct_answer</li>
              <li>Options: option_a through option_e (at least 2 required)</li>
              <li>correct_answer: A, B, C, D, or E</li>
              <li>Optional: difficulty (easy/medium/hard), explanation, option explanations</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </AppLayout>
  );
};

export default QuestionImport;
