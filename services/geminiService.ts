import { GoogleGenAI, Type } from "@google/genai";
import { SubmissionResponse } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelId = "gemini-3-flash-preview";

// Define the schema based on the user's prompt requirements
const submissionSchema = {
  type: Type.OBJECT,
  properties: {
    submission_id: { type: Type.STRING, description: "Generate a short UUID or unique string" },
    content: {
      type: Type.OBJECT,
      properties: {
        subject_line: { type: Type.STRING, description: "A concise title generated based on the message" },
        original_message: { type: Type.STRING },
        summary: { type: Type.STRING, description: "Redacted 1-sentence summary. If an image/PDF was attached, mention what it depicts briefly." },
        topics: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of relevant tags or topics"
        }
      },
      required: ["subject_line", "original_message", "summary", "topics"]
    },
    analysis: {
      type: Type.OBJECT,
      properties: {
        intent: { 
          type: Type.STRING, 
          enum: ["Bug Report", "Feature Request", "General Praise", "Complaint", "Other", "General"] 
        },
        priority: { 
          type: Type.STRING, 
          enum: ["Low", "Medium", "High", "Urgent"] 
        },
        sentiment_score: { 
          type: Type.NUMBER, 
          description: "Float between -1.0 (negative) and 1.0 (positive)" 
        },
        requires_developer_intervention: { type: Type.BOOLEAN }
      },
      required: ["intent", "priority", "sentiment_score", "requires_developer_intervention"]
    },
    admin_preview: { type: Type.STRING, description: "A 50-character snippet for dashboard list views" }
  },
  required: ["submission_id", "content", "analysis", "admin_preview"]
};

const SYSTEM_INSTRUCTION = `
You are a Privacy-First Backend Logic Assistant. Your task is to process incoming anonymous contact form submissions into structured data for an admin dashboard.

Constraints:
1. Anonymity: Do not attempt to extract names, phone numbers, or personal emails. If a user voluntarily provides them, redact them in the "summary" (replace with [REDACTED]) but keep them in the "original_message" for record-keeping.
2. Focus: Concentrate on the intent and urgency of the feedback rather than the identity of the sender.
3. Attachments: If an image or PDF is provided, analyze its visual content in context with the text. Describe relevant details in the "original_message" or "summary" if it adds context (e.g., "User attached a screenshot of a 404 error").

Logic Rules:
- If the message mentions "security," "exploit," or "leak," set priority to Urgent.
- Categorize vague messages (e.g., "it doesn't work") as Low priority and flag for "General" intent.
- Use the sentiment_score to help admins sort by the most frustrated users first (-1.0 is very angry, 1.0 is very happy).
`;

interface Attachment {
  data: string; // Base64 string (raw)
  mimeType: string;
}

export const processSubmission = async (message: string, attachment?: Attachment): Promise<SubmissionResponse> => {
  try {
    const parts: any[] = [{ text: message }];

    if (attachment) {
      parts.push({
        inlineData: {
          data: attachment.data,
          mimeType: attachment.mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: submissionSchema,
      },
    });

    if (!response.text) {
      throw new Error("No response from AI");
    }

    const data = JSON.parse(response.text) as SubmissionResponse;
    
    // Add client-side timestamp
    const timestamp = new Date().toISOString();
    data.timestamp = timestamp;
    
    // Generate a simple 8-character random password for the user
    data.access_password = Math.random().toString(36).slice(-8).toUpperCase();

    // Initialize status and history
    data.status = 'RECEIVED';
    data.history = [
      {
        id: Math.random().toString(36).substr(2, 9),
        sender: 'USER',
        message: data.content.original_message, // Store the first message in history
        timestamp: timestamp
      }
    ];

    return data;

  } catch (error) {
    console.error("Error processing submission:", error);
    throw error;
  }
};