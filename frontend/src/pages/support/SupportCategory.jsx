// SupportCategory.jsx
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supportService } from '../../services/supportService';
import FAQSection from '../../components/support/FAQSection';
import ContactForm from '../../components/support/ContactForm';

export default function SupportCategory() {
  const { category, topic } = useParams();
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState([]);
  const [openQuestion, setOpenQuestion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        setLoading(true);
        const data = await supportService.getFAQsByCategory(category, topic);
        setFaqs(data);
      } catch (error) {
        console.error('Failed to load FAQs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFAQs();
  }, [category, topic]);

  const toggleQuestion = (index) => {
    setOpenQuestion(openQuestion === index ? null : index);
  };

  const handleFormSubmit = async (formData) => {
    const ticketData = {
      ...formData,
      category,
      subcategory: topic
    };
    return await supportService.submitSupportTicket(ticketData);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-xl p-6">
            <h1 className="text-2xl font-bold text-white mb-4 capitalize">
              {category} Support{topic && `: ${topic}`}
            </h1>
            
            <FAQSection
              categories={[category]}
              activeCategory={category}
              onCategoryChange={() => {}}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              faqs={faqs}
              openQuestion={openQuestion}
              onToggleQuestion={toggleQuestion}
              isSearching={!!searchQuery}
              showCategorySelector={false}
            />
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <ContactForm 
            onSubmit={handleFormSubmit}
            initialCategory={category}
            showPriority={true}
          />
        </div>
      </div>
    </div>
  );
}