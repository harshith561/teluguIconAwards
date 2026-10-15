import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import HomePage from './pages/HomePage';
import AwardsPage from './pages/AwardsPage';
import NominatePage from './pages/NominatePage';
import VotePage from './pages/VotePage';
import NomineesPage from './pages/NomineesPage';
import NomineeProfile from './pages/NomineeProfile';
import SponsorsPage from './pages/SponsorsPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import TicketsPage from './pages/TicketsPage';
import PastEventsPage from './pages/PastEventsPage';
import PastEventDetail from './pages/PastEventDetail';
import AwardeesPage from './pages/AwardeesPage';
import GalleryPage from './pages/GalleryPage';
import VideoHubPage from './pages/VideoHubPage';
import MediaPage from './pages/MediaPage';
import FAQPage from './pages/FAQPage';
import CategoryDetail from './pages/CategoryDetail';
import LegalPages from './pages/LegalPages';
import NomineeKit from './pages/NomineeKit';
import NomineeStatus from './pages/NomineeStatus';

// Admin
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-ink-900 text-white overflow-x-hidden">
      <Routes>
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route
          path="*"
          element={
            <>
              <Navbar />
              <main className="min-h-screen">
                <AnimatePresence mode="wait">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/awards" element={<AwardsPage />} />
                    <Route path="/categories/:slug" element={<CategoryDetail />} />
                    <Route path="/category/:slug" element={<CategoryDetail />} />
                    <Route path="/nominate" element={<NominatePage />} />
                    <Route path="/vote" element={<VotePage />} />
                    <Route path="/nominees" element={<NomineesPage />} />
                    <Route path="/nominee/:id" element={<NomineeProfile />} />
                    <Route path="/vote/:slug" element={<VoteRedirect />} />
                    <Route path="/nominee-kit" element={<NomineeKit />} />
                    <Route path="/nominee-status" element={<NomineeStatus />} />
                    <Route path="/tickets" element={<TicketsPage />} />
                    <Route path="/past-events" element={<PastEventsPage />} />
                    <Route path="/past-events/:slug" element={<PastEventDetail />} />
                    <Route path="/awardees" element={<AwardeesPage />} />
                    <Route path="/gallery" element={<GalleryPage />} />
                    <Route path="/videos" element={<VideoHubPage />} />
                    <Route path="/media" element={<MediaPage />} />
                    <Route path="/faq" element={<FAQPage />} />
                    <Route path="/sponsors" element={<SponsorsPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />

                    {/* Legal Routes */}
                    <Route path="/legal" element={<Navigate to="/legal/terms" replace />} />
                    <Route path="/legal/:slug" element={<LegalPages />} />
                    <Route path="/terms" element={<Navigate to="/legal/terms" replace />} />
                    <Route path="/privacy" element={<Navigate to="/legal/privacy" replace />} />
                    <Route path="/refund-policy" element={<Navigate to="/legal/refund-policy" replace />} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AnimatePresence>
              </main>
              <Footer />
            </>
          }
        />
      </Routes>
    </div>
  );
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/*" element={<AdminDashboard />} />
    </Routes>
  );
}

// Direct vote URL (add-on req. 10): /vote/ananya-nagalla opens the nominee page
// with the voting form pre-selected, and /vote/<id>/vote is a human-friendly
// alias for the same thing.
function VoteRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/nominee/${slug}?vote=true`} replace />;
}

function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="text-center px-4">
        <h1 className="text-7xl font-bold gold-text mb-4">404</h1>
        <p className="text-white/60 text-xl mb-8">Page not found</p>
        <a href="/" className="btn-gold">Back to Home</a>
      </div>
    </div>
  );
}