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
import { Search, MessageCircle, FileText, Video, Mail } from "lucide-react";
import { useState } from "react";

interface FAQSection {
  title: string;
  items: {
    question: string;
    answer: string;
  }[];
}

const howToUseSections: FAQSection = {
  title: "How to Use",
  items: [
    {
      question: "How do I begin using my subscription?",
      answer: `Once you have purchased a subscription from MedPrep, it will be available for activation from your **My Account** page on our website. You will need to sign in to your account every time you wish to access your subscription.

To get started using the subscription, first click on **Activate** and acknowledge the displayed Terms of Use. You will then see the option to **Launch** your subscription (*you may need to refresh the page if you do not immediately see the Launch option*). When you click on Launch, you will be taken to the installation instructions for that subscription.

When you open a new Qbank subscription, you will be presented with several different options for test creation. Each question mode and test mode will provide a slightly different testing experience. For new users, we recommend that you first generate tests in **Unused Question Mode**. This will ensure that you see every question in the Qbank at least once.`,
    },
    {
      question: "How can I create a test?",
      answer: `Qbank subscriptions offer several different test creation options for maximum flexibility in your studies. You can choose any test mode and question mode available. You can generate as many tests as you like during your subscription's active duration. Subscribers have the option to select all available Subjects and Systems for test creation, or if you prefer, specific Subjects and Systems can be selected individually to focus on key areas.

**Test Modes:**
• **Timed:** This option will impose a time limit for your test. The time limit will vary depending on the subscription you have purchased. If the time elapses before the test is completed, the test will automatically end.
• **Untimed:** This option allows you to take the test at your own pace. In this mode, the software displays the time elapsed, but does not impose any time limit during the test.
• **Tutor:** This option displays the correct answer and explanation after you have answered the test question. Once an item is answered, its explanation is retained for the duration of the test.
• **Timed Tutor:** This option is similar to Tutor mode (explanation will be displayed as soon as you answer the question) except that a time limit is imposed similar to Timed test mode.

**Question Modes:**
• **Unused:** This option will create a test containing questions that have not been used in any previous tests. We recommend that new users begin with Unused question mode to guarantee that they see every question in the Qbank at least once.
• **Incorrect:** This option will create a test containing only questions that were answered incorrectly from previous tests.
• **Marked:** This option will create a test containing only the marked questions from previous tests. To mark a question, click the checkbox beside the red flag icon during either testing or review.
• **All:** This option will create a test that may contain all types of questions (*unused, marked and incorrect*).
• **Custom:** This option is intended for use by study groups who intend to all create the same test or work on the same questions together.

**To generate a test:**
• Select a **Test Mode** [Timed, Untimed, Tutor, Timed Tutor]
• Select a **Question Mode** [All, Unused, Incorrect, Marked, Custom]
• Select your preferred **Subject(s)** followed by the **System(s)**
• Type in your preferred number of questions
• Click **Generate**`,
    },
    {
      question: "What features are available while taking the test?",
      answer: `During the test, a clock will display either the time remaining (for timed mode) or time elapsed (for untimed and tutor modes). Navigation toolbars will be displayed on the top and bottom portion of the window. These toolbars contain the Next, Previous, Normal Labs, Notes, Feedback, Suspend, and End buttons. A box for marking or unmarking the test question is also located in one of the navigation toolbars.

• To view the next question, click on the **Next** button.
• To view the previous question, click on the **Previous** button.
• To view the normal laboratory values, click on the **Normal Labs** button.
• To type in notes during the test, clicking on the **Notes** button. These notes can later be compiled and printed for convenient study.
• To provide feedback for a particular question, click on the **Feedback** button while viewing the question for which you need to provide feedback.
• To mark/unmark a question, click on the checkbox next to the **red flag icon**.
• To pause the test at any time, click on the **Suspend** button. Your answers will be saved and stored. You may resume taking the test at a later date and time.
• To end the test at any time, clicking on the **End** button. The exam will be scored as soon as it is ended.

A summary of your test results will be displayed once the test has been ended.
• A green check mark indicates that the question is Correct
• A red X indicates that the question is Incorrect
• A blue exclamation point (!) indicates that the question was Omitted (skipped without answering)`,
    },
    {
      question: "How can I view test results?",
      answer: `Once you complete a test, a summary of the completed test will automatically display when the test block is ended. This summary will show which questions were answered correctly, incorrectly or omitted. It will also display the **Avg. Score**, which is calculated by averaging together the % of correct response for each question contained in the test block, and **Your Score**, which is the percentage of questions you answered correctly. If you wish to review individual test questions, click on **Explanation** beside the question you wish to review.

If you would like to go back and review an older test, go to the **Previous Test** section and select **Review** beside the test you wish to look at. You can also select **Resume** on any test you may have ended accidentally to correct your answers.

For a detailed view of your performance, click on **Analysis**. The correct, incorrect, and omitted questions will be presented graphically. If the test contained questions from all disciplines, then your performance for each discipline will be displayed.`,
    },
    {
      question: "How do I interpret my scores/performance?",
      answer: `The **Performance** section of the Qbank displays your aggregate performance over the entire term of your subscription. It is separated into two sections, **Reports** and **Graphs**.

**Reports** displays your Qbank scoring in several different ways:
• **Overall Performance:** The pie graph at the top of this section displays the total number of questions you have answered correctly, incorrectly, or omitted (skipped without answering) during the term of your subscription.
• **Percentile Rank:** The bell curve in this section compares your performance in the Qbank to the performance of other active users. The **Median Score** is depicted by the red line, and **Your Score** is depicted by the green line.
• **Subjects & Systems:** The bar charts in this section further break down your score by subject. Each bar visually represents the percentage of correct answers (green), incorrect answers (red), and omitted questions (blue).

**Graphs** displays a graphical representation of your aggregate performance:
• **Performance by Test:** This line graph displays Your Score (green), the Average Score (grey) and your overall Cumulative Performance (orange) from the first test you created to the most recent test.
• **Performance by Date:** This line graph displays the same information depicted in the Performance by Test section, ordered by the date each test was accessed.

Both sub-sections of the Performance section may be printed by clicking the **Printer icon** in the top right corner of the page.`,
    },
    {
      question: "How do I study with my Flashcards?",
      answer: `Customize your study sessions with our Flashcards feature, including a "Browse" section that allows you to create and organize your flashcards, and a "Study" section that lets you review your flashcards with spaced repetition.

**Features Include:**
• **Quick Content Transfer:** A Flashcards pop-up within the test interface lets you add any MedPrep content to a new or existing flashcard in mere seconds, and the cards you create will automatically be made available in your future study sessions.
• **Filtering:** When searching for a particular flashcard or organizing your decks, expanded filters (eg, Subject, System) help you quickly identify the material you wish to review.
• **Integrated Spaced Repetition:** Customizable study sessions with spaced repetition are integrated within the Study section of the QBank. This feature allows you to use this proven study method with flashcards containing MedPrep content.`,
    },
  ],
};

