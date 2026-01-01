import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, MessageCircle, FileText, Video, Mail, ExternalLink } from "lucide-react";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do I create a new test?",
    answer: "Navigate to QBank > Create Test from the sidebar. Select your desired test mode (Tutor or Timed), choose subjects and systems, set the number of questions, and click Generate Test.",
  },
  {
    question: "What is the difference between Tutor and Timed mode?",
    answer: "In Tutor mode, you receive immediate feedback after each question with detailed explanations. In Timed mode, you complete all questions before seeing results, simulating actual exam conditions.",
  },
  {
    question: "How do I track my progress?",
    answer: "Visit the Performance section under QBank to view your overall statistics, including score percentages, QBank usage, and comparison with other users.",
  },
  {
    question: "Can I create custom flashcard decks?",
    answer: "Yes! Go to Flashcards > Create Deck to create your own flashcard deck. You can also add notes from practice questions directly to your flashcards.",
  },
  {
    question: "How does the Study Planner work?",
    answer: "The Study Planner helps you organize your study schedule with daily tasks. You can view upcoming and overdue tasks, track your progress, and adjust your plan as needed.",
  },
  {
    question: "How do I search for specific questions?",
    answer: "Use the Search feature under QBank to find questions by keyword or question ID. You can search through all questions you've previously attempted.",
  },
];

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout title="Help Center">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Search */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                How can we help you?
              </h2>
              <p className="text-muted-foreground">
                Search our knowledge base or browse frequently asked questions
              </p>
            </div>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Video className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Video Tutorials</h3>
              <p className="text-sm text-muted-foreground">
                Watch step-by-step guides on using MedPrep
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Documentation</h3>
              <p className="text-sm text-muted-foreground">
                Browse detailed guides and documentation
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Contact Support</h3>
              <p className="text-sm text-muted-foreground">
                Get help from our support team
              </p>
            </CardContent>
          </Card>
        </div>

        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {filteredFaqs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No results found for "{searchQuery}"
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  Still need help?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Our support team is here to assist you
                </p>
              </div>
              <Button className="gap-2">
                <Mail className="h-4 w-4" />
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Help;
