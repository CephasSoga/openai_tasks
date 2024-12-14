import OpenAI from "openai";
import { ImagesResponse, ImageGenerateParams } from "openai/resources";
import env from "./env";

export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  n?: number | null;
  quality?: 'standard' | 'hd';
  response_format?: 'url' | 'b64_json' | null;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792' | null;
  style?: 'vivid' | 'natural' | null;
  user?: string;
}

export interface ImageGenerationResponse extends ImagesResponse {}


class ImageGeneration {
    private client: OpenAI;
    constructor(){
        this.client = new OpenAI({apiKey: env.OPENAI_API_KEY})
    }

    async generate(params: ImageGenerationRequest, options?: any): Promise <ImageGenerationResponse>{
        return await this.client.images.generate(
            params as ImageGenerateParams,
            options
        );

    }
}

export default ImageGeneration;