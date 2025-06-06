export interface AgentEvent {
    type: "message" | "tool" | "stream" | "notes-link" | "web-link" | "complete" | "error";
    data: any;
    tokens_used?: number;
}