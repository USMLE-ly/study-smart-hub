import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Bug, HelpCircle, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string;
  questionText: string;
}

const feedbackTypes = [
  { value: "error", label: "Content Error", icon: AlertTriangle, description: "Wrong answer, typo, or incorrect explanation" },
  { value: "bug", label: "Technical Issue", icon: Bug, description: "Display problem or functionality bug" },
  { value: "suggestion", label: "Suggestion", icon: MessageSquare, description: "Improvement or enhancement idea" },
  { value: "question", label: "Question", icon: HelpCircle, description: "Need clarification or more info" },
];

export function FeedbackModal({ open, onOpenChange, questionId, questionText }: FeedbackModalProps) {
  const { user } = useAuth();
  const [feedbackType, setFeedbackType] = useState("error");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    setSubmitting(true);
    try {
      // Store feedback in a simple way - using client_error_reports table for now
      // In production, you'd want a dedicated feedback table
      const { error } = await supabase.from("client_error_reports").insert({
        user_id: user?.id || "anonymous",
        message: `[Question Feedback - ${feedbackType}] ${message}`,
        metadata: {
          type: "question_feedback",
          feedback_type: feedbackType,
          question_id: questionId,
          question_preview: questionText.substring(0, 100),
        },
        route: `/qbank/practice`,
      });

      if (error) throw error;

      toast.success("Thank you for your feedback!");
      setMessage("");
      setFeedbackType("error");
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Feedback</DialogTitle>
          <DialogDescription>
            Report an issue or suggest an improvement for this question.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Question Preview */}
          <div className="bg-muted/50 p-3 rounded-md border border-border">
            <p className="text-xs text-muted-foreground mb-1">Question:</p>
            <p className="text-sm text-foreground line-clamp-2">{questionText}</p>
          </div>

          {/* Feedback Type */}
          <div className="space-y-3">
            <Label>Type of Feedback</Label>
            <RadioGroup value={feedbackType} onValueChange={setFeedbackType} className="grid grid-cols-2 gap-2">
              {feedbackTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Label
                    key={type.value}
                    htmlFor={type.value}
                    className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                      feedbackType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value={type.value} id={type.value} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <span className="text-sm font-medium">{type.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="feedback-message">Your Feedback</Label>
            <Textarea
              id="feedback-message"
              placeholder="Describe the issue or your suggestion..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
