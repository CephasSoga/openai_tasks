import OpenAI from "openai";
import { RequestOptions } from "openai/core";
import { ChatCompletion, ChatCompletionMessageParam } from "openai/resources";
import env from "./env";

interface ImageUrl {
    url: String
}

interface RichContent {
    type: "text" | "image_url",
    text: string,
    image_url?: ImageUrl
}

interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string | RichContent;
}

interface ToolFunction {
    type: "function";
    description?: string; 
    function: {
        name: string;
        parameters: {
            type: "object";
            properties: Record<string, { type: string }>;
        };
    };
    required?: Array<string>;
    addtionnalProperties?: boolean;
}

export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    tools?: ToolFunction[];
}

export interface ChatCompletionResponse extends ChatCompletion {
    timestamp: Date
}

class Completion {
    private client: OpenAI;
    constructor(){
        this.client = new OpenAI({apiKey: env.OPENAI_API_KEY})
    }
    async complete(params: ChatCompletionRequest, options?: RequestOptions): Promise<ChatCompletionResponse>{
        const completion = await this.client.chat.completions.create({
            model: params.model,
            messages: params.messages as ChatCompletionMessageParam[],
            tools: params.tools,
        }, options);

        return {
            ...completion,
            timestamp: new Date()
        }
    }
}


export default Completion;