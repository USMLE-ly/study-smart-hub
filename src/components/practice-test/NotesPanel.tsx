import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Trash2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Note {
  questionId: string;
  questionText: string;
  content: string;
}

interface NotesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentQuestionId: string;
  currentQuestionText: string;
  testId?: string;
  onNoteSaved?: () => void;
}

export function NotesPanel({
  open,
  onOpenChange,
  currentQuestionId,
  currentQuestionText,
  testId,
  onNoteSaved,
}: NotesPanelProps) {
  const { user } = useAuth();
  const [noteContent, setNoteContent] = useState("");
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"current" | "all">("current");

  useEffect(() => {
    if (open && currentQuestionId && user) {
      loadCurrentNote();
      loadAllNotes();
    }
  }, [open, currentQuestionId, user]);

  const loadCurrentNote = async () => {
    if (!user || !currentQuestionId) return;
    
    const { data } = await supabase
      .from("question_notes")
      .select("note_content")
      .eq("user_id", user.id)
      .eq("question_id", currentQuestionId)
      .single();
    
    if (data) {
      setNoteContent(data.note_content);
    } else {
      setNoteContent("");
    }
  };

  const loadAllNotes = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("question_notes")
      .select(`
        question_id,
        note_content,
        questions!inner(question_text)
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    
    if (data) {
      setAllNotes(data.map((n: any) => ({
        questionId: n.question_id,
        questionText: n.questions.question_text,
        content: n.note_content,
      })));
    }
  };

  const handleSave = async () => {
    if (!user || !currentQuestionId) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("question_notes")
        .upsert({
          user_id: user.id,
          question_id: currentQuestionId,
          test_id: testId || null,
          note_content: noteContent,
        }, {
          onConflict: "user_id,question_id",
        });

      if (error) throw error;
      toast.success("Note saved");
      onNoteSaved?.();
      loadAllNotes();
    } catch (error) {
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !currentQuestionId) return;

    try {
      const { error } = await supabase
        .from("question_notes")
        .delete()
        .eq("user_id", user.id)
        .eq("question_id", currentQuestionId);

      if (error) throw error;
      setNoteContent("");
      toast.success("Note deleted");
      onNoteSaved?.();
      loadAllNotes();
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  const handleExport = () => {
    if (allNotes.length === 0) {
      toast.error("No notes to export");
      return;
    }

    const content = allNotes.map((note, i) => 
      `--- Note ${i + 1} ---\nQuestion: ${note.questionText.slice(0, 200)}...\n\nNote:\n${note.content}\n\n`
    ).join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-notes-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${allNotes.length} notes`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">Notes</SheetTitle>
        </SheetHeader>

        <div className="flex gap-2 mt-4 mb-4">
          <Button
            variant={activeTab === "current" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("current")}
          >
            Current Question
          </Button>
          <Button
            variant={activeTab === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("all")}
          >
            All Notes ({allNotes.length})
          </Button>
        </div>

        {activeTab === "current" ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg line-clamp-3">
              {currentQuestionText.slice(0, 200)}...
            </div>
            
            <Textarea
              placeholder="Write your notes for this question..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={10}
              className="resize-none"
            />

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Note"}
              </Button>
              {noteContent && (
                <Button variant="outline" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button variant="outline" size="sm" onClick={handleExport} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export All Notes
            </Button>
            
            <ScrollArea className="h-[calc(100vh-240px)]">
              <div className="space-y-3">
                {allNotes.map((note, i) => (
                  <div key={note.questionId} className="p-3 border rounded-lg">
                    <div className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {note.questionText.slice(0, 100)}...
                    </div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">
                      {note.content}
                    </div>
                  </div>
                ))}
                {allNotes.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No notes yet. Add notes to questions as you study!
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
