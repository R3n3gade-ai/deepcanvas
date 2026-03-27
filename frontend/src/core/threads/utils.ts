import type { Message } from "@langchain/langgraph-sdk";

import type { AgentThread } from "./types";

export function pathOfThread(threadId: string) {
  return `/workspace/chats/${threadId}`;
}

export function textOfMessage(message: Message) {
  if (typeof message.content === "string") {
    return message.content;
  } else if (Array.isArray(message.content)) {
    const parts: string[] = [];
    for (const part of message.content) {
      if (typeof part === "string") {
        parts.push(part);
      } else if (part.type === "text") {
        parts.push(part.text);
      }
    }
    return parts.join("") || null;
  }
  return null;
}

export function titleOfThread(thread: AgentThread) {
  return thread.values?.title ?? "Untitled";
}
