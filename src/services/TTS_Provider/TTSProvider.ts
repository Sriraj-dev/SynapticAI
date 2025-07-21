import WebSocket from 'ws';
import { AudioModelResponse, AudioModelResponseType } from '../../utils/audioWrapperModels/responseModels';
import { WSContext } from 'hono/ws';
import { ElevenLabsClient, play } from 'elevenlabs'
import { AppError } from '../../utils/errors';
import { StatusCodes } from '../../utils/statusCodes';

/*
TODO: Consider migrating to some other services to reduce costs
There are some free TTS Services : 
OrpheusTTS, IndexTTS, F5-TTS

*/

export class TTS_Provider {
    private RATE = 24000;
    private llSocket : WebSocket | null = null;
    private elevenlabsClient : ElevenLabsClient | null = null

    private API_KEY : string | null;
    private VOICE_ID : string;
    private MODEL = 'eleven_flash_v2_5';

    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    constructor(API_KEY : string, VOICE_ID : string|null, private isWebSocket : boolean = false){
        this.API_KEY = API_KEY
        this.VOICE_ID = VOICE_ID || "Xb7hH8MSUJpSbSDYk0k2"
        if(!isWebSocket)
            this.elevenlabsClient = new ElevenLabsClient({ apiKey: this.API_KEY })
    }

    public createWebSocketConnection(ws:WSContext, onSTTEvent : (event : AudioModelResponse) => void){
        if(!this.isWebSocket) 
            throw new AppError("WebSocket connection to ElevenLabs is not expected", StatusCodes.INTERNAL_SERVER_ERROR)

        //TODO: Replaced LL with Deepgram
        const uri = `wss://api.deepgram.com/v1/speak?model=aura-2-athena-en&encoding=linear16&sample_rate=${this.RATE}`
        this.llSocket = new WebSocket(uri, {
            headers: { 'Authorization': `Token ${this.API_KEY}` },
        });
        // const uri = `wss://api.elevenlabs.io/v1/text-to-speech/${this.VOICE_ID}/stream-input?model_id=${this.MODEL}`
        // this.llSocket = new WebSocket(uri, {
        //     headers: { 'xi-api-key': `${this.API_KEY}` },
        // });

        this.llSocket.onopen = (event) => {
            console.log("🔌 DeepGram STT socket connected");

            this.sendMessageViaSocket("Hello there, Welcome to Synaptic AI! How may I assist you today?")
            this.flushSocketConnection()
        }

        this.llSocket.onmessage = (event) => {
            //TODO: Change the receiveing func as per deepgram.
            if(event.type == "message"){
                if(event.data instanceof Buffer){
                    console.log("🔊 Received message from Deepgram:")
                    const base64Audio = event.data.toString("base64");
                    // Wrap in your expected message format
                    let message = {
                        type: AudioModelResponseType.PARTIAL_AUDIO_RESPONSE,
                        data: "", // optional metadata if needed
                        audio: base64Audio
                    };
    
                    onSTTEvent(message)
                }
            }
            // console.log(event.data.toString())
            // const data = JSON.parse(event.data.toString());
            // console.log(data)
            
            // if (data['audio']) {
            //     // const audioBuffer = Buffer.from(data['audio']).toString('base64');
            //     let message = {type: AudioModelResponseType.PARTIAL_AUDIO_RESPONSE, data: "", audio: data['audio']}
            //     onSTTEvent(message)
            // }
        }

        this.llSocket.onerror = (error) => {
            console.error('❌ Elevenlabs WebSocket error:', error);
            let message = {type: AudioModelResponseType.TTSERROR, data: `Elevenlabs WebSocket error: ${error}`}
            onSTTEvent(message)
            clearInterval(this.heartbeatInterval as ReturnType<typeof setInterval>);
            this.llSocket?.close();
        }

        this.llSocket.onclose = (event) => {
            console.log("🔒 ElevenLabs socket closed", event.reason);
            console.log(event.code)
            console.log(event.target)
            onSTTEvent({type: AudioModelResponseType.CLOSED, data: "ElevenLabs socket closed"})
            clearInterval(this.heartbeatInterval as ReturnType<typeof setInterval>);
            //ws.readyState === WebSocket.OPEN ? ws.close() : null;
        }

        // this.heartbeatInterval = setInterval(() => {
        //     if (this.llSocket && this.llSocket.readyState === this.llSocket.OPEN) {
        //       console.log("📤 Hearbeat sent to ElevenLabs");
        //       //TODO: Heartbeat required in deepgram?
        //       this.llSocket.send(
        //         JSON.stringify({
        //           text: ' ', 
        //           try_trigger_generation: false
        //         })
        //       );
        //     }
        // }, 15000); 
    }

    

    public async sendMessageViaSocket(text_to_convert : string){
        if(!this.isWebSocket){
            console.error("ElevenLabs Socket Connection is not established, Invalid Operation.", StatusCodes.INTERNAL_SERVER_ERROR)
            return false
        }else{
            if(!this.llSocket)
                throw new AppError("ElevenLabs Socket Connection is not established, Please try again later", StatusCodes.INTERNAL_SERVER_ERROR)

            this.llSocket.send(
                JSON.stringify({
                    type: "Speak",
                    text: text_to_convert,
                })
            );
        }
        return true
    }

    public async flushSocketConnection(){
        if(!this.isWebSocket){
            console.error("ElevenLabs Socket Connection is not established, Invalid Operation.", StatusCodes.INTERNAL_SERVER_ERROR)
            return false
        }else{
            if(!this.llSocket)
                throw new AppError("ElevenLabs Socket Connection is not established, Please try again later", StatusCodes.INTERNAL_SERVER_ERROR)

            
            this.llSocket.send(
                JSON.stringify({
                    type: "Flush",
                })
            );
            // this.llSocket.send(
            //     JSON.stringify({
            //         text: ' ',
            //         flush: true
            //     })
            // );
        }
        return true
    }

    public async createAudioFromText(text_to_convert : string, onChunk? : (message : AudioModelResponse) => void){
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
                if(chunk){
                    let message = {type: AudioModelResponseType.PARTIAL_AUDIO_RESPONSE, data: "", audio: Buffer.from(chunk).toString("base64")}
    
                    if(onChunk){
                        onChunk(message)
                    }
                }
            }
            
            const base64Audio = Buffer.concat(chunks).toString("base64");

            return base64Audio
        }catch(e){
            console.error("ElevenLabs Error: Could not convert text to audio", e)
        }
    }

    // setVoice(VOICE_ID : string){
    //     this.VOICE_ID = VOICE_ID
    // }

    public isConnected(){
        return this.llSocket?.readyState === WebSocket.OPEN;
    }

    public disconnect(){
        if(this.llSocket){
            this.llSocket.close()
        }
    }
}