import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ProtectedRoute } from './components/ProtectedRoute'

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Revisao = lazy(() => import('./pages/Revisao').then(m => ({ default: m.Revisao })))
const Mentor = lazy(() => import('./pages/Mentor').then(m => ({ default: m.Mentor })))
const Questoes = lazy(() => import('./pages/Questoes').then(m => ({ default: m.Questoes })))
const EditalVerticalizado = lazy(() => import('./pages/EditalVerticalizado').then(m => ({ default: m.EditalVerticalizado })))
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })))
const Simulados = lazy(() => import('./pages/Simulados').then(m => ({ default: m.Simulados })))
const MapaQuestoes = lazy(() => import('./pages/MapaQuestoes').then(m => ({ default: m.MapaQuestoes })))
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })))

function SuspenseRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SuspenseRoute><Landing /></SuspenseRoute>} />
          <Route path="/login" element={<SuspenseRoute><Login /></SuspenseRoute>} />
          
          {/* Rotas Autenticadas / App */}
          <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<SuspenseRoute><Dashboard /></SuspenseRoute>} />
            <Route path="revisao" element={<SuspenseRoute><Revisao /></SuspenseRoute>} />
            <Route path="simulados" element={<SuspenseRoute><Simulados /></SuspenseRoute>} />
            <Route path="mentor" element={<SuspenseRoute><Mentor /></SuspenseRoute>} />
            <Route path="questoes" element={<SuspenseRoute><Questoes /></SuspenseRoute>} />
            <Route path="edital" element={<SuspenseRoute><EditalVerticalizado /></SuspenseRoute>} />
            <Route path="mapa" element={<SuspenseRoute><MapaQuestoes /></SuspenseRoute>} />
          </Route>

          {/* Fallback temporário caso a pessoa estivesse acostumada com a rota antiga */}
          <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
