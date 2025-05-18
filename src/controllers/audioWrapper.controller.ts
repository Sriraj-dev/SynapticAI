import { WSContext } from "hono/ws";
import { AudioModelResponse, AudioModelResponseType } from "../utils/audioWrapperModels/responseModels";
import { STT_Provider } from "../services/STT_Provider/STTProvider";
import { OnBoardingAgent } from "../services/AI/onBoardingAgent";
import { OnBoardingAgentSystemPrompt } from "../utils/agentPrompts";
import { TTS_Provider } from "../services/TTS_Provider/TTSProvider";
import { AppError } from "../utils/errors";
import { StatusCodes } from "../utils/statusCodes";
import { SynapticAIVoices } from "../utils/audioWrapperModels/constants";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY!;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

const handleTTSEvents = (event : AudioModelResponse, ws:WSContext)=>{
    //Basically Let the client know that TTS Service is not working in case of any issues/error, but still be able to use STT Service.
    switch(event.type){
        case AudioModelResponseType.TTSERROR:
        case AudioModelResponseType.PARTIAL_AUDIO_RESPONSE:
            ws.send(JSON.stringify(event))
            break
        
        case AudioModelResponseType.ERROR:
        case AudioModelResponseType.CLOSED:
            ws.send(JSON.stringify({type: AudioModelResponseType.TTSERROR, data: "TTS Provider got Disconnected!"}))
            break;

        default:
            throw new AppError("Unexpected Event Type from TTS Provider", StatusCodes.INTERNAL_SERVER_ERROR)
    }
}

const handleSTTEvents = (event: AudioModelResponse, ws:WSContext, buildUserMessage : (message : string)=>void,processUserRequest : (ws:WSContext) =>{})=>{
    switch (event.type){
        case AudioModelResponseType.CONNECTED:
        case AudioModelResponseType.INTERIM_TRANSCRIPT:
        case AudioModelResponseType.FINAL_TRANSCRIPT:
            if(event.type === AudioModelResponseType.FINAL_TRANSCRIPT)
                buildUserMessage(event.data)
            ws.send(JSON.stringify(event))
            break;
        
        case AudioModelResponseType.AUDIO_STARTED:
        case AudioModelResponseType.WARNING:
            break;

        case AudioModelResponseType.AUDIO_ENDED:
            processUserRequest(ws)
            break;
        
        case AudioModelResponseType.CLOSED:
            ws.close()
            break
        
        case AudioModelResponseType.ERROR:
            ws.send(JSON.stringify({type: AudioModelResponseType.STTERROR, data: "STT Provider got disconnected, Try again Later!"}))
            ws.close()
            break;
        
        default:
            throw new AppError("Unexpected Event Type from STT Provider", StatusCodes.INTERNAL_SERVER_ERROR)
    }
}


export const greetingAgentHandler : any = () => {
    let sttProvider : STT_Provider | null = null;
    let ttsProvider : TTS_Provider | null = null;
    let onBoardingAgent : OnBoardingAgent | null = null;
    let userMessage : string = ""
    let currentAgentStatus : "LISTENING" | "PROCESSING" | "RESPONDING" | "ERROR" = "LISTENING"

    const processUserRequest = async(ws:WSContext) => {
        const avoiding_echo = userMessage
        if(userMessage && userMessage.length > 0){
            userMessage = ""
            currentAgentStatus = "PROCESSING"

            console.log(`Invoking OnBoarding Agent with prompt: ${avoiding_echo}`)
            const response = await onBoardingAgent?.invoke(avoiding_echo, 
            (chunk : string) => {
                //Send the Chunks of messages as soon as they are generated
                let message : AudioModelResponse= {
                    type: AudioModelResponseType.PARTIAL_TEXT_RESPONSE,
                    data: chunk || ""
                }
                ws.send(JSON.stringify(message))
                ttsProvider?.sendMessageViaSocket(chunk)
            })
            ttsProvider?.flushSocketConnection()
            currentAgentStatus = "RESPONDING"

            //Send the complete text response
            let message : AudioModelResponse= {
                type: AudioModelResponseType.COMPLETE_TEXT_RESPONSE,
                data: response || ""
            }
            ws.send(JSON.stringify(message))

            userMessage = ""
            currentAgentStatus = "LISTENING"
        }else{
            let message : AudioModelResponse = {
                type: AudioModelResponseType.COMPLETE_TEXT_RESPONSE,
                data: ""
            }
            ws.send(JSON.stringify(message))
        }
    }

    const buildUserMessage = (message : string) => {
        userMessage = `${userMessage} ${message}`
    }
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
            }
        },

        onOpen(_ : Event, ws: WSContext) {
            console.log('WebSocket connection opened');

            sttProvider = new STT_Provider(DEEPGRAM_API_KEY);
            onBoardingAgent = new OnBoardingAgent(OnBoardingAgentSystemPrompt);
            ttsProvider = new TTS_Provider(ELEVENLABS_API_KEY, SynapticAIVoices["Eryn (Female)"], true)

            sttProvider.connect(ws, (event) => handleSTTEvents(event, ws, buildUserMessage, processUserRequest))
            
            ttsProvider.createWebSocketConnection(ws, (event) => handleTTSEvents(event,ws))
        },

        onClose(evt:CloseEvent, ws:WSContext) {
            console.log('WebSocket connection closed');
            ws.send(JSON.stringify({type: AudioModelResponseType.CLOSED, data: "WebSocket connection got closed"}))

            if(sttProvider && sttProvider.isConnected()){
                sttProvider.disconnect();
            }
            if(ttsProvider && ttsProvider.isConnected()){
                ttsProvider.disconnect();
            }
        },

        onError(ws:any, error:any) {
            console.error('WebSocket error:', error);
        },
    
        idleTimeout: 60,
        closeOnBackpressureLimit: true
    }
}


export const SynapticAgentHandler : any = () => {
    
}

