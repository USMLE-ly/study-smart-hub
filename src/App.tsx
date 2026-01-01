import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
import PracticeTest from "./pages/PracticeTest";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
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
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/study-planner"
              element={
                <ProtectedRoute>
                  <StudyPlanner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/study-planner/setup"
              element={
                <ProtectedRoute>
                  <StudyPlanSetup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/library"
              element={
                <ProtectedRoute>
                  <MedicalLibrary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/qbank/create"
              element={
                <ProtectedRoute>
                  <CreateTest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/qbank/history"
              element={
                <ProtectedRoute>
                  <PreviousTests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/qbank/performance"
              element={
                <ProtectedRoute>
                  <Performance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/qbank/search"
              element={
                <ProtectedRoute>
                  <SearchQuestions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/qbank/notes"
              element={
                <ProtectedRoute>
                  <Notebook />
                </ProtectedRoute>
              }
            />
            <Route
              path="/qbank/practice"
              element={
                <ProtectedRoute>
                  <PracticeTest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/flashcards"
              element={
                <ProtectedRoute>
                  <Flashcards />
                </ProtectedRoute>
              }
            />
            <Route
              path="/flashcards/study/:deckId"
              element={
                <ProtectedRoute>
                  <FlashcardStudy />
                </ProtectedRoute>
              }
            />
            <Route
              path="/flashcards/decks"
              element={
                <ProtectedRoute>
                  <Flashcards />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notebook"
              element={
                <ProtectedRoute>
                  <Notebook />
                </ProtectedRoute>
              }
            />
            <Route
              path="/help"
              element={
                <ProtectedRoute>
                  <Help />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
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