import { Navigate, createBrowserRouter, RouterProvider, useParams } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { MyPage } from '@/pages/my/MyPage';
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage';
import { RegistryPage } from '@/pages/registry/RegistryPage';
import { CalculationDetailPage } from '@/pages/registry/CalculationDetailPage';
import { CalculationCreatePage } from '@/pages/registry/CalculationCreatePage';
import { KanbanPage } from '@/pages/kanban/KanbanPage';
import { GanttPage } from '@/pages/gantt/GanttPage';
import { RdDetailPage } from '@/pages/rd/RdDetailPage';
import { DictionariesPage } from '@/pages/dictionaries/DictionariesPage';
import { useUiStore } from './stores/uiStore';

function RoleBasedHome() {
  const role = useUiStore((s) => s.role);
  return <Navigate to={role === 'MANAGER' ? '/analytics' : '/my'} replace />;
}

function CalculationEditRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/registry/new?edit=${id ?? ''}`} replace />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <RoleBasedHome /> },
      { path: 'my', element: <MyPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'registry', element: <RegistryPage /> },
      { path: 'registry/new', element: <CalculationCreatePage /> },
      {
        path: 'registry/:id/edit',
        element: <CalculationEditRedirect />,
      },
      { path: 'registry/:id', element: <CalculationDetailPage /> },
      { path: 'kanban', element: <KanbanPage /> },
      { path: 'gantt', element: <GanttPage /> },
      { path: 'rd', element: <Navigate to="/dictionaries/rd" replace /> },
      { path: 'rd/:id', element: <RdDetailPage /> },
      { path: 'dictionaries', element: <Navigate to="/dictionaries/objects" replace /> },
      { path: 'dictionaries/:tab', element: <DictionariesPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
