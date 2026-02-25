import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, AlertCircle } from 'lucide-react';

export default function AIChatSidebar({ isOpen, onClose }) {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hello! I\'m your AI assistant. Ask me about claims, PA rules, NHIA regulations, or any HMO processes.',
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [persona, setPersona] = useState('staff');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    persona: persona,
                }),
            });

            const data = await response.json();
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.message || 'Sorry, I encountered an error.',
            }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'I apologize, but the AI service is currently unavailable. Please try again later.',
            }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="position-fixed top-0 end-0 h-100 bg-white shadow-lg d-flex flex-column"
             style={{ width: 400, zIndex: 1060, borderLeft: '1px solid #dee2e6' }}>

            {/* Header */}
            <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
                <div className="d-flex align-items-center gap-2">
                    <Bot size={20} className="text-primary" />
                    <h6 className="mb-0 fw-bold">AI Assistant</h6>
                </div>
                <button className="btn btn-sm btn-light" onClick={onClose}>
                    <X size={16} />
                </button>
            </div>

            {/* Persona Selector */}
            <div className="px-3 py-2 border-bottom bg-light">
                <select
                    className="form-select form-select-sm"
                    value={persona}
                    onChange={(e) => setPersona(e.target.value)}
                >
                    <option value="staff">Staff Mode (Claims/PA/NHIA)</option>
                    <option value="enrollee">HealthBot (Member-facing)</option>
                    <option value="finance">Finance Mode (Capitation/Batches)</option>
                </select>
            </div>

            {/* Messages */}
            <div className="flex-grow-1 p-3 overflow-auto" style={{ backgroundColor: '#f8f9fa' }}>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="me-2">
                                <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center"
                                     style={{ width: 28, height: 28 }}>
                                    <Bot size={14} className="text-white" />
                                </div>
                            </div>
                        )}
                        <div className={`p-2 rounded-3 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-white border'}`}
                             style={{ maxWidth: '80%', wordBreak: 'break-word' }}>
                            {msg.content}
                        </div>
                        {msg.role === 'user' && (
                            <div className="ms-2">
                                <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center"
                                     style={{ width: 28, height: 28 }}>
                                    <User size={14} className="text-white" />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                
                {loading && (
                    <div className="d-flex justify-content-start mb-3">
                        <div className="me-2">
                            <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center"
                                 style={{ width: 28, height: 28 }}>
                                <Bot size={14} className="text-white" />
                            </div>
                        </div>
                        <div className="p-2 bg-white border rounded-3">
                            <span className="spinner-border spinner-border-sm me-2" />Thinking...
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-top">
                <div className="input-group">
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Ask about claims, PA rules, NHIA..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        disabled={loading}
                    />
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                    >
                        <Send size={14} />
                    </button>
                </div>
                <small className="text-muted d-block mt-2">
                    <AlertCircle size={10} className="me-1" />
                    AI responses are generated and may not always be accurate. Verify important information.
                </small>
            </div>
        </div>
    );
}