import {WebSocket} from 'ws'
import { AudioModelResponse, AudioModelResponseType } from '../../utils/audioWrapperModels/responseModels';
import { WSContext } from 'hono/ws';

/*
- Currently running on free Deepgram plan, but when it is required to switch to paid plans, due to rate-limit issues,
Switch to AssemblyAI for STT, as it offers the same price & unline deepgram it has a pay-as-you-go pricing

*/

/*
1. Deepgram can send multiple type of messages :
    - SpeechStarted
    - UtteranceEnd
    - Results
        - is_final : False
        - is_final : True
    
When is_final is true, it means the current sentence is finished and this is not gonna repeat in upcoming transcriptions, so we can safely 
append this to UserMessage.

When is_final is false, it means the current sentence might get updated and so we wont append this directly to UserMessage, but can be used
to show them on screen to give better UX.

We will consider UtteranceEnd Event as user has stopped speaking
We will consider SpeechStarted Event as user has started speaking
*/


export class STT_Provider{
    private dgSocket : WebSocket | null = null;
    private headers : Record<string, string>;

    constructor(API_KEY : string){
        this.headers = {
            Authorization: `Token ${API_KEY}`,
        }
    }

    public connect(ws:WSContext, onSTTEvent : (event : AudioModelResponse | null) => void){
        this.dgSocket = new WebSocket("wss://api.deepgram.com/v1/listen?language=en&model=nova-3&interim_results=true&utterance_end_ms=1000&vad_events=true&endpointing=300"
        ,{
            headers: this.headers
        });

        this.dgSocket.onopen = async ()=>{
            console.log("🔌 Deepgram socket connected");
            onSTTEvent({type: AudioModelResponseType.CONNECTED, data: "Connected to Deepgram! Ready to receive audio events!"})
        }

        this.dgSocket.onmessage = (event: any) => {
            let message: AudioModelResponse | null = {
                type: AudioModelResponseType.ERROR,
                data: "Something went wrong!"
            };
        
            try {
            const data = JSON.parse(event.data);
    
            switch (data.type) {
                case "SpeechStarted":
                    console.log("🟢 Speech started");
                    message.type = AudioModelResponseType.AUDIO_STARTED;
                    message.data = "User started speaking!";
                    break;
    
                case "UtteranceEnd":
                    console.log("🔴 User Speech stopped");
                    message.type = AudioModelResponseType.AUDIO_ENDED;
                    message.data = "User stopped speaking!";
                    break;

                case "Results":
                    const transcript =
                        data.channel?.alternatives?.[0]?.transcript || "";
        
                    if (transcript && transcript.trim() !== "") {
                        console.log("📝 Transcript:", transcript);
                        message.type = AudioModelResponseType.INTERIM_TRANSCRIPT;
                        message.data = transcript;
        
                        if (data.is_final) {
                            message.type = AudioModelResponseType.FINAL_TRANSCRIPT;
                        }
                    } else {
                        message = null
                    }
                    break;
    
                default:
                    console.warn("⚠️ Unknown event type from Deepgram:", data.type);
                    message = null
                    // message.type = AudioModelResponseType.WARNING;
                    // message.data = `Unknown event type: ${data.type}`;
            }
            } catch (e) {
                console.error("❌ Error parsing Deepgram message:", e);
                message = {type: AudioModelResponseType.ERROR, data: `Error parsing Deepgram message: ${e}`}
            }

            onSTTEvent(message);
        }

        this.dgSocket.onerror = (err: any) => {
            console.error("❌ Deepgram socket error:", err);
            let message = {type: AudioModelResponseType.ERROR, data: `Deepgram Socket Error : ${err}`}
            onSTTEvent(message);
        };

        this.dgSocket.onclose = () => {
            console.log("🔒 Deepgram socket closed");
            ws.readyState === WebSocket.OPEN ? ws.close() : null;
        };
    }

    sendAudio(data: Buffer | Uint8Array) {
        if (this.dgSocket && this.dgSocket.readyState === WebSocket.OPEN) {
          this.dgSocket.send(data);
        }
    }

    public isConnected(){
        return this.dgSocket?.readyState === WebSocket.OPEN;
    }

    public disconnect(){
        this.dgSocket?.close();
    }

}