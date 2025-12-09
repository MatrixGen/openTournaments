// BillingSupport.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supportService } from '../../../services/supportService';
import FAQSection from '../../../components/support/FAQSection';
import ContactForm from '../../../components/support/ContactForm';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorMessage from '../../../components/common/ErrorMessage';

const billingTopics = [
  { id: 'invoices', name: 'Invoices & Receipts', icon: 'document-duplicate' },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'calendar-days' },
  { id: 'plans', name: 'Plan & Pricing', icon: 'tag' },
  { id: 'charges', name: 'Unauthorized Charges', icon: 'exclamation-triangle' },
  { id: 'tax', name: 'Tax Information', icon: 'calculator' },
  { id: 'history', name: 'Billing History', icon: 'archive-box' },
  { id: 'corporate', name: 'Corporate Billing', icon: 'building-office' },
  { id: 'credit', name: 'Credits & Refunds', icon: 'currency-dollar' },
];

export default function BillingSupport({ initialTab = 'invoices' }) {
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
    const fetchBillingFAQs = async () => {
      try {
        setLoading(true);
        const data = await supportService.getFAQsByCategory('billing', activeTopic);
        setFaqs(data);
      } catch (err) {
        setError(err.message || 'Failed to load billing FAQs');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBillingFAQs();
  }, [activeTopic]);

  const handleTopicChange = (topicId) => {
    setActiveTopic(topicId);
    setOpenQuestion(null);
    setSearchQuery('');
    navigate(`/support/billing/${topicId}`, { replace: true });
  };

  const handleFormSubmit = async (formData) => {
    const ticketData = {
      ...formData,
      category: 'billing',
      subcategory: activeTopic,
      source: 'billing_support_page'
    };
    return await supportService.submitSupportTicket(ticketData);
  };

  const getTopicIcon = (iconName) => {
    const icons = {
      'document-duplicate': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
      ),
      'calendar-days': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      'tag': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      'exclamation-triangle': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.102 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      'calculator': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      'archive-box': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      'building-office': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M9 17h6m4-13v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2h6.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V7z" />
        </svg>
      ),
      'currency-dollar': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    };
    return icons[iconName] || icons['document-duplicate'];
  };

  const getTopicTitle = () => {
    const topicObj = billingTopics.find(t => t.id === activeTopic);
    return topicObj ? topicObj.name : 'Billing Support';
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
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Billing Support
          </h1>
          <p className="text-gray-300 text-lg">
            Get help with invoices, subscriptions, billing history, and payment-related queries.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-white mb-6">
                {getTopicTitle()}
              </h2>
              
              {/* Topic Tabs */}
              <div className="flex overflow-x-auto pb-4 mb-6 gap-2 -mx-1 px-1">
                {billingTopics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTopicChange(t.id)}
                    className={`px-4 py-3 rounded-lg border transition-all duration-200 flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                      activeTopic === t.id
                        ? 'bg-red-500 border-red-500 text-white'
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
                categories={['billing']}
                activeCategory="billing"
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
              initialCategory="billing"
              showPriority={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
}