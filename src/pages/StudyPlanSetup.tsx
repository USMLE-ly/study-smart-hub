import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Clock, Calendar } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface PlanType {
  id: string;
  name: string;
  hours: string;
  hoursLabel: string;
  description: string;
  includes: { label: string; checked: boolean }[];
}

const planTypes: PlanType[] = [
  {
    id: "select-study",
    name: "Select Study",
    hours: "366 hrs",
    hoursLabel: "Needed to Complete",
    description:
      "Best for those with limited study time, this plan lets you select which curricular components you want, then add custom tasks as needed.",
    includes: [
      { label: "Practice Questions", checked: true },
      { label: "Flashcards", checked: true },
    ],
  },
  {
    id: "max-flex",
    name: "Max Flex",
    hours: "",
    hoursLabel: "",
    description:
      "Best for those who want maximum flexibility, this plan starts with a blank calendar and lets you create customizable tasks to build your own study plan.",
    includes: [],
  },
];

const StudyPlanSetup = () => {
  const [selectedPlan, setSelectedPlan] = useState("select-study");
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/study-planner");
  };

  return (
    <AppLayout title="Study Planner">
      <div className="flex flex-col items-center min-h-[calc(100vh-12rem)]">
        {/* Header */}
        <div className="text-center mb-10 pt-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Choose Your Plan Type
          </h1>
        </div>

        {/* Plan Selection */}
        <RadioGroup
          value={selectedPlan}
          onValueChange={setSelectedPlan}
          className="grid gap-8 md:grid-cols-2 max-w-4xl w-full"
        >
          {planTypes.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            
            return (
              <Card
                key={plan.id}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? "ring-2 ring-primary border-primary shadow-lg"
                    : "hover:border-primary/30 hover:shadow-md"
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <CardContent className="p-8">
                  {/* Header with Radio and Title */}
                  <div className="flex items-start gap-4 mb-4">
                    <RadioGroupItem 
                      value={plan.id} 
                      id={plan.id} 
                      className="mt-1 h-5 w-5"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {plan.id === "select-study" ? (
                            <FileText className="h-5 w-5 text-foreground" />
                          ) : (
                            <Calendar className="h-5 w-5 text-foreground" />
                          )}
                          <Label
                            htmlFor={plan.id}
                            className="text-lg font-semibold text-foreground cursor-pointer"
                          >
                            {plan.name}
                          </Label>
                        </div>
                        
                        {plan.hours && (
                          <div className="text-right shrink-0">
                            <div className="text-lg font-semibold text-foreground">
                              {plan.hours}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {plan.hoursLabel}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-6 ml-9 leading-relaxed">
                    {plan.description}
                  </p>

                  {/* Includes Section */}
                  {plan.includes.length > 0 && (
                    <div className="ml-9 space-y-3">
                      <p className="text-sm font-medium text-foreground">
                        This plan includes
                      </p>
                      <div className="space-y-2.5">
                        {plan.includes.map((item, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <Checkbox 
                              checked={item.checked} 
                              disabled 
                              className="h-4 w-4 border-muted data-[state=checked]:bg-muted data-[state=checked]:text-muted-foreground"
                            />
                            <span className="text-sm text-muted-foreground">
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </RadioGroup>

        {/* Get Started Button */}
        <div className="flex justify-center mt-12">
          <Button
            size="lg"
            className="px-16 h-12 text-base font-medium"
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