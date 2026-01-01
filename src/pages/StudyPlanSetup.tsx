import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Zap, Clock, Calendar } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface PlanType {
  id: string;
  name: string;
  hours: string;
  description: string;
  includes: string[];
  icon: React.ReactNode;
}

const planTypes: PlanType[] = [
  {
    id: "select-study",
    name: "Select Study",
    hours: "366 hrs",
    description:
      "Best for those with limited study time, this plan lets you select which curricular components you want, then add custom tasks as needed.",
    includes: ["Practice Questions", "Flashcards"],
    icon: <BookOpen className="h-6 w-6" />,
  },
  {
    id: "max-flex",
    name: "Max Flex",
    hours: "",
    description:
      "Best for those who want maximum flexibility, this plan starts with a blank calendar and lets you create customizable tasks to build your own study plan.",
    includes: [],
    icon: <Calendar className="h-6 w-6" />,
  },
];

const StudyPlanSetup = () => {
  const [selectedPlan, setSelectedPlan] = useState("select-study");
  const navigate = useNavigate();

  const handleGetStarted = () => {
    // Navigate to the study planner after setup
    navigate("/study-planner");
  };

  return (
    <AppLayout title="Study Planner">
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Choose Your Plan Type
          </h1>
          <p className="text-muted-foreground">
            Select the study plan that best fits your learning style and schedule
          </p>
        </div>

        <RadioGroup
          value={selectedPlan}
          onValueChange={setSelectedPlan}
          className="grid gap-6 md:grid-cols-2"
        >
          {planTypes.map((plan) => (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-all ${
                selectedPlan === plan.id
                  ? "ring-2 ring-primary border-primary"
                  : "hover:border-primary/50"
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <RadioGroupItem value={plan.id} id={plan.id} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <Label
                        htmlFor={plan.id}
                        className="text-lg font-semibold text-foreground cursor-pointer"
                      >
                        {plan.name}
                      </Label>
                      {plan.hours && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{plan.hours}</span>
                          <span className="text-xs">Needed to Complete</span>
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-4">
                      {plan.description}
                    </p>

                    {plan.includes.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          This plan includes
                        </p>
                        <div className="space-y-2">
                          {plan.includes.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Checkbox checked disabled className="opacity-70" />
                              <span className="text-sm text-muted-foreground">
                                {item}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </RadioGroup>

        <div className="flex justify-center mt-10">
          <Button
            size="lg"
            className="px-12"
            onClick={handleGetStarted}
          >
            Get Started
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudyPlanSetup;
