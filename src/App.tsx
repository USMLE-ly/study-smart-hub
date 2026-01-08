import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PageTransition } from "@/components/ui/PageTransition";
import ErrorBoundary from "@/components/ErrorBoundary";
import { GlobalErrorHandler } from "@/components/GlobalErrorHandler";
import Dashboard from "./pages/Dashboard";
import StudyPlanner from "./pages/StudyPlanner";
import StudyPlanSetup from "./pages/StudyPlanSetup";
import CreateTest from "./pages/CreateTest";
import PreviousTests from "./pages/PreviousTests";
import Performance from "./pages/Performance";
import SearchQuestions from "./pages/SearchQuestions";
import Flashcards from "./pages/Flashcards";
import FlashcardStudy from "./pages/FlashcardStudy";
import Notebook from "./pages/Notebook";
import Help from "./pages/Help";
import PracticeTestWithData from "./pages/PracticeTestWithData";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import QuestionImport from "./pages/QuestionImport";
import PDFImport from "./pages/PDFImport";
import NotFound from "./pages/NotFound";
import Analytics from "./pages/Analytics";
import WeeklyReport from "./pages/WeeklyReport";
import Settings from "./pages/Settings";
import QuestionReview from "./pages/QuestionReview";
import PDFUpload from "./pages/admin/PDFUpload";
import PDFList from "./pages/admin/PDFList";
import PDFProcess from "./pages/admin/PDFProcess";
import QuestionReviewAdmin from "./pages/admin/QuestionReviewAdmin";
import BulkPDFImport from "./pages/admin/BulkPDFImport";
import UWorldImageImport from "./pages/admin/UWorldImageImport";
import AutoProcessGenetics from "./pages/admin/AutoProcessGenetics";
import ProcessGeneticsPDFs from "./pages/admin/ProcessGeneticsPDFs";
import PDFChat from "./pages/PDFChat";
const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsProvider>
          <AuthProvider>
            <GlobalErrorHandler />
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <Dashboard />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/study-planner"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <StudyPlanner />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/study-planner/setup"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <StudyPlanSetup />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qbank/create"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <CreateTest />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qbank/history"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <PreviousTests />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qbank/performance"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <Performance />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qbank/search"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <SearchQuestions />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qbank/notes"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <Notebook />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qbank/practice"
                  element={
                    <ProtectedRoute>
                      <PracticeTestWithData />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qbank/practice/:testId"
                  element={
                    <ProtectedRoute>
                      <PracticeTestWithData />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qbank/import"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <QuestionImport />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pdf-import"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <PDFImport />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/flashcards"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <Flashcards />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/flashcards/study/:deckId"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <FlashcardStudy />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/flashcards/study"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <Flashcards />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/flashcards/decks"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <Flashcards />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notebook"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <Notebook />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/help"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <Help />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <Profile />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <Analytics />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/weekly-report"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <WeeklyReport />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <Settings />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qbank/review"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <QuestionReview />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                {/* Admin PDF Management Routes */}
                <Route
                  path="/admin/pdfs"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <PDFList />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/pdfs/upload"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <PDFUpload />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/pdfs/:pdfId/process"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <PDFProcess />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/pdfs/:pdfId/questions"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                      <QuestionReviewAdmin />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/bulk-import"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <BulkPDFImport />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/uworld-images"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <UWorldImageImport />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/auto-genetics"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <AutoProcessGenetics />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/process-genetics"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <ProcessGeneticsPDFs />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pdf-chat"
                  element={
                    <ProtectedRoute>
                      <PDFChat />
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
