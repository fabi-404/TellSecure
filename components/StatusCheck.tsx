import React, { useState, useRef, useEffect } from 'react';
import { Search, Lock, AlertCircle, CheckCircle2, Clock, MessageSquare, SendHorizontal } from 'lucide-react';
import { SubmissionResponse } from '../types';

interface StatusCheckProps {
  submissions: SubmissionResponse[];
  onReply: (id: string, message: string) => void;
}

export const StatusCheck: React.FC<StatusCheckProps> = ({ submissions, onReply }) => {
  const [caseId, setCaseId] = useState('');
  const [password, setPassword] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derived active submission from props to ensure reactivity
  const activeSubmission = submissions.find(s => s.submission_id === activeId);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (activeSubmission && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSubmission?.history]);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setActiveId(null);

    if (!caseId.trim() || !password.trim()) {
      setError('Please enter both Case ID and Password');
      return;
    }

    const found = submissions.find(
      s => s.submission_id === caseId.trim() && s.access_password === password.trim().toUpperCase()
    );

    if (found) {
      setActiveId(found.submission_id);
    } else {
      setError('Invalid Case ID or Password.');
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !replyText.trim()) return;
    
    onReply(activeId, replyText);
    setReplyText('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED': return 'bg-blue-100 text-blue-800';
      case 'IN_REVIEW': return 'bg-purple-100 text-purple-800';
      case 'RESOLVED': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-lg mb-8 mt-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Check Status</h2>
          <p className="text-slate-500 mt-2">Enter your anonymous credentials to view case progress.</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleCheck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Case ID</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. 550e8400..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Access Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none uppercase placeholder:normal-case"
                    placeholder="e.g. X7K9P2M"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Find Case
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Result Section */}
      {activeSubmission && (
        <div className="w-full max-w-2xl animate-in slide-in-from-bottom-4 duration-300">
           {/* Case Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-md p-6 mb-6">
            <div className="flex items-center space-x-2 text-emerald-600 mb-4 pb-4 border-b border-slate-100">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-bold text-lg">Case Found</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</h4>
                  <p className="text-slate-800 font-medium text-lg">{activeSubmission.content.subject_line}</p>
                </div>
                <div>
                   <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(activeSubmission.status)}`}>
                      {activeSubmission.status.replace('_', ' ')}
                   </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Case ID</h4>
                    <p className="text-slate-800 font-mono text-sm">{activeSubmission.submission_id}</p>
                 </div>
                 <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Last Update</h4>
                    <div className="flex items-center text-slate-600 text-sm">
                      <Clock className="w-4 h-4 mr-1.5" />
                      {activeSubmission.timestamp ? new Date(activeSubmission.timestamp).toLocaleString() : 'Just now'}
                    </div>
                 </div>
              </div>
            </div>
          </div>

          {/* Conversation History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
             <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center">
                 <MessageSquare className="w-5 h-5 text-slate-500 mr-2" />
                 <h3 className="font-semibold text-slate-800">Case History</h3>
             </div>
             <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto bg-slate-50/30">
                {activeSubmission.history && activeSubmission.history.length > 0 ? (
                  activeSubmission.history.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm shadow-sm ${
                        msg.sender === 'USER' 
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-tr-none' 
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                      }`}>
                         <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1.5 px-1 font-medium">
                        {msg.sender === 'USER' ? 'You' : 'Admin Response'} • {new Date(msg.timestamp).toLocaleString([], {month:'short', day:'numeric', hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    No history available.
                  </div>
                )}
                <div ref={messagesEndRef} />
             </div>

             {/* Reply Area */}
             <div className="p-4 bg-white border-t border-slate-200">
               <form onSubmit={handleSendReply} className="flex gap-3">
                 <input
                   type="text"
                   value={replyText}
                   onChange={(e) => setReplyText(e.target.value)}
                   placeholder="Type your reply..."
                   className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                 />
                 <button 
                  type="submit"
                  disabled={!replyText.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center shadow-sm"
                 >
                   <SendHorizontal className="w-4 h-4" />
                 </button>
               </form>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};