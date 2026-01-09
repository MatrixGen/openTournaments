// SupportCategory.jsx
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supportService } from '../../services/supportService';
import FAQSection from '../../components/support/FAQSection';
import ContactForm from '../../components/support/ContactForm';

export default function SupportCategory() {
  const { category, topic } = useParams();
  
  const handleFormSubmit = async (formData) => {
    const ticketData = {
      ...formData,
      category,
      subcategory: topic
    };
    return await supportService.submitSupportTicket(ticketData);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
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