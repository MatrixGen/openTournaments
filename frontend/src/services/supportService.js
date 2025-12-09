// supportService.js
import api from './api'; // Your existing API instance

export const supportService = {
  // Get all support data for main page
  async getSupportData() {
    try {
      const response = await api.get('/support/data');
      
      // Response structure:
      // {
      //   success: true,
      //   data: {
      //     faqCategories: {
      //       general: [
      //         {
      //           id: 'faq_1',
      //           question: 'How do I get started?',
      //           answer: 'To get started...',
      //           category: 'general',
      //           subcategory: 'getting_started',
      //           helpfulCount: 42,
      //           notHelpfulCount: 2,
      //           createdAt: '2024-01-01T00:00:00.000Z'
      //         }
      //       ],
      //       tournament: [...],
      //       payment: [...],
      //       technical: [...],
      //       account: [...],
      //       billing: [...]
      //     },
      //     supportChannels: [
      //       {
      //         id: 'channel_1',
      //         title: 'Live Chat Support',
      //         description: 'Instant assistance from our dedicated support team',
      //         action: 'Start Chat',
      //         actionType: 'live-chat',
      //         variant: 'primary',
      //         isAvailable: true,
      //         availabilityHours: '24/7',
      //         responseTime: '2 minutes',
      //         icon: 'chat'
      //       },
      //       {
      //         id: 'channel_2',
      //         title: 'Knowledge Base',
      //         description: 'Comprehensive guides and documentation',
      //         action: 'Browse Articles',
      //         actionType: 'knowledge-base',
      //         variant: 'secondary',
      //         isAvailable: true,
      //         availabilityHours: 'Always',
      //         responseTime: 'Instant',
      //         icon: 'document'
      //       }
      //     ],
      //     resourceLinks: [
      //       {
      //         id: 'resource_1',
      //         title: 'Documentation',
      //         description: 'Technical guides and API references',
      //         href: '/docs',
      //         category: 'Technical',
      //         icon: 'document-text',
      //         isExternal: false,
      //         popularity: 95
      //       }
      //     ]
      //   },
      //   timestamp: '2024-01-01T00:00:00.000Z'
      // }
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch support data');
      }
    } catch (error) {
      console.error('Error fetching support data:', error);
      throw error;
    }
  },

  // Get FAQs by category and optional subcategory
  async getFAQsByCategory(category, subcategory = null) {
    try {
      const params = { category };
      if (subcategory) {
        params.subcategory = subcategory;
      }
      
      const response = await api.get('/support/faqs', { params });
      
      // Response structure:
      // {
      //   success: true,
      //   data: {
      //     category: 'tournament',
      //     subcategory: 'creation',
      //     faqs: [
      //       {
      //         id: 'faq_tournament_1',
      //         question: 'How do I create a tournament?',
      //         answer: 'To create a tournament...',
      //         helpfulCount: 120,
      //         notHelpfulCount: 5,
      //         relatedQuestions: ['faq_tournament_2', 'faq_tournament_3'],
      //         tags: ['creation', 'setup', 'tournament'],
      //         lastUpdated: '2024-01-01T00:00:00.000Z'
      //       }
      //     ],
      //     metadata: {
      //       total: 15,
      //       page: 1,
      //       limit: 20,
      //       hasMore: false
      //     }
      //   },
      //   timestamp: '2024-01-01T00:00:00.000Z'
      // }
      
      if (response.data.success) {
        return response.data.data.faqs;
      } else {
        throw new Error(response.data.message || 'Failed to fetch FAQs');
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      throw error;
    }
  },

  // Submit a support ticket
  async submitSupportTicket(ticketData) {
    try {
      const response = await api.post('/support/tickets', ticketData);
      
      // Request body structure:
      // {
      //   name: 'John Doe',
      //   email: 'john@example.com',
      //   subject: 'Issue with tournament creation',
      //   category: 'tournament',
      //   subcategory: 'creation',
      //   priority: 'medium',
      //   message: 'Detailed description...',
      //   source: 'support_main_page',
      //   attachments: [], // Optional array of file URLs
      //   userId: 'user_123', // Optional, if logged in
      //   userIp: '127.0.0.1' // Optional, auto-filled by backend
      // }
      
      // Response structure:
      // {
      //   success: true,
      //   data: {
      //     ticketId: 'ticket_abc123',
      //     ticketNumber: 'SUP-2024-001234',
      //     status: 'open',
      //     priority: 'medium',
      //     estimatedResponseTime: '2 hours',
      //     createdAt: '2024-01-01T00:00:00.000Z',
      //     assignee: {
      //       id: 'agent_1',
      //       name: 'Support Agent',
      //       avatar: 'https://...'
      //     },
      //     threadId: 'thread_abc123',
      //     customerMessage: 'Your message...',
      //     autoReplySent: true,
      //     followUpInstructions: 'We will get back to you within 2 hours.',
      //     referenceLinks: [
      //       {
      //         title: 'Related FAQ',
      //         url: '/support/faq/123'
      //       }
      //     ]
      //   },
      //   message: 'Support ticket created successfully',
      //   timestamp: '2024-01-01T00:00:00.000Z'
      // }
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to submit support ticket');
      }
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      throw error;
    }
  },

  // Search FAQs
  async searchFAQs(query, category = null) {
    try {
      const params = { query };
      if (category) {
        params.category = category;
      }
      
      const response = await api.get('/support/faqs/search', { params });
      
      // Response structure:
      // {
      //   success: true,
      //   data: {
      //     query: 'tournament creation',
      //     results: [
      //       {
      //         id: 'faq_tournament_1',
      //         question: 'How do I create a tournament?',
      //         answer: 'To create a tournament...',
      //         category: 'tournament',
      //         subcategory: 'creation',
      //         relevanceScore: 0.95,
      //         matchType: 'question_and_answer',
      //         highlightedQuestion: 'How do I create a <em>tournament</em>?',
      //         highlightedAnswer: 'To create a <em>tournament</em>...'
      //       }
      //     ],
      //     metadata: {
      //       total: 5,
      //       categories: ['tournament', 'general'],
      //       responseTime: '45ms'
      //     }
      //   },
      //   timestamp: '2024-01-01T00:00:00.000Z'
      // }
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Search failed');
      }
    } catch (error) {
      console.error('Error searching FAQs:', error);
      throw error;
    }
  },

  // Get support ticket status
  async getTicketStatus(ticketId) {
    try {
      const response = await api.get(`/support/tickets/${ticketId}/status`);
      
      // Response structure:
      // {
      //   success: true,
      //   data: {
      //     ticketId: 'ticket_abc123',
      //     ticketNumber: 'SUP-2024-001234',
      //     status: 'in_progress',
      //     priority: 'medium',
      //     createdAt: '2024-01-01T00:00:00.000Z',
      //     updatedAt: '2024-01-01T01:30:00.000Z',
      //     lastActivityAt: '2024-01-01T01:30:00.000Z',
      //     assignedTo: {
      //       id: 'agent_1',
      //       name: 'Support Agent',
      //       avatar: 'https://...'
      //     },
      //     statusHistory: [
      //       {
      //         status: 'open',
      //         timestamp: '2024-01-01T00:00:00.000Z',
      //         actor: 'system'
      //       },
      //       {
      //         status: 'in_progress',
      //         timestamp: '2024-01-01T01:30:00.000Z',
      //         actor: 'agent_1'
      //       }
      //     ],
      //     estimatedResolution: '2024-01-01T03:00:00.000Z',
      //     messagesCount: 3,
      //     lastMessage: {
      //       id: 'msg_123',
      //       content: 'We are looking into your issue...',
      //       sender: 'agent_1',
      //       timestamp: '2024-01-01T01:30:00.000Z'
      //     }
      //   },
      //   timestamp: '2024-01-01T00:00:00.000Z'
      // }
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch ticket status');
      }
    } catch (error) {
      console.error('Error fetching ticket status:', error);
      throw error;
    }
  },

  // Get user's support tickets
  async getUserTickets(userId, status = null, limit = 10, offset = 0) {
    try {
      const params = { userId, limit, offset };
      if (status) {
        params.status = status;
      }
      
      const response = await api.get('/support/tickets/user', { params });
      
      // Response structure:
      // {
      //   success: true,
      //   data: {
      //     tickets: [
      //       {
      //         id: 'ticket_abc123',
      //         ticketNumber: 'SUP-2024-001234',
      //         subject: 'Issue with tournament creation',
      //         category: 'tournament',
      //         subcategory: 'creation',
      //         status: 'open',
      //         priority: 'medium',
      //         createdAt: '2024-01-01T00:00:00.000Z',
      //         updatedAt: '2024-01-01T01:30:00.000Z',
      //         lastMessageAt: '2024-01-01T01:30:00.000Z',
      //         messagesCount: 3,
      //         hasUnread: true
      //       }
      //     ],
      //     metadata: {
      //       total: 15,
      //       open: 5,
      //       in_progress: 3,
      //       resolved: 7,
      //       closed: 0,
      //       page: 1,
      //       limit: 10,
      //       hasMore: true
      //     }
      //   },
      //   timestamp: '2024-01-01T00:00:00.000Z'
      // }
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch user tickets');
      }
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      throw error;
    }
  },

  // Mark FAQ as helpful/not helpful
  async rateFAQ(faqId, helpful) {
    try {
      const response = await api.post('/support/faqs/rate', {
        faqId,
        helpful,
        userId: 'user_123' // Optional, for user-specific tracking
      });
      
      // Response structure:
      // {
      //   success: true,
      //   data: {
      //     faqId: 'faq_tournament_1',
      //     helpfulCount: 121,
      //     notHelpfulCount: 5,
      //     userVote: 'helpful', // or 'not_helpful'
      //     hasVoted: true
      //   },
      //   message: 'Thank you for your feedback',
      //   timestamp: '2024-01-01T00:00:00.000Z'
      // }
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error rating FAQ:', error);
      throw error;
    }
  },

  // Get support channel availability
  async getChannelAvailability(channelId) {
    try {
      const response = await api.get(`/support/channels/${channelId}/availability`);
      
      // Response structure:
      // {
      //   success: true,
      //   data: {
      //     channelId: 'live_chat',
      //     isAvailable: true,
      //     availableAgents: 5,
      //     estimatedWaitTime: '2 minutes',
      //     operatingHours: {
      //       timezone: 'UTC',
      //       schedule: [
      //         {
      //           day: 'Monday',
      //           open: '09:00',
      //           close: '18:00'
      //         }
      //       ],
      //       is24_7: false
      //     },
      //     nextAvailableSlot: '2024-01-01T09:00:00.000Z',
      //     maintenanceSchedule: null
      //   },
      //   timestamp: '2024-01-01T00:00:00.000Z'
      // }
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to check channel availability');
      }
    } catch (error) {
      console.error('Error checking channel availability:', error);
      throw error;
    }
  },

  // Get popular/trending FAQs
  async getPopularFAQs(limit = 10) {
    try {
      const response = await api.get('/support/faqs/popular', { params: { limit } });
      
      // Response structure:
      // {
      //   success: true,
      //   data: {
      //     faqs: [
      //       {
      //         id: 'faq_popular_1',
      //         question: 'How do I withdraw my winnings?',
      //         answer: 'To withdraw your winnings...',
      //         category: 'payment',
      //         subcategory: 'withdrawal',
      //         helpfulCount: 450,
      //         viewCount: 1200,
      //         lastViewed: '2024-01-01T00:00:00.000Z',
      //         trendingScore: 0.95
      //       }
      //     ],
      //     metadata: {
      //       period: 'last_7_days',
      //       totalViews: 5000,
      //       averageRating: 4.8
      //     }
      //   },
      //   timestamp: '2024-01-01T00:00:00.000Z'
      // }
      
      if (response.data.success) {
        return response.data.data.faqs;
      } else {
        throw new Error(response.data.message || 'Failed to fetch popular FAQs');
      }
    } catch (error) {
      console.error('Error fetching popular FAQs:', error);
      throw error;
    }
  },

  // Upload attachment for support ticket
  async uploadAttachment(file, ticketId = null) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (ticketId) {
        formData.append('ticketId', ticketId);
      }
      
      const response = await api.post('/support/attachments/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Response structure:
      // {
      //   success: true,
      //   data: {
      //     attachmentId: 'attach_123',
      //     filename: 'screenshot.png',
      //     url: 'https://storage.example.com/attachments/...',
      //     size: 102400,
      //     mimeType: 'image/png',
      //     uploadedAt: '2024-01-01T00:00:00.000Z',
      //     expiresAt: '2024-01-08T00:00:00.000Z' // For temporary storage
      //   },
      //   message: 'File uploaded successfully',
      //   timestamp: '2024-01-01T00:00:00.000Z'
      // }
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to upload attachment');
      }
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  },

  // Initialize live chat session
  async initLiveChatSession(userData) {
    try {
      const response = await api.post('/support/live-chat/sessions', userData);
      
      // Request body structure:
      // {
      //   userId: 'user_123', // Optional
      //   name: 'John Doe', // Optional
      //   email: 'john@example.com', // Optional
      //   department: 'general', // Optional: 'general', 'technical', 'billing', etc.
      //   issue: 'Brief description of issue', // Optional
      //   metadata: {
      //     browser: 'Chrome 120',
      //     os: 'Windows 10',
      //     pageUrl: '/support/tournament'
      //   }
      // }
      
      // Response structure:
      // {
      //   success: true,
      //   data: {
      //     sessionId: 'session_abc123',
      //     agent: {
      //       id: 'agent_1',
      //       name: 'Support Agent',
      //       avatar: 'https://...',
      //       rating: 4.9,
      //       specialization: ['tournament', 'technical']
      //     },
      //     estimatedWaitTime: '1 minute',
      //     chatToken: 'chat_token_abc123',
      //     websocketUrl: 'wss://chat.example.com/ws',
      //     roomId: 'room_abc123',
      //     expiresAt: '2024-01-01T01:00:00.000Z'
      //   },
      //   message: 'Chat session created successfully',
      //   timestamp: '2024-01-01T00:00:00.000Z'
      // }
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to initialize chat session');
      }
    } catch (error) {
      console.error('Error initializing chat session:', error);
      throw error;
    }
  }
};

