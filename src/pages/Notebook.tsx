import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Info, SlidersHorizontal, Plus, ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NoteItem {
  id: string;
  title: string;
  children?: NoteItem[];
  isExpanded?: boolean;
}

interface Note {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  content: string;
}

const notesTree: NoteItem[] = [
  {
    id: "step1",
    title: "STEP1",
    isExpanded: true,
    children: [
      {
        id: "getting-started",
        title: "Getting Started",
        isExpanded: true,
        children: [
          {
            id: "adding-content",
            title: "Adding Content",
            isExpanded: true,
            children: [
              {
                id: "personalizing",
                title: "Personalizing My Notebook",
                children: [
                  { id: "searching", title: "Searching My Notebook" },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

const currentNote: Note = {
  id: "getting-started",
  title: "Getting Started",
  createdAt: "Apr 21, 2022",
  updatedAt: "Apr 21, 2022",
  content: `Welcome to the My Notebook feature of the UWorld QBank. With this tool, you can create a customizable, electronic notebook full of high-yield information to review at any time.

Here are some helpful tips to get started:

**Accessing My Notebook:** The My Notebook feature is available on the main menu bar of the QBank, and within the practice test interface.

**Adding Content to My Notebook:** Copy text and images from practice tests directly into your Notebook in just a few easy clicks.

**Organizing My Notebook:** Click-and-drag the pages within the left navigation panel to adjust the order and easily move pages between sections.

We hope you enjoy using My Notebook as you prepare for your exams. Happy studying!`,
};

const NoteTreeItem = ({
  item,
  level = 0,
  selectedId,
  onSelect,
}: {
  item: NoteItem;
  level?: number;
  selectedId: string;
  onSelect: (id: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(item.isExpanded ?? false);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <button
        className={cn(
          "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent/50 transition-colors text-left",
          selectedId === item.id && "bg-accent text-primary font-medium"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          if (hasChildren) {
            setIsExpanded(!isExpanded);
          }
          onSelect(item.id);
        }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )
        ) : (
          <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">•</span>
        )}
        <span className="truncate">{item.title}</span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {item.children!.map((child) => (
            <NoteTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Notebook = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState("getting-started");

  return (
    <AppLayout title="My Notebook">
      <div className="flex h-[calc(100vh-8rem)] gap-6">
        {/* Sidebar */}
        <Card className="w-80 flex-shrink-0">
          <CardContent className="p-0 h-full flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-16"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Create New Note */}
            <div className="p-4 border-b border-border">
              <Button variant="ghost" className="w-full justify-between text-foreground font-medium">
                Create New Note
                <Plus className="h-4 w-4 text-primary" />
              </Button>
            </div>

            {/* Notes Tree */}
            <ScrollArea className="flex-1 p-2">
              {notesTree.map((item) => (
                <NoteTreeItem
                  key={item.id}
                  item={item}
                  selectedId={selectedNoteId}
                  onSelect={setSelectedNoteId}
                />
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="flex-1">
          <CardContent className="p-6 h-full overflow-auto">
            <div className="max-w-3xl">
              {/* Note Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-semibold text-foreground mb-2">
                    {currentNote.title}
                  </h1>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>Created: {currentNote.createdAt}</span>
                    <span>Last Updated: {currentNote.updatedAt}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>

              {/* Note Content */}
              <div className="prose prose-slate max-w-none">
                {currentNote.content.split("\n\n").map((paragraph, index) => {
                  if (paragraph.startsWith("**") && paragraph.includes(":**")) {
                    const [title, ...rest] = paragraph.split(":**");
                    const cleanTitle = title.replace(/^\*\*/, "");
                    return (
                      <p key={index} className="text-foreground leading-relaxed">
                        <strong className="font-semibold">{cleanTitle}:</strong>
                        {rest.join(":**")}
                      </p>
                    );
                  }
                  return (
                    <p key={index} className="text-foreground leading-relaxed">
                      {paragraph}
                    </p>
                  );
                })}

                <ul className="mt-4 space-y-3 list-disc pl-6">
                  <li className="text-foreground">
                    <strong>Accessing My Notebook:</strong> The My Notebook feature is available on the
                    main menu bar of the QBank, and within the practice test interface.
                  </li>
                  <li className="text-foreground">
                    <strong>Adding Content to My Notebook:</strong> Copy text and images from practice
                    tests directly into your Notebook in just a few easy clicks.
                  </li>
                  <li className="text-foreground">
                    <strong>Organizing My Notebook:</strong> Click-and-drag the pages within the left
                    navigation panel to adjust the order and easily move pages between sections.
                  </li>
                </ul>

                <p className="mt-6 text-foreground">
                  We hope you enjoy using My Notebook as you prepare for your exams. Happy studying!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Notebook;
