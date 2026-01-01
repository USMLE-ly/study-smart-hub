import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronDown, 
  ChevronUp,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Info,
  Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format, addMonths, startOfMonth } from "date-fns";

interface DaySchedule {
  enabled: boolean;
  hours: number;
}

const StudyPlanSetup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"plan-type" | "getting-started">("plan-type");
  
  // Plan Type State
  const [selectedPlan, setSelectedPlan] = useState("select-study");
  const [includeQuestions, setIncludeQuestions] = useState(true);
  const [includeFlashcards, setIncludeFlashcards] = useState(true);

  // Getting Started State
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Collapsible sections
  const [datesOpen, setDatesOpen] = useState(true);
  const [paceOpen, setPaceOpen] = useState(false);
  const [daysOpen, setDaysOpen] = useState(true);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [catchUpOpen, setCatchUpOpen] = useState(false);

  // Study days schedule
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>({
    Sun: { enabled: false, hours: 0 },
    Mon: { enabled: false, hours: 0 },
    Tue: { enabled: false, hours: 0 },
    Wed: { enabled: false, hours: 0 },
    Thu: { enabled: false, hours: 0 },
    Fri: { enabled: false, hours: 0 },
    Sat: { enabled: false, hours: 0 },
  });

  // Blocked dates
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  
  // Catch-up days (every N weeks)
  const [catchUpFrequency, setCatchUpFrequency] = useState<string | null>(null);

  // Calculate total hours per week
  const totalWeeklyHours = Object.values(schedule).reduce((sum, day) => sum + (day.enabled ? day.hours : 0), 0);
  const neededHours = 366; // Total hours needed
  const progressPercentage = Math.min(100, (totalWeeklyHours * 20) / neededHours * 100); // Rough estimate

  const handleDayToggle = (day: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled }
    }));
  };

  const handleHoursChange = (day: string, hours: number[]) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], hours: hours[0] }
    }));
  };

  const handleGetStarted = () => {
    if (selectedPlan === "max-flex") {
      navigate("/study-planner");
    } else {
      setStep("getting-started");
    }
  };

  const handleCreatePlan = () => {
    // Here you would save the plan settings and generate tasks
    navigate("/study-planner");
  };

  const handleCancel = () => {
    if (step === "getting-started") {
      setStep("plan-type");
    } else {
      navigate("/");
    }
  };

  // Date picker calendar state
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [selectingDate, setSelectingDate] = useState<"start" | "end">("start");

  if (step === "plan-type") {
    return (
      <AppLayout title="Study Planner">
        <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-muted/30">
          {/* Main Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <div className="w-full max-w-4xl">
              {/* Title */}
              <h2 className="text-2xl font-semibold text-foreground text-center mb-10">
                Choose Your Plan Type
              </h2>

              {/* Plan Cards */}
              <RadioGroup
                value={selectedPlan}
                onValueChange={setSelectedPlan}
                className="grid md:grid-cols-2 gap-6 mb-10"
              >
                {/* Select Study Card */}
                <div
                  className={cn(
                    "relative bg-card rounded-lg border-2 p-6 cursor-pointer transition-all",
                    selectedPlan === "select-study"
                      ? "border-primary shadow-md"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                  onClick={() => setSelectedPlan("select-study")}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <RadioGroupItem 
                      value="select-study" 
                      id="select-study" 
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <label 
                          htmlFor="select-study" 
                          className="text-base font-semibold text-foreground cursor-pointer"
                        >
                          Select Study
                        </label>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-foreground">366 hrs</span>
                          <p className="text-xs text-muted-foreground">Needed to Complete</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-5 pl-7">
                    Best for those with limited study time, this plan lets you select which curricular 
                    components you want, then add custom tasks as needed.
                  </p>

                  <div className="pl-7">
                    <p className="text-sm font-medium text-foreground mb-3">This plan includes</p>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <Checkbox 
                          id="practice-questions"
                          checked={includeQuestions}
                          onCheckedChange={(checked) => setIncludeQuestions(checked === true)}
                          className="h-4 w-4"
                        />
                        <label 
                          htmlFor="practice-questions" 
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          Practice Questions
                        </label>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Checkbox 
                          id="flashcards"
                          checked={includeFlashcards}
                          onCheckedChange={(checked) => setIncludeFlashcards(checked === true)}
                          className="h-4 w-4"
                        />
                        <label 
                          htmlFor="flashcards" 
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          Flashcards
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Max Flex Card */}
                <div
                  className={cn(
                    "relative bg-card rounded-lg border-2 p-6 cursor-pointer transition-all",
                    selectedPlan === "max-flex"
                      ? "border-primary shadow-md"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                  onClick={() => setSelectedPlan("max-flex")}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <RadioGroupItem 
                      value="max-flex" 
                      id="max-flex" 
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label 
                        htmlFor="max-flex" 
                        className="text-base font-semibold text-foreground cursor-pointer"
                      >
                        Max Flex
                      </label>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground pl-7">
                    Best for those who want maximum flexibility, this plan starts with a blank 
                    calendar and lets you create customizable tasks to build your own study plan.
                  </p>
                </div>
              </RadioGroup>

              {/* Get Started Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleGetStarted}
                  className="px-12 py-2.5 h-11 text-sm font-medium rounded-md"
                  disabled={selectedPlan === "select-study" && !includeQuestions && !includeFlashcards}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border py-4 bg-background">
            <p className="text-xs text-muted-foreground text-center">
              Copyright © MedPrep. All rights reserved.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Getting Started Step
  return (
    <AppLayout title="Study Planner">
      <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-muted/30">
        {/* Progress Bar Section */}
        <div className="bg-card border-b border-border py-4 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Time Needed to Complete Plan</span>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="relative">
              <Progress 
                value={progressPercentage} 
                className={cn(
                  "h-3",
                  progressPercentage < 50 && "[&>div]:bg-destructive",
                  progressPercentage >= 50 && progressPercentage < 100 && "[&>div]:bg-[hsl(38,92%,50%)]",
                  progressPercentage >= 100 && "[&>div]:bg-[hsl(142,71%,45%)]"
                )}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-6 py-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold text-foreground mb-8">Getting Started</h2>

            {/* Choose Start and End Dates */}
            <Collapsible open={datesOpen} onOpenChange={setDatesOpen} className="mb-4">
              <div className="bg-card rounded-lg border border-border">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-5 text-left">
                  <div>
                    <h3 className="text-base font-medium text-foreground flex items-center gap-2">
                      {datesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      Choose your start and end dates.
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 ml-6">
                      Based on your selections, we'll evenly distribute tasks across your plan.
                    </p>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-5 pb-5">
                  <div className="flex items-center gap-4 mt-2">
                    {/* Start Date */}
                    <Popover open={showDatePicker && selectingDate === "start"} onOpenChange={(open) => {
                      setShowDatePicker(open);
                      if (open) setSelectingDate("start");
                    }}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2 min-w-[160px]">
                          <CalendarIcon className="h-4 w-4" />
                          {startDate ? format(startDate, "MM/dd/yyyy") : "MM/DD/YYYY"}
                          <div className="flex gap-1 ml-auto">
                            <ChevronLeft className="h-3 w-3" />
                            <ChevronRight className="h-3 w-3" />
                          </div>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="flex">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => {
                              setStartDate(date);
                              setShowDatePicker(false);
                            }}
                            month={calendarMonth}
                            onMonthChange={setCalendarMonth}
                            className="pointer-events-auto p-3"
                          />
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => {
                              setStartDate(date);
                              setShowDatePicker(false);
                            }}
                            month={addMonths(calendarMonth, 1)}
                            onMonthChange={(m) => setCalendarMonth(addMonths(m, -1))}
                            className="pointer-events-auto p-3 border-l"
                          />
                        </div>
                        <div className="flex justify-end gap-2 p-3 border-t">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setStartDate(undefined);
                          }}>Reset</Button>
                          <Button size="sm" onClick={() => setShowDatePicker(false)}>Save</Button>
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* End Date */}
                    <Popover open={showDatePicker && selectingDate === "end"} onOpenChange={(open) => {
                      setShowDatePicker(open);
                      if (open) setSelectingDate("end");
                    }}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2 min-w-[160px]">
                          {endDate ? format(endDate, "MM/dd/yyyy") : "MM/DD/YYYY"}
                          <div className="flex gap-1 ml-auto">
                            <ChevronLeft className="h-3 w-3" />
                            <ChevronRight className="h-3 w-3" />
                          </div>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="flex">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => {
                              setEndDate(date);
                              setShowDatePicker(false);
                            }}
                            month={calendarMonth}
                            onMonthChange={setCalendarMonth}
                            className="pointer-events-auto p-3"
                          />
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => {
                              setEndDate(date);
                              setShowDatePicker(false);
                            }}
                            month={addMonths(calendarMonth, 1)}
                            onMonthChange={(m) => setCalendarMonth(addMonths(m, -1))}
                            className="pointer-events-auto p-3 border-l"
                          />
                        </div>
                        <div className="flex justify-end gap-2 p-3 border-t">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEndDate(undefined);
                          }}>Reset</Button>
                          <Button size="sm" onClick={() => setShowDatePicker(false)}>Save</Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Set Your Study Pace */}
            <Collapsible open={paceOpen} onOpenChange={setPaceOpen} className="mb-4">
              <div className="bg-card rounded-lg border border-border">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-5 text-left">
                  <h3 className="text-base font-medium text-foreground flex items-center gap-2">
                    {paceOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Set your study pace
                  </h3>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-5 pb-5">
                  <p className="text-sm text-muted-foreground">
                    Configure your daily study intensity to match your schedule.
                  </p>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Select Your Study Days */}
            <Collapsible open={daysOpen} onOpenChange={setDaysOpen} className="mb-4">
              <div className="bg-card rounded-lg border border-border">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-5 text-left">
                  <h3 className="text-base font-medium text-foreground flex items-center gap-2">
                    {daysOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Select your study days and how many hours to dedicate to your plan.
                  </h3>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-5 pb-5">
                  <div className="space-y-4 mt-4">
                    {Object.entries(schedule).map(([day, config]) => (
                      <div key={day} className="flex items-center gap-4">
                        <div className="flex items-center gap-3 w-20">
                          <Checkbox
                            id={`day-${day}`}
                            checked={config.enabled}
                            onCheckedChange={() => handleDayToggle(day)}
                          />
                          <label 
                            htmlFor={`day-${day}`}
                            className="text-sm text-foreground cursor-pointer"
                          >
                            {day}
                          </label>
                        </div>
                        <div className="flex-1">
                          <Slider
                            value={[config.hours]}
                            onValueChange={(val) => handleHoursChange(day, val)}
                            max={12}
                            step={1}
                            disabled={!config.enabled}
                            className={cn(
                              "flex-1",
                              !config.enabled && "opacity-30"
                            )}
                          />
                        </div>
                        <div className="w-16 text-right">
                          <span className={cn(
                            "text-sm font-medium px-2 py-1 rounded border",
                            config.enabled ? "border-border text-foreground" : "border-transparent text-muted-foreground"
                          )}>
                            {config.hours}
                          </span>
                          <span className="text-sm text-muted-foreground ml-1">hrs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Mark Off Days Not Available */}
            <Collapsible open={blockedOpen} onOpenChange={setBlockedOpen} className="mb-4">
              <div className="bg-card rounded-lg border border-border">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-5 text-left">
                  <h3 className="text-base font-medium text-foreground flex items-center gap-2">
                    {blockedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Mark off days not available to study
                  </h3>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-5 pb-5">
                  <p className="text-sm text-muted-foreground mb-4">
                    Assign days for simulation exams, time off, or other commitments. No tasks will be scheduled for these days.
                  </p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="text-muted-foreground">
                        {blockedDates.length > 0 
                          ? `${blockedDates.length} date(s) selected`
                          : "Select date(s)"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="multiple"
                        selected={blockedDates}
                        onSelect={(dates) => setBlockedDates(dates || [])}
                        className="pointer-events-auto p-3"
                      />
                    </PopoverContent>
                  </Popover>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Add Catch-Up Days */}
            <Collapsible open={catchUpOpen} onOpenChange={setCatchUpOpen} className="mb-8">
              <div className="bg-card rounded-lg border border-border">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-5 text-left">
                  <h3 className="text-base font-medium text-foreground flex items-center gap-2">
                    {catchUpOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Add catch-up days
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </h3>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-5 pb-5">
                  <p className="text-sm text-muted-foreground mb-4">
                    Assign periodic days to catch up on overdue tasks. No tasks will be scheduled for these days.
                  </p>
                  <Button variant="outline" className="text-muted-foreground gap-2">
                    <Plus className="h-4 w-4" />
                    Add Catch-up Day
                  </Button>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleCreatePlan} className="px-8">
                Create Plan
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border py-4 bg-background">
          <p className="text-xs text-muted-foreground text-center">
            Copyright © MedPrep. All rights reserved.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudyPlanSetup;
