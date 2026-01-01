import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import StudyPlanner from "./pages/StudyPlanner";
import MedicalLibrary from "./pages/MedicalLibrary";
import CreateTest from "./pages/CreateTest";
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
          <Route path="/library" element={<MedicalLibrary />} />
          <Route path="/qbank/create" element={<CreateTest />} />
          <Route path="/qbank/history" element={<NotFound />} />
          <Route path="/qbank/performance" element={<NotFound />} />
          <Route path="/qbank/search" element={<NotFound />} />
          <Route path="/qbank/notes" element={<NotFound />} />
          <Route path="/flashcards/study" element={<NotFound />} />
          <Route path="/flashcards/decks" element={<NotFound />} />
          <Route path="/notebook" element={<NotFound />} />
          <Route path="/help" element={<NotFound />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
