import React, { useState, useEffect } from 'react';
import { ContactForm } from './components/ContactForm';
import { Dashboard } from './components/Dashboard';
import { LoginScreen } from './components/LoginScreen';
import { StatusCheck } from './components/StatusCheck';
import { SubmissionResponse, View, CaseStatus } from './types';
import { LayoutGrid, MessageSquarePlus, LogOut, SearchCheck, Loader2, DatabaseZap } from 'lucide-react';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.FORM);
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  // Initialize Tenant and Fetch Data
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      setDbError(null);
      try {
        // 1. Get Tenant (use the first one found)
        const { data: tenants, error: tenantError } = await supabase
          .from('tenants')
          .select('id')
          .limit(1);
        
        if (tenantError) {
          // If the table doesn't exist or RLS blocks it, or connection fails
          console.error('Supabase Tenant Error:', tenantError.message, tenantError.details);
          setDbError(tenantError.message);
        } else {
          const currentTenantId = tenants?.[0]?.id;
          setTenantId(currentTenantId);

          if (currentTenantId) {
            // 2. Fetch Reports
            await fetchReports(currentTenantId);
          } else {
            console.warn("No tenants found in database. Please create a tenant record.");
          }
        }
      } catch (error: any) {
        console.error('Initialization Exception:', error);
        setDbError(error?.message || 'Unknown initialization error');
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  const fetchReports = async (tId: string) => {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('tenant_id', tId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error.message);
      return;
    }

    // Map Supabase 'reports' to 'SubmissionResponse'
    // We store rich data (history, content, analysis extras) as JSON string in 'description'
    const mappedSubmissions: SubmissionResponse[] = (data || []).map((report: any) => {
      let richData: any = {};
      try {
        richData = JSON.parse(report.description || '{}');
      } catch (e) {
        // Fallback if description is just text
        richData = { 
          original_message: report.description,
          history: [] 
        };
      }

      return {
        submission_id: report.report_key,
        access_password: report.password_hash,
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
        timestamp: report.created_at,
        status: report.status as CaseStatus,
        history: richData.history || []
      };
    });

    setSubmissions(mappedSubmissions);
  };

  const handleSubmission = async (data: SubmissionResponse) => {
    // If no tenantId is available (offline mode), we store in local state only
    if (!tenantId) {
      console.warn("Offline Mode: Database unavailable. Submission stored locally.");
      setSubmissions(prev => [data, ...prev]);
      return;
    }

    // Prepare JSON blob for description column
    const richData = {
      subject_line: data.content.subject_line,
      original_message: data.content.original_message,
      summary: data.content.summary,
      topics: data.content.topics,
      sentiment_score: data.analysis.sentiment_score,
      requires_developer_intervention: data.analysis.requires_developer_intervention,
      admin_preview: data.admin_preview,
      history: data.history
    };

    const { error } = await supabase.from('reports').insert({
      tenant_id: tenantId,
      report_key: data.submission_id,
      password_hash: data.access_password, // In a real app, hash this!
      category: data.analysis.intent,
      priority: data.analysis.priority,
      status: data.status,
      description: JSON.stringify(richData),
      is_encrypted: false, // Defaulting for now
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error("Error saving submission:", error);
      // Fallback: Show in UI anyway so user doesn't think it failed completely
      setSubmissions(prev => [data, ...prev]);
      alert(`Note: Submission processed but could not be saved to the database. Error: ${error.message}`);
    } else {
      // Optimistic update
      setSubmissions(prev => [data, ...prev]);
    }
  };

  const updateReportHistory = async (submissionId: string, newMessage: any, newStatus?: string) => {
    // Update local state first (optimistic)
    const updatedHistory = submissions.find(s => s.submission_id === submissionId)?.history 
      ? [...(submissions.find(s => s.submission_id === submissionId)?.history || []), newMessage]
      : [newMessage];

    setSubmissions(prev => prev.map(sub => {
      if (sub.submission_id === submissionId) {
        return {
          ...sub,
          status: (newStatus as CaseStatus) || sub.status,
          history: updatedHistory
        };
      }
      return sub;
    }));

    if (!tenantId) return;

    const submission = submissions.find(s => s.submission_id === submissionId);
    if (!submission) return;

    // Re-pack rich data
    const richData = {
      subject_line: submission.content.subject_line,
      original_message: submission.content.original_message,
      summary: submission.content.summary,
      topics: submission.content.topics,
      sentiment_score: submission.analysis.sentiment_score,
      requires_developer_intervention: submission.analysis.requires_developer_intervention,
      admin_preview: submission.admin_preview,
      history: updatedHistory
    };

    const updatePayload: any = {
      description: JSON.stringify(richData)
    };
    if (newStatus) updatePayload.status = newStatus;

    const { error } = await supabase
      .from('reports')
      .update(updatePayload)
      .eq('report_key', submissionId);

    if (error) {
      console.error("Error updating report in DB:", error);
    }
  };

  const handleReply = (submissionId: string, message: string, newStatus?: CaseStatus) => {
    const newMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'ADMIN',
      message: message,
      timestamp: new Date().toISOString()
    };
    updateReportHistory(submissionId, newMessage, newStatus || 'IN_REVIEW');
  };

  const handleUserReply = (submissionId: string, message: string) => {
    const newMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'USER',
      message: message,
      timestamp: new Date().toISOString()
    };
    updateReportHistory(submissionId, newMessage, 'ACTION_REQUIRED');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setView(View.FORM);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Connecting to Secure Database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-lg">S</span>
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-900">SilentDrop</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => setView(View.FORM)}
                className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  view === View.FORM 
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <MessageSquarePlus className="w-4 h-4 mr-2 hidden sm:block" />
                Submit
              </button>

              <button
                onClick={() => setView(View.CHECK_STATUS)}
                className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  view === View.CHECK_STATUS 
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <SearchCheck className="w-4 h-4 mr-2 hidden sm:block" />
                Status
              </button>
              
              <div className="h-6 w-px bg-slate-200 mx-2"></div>
              
              <button
                onClick={() => setView(View.DASHBOARD)}
                className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  view === View.DASHBOARD 
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4 mr-2 hidden sm:block" />
                Admin
                {submissions.length > 0 && isAuthenticated && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${view === View.DASHBOARD ? 'bg-slate-600 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                    {submissions.length}
                  </span>
                )}
              </button>

              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 relative">
        {/* Database Warning Banner */}
        {dbError && (
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-center text-sm text-amber-800">
             <DatabaseZap className="w-4 h-4 mr-2" />
             <span>Database Connection Issue: {dbError} (Running in Offline Mode - data will not save)</span>
          </div>
        )}

        {view === View.FORM && (
          <div className="py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-[url('https://images.unsplash.com/photo-1557683311-eac922347aa1?q=80&w=2829&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')] bg-cover bg-center bg-no-repeat relative">
             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
             <div className="relative z-10 w-full">
                <div className="text-center mb-10">
                  <h1 className="text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl drop-shadow-lg">
                    Speak Freely.
                  </h1>
                  <p className="mt-4 max-w-xl mx-auto text-xl text-slate-200 drop-shadow-md">
                    Secure, anonymous communication channel. Your identity is protected by design.
                  </p>
                </div>
                <ContactForm onSubmissionComplete={handleSubmission} />
             </div>
          </div>
        )}
        
        {view === View.CHECK_STATUS && (
          <StatusCheck 
            submissions={submissions} 
            onReply={handleUserReply} 
          />
        )}

        {view === View.DASHBOARD && (
          <>
            {isAuthenticated ? (
              <Dashboard 
                submissions={submissions} 
                onReply={handleReply}
              />
            ) : (
              <LoginScreen onLogin={() => setIsAuthenticated(true)} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;