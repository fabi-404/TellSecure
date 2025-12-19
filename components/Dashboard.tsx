import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Inbox, AlertTriangle, Search, Tag, UserX, BarChart3, SendHorizontal, MessageSquare
} from 'lucide-react';
import { SubmissionResponse, CaseStatus } from '../types';

interface DashboardProps {
  submissions: SubmissionResponse[];
  onReply: (id: string, message: string, status?: CaseStatus) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ submissions, onReply }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'URGENT' | 'HIGH' | 'BUG'>('ALL');
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedSubmission = useMemo(() => 
    submissions.find(s => s.submission_id === selectedId), 
    [submissions, selectedId]
  );

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedSubmission?.history]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      if (filter === 'URGENT') return s.analysis.priority === 'Urgent';
      if (filter === 'HIGH') return s.analysis.priority === 'High' || s.analysis.priority === 'Urgent';
      if (filter === 'BUG') return s.analysis.intent === 'Bug Report';
      return true;
    }).sort((a, b) => new Date(b.timestamp || '').getTime() - new Date(a.timestamp || '').getTime());
  }, [submissions, filter]);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !replyText.trim()) return;

    onReply(selectedId, replyText, 'IN_REVIEW');
    setReplyText('');
  };

  // Helper for priority colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getSentimentColor = (score: number) => {
    if (score < -0.4) return 'text-red-500';
    if (score > 0.4) return 'text-emerald-500';
    return 'text-slate-400';
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
    <div className="h-[calc(100vh-64px)] flex bg-slate-50 overflow-hidden">
      {/* Sidebar List */}
      <div className="w-1/3 min-w-[320px] max-w-md bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="flex space-x-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            <button 
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All Inbox
            </button>
            <button 
              onClick={() => setFilter('URGENT')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === 'URGENT' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
            >
              Urgent
            </button>
             <button 
              onClick={() => setFilter('BUG')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === 'BUG' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
            >
              Bugs
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search subjects..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredSubmissions.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Inbox className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No submissions found</p>
            </div>
          ) : (
            filteredSubmissions.map((sub) => (
              <div 
                key={sub.submission_id}
                onClick={() => setSelectedId(sub.submission_id)}
                className={`p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 ${selectedId === sub.submission_id ? 'bg-indigo-50/50 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${getPriorityColor(sub.analysis.priority)}`}>
                      {sub.analysis.priority}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full w-2 h-2 ${sub.status === 'RECEIVED' ? 'bg-blue-500' : 'bg-transparent'}`}></span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {sub.timestamp ? new Date(sub.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                  </span>
                </div>
                <h4 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-1">{sub.content.subject_line}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{sub.admin_preview}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Detail View */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
        {selectedSubmission ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">{selectedSubmission.content.subject_line}</h1>
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      <UserX className="w-3 h-3 mr-1" />
                      Anonymous User
                    </span>
                    <span className="text-xs text-slate-400">ID: {selectedSubmission.submission_id}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(selectedSubmission.status)}`}>
                    {selectedSubmission.status.replace('_', ' ')}
                  </span>
                  <div className="flex items-center space-x-1 text-xs font-medium">
                     <span className="text-slate-400">Sentiment:</span>
                     <BarChart3 className={`w-4 h-4 ${getSentimentColor(selectedSubmission.analysis.sentiment_score)}`} />
                     <span className={`${getSentimentColor(selectedSubmission.analysis.sentiment_score)}`}>
                       {selectedSubmission.analysis.sentiment_score > 0 ? '+' : ''}{selectedSubmission.analysis.sentiment_score}
                     </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedSubmission.content.topics.map(topic => (
                  <span key={topic} className="flex items-center text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                    <Tag className="w-3 h-3 mr-1" />
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                 <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">AI Analysis</h3>
                 <div className="space-y-4">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-sm text-slate-600">Intent</span>
                      <span className="text-sm font-medium text-slate-900">{selectedSubmission.analysis.intent}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-sm text-slate-600">Dev Intervention</span>
                      <span className={`text-sm font-medium ${selectedSubmission.analysis.requires_developer_intervention ? 'text-red-600 flex items-center' : 'text-slate-900'}`}>
                         {selectedSubmission.analysis.requires_developer_intervention ? <><AlertTriangle className="w-3 h-3 mr-1"/> Required</> : 'Not Required'}
                      </span>
                    </div>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                 <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Executive Summary</h3>
                 <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 leading-relaxed border border-slate-100">
                    {selectedSubmission.content.summary}
                 </div>
              </div>
            </div>

            {/* Case History & Reply */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
               <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                 <h3 className="text-sm font-semibold text-slate-700 flex items-center">
                   <MessageSquare className="w-4 h-4 mr-2" />
                   Case History & Communication
                 </h3>
               </div>
               
               {/* Messages Area */}
               <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                 {selectedSubmission.history.map((msg) => (
                   <div key={msg.id} className={`flex flex-col ${msg.sender === 'ADMIN' ? 'items-end' : 'items-start'}`}>
                     <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                       msg.sender === 'ADMIN' 
                         ? 'bg-indigo-600 text-white rounded-tr-none' 
                         : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                     }`}>
                       <p className="whitespace-pre-wrap">{msg.message}</p>
                     </div>
                     <span className="text-[10px] text-slate-400 mt-1 px-1">
                       {msg.sender === 'ADMIN' ? 'Admin' : 'Anonymous User'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </span>
                   </div>
                 ))}
                 <div ref={messagesEndRef} />
               </div>

               {/* Reply Box */}
               <div className="p-4 bg-white border-t border-slate-200">
                 <form onSubmit={handleSendReply} className="flex gap-3">
                   <input
                     type="text"
                     value={replyText}
                     onChange={(e) => setReplyText(e.target.value)}
                     placeholder="Type a reply to the user..."
                     className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   />
                   <button 
                    type="submit"
                    disabled={!replyText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                   >
                     <SendHorizontal className="w-4 h-4" />
                   </button>
                 </form>
               </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
            <Inbox className="w-24 h-24 mb-4 stroke-1" />
            <p className="text-lg">Select a submission to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};