import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/ChatBot.css';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Scroll to bottom khi có tin nhắn mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load suggestions khi mở chatbot
  useEffect(() => {
    if (isOpen && suggestions.length === 0) {
      loadSuggestions();
    }
  }, [isOpen]);

  // Load các câu hỏi gợi ý
  const loadSuggestions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/chatbot/suggestions`);
      if (response.data.success) {
        setSuggestions(response.data.questions);
      }
    } catch (error) {
      console.error('Lỗi khi load suggestions:', error);
    }
  };

  // Gửi tin nhắn
  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Gửi tin nhắn kèm lịch sử hội thoại
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await axios.post(`${API_URL}/api/chatbot/message`, {
        message: messageText,
        conversationHistory,
      });

      setIsTyping(false);

      if (response.data.success) {
        const botMessage = {
          role: 'bot',
          content: response.data.message,
          timestamp: response.data.timestamp,
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const errorMessage = {
          role: 'bot',
          content: response.data.message || 'Xin lỗi, đã có lỗi xảy ra.',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      setIsTyping(false);
      console.error('Lỗi khi gửi tin nhắn:', error);
      
      const errorMessage = {
        role: 'bot',
        content: 'Xin lỗi, tôi không thể kết nối đến server. Vui lòng thử lại sau.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  // Xử lý khi nhấn Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  // Xử lý click suggestion
  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  // Format thời gian
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Toggle chatbot
  const toggleChatbot = () => {
    setIsOpen(!isOpen);
    
    // Thêm tin nhắn chào mừng khi mở lần đầu
    if (!isOpen && messages.length === 0) {
      const welcomeMessage = {
        role: 'bot',
        content: 'Xin chào! 👋 Tôi là trợ lý ảo của SuLi Coffee. Tôi có thể giúp gì cho bạn hôm nay?',
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  };

  return (
    <div className="chatbot-container">
      {/* Nút mở chatbot */}
      {!isOpen && (
        <button className="chatbot-button" onClick={toggleChatbot}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* Cửa sổ chat */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-content">
              <div className="chatbot-avatar">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="chatbot-header-text">
                <h3>SuLi Coffee Bot</h3>
                <p>Luôn sẵn sàng hỗ trợ bạn</p>
              </div>
            </div>
            <button className="chatbot-close" onClick={toggleChatbot}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.length === 0 ? (
              <div className="chatbot-welcome">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <h4>Chào mừng đến SuLi Coffee!</h4>
                <p>Hãy hỏi tôi bất cứ điều gì về quán cafe</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className={`chat-message ${message.role}`}>
                  <div className={`message-avatar ${message.role}`}>
                    {message.role === 'bot' ? (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    ) : (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="message-content">
                    <div className={`message-bubble ${message.role}`}>
                      {message.content}
                    </div>
                    <div className="message-time">{formatTime(message.timestamp)}</div>
                  </div>
                </div>
              ))
            )}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="chat-message bot">
                <div className="message-avatar bot">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && messages.length <= 1 && (
            <div className="chatbot-suggestions">
              <div className="suggestion-chips">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="suggestion-chip"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="chatbot-input-container">
            <input
              type="text"
              className="chatbot-input"
              placeholder="Nhập câu hỏi của bạn..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isTyping}
            />
            <button
              className="chatbot-send-btn"
              onClick={() => sendMessage(inputMessage)}
              disabled={isTyping || !inputMessage.trim()}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
