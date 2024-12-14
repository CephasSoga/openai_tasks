import WebSocket from "ws";
import env from "./env";
import AudioProcessor from "./audio";
import OpenAI from "openai";
import config from "./config";

// Define the structure for the content of the message
export interface InputText {
    type: 'input_text' | 'input_audio';
    text: string;
}

// Define the structure for the item
export interface ConversationItem {
    type: 'message';
    role: 'user' | 'system' | 'assistant'; // Adjust roles as necessary
    content: InputText[]; // Array of InputText
}

// Define the structure for the overall conversation action
export interface Event {
    type: 'conversation.item.create';
    item: ConversationItem;
}

class RealTimeCompletion {
    private url: string;
    private ws: WebSocket;
    constructor(){
        this.url = config.realtime.url;
        this.ws = new WebSocket(this.url, {
            headers: {
                "Authorization": "Bearer " + env.OPENAI_API_KEY,
                "OpenAI-Beta": "realtime=v1",
            },
        });
    }

    async send(event: Event): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws.on("open", () => {
                try {
                    console.log("Connected to server.");
                    this.ws.send(JSON.stringify(event), (err) => {
                        if (err) {
                            console.error("Error sending event:", err);
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
                                console.error("Error sending response.create:", err);
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
            this.ws.on("message", (message: WebSocket.RawData) => {
                try {
                    const parsedMessage = JSON.parse(message.toString());
                    console.log(parsedMessage); // Optional: Log the message
                    resolve(parsedMessage); // Resolve the promise with the parsed message
                } catch (error) {
                    console.error("Failed to parse message:", error);
                    reject(error); // Reject the promise if parsing fails
                }
            });
    
            this.ws.on("error", (error) => {
                console.error("WebSocket error:", error);
                reject(error); // Reject the promise on WebSocket error
            });
        });
    }
    
}
