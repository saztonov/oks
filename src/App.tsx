import { AppProviders } from './app/providers/AppProviders';
import { AppRouter } from './app/router';
import { useEffect } from 'react';
import { useUiStore } from './app/stores/uiStore';
import { loadDb } from './services/db/storage';

function Bootstrap() {
  useEffect(() => {
    const state = useUiStore.getState();
    if (!state.currentUserId) {
      const db = loadDb();
      const fallback = db.users.find((u) => u.role === state.role);
      if (fallback) useUiStore.setState({ currentUserId: fallback.id });
    }
  }, []);
  return <AppRouter />;
}

export default function App() {
  return (
    <AppProviders>
      <Bootstrap />
    </AppProviders>
  );
}
