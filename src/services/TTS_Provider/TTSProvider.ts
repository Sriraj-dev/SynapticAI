import WebSocket from 'ws';
import { AudioModelResponse, AudioModelResponseType } from '../../utils/audioWrapperModels/responseModels';
import { WSContext } from 'hono/ws';
import { ElevenLabsClient, play } from 'elevenlabs'
import { AppError } from '../../utils/errors';
import { StatusCodes } from '../../utils/statusCodes';

export class TTS_Provider {
    private llSocket : WebSocket | null = null;
    private elevenlabsClient : ElevenLabsClient | null = null

    private API_KEY : string | null;
    private VOICE_ID : string;
    private MODEL = 'eleven_flash_v2_5';

    constructor(API_KEY : string, VOICE_ID : string|null, private isWebSocket : boolean = false){
        this.API_KEY = API_KEY
        this.VOICE_ID = VOICE_ID || "Xb7hH8MSUJpSbSDYk0k2"
        if(!isWebSocket)
            this.elevenlabsClient = new ElevenLabsClient({ apiKey: this.API_KEY })
    }

    public createWebSocketConnection(ws:WSContext, onSTTEvent : (event : AudioModelResponse) => void){
        if(!this.isWebSocket) 
            throw new AppError("WebSocket connection to ElevenLabs is not expected", StatusCodes.INTERNAL_SERVER_ERROR)

        const uri = `wss://api.elevenlabs.io/v1/text-to-speech/${this.VOICE_ID}/stream-input?model_id=${this.MODEL}`
        this.llSocket = new WebSocket(uri, {
            headers: { 'xi-api-key': `${this.API_KEY}` },
        });

        this.llSocket.onopen = (event) => {
            console.log("🔌 ElevenLabs socket connected");

            this.llSocket?.send(
                JSON.stringify({
                  text: ' ',
                  voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.8,
                    use_speaker_boost: false,
                  },
                  generation_config: { chunk_length_schedule: [120, 160, 250, 290] },
                })
            );
        }

        this.llSocket.onmessage = (event) => {
            const data = JSON.parse(event.toString());
            if (data['audio']) {
                let message = {type: AudioModelResponseType.PARTIAL_AUDIO_RESPONSE, data: "", audio: data['audio']}
                onSTTEvent(message)
            }
        }

        this.llSocket.onerror = (error) => {
            console.error('❌ Elevenlabs WebSocket error:', error);
            let message = {type: AudioModelResponseType.ERROR, data: `Elevenlabs WebSocket error: ${error}`}
            onSTTEvent(message)
        }

        this.llSocket.onclose = (event) => {
            console.log("🔒 ElevenLabs socket closed");
            ws.readyState === WebSocket.OPEN ? ws.close() : null;
        }
    }

    public async createAudioFromText(text_to_convert : string){
        
        if(this.isWebSocket){
            throw new AppError("ElevenLabs Socket Connection is already established, Invalid Operation.", StatusCodes.INTERNAL_SERVER_ERROR)
        }else{
            if(!this.elevenlabsClient)
                throw new AppError("ElevenLabs Connection is not established, Please try again later", StatusCodes.INTERNAL_SERVER_ERROR)
            try{
                const audio = await this.elevenlabsClient.textToSpeech.convert(this.VOICE_ID, {
                    text: text_to_convert,
                    model_id: this.MODEL,
                    output_format: "mp3_44100_128", //TODO: may be we can change the audio return type here
                });
    
                const chunks: Uint8Array[] = [];
                for await (const chunk of audio) {
                    chunks.push(chunk);
                }
                const base64Audio = Buffer.concat(chunks).toString("base64");
    
                let message = {type: AudioModelResponseType.COMPLETE_AUDIO_RESPONSE, data: "", audio: base64Audio}
                return message
            }catch(e){
                console.error("ElevenLabs Error: Could not convert text to audio", e)
            }
            
        }
    }

    public async sendMessageViaSocket(text_to_convert : string, isFinalChunk : boolean = false){
        if(!this.isWebSocket){
            throw new AppError("ElevenLabs Socket Connection is not established, Invalid Operation.", StatusCodes.INTERNAL_SERVER_ERROR)
        }else{
            if(!this.llSocket)
                throw new AppError("ElevenLabs Socket Connection is not established, Please try again later", StatusCodes.INTERNAL_SERVER_ERROR)

            this.llSocket.send(
                JSON.stringify({
                    text: text_to_convert,
                    flush: isFinalChunk 
                })
            );
        }
    }


    setVoice(VOICE_ID : string){
        this.VOICE_ID = VOICE_ID
    }
}