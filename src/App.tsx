import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import StudyPlanner from "./pages/StudyPlanner";
import StudyPlanSetup from "./pages/StudyPlanSetup";
import MedicalLibrary from "./pages/MedicalLibrary";
import CreateTest from "./pages/CreateTest";
import PreviousTests from "./pages/PreviousTests";
import Performance from "./pages/Performance";
import SearchQuestions from "./pages/SearchQuestions";
import Flashcards from "./pages/Flashcards";
import Notebook from "./pages/Notebook";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/study-planner" element={<StudyPlanner />} />
          <Route path="/study-planner/setup" element={<StudyPlanSetup />} />
          <Route path="/library" element={<MedicalLibrary />} />
          <Route path="/qbank/create" element={<CreateTest />} />
          <Route path="/qbank/history" element={<PreviousTests />} />
          <Route path="/qbank/performance" element={<Performance />} />
          <Route path="/qbank/search" element={<SearchQuestions />} />
          <Route path="/qbank/notes" element={<Notebook />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/flashcards/study" element={<Flashcards />} />
          <Route path="/flashcards/decks" element={<Flashcards />} />
          <Route path="/notebook" element={<Notebook />} />
          <Route path="/help" element={<Help />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
