import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import LoginPage from './components/auth/LoginPage';
import { AuthProvider, useAuth } from './store/AuthContext';
import { StoreProvider } from './store/StoreContext';
import { ParentAuthProvider } from './store/ParentAuth';
import TodayPage from './pages/TodayPage';
import TimetablePage from './pages/TimetablePage';
import PlannerPage from './pages/PlannerPage';
import DayDetailPage from './pages/DayDetailPage';
import SubjectsPage from './pages/SubjectsPage';
import ParentPage from './pages/ParentPage';

function AuthenticatedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center font-hand text-xl text-ink-soft">
        공부 노트를 펼치는 중... 📖
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <StoreProvider>
      <ParentAuthProvider>
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<TodayPage />} />
              <Route path="timetable" element={<TimetablePage />} />
              <Route path="planner" element={<PlannerPage />} />
              <Route path="planner/:day" element={<DayDetailPage />} />
              <Route path="subjects" element={<SubjectsPage />} />
              <Route path="parent" element={<ParentPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </ParentAuthProvider>
    </StoreProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
