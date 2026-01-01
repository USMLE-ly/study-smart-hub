import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Play, ListFilter, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface TestRecord {
  id: string;
  score: number;
  name: string;
  date: string;
  mode: string;
  qPool: string;
  subjects: string;
  systems: string;
  questionCount: number;
}

const mockTests: TestRecord[] = [
  {
    id: "1",
    score: 10,
    name: "1",
    date: "Feb 01, 2021",
    mode: "Tutored, Untimed",
    qPool: "Custom",
    subjects: "Multiple",
    systems: "Multiple",
    questionCount: 10,
  },
  {
    id: "2",
    score: 75,
    name: "2",
    date: "Jan 15, 2026",
    mode: "Timed",
    qPool: "Standard",
    subjects: "Anatomy",
    systems: "Cardiovascular",
    questionCount: 40,
  },
  {
    id: "3",
    score: 85,
    name: "3",
    date: "Jan 10, 2026",
    mode: "Tutored, Timed",
    qPool: "Custom",
    subjects: "Pharmacology",
    systems: "Nervous System",
    questionCount: 25,
  },
];

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-[hsl(var(--badge-success))]";
  if (score >= 60) return "text-[hsl(var(--badge-flashcard))]";
  return "text-destructive";
};

const PreviousTests = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("10");

  const filteredTests = mockTests.filter(
    (test) =>
      test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.subjects.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.systems.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout title="Previous Tests">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Show:</span>
                <Select defaultValue="columns">
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Columns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="columns">Columns</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tests Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-20">SCORE</TableHead>
                  <TableHead>NAME</TableHead>
                  <TableHead>DATE</TableHead>
                  <TableHead>MODE</TableHead>
                  <TableHead>Q.POOL</TableHead>
                  <TableHead>SUBJECTS</TableHead>
                  <TableHead>SYSTEMS</TableHead>
                  <TableHead className="text-center"># QS</TableHead>
                  <TableHead className="text-center">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.map((test) => (
                  <TableRow key={test.id} className="hover:bg-accent/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                            test.score >= 80
                              ? "border-[hsl(var(--badge-success))]"
                              : test.score >= 60
                              ? "border-[hsl(var(--badge-flashcard))]"
                              : "border-destructive"
                          }`}
                        >
                          <span className={`text-sm font-semibold ${getScoreColor(test.score)}`}>
                            {test.score}%
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{test.name}</TableCell>
                    <TableCell className="text-muted-foreground">{test.date}</TableCell>
                    <TableCell className="text-muted-foreground">{test.mode}</TableCell>
                    <TableCell className="text-muted-foreground">{test.qPool}</TableCell>
                    <TableCell className="text-muted-foreground">{test.subjects}</TableCell>
                    <TableCell className="text-muted-foreground">{test.systems}</TableCell>
                    <TableCell className="text-center">{test.questionCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <ListFilter className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-end gap-4 border-t border-border p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Items per page:</span>
                <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-muted-foreground">
                1 - {filteredTests.length} of {filteredTests.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PreviousTests;
