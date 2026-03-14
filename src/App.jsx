import Dashboard from './components/Dashboard';
import AdminPage from './components/AdminPage';

function getCurrentView() {
  if (typeof window === 'undefined') {
    return 'main';
  }

  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get('view') === 'admin' ? 'admin' : 'main';
}

function App() {
  return (
    <div className="w-full min-h-screen relative">
      {getCurrentView() === 'admin' ? <AdminPage /> : <Dashboard />}
    </div>
  )
}

export default App
