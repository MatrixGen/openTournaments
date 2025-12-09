// TournamentSupport.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supportService } from '../../../services/supportService';
import FAQSection from '../../../components/support/FAQSection';
import ContactForm from '../../../components/support/ContactForm';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorMessage from '../../../components/common/ErrorMessage';

const tournamentTopics = [
  { id: 'creation', name: 'Tournament Creation', icon: 'plus-circle' },
  { id: 'joining', name: 'Joining Tournaments', icon: 'user-plus' },
  { id: 'rules', name: 'Rules & Format', icon: 'clipboard-list' },
  { id: 'prizes', name: 'Prizes & Rewards', icon: 'trophy' },
  { id: 'disputes', name: 'Match Disputes', icon: 'scale' },
  { id: 'scheduling', name: 'Scheduling', icon: 'calendar' },
  { id: 'results', name: 'Results & Standings', icon: 'chart-bar' },
  { id: 'team', name: 'Team Management', icon: 'users' },
];

export default function TournamentSupport({ initialTab = 'creation' }) {
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
    const fetchTournamentFAQs = async () => {
      try {
        setLoading(true);
        const data = await supportService.getFAQsByCategory('tournament', activeTopic);
        setFaqs(data);
      } catch (err) {
        setError(err.message || 'Failed to load tournament FAQs');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTournamentFAQs();
  }, [activeTopic]);

  const handleTopicChange = (topicId) => {
    setActiveTopic(topicId);
    setOpenQuestion(null);
    setSearchQuery('');
    navigate(`/support/tournament/${topicId}`, { replace: true });
  };

  const handleFormSubmit = async (formData) => {
    const ticketData = {
      ...formData,
      category: 'tournament',
      subcategory: activeTopic,
      source: 'tournament_support_page'
    };
    return await supportService.submitSupportTicket(ticketData);
  };

  const getTopicIcon = (iconName) => {
    const icons = {
      'plus-circle': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      'user-plus': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      'clipboard-list': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      'trophy': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      'scale': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
      'calendar': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      'chart-bar': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      'users': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 3.75a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.5a2.25 2.25 0 012.25-2.25h15a2.25 2.25 0 012.25 2.25v12.75z" />
        </svg>
      ),
    };
    return icons[iconName] || icons['plus-circle'];
  };

  const getTopicTitle = () => {
    const topicObj = tournamentTopics.find(t => t.id === activeTopic);
    return topicObj ? topicObj.name : 'Tournament Support';
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
            Tournament Support
          </h1>
          <p className="text-gray-300 text-lg">
            Get help with tournament creation, management, disputes, and more.
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
                {tournamentTopics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTopicChange(t.id)}
                    className={`px-4 py-3 rounded-lg border transition-all duration-200 flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                      activeTopic === t.id
                        ? 'bg-blue-500 border-blue-500 text-white'
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
                categories={['tournament']}
                activeCategory="tournament"
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
              initialCategory="tournament"
              showPriority={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
}