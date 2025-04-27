export interface AgentEvent {
    type: "message" | "tool" | "complete" | "error";
    data: any;
}