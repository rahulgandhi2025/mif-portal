import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import ConceptDesign from "./pages/ConceptDesign";
import VSM from "./pages/VSM";
import Interfaces from "./pages/Interfaces";
import UseCases from "./pages/UseCases";
import SequenceDiagrams from "./pages/SequenceDiagrams";
import SITTests from "./pages/SITTests";
import Traceability from "./pages/Traceability";
import Reports from "./pages/Reports";
import Hypercare from "./pages/Hypercare";
import ProjectLayout from "./components/ProjectLayout";
import Login from "./pages/Login";
import { useAuthStore } from "./store/useAuthStore";

export default function App() {
  const session = useAuthStore((s) => s.session);
  if (!session) return <Login />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="/projects/:projectId" element={<ProjectLayout />}>
          <Route index element={<Navigate to="concept-design" replace />} />
          <Route path="concept-design" element={<ConceptDesign />} />
          <Route path="vsm" element={<VSM />} />
          <Route path="interfaces" element={<Interfaces />} />
          <Route path="use-cases" element={<UseCases />} />
          <Route path="sequence-diagrams" element={<SequenceDiagrams />} />
          <Route path="sit-tests" element={<SITTests />} />
          <Route path="traceability" element={<Traceability />} />
          <Route path="reports" element={<Reports />} />
          <Route path="issue-log" element={<Hypercare />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
