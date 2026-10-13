import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import LoginPage from './components/auth/LoginPage';
import { AuthProvider, useAuth } from './store/AuthContext';

import { StoreProvider } from './store/StoreContext';
import { ParentAuthProvider, useParentAuth } from './store/ParentAuth';

import TodayPage from './pages/TodayPage';
import TimetablePage from './pages/TimetablePage';
import FamilyCalendarPage from './pages/FamilyCalendarPage';
import PlannerPage from './pages/PlannerPage';
import DayDetailPage from './pages/DayDetailPage';
import SubjectsPage from './pages/SubjectsPage';
import PointsPage from './pages/PointsPage';
import ParentPage from './pages/ParentPage';

import { useEffect } from 'react';

function EntryRoleRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const entryRole = sessionStorage.getItem('study-notebook:entry-role');
    if (!entryRole) return;
    sessionStorage.removeItem('study-notebook:entry-role');

    if (entryRole === 'parent') {
      navigate('/parent', { replace: true });
    } else if (entryRole === 'student') {
      if (location.pathname.startsWith('/parent')) {
        navigate('/', { replace: true });
      }
    }
  }, [navigate, location]);

  return null;
}

import MemberSelectModal from './components/auth/MemberSelectModal';
import { useStore } from './store/StoreContext';
import type { FamilyMember } from './types';

function MainApp() {
  const { data, selectedChildId, selectChild } = useStore();
  const { activeMember, setActiveMember, unlock } = useParentAuth();

  const handleSelectMember = (member: FamilyMember) => {
    setActiveMember(member);
    if (member.role === 'parent') {
      unlock(member);
      // 부모인 경우: 이전에 보던 아이가 없으면 첫 번째 아이로 설정
      const children = (data.familyMembers ?? []).filter((m) => m.role === 'child');
      const targetChildId = selectedChildId || children[0]?.id;
      if (targetChildId) {
        selectChild(targetChildId);
      }
    } else {
      // 아이 본인인 경우: 본인 ID로 타겟 아이 설정 및 본인 데이터 로드
      selectChild(member.id);
    }
  };


  if (!activeMember) {
    return (
      <MemberSelectModal
        members={data.familyMembers ?? []}
        onSelectMember={handleSelectMember}
      />
    );
  }

  return (
    <HashRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <EntryRoleRedirect />
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<TodayPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="family-calendar" element={<FamilyCalendarPage />} />
          <Route path="planner" element={<PlannerPage />} />
          <Route path="planner/:day" element={<DayDetailPage />} />
          <Route path="points" element={<PointsPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="parent" element={<ParentPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

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
    <ParentAuthProvider>
      <StoreProvider>
        <MainApp />
      </StoreProvider>
    </ParentAuthProvider>
  );
}

import ErrorBoundary from './components/ui/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
