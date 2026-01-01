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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FolderPlus, Plus, FileText, SlidersHorizontal, BarChart3, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

interface FlashcardDeck {
  id: string;
  name: string;
  initial: string;
  color: string;
  newCards: number;
  learning: number;
  toReview: number;
  lastUsed: string | null;
}

interface FlashcardPreview {
  id: string;
  content: string;
  hasImage?: boolean;
  imageUrl?: string;
}

const mockDecks: FlashcardDeck[] = [
  {
    id: "1",
    name: "Notes",
    initial: "N",
    color: "bg-[hsl(var(--badge-flashcard))]",
    newCards: 3,
    learning: 0,
    toReview: 0,
    lastUsed: null,
  },
  {
    id: "2",
    name: "Renal, urinary systems, & electrolytes",
    initial: "R",
    color: "bg-[hsl(var(--badge-success))]",
    newCards: 151,
    learning: 0,
    toReview: 0,
    lastUsed: "Apr 24, 2025",
  },
  {
    id: "3",
    name: "Electrocardiogram (ECG) images",
    initial: "E",
    color: "bg-primary",
    newCards: 21,
    learning: 0,
    toReview: 0,
    lastUsed: null,
  },
  {
    id: "4",
    name: "Biochemistry",
    initial: "B",
    color: "bg-[hsl(var(--badge-practice))]",
    newCards: 135,
    learning: 0,
    toReview: 0,
    lastUsed: null,
  },
  {
    id: "5",
    name: "Genetics",
    initial: "G",
    color: "bg-secondary",
    newCards: 69,
    learning: 0,
    toReview: 0,
    lastUsed: null,
  },
];

const mockPreviews: FlashcardPreview[] = [
  {
    id: "1",
    content: "A previously healthy 15-year-old girl is brought to the emergency department due to respiratory...",
  },
  {
    id: "2",
    content: "Poststreptococcal glomerulonephritis is a type _____ hypersensitivity reaction caused...",
  },
  {
    id: "3",
    content: "Poststreptococcal glomerulonephritis shows a (linear/granular) pattern of immunofluorescence...",
  },
  {
    id: "4",
    content: "In rapidly progressive glomerulonephritis, renal biopsy shows _____ composed of leukocytes,",
  },
];

const Flashcards = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQBank, setSelectedQBank] = useState("step1");

  return (
    <AppLayout title="Flashcards">
      <div className="space-y-6">
        <Tabs defaultValue="browse" className="w-full">
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
                      className="pr-16"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" className="text-primary gap-2">
                      <FolderPlus className="h-4 w-4" />
                      Create Deck
                    </Button>
                    <Button variant="ghost" className="text-primary gap-2">
                      <Plus className="h-4 w-4" />
                      New Card
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QBank Selection */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">STEP1 QBank</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Deck Preview Cards */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${mockDecks[0].color} text-primary-foreground text-sm font-semibold`}>
                    {mockDecks[0].initial}
                  </div>
                  <span className="font-medium text-foreground">{mockDecks[0].name}</span>
                </div>
                <Button variant="link" className="text-primary">See All</Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {mockPreviews.map((preview) => (
                  <Card key={preview.id} className="cursor-pointer hover:shadow-md transition-shadow border-t-4 border-t-[hsl(var(--badge-practice))]">
                    <CardContent className="p-4">
                      <p className="text-sm text-foreground line-clamp-5">
                        {preview.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="study" className="space-y-6">
            {/* Search */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Input
                      placeholder="Search deck names"
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
                      <TableHead className="text-center">New Cards</TableHead>
                      <TableHead className="text-center">Learning</TableHead>
                      <TableHead className="text-center">To Review</TableHead>
                      <TableHead className="text-center">Last Used</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={6} className="py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">STEP1 QBank</span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                    </TableRow>
                    {mockDecks.map((deck) => (
                      <TableRow key={deck.id} className="hover:bg-accent/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${deck.color} text-primary-foreground text-sm font-semibold`}>
                              {deck.initial}
                            </div>
                            <span className="font-medium text-foreground">{deck.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-primary font-medium">
                          {deck.newCards}
                        </TableCell>
                        <TableCell className="text-center text-destructive">
                          {deck.learning}
                        </TableCell>
                        <TableCell className="text-center text-[hsl(var(--badge-success))]">
                          {deck.toReview}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {deck.lastUsed || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="default">
                            Study
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
