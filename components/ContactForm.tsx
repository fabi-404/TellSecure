import React, { useState, useRef } from 'react';
import { Send, ShieldCheck, Loader2, AlertCircle, Paperclip, X, FileText, Image as ImageIcon, Copy, Key } from 'lucide-react';
import { processSubmission } from '../services/geminiService';
import { SubmissionResponse } from '../types';

interface ContactFormProps {
  onSubmissionComplete: (data: SubmissionResponse) => void;
}

interface AttachedFile {
  name: string;
  data: string; // Base64 without prefix
  mimeType: string;
}

export const ContactForm: React.FC<ContactFormProps> = ({ onSubmissionComplete }) => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<AttachedFile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<SubmissionResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Basic validation
    if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
      setError("File is too large. Max 5MB allowed.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 data and mime type
      const base64Data = result.split(',')[1];
      setFile({
        name: selectedFile.name,
        data: base64Data,
        mimeType: selectedFile.type
      });
      setError(null);
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsDataURL(selectedFile);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !file) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Pass file data if it exists
      const attachment = file ? { data: file.data, mimeType: file.mimeType } : undefined;
      const result = await processSubmission(message, attachment);
      
      onSubmissionComplete(result);
      setSuccessData(result);
      setMessage('');
      clearFile();
      
    } catch (err) {
      setError("Failed to process your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-2xl mx-auto w-full p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <h2 className="text-2xl font-bold">Secure Drop</h2>
          </div>
          <p className="text-slate-300">
            Send anonymous feedback, bug reports, or concerns. 
            Our AI strips identifiable metadata before it reaches the admin team.
          </p>
        </div>

        <div className="p-8">
          {successData ? (
            <div className="bg-emerald-50 text-emerald-900 p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-300 border border-emerald-100">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-emerald-800">Transmission Successful</h3>
                <p className="text-emerald-700/80 mt-1">Your message has been anonymized and queued.</p>
              </div>

              <div className="w-full bg-white p-4 rounded-lg border border-emerald-200 shadow-sm text-left mt-4">
                <h4 className="text-xs font-bold uppercase text-emerald-600 tracking-wider mb-3 flex items-center">
                  <Key className="w-3 h-3 mr-1" />
                  Save Your Access Keys
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-slate-500">Case ID</span>
                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                      <code className="font-mono text-slate-800 font-bold">{successData.submission_id}</code>
                      <button onClick={() => copyToClipboard(successData.submission_id)} className="text-slate-400 hover:text-indigo-600">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-xs text-slate-500">Access Password</span>
                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                      <code className="font-mono text-slate-800 font-bold">{successData.access_password}</code>
                      <button onClick={() => copyToClipboard(successData.access_password || '')} className="text-slate-400 hover:text-indigo-600">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-slate-500 mt-3 italic text-center">
                  You need these credentials to check the status of your report later.
                </p>
              </div>

              <button 
                onClick={() => setSuccessData(null)}
                className="mt-6 text-sm font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-6 py-2 rounded-lg transition-colors"
              >
                Start New Submission
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">
                  Your Message
                </label>
                <div className="relative">
                  <textarea
                    id="message"
                    rows={6}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none text-slate-800 placeholder:text-slate-400"
                    placeholder="Describe your issue or feedback. Avoid including your name if you wish to remain 100% anonymous..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-slate-400 font-mono bg-white/50 px-2 py-1 rounded">
                    {message.length} chars
                  </div>
                </div>
              </div>

              {/* File Attachment Section */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,application/pdf"
                />
                
                {!file ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="flex items-center space-x-2 text-sm text-slate-600 hover:text-indigo-600 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors border border-dashed border-slate-300 hover:border-indigo-300 w-full"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span>Attach Screenshot or PDF (optional)</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      {file.mimeType.includes('pdf') ? (
                        <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                      )}
                      <span className="text-sm text-indigo-900 font-medium truncate">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="p-1 hover:bg-indigo-100 rounded-full text-indigo-400 hover:text-indigo-700 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-400 flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  End-to-end anonymity processing active
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting || (!message.trim() && !file)}
                  className={`
                    flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold text-white transition-all
                    ${isSubmitting || (!message.trim() && !file)
                      ? 'bg-slate-300 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transform hover:-translate-y-0.5'}
                  `}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Anonymously</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};