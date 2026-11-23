import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { AppNav } from "./components/AppNav";
import { InstallPrompt } from "./components/InstallPrompt";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

// Une page n'est téléchargée qu'à sa première visite : le premier écran charge bien
// moins de JavaScript (Firebase et les pages lourdes comme Repas restent à part).
const BudgetItemCreatePage = lazy(() =>
  import("./pages/BudgetItemCreatePage").then((m) => ({ default: m.BudgetItemCreatePage })),
);
const BudgetItemDetailPage = lazy(() =>
  import("./pages/BudgetItemDetailPage").then((m) => ({ default: m.BudgetItemDetailPage })),
);
const BudgetPage = lazy(() =>
  import("./pages/BudgetPage").then((m) => ({ default: m.BudgetPage })),
);
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const MealsPage = lazy(() =>
  import("./pages/MealsPage").then((m) => ({ default: m.MealsPage })),
);
const ObjectiveDetailPage = lazy(() =>
  import("./pages/ObjectiveDetailPage").then((m) => ({ default: m.ObjectiveDetailPage })),
);
const ObjectivesPage = lazy(() =>
  import("./pages/ObjectivesPage").then((m) => ({ default: m.ObjectivesPage })),
);
const TaskCreatePage = lazy(() =>
  import("./pages/TaskCreatePage").then((m) => ({ default: m.TaskCreatePage })),
);
const TaskDetailPage = lazy(() =>
  import("./pages/TaskDetailPage").then((m) => ({ default: m.TaskDetailPage })),
);
const TasksPage = lazy(() =>
  import("./pages/TasksPage").then((m) => ({ default: m.TasksPage })),
);

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ProtectedRoute>
          <AppNav />
          <InstallPrompt />
          <Suspense
            fallback={<p className="p-6 text-[var(--ht-text-2)]">Chargement...</p>}
          >
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/objectives" element={<ObjectivesPage />} />
            <Route path="/objectives/:id" element={<ObjectiveDetailPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/new" element={<TaskCreatePage />} />
            <Route path="/tasks/:id" element={<TaskDetailPage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/budget/new" element={<BudgetItemCreatePage />} />
            <Route path="/budget/:id" element={<BudgetItemDetailPage />} />
            <Route path="/meals" element={<MealsPage />} />
          </Routes>
          </Suspense>
        </ProtectedRoute>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