const faqSections: FAQSection = {
  title: "FAQs",
  items: [
    {
      question: "I want to reset/delete my qbank test history (or) start all over again. Is this possible?",
      answer: `**All Qbanks:** We offer a one-time reset option with subscriptions that have been active continuously for 180 days or more. Once a reset has been used, a subscription *cannot* be reset again, regardless of the duration remaining on the subscription or purchase of additional renewals.

To request a reset, please contact our support team with your account information.`,
    },
    {
      question: "Can I access my subscriptions on a mobile device?",
      answer: `Access to Qbank subscriptions is offered through our companion application for Android and iOS devices. You can download the app from the Google Play Store or Apple App Store.

**Other mobile device(s):** Our developers are aware of request for mobile access on other devices/platforms and are reviewing potential options and implementation scenarios. However, an exact time frame (or if/when a solution will be available) is unknown. Once an app is ready, it will be announced directly on our website.`,
    },
    {
      question: "How do I reuse questions with no reset option available (to avoid repetition)?",
      answer: `If you want to redo certain questions and ensure that you do not have duplicate questions in subsequently generated test blocks, we recommend that you use the 'Marked' question mode.

Once a test is generated via the 'Marked' question mode, all questions within that test are no longer marked. Therefore, you could work through the Qbank or select individual subjects a second time according to your preference.

To mark a question, click the checkbox beside the red flag icon during testing or review (*on mobile devices, tap the red flag icon to mark the question*). Once you have your questions marked, you can then generate new tests using the 'Marked' question mode.`,
    },
    {
      question: "Why are images/media in questions not loading?",
      answer: `This problem might arise if you lose your internet connection while course content is being downloaded onto your computer. The test is downloaded on your machine while the images and media are stored on the server. Therefore, you may be able to move from one question to the next in absence of internet connection, but the images and media will not load.

Our qbank requires reliable and stable connection in order to download images and save tests while communicating with our servers. Wireless connections are great in terms of offering flexibility with connection but are quite unreliable when providing sustained and reliable internet connectivity.

If you rely on wireless access, we recommend trying to access the course from a high-speed internet access point if possible.`,
    },
    {
      question: "How can I delete a test block?",
      answer: `Tests cannot be deleted once they have been generated. If you have accidentally ended a test block and caused questions to be marked as omitted, you can continue the test by going to the **Previous Tests** section and clicking **Resume** adjacent to the test in question.

If you have made a mistake when selecting the Test Mode, Question Mode, or number of questions, this cannot be changed. If you would like to recreate the test in your desired mode to retake the questions, we recommend that you **mark** all questions in the test and then generate a new test using the **Marked** question mode.`,
    },
    {
      question: "How do I contact support?",
      answer: `You can reach our support team through multiple channels:

• **Email:** support@medprep.com
• **Live Chat:** Available Monday-Friday, 9 AM - 6 PM EST
• **Phone:** 1-800-MEDPREP (Available during business hours)

When contacting support, please include:
• Your account email address
• Description of the issue
• Screenshots if applicable
• Device and browser information`,
    },
  ],
};

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filterItems = (items: { question: string; answer: string }[]) => {
    if (!searchQuery.trim()) return items;
    return items.filter(
      (item) =>
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredHowToUse = filterItems(howToUseSections.items);
  const filteredFaqs = filterItems(faqSections.items);
  const hasResults = filteredHowToUse.length > 0 || filteredFaqs.length > 0;

  return (
    <AppLayout title="Help">
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

        {/* How to Use Section */}
        {filteredHowToUse.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>How to Use</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {filteredHowToUse.map((item, index) => (
                  <AccordionItem key={index} value={`howto-${index}`}>
                    <AccordionTrigger className="text-left text-primary hover:text-primary/80">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-foreground leading-relaxed whitespace-pre-line">
                      {item.answer.split("**").map((part, i) =>
                        i % 2 === 1 ? (
                          <strong key={i} className="font-semibold">
                            {part}
                          </strong>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* FAQs Section */}
        {filteredFaqs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>FAQs</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.map((item, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left text-primary hover:text-primary/80">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-foreground leading-relaxed whitespace-pre-line">
                      {item.answer.split("**").map((part, i) =>
                        i % 2 === 1 ? (
                          <strong key={i} className="font-semibold">
                            {part}
                          </strong>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* No Results */}
        {!hasResults && searchQuery && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No results found for "{searchQuery}"
              </p>
            </CardContent>
          </Card>
        )}

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
