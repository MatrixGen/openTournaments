// ContactForm.jsx
import React, { useState } from 'react';

export default function ContactForm({ onSubmit, initialCategory = 'general', showPriority = true }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: initialCategory,
    priority: 'medium',
    message: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    if (!formData.subject.trim()) errors.subject = 'Subject is required';
    if (!formData.message.trim()) errors.message = 'Message is required';
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        category: initialCategory,
        priority: 'medium',
        message: ''
      });
      setFormErrors({});
      
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      setFormErrors({ submit: error.message || 'Failed to submit ticket' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-xl p-4 sm:p-6 lg:sticky lg:top-8">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Contact Support</h2>
        <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
          Need personalized assistance? Our team typically responds within 2 hours during business hours.
        </p>
      </div>

      {submitSuccess && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 sm:gap-3">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-green-400 font-medium text-sm sm:text-base">Message sent successfully</p>
              <p className="text-green-400/80 text-xs sm:text-sm">We'll get back to you shortly</p>
            </div>
          </div>
        </div>
      )}

      {formErrors.submit && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm">{formErrors.submit}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full rounded-lg border bg-neutral-900 py-2.5 sm:py-3 px-3 sm:px-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors text-sm sm:text-base ${
                formErrors.name 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                  : 'border-neutral-600 focus:border-blue-500 focus:ring-blue-500/20'
              }`}
              placeholder="Your full name"
            />
            {formErrors.name && (
              <p className="mt-1 text-xs text-red-400">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full rounded-lg border bg-neutral-900 py-2.5 sm:py-3 px-3 sm:px-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors text-sm sm:text-base ${
                formErrors.email 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                  : 'border-neutral-600 focus:border-blue-500 focus:ring-blue-500/20'
              }`}
              placeholder="your.email@example.com"
            />
            {formErrors.email && (
              <p className="mt-1 text-xs text-red-400">{formErrors.email}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="category" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="w-full rounded-lg border border-neutral-600 bg-neutral-900 py-2.5 sm:py-3 px-3 sm:px-4 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors text-sm sm:text-base"
          >
            <option value="general">General Inquiry</option>
            <option value="technical">Technical Support</option>
            <option value="billing">Billing & Payments</option>
            <option value="tournament">Tournament Support</option>
            <option value="account">Account Issues</option>
            <option value="feature">Feature Request</option>
          </select>
        </div>

        {showPriority && (
          <div>
            <label htmlFor="priority" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-neutral-600 bg-neutral-900 py-2.5 sm:py-3 px-3 sm:px-4 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors text-sm sm:text-base"
            >
              <option value="low">Low - General question</option>
              <option value="medium">Medium - Feature not working</option>
              <option value="high">High - Service disruption</option>
              <option value="critical">Critical - Complete outage</option>
            </select>
          </div>
        )}

        <div>
          <label htmlFor="subject" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
            Subject *
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            required
            value={formData.subject}
            onChange={handleInputChange}
            className={`w-full rounded-lg border bg-neutral-900 py-2.5 sm:py-3 px-3 sm:px-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors text-sm sm:text-base ${
              formErrors.subject 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                : 'border-neutral-600 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
            placeholder="Brief description of your issue"
          />
          {formErrors.subject && (
            <p className="mt-1 text-xs text-red-400">{formErrors.subject}</p>
          )}
        </div>

        <div>
          <label htmlFor="message" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
            Message *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={4}
            value={formData.message}
            onChange={handleInputChange}
            className={`w-full rounded-lg border bg-neutral-900 py-2.5 sm:py-3 px-3 sm:px-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors resize-none text-sm sm:text-base ${
              formErrors.message 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                : 'border-neutral-600 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
            placeholder="Please provide detailed information about your issue..."
          />
          {formErrors.message && (
            <p className="mt-1 text-xs text-red-400">{formErrors.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-gray-900 dark:text-white font-semibold py-3 sm:py-4 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 text-sm sm:text-base"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
              Sending Message...
            </div>
          ) : (
            'Send Message to Support'
          )}
        </button>
      </form>

      <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-neutral-700">
        <h3 className="text-gray-900 dark:text-white font-semibold mb-3 text-sm sm:text-base">Support Information</h3>
        <div className="space-y-2 text-xs sm:text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Response time: &lt; 2 hours (business hours)</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>support@open-tournament.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}