import api from './api';

export const supportService = {
  // Submit a support ticket
  submitTicket: async (ticketData) => {
    const response = await api.post('/support/tickets', ticketData);
    return response.data;
  },

  // Get user's support tickets
  getTickets: async (params = {}) => {
    const response = await api.get('/support/tickets', { params });
    return response.data;
  },

  // Get ticket by ID
  getTicket: async (ticketId) => {
    const response = await api.get(`/support/tickets/${ticketId}`);
    return response.data;
  },

  // Add reply to ticket
  addReply: async (ticketId, message) => {
    const response = await api.post(`/support/tickets/${ticketId}/replies`, { message });
    return response.data;
  },

  // Get FAQ categories
  getFAQs: async () => {
    const response = await api.get('/support/faqs');
    return response.data;
  },

  // Search FAQs
  searchFAQs: async (query) => {
    const response = await api.get('/support/faqs/search', { params: { query } });
    return response.data;
  },

  // Rate support response
  rateResponse: async (ticketId, rating) => {
    const response = await api.post(`/support/tickets/${ticketId}/rate`, { rating });
    return response.data;
  }
};