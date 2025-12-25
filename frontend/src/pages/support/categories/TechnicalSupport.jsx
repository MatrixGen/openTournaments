// TechnicalSupport.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supportService } from '../../../services/supportService';
import FAQSection from '../../../components/support/FAQSection';
import ContactForm from '../../../components/support/ContactForm';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorMessage from '../../../components/common/ErrorMessage';

const technicalTopics = [
  { id: 'platform', name: 'Platform Issues', icon: 'computer-desktop' },
  { id: 'connection', name: 'Connection Problems', icon: 'wifi' },
  { id: 'performance', name: 'Performance', icon: 'clock' },
  { id: 'bugs', name: 'Bug Reports', icon: 'bug' },
  { id: 'browser', name: 'Browser Compatibility', icon: 'globe' },
  { id: 'mobile', name: 'Mobile App', icon: 'device-phone-mobile' },
  { id: 'api', name: 'API & Integration', icon: 'code-bracket' },
  { id: 'security', name: 'Security Concerns', icon: 'shield-exclamation' },
];

export default function TechnicalSupport({ initialTab = 'platform' }) {
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
    const fetchTechnicalFAQs = async () => {
      try {
        setLoading(true);
        const data = await supportService.getFAQsByCategory('technical', activeTopic);
        setFaqs(data);
      } catch (err) {
        setError(err.message || 'Failed to load technical FAQs');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTechnicalFAQs();
  }, [activeTopic]);

  const handleTopicChange = (topicId) => {
    setActiveTopic(topicId);
    setOpenQuestion(null);
    setSearchQuery('');
    navigate(`/support/technical/${topicId}`, { replace: true });
  };

  const handleFormSubmit = async (formData) => {
    const ticketData = {
      ...formData,
      category: 'technical',
      subcategory: activeTopic,
      source: 'technical_support_page'
    };
    return await supportService.submitSupportTicket(ticketData);
  };

  const getTopicIcon = (iconName) => {
    const icons = {
      'computer-desktop': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      'wifi': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      ),
      'clock': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'bug': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12c-2.5 0-4.5 2-4.5 4.5 0 1.5.7 2.8 1.8 3.6M12 12c2.5 0 4.5 2 4.5 4.5 0 1.5-.7 2.8-1.8 3.6M12 12V9m0 0c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" />
        </svg>
      ),
      'globe': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      'device-phone-mobile': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
        </svg>
      ),
      'code-bracket': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      ),
      'shield-exclamation': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.102 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
    };
    return icons[iconName] || icons['computer-desktop'];
  };

  const getTopicTitle = () => {
    const topicObj = technicalTopics.find(t => t.id === activeTopic);
    return topicObj ? topicObj.name : 'Technical Support';
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
            Technical Support
          </h1>
          <p className="text-gray-300 text-lg">
            Get help with technical issues, bugs, performance, and platform-related problems.
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
                {technicalTopics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTopicChange(t.id)}
                    className={`px-4 py-3 rounded-lg border transition-all duration-200 flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                      activeTopic === t.id
                        ? 'bg-purple-500 border-purple-500 text-gray-900 dark:text-white'
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
                categories={['technical']}
                activeCategory="technical"
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
              initialCategory="technical"
              showPriority={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
}