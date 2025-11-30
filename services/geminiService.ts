import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  Type,
  FunctionDeclaration,
  FunctionResponse
} from '@google/genai';
import { HandState } from '../types';

interface GeminiServiceCallbacks {
  onHandStateChange: (state: HandState) => void;
  onStatusChange: (connected: boolean) => void;
  onError: (error: string) => void;
}

export class GeminiService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private callbacks: GeminiServiceCallbacks;

  constructor(apiKey: string, callbacks: GeminiServiceCallbacks) {
    this.ai = new GoogleGenAI({ apiKey });
    this.callbacks = callbacks;
  }

  public async connect() {
    try {
      // Define the tool for the model to report hand state
      const setHandStateTool: FunctionDeclaration = {
        name: 'setHandState',
        parameters: {
          type: Type.OBJECT,
          description: 'Sets the detected state of the user\'s hand.',
          properties: {
            state: {
              type: Type.STRING,
              enum: ['OPEN', 'CLOSED'],
              description: 'OPEN if palm is visible/fingers spread. CLOSED if fist/fingers curled.',
            },
          },
          required: ['state'],
        },
      };

      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO], 
          tools: [{ functionDeclarations: [setHandStateTool] }],
          systemInstruction: `
            You are a real-time gesture sensor. 
            Constantly monitor the video input for a hand.
            
            Rules:
            1. If you see an OPEN PALM or fingers spread, call setHandState("OPEN").
            2. If you see a CLOSED FIST, call setHandState("CLOSED").
            
            Do this REPEATEDLY as the state changes. 
            Do NOT speak. ONLY use the tool.
            Speed is critical.
          `,
        },
        callbacks: {
          onopen: () => {
            this.callbacks.onStatusChange(true);
            console.log('Gemini Live Connected');
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Tool Calls
            if (message.toolCall) {
              const responses: FunctionResponse[] = [];
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'setHandState') {
                  const stateStr = (fc.args as any).state;
                  console.log('Gemini Tool Call:', stateStr);
                  const state = stateStr === 'OPEN' ? HandState.OPEN : 
                                stateStr === 'CLOSED' ? HandState.CLOSED : HandState.UNKNOWN;
                  
                  this.callbacks.onHandStateChange(state);
                  
                  // Acknowledge the call
                  responses.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result: 'ok' }
                  });
                }
              }

              // Send response back to model to keep context (required by API)
              if (responses.length > 0 && this.sessionPromise) {
                const session = await this.sessionPromise;
                session.sendToolResponse({ functionResponses: responses });
              }
            }
          },
          onclose: () => {
            this.callbacks.onStatusChange(false);
          },
          onerror: (e) => {
            this.callbacks.onError(e.message || 'Unknown error');
          }
        }
      });
      
      await this.sessionPromise;

    } catch (err: any) {
      this.callbacks.onError(err.message);
      this.callbacks.onStatusChange(false);
    }
  }

  public async sendFrame(base64Image: string) {
    if (!this.sessionPromise) return;

    try {
      const session = await this.sessionPromise;
      session.sendRealtimeInput({
        media: {
          mimeType: 'image/jpeg',
          data: base64Image
        }
      });
    } catch (e) {
      console.error("Error sending frame:", e);
    }
  }

  public disconnect() {
    this.sessionPromise = null;
  }
}