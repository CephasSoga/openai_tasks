import WebSocket from "ws";
import env from "./env";
import config from "./config";
import { FileBasedHistory, HistoryItem } from "./history";

// Define the structure for the content of the message
export interface Input {
    type: 'input_text' | 'input_audio';
    text?: string;
    audio?: string; // Encoded audio Data: refer to AudioProcessor class for how to do it.
    transcription?: string;
}

// Define the structure for the item
export interface ConversationItem {
    type: 'message';
    role: 'user' | 'system' | 'assistant'; // Adjust roles as necessary
    content: Input[]; // Array of InputText
}

// Define the structure for the overall conversation action
export interface Event {
    type: 'conversation.item.create';
    item: ConversationItem;
}

const errorHandler = (error: any, context: string) => { 
    console.log(`[Error] ${context}`); 
    console.log('type', error.type); 
    console.log('code', error.code); 
    console.log('message', error.message); 
    console.log('param', error.param); 
    console.log('event_id', error.event_id); 
};

class RealTimeCompletion {
    private url: string;
    private ws: WebSocket | null;
    public fileBasedHistory: FileBasedHistory;
    private isReconnecting: boolean;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = config.realtime.maxReconnectAttempts;
    private maxReconnectDelay: number = config.realtime.maxReconnectDelay

    constructor() {
        this.url = config.realtime.url;
        this.ws = null;
        this.fileBasedHistory = new FileBasedHistory(config.realtime.filePath);
        this.isReconnecting = false;
        this.setupWebSocket();
    }

    // Set up WebSocket connection and handlers
    private setupWebSocket() {
        this.ws = new WebSocket(this.url, {
            headers: {
                "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
                "OpenAI-Beta": "realtime=v1",
            },
        });

        this.ws.on("open", this.handleOpen);
        this.ws.on("message", this.handleMessage);
        this.ws.on("error", this.handleError);
        this.ws.on("close", this.handleClose);
    }

    // Handle WebSocket open event
    private handleOpen = async () => {
        console.log("Connected to server.");
        this.reconnectAttempts = 0; //Reset max reconnect attempts 

        // Send initial setup message
        const initialMessage = {
            type: "response.create",
            response: {
                modalities: ["text"],
                instructions: "Please assist the user.",
            },
        };
        this.ws?.send(JSON.stringify(initialMessage));

        // Record sent event
        const event: Event = {
            type: 'conversation.item.create',
            item: {
                type: 'message',
                role: 'system',
                content: [{ type: 'input_text', text: 'System initialized.' }],
            },
        };
        await this.recordToHistory(event, "sent");
    };

    // Handle WebSocket message event
    private handleMessage = async (message: WebSocket.Data) => {
        try {
            const parsedMessage = JSON.parse(message.toString());
            console.log("Received message:", parsedMessage);

            // Record received message
            await this.recordToHistory(parsedMessage, "received");
        } catch (error) {
            console.error("Error parsing message:", error);
        }
    };

    // Handle WebSocket error event
    private handleError = (error: Error) => {
        console.error("WebSocket error:", error);
    };

    // Handle WebSocket close event and trigger reconnection if needed
    private handleClose = () => {
        console.warn("WebSocket connection closed.");
        if (!this.isReconnecting) {
            this.reconnect();
        }
    };

    // Reconnect WebSocket connection 
    private reconnect() { 
        if (this.reconnectAttempts >= this.maxReconnectAttempts) { 
            console.error("Maximum reconnection attempts reached. Giving up."); 
            return; 
        } 
        this.isReconnecting = true;
        const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, this.maxReconnectDelay); // Exponential backoff 
        console.log(`Attempting to reconnect... (Attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`); 
        setTimeout(() => { this.setupWebSocket(); 
            // Set up a new WebSocket connection 
            this.isReconnecting = false; 
            this.reconnectAttempts++; 
        }, delay); // Retry after delay 
    }

    // Record event to history
    private async recordToHistory(event: Record<string, any>, type: "sent" | "received") {
        const historyItem: HistoryItem = {
            type,
            timestamp: new Date().toISOString(),
            data: event,
        };
        await this.fileBasedHistory.add(historyItem);
    }

    // Send a message through the WebSocket
    async send(event: Event): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error("WebSocket is not open"));
                return;
            }

            // Record sent event
            this.recordToHistory(event, "sent");

            // Send the event message
            this.ws.send(JSON.stringify(event), (err) => {
                if (err) {
                    errorHandler(err, 'Send event');
                    reject(err); // Reject if sending fails
                } else {
                    console.log("Event sent successfully.");
                    resolve(); // Resolve the promise on success
                }
            });

            // Optionally send additional messages
            this.ws.send(
                JSON.stringify({ type: "response.create" }),
                (err) => {
                    if (err) {
                        errorHandler(err, 'Send event');
                        reject(err);
                    } else {
                        console.log("Response.create sent successfully.");
                    }
                }
            );
        });
    }

    // Close the WebSocket connection and save history
    async end(): Promise<void> {
        if (this.ws) {
            this.ws.close();
        }
        await this.fileBasedHistory.save();
        console.log("Session history file saved at:", this.fileBasedHistory.filePath);
    }
}

export default RealTimeCompletion;
