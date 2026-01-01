import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, ChevronUp, Plus, X, Calendar as CalendarIcon, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface BlockedDatesManagerProps {
  blockedDates: string[];
  onBlockedDatesChange: (dates: string[]) => void;
}

export function BlockedDatesManager({ blockedDates, onBlockedDatesChange }: BlockedDatesManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleAddDate = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, "yyyy-MM-dd");
    if (!blockedDates.includes(dateStr)) {
      onBlockedDatesChange([...blockedDates, dateStr]);
    }
    setPopoverOpen(false);
  };

  const handleRemoveDate = (dateStr: string) => {
    onBlockedDatesChange(blockedDates.filter(d => d !== dateStr));
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Mark unavailable dates (holidays, exams, etc.)</span>
          </div>
          <div className="flex items-center gap-2">
            {blockedDates.length > 0 && (
              <Badge variant="secondary">{blockedDates.length} blocked</Badge>
            )}
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Select dates when you won't be able to study. Tasks won't be scheduled on these days.
            </p>

            {/* Add Date Button */}
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Blocked Date
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={undefined}
                  onSelect={handleAddDate}
                  disabled={(date) => blockedDates.includes(format(date, "yyyy-MM-dd"))}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Blocked Dates List */}
            {blockedDates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {blockedDates
                  .sort()
                  .map((dateStr) => (
                    <Badge
                      key={dateStr}
                      variant="secondary"
                      className="gap-1 py-1.5 px-3 bg-destructive/10 text-destructive hover:bg-destructive/20"
                    >
                      <CalendarIcon className="h-3 w-3" />
                      {format(parseISO(dateStr), "MMM d, yyyy")}
                      <button
                        onClick={() => handleRemoveDate(dateStr)}
                        className="ml-1 hover:bg-destructive/30 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
              </div>
            )}

            {blockedDates.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No dates blocked yet. Click "Add Blocked Date" to mark days as unavailable.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
