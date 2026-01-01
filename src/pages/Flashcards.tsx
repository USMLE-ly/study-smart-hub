import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, FolderPlus, Plus, FileText, BarChart3, ChevronDown, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFlashcards, FlashcardDeck } from "@/hooks/useFlashcards";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/LoadingSpinner";

const Flashcards = () => {
  const navigate = useNavigate();
  const { decks, loading, createDeck, addFlashcard, fetchDecks, deleteDeck, getFlashcardsForDeck } = useFlashcards();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Create Deck Dialog state
  const [createDeckOpen, setCreateDeckOpen] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDescription, setNewDeckDescription] = useState("");
  
  // Create Card Dialog state
  const [createCardOpen, setCreateCardOpen] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [newCardFront, setNewCardFront] = useState("");
  const [newCardBack, setNewCardBack] = useState("");

  const [deckCardCounts, setDeckCardCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadCounts = async () => {
      const counts: Record<string, number> = {};
      for (const deck of decks) {
        const { data } = await getFlashcardsForDeck(deck.id);
        counts[deck.id] = data?.length || 0;
      }
      setDeckCardCounts(counts);
    };
    if (decks.length > 0) {
      loadCounts();
    }
  }, [decks, getFlashcardsForDeck]);

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) {
      toast.error("Please enter a deck name");
      return;
    }

    const { error } = await createDeck(newDeckName, newDeckDescription);
    if (error) {
      toast.error("Failed to create deck");
    } else {
      toast.success("Deck created successfully");
      setNewDeckName("");
      setNewDeckDescription("");
      setCreateDeckOpen(false);
    }
  };

  const handleCreateCard = async () => {
    if (!selectedDeckId) {
      toast.error("Please select a deck");
      return;
    }
    if (!newCardFront.trim() || !newCardBack.trim()) {
      toast.error("Please fill in both front and back");
      return;
    }

    const { error } = await addFlashcard(selectedDeckId, newCardFront, newCardBack);
    if (error) {
      toast.error("Failed to create flashcard");
    } else {
      toast.success("Flashcard created successfully");
      setNewCardFront("");
      setNewCardBack("");
      setSelectedDeckId("");
      setCreateCardOpen(false);
      fetchDecks();
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    const { error } = await deleteDeck(deckId);
    if (error) {
      toast.error("Failed to delete deck");
    } else {
      toast.success("Deck deleted");
    }
  };

  const filteredDecks = decks.filter((deck) =>
    deck.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const getColorClass = (index: number) => {
    const colors = [
      "bg-primary",
      "bg-[hsl(var(--badge-success))]",
      "bg-[hsl(var(--badge-practice))]",
      "bg-secondary",
      "bg-[hsl(var(--badge-flashcard))]",
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <AppLayout title="Flashcards">
        <LoadingState message="Loading flashcards..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Flashcards">
      <div className="space-y-6">
        <Tabs defaultValue="study" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="browse">Browse</TabsTrigger>
              <TabsTrigger value="study">Study</TabsTrigger>
            </TabsList>
            <Button variant="ghost" className="text-primary gap-2">
              <FileText className="h-4 w-4" />
              Using Your Flashcards
            </Button>
          </div>

          <TabsContent value="browse" className="space-y-6">
            {/* Search and Actions */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Input
                      placeholder="Search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex items-center gap-2">
                    <Dialog open={createDeckOpen} onOpenChange={setCreateDeckOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="text-primary gap-2">
                          <FolderPlus className="h-4 w-4" />
                          Create Deck
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Deck</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="deckName">Deck Name</Label>
                            <Input
                              id="deckName"
                              placeholder="e.g., Biochemistry"
                              value={newDeckName}
                              onChange={(e) => setNewDeckName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="deckDesc">Description (optional)</Label>
                            <Textarea
                              id="deckDesc"
                              placeholder="What's this deck about?"
                              value={newDeckDescription}
                              onChange={(e) => setNewDeckDescription(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button onClick={handleCreateDeck}>Create Deck</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={createCardOpen} onOpenChange={setCreateCardOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="text-primary gap-2">
                          <Plus className="h-4 w-4" />
                          New Card
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Create New Flashcard</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Select Deck</Label>
                            <select
                              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                              value={selectedDeckId}
                              onChange={(e) => setSelectedDeckId(e.target.value)}
                            >
                              <option value="">Choose a deck...</option>
                              {decks.map((deck) => (
                                <option key={deck.id} value={deck.id}>
                                  {deck.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cardFront">Front (Question)</Label>
                            <Textarea
                              id="cardFront"
                              placeholder="Enter the question or prompt"
                              value={newCardFront}
                              onChange={(e) => setNewCardFront(e.target.value)}
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cardBack">Back (Answer)</Label>
                            <Textarea
                              id="cardBack"
                              placeholder="Enter the answer or explanation"
                              value={newCardBack}
                              onChange={(e) => setNewCardBack(e.target.value)}
                              rows={3}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button onClick={handleCreateCard}>Create Card</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deck List */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDecks.map((deck, index) => (
                <Card key={deck.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${getColorClass(index)} text-primary-foreground font-semibold`}>
                        {getInitial(deck.name)}
                      </div>
                      <div className="flex-1">
                        <Link to={`/flashcards/study/${deck.id}`} className="font-medium text-foreground hover:text-primary">
                          {deck.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {deckCardCounts[deck.id] || 0} cards
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteDeck(deck.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredDecks.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No flashcard decks yet</p>
                  <Button onClick={() => setCreateDeckOpen(true)}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Create Your First Deck
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="study" className="space-y-6">
            {/* Search */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Input
                      placeholder="Search deck names"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>

                  <Button variant="ghost" className="text-primary gap-2">
                    <BarChart3 className="h-4 w-4" />
                    View Stats
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Decks Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Choose Deck</TableHead>
                      <TableHead className="text-center">Total Cards</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDecks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          No decks found. Create one to get started!
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDecks.map((deck, index) => (
                        <TableRow key={deck.id} className="hover:bg-accent/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getColorClass(index)} text-primary-foreground text-sm font-semibold`}>
                                {getInitial(deck.name)}
                              </div>
                              <span className="font-medium text-foreground">{deck.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-primary font-medium">
                            {deckCardCounts[deck.id] || 0}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => navigate(`/flashcards/study/${deck.id}`)}
                            >
                              Study
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Flashcards;