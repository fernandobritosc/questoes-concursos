import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Revisao } from './pages/Revisao'
import { Mentor } from './pages/Mentor'
import { Questoes } from './pages/Questoes'
import { EditalVerticalizado } from './pages/EditalVerticalizado'
import { Landing } from './pages/Landing'
import { Simulados } from './pages/Simulados'
import { MapaQuestoes } from './pages/MapaQuestoes'
import { Login } from './pages/Login'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          
          {/* Rotas Autenticadas / App */}
          <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="revisao" element={<Revisao />} />
            <Route path="simulados" element={<Simulados />} />
            <Route path="mentor" element={<Mentor />} />
            <Route path="questoes" element={<Questoes />} />
            <Route path="edital" element={<EditalVerticalizado />} />
            <Route path="mapa" element={<MapaQuestoes />} />
          </Route>

          {/* Fallback temporário caso a pessoa estivesse acostumada com a rota antiga */}
          <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
