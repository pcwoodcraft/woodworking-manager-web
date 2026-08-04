import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import LoginScreen from './auth/LoginScreen'
import RequirePerm from './auth/RequirePerm'
import RequireModule from './auth/RequireModule'
import Layout from './components/Layout'
import { Spinner } from './components/ui'
// Jadro (kartotéka zákazníkov, prehľad, administrácia) sa načítava so vstupným balíkom —
// je v každej inštancii, lenivé načítanie by mu len pridalo blikanie.
import Dashboard from './modules/dashboard/Dashboard'
import CustomersLayout from './modules/customers/CustomersLayout'
import CustomersList from './modules/customers/CustomersList'
import CustomerDetail from './modules/customers/CustomerDetail'
import Admin from './modules/admin/Admin'

// Modulové obrazovky sú lenivé: inštancia, ktorá modul nemá kúpený, jeho JavaScript nikdy
// nestiahne. Zoznam a modulové väzby stráži scripts/verify-lazy-chunks.mjs.
const QuickDealForm = lazy(() => import('./modules/customers/QuickDealForm'))
const Pipeline = lazy(() => import('./modules/customers/Pipeline'))
const CrmToday = lazy(() => import('./modules/customers/CrmToday'))
const CrmOverview = lazy(() => import('./modules/customers/CrmOverview'))
const QuotesList = lazy(() => import('./modules/quotes/QuotesList'))
const QuoteForm = lazy(() => import('./modules/quotes/QuoteForm'))
const QuoteDetail = lazy(() => import('./modules/quotes/QuoteDetail'))
const AtelierPage = lazy(() => import('./modules/atelier/AtelierPage'))
const Projects = lazy(() => import('./modules/projects/Projects'))
const ProjectDetail = lazy(() => import('./modules/projects/ProjectDetail'))
const Workshop = lazy(() => import('./modules/workshop/Workshop'))
const Invoices = lazy(() => import('./modules/invoices/Invoices'))
const Costs = lazy(() => import('./modules/costs/Costs'))
const PricingStats = lazy(() => import('./modules/stats/PricingStats'))
const SocialPostsPage = lazy(() => import('./modules/social/SocialPostsPage'))
const SocialPostDetail = lazy(() => import('./modules/social/SocialPostDetail'))
const Employees = lazy(() => import('./modules/employees/Employees'))

// Hranica čakania je pri konkrétnej route, nie okolo celého <Routes> — kým sa ťahá chunk modulu,
// zostáva viditeľné menu aj podmenu Zákazníkov.
function Lazy({ children }) {
  return <Suspense fallback={<div className="page"><Spinner label="Načítavam…" /></div>}>{children}</Suspense>
}

export default function App() {
  const { status } = useAuth()

  if (status === 'loading') return <div className="login-page"><Spinner label="Prihlasovanie…" /></div>
  if (status === 'signedOut') return <LoginScreen />

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          {/* /zakaznici je jadro (kartotéka), ale jeho deti sa delia medzi CRM a Cenové ponuky. */}
          <Route path="zakaznici" element={<RequirePerm perm="perm_customers"><CustomersLayout /></RequirePerm>}>
            <Route index element={<CustomersList />} />
            <Route path="novy-dopyt" element={<RequireModule module="crm"><Lazy><QuickDealForm /></Lazy></RequireModule>} />
            <Route path="pipeline" element={<RequireModule module="crm"><Lazy><Pipeline /></Lazy></RequireModule>} />
            <Route path="dnes" element={<RequireModule module="crm"><Lazy><CrmToday /></Lazy></RequireModule>} />
            <Route path="prehlad" element={<RequireModule module="crm"><Lazy><CrmOverview /></Lazy></RequireModule>} />
            <Route path="ponuky" element={<RequireModule module="quotes"><Lazy><QuotesList /></Lazy></RequireModule>} />
            <Route path="ponuky/nova" element={<RequireModule module="quotes"><Lazy><header className="page-head"><h1>Nová cenová ponuka</h1></header><QuoteForm /></Lazy></RequireModule>} />
            <Route path="ponuky/:id" element={<RequireModule module="quotes"><Lazy><QuoteDetail /></Lazy></RequireModule>} />
            <Route path=":id" element={<CustomerDetail />} />
          </Route>
          <Route path="atelier" element={<RequireModule module="quotes"><RequirePerm perm="perm_customers"><Lazy><AtelierPage /></Lazy></RequirePerm></RequireModule>} />
          <Route path="projekty" element={<RequireModule module="projects"><RequirePerm perm="perm_projects_read"><Lazy><Projects /></Lazy></RequirePerm></RequireModule>} />
          <Route path="projekty/:id" element={<RequireModule module="projects"><RequirePerm perm="perm_projects_read"><Lazy><ProjectDetail /></Lazy></RequirePerm></RequireModule>} />
          <Route path="dielna" element={<RequireModule module="workshop"><RequirePerm perm="perm_projects_read"><Lazy><Workshop /></Lazy></RequirePerm></RequireModule>} />
          <Route path="faktury" element={<RequireModule module="invoicing"><RequirePerm perm="perm_invoices_full"><Lazy><Invoices /></Lazy></RequirePerm></RequireModule>} />
          <Route path="ekonomika" element={<RequireModule module="finance"><RequirePerm perm="perm_costs_full"><Lazy><Costs /></Lazy></RequirePerm></RequireModule>} />
          {/* Presmerovanie ostáva nechránené — cieľ /ekonomika už stráž modulu má. */}
          <Route path="naklady" element={<Navigate to="/ekonomika" replace />} />
          <Route path="statistiky" element={<RequireModule module="stats"><RequirePerm perm="perm_costs_full"><Lazy><PricingStats /></Lazy></RequirePerm></RequireModule>} />
          <Route path="socialne-siete" element={<RequireModule module="marketing"><RequirePerm perm="perm_social"><Lazy><SocialPostsPage /></Lazy></RequirePerm></RequireModule>} />
          <Route path="socialne-siete/:id" element={<RequireModule module="marketing"><RequirePerm perm="perm_social"><Lazy><SocialPostDetail /></Lazy></RequirePerm></RequireModule>} />
          <Route path="zamestnanci" element={<RequireModule module="employees"><RequirePerm perm="perm_employees"><Lazy><Employees /></Lazy></RequirePerm></RequireModule>} />
          <Route path="administracia" element={<RequirePerm perm="perm_admin"><Admin /></RequirePerm>} />
          <Route path="*" element={<div className="page"><h1>Stránka neexistuje</h1></div>} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
