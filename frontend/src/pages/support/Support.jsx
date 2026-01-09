// Support.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
//import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../contexts/ChatContext';
import ChatService from '../../services/chatService';
import ChatWindow from '../../components/chat/ChatWindow';
import ContactForm from '../../components/support/ContactForm'; // Import the ContactForm component
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  MessageCircle,
  HelpCircle,
  Clock,
  Shield,
  ArrowRight,
  X,
  MessageSquare,
  ChevronRight,
  Star,
} from 'lucide-react';

// Support agent data (can be fetched from API in the future)
const SUPPORT_AGENTS = [
  {
    id: 'support-agent-1',
    name: 'Alex Johnson',
    role: 'Senior Support Specialist',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    status: 'online',
    expertise: ['Technical Issues', 'Account Problems', 'Billing'],
    rating: 4.9,
    responseTime: '2-5 minutes'
  },
  {
    id: 'support-agent-2',
    name: 'Sam Davis',
    role: 'Customer Success Manager',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam',
    status: 'online',
    expertise: ['Feature Questions', 'Onboarding', 'Best Practices'],
    rating: 4.8,
    responseTime: '5-10 minutes'
  },
  {
    id: 'support-agent-3',
    name: 'Taylor Smith',
    role: 'Technical Support',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor',
    status: 'away',
    expertise: ['Bug Reports', 'API Issues', 'Integration'],
    rating: 4.7,
    responseTime: '10-15 minutes'
  }
];

export default function Support() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
 // const { isDarkMode } = useTheme();
  const {
    currentChannel,
    setCurrentChannel,
    isConnected,
    clearError: clearChatError,
  } = useChat();

  // State
  const [showChatModal, setShowChatModal] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [supportChannel, setSupportChannel] = useState(null);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [showAgentSelection, setShowAgentSelection] = useState(false);

  // Filter available agents
  useEffect(() => {
    const onlineAgents = SUPPORT_AGENTS.filter(agent => agent.status === 'online');
    setAvailableAgents(onlineAgents);
    if (onlineAgents.length > 0 && !selectedAgent) {
      setSelectedAgent(onlineAgents[0]);
    }
  }, []);

  // Load user's existing support channels
  useEffect(() => {
    const loadSupportChannels = async () => {
      try {
        const response = await ChatService.getChannels({
          type: 'direct',
          search: 'Support'
        });
        
        const channels = response.data?.channels || response.channels || response;
        const supportChannels = channels.filter(channel => 
          channel.name?.includes('Support') || 
          channel.description?.includes('support')
        );
        
        if (supportChannels.length > 0) {
          setChatHistory(supportChannels);
          // Automatically select the most recent support channel
          const mostRecent = supportChannels.sort((a, b) => 
            new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
          )[0];
          setSupportChannel(mostRecent);
        }
      } catch (error) {
        console.error('Failed to load support channels:', error);
      }
    };

    if (authUser) {
      loadSupportChannels();
    }
  }, [authUser]);

  // Handle contact form submission
  const handleContactFormSubmit = async (formData) => {
    // In a real application, you would send this data to your backend API
    console.log('Contact form submitted:', formData);
    
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Support ticket created:', {
          ...formData,
          userId: authUser?.id,
          timestamp: new Date().toISOString(),
          status: 'open'
        });
        resolve();
      }, 1500);
    });
  };

  // Create support chat channel
  const createSupportChat = useCallback(async (agentId = null) => {
    if (!authUser) {
      alert('Please login to start a live chat');
      navigate('/login');
      return;
    }

    try {
      setIsCreatingChat(true);
      clearChatError();

      let channelName = 'Support Chat';
      let participantIds = [];

      // If agent is specified, create direct chat with that agent
      if (agentId) {
        const agent = SUPPORT_AGENTS.find(a => a.id === agentId);
        channelName = `Support with ${agent?.name || 'Agent'}`;
        // In a real app, you would use actual agent user IDs
        participantIds = [agentId]; // This would be the agent's user ID
      } else {
        // Create a support channel with default settings
        channelName = `Support Request - ${new Date().toLocaleDateString()}`;
        // In a real app, you might add multiple support agents
      }

      // Check if similar channel already exists
      const existingChannels = await ChatService.getChannels({
        search: 'Support',
        type: 'direct'
      });

      const channels = existingChannels.data?.channels || existingChannels.channels || existingChannels;
      const existingChannel = channels.find(channel => 
        channel.name.includes('Support') && 
        channel.members?.some(m => m.id === authUser.id)
      );

      let channel;
      if (existingChannel) {
        // Use existing support channel
        channel = existingChannel;
      } else {
        // Create new support channel
        const channelData = {
          name: channelName,
          description: 'Support chat for customer assistance',
          type: 'direct',
          isPrivate: true,
          participantIds: participantIds,
          tags: ['support', 'help']
        };

        const response = await ChatService.createChannel(channelData);
        channel = response.data?.channel || response.channel || response;
      }

      // Set as current channel
      setSupportChannel(channel);
      setCurrentChannel(channel);
      setShowChatModal(true);

      // Add to chat history
      setChatHistory(prev => {
        const exists = prev.some(c => c.id === channel.id);
        if (!exists) {
          return [channel, ...prev];
        }
        return prev;
      });

    } catch (error) {
      console.error('Failed to create support chat:', error);
      alert('Failed to start live chat. Please try again.');
    } finally {
      setIsCreatingChat(false);
    }
  }, [authUser, navigate, clearChatError, setCurrentChannel]);

  // Handle quick chat with specific agent
  const handleQuickChat = useCallback((agentId) => {
    setSelectedAgent(SUPPORT_AGENTS.find(a => a.id === agentId));
    createSupportChat(agentId);
  }, [createSupportChat]);

  // Handle continue existing chat
  const handleContinueChat = useCallback((channel) => {
    setSupportChannel(channel);
    setCurrentChannel(channel);
    setShowChatModal(true);
  }, [setCurrentChannel]);

  // Close chat modal
  const handleCloseChat = useCallback(() => {
    setShowChatModal(false);
    setCurrentChannel(null);
  }, [setCurrentChannel]);

  // Render agent selection
  const renderAgentSelection = useCallback(() => {
    if (!showAgentSelection) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold dark:text-gray-100">Choose Support Agent</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Select an agent based on your issue
                </p>
              </div>
              <button
                onClick={() => setShowAgentSelection(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {SUPPORT_AGENTS.map((agent) => (
                <div
                  key={agent.id}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] ${
                    selectedAgent?.id === agent.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                  }`}
                  onClick={() => {
                    setSelectedAgent(agent);
                    setShowAgentSelection(false);
                    handleQuickChat(agent.id);
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <img
                        src={agent.avatar}
                        alt={agent.name}
                        className="w-14 h-14 rounded-full border-2 border-white dark:border-gray-800"
                      />
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${
                        agent.status === 'online'
                          ? 'bg-green-500 border-white dark:border-gray-800'
                          : agent.status === 'away'
                          ? 'bg-yellow-500 border-white dark:border-gray-800'
                          : 'bg-gray-400 border-white dark:border-gray-800'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold dark:text-gray-100">{agent.name}</h4>
                        <div className="flex items-center space-x-1 text-sm">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="dark:text-gray-300">{agent.rating}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{agent.role}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ⚡ {agent.responseTime} response time
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {agent.expertise.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowAgentSelection(false);
                  createSupportChat();
                }}
                className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Start General Support Chat</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }, [showAgentSelection, selectedAgent, handleQuickChat, createSupportChat]);

  // Render chat history
  const renderChatHistory = useCallback(() => {
    if (chatHistory.length === 0) return null;

    return (
      <div className="p-4 rounded-xl bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold dark:text-gray-100">Previous Support Chats</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {chatHistory.length} chat{chatHistory.length > 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="space-y-3">
          {chatHistory.slice(0, 3).map((chat) => (
            <div
              key={chat.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer group"
              onClick={() => handleContinueChat(chat)}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium dark:text-gray-100">{chat.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(chat.updatedAt || chat.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
          ))}
        </div>
      </div>
    );
  }, [chatHistory, handleContinueChat]);

  // Render live chat modal
  const renderChatModal = useCallback(() => {
    if (!showChatModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <MessageCircle className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold dark:text-gray-100">Live Support Chat</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isConnected ? 'Connected to support team' : 'Connecting...'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium">Live Support</span>
              </div>
              
              <button
                onClick={handleCloseChat}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          {/* Chat Window */}
          <div className="flex-1 min-h-0">
            <ChatWindow 
              channel={supportChannel || currentChannel}
              customTitle="Support Chat"
              showChannelInfo={false}
            />
          </div>
          
          {/* Quick Actions Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>End-to-end encrypted</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Typically replies in 2-5 minutes</span>
                </div>
              </div>
              <button
                onClick={() => {
                  // Option to email transcript
                  console.log('Email chat transcript');
                }}
                className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Email transcript
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }, [showChatModal, supportChannel, currentChannel, isConnected, handleCloseChat]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-6">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 dark:text-gray-100">How can we help you?</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Get instant help through live chat or submit a detailed ticket. 
            We're here to help you 24/7.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Contact Form */}
          <div>
            <ContactForm 
              onSubmit={handleContactFormSubmit}
              initialCategory="general"
              showPriority={true}
            />
          </div>

          {/* Right Column: Live Chat & Additional Info */}
          <div className="space-y-6">
            {/* Live Chat Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2 dark:text-gray-100">Live Chat Support</h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    Get instant help from our support agents
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10">
                  <MessageCircle className="w-6 h-6 text-green-500" />
                </div>
              </div>

              {/* Online Agents */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold dark:text-gray-100">Available Agents</h3>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                    {availableAgents.length} online now
                  </span>
                </div>
                
                <div className="space-y-4">
                  {availableAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer group"
                      onClick={() => handleQuickChat(agent.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <img
                            src={agent.avatar}
                            alt={agent.name}
                            className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-800"
                          />
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 bg-green-500"></div>
                        </div>
                        <div>
                          <h4 className="font-medium dark:text-gray-100">{agent.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{agent.role}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickChat(agent.id);
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Chat Now</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Start Chat */}
              <div className="mb-6">
                <button
                  onClick={() => setShowAgentSelection(true)}
                  disabled={isCreatingChat}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center space-x-3 transition-all ${
                    isCreatingChat
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100'
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isCreatingChat ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Starting Chat...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5" />
                      <span>Start Live Chat</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
                  Typically connects in under 30 seconds
                </p>
              </div>

              {/* Quick Info */}
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-medium dark:text-gray-100">Chat Hours</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      24/7 availability. Average response time: 2-5 minutes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat History */}
            {renderChatHistory()}
          </div>
        </div>

        {/* Agent Selection Modal */}
        {renderAgentSelection()}

        {/* Live Chat Modal */}
        {renderChatModal()}
      </div>
    </div>
  );
}