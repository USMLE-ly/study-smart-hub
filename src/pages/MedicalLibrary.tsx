import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Bookmark, FileText, FolderOpen, ChevronRight, Pencil, BookOpen } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Article {
  id: string;
  title: string;
  category: string;
  hasBookmark?: boolean;
}

interface Category {
  id: string;
  name: string;
  articles: Article[];
}

const categories: Category[] = [
  {
    id: "allergy",
    name: "Allergy & Immunology",
    articles: [
      { id: "1", title: "Allergic/irritant contact dermatitis", category: "Allergy & Immunology", hasBookmark: true },
      { id: "2", title: "Anaphylaxis", category: "Allergy & Immunology" },
      { id: "3", title: "Angioedema and urticaria", category: "Allergy & Immunology", hasBookmark: true },
      { id: "4", title: "Atopic dermatitis", category: "Allergy & Immunology" },
      { id: "5", title: "Drug hypersensitivity reactions", category: "Allergy & Immunology" },
    ],
  },
  {
    id: "anatomy",
    name: "Anatomy",
    articles: [
      { id: "6", title: "Head and Neck Anatomy", category: "Anatomy" },
      { id: "7", title: "Thoracic Anatomy", category: "Anatomy" },
      { id: "8", title: "Abdominal Anatomy", category: "Anatomy" },
    ],
  },
  {
    id: "biochemistry",
    name: "Biochemistry",
    articles: [
      { id: "9", title: "Amino Acid Metabolism", category: "Biochemistry" },
      { id: "10", title: "Glycolysis and Gluconeogenesis", category: "Biochemistry" },
    ],
  },
];

const MedicalLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(categories[0].articles[0]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["allergy"]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <AppLayout title="Medical Library">
      <div className="flex h-[calc(100vh-8rem)] gap-6">
        {/* Sidebar Navigation */}
        <Card className="w-80 flex-shrink-0">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Medical Library"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="p-2 border-b border-border">
              <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                <Bookmark className="h-4 w-4" />
                Bookmarks
              </Button>
            </div>

            <div className="p-2 border-b border-border">
              <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                Welcome to the Medical Library
              </Button>
            </div>

            <ScrollArea className="h-[calc(100vh-20rem)]">
              <div className="p-2">
                {categories.map((category) => (
                  <div key={category.id} className="mb-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 font-medium"
                      onClick={() => toggleCategory(category.id)}
                    >
                      <FolderOpen className="h-4 w-4 text-primary" />
                      {category.name}
                    </Button>

                    {expandedCategories.includes(category.id) && (
                      <div className="ml-4 border-l border-border pl-2">
                        {category.articles.map((article) => (
                          <Button
                            key={article.id}
                            variant="ghost"
                            className={cn(
                              "w-full justify-start gap-2 text-sm font-normal",
                              selectedArticle?.id === article.id && "bg-accent text-accent-foreground"
                            )}
                            onClick={() => setSelectedArticle(article)}
                          >
                            <FileText className="h-4 w-4" />
                            <span className="truncate">{article.title}</span>
                            {article.hasBookmark && (
                              <Bookmark className="h-3 w-3 ml-auto fill-primary text-primary" />
                            )}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="flex-1">
          <CardContent className="p-6">
            {selectedArticle ? (
              <div className="space-y-6">
                {/* Back Navigation */}
                <Button variant="link" className="text-primary p-0 h-auto">
                  <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
                  Back to Previous Page
                </Button>

                {/* Article Title */}
                <h1 className="text-3xl font-serif font-semibold text-foreground">
                  {selectedArticle.title}
                </h1>

                {/* Article Meta */}
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{selectedArticle.category}</Badge>
                  <Button variant="ghost" size="sm" className="gap-2 text-primary">
                    <Pencil className="h-4 w-4" />
                    Show Highlights
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2 text-primary">
                    <BookOpen className="h-4 w-4" />
                    Mark as Read
                  </Button>
                </div>

                {/* Article Content */}
                <ScrollArea className="h-[calc(100vh-20rem)]">
                  <article className="prose prose-slate max-w-none">
                    <h2 className="text-xl font-semibold text-primary mt-8">INTRODUCTION</h2>
                    <p className="text-foreground leading-relaxed">
                      Contact dermatitis is an inflammatory skin condition caused by exposure to
                      an irritant that disrupts the skin barrier (irritant contact dermatitis [ICD]) or
                      to an allergen that causes a type IV (delayed-type) hypersensitivity reaction
                      (allergic contact dermatitis [ACD]). ICD and ACD have overlapping clinical
                      presentations, virtually indistinguishable histologic features, and similar
                      management strategies.
                    </p>

                    <h2 className="text-xl font-semibold text-primary mt-8">PATHOPHYSIOLOGY</h2>
                    <h3 className="text-lg font-medium text-primary/90 mt-4">
                      Irritant contact dermatitis (ICD)
                    </h3>
                    <p className="text-foreground leading-relaxed">
                      <strong>Chemical</strong> (eg, water, detergents, solvents) or <strong>physical</strong> (eg, metals, wood,
                      fiberglass) irritants can disrupt the epidermal barrier through damage (eg,
                      microtrauma) to keratinocytes, increasing epidermal permeability and water
                      loss. This triggers an inflammatory response involving cytokines, chemokines,
                      and recruitment of immune cells.
                    </p>

                    <h3 className="text-lg font-medium text-primary/90 mt-4">
                      Allergic contact dermatitis (ACD)
                    </h3>
                    <p className="text-foreground leading-relaxed">
                      ACD is a type IV hypersensitivity reaction that occurs in two phases:
                      sensitization and elicitation. During sensitization, the allergen (hapten)
                      penetrates the epidermis and binds to carrier proteins, forming complete
                      antigens. These are processed by Langerhans cells and presented to T cells
                      in regional lymph nodes.
                    </p>

                    <h2 className="text-xl font-semibold text-primary mt-8">RISK FACTORS</h2>
                    <ul className="list-disc pl-6 text-foreground">
                      <li>Occupational exposure (healthcare workers, hairdressers, construction workers)</li>
                      <li>Pre-existing skin conditions (atopic dermatitis)</li>
                      <li>Genetic predisposition</li>
                      <li>Frequent hand washing or wet work</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-primary mt-8">CLINICAL PRESENTATION</h2>
                    <p className="text-foreground leading-relaxed">
                      Both ICD and ACD present with erythema, edema, vesicles, and pruritus at the
                      site of contact. Acute lesions may show oozing and crusting, while chronic
                      exposure leads to lichenification, scaling, and fissuring. The distribution
                      often provides clues to the causative agent.
                    </p>
                  </article>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Select an article to view its content
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default MedicalLibrary;
