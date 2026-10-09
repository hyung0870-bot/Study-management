import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import { StoreProvider } from './store/StoreContext';
import { ParentAuthProvider } from './store/ParentAuth';
import TodayPage from './pages/TodayPage';
import TimetablePage from './pages/TimetablePage';
import PlannerPage from './pages/PlannerPage';
import DayDetailPage from './pages/DayDetailPage';
import SubjectsPage from './pages/SubjectsPage';
import ParentPage from './pages/ParentPage';

export default function App() {
  return (
    <StoreProvider>
      <ParentAuthProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </ParentAuthProvider>
    </StoreProvider>
  );
}
