import React, { useState, useEffect } from 'react';
import { ContactForm } from './components/ContactForm';
import { Dashboard } from './components/Dashboard';
import { LoginScreen } from './components/LoginScreen';
import { StatusCheck } from './components/StatusCheck';
import { SubmissionResponse, View, CaseStatus } from './types';
import { LayoutGrid, MessageSquarePlus, LogOut, SearchCheck, Loader2, DatabaseZap, Shield } from 'lucide-react';
import { api } from './lib/api';

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.FORM);
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Initialize Tenant and Fetch Data
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        // 1. Get Tenant
        const tenant = await api.tenants.get();
        setTenantId(tenant.id);

        if (tenant.id) {
          // 2. Fetch Reports
          await fetchReports(tenant.id);
        }
      } catch (error: any) {
        console.error('Initialization Exception:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  const fetchReports = async (tId: string) => {
    try {
      const data = await api.reports.list(tId);

      const mappedSubmissions: SubmissionResponse[] = (data || []).map((report: any) => {
        let richData: any = {};
        try {
          richData = report.description;
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
      });

      setSubmissions(mappedSubmissions);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleSubmission = async (data: SubmissionResponse) => {
    if (!tenantId) return;

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

    try {
      await api.reports.create({
        tenantId: tenantId,
        reportKey: data.submission_id,
        passwordHash: data.access_password,
        category: data.analysis.intent,
        priority: data.analysis.priority,
        status: data.status,
        description: richData,
        isEncrypted: false,
      });

      // Optimistic update
      setSubmissions(prev => [data, ...prev]);
    } catch (error: any) {
      console.error("Error saving submission:", error);
    }
  };

  const handleReply = async (submissionId: string, message: string, newStatus?: CaseStatus) => {
    const newMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'ADMIN',
      message: message,
      timestamp: new Date().toISOString()
    };

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

    // Persist
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

    try {
      const updatePayload: any = { description: richData };
      if (newStatus) updatePayload.status = newStatus;
      await api.reports.update(submissionId, updatePayload);
    } catch (error) {
      console.error("Error updating report in DB:", error);
    }
  };

  const handleUserReply = (submissionId: string, message: string) => {
    const newMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'USER',
      message: message,
      timestamp: new Date().toISOString()
    };

    // This mostly triggers the optimistic UI update in the parent
    setSubmissions(prev => prev.map(sub => {
      if (sub.submission_id === submissionId) {
        return {
          ...sub,
          status: 'ACTION_REQUIRED',
          history: [...sub.history, newMessage]
        };
      }
      return sub;
    }));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setView(View.FORM);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Connecting to ComplyBox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => setView(View.FORM)}>
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center mr-3">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-900">ComplyBox</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => setView(View.FORM)}
                className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${view === View.FORM
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <MessageSquarePlus className="w-4 h-4 mr-2 hidden sm:block" />
                Report
              </button>

              <button
                onClick={() => setView(View.CHECK_STATUS)}
                className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${view === View.CHECK_STATUS
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <SearchCheck className="w-4 h-4 mr-2 hidden sm:block" />
                Track Case
              </button>

              <div className="h-6 w-px bg-slate-200 mx-2"></div>

              <button
                onClick={() => setView(View.DASHBOARD)}
                className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${view === View.DASHBOARD
                    ? 'bg-slate-100 text-slate-900 border border-slate-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <LayoutGrid className="w-4 h-4 mr-2 hidden sm:block" />
                Admin Dashboard
                {submissions.length > 0 && isAuthenticated && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs bg-slate-200 text-slate-800`}>
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
        {view === View.FORM && (
          <div className="relative min-h-[calc(100vh-64px)] bg-slate-900 overflow-hidden">
            {/* Abstract Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
              <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] bg-emerald-900/20 rounded-full blur-3xl"></div>
              <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 w-full py-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
              <div className="text-center mb-10 max-w-2xl">
                <h1 className="text-4xl font-bold text-white sm:text-5xl tracking-tight mb-4">
                  Speak Up. Stay Secure.
                </h1>
                <p className="text-lg text-slate-400">
                  Enterprise-grade whistleblower channel.
                  <span className="text-emerald-400 font-medium"> Zero-knowledge identity protection</span> ensures your voice is heard without compromise.
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
            tenantId={tenantId}
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