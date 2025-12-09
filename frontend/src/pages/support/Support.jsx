// Support.js - Updated for main support page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportService } from '../../services/supportService';
import SupportHero from '../../components/support/SupportHero';
import SupportChannels from '../../components/support/SupportChannels';
import FAQSection from '../../components/support/FAQSection';
import ContactForm from '../../components/support/ContactForm';
import ResourcesSection from '../../components/support/ResourcesSection';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

export default function Support() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [supportData, setSupportData] = useState({
    faqCategories: {},
    supportChannels: [],
    resourceLinks: []
  });
  
  const [activeCategory, setActiveCategory] = useState('general');
  const [openQuestion, setOpenQuestion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFAQs, setFilteredFAQs] = useState([]);

  // Fetch support data
  useEffect(() => {
    const fetchSupportData = async () => {
      try {
        setLoading(true);
        const data = await supportService.getSupportData();
        setSupportData(data);
        
        // Set initial FAQs
        if (data.faqCategories[activeCategory]) {
          setFilteredFAQs(data.faqCategories[activeCategory]);
        }
      } catch (err) {
        setError(err.message || 'Failed to load support data');
        console.error('Error fetching support data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSupportData();
  }, []);

  // Filter FAQs based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFAQs(supportData.faqCategories[activeCategory] || []);
      return;
    }

    const query = searchQuery.toLowerCase();
    const allFAQs = Object.values(supportData.faqCategories).flat();
    const filtered = allFAQs.filter(faq => 
      faq.question.toLowerCase().includes(query) || 
      faq.answer.toLowerCase().includes(query)
    );
    setFilteredFAQs(filtered);
  }, [searchQuery, activeCategory, supportData.faqCategories]);

  const toggleQuestion = (index) => {
    setOpenQuestion(openQuestion === index ? null : index);
  };

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setSearchQuery('');
    setOpenQuestion(null);
    
    // Update URL for bookmarking
    navigate(`/support/${category}`, { replace: true });
  };

  const handleFormSubmit = async (formData) => { 
    
      const result = await supportService.submitSupportTicket({
        ...formData,
        source: 'support_main_page'
      });
      return result;
   
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'tournament':
        navigate('/support/tournament');
        break;
      case 'payment-deposit':
        navigate('/support/payment/deposit');
        break;
      case 'payment-withdrawal':
        navigate('/support/payment/withdrawal');
        break;
      case 'live-chat':
        // Open chat widget
        if (window.openChatWidget) {
          window.openChatWidget();
        }
        break;
      case 'knowledge-base':
        navigate('/support/resources');
        break;
      default:
        // Handle category navigation
        if (supportData.faqCategories[action]) {
          handleCategoryChange(action);
        }
    }
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

  const categories = Object.keys(supportData.faqCategories);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-800">
      <main className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-4 lg:px-8 pb-16 sm:pb-20">
        {/* Hero Section */}
        <SupportHero onQuickAction={handleQuickAction} />

        {/* Quick Action Buttons - Mobile Only */}
        <div className="md:hidden mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickAction('tournament')}
              className="flex-1 min-w-[120px] px-3 py-2 text-sm bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-colors"
            >
              Tournament Help
            </button>
            <button
              onClick={() => handleQuickAction('payment-deposit')}
              className="flex-1 min-w-[120px] px-3 py-2 text-sm bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/30 transition-colors"
            >
              Deposit Help
            </button>
            <button
              onClick={() => handleQuickAction('payment-withdrawal')}
              className="flex-1 min-w-[120px] px-3 py-2 text-sm bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 hover:bg-purple-500/30 transition-colors"
            >
              Withdrawal Help
            </button>
          </div>
        </div>

        {/* Support Channels */}
        <div className="mb-8 sm:mb-12">
          <SupportChannels 
            channels={supportData.supportChannels} 
            onAction={handleQuickAction}
          />
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            {/* FAQ Section */}
            <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-xl p-4 sm:p-6">
              <FAQSection
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                faqs={searchQuery ? filteredFAQs : (supportData.faqCategories[activeCategory] || [])}
                openQuestion={openQuestion}
                onToggleQuestion={toggleQuestion}
                isSearching={!!searchQuery}
              />
            </div>
          </div>

          {/* Contact Form Sidebar */}
          <div className="lg:col-span-1">
            <ContactForm 
              onSubmit={handleFormSubmit}
              initialCategory={activeCategory}
              showPriority={true}
            />
          </div>
        </div>

        {/* Resources Section */}
        <div className="mt-8 lg:mt-12 bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-xl p-4 sm:p-8">
          <ResourcesSection resources={supportData.resourceLinks} />
        </div>
      </main>
    </div>
  );
}