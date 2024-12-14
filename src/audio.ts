import fs from 'fs';
import asyncFs from 'fs/promises'
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

    /** Writes raw PCM16 audio data to a .wav file */
    public writeWavFile(filePath: string, audioData: Int16Array, sampleRate: number, numChannels: number = 1): void {
        // WAV Header constants
        const bitDepth = 16; // 16 bits for PCM16
        const blockAlign = numChannels * (bitDepth / 8);
        const byteRate = sampleRate * blockAlign;

        // WAV Header
        const header = new ArrayBuffer(44);
        const view = new DataView(header);

        // RIFF chunk descriptor
        this.writeString(view, 0, 'RIFF');                       // ChunkID
        view.setUint32(4, 36 + audioData.length * 2, true);      // ChunkSize (4 + (8 + Subchunk1Size) + (8 + Subchunk2Size))
        this.writeString(view, 8, 'WAVE');                       // Format

        // "fmt " sub-chunk
        this.writeString(view, 12, 'fmt ');                      // Subchunk1ID
        view.setUint32(16, 16, true);                            // Subchunk1Size (16 for PCM)
        view.setUint16(20, 1, true);                             // AudioFormat (1 for PCM)
        view.setUint16(22, numChannels, true);                   // NumChannels
        view.setUint32(24, sampleRate, true);                    // SampleRate
        view.setUint32(28, byteRate, true);                      // ByteRate
        view.setUint16(32, blockAlign, true);                    // BlockAlign
        view.setUint16(34, bitDepth, true);                      // BitsPerSample

        // "data" sub-chunk
        this.writeString(view, 36, 'data');                      // Subchunk2ID
        view.setUint32(40, audioData.length * 2, true);          // Subchunk2Size (NumSamples * NumChannels * BitsPerSample/8)

        // Combine header and audio data
        const wavBuffer = Buffer.concat([Buffer.from(header), Buffer.from(audioData.buffer)]);

        // Write to file
        fs.writeFileSync(filePath, wavBuffer);
        console.log(`WAV file written to ${filePath}`);
    }

    /** Asynchronously writes raw PCM16 audio data to a .wav file */
    public async asyncWriteWavFile(filePath: string, audioData: Int16Array, sampleRate: number, numChannels: number = 1): Promise<void> {
        // WAV Header constants
        const bitDepth = 16; // 16 bits for PCM16
        const blockAlign = numChannels * (bitDepth / 8);
        const byteRate = sampleRate * blockAlign;

        // WAV Header
        const header = new ArrayBuffer(44);
        const view = new DataView(header);

        // RIFF chunk descriptor
        this.writeString(view, 0, 'RIFF');                       // ChunkID
        view.setUint32(4, 36 + audioData.length * 2, true);      // ChunkSize (4 + (8 + Subchunk1Size) + (8 + Subchunk2Size))
        this.writeString(view, 8, 'WAVE');                       // Format

        // "fmt " sub-chunk
        this.writeString(view, 12, 'fmt ');                      // Subchunk1ID
        view.setUint32(16, 16, true);                            // Subchunk1Size (16 for PCM)
        view.setUint16(20, 1, true);                             // AudioFormat (1 for PCM)
        view.setUint16(22, numChannels, true);                   // NumChannels
        view.setUint32(24, sampleRate, true);                    // SampleRate
        view.setUint32(28, byteRate, true);                      // ByteRate
        view.setUint16(32, blockAlign, true);                    // BlockAlign
        view.setUint16(34, bitDepth, true);                      // BitsPerSample

        // "data" sub-chunk
        this.writeString(view, 36, 'data');                      // Subchunk2ID
        view.setUint32(40, audioData.length * 2, true);          // Subchunk2Size (NumSamples * NumChannels * BitsPerSample/8)

        // Combine header and audio data
        const wavBuffer = Buffer.concat([Buffer.from(header), Buffer.from(audioData.buffer)]);

        try {
            // Asynchronously write to file
            await asyncFs.writeFile(filePath, wavBuffer);
            console.log(`WAV file written to ${filePath}`);
        } catch (error) {
            console.error("Error writing WAV file:", error);
            throw error; // Re-throw for upstream error handling
        }
    }

    /** Helper function to write ASCII strings to the DataView */
    private writeString(view: DataView, offset: number, str: string): void {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
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

    // Simulated PCM16 audio data
    const sampleRate = 44100; // 44.1kHz
    const numChannels = 1;    // Mono
    const durationInSeconds = 5;
    const frequency = 440;    // A4 note
    const numSamples = sampleRate * durationInSeconds;
    const audioData_2 = new Int16Array(numSamples);

    // Generate a sine wave for the example
    for (let i = 0; i < numSamples; i++) {
        audioData[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0x7FFF;
    }

    // Write to WAV file
    audioProcessor.writeWavFile('./output.wav', audioData_2, sampleRate, numChannels);
})();