import { WSContext } from "hono/ws";
import { AudioModelResponse, AudioModelResponseType } from "../utils/audioWrapperModels/responseModels";
import { STT_Provider } from "../services/STT_Provider/STTProvider";
import { OnBoardingAgent } from "../services/AI/onBoardingAgent";
import { OnBoardingAgentSystemPrompt } from "../utils/agentPrompts";
import { date } from "drizzle-orm/mysql-core";
import { TTS_Provider } from "../services/TTS_Provider/TTSProvider";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY!;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

export const greetingAgentHandler : any = () => {
    let sttProvider : STT_Provider | null = null;
    let ttsProvider : TTS_Provider | null = null;
    let onBoardingAgent : OnBoardingAgent | null = null;
    let userMessage : string = ""
    let currentAgentStatus : "LISTENING" | "PROCESSING" | "RESPONDING" | "ERROR" = "LISTENING"

    return {
        async onMessage(evt: MessageEvent, ws : WSContext) {
            if(sttProvider && sttProvider.isConnected()){
                if(currentAgentStatus === "LISTENING")
                    sttProvider.sendAudio(evt.data);

            }else{
                ws.send(JSON.stringify({
                    type: AudioModelResponseType.ERROR,
                    data: "Deepgram socket not yet connected!"
                } as AudioModelResponse));
                // ws.close()
            }
        },

        onOpen(_ : Event, ws: WSContext) {
            console.log('WebSocket connection opened');

            sttProvider = new STT_Provider(DEEPGRAM_API_KEY);
            onBoardingAgent = new OnBoardingAgent(OnBoardingAgentSystemPrompt);
            ttsProvider = new TTS_Provider(ELEVENLABS_API_KEY, "uYXf8XasLslADfZ2MB4u", false)

            sttProvider.connect(ws, async (event: AudioModelResponse | null) => {
                if(event){
                    ws.send(JSON.stringify(event));

                    switch (event.type){
                        case AudioModelResponseType.FINAL_TRANSCRIPT:
                            userMessage = `${userMessage} ${event.data}`;
                            break;
                        
                        case AudioModelResponseType.AUDIO_ENDED:
                            if(userMessage && userMessage.length > 0){
                                currentAgentStatus = "PROCESSING"
                                const response = await onBoardingAgent?.invoke(userMessage)
                                currentAgentStatus = "RESPONDING"

                                let message : AudioModelResponse= {
                                    type: AudioModelResponseType.COMPLETE_TEXT_RESPONSE,
                                    data: response || ""
                                }
                                ws.send(JSON.stringify(message))

                                if(response && response.length > 0){
                                    const audioMessage = await ttsProvider?.createAudioFromText(response)
                                    if(audioMessage){
                                        ws.send(JSON.stringify(audioMessage))
                                    }
                                }

                                userMessage = ""
                                currentAgentStatus = "LISTENING"
                            }else{
                                let message : AudioModelResponse = {
                                    type: AudioModelResponseType.COMPLETE_TEXT_RESPONSE,
                                    data: ""
                                }
                                ws.send(JSON.stringify(message))
                            }
                            
                            break;
                        case AudioModelResponseType.ERROR:
                            currentAgentStatus = "ERROR";
                            ws.close()
                            break;
                        default:
                            break;
                    }
                }
            })
        },

        onClose(evt:CloseEvent, ws:WSContext) {
            console.log('WebSocket connection closed');
            ws.send(JSON.stringify({type: AudioModelResponseType.CLOSED, data: "WebSocket connection got closed"}))

            if(sttProvider && sttProvider.isConnected()){
                sttProvider.disconnect();
            }
        },

        onError(ws:any, error:any) {
            console.error('WebSocket error:', error);
        },
    
        idleTimeout: 60,
        closeOnBackpressureLimit: true
    }
}
