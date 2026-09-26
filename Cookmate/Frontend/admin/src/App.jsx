import { BrowserRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth, isAdmin } from './context/auth'
import Layout from './components/Layout'
import { ResourceState } from './components/ui'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Recipes from './pages/Recipes'
import RecipeEditor from './pages/RecipeEditor'
import Records from './pages/Records'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import Submissions from './pages/Submissions'
import './App.css'
function Guard() {
  const { loading, user } = useAuth()
  if (loading) return <ResourceState loading />
  return isAdmin(user) ? <Outlet /> : <Navigate to="/login" replace />
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage key="login" />} />
          <Route path="/register" element={<AuthPage key="register" register />} />
          <Route element={<Guard />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="recipes" element={<Recipes />} />
              <Route path="recipes/new" element={<RecipeEditor key="new" />} />
              <Route path="recipes/:id/edit" element={<RecipeEditor />} />
              <Route path="submissions" element={<Submissions />} />
              {['categories', 'ingredients', 'users', 'roles', 'comments', 'reviews', 'logs'].map(
                (kind) => (
                  <Route key={kind} path={kind} element={<Records key={kind} kind={kind} />} />
                ),
              )}
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
