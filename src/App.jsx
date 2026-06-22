import { HashRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import LoginScreen from './auth/LoginScreen'
import RequirePerm from './auth/RequirePerm'
import Layout from './components/Layout'
import { Spinner } from './components/ui'
import Dashboard from './modules/dashboard/Dashboard'
import Projects from './modules/projects/Projects'
import ProjectDetail from './modules/projects/ProjectDetail'
import CustomersLayout from './modules/customers/CustomersLayout'
import CustomersList from './modules/customers/CustomersList'
import CustomerDetail from './modules/customers/CustomerDetail'
import QuickDealForm from './modules/customers/QuickDealForm'
import Pipeline from './modules/customers/Pipeline'
import CrmToday from './modules/customers/CrmToday'
import Invoices from './modules/invoices/Invoices'
import Costs from './modules/costs/Costs'
import Employees from './modules/employees/Employees'
import Admin from './modules/admin/Admin'
import Workshop from './modules/workshop/Workshop'

export default function App() {
  const { status } = useAuth()

  if (status === 'loading') return <div className="login-page"><Spinner label="Prihlasovanie…" /></div>
  if (status === 'signedOut') return <LoginScreen />

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="zakaznici" element={<RequirePerm perm="perm_customers"><CustomersLayout /></RequirePerm>}>
            <Route index element={<CustomersList />} />
            <Route path="novy-dopyt" element={<QuickDealForm />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="dnes" element={<CrmToday />} />
            <Route path=":id" element={<CustomerDetail />} />
          </Route>
          <Route path="projekty" element={<RequirePerm perm="perm_projects_read"><Projects /></RequirePerm>} />
          <Route path="projekty/:id" element={<RequirePerm perm="perm_projects_read"><ProjectDetail /></RequirePerm>} />
          <Route path="dielna" element={<RequirePerm perm="perm_projects_read"><Workshop /></RequirePerm>} />
          <Route path="faktury" element={<RequirePerm perm="perm_invoices_full"><Invoices /></RequirePerm>} />
          <Route path="naklady" element={<RequirePerm perm="perm_costs_full"><Costs /></RequirePerm>} />
          <Route path="zamestnanci" element={<RequirePerm perm="perm_employees"><Employees /></RequirePerm>} />
          <Route path="administracia" element={<RequirePerm perm="perm_admin"><Admin /></RequirePerm>} />
          <Route path="*" element={<div className="page"><h1>Stránka neexistuje</h1></div>} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
