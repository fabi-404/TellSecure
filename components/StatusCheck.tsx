import React, { useState, useRef, useEffect } from 'react';
import { Search, Lock, AlertCircle, CheckCircle2, Clock, MessageSquare, SendHorizontal, Loader2, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { SubmissionResponse, CaseStatus } from '../types';
import { api } from '../lib/api';
import { uploadFile } from '../lib/storage';

interface StatusCheckProps {
  submissions: SubmissionResponse[];
  onReply: (id: string, message: string) => void;
  tenantId: string | null;
}

interface AttachedFile {
  name: string;
  data: string;
  mimeType: string;
  fileObject: File;
}

export const StatusCheck: React.FC<StatusCheckProps> = ({ submissions, onReply, tenantId }) => {
  const [caseId, setCaseId] = useState('');
  const [password, setPassword] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fetchedSubmission, setFetchedSubmission] = useState<SubmissionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  
  // File upload state
  const [file, setFile] = useState<AttachedFile | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine which submission object to use: from props (cached) or fetched directly
  const activeSubmission = submissions.find(s => s.submission_id === activeId) || 
                           (fetchedSubmission?.submission_id === activeId ? fetchedSubmission : null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (activeSubmission && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSubmission?.history]);

  const mapDbReportToSubmission = (report: any): SubmissionResponse => {
    let richData: any = {};
    try {
      richData = report.description; // Assume already parsed or object
      if (typeof richData === 'string') richData = JSON.parse(richData);
    } catch (e) {
      richData = { 
        original_message: typeof report.description === 'string' ? report.description : '', 
        history: [] 
      };
    }

    return {
      submission_id: report.reportKey,
      access_password: report.passwordHash,
      content: {
        subject_line: richData.subject_line || 'Untitled Report',
        original_message: richData.original_message || '',
        summary: richData.summary || 'No summary available.',
        topics: richData.topics || []
      },
      analysis: {
        intent: report.category as any,
        priority: report.priority as any,
        sentiment_score: richData.sentiment_score || 0,
        requires_developer_intervention: richData.requires_developer_intervention || false
      },
      admin_preview: richData.admin_preview || '',
      timestamp: report.createdAt,
      status: report.status as CaseStatus,
      history: richData.history || []
    };
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setActiveId(null);
    setFetchedSubmission(null);

    const trimmedCaseId = caseId.trim();
    const trimmedPassword = password.trim().toUpperCase();

    if (!trimmedCaseId || !trimmedPassword) {
      setError('Please enter both Case ID and Password');
      return;
    }

    // 1. Try finding in local props (if app hasn't been reloaded)
    const localFound = submissions.find(
      s => s.submission_id === trimmedCaseId && s.access_password === trimmedPassword
    );

    if (localFound) {
      setActiveId(localFound.submission_id);
      return;
    }

    // 2. If not found locally, fetch directly from API
    setIsLoading(true);
    try {
      const report = await api.reports.getByKey(trimmedCaseId, trimmedPassword);

      if (!report) {
        setError('Case not found or invalid credentials.');
      } else {
        const mapped = mapDbReportToSubmission(report);
        setFetchedSubmission(mapped);
        setActiveId(mapped.submission_id);
      }
    } catch (err) {
      console.error('Lookup error:', err);
      setError('An unexpected error occurred during lookup.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      alert("File is too large. Max 5MB allowed.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      setFile({
        name: selectedFile.name,
        data: base64Data,
        mimeType: selectedFile.type,
        fileObject: selectedFile
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateRemoteHistory = async (sub: SubmissionResponse, newMessage: any) => {
    const updatedHistory = [...(sub.history || []), newMessage];
    
    const richData = {
      subject_line: sub.content.subject_line,
      original_message: sub.content.original_message,
      summary: sub.content.summary,
      topics: sub.content.topics,
      sentiment_score: sub.analysis.sentiment_score,
      requires_developer_intervention: sub.analysis.requires_developer_intervention,
      admin_preview: sub.admin_preview,
      history: updatedHistory
    };

    try {
        await api.reports.update(sub.submission_id, {
            description: richData,
            status: 'ACTION_REQUIRED'
        });
        return updatedHistory;
    } catch(err) {
        console.error("Failed to update history:", err);
        alert("Failed to send reply. Please try again.");
        return null;
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || (!replyText.trim() && !file) || !activeSubmission) return;

    setIsSending(true);

    try {
      let messageContent = replyText;
      
      // Upload file if exists
      if (file) {
        const attachmentUrl = await uploadFile(file.fileObject);
        messageContent = messageContent 
          ? `${messageContent}\n\n[Attachment: ${attachmentUrl}]` 
          : `[Attachment: ${attachmentUrl}]`;
      }

      setReplyText('');
      clearFile();

      const isLocal = submissions.some(s => s.submission_id === activeId);

      if (isLocal) {
        onReply(activeId, messageContent);
      } else {
        const newMessage = {
          id: Math.random().toString(36).substr(2, 9),
          sender: 'USER' as const,
          message: messageContent,
          timestamp: new Date().toISOString()
        };

        const updatedSubmission = {
          ...activeSubmission,
          history: [...activeSubmission.history, newMessage],
          status: 'ACTION_REQUIRED' as CaseStatus
        };
        setFetchedSubmission(updatedSubmission);
        await updateRemoteHistory(activeSubmission, newMessage);
      }
    } catch (err) {
      console.error("Error sending reply:", err);
      alert("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IN_REVIEW': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'RESOLVED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'ACTION_REQUIRED': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-lg mb-8 mt-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Case Tracker</h2>
          <p className="text-slate-500 mt-2">Enter your anonymous credentials to view case progress.</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleCheck} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Case ID</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    maxLength={10}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="e.g. 550E8400A1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Access Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none uppercase placeholder:normal-case"
                    placeholder="e.g. X7K9P2M"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center shadow-sm"
              >
                {isLoading ? (
                   <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Searching...
                   </>
                ) : (
                   "Find Case"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Result Section */}
      {activeSubmission && (
        <div className="w-full max-w-2xl animate-in slide-in-from-bottom-4 duration-300">
           {/* Case Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex items-center space-x-2 text-emerald-600 mb-4 pb-4 border-b border-slate-100">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-bold text-lg">Case Found</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</h4>
                  <p className="text-slate-900 font-medium text-lg">{activeSubmission.content.subject_line}</p>
                </div>
                <div>
                   <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(activeSubmission.status)}`}>
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center">
                 <MessageSquare className="w-5 h-5 text-slate-500 mr-2" />
                 <h3 className="font-semibold text-slate-900">Encrypted History</h3>
             </div>
             <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto bg-slate-50/50">
                {activeSubmission.history && activeSubmission.history.length > 0 ? (
                  activeSubmission.history.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm shadow-sm border ${
                        msg.sender === 'USER' 
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-100 rounded-tr-none' 
                          : 'bg-white text-slate-800 border-slate-200 rounded-tl-none'
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
               {/* File Preview */}
               {file && (
                 <div className="flex items-center justify-between p-2 mb-3 bg-slate-50 border border-slate-200 rounded-lg max-w-md">
                   <div className="flex items-center space-x-3 overflow-hidden">
                     {file.mimeType.includes('pdf') ? (
                       <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                     ) : (
                       <ImageIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                     )}
                     <span className="text-xs text-slate-900 font-medium truncate">{file.name}</span>
                   </div>
                   <button
                     type="button"
                     onClick={clearFile}
                     className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
                   >
                     <X className="w-3 h-3" />
                   </button>
                 </div>
               )}

               <form onSubmit={handleSendReply} className="flex gap-3">
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange} 
                    accept="image/*,application/pdf"
                 />
                 <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending}
                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                    title="Attach file"
                 >
                    <Paperclip className="w-5 h-5" />
                 </button>

                 <input
                   type="text"
                   value={replyText}
                   onChange={(e) => setReplyText(e.target.value)}
                   placeholder="Type your reply..."
                   disabled={isSending}
                   className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50"
                 />
                 <button 
                  type="submit"
                  disabled={isSending || (!replyText.trim() && !file)}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center shadow-sm min-w-[3rem] justify-center"
                 >
                   {isSending ? (
                     <Loader2 className="w-4 h-4 animate-spin" />
                   ) : (
                     <SendHorizontal className="w-4 h-4" />
                   )}
                 </button>
               </form>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};