import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Table2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useFlashcards, FlashcardDeck } from "@/hooks/useFlashcards";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImportFlashcardsDialogProps {
  decks: FlashcardDeck[];
  onImportComplete: () => void;
  trigger?: React.ReactNode;
}

interface ParsedCard {
  front: string;
  back: string;
  valid: boolean;
}

export const ImportFlashcardsDialog = ({
  decks,
  onImportComplete,
  trigger,
}: ImportFlashcardsDialogProps) => {
  const { addFlashcard, createDeck } = useFlashcards();
  const [open, setOpen] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [newDeckName, setNewDeckName] = useState("");
  const [textInput, setTextInput] = useState("");
  const [parsedCards, setParsedCards] = useState<ParsedCard[]>([]);
  const [importing, setImporting] = useState(false);
  const [importTab, setImportTab] = useState<"text" | "csv">("text");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseTextInput = (text: string): ParsedCard[] => {
    const lines = text.trim().split("\n");
    const cards: ParsedCard[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Support various delimiters: tab, semicolon, pipe, or " - "
      let parts: string[] = [];
      
      if (trimmed.includes("\t")) {
        parts = trimmed.split("\t");
      } else if (trimmed.includes(";")) {
        parts = trimmed.split(";");
      } else if (trimmed.includes("|")) {
        parts = trimmed.split("|");
      } else if (trimmed.includes(" - ")) {
        parts = trimmed.split(" - ");
      }

      if (parts.length >= 2) {
        cards.push({
          front: parts[0].trim(),
          back: parts.slice(1).join(" - ").trim(),
          valid: true,
        });
      } else if (trimmed) {
        cards.push({
          front: trimmed,
          back: "",
          valid: false,
        });
      }
    });

    return cards;
  };

  const parseCSV = (content: string): ParsedCard[] => {
    const lines = content.trim().split("\n");
    const cards: ParsedCard[] = [];

    // Skip header if it looks like one
    const startIndex = lines[0]?.toLowerCase().includes("front") || 
                       lines[0]?.toLowerCase().includes("question") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles quoted fields)
      const matches = line.match(/(?:^|,)("(?:[^"]*(?:""[^"]*)*)")|(?:^|,)([^,]*)/g);
      
      if (matches && matches.length >= 2) {
        const front = matches[0].replace(/^,?"?|"?$/g, "").replace(/""/g, '"').trim();
        const back = matches[1].replace(/^,?"?|"?$/g, "").replace(/""/g, '"').trim();
        
        cards.push({
          front,
          back,
          valid: Boolean(front && back),
        });
      }
    }

    return cards;
  };

  const handleTextChange = (text: string) => {
    setTextInput(text);
    if (text.trim()) {
      setParsedCards(parseTextInput(text));
    } else {
      setParsedCards([]);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (file.name.endsWith(".csv")) {
        setParsedCards(parseCSV(content));
      } else {
        setParsedCards(parseTextInput(content));
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validCards = parsedCards.filter((c) => c.valid);
    
    if (validCards.length === 0) {
      toast.error("No valid cards to import");
      return;
    }

    let targetDeckId = selectedDeckId;

    // Create new deck if needed
    if (!targetDeckId && newDeckName.trim()) {
      const { data, error } = await createDeck(newDeckName.trim());
      if (error || !data) {
        toast.error("Failed to create deck");
        return;
      }
      targetDeckId = data.id;
    }

    if (!targetDeckId) {
      toast.error("Please select or create a deck");
      return;
    }

    setImporting(true);

    let successCount = 0;
    for (const card of validCards) {
      const { error } = await addFlashcard(targetDeckId, card.front, card.back);
      if (!error) {
        successCount++;
      }
    }

    setImporting(false);

    if (successCount > 0) {
      toast.success(`Imported ${successCount} flashcards`);
      onImportComplete();
      setOpen(false);
      resetForm();
    } else {
      toast.error("Failed to import cards");
    }
  };

  const resetForm = () => {
    setTextInput("");
    setParsedCards([]);
    setSelectedDeckId("");
    setNewDeckName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validCount = parsedCards.filter((c) => c.valid).length;
  const invalidCount = parsedCards.filter((c) => !c.valid).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Import Cards
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Flashcards</DialogTitle>
        </DialogHeader>

        <Tabs value={importTab} onValueChange={(v) => setImportTab(v as "text" | "csv")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="gap-2">
              <FileText className="h-4 w-4" />
              Paste Text
            </TabsTrigger>
            <TabsTrigger value="csv" className="gap-2">
              <Table2 className="h-4 w-4" />
              Upload File
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label>Paste your flashcards</Label>
              <Textarea
                placeholder={`Enter one card per line, separated by tab, semicolon, or pipe:\n\nQuestion 1 | Answer 1\nQuestion 2 ; Answer 2\nQuestion 3\tAnswer 3`}
                value={textInput}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: Tab-separated, semicolon-separated, pipe-separated, or " - " separated
              </p>
            </div>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4">
            <div className="space-y-2">
              <Label>Upload CSV or TXT file</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drop your file here or click to browse
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <span>Choose File</span>
                  </Button>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                CSV format: First column = front (question), Second column = back (answer)
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Preview */}
        {parsedCards.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Preview ({parsedCards.length} cards found)</Label>
              <div className="flex items-center gap-3 text-sm">
                {validCount > 0 && (
                  <span className="flex items-center gap-1 text-[hsl(var(--badge-success))]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {validCount} valid
                  </span>
                )}
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {invalidCount} invalid
                  </span>
                )}
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
              {parsedCards.slice(0, 10).map((card, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-2 text-sm flex gap-4",
                    !card.valid && "bg-destructive/5"
                  )}
                >
                  <div className="flex-1 truncate">
                    <span className="text-muted-foreground">Q: </span>
                    {card.front}
                  </div>
                  <div className="flex-1 truncate">
                    <span className="text-muted-foreground">A: </span>
                    {card.back || <span className="text-destructive">Missing</span>}
                  </div>
                </div>
              ))}
              {parsedCards.length > 10 && (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  And {parsedCards.length - 10} more...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deck Selection */}
        <div className="space-y-3">
          <Label>Select Destination Deck</Label>
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            value={selectedDeckId}
            onChange={(e) => {
              setSelectedDeckId(e.target.value);
              setNewDeckName("");
            }}
          >
            <option value="">Choose existing deck...</option>
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or create new</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Input
            placeholder="New deck name..."
            value={newDeckName}
            onChange={(e) => {
              setNewDeckName(e.target.value);
              setSelectedDeckId("");
            }}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleImport}
            disabled={importing || validCount === 0 || (!selectedDeckId && !newDeckName.trim())}
          >
            {importing ? "Importing..." : `Import ${validCount} Cards`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
