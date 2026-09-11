import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { DashboardPage } from "./pages/DashboardPage";
import { ObjectiveDetailPage } from "./pages/ObjectiveDetailPage";
import { ObjectivesPage } from "./pages/ObjectivesPage";
import { TaskCreatePage } from "./pages/TaskCreatePage";
import { TaskDetailPage } from "./pages/TaskDetailPage";
import { TasksPage } from "./pages/TasksPage";

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/objectives" element={<ObjectivesPage />} />
          <Route path="/objectives/:id" element={<ObjectiveDetailPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/tasks/new" element={<TaskCreatePage />} />
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
        </Routes>
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;
