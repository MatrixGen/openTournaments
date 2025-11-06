// Support.js
import { useState } from 'react';
import { faqCategories } from '../../data/supportData';

const supportChannels = [
  {
    icon: (
      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    title: "Live Chat Support",
    description: "Instant assistance from our dedicated support team",
    action: "Start Chat",
    variant: "primary"
  },
  {
    icon: (
      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Knowledge Base",
    description: "Comprehensive guides and documentation",
    action: "Browse Articles",
    variant: "secondary"
  }
];

const resourceLinks = [
  {
    title: "Documentation",
    description: "Technical guides and API references",
    href: "#",
    category: "Technical"
  },
  {
    title: "Community Forum",
    description: "Connect with other users and experts",
    href: "#",
    category: "Community"
  },
  {
    title: "Status Page",
    description: "Service status and incident reports",
    href: "#",
    category: "Operations"
  },
  {
    title: "Video Tutorials",
    description: "Step-by-step video guides",
    href: "#",
    category: "Learning"
  },
  {
    title: "API Reference",
    description: "Complete API documentation",
    href: "#",
    category: "Technical"
  },
  {
    title: "Release Notes",
    description: "Latest updates and features",
    href: "#",
    category: "Updates"
  }
];

export default function Support() {
  const [activeCategory, setActiveCategory] = useState('general');
  const [openQuestion, setOpenQuestion] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    priority: 'medium',
    message: ''
  });

  const [formErrors, setFormErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Support ticket submitted:', formData);
      
      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        category: 'general',
        priority: 'medium',
        message: ''
      });
      setFormErrors({});
      
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      console.error('Failed to submit support ticket:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleQuestion = (index) => {
    setOpenQuestion(openQuestion === index ? null : index);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-800">
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-20">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-blue-400 text-sm font-medium">24/7 Support Available</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            How can we help you?
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Find instant answers, contact our team, or explore resources to get the most out of our platform.
          </p>
        </div>

        {/* Support Channels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {supportChannels.map((channel, index) => (
            <div key={index} className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-xl p-6 hover:border-neutral-600 transition-all duration-200">
              <div className={`w-12 h-12 rounded-lg ${
                channel.variant === 'primary' ? 'bg-blue-500/20' : 'bg-green-500/20'
              } flex items-center justify-center mb-4`}>
                {channel.icon}
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{channel.title}</h3>
              <p className="text-gray-400 mb-4 leading-relaxed">{channel.description}</p>
              <button className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                channel.variant === 'primary' 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                  : 'bg-neutral-700 hover:bg-neutral-600 text-white'
              }`}>
                {channel.action}
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Search & FAQ Section */}
            <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-xl p-6">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Frequently Asked Questions</h2>
                <p className="text-gray-400">Quick answers to common questions</p>
              </div>

              {/* Search */}
              <div className="relative mb-8">
                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-900 border border-neutral-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2 mb-8">
                {Object.keys(faqCategories).map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize border ${
                      activeCategory === category
                        ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-neutral-700 border-neutral-600 text-gray-300 hover:bg-neutral-600 hover:border-neutral-500'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* FAQ Questions */}
              <div className="space-y-3">
                {faqCategories[activeCategory]?.map((faq, index) => (
                  <div key={index} className="bg-neutral-900 border border-neutral-700 rounded-lg overflow-hidden hover:border-neutral-600 transition-colors">
                    <button
                      onClick={() => toggleQuestion(index)}
                      className="w-full text-left p-6 flex justify-between items-center hover:bg-neutral-800/50 transition-colors"
                    >
                      <span className="text-white font-medium pr-6 text-lg leading-relaxed">
                        {faq.question}
                      </span>
                      <svg
                        className={`flex-shrink-0 w-5 h-5 text-gray-400 transform transition-transform ${
                          openQuestion === index ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {openQuestion === index && (
                      <div className="px-6 pb-6">
                        <div className="w-12 h-px bg-gradient-to-r from-blue-500 to-transparent mb-4"></div>
                        <p className="text-gray-300 leading-relaxed text-lg">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Form Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-xl p-6 lg:sticky lg:top-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Contact Support</h2>
                <p className="text-gray-400 leading-relaxed">
                  Need personalized assistance? Our team typically responds within 2 hours during business hours.
                </p>
              </div>

              {submitSuccess && (
                <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-green-400 font-medium">Message sent successfully</p>
                      <p className="text-green-400/80 text-sm">We'll get back to you shortly</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border bg-neutral-900 py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                        formErrors.name 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                          : 'border-neutral-600 focus:border-blue-500 focus:ring-blue-500/20'
                      }`}
                      placeholder="Your full name"
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-400">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full rounded-lg border bg-neutral-900 py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                        formErrors.email 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                          : 'border-neutral-600 focus:border-blue-500 focus:ring-blue-500/20'
                      }`}
                      placeholder="your.email@example.com"
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-sm text-red-400">{formErrors.email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-neutral-600 bg-neutral-900 py-3 px-4 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing & Payments</option>
                    <option value="tournament">Tournament Support</option>
                    <option value="account">Account Issues</option>
                    <option value="feature">Feature Request</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-neutral-600 bg-neutral-900 py-3 px-4 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  >
                    <option value="low">Low - General question</option>
                    <option value="medium">Medium - Feature not working</option>
                    <option value="high">High - Service disruption</option>
                    <option value="critical">Critical - Complete outage</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border bg-neutral-900 py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                      formErrors.subject 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                        : 'border-neutral-600 focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                    placeholder="Brief description of your issue"
                  />
                  {formErrors.subject && (
                    <p className="mt-1 text-sm text-red-400">{formErrors.subject}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={handleInputChange}
                    className={`w-full rounded-lg border bg-neutral-900 py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors resize-none ${
                      formErrors.message 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                        : 'border-neutral-600 focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                    placeholder="Please provide detailed information about your issue..."
                  />
                  {formErrors.message && (
                    <p className="mt-1 text-sm text-red-400">{formErrors.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Sending Message...
                    </div>
                  ) : (
                    'Send Message to Support'
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-neutral-700">
                <h3 className="text-white font-semibold mb-4">Support Information</h3>
                <div className="space-y-3 text-sm text-gray-400">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Response time: &lt; 2 hours (business hours)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>support@opentournaments.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resources Section */}
        <div className="mt-12 bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Additional Resources</h2>
            <p className="text-gray-400">Explore our comprehensive documentation and community resources</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resourceLinks.map((resource, index) => (
              <a
                key={index}
                href={resource.href}
                className="block bg-neutral-900 border border-neutral-700 rounded-lg p-6 hover:border-neutral-600 hover:bg-neutral-800/50 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                    {resource.category}
                  </span>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                  {resource.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {resource.description}
                </p>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}