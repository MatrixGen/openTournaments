const { 
  FAQCategory, 
  FAQ, 
  FAQRating, 
  SupportChannel, 
  ResourceLink, 
  SupportTicket, 
  SupportTicketMessage,
  SupportTicketAttachment,
  SupportTicketStatusHistory,
  LiveChatSession,
  User,
  sequelize 
} = require('../models');
const { validationResult } = require('express-validator');
const { Op, Sequelize } = require('sequelize');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const { UserEmailService } = require('../services/emailService');

// Helper function to generate ticket number
const generateTicketNumber = () => {
  const prefix = 'SUP';
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${year}-${random}`;
};

// Helper function to generate session ID
const generateSessionId = () => {
  return `session_${crypto.randomBytes(16).toString('hex')}`;
};

// Helper function to generate chat token
const generateChatToken = () => {
  return `chat_${crypto.randomBytes(32).toString('hex')}`;
};

// Get all support data for main page
const getSupportData = async (req, res, next) => {
  try {
    // Fetch all data in parallel
    const [faqCategories, supportChannels, resourceLinks, popularFaqs] = await Promise.all([
      FAQCategory.findAll({
        where: { is_active: true },
        order: [['order', 'ASC']],
        include: [{
          model: FAQ,
          as: 'faqs',
          where: { is_published: true },
          limit: 5,
          order: [['popularity_score', 'DESC']],
          attributes: ['id', 'question', 'answer', 'subcategory', 'helpful_count', 'not_helpful_count', 'created_at']
        }]
      }),
      SupportChannel.findAll({
        where: { is_available: true },
        order: [['order', 'ASC']],
        attributes: { exclude: ['created_at', 'updated_at'] }
      }),
      ResourceLink.findAll({
        where: { is_active: true },
        order: [['order', 'ASC']],
        limit: 10,
        attributes: { exclude: ['created_at', 'updated_at'] }
      }),
      FAQ.findAll({
        where: { is_published: true },
        order: [['popularity_score', 'DESC'], ['view_count', 'DESC']],
        limit: 5,
        attributes: ['id', 'question', 'answer', 'category_id', 'helpful_count', 'view_count']
      })
    ]);

    // Transform FAQ categories into the expected format
    const faqCategoriesFormatted = {};
    faqCategories.forEach(category => {
      const categorySlug = category.slug;
      faqCategoriesFormatted[categorySlug] = category.faqs.map(faq => ({
        id: `faq_${faq.id}`,
        question: faq.question,
        answer: faq.answer,
        category: categorySlug,
        subcategory: faq.subcategory || null,
        helpfulCount: faq.helpful_count,
        notHelpfulCount: faq.not_helpful_count,
        createdAt: faq.created_at
      }));
    });

    res.json({
      success: true,
      data: {
        faqCategories: faqCategoriesFormatted,
        supportChannels: supportChannels.map(channel => ({
          id: `channel_${channel.id}`,
          title: channel.title,
          description: channel.description,
          action: channel.action,
          actionType: channel.action_type,
          variant: channel.variant,
          isAvailable: channel.is_available,
          availabilityHours: channel.availability_hours,
          responseTime: channel.response_time,
          icon: channel.icon,
          url: channel.url,
          requiresAuth: channel.requires_auth
        })),
        resourceLinks: resourceLinks.map(link => ({
          id: `resource_${link.id}`,
          title: link.title,
          description: link.description,
          href: link.href,
          category: link.category,
          icon: link.icon,
          isExternal: link.is_external,
          popularity: link.popularity,
          target: link.target
        })),
        popularFAQs: popularFaqs.map(faq => ({
          id: `faq_${faq.id}`,
          question: faq.question,
          answer: faq.answer,
          helpfulCount: faq.helpful_count,
          viewCount: faq.view_count
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching support data:', error);
    next(error);
  }
};

// Get FAQs by category and optional subcategory
const getFAQsByCategory = async (req, res, next) => {
  try {
    const { category, subcategory } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Find category by slug
    const faqCategory = await FAQCategory.findOne({
      where: { slug: category, is_active: true }
    });

    if (!faqCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Build where clause
    const where = {
      category_id: faqCategory.id,
      is_published: true
    };

    if (subcategory) {
      where.subcategory = subcategory;
    }

    const { count, rows: faqs } = await FAQ.findAndCountAll({
      where,
      include: [{
        model: FAQCategory,
        as: 'category',
        attributes: ['name', 'slug']
      }],
      order: [['popularity_score', 'DESC']],
      limit,
      offset,
      attributes: [
        'id', 'question', 'answer', 'subcategory', 
        'helpful_count', 'not_helpful_count', 'tags',
        'created_at', 'updated_at'
      ]
    });

    res.json({
      success: true,
      data: {
        category: faqCategory.slug,
        subcategory: subcategory || null,
        faqs: faqs.map(faq => ({
          id: `faq_${faq.category.slug}_${faq.id}`,
          question: faq.question,
          answer: faq.answer,
          helpfulCount: faq.helpful_count,
          notHelpfulCount: faq.not_helpful_count,
          relatedQuestions: faq.related_faqs || [],
          tags: faq.tags || [],
          lastUpdated: faq.updated_at,
          category: faq.category.slug,
          subcategory: faq.subcategory
        })),
        metadata: {
          total: count,
          page,
          limit,
          hasMore: offset + limit < count,
          totalPages: Math.ceil(count / limit)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    next(error);
  }
};

// Submit a support ticket
const submitSupportTicket = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, email, subject, category, subcategory,
      priority, message, source, attachments, userId
    } = req.body;

    // If user is logged in, get their info
    let user = null;
    if (userId) {
      user = await User.findByPk(userId, { transaction });
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    }

    // Generate ticket number
    const ticketNumber = generateTicketNumber();

    // Create ticket
    const ticket = await SupportTicket.create({
      ticket_number: ticketNumber,
      user_id: user ? user.id : null,
      name: user ? user.username : name,
      email: user ? user.email : email,
      subject,
      category: category || 'general',
      subcategory,
      priority: priority || 'medium',
      status: 'open',
      message,
      source: source || 'support_main_page',
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      estimated_response_time: priority === 'urgent' ? '1 hour' : 
                             priority === 'high' ? '4 hours' : 
                             priority === 'medium' ? '24 hours' : '48 hours',
      metadata: {
        browser: req.useragent?.browser,
        os: req.useragent?.os,
        platform: req.useragent?.platform
      },
      thread_id: `thread_${crypto.randomBytes(16).toString('hex')}`
    }, { transaction });

    // Create initial message
    await SupportTicketMessage.create({
      ticket_id: ticket.id,
      sender_id: user ? user.id : null,
      sender_type: user ? 'customer' : 'customer',
      sender_name: user ? user.username : name,
      sender_email: user ? user.email : email,
      message,
      is_read: false
    }, { transaction });

    // Create status history entry
    await SupportTicketStatusHistory.create({
      ticket_id: ticket.id,
      old_status: null,
      new_status: 'open',
      changed_by_type: 'system',
      notes: 'Ticket created'
    }, { transaction });

    // Handle attachments if provided
    if (attachments && Array.isArray(attachments)) {
      const attachmentPromises = attachments.map(attachment => {
        return SupportTicketAttachment.create({
          ticket_id: ticket.id,
          filename: attachment.filename,
          original_name: attachment.originalName,
          file_path: attachment.filePath,
          mime_type: attachment.mimeType,
          size: attachment.size,
          uploaded_by: user ? user.id : null
        }, { transaction });
      });
      await Promise.all(attachmentPromises);
    }

    // Send auto-reply email if email is provided
    if (email || (user && user.email)) {
      const recipientEmail = email || user.email;
      try {
        await UserEmailService.sendEmail(
          recipientEmail,
          `Support Ticket Created: ${ticketNumber}`,
          `Your support ticket has been created successfully. Our team will get back to you soon.\n\nTicket Number: ${ticketNumber}\nSubject: ${subject}\n\nYou can track your ticket status at: ${process.env.FRONTEND_URL}/support/ticket/${ticket.id}`,
          null,
          {
            replyTo: process.env.SUPPORT_EMAIL || 'support@opentournament.com'
          }
        );
        ticket.auto_reply_sent = true;
        await ticket.save({ transaction });
      } catch (emailError) {
        console.error('Failed to send auto-reply email:', emailError);
        // Don't fail the ticket creation if email fails
      }
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: {
        ticketId: `ticket_${ticket.id}`,
        ticketNumber: ticket.ticket_number,
        status: ticket.status,
        priority: ticket.priority,
        estimatedResponseTime: ticket.estimated_response_time,
        createdAt: ticket.created_at,
        threadId: ticket.thread_id,
        customerMessage: message,
        autoReplySent: ticket.auto_reply_sent,
        followUpInstructions: 'We will get back to you within the estimated response time. Please keep an eye on your email for updates.',
        referenceLinks: [
          {
            title: 'Track Ticket Status',
            url: `${process.env.FRONTEND_URL}/support/ticket/${ticket.id}`
          },
          {
            title: 'FAQ Section',
            url: `${process.env.FRONTEND_URL}/support/faq`
          }
        ]
      },
      message: 'Support ticket created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error submitting support ticket:', error);
    next(error);
  }
};

// Search FAQs
const searchFAQs = async (req, res, next) => {
  try {
    const { query, category } = req.query;
    const limit = parseInt(req.query.limit) || 10;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    // Build where clause
    const where = {
      is_published: true,
      [Op.or]: [
        { question: { [Op.like]: `%${query}%` } },
        { answer: { [Op.like]: `%${query}%` } },
        { tags: { [Op.like]: `%${query}%` } }
      ]
    };

    // Filter by category if provided
    if (category) {
      const faqCategory = await FAQCategory.findOne({
        where: { slug: category, is_active: true }
      });
      if (faqCategory) {
        where.category_id = faqCategory.id;
      }
    }

    // Use full-text search if available, otherwise use LIKE
    const searchQuery = `
      SELECT 
        f.*,
        MATCH(f.question, f.answer, f.tags) AGAINST(:query IN NATURAL LANGUAGE MODE) AS relevance_score,
        c.slug as category_slug,
        c.name as category_name
      FROM faqs f
      LEFT JOIN faq_categories c ON f.category_id = c.id
      WHERE f.is_published = 1
        AND (MATCH(f.question, f.answer, f.tags) AGAINST(:query IN NATURAL LANGUAGE MODE) > 0
             OR f.question LIKE :likeQuery 
             OR f.answer LIKE :likeQuery)
      ORDER BY relevance_score DESC
      LIMIT :limit
    `;

    const results = await sequelize.query(searchQuery, {
      replacements: {
        query: query,
        likeQuery: `%${query}%`,
        limit: limit
      },
      type: sequelize.QueryTypes.SELECT,
      mapToModel: false
    });

    // Process results for highlighting
    const processedResults = results.map(faq => {
      const regex = new RegExp(`(${query})`, 'gi');
      return {
        id: `faq_${faq.id}`,
        question: faq.question,
        answer: faq.answer.substring(0, 200) + (faq.answer.length > 200 ? '...' : ''),
        category: faq.category_slug,
        subcategory: faq.subcategory,
        relevanceScore: faq.relevance_score || 0.5,
        matchType: faq.relevance_score > 0.5 ? 'question_and_answer' : 'partial_match',
        highlightedQuestion: faq.question.replace(regex, '<em>$1</em>'),
        highlightedAnswer: faq.answer.substring(0, 200).replace(regex, '<em>$1</em>')
      };
    });

    // Get unique categories from results
    const categories = [...new Set(results.map(r => r.category_slug))].filter(Boolean);

    res.json({
      success: true,
      data: {
        query,
        results: processedResults,
        metadata: {
          total: processedResults.length,
          categories,
          responseTime: `${Math.random() * 50 + 10}ms` // Simulated response time
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error searching FAQs:', error);
    next(error);
  }
};

// Get support ticket status
const getTicketStatus = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const ticket = await SupportTicket.findOne({
      where: {
        [Op.or]: [
          { id: ticketId.replace('ticket_', '') },
          { ticket_number: ticketId }
        ]
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'username', 'email']
        },
        {
          model: SupportTicketStatusHistory,
          as: 'status_history',
          order: [['created_at', 'DESC']],
          limit: 10,
          include: [{
            model: User,
            as: 'changed_by_user',
            attributes: ['id', 'username']
          }]
        },
        {
          model: SupportTicketMessage,
          as: 'messages',
          order: [['created_at', 'ASC']],
          limit: 1,
          separate: true,
          where: {
            sender_type: 'agent'
          },
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Get last message
    const lastMessage = await SupportTicketMessage.findOne({
      where: { ticket_id: ticket.id },
      order: [['created_at', 'DESC']],
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'username']
      }]
    });

    res.json({
      success: true,
      data: {
        ticketId: `ticket_${ticket.id}`,
        ticketNumber: ticket.ticket_number,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        lastActivityAt: ticket.last_message_at || ticket.updated_at,
        assignedTo: ticket.assignee ? {
          id: ticket.assignee.id,
          name: ticket.assignee.username,
          avatar: null // You might want to add avatar to User model
        } : null,
        statusHistory: ticket.status_history.map(history => ({
          status: history.new_status,
          timestamp: history.created_at,
          actor: history.changed_by_user ? history.changed_by_user.username : history.changed_by_type
        })),
        estimatedResolution: ticket.resolved_at || 
          (ticket.status === 'open' ? 
            new Date(Date.now() + 24 * 60 * 60 * 1000) : // 24 hours from now
            null
          ),
        messagesCount: await SupportTicketMessage.count({ where: { ticket_id: ticket.id } }),
        lastMessage: lastMessage ? {
          id: `msg_${lastMessage.id}`,
          content: lastMessage.message,
          sender: lastMessage.sender ? lastMessage.sender.username : lastMessage.sender_name,
          timestamp: lastMessage.created_at
        } : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching ticket status:', error);
    next(error);
  }
};

// Get user's support tickets
const getUserTickets = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status, limit = 10, offset = 0 } = req.query;

    // Verify user exists and requester has permission
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build where clause
    const where = { user_id: userId };
    if (status) {
      where.status = status;
    }

    const { count, rows: tickets } = await SupportTicket.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id', 'ticket_number', 'subject', 'category', 'subcategory',
        'status', 'priority', 'created_at', 'updated_at',
        'last_message_at', 'has_unread'
      ]
    });

    // Get counts by status
    const statusCounts = await SupportTicket.findAll({
      where: { user_id: userId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
    const messageCount = await SupportTicketMessage.count({ where: { ticket_id: ticket.id } })

    const counts = {
      total: count,
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0
    };

    statusCounts.forEach(item => {
      counts[item.status] = parseInt(item.dataValues.count);
    });

    res.json({
      success: true,
      data: {
        tickets: tickets.map(ticket => ({
          id: `ticket_${ticket.id}`,
          ticketNumber: ticket.ticket_number,
          subject: ticket.subject,
          category: ticket.category,
          subcategory: ticket.subcategory,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.created_at,
          updatedAt: ticket.updated_at,
          lastMessageAt: ticket.last_message_at,
          messagesCount: messageCount,
          hasUnread: ticket.has_unread
        })),
        metadata: {
          ...counts,
          page: Math.floor(offset / limit) + 1,
          limit: parseInt(limit),
          hasMore: offset + tickets.length < count
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    next(error);
  }
};

// Mark FAQ as helpful/not helpful
const rateFAQ = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { faqId, helpful } = req.body;
    const userId = req.user?.id;
    const userIp = req.ip;
    const userAgent = req.get('User-Agent');

    // Extract numeric ID from faqId (format: faq_123)
    const numericId = faqId.replace('faq_', '');

    const faq = await FAQ.findByPk(numericId, { transaction });
    if (!faq) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    // Check if user has already rated this FAQ (by user ID or IP)
    const existingRating = await FAQRating.findOne({
      where: {
        faq_id: numericId,
        [Op.or]: [
          { user_id: userId },
          { user_ip: userIp, created_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
        ]
      },
      transaction
    });

    if (existingRating) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'You have already rated this FAQ'
      });
    }

    // Create rating
    await FAQRating.create({
      faq_id: numericId,
      user_id: userId,
      helpful: helpful,
      user_ip: userIp,
      user_agent: userAgent
    }, { transaction });

    // Update FAQ counts
    if (helpful) {
      await faq.increment('helpful_count', { by: 1, transaction });
    } else {
      await faq.increment('not_helpful_count', { by: 1, transaction });
    }

    // Recalculate popularity score
    const totalVotes = faq.helpful_count + faq.not_helpful_count + 1;
    const helpfulVotes = helpful ? faq.helpful_count + 1 : faq.helpful_count;
    const popularityScore = totalVotes > 0 ? (helpfulVotes / totalVotes) * 100 : 0;
    
    await faq.update({ popularity_score: popularityScore }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      data: {
        faqId: `faq_${faq.id}`,
        helpfulCount: helpful ? faq.helpful_count + 1 : faq.helpful_count,
        notHelpfulCount: !helpful ? faq.not_helpful_count + 1 : faq.not_helpful_count,
        userVote: helpful ? 'helpful' : 'not_helpful',
        hasVoted: true
      },
      message: 'Thank you for your feedback',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error rating FAQ:', error);
    next(error);
  }
};

// Get support channel availability
const getChannelAvailability = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    // Extract numeric ID from channelId (format: channel_123)
    const numericId = channelId.replace('channel_', '');

    const channel = await SupportChannel.findByPk(numericId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    // Simulate availability check (in real app, this would check actual availability)
    const isAvailable = channel.is_available && new Date().getHours() >= 9 && new Date().getHours() < 18;
    const availableAgents = isAvailable ? Math.floor(Math.random() * 10) + 1 : 0;
    const estimatedWaitTime = isAvailable ? `${Math.floor(Math.random() * 10) + 1} minutes` : 'Unavailable';

    res.json({
      success: true,
      data: {
        channelId: `channel_${channel.id}`,
        isAvailable,
        availableAgents,
        estimatedWaitTime,
        operatingHours: {
          timezone: 'UTC',
          schedule: [
            { day: 'Monday', open: '09:00', close: '18:00' },
            { day: 'Tuesday', open: '09:00', close: '18:00' },
            { day: 'Wednesday', open: '09:00', close: '18:00' },
            { day: 'Thursday', open: '09:00', close: '18:00' },
            { day: 'Friday', open: '09:00', close: '18:00' },
            { day: 'Saturday', open: '10:00', close: '16:00' },
            { day: 'Sunday', open: '10:00', close: '16:00' }
          ],
          is24_7: false
        },
        nextAvailableSlot: isAvailable ? null : new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // Next day
        maintenanceSchedule: null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking channel availability:', error);
    next(error);
  }
};

// Get popular/trending FAQs
const getPopularFAQs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const period = req.query.period || 'last_7_days';

    // Calculate date range based on period
    let dateRange;
    switch (period) {
      case 'last_24_hours':
        dateRange = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case 'last_7_days':
        dateRange = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30_days':
        dateRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateRange = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const faqs = await FAQ.findAll({
      where: {
        is_published: true,
        updated_at: { [Op.gte]: dateRange }
      },
      order: [
        ['popularity_score', 'DESC'],
        ['view_count', 'DESC']
      ],
      limit,
      include: [{
        model: FAQCategory,
        as: 'category',
        attributes: ['name', 'slug']
      }],
      attributes: [
        'id', 'question', 'answer', 'helpful_count', 
        'not_helpful_count', 'view_count', 'last_viewed_at',
        'popularity_score', 'created_at'
      ]
    });

    // Calculate total views for period (simplified)
    const totalViews = await FAQ.sum('view_count', {
      where: {
        updated_at: { [Op.gte]: dateRange }
      }
    });

    res.json({
      success: true,
      data: {
        faqs: faqs.map(faq => ({
          id: `faq_${faq.id}`,
          question: faq.question,
          answer: faq.answer.substring(0, 200) + (faq.answer.length > 200 ? '...' : ''),
          category: faq.category?.slug,
          subcategory: faq.subcategory,
          helpfulCount: faq.helpful_count,
          viewCount: faq.view_count,
          lastViewed: faq.last_viewed_at,
          trendingScore: faq.popularity_score / 100
        })),
        metadata: {
          period,
          totalViews: totalViews || 0,
          averageRating: faqs.length > 0 ? 
            faqs.reduce((sum, faq) => sum + (faq.popularity_score / 100), 0) / faqs.length : 0
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching popular FAQs:', error);
    next(error);
  }
};

// Upload attachment for support ticket
const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { ticketId } = req.body;
    const file = req.file;

    // Generate upload token
    const uploadToken = `attach_${crypto.randomBytes(16).toString('hex')}`;

    // Create attachment record
    const attachment = await SupportTicketAttachment.create({
      ticket_id: ticketId ? ticketId.replace('ticket_', '') : null,
      filename: file.filename,
      original_name: file.originalname,
      file_path: file.path,
      mime_type: file.mimetype,
      size: file.size,
      upload_token: uploadToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      uploaded_by: req.user?.id
    });

    res.json({
      success: true,
      data: {
        attachmentId: `attach_${attachment.id}`,
        filename: file.originalname,
        url: `/uploads/support/${file.filename}`,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: attachment.created_at,
        expiresAt: attachment.expires_at
      },
      message: 'File uploaded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    next(error);
  }
};

// Initialize live chat session
const initLiveChatSession = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      userId, name, email, department, issue, metadata
    } = req.body;

    // Generate session data
    const sessionId = generateSessionId();
    const chatToken = generateChatToken();
    const roomId = `room_${crypto.randomBytes(16).toString('hex')}`;

    // Get user info if logged in
    let user = null;
    if (userId) {
      user = await User.findByPk(userId, { transaction });
    }

    // Create chat session
    const session = await LiveChatSession.create({
      session_id: sessionId,
      user_id: user?.id,
      name: user?.username || name,
      email: user?.email || email,
      department: department || 'general',
      issue: issue || null,
      chat_token: chatToken,
      websocket_url: process.env.WEBSOCKET_URL || 'wss://chat.opentournament.com/ws',
      room_id: roomId,
      status: 'waiting',
      estimated_wait_time: '2 minutes',
      expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      metadata: {
        ...metadata,
        browser: req.useragent?.browser,
        os: req.useragent?.os,
        platform: req.useragent?.platform,
        pageUrl: metadata?.pageUrl || req.get('Referer')
      }
    }, { transaction });

    // In a real application, you would:
    // 1. Assign an available agent
    // 2. Create a support ticket for the chat
    // 3. Connect to your chat service

    // For now, simulate agent assignment
    const availableAgents = await User.findAll({
      where: {
        role: 'support_agent',
        is_online: true
      },
      limit: 1,
      transaction
    });

    let agent = null;
    if (availableAgents.length > 0) {
      agent = availableAgents[0];
      await session.update({
        agent_id: agent.id,
        status: 'active',
        started_at: new Date()
      }, { transaction });
    }

    await transaction.commit();

    res.json({
      success: true,
      data: {
        sessionId: session.session_id,
        agent: agent ? {
          id: `agent_${agent.id}`,
          name: agent.username,
          avatar: null, // Add avatar field to User model
          rating: 4.9,
          specialization: ['tournament', 'technical'] // This should come from agent profile
        } : null,
        estimatedWaitTime: agent ? null : '2 minutes',
        chatToken: session.chat_token,
        websocketUrl: session.websocket_url,
        roomId: session.room_id,
        expiresAt: session.expires_at
      },
      message: 'Chat session created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error initializing chat session:', error);
    next(error);
  }
};

module.exports = {
  getSupportData,
  getFAQsByCategory,
  submitSupportTicket,
  searchFAQs,
  getTicketStatus,
  getUserTickets,
  rateFAQ,
  getChannelAvailability,
  getPopularFAQs,
  uploadAttachment,
  initLiveChatSession
};