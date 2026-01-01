import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Calendar, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const StudyPlanSetup = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState("select-study");
  const [includeQuestions, setIncludeQuestions] = useState(true);
  const [includeFlashcards, setIncludeFlashcards] = useState(true);

  const handleGetStarted = () => {
    navigate("/study-planner");
  };

  return (
    <AppLayout title="Study Planner">
      <div className="min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Top Header Bar */}
        <div className="border-b border-border bg-card">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left - Title */}
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">Study Planner</h1>
              </div>
              
              {/* Right - Links */}
              <div className="flex items-center gap-6">
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Calendar className="h-4 w-4" />
                  <span>Test Date</span>
                </button>
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <User className="h-4 w-4" />
                  <span>My Account</span>
                </button>
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        </div>

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
                {/* Radio + Title Row */}
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

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-5 pl-7">
                  Best for those with limited study time, this plan lets you select which curricular 
                  components you want, then add custom tasks as needed.
                </p>

                {/* This plan includes section */}
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
                {/* Radio + Title Row */}
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

                {/* Description */}
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
        <div className="border-t border-border py-4">
          <p className="text-xs text-muted-foreground text-center">
            Copyright © MedPrep. All rights reserved.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudyPlanSetup;
