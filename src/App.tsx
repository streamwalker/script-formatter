import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Library from "./pages/Library";
import CharacterLibrary from "./pages/CharacterLibrary";
import CharacterBuilder from "./pages/CharacterBuilder";
import AstralonautStudios from "./pages/AstralonautStudios";
import AstralonautBattlefieldAtlantis from "./pages/AstralonautBattlefieldAtlantis";
import AstralonautDarkerAges from "./pages/AstralonautDarkerAges";
import AstralonautEpisode7 from "./pages/AstralonautEpisode7";
import AstralonautChildrenOfAquarius from "./pages/AstralonautChildrenOfAquarius";
import ScriptFormatter from "./pages/ScriptFormatter";
import Shakespeare from "./pages/Shakespeare";
import FilmSchool from "./pages/FilmSchool";
import NarrativeEngine from "./pages/NarrativeEngine";
import NarrativeEngineGuide from "./pages/NarrativeEngineGuide";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import CompliancePage from "./pages/CompliancePage";
import DataProcessingAgreement from "./pages/DataProcessingAgreement";
import AcceptableUsePolicy from "./pages/AcceptableUsePolicy";
import PatentPortfolio from "./pages/PatentPortfolio";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppLayout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/library" element={<Library />} />
          <Route path="/characters" element={<CharacterLibrary />} />
          <Route path="/character-builder" element={<CharacterBuilder />} />
          <Route path="/astralnaut-studios" element={<AstralonautStudios />} />
          <Route path="/astralnaut-studios/battlefield-atlantis" element={<AstralonautBattlefieldAtlantis />} />
          <Route path="/astralnaut-studios/darker-ages" element={<AstralonautDarkerAges />} />
          <Route path="/astralnaut-studios/episode-7" element={<AstralonautEpisode7 />} />
          <Route path="/astralnaut-studios/children-of-aquarius" element={<AstralonautChildrenOfAquarius />} />
          <Route path="/script-formatter" element={<ScriptFormatter />} />
          <Route path="/script-formatter/:draftId" element={<ScriptFormatter />} />
          <Route path="/shakespeare" element={<Shakespeare />} />
          <Route path="/film-school" element={<FilmSchool />} />
          <Route path="/narrative-engine" element={<NarrativeEngine />} />
          <Route path="/narrative-engine/guide" element={<NarrativeEngineGuide />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/dpa" element={<DataProcessingAgreement />} />
          <Route path="/acceptable-use" element={<AcceptableUsePolicy />} />
          <Route path="/patents" element={<PatentPortfolio />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
