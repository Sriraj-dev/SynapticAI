export interface AgentEvent {
    type: "message" | "tool" | "stream" | "notes-link" |"complete" | "error";
    data: any;
}