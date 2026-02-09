import React from 'react';

export const metadata = {
  title: 'ComplyBox - Enterprise Whistleblowing',
  description: 'A high-trust, anonymous whistleblower platform for enterprise compliance and safety.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{
          __html: `
          body { font-family: 'Inter', sans-serif; }
          /* Custom scrollbar for dashboard */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #f1f1f1; 
          }
          ::-webkit-scrollbar-thumb {
            background: #c1c1c1; 
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8; 
          }
        `}} />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}