import fs from 'fs';
import decodeAudio from 'audio-decode';

class AudioProcessor {
    /** Converts Float32Array of audio data to PCM16 ArrayBuffer */
    private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
        const buffer = new ArrayBuffer(float32Array.length * 2);
        const view = new DataView(buffer);
        let offset = 0;
        for (let i = 0; i < float32Array.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, float32Array[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        return buffer;
    }

    /** Converts a Float32Array to base64-encoded PCM16 data */
    public base64EncodeAudio(float32Array: Float32Array): string {
        const arrayBuffer = this.floatTo16BitPCM(float32Array);
        let binary = '';
        let bytes = new Uint8Array(arrayBuffer);
        const chunkSize = 0x8000; // 32KB chunk size
        for (let i = 0; i < bytes.length; i += chunkSize) {
            let chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        return btoa(binary);
    }

    /** Process audio file and return base64 encoded audio data */
    public async processAudioFile(filePath: string): Promise<string> {
        try {
            const myAudio = fs.readFileSync(filePath);
            const audioBuffer = await decodeAudio(myAudio);
            const channelData = audioBuffer.getChannelData(0); // only accepts mono
            return this.base64EncodeAudio(channelData);
        } catch (error) {
            console.error("Error processing audio file:", error);
            throw error; // Rethrow the error for further handling if needed
        }
    }
}

export default AudioProcessor;

// Example usage
(async () => {
    const audioProcessor = new AudioProcessor();
    const audioData = new Float32Array([/* your audio data */]);
    const base64Audio = audioProcessor.base64EncodeAudio(audioData);
    
    const filePath = './path/to/audio.wav';
    const base64AudioData = await audioProcessor.processAudioFile(filePath);
    
    console.log("Base64 Encoded Audio Data:", base64AudioData);
})();