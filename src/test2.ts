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

const errorHandler = (error: any) => {
    console.log('type', error.type);
    console.log('code', error.code);
    console.log('message', error.message);
    console.log('param', error.param);
    console.log('event_id', error.event_id);
  };

class RealTimeCompletion {
    private url: string;
    private ws: WebSocket;
    public fileBasedHistory: FileBasedHistory;
    constructor(){
        this.url = config.realtime.url;
        this.ws = new WebSocket(this.url, {
            headers: {
                "Authorization": "Bearer " + env.OPENAI_API_KEY,
                "OpenAI-Beta": "realtime=v1",
            },
        });
        this.fileBasedHistory = new FileBasedHistory(config.realtime.filePath);
    }

    private async recordToHistory(event: Record<string, any>, type: "sent" | "received") {
        const historyItem: HistoryItem = {
            type,
            timestamp: new Date().toISOString(),
            data: event,
        };
        await this.fileBasedHistory.add(historyItem);
    }

    async send(event: Event): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws.on("open", async () => {
                try {
                    console.log("Connected to server.");

                    // Record sent event
                    await this.recordToHistory(event, "sent");

                    this.ws.send(JSON.stringify(event), (err) => {
                        if (err) {
                            errorHandler(err);
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
                                errorHandler(err);
                                reject(err);
                            } else {
                                console.log("Response.create sent successfully.");
                            }
                        }
                    );
                } catch (error) {
                    console.error("Unexpected error:", error);
                    reject(error); // Reject for unexpected errors
                }
            });
    
            this.ws.on("error", (error) => {
                console.error("WebSocket error:", error);
                reject(error); // Reject the promise if the WebSocket emits an error
            });
    
            this.ws.on("close", (code, reason) => {
                console.warn(`WebSocket closed (code: ${code}, reason: ${reason.toString()})`);
                reject(new Error(`WebSocket closed unexpectedly (code: ${code})`));
            });
        });
    }
    

    async receive(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.ws.on("message", async (message: WebSocket.RawData) => {
                try {
                    const parsedMessage = JSON.parse(message.toString());
                    console.log(parsedMessage); // Optional: Log the message
                    // Record received message
                    await this.recordToHistory(parsedMessage, "received");
                    resolve(parsedMessage); // Resolve the promise with the parsed message
                } catch (error) {
                    errorHandler(error);
                    reject(error); // Reject the promise if parsing fails
                }
            });
    
            this.ws.on("error", (error) => {
                errorHandler(error);
                reject(error); // Reject the promise on WebSocket error
            });
        });
    }

    async end(): Promise<void> {
        this.ws.close();
        await this.fileBasedHistory.save();
        console.log("Session hitory file saved at: ", this.fileBasedHistory.filePath)
    }
    
}


export default RealTimeCompletion;