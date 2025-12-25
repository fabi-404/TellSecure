import { SubmissionResponse, CaseStatus } from '../types';

// Mock in-memory database for the frontend preview
// This simulates what Drizzle would return from the Postgres DB
let mockReports: any[] = [];
const MOCK_TENANT_ID = "tenant-uuid-1234";

export const api = {
  // Auth.js Simulation
  auth: {
    signIn: async (provider: string, credentials?: any) => {
        // Simulating CredentialsProvider logic
        if(credentials?.password === 'admin123') {
            return { 
                user: { 
                    name: "Admin User", 
                    email: "admin@tellsecure.com", 
                    tenantId: MOCK_TENANT_ID 
                } 
            };
        }
        throw new Error("Invalid credentials");
    },
    getSession: async () => {
        // Simulating useSession() hook
        return { 
            user: { 
                name: "Admin User", 
                email: "admin@tellsecure.com", 
                tenantId: MOCK_TENANT_ID 
            } 
        };
    }
  },

  // Reports (BFF Pattern - Backend for Frontend)
  reports: {
    list: async (tenantId: string) => {
       // Equivalent to: db.select().from(reports).where(eq(reports.tenantId, tenantId))
       return mockReports
        .filter(r => r.tenantId === tenantId)
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    
    create: async (data: any) => {
       // Equivalent to: db.insert(reports).values(data)
       const newReport = { 
           ...data, 
           id: crypto.randomUUID(), 
           createdAt: new Date().toISOString(),
           updatedAt: new Date().toISOString()
       };
       mockReports.push(newReport);
       return newReport;
    },
    
    update: async (reportKey: string, updates: any) => {
       // Equivalent to: db.update(reports).set(updates).where(eq(reports.reportKey, reportKey))
       const idx = mockReports.findIndex(r => r.reportKey === reportKey);
       if(idx === -1) throw new Error("Report not found");
       
       const updated = { ...mockReports[idx], ...updates, updatedAt: new Date().toISOString() };
       mockReports[idx] = updated;
       return updated;
    },
    
    getByKey: async (reportKey: string, passwordHash: string) => {
       // Equivalent to: db.query.reports.findFirst(...)
       return mockReports.find(r => r.reportKey === reportKey && r.passwordHash === passwordHash);
    }
  },

  // Tenants
  tenants: {
     get: async () => ({ id: MOCK_TENANT_ID, name: "Demo Tenant" })
  }
};