import { Suspense } from "react";
import { ChatClient } from "@/components/chat-client";

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatClient />
    </Suspense>
  );
}
