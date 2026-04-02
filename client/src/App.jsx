import { useState } from 'react';
import useAuth from './hooks/useAuth';
import Navbar from './components/Navbar';
import FeedbackWidget from './components/FeedbackWidget';
import LoginPage from './pages/LoginPage';
import ContactsPage from './pages/ContactsPage';
import TemplatesPage from './pages/TemplatesPage';
import CampaignPage from './pages/CampaignPage';
import AnalyticsPage from './pages/AnalyticsPage';
import DomainVerificationPage from './pages/DomainVerificationPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState('contacts');
  const { token, user, isAuthenticated, loading, login, logout } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={login} />;
  }

  // Show main app if authenticated
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        user={user}
        onLogout={logout}
      />
      <main className="container mx-auto px-4 py-8">
        {currentPage === 'contacts' && <ContactsPage />}
        {currentPage === 'templates' && <TemplatesPage />}
        {currentPage === 'campaigns' && <CampaignPage />}
        {currentPage === 'analytics' && <AnalyticsPage />}
        {currentPage === 'domains' && <DomainVerificationPage />}
      </main>
      <FeedbackWidget />
    </div>
  );
}
