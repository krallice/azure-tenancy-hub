import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import TenantsPage from "@/pages/TenantsPage";
import TenantDetailPage from "@/pages/TenantDetailPage";
import ModulesPage from "@/pages/ModulesPage";
import ModuleEditorPage from "@/pages/ModuleEditorPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<TenantsPage />} />
            <Route path="/tenants/:tenantId" element={<TenantDetailPage />} />
            <Route path="/tenants/:tenantId/modules/:modulePath" element={<ModuleEditorPage />} />
            <Route path="/tenants/:tenantId/subscriptions/:subscriptionId/modules/:modulePath" element={<ModuleEditorPage />} />
            <Route path="/modules" element={<ModulesPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
