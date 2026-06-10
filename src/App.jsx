import { HashRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import LoginScreen from './auth/LoginScreen'
import RequirePerm from './auth/RequirePerm'
import Layout from './components/Layout'
import { Spinner } from './components/ui'
import Dashboard from './modules/dashboard/Dashboard'
import Placeholder from './modules/Placeholder'

export default function App() {
  const { status } = useAuth()

  if (status === 'loading') return <div className="login-page"><Spinner label="Prihlasovanie…" /></div>
  if (status === 'signedOut') return <LoginScreen />

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="zakaznici" element={<RequirePerm perm="perm_customers"><Placeholder title="Zákazníci" /></RequirePerm>} />
          <Route path="projekty" element={<RequirePerm perm="perm_projects_read"><Placeholder title="Projekty" /></RequirePerm>} />
          <Route path="faktury" element={<RequirePerm perm="perm_invoices_full"><Placeholder title="Faktúry" /></RequirePerm>} />
          <Route path="naklady" element={<RequirePerm perm="perm_costs_full"><Placeholder title="Náklady" /></RequirePerm>} />
          <Route path="zamestnanci" element={<RequirePerm perm="perm_employees"><Placeholder title="Zamestnanci" /></RequirePerm>} />
          <Route path="administracia" element={<RequirePerm perm="perm_admin"><Placeholder title="Administrácia" /></RequirePerm>} />
          <Route path="*" element={<div className="page"><h1>Stránka neexistuje</h1></div>} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
