import React, { useState } from 'react';
import { ContactForm } from './components/ContactForm';
import { Dashboard } from './components/Dashboard';
import { LoginScreen } from './components/LoginScreen';
import { StatusCheck } from './components/StatusCheck';
import { SubmissionResponse, View, CaseStatus } from './types';
import { LayoutGrid, MessageSquarePlus, LogOut, SearchCheck } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.FORM);
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleSubmission = (data: SubmissionResponse) => {
    setSubmissions(prev => [data, ...prev]);
  };

  const handleReply = (submissionId: string, message: string, newStatus?: CaseStatus) => {
    setSubmissions(prev => prev.map(sub => {
      if (sub.submission_id === submissionId) {
        return {
          ...sub,
          status: newStatus || 'IN_REVIEW', // Default to IN_REVIEW if admin replies
          history: [
            ...sub.history,
            {
              id: Math.random().toString(36).substr(2, 9),
              sender: 'ADMIN',
              message: message,
              timestamp: new Date().toISOString()
            }
          ]
        };
      }
      return sub;
    }));
  };

  const handleUserReply = (submissionId: string, message: string) => {
    setSubmissions(prev => prev.map(sub => {
      if (sub.submission_id === submissionId) {
        return {
          ...sub,
          status: 'ACTION_REQUIRED', // Flag for admin
          history: [
            ...sub.history,
            {
              id: Math.random().toString(36).substr(2, 9),
              sender: 'USER',
              message: message,
              timestamp: new Date().toISOString()
            }
          ]
        };
      }
      return sub;
    }));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setView(View.FORM);
  };

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
      <main className="flex-1">
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