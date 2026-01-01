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
import { Progress } from "@/components/ui/progress";
import { Search, FolderPlus, Plus, FileText, BarChart3, Trash2, Pencil, Trophy, BookOpen, Sparkles } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFlashcards, FlashcardDeck, Flashcard } from "@/hooks/useFlashcards";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/LoadingSpinner";

interface DeckStats {
  totalCards: number;
  mastered: number;
  learning: number;
  newCards: number;
  masteryPercentage: number;
}

const Flashcards = () => {
  const navigate = useNavigate();
  const { 
    decks, 
    loading, 
    createDeck, 
    addFlashcard, 
    fetchDecks, 
    deleteDeck, 
    getFlashcardsForDeck,
    updateDeck,
    updateFlashcard,
    deleteFlashcard,
    getDeckStats
  } = useFlashcards();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Create Deck Dialog state
  const [createDeckOpen, setCreateDeckOpen] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDescription, setNewDeckDescription] = useState("");
  
  // Edit Deck Dialog state
  const [editDeckOpen, setEditDeckOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null);
  const [editDeckName, setEditDeckName] = useState("");
  const [editDeckDescription, setEditDeckDescription] = useState("");
  
  // Create Card Dialog state
  const [createCardOpen, setCreateCardOpen] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [newCardFront, setNewCardFront] = useState("");
  const [newCardBack, setNewCardBack] = useState("");

  // Edit Card Dialog state
  const [editCardOpen, setEditCardOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [editCardFront, setEditCardFront] = useState("");
  const [editCardBack, setEditCardBack] = useState("");

  // View Cards Dialog state
  const [viewCardsOpen, setViewCardsOpen] = useState(false);
  const [viewingDeckId, setViewingDeckId] = useState("");
  const [deckCards, setDeckCards] = useState<Flashcard[]>([]);

  const [deckStats, setDeckStats] = useState<Record<string, DeckStats>>({});

  // Load stats when decks change
  const loadStats = useCallback(async () => {
    const stats: Record<string, DeckStats> = {};
    for (const deck of decks) {
      const { data } = await getDeckStats(deck.id);
      if (data) {
        stats[deck.id] = data;
      }
    }
    setDeckStats(stats);
  }, [decks, getDeckStats]);

  useEffect(() => {
    if (decks.length > 0) {
      loadStats();
    }
  }, [decks, loadStats]);

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

  const handleEditDeck = async () => {
    if (!editingDeck || !editDeckName.trim()) {
      toast.error("Please enter a deck name");
      return;
    }

    const { error } = await updateDeck(editingDeck.id, editDeckName, editDeckDescription);
    if (error) {
      toast.error("Failed to update deck");
    } else {
      toast.success("Deck updated successfully");
      setEditDeckOpen(false);
      setEditingDeck(null);
    }
  };

  const openEditDeck = (deck: FlashcardDeck) => {
    setEditingDeck(deck);
    setEditDeckName(deck.name);
    setEditDeckDescription(deck.description || "");
    setEditDeckOpen(true);
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
      // Refresh decks and stats
      await fetchDecks();
      // Refresh stats for the deck
      const { data: newStats } = await getDeckStats(selectedDeckId);
      if (newStats) {
        setDeckStats(prev => ({ ...prev, [selectedDeckId]: newStats }));
      }
    }
  };

  const handleEditCard = async () => {
    if (!editingCard || !editCardFront.trim() || !editCardBack.trim()) {
      toast.error("Please fill in both front and back");
      return;
    }

    const { error } = await updateFlashcard(editingCard.id, editCardFront, editCardBack);
    if (error) {
      toast.error("Failed to update flashcard");
    } else {
      toast.success("Flashcard updated successfully");
      setEditCardOpen(false);
      setEditingCard(null);
      // Refresh cards list
      if (viewingDeckId) {
        const { data } = await getFlashcardsForDeck(viewingDeckId);
        setDeckCards(data || []);
      }
    }
  };

  const openEditCard = (card: Flashcard) => {
    setEditingCard(card);
    setEditCardFront(card.front_content);
    setEditCardBack(card.back_content);
    setEditCardOpen(true);
  };

  const handleViewCards = async (deckId: string) => {
    setViewingDeckId(deckId);
    const { data } = await getFlashcardsForDeck(deckId);
    setDeckCards(data || []);
    setViewCardsOpen(true);
  };

  const handleDeleteCard = async (cardId: string) => {
    const { error } = await deleteFlashcard(cardId);
    if (error) {
      toast.error("Failed to delete flashcard");
    } else {
      toast.success("Flashcard deleted");
      setDeckCards((prev) => prev.filter((c) => c.id !== cardId));
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

  const getMasteryColor = (percentage: number) => {
    if (percentage >= 80) return "text-[hsl(var(--badge-success))]";
    if (percentage >= 50) return "text-primary";
    if (percentage >= 20) return "text-[hsl(var(--badge-practice))]";
    return "text-muted-foreground";
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
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" className="text-primary gap-2">
                  <FileText className="h-4 w-4" />
                  Using Your Flashcards
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>How to Use Flashcards</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 text-sm text-muted-foreground">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0">1</div>
                    <div>
                      <p className="font-medium text-foreground">Create Decks</p>
                      <p>Organize your flashcards into decks by subject or topic.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0">2</div>
                    <div>
                      <p className="font-medium text-foreground">Add Cards</p>
                      <p>Create new cards with questions on the front and answers on the back.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0">3</div>
                    <div>
                      <p className="font-medium text-foreground">Study with Spaced Repetition</p>
                      <p>Cards you get right move to higher boxes and appear less often. Wrong answers go back to box 1 for more practice.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--badge-success))]/10 text-[hsl(var(--badge-success))] font-semibold shrink-0">✓</div>
                    <div>
                      <p className="font-medium text-foreground">Auto-Save Wrong Answers</p>
                      <p>Questions you answer incorrectly in QBank are automatically saved to a "Wrong Answers" deck for review!</p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button>Got it!</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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

            {/* Deck List with Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDecks.map((deck, index) => {
                const stats = deckStats[deck.id];
                return (
                  <Card key={deck.id} className="hover:shadow-md transition-shadow group">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${getColorClass(index)} text-primary-foreground font-semibold shrink-0`}>
                          {getInitial(deck.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <Link to={`/flashcards/study/${deck.id}`} className="font-medium text-foreground hover:text-primary truncate">
                              {deck.name}
                            </Link>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.preventDefault();
                                  openEditDeck(deck);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleDeleteDeck(deck.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          
                          {stats && (
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{stats.totalCards} cards</span>
                                <span className={`font-medium ${getMasteryColor(stats.masteryPercentage)}`}>
                                  {stats.masteryPercentage}% mastered
                                </span>
                              </div>
                              <Progress value={stats.masteryPercentage} className="h-1.5" />
                              <div className="flex gap-3 text-xs">
                                <span className="flex items-center gap-1 text-[hsl(var(--badge-success))]">
                                  <Trophy className="h-3 w-3" />
                                  {stats.mastered}
                                </span>
                                <span className="flex items-center gap-1 text-primary">
                                  <BookOpen className="h-3 w-3" />
                                  {stats.learning}
                                </span>
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Sparkles className="h-3 w-3" />
                                  {stats.newCards}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <Button
                            variant="link"
                            size="sm"
                            className="px-0 h-6 mt-1"
                            onClick={() => handleViewCards(deck.id)}
                          >
                            View & Edit Cards
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Mastered</TableHead>
                      <TableHead className="text-center">Learning</TableHead>
                      <TableHead className="text-center">New</TableHead>
                      <TableHead className="text-center">Mastery</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDecks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No decks found. Create one to get started!
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDecks.map((deck, index) => {
                        const stats = deckStats[deck.id];
                        return (
                          <TableRow key={deck.id} className="hover:bg-accent/50">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getColorClass(index)} text-primary-foreground text-sm font-semibold`}>
                                  {getInitial(deck.name)}
                                </div>
                                <span className="font-medium text-foreground">{deck.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {stats?.totalCards || 0}
                            </TableCell>
                            <TableCell className="text-center text-[hsl(var(--badge-success))] font-medium">
                              {stats?.mastered || 0}
                            </TableCell>
                            <TableCell className="text-center text-primary font-medium">
                              {stats?.learning || 0}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground font-medium">
                              {stats?.newCards || 0}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-medium ${getMasteryColor(stats?.masteryPercentage || 0)}`}>
                                {stats?.masteryPercentage || 0}%
                              </span>
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
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Deck Dialog */}
      <Dialog open={editDeckOpen} onOpenChange={setEditDeckOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Deck</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editDeckName">Deck Name</Label>
              <Input
                id="editDeckName"
                value={editDeckName}
                onChange={(e) => setEditDeckName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDeckDesc">Description (optional)</Label>
              <Textarea
                id="editDeckDesc"
                value={editDeckDescription}
                onChange={(e) => setEditDeckDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleEditDeck}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Card Dialog */}
      <Dialog open={editCardOpen} onOpenChange={setEditCardOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Flashcard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editCardFront">Front (Question)</Label>
              <Textarea
                id="editCardFront"
                value={editCardFront}
                onChange={(e) => setEditCardFront(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCardBack">Back (Answer)</Label>
              <Textarea
                id="editCardBack"
                value={editCardBack}
                onChange={(e) => setEditCardBack(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleEditCard}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Cards Dialog */}
      <Dialog open={viewCardsOpen} onOpenChange={setViewCardsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Flashcards in Deck</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {deckCards.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No cards in this deck yet</p>
            ) : (
              deckCards.map((card) => (
                <Card key={card.id} className="group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Front:</p>
                          <p className="text-sm text-foreground">{card.front_content}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Back:</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{card.back_content}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditCard(card)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteCard(card.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Flashcards;