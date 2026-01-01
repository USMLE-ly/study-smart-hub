import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PageTransition } from "@/components/ui/PageTransition";
import Dashboard from "./pages/Dashboard";
import StudyPlanner from "./pages/StudyPlanner";
import StudyPlanSetup from "./pages/StudyPlanSetup";
import MedicalLibrary from "./pages/MedicalLibrary";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
              path="/library"
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <MedicalLibrary />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;