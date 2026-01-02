import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ChevronLeft, ChevronRight, Edit, Save, Trash2, Image as ImageIcon, 
  Upload, Check, X, Filter, Search, Eye, EyeOff, CheckSquare, Settings2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuestionOption {
  id: string;
  option_letter: string;
  option_text: string;
  is_correct: boolean;
  explanation: string | null;
}

interface Question {
  id: string;
  question_text: string;
  subject: string;
  system: string;
  category: string | null;
  difficulty: string | null;
  explanation: string | null;
  question_image_url: string | null;
  explanation_image_url: string | null;
  source_pdf: string | null;
  created_at: string;
  has_image: boolean | null;
  image_description: string | null;
  question_options: QuestionOption[];
}

const QuestionReview = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState<Question | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterNeedsImage, setFilterNeedsImage] = useState<boolean>(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [imageType, setImageType] = useState<"question" | "explanation">("question");
  
  // Bulk edit state
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkSystem, setBulkSystem] = useState("");
  const [bulkDifficulty, setBulkDifficulty] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    filterQuestions();
  }, [questions, searchQuery, filterSubject, filterCategory, filterNeedsImage]);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("questions")
        .select(`
          *,
          question_options (*)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      setQuestions(data || []);
      
      // Extract unique subjects and categories
      const uniqueSubjects = [...new Set((data || []).map(q => q.subject))].filter(Boolean);
      const uniqueCategories = [...new Set((data || []).map(q => q.category))].filter(Boolean) as string[];
      setSubjects(uniqueSubjects);
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error loading questions:", error);
      toast.error("Failed to load questions");
    }
    setIsLoading(false);
  };

  const filterQuestions = () => {
    let filtered = [...questions];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.question_text.toLowerCase().includes(query) ||
        q.explanation?.toLowerCase().includes(query)
      );
    }
    
    if (filterSubject !== "all") {
      filtered = filtered.filter(q => q.subject === filterSubject);
    }
    
    if (filterCategory !== "all") {
      filtered = filtered.filter(q => q.category === filterCategory);
    }
    
    if (filterNeedsImage) {
      filtered = filtered.filter(q => q.has_image && !q.question_image_url && !q.explanation_image_url);
    }
    
    setFilteredQuestions(filtered);
    setCurrentIndex(0);
  };

  const currentQuestion = filteredQuestions[currentIndex];

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsEditing(false);
      setShowExplanation(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsEditing(false);
      setShowExplanation(false);
    }
  };

  const startEditing = () => {
    setEditedQuestion({ ...currentQuestion });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedQuestion(null);
    setIsEditing(false);
  };

  const saveQuestion = async () => {
    if (!editedQuestion) return;
    
    try {
      const { error: questionError } = await supabase
        .from("questions")
        .update({
          question_text: editedQuestion.question_text,
          subject: editedQuestion.subject,
          system: editedQuestion.system,
          category: editedQuestion.category,
          difficulty: editedQuestion.difficulty,
          explanation: editedQuestion.explanation,
          question_image_url: editedQuestion.question_image_url,
          explanation_image_url: editedQuestion.explanation_image_url,
        })
        .eq("id", editedQuestion.id);

      if (questionError) throw questionError;

      // Update options
      for (const option of editedQuestion.question_options) {
        const { error: optionError } = await supabase
          .from("question_options")
          .update({
            option_text: option.option_text,
            is_correct: option.is_correct,
            explanation: option.explanation,
          })
          .eq("id", option.id);
        
        if (optionError) throw optionError;
      }

      toast.success("Question updated successfully");
      setIsEditing(false);
      loadQuestions();
    } catch (error) {
      console.error("Error saving question:", error);
      toast.error("Failed to save question");
    }
  };

  const deleteQuestion = async () => {
    if (!currentQuestion) return;
    
    if (!confirm("Are you sure you want to delete this question?")) return;
    
    try {
      const { error } = await supabase
        .from("questions")
        .delete()
        .eq("id", currentQuestion.id);

      if (error) throw error;

      toast.success("Question deleted");
      loadQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editedQuestion) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${editedQuestion.id}_${imageType}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("question-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("question-images")
        .getPublicUrl(fileName);

      if (imageType === "question") {
        setEditedQuestion({ ...editedQuestion, question_image_url: urlData.publicUrl });
      } else {
        setEditedQuestion({ ...editedQuestion, explanation_image_url: urlData.publicUrl });
      }

      toast.success("Image uploaded successfully");
      setImageUploadOpen(false);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    }
  };

  const updateOption = (index: number, field: keyof QuestionOption, value: string | boolean) => {
    if (!editedQuestion) return;
    
    const updatedOptions = [...editedQuestion.question_options];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    
    // If setting this option as correct, unset others
    if (field === "is_correct" && value === true) {
      updatedOptions.forEach((opt, i) => {
        if (i !== index) opt.is_correct = false;
      });
    }
    
    setEditedQuestion({ ...editedQuestion, question_options: updatedOptions });
  };

  // Bulk edit functions
  const toggleQuestionSelection = (questionId: string) => {
    const newSelection = new Set(selectedQuestions);
    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }
    setSelectedQuestions(newSelection);
  };

  const selectAllVisible = () => {
    const allIds = new Set(filteredQuestions.map(q => q.id));
    setSelectedQuestions(allIds);
  };

  const clearSelection = () => {
    setSelectedQuestions(new Set());
  };

  const applyBulkEdit = async () => {
    if (selectedQuestions.size === 0) {
      toast.error("No questions selected");
      return;
    }

    const updates: Record<string, string> = {};
    if (bulkSubject) updates.subject = bulkSubject;
    if (bulkCategory) updates.category = bulkCategory;
    if (bulkSystem) updates.system = bulkSystem;
    if (bulkDifficulty) updates.difficulty = bulkDifficulty;

    if (Object.keys(updates).length === 0) {
      toast.error("No changes specified");
      return;
    }

    try {
      const { error } = await supabase
        .from("questions")
        .update(updates)
        .in("id", Array.from(selectedQuestions));

      if (error) throw error;

      toast.success(`Updated ${selectedQuestions.size} questions`);
      setBulkEditOpen(false);
      setBulkSubject("");
      setBulkCategory("");
      setBulkSystem("");
      setBulkDifficulty("");
      setSelectedQuestions(new Set());
      setSelectionMode(false);
      loadQuestions();
    } catch (error) {
      console.error("Error applying bulk edit:", error);
      toast.error("Failed to apply bulk edit");
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Question Review">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Question Review">
      <div className="space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={filterNeedsImage ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterNeedsImage(!filterNeedsImage)}
              >
                <ImageIcon className="h-4 w-4 mr-1" />
                Needs Image
              </Button>
              <Badge variant="secondary">
                {filteredQuestions.length} questions
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Edit Controls */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant={selectionMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectionMode(!selectionMode);
                    if (selectionMode) clearSelection();
                  }}
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  {selectionMode ? "Exit Selection" : "Select Multiple"}
                </Button>
                
                {selectionMode && (
                  <>
                    <Button variant="outline" size="sm" onClick={selectAllVisible}>
                      Select All ({filteredQuestions.length})
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      Clear
                    </Button>
                    <Badge variant="default">
                      {selectedQuestions.size} selected
                    </Badge>
                  </>
                )}
              </div>
              
              {selectionMode && selectedQuestions.size > 0 && (
                <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Settings2 className="h-4 w-4 mr-1" />
                      Bulk Edit Selected
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Bulk Edit {selectedQuestions.size} Questions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-sm text-muted-foreground">
                        Leave fields empty to keep existing values unchanged.
                      </p>
                      <div className="space-y-3">
                        <div>
                          <Label>Subject</Label>
                          <Input
                            value={bulkSubject}
                            onChange={(e) => setBulkSubject(e.target.value)}
                            placeholder="Enter new subject..."
                          />
                        </div>
                        <div>
                          <Label>System</Label>
                          <Input
                            value={bulkSystem}
                            onChange={(e) => setBulkSystem(e.target.value)}
                            placeholder="Enter new system..."
                          />
                        </div>
                        <div>
                          <Label>Category</Label>
                          <Input
                            value={bulkCategory}
                            onChange={(e) => setBulkCategory(e.target.value)}
                            placeholder="Enter new category..."
                          />
                        </div>
                        <div>
                          <Label>Difficulty</Label>
                          <Select value={bulkDifficulty} onValueChange={setBulkDifficulty}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select difficulty..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setBulkEditOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={applyBulkEdit}>
                        Apply Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>

        {filteredQuestions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No questions found. Import some questions first.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={handlePrevious} disabled={currentIndex === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Question {currentIndex + 1} of {filteredQuestions.length}
              </span>
              <Button variant="outline" onClick={handleNext} disabled={currentIndex === filteredQuestions.length - 1}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Question Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectionMode && (
                      <Checkbox
                        checked={selectedQuestions.has(currentQuestion?.id)}
                        onCheckedChange={() => toggleQuestionSelection(currentQuestion?.id)}
                      />
                    )}
                    <Badge>{isEditing ? editedQuestion?.subject : currentQuestion?.subject}</Badge>
                    <Badge variant="outline">{isEditing ? editedQuestion?.system : currentQuestion?.system}</Badge>
                    {(isEditing ? editedQuestion?.category : currentQuestion?.category) && (
                      <Badge variant="secondary">
                        {isEditing ? editedQuestion?.category : currentQuestion?.category}
                      </Badge>
                    )}
                    {currentQuestion?.has_image && !currentQuestion?.explanation_image_url && (
                      <Badge variant="destructive" className="gap-1">
                        <ImageIcon className="h-3 w-3" /> Needs Image
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <>
                        <Button variant="outline" size="sm" onClick={startEditing}>
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={deleteQuestion}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={cancelEditing}>
                          <X className="h-4 w-4 mr-1" /> Cancel
                        </Button>
                        <Button size="sm" onClick={saveQuestion}>
                          <Save className="h-4 w-4 mr-1" /> Save
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Question Text */}
                <div>
                  <Label className="text-sm font-medium">Question</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedQuestion?.question_text || ""}
                      onChange={(e) => setEditedQuestion(prev => prev ? { ...prev, question_text: e.target.value } : null)}
                      className="mt-2 min-h-[100px]"
                    />
                  ) : (
                    <p className="mt-2 text-foreground whitespace-pre-wrap">{currentQuestion?.question_text}</p>
                  )}
                </div>

                {/* Question Image */}
                {(currentQuestion?.question_image_url || (isEditing && editedQuestion)) && (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Question Image</Label>
                      {isEditing && (
                        <Dialog open={imageUploadOpen && imageType === "question"} onOpenChange={(open) => {
                          setImageUploadOpen(open);
                          setImageType("question");
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Upload className="h-4 w-4 mr-1" /> Upload Image
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Upload Question Image</DialogTitle>
                            </DialogHeader>
                            <Input type="file" accept="image/*" onChange={handleImageUpload} />
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    {(isEditing ? editedQuestion?.question_image_url : currentQuestion?.question_image_url) && (
                      <img
                        src={isEditing ? editedQuestion?.question_image_url! : currentQuestion?.question_image_url!}
                        alt="Question"
                        className="mt-2 max-w-full max-h-64 rounded-lg border"
                      />
                    )}
                  </div>
                )}

                {/* Answer Options */}
                <div>
                  <Label className="text-sm font-medium">Answer Options</Label>
                  <div className="mt-2 space-y-3">
                    {(isEditing ? editedQuestion?.question_options : currentQuestion?.question_options)?.map((option, index) => (
                      <div
                        key={option.id}
                        className={`p-3 rounded-lg border ${option.is_correct ? "border-green-500 bg-green-500/10" : "border-border"}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-medium text-sm">{option.option_letter}.</span>
                          {isEditing ? (
                            <div className="flex-1 space-y-2">
                              <Input
                                value={option.option_text}
                                onChange={(e) => updateOption(index, "option_text", e.target.value)}
                              />
                              <div className="flex items-center gap-2">
                                <Button
                                  variant={option.is_correct ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => updateOption(index, "is_correct", true)}
                                >
                                  <Check className="h-4 w-4 mr-1" /> Correct
                                </Button>
                              </div>
                              <Textarea
                                placeholder="Option explanation (optional)"
                                value={option.explanation || ""}
                                onChange={(e) => updateOption(index, "explanation", e.target.value)}
                                className="text-sm"
                              />
                            </div>
                          ) : (
                            <div className="flex-1">
                              <p className="text-foreground">{option.option_text}</p>
                              {option.is_correct && (
                                <Badge variant="default" className="mt-1">Correct Answer</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Explanation Section */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Explanation</Label>
                    {!isEditing && (
                      <Button variant="ghost" size="sm" onClick={() => setShowExplanation(!showExplanation)}>
                        {showExplanation ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                        {showExplanation ? "Hide" : "Show"}
                      </Button>
                    )}
                  </div>
                  {(isEditing || showExplanation) && (
                    <div className="mt-2">
                      {isEditing ? (
                        <Textarea
                          value={editedQuestion?.explanation || ""}
                          onChange={(e) => setEditedQuestion(prev => prev ? { ...prev, explanation: e.target.value } : null)}
                          className="min-h-[200px]"
                          placeholder="Enter detailed explanation..."
                        />
                      ) : (
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="whitespace-pre-wrap">{currentQuestion?.explanation || "No explanation provided"}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* AI-Detected Image Description */}
                {currentQuestion?.has_image && currentQuestion?.image_description && (showExplanation || isEditing) && (
                  <div className="p-4 border border-primary/30 bg-primary/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium text-primary">AI-Detected Image Description</Label>
                      <Badge variant="outline" className="text-xs">Needs Image Upload</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground italic">
                      {currentQuestion.image_description}
                    </p>
                    {isEditing && (
                      <div className="mt-3">
                        <Button variant="outline" size="sm" onClick={() => {
                          setImageType("explanation");
                          setImageUploadOpen(true);
                        }}>
                          <Upload className="h-4 w-4 mr-1" /> Upload This Image
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation Image */}
                {(currentQuestion?.explanation_image_url || (isEditing && editedQuestion)) && (showExplanation || isEditing) && (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Explanation Image</Label>
                      {isEditing && (
                        <Dialog open={imageUploadOpen && imageType === "explanation"} onOpenChange={(open) => {
                          setImageUploadOpen(open);
                          setImageType("explanation");
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Upload className="h-4 w-4 mr-1" /> Upload Image
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Upload Explanation Image</DialogTitle>
                            </DialogHeader>
                            <Input type="file" accept="image/*" onChange={handleImageUpload} />
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    {(isEditing ? editedQuestion?.explanation_image_url : currentQuestion?.explanation_image_url) && (
                      <img
                        src={isEditing ? editedQuestion?.explanation_image_url! : currentQuestion?.explanation_image_url!}
                        alt="Explanation"
                        className="mt-2 max-w-full max-h-64 rounded-lg border"
                      />
                    )}
                  </div>
                )}

                {/* Metadata */}
                {isEditing && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Subject</Label>
                      <Input
                        value={editedQuestion?.subject || ""}
                        onChange={(e) => setEditedQuestion(prev => prev ? { ...prev, subject: e.target.value } : null)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>System</Label>
                      <Input
                        value={editedQuestion?.system || ""}
                        onChange={(e) => setEditedQuestion(prev => prev ? { ...prev, system: e.target.value } : null)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input
                        value={editedQuestion?.category || ""}
                        onChange={(e) => setEditedQuestion(prev => prev ? { ...prev, category: e.target.value } : null)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Difficulty</Label>
                      <Select
                        value={editedQuestion?.difficulty || "medium"}
                        onValueChange={(value) => setEditedQuestion(prev => prev ? { ...prev, difficulty: value } : null)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Source Info */}
                {currentQuestion?.source_pdf && (
                  <div className="text-xs text-muted-foreground">
                    Source: {currentQuestion.source_pdf} • Imported: {new Date(currentQuestion.created_at).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Selection List in Selection Mode */}
            {selectionMode && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Selection</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {filteredQuestions.map((q, idx) => (
                        <div
                          key={q.id}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted ${
                            idx === currentIndex ? "bg-muted" : ""
                          }`}
                          onClick={() => setCurrentIndex(idx)}
                        >
                          <Checkbox
                            checked={selectedQuestions.has(q.id)}
                            onCheckedChange={() => toggleQuestionSelection(q.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-sm truncate flex-1">
                            {idx + 1}. {q.question_text.substring(0, 80)}...
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {q.category || q.subject}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default QuestionReview;
