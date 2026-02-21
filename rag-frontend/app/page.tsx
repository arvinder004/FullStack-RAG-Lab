"use client"; // this tells Next.js this file runs in browser (client side)...we need to tell this because we use usestate and browser APIs.

import { useState, useRef, useEffect } from "react";

/*
  message type definition
  role:
    - user
    - assistant

  This structure will help later when we add chat memory and RAG context
*/
type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  //store full conversation
  const [messages, setMessages] = useState<Message[]>([]);

  //store current input
  const [input, setInput] = useState("");

  //loading state for button
  // TRUE = AI is generating
  const [loading, setLoading] = useState(false);

  // Store AbortController reference
  const abortControllerRef = useRef<AbortController | null>(null)

  //reference for auto-scroll
  const bottomRef = useRef<HTMLDivElement | null>(null);

  /*
    Auto-scroll to bottom whenever messages update 
  */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // this function runs when user clicks "send"...it sends message to backend and reads streaming response
  const sendMessage = async () => {
    /*
      IMPORTANT GUARD
      
      If:
        - Aready loading
        - OR input empty
        - Exit immediately

      This prevents multiple parallel requests
    */

    if (loading || !input.trim()) return;

    setLoading(true);

    // create new abortcontroller for this request
    const controller = new AbortController()
    abortControllerRef.current = controller;

    // add user message to chat
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: input },
      { role: "assistant", content: "" }, //placeholder for streaming
    ];

    setMessages(newMessages);
    setInput("");

    try {
      // call our own backend API route...not ollama directly...because backend will later handle RAG logic
      const res = await fetch("/api/chat", {
        method: "POST",

        //convert JS object into JSON string
        body: JSON.stringify({ message: input }),
        signal: controller.signal
      });

      /*
      streaming logic begins here
      res.body is a readable stream.
      we use getReader() to read chunks manually
      */
      const reader = res.body?.getReader();

      //decoder converts binary data to readable text
      const decoder = new TextDecoder("utf-8");

      let assistantText = "";

      while (true) {
        //read next chunk from stream
        const { done, value } = await reader!.read();

        //if stream finished break the loop
        if (done) break;

        //decode binary chunk into text
        const chunk = decoder.decode(value);

        /*
        ollama streams JSON lines like:
        {"response": "Hello", "done":false}

        So we need to parse it line-by-line
      */
        const lines = chunk.split("/n").filter(Boolean);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);

            if (parsed.response) {
              assistantText += parsed.response;

              //update assistant message dynamically
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantText,
                };
                return updated;
              });
            }
          } catch {
            // ignore malformed lines
          }
        }
      }
    } catch (error: any) {
      /*
        If aborted, fetch throws error. We detect it safely.
      */
      if (error.name === "AbortError"){
        console.log("Generation stopped by user.")
      } else {
        console.error("Generation error: ", error)
      }
    } finally {
      /*
        CRITICAL:
        Always reset loading, even if error happens.
        This prevents UI freeze 
      */
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  /*
    Stop button logic. Abort current request safely.
  */
  const stopGenerating = () => {
      if(abortControllerRef.current){
        abortControllerRef.current.abort()
      }
  }

  // allow pressing enter to send message (shif+enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>ContextForge</h1>

      <div style={styles.chatContainer}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              ...styles.message,
              alignSelf:
                msg.role === "user" ? "flex-end" : "flex-start",
              backgroundColor:
                msg.role === "user" ? "#2563eb" : "#1f2937",
            }}
          >
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputContainer}>
        <textarea
          style={{
            ...styles.textarea,
            opacity: loading ? 0.6 : 1,
          }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            loading
              ? "AI is generating..."
              : "Type your message..."
          }
          disabled={loading}
        />

        {!loading ? (
          <button
            style={styles.button}
            onClick={sendMessage}
          >
            Send
          </button>
        ) : (
          <button
            style={{
              ...styles.button,
              backgroundColor: "#dc2626", // red
            }}
            onClick={stopGenerating}
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#111827",
    color: "white",
    padding: "1rem",
  },
  header: {
    textAlign: "center",
    marginBottom: "1rem",
  },
  chatContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    overflowY: "auto",
    padding: "1rem",
    border: "1px solid #374151",
    borderRadius: "8px",
  },
  message: {
    maxWidth: "70%",
    padding: "0.75rem",
    borderRadius: "12px",
    whiteSpace: "pre-wrap",
  },
  inputContainer: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "1rem",
  },
  textarea: {
    flex: 1,
    padding: "0.75rem",
    borderRadius: "8px",
    resize: "none",
  },
  button: {
    padding: "0.75rem 1.5rem",
    borderRadius: "8px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    cursor: "pointer",
  },
};