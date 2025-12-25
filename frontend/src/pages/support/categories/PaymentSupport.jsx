// PaymentSupport.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supportService } from '../../../services/supportService';
import FAQSection from '../../../components/support/FAQSection';
import ContactForm from '../../../components/support/ContactForm';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorMessage from '../../../components/common/ErrorMessage';

const paymentTopics = [
  { id: 'deposit', name: 'Deposits', icon: 'currency-dollar' },
  { id: 'withdrawal', name: 'Withdrawals', icon: 'credit-card' },
  { id: 'refund', name: 'Refunds', icon: 'arrow-uturn-left' },
  { id: 'transaction', name: 'Transactions', icon: 'document-text' },
  { id: 'fees', name: 'Fees', icon: 'receipt-tax' },
  { id: 'verification', name: 'Verification', icon: 'shield-check' },
  { id: 'methods', name: 'Payment Methods', icon: 'banknotes' },
  { id: 'security', name: 'Security', icon: 'lock-closed' },
];

export default function PaymentSupport({ initialTab = 'deposit' }) {
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
    const fetchPaymentFAQs = async () => {
      try {
        setLoading(true);
        const data = await supportService.getFAQsByCategory('payment', activeTopic);
        setFaqs(data);
      } catch (err) {
        setError(err.message || 'Failed to load payment FAQs');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPaymentFAQs();
  }, [activeTopic]);

  const handleTopicChange = (topicId) => {
    setActiveTopic(topicId);
    setOpenQuestion(null);
    setSearchQuery('');
    navigate(`/support/payment/${topicId}`, { replace: true });
  };

  const handleFormSubmit = async (formData) => {
    const ticketData = {
      ...formData,
      category: 'payment',
      subcategory: activeTopic,
      source: 'payment_support_page'
    };
    return await supportService.submitSupportTicket(ticketData);
  };

  const getTopicIcon = (iconName) => {
    const icons = {
      'currency-dollar': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'credit-card': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      'arrow-uturn-left': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
        </svg>
      ),
      'document-text': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      'receipt-tax': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
      ),
      'shield-check': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      'banknotes': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'lock-closed': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    };
    return icons[iconName] || icons['currency-dollar'];
  };

  const getTopicTitle = () => {
    const topicObj = paymentTopics.find(t => t.id === activeTopic);
    return topicObj ? topicObj.name : 'Payment Support';
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
            Payment Support
          </h1>
          <p className="text-gray-300 text-lg">
            Get help with deposits, withdrawals, transactions, and payment-related issues.
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
                {paymentTopics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTopicChange(t.id)}
                    className={`px-4 py-3 rounded-lg border transition-all duration-200 flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                      activeTopic === t.id
                        ? 'bg-green-500 border-green-500 text-gray-900 dark:text-white'
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
                categories={['payment']}
                activeCategory="payment"
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
              initialCategory="payment"
              showPriority={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
}