// AccountSupport.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supportService } from '../../../services/supportService';
import FAQSection from '../../../components/support/FAQSection';
import ContactForm from '../../../components/support/ContactForm';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorMessage from '../../../components/common/ErrorMessage';

const accountTopics = [
  { id: 'login', name: 'Login Issues', icon: 'key' },
  { id: 'verification', name: 'Account Verification', icon: 'shield-check' },
  { id: 'profile', name: 'Profile Management', icon: 'user-circle' },
  { id: 'security', name: 'Security & 2FA', icon: 'lock-closed' },
  { id: 'privacy', name: 'Privacy Settings', icon: 'eye-slash' },
  { id: 'notifications', name: 'Notifications', icon: 'bell' },
  { id: 'deactivation', name: 'Account Deactivation', icon: 'user-minus' },
  { id: 'data', name: 'Data & Export', icon: 'database' },
];

export default function AccountSupport({ initialTab = 'login' }) {
  const { topic } = useParams();
  const navigate = useNavigate();
  const [activeTopic, setActiveTopic] = useState(topic || initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [openQuestion, setOpenQuestion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (topic && topic !== activeTopic) {
      setActiveTopic(topic);
    }
  }, [topic]);

  useEffect(() => {
    const fetchAccountFAQs = async () => {
      try {
        setLoading(true);
        const data = await supportService.getFAQsByCategory('account', activeTopic);
        setFaqs(data);
      } catch (err) {
        setError(err.message || 'Failed to load account FAQs');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAccountFAQs();
  }, [activeTopic]);

  const handleTopicChange = (topicId) => {
    setActiveTopic(topicId);
    setOpenQuestion(null);
    setSearchQuery('');
    navigate(`/support/account/${topicId}`, { replace: true });
  };

  const handleFormSubmit = async (formData) => {
    const ticketData = {
      ...formData,
      category: 'account',
      subcategory: activeTopic,
      source: 'account_support_page'
    };
    return await supportService.submitSupportTicket(ticketData);
  };

  const getTopicIcon = (iconName) => {
    const icons = {
      'key': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      'shield-check': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      'user-circle': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A7.968 7.968 0 016 15c0-3.868 3.141-7 7-7s7 3.132 7 7c0 .799-.123 1.575-.354 2.307M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'lock-closed': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      'eye-slash': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      ),
      'bell': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      'user-minus': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
        </svg>
      ),
      'database': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
    };
    return icons[iconName] || icons['key'];
  };

  const getTopicTitle = () => {
    const topicObj = accountTopics.find(t => t.id === activeTopic);
    return topicObj ? topicObj.name : 'Account Support';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-800 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-800">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <ErrorMessage 
            message={error}
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-800">
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Account Support
          </h1>
          <p className="text-gray-300 text-lg">
            Get help with account management, login issues, security, and privacy settings.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {getTopicTitle()}
              </h2>
              
              {/* Topic Tabs */}
              <div className="flex overflow-x-auto pb-4 mb-6 gap-2 -mx-1 px-1">
                {accountTopics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTopicChange(t.id)}
                    className={`px-4 py-3 rounded-lg border transition-all duration-200 flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                      activeTopic === t.id
                        ? 'bg-amber-500 border-amber-500 text-gray-900 dark:text-white'
                        : 'bg-neutral-700 border-neutral-600 text-gray-300 hover:bg-neutral-600'
                    }`}
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      {getTopicIcon(t.icon)}
                    </div>
                    <span className="font-medium">{t.name}</span>
                  </button>
                ))}
              </div>
              
              <FAQSection
                categories={['account']}
                activeCategory="account"
                onCategoryChange={() => {}}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                faqs={faqs}
                openQuestion={openQuestion}
                onToggleQuestion={setOpenQuestion}
                isSearching={!!searchQuery}
                showCategorySelector={false}
              />
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <ContactForm 
              onSubmit={handleFormSubmit}
              initialCategory="account"
              showPriority={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
}