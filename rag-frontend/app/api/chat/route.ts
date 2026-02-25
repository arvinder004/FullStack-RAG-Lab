import { NextRequest } from "next/server";
import { search } from "@/lib/vectorStore";
import { parse } from "path";

/*
  This function handles POST requests to: /api/chat

  Flow:
  1. Get user message
  2. Retrieve relevant documents (RAG)
  3. Send retrieval debug info to frontend
  4. Stream Ollama response back
*/
export async function POST(req: NextRequest) {
    // Extract message sent from frontend
    const {message} = await req.json();

    //get user message
    const userMessage = message[message.length - 1].content

    //retrieve relevant docs
    const relevantDocs = await search(userMessage);

    //create context string
    const context = relevantDocs
        .map((doc) => doc.text)
        .join("/n")

    //argument prompt
    const augmentedPrompt = `
You are a helpful AI assistant.
Use ONLY the context below to answer the question.
If the answer is not in the context, say:
"I don't have information about that in my knowledge base."

Context:
${context}

Question:
${userMessage}
`;


    /*
        we call ollama's local server

        /api/generate is the endpoint for generating responses
    */
    const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
        method: "POST",

        // tell ollama we are sending JSON
        headers: {
            "Content-Type": "application/json",
        },

        /* 
            body contains:
            model: which LLM to use
            prompt: the actual input
            stream: true enables streaming token-by-token
        */
        body: JSON.stringify({
            model: "mistral",
            "prompt": message,
            stream: true,

            /*
                Optional model settings:
                temperature controls randomness.
                Lower = more factual
                Higher = more creative
            */
            options: {
                temperature: 0.7,
            }
        }),
    });

    /*
    VERY IMPORTANT:

    ollamaResponse.body is a readable stream.
    Instead of waiting for full response,
    we directly return the stream to frontend.

    This allows real-time token streaming.
    */

    /**
     * create custom streams - First send retirieval debug info, then pipe ollama streaming tokens.
     */
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
        async start(controller) {

            //send retrieval debug info FIRST
            controller.enqueue(
                encoder.encode(
                    `__RETRIEVAL_DEBUG__${JSON.stringify(relevantDocs)}\n`
                )
            )

            const reader = ollamaResponse.body?.getReader()

            if(!reader){
                controller.close;
                return;
            }

            while(true){
                const {done, value} = await reader.read();

                if(done) break;

                //ollama streams JSON line -> we must parse each line
                const chunk = decoder.decode(value)
                const lines = chunk.split('\n').filter(Boolean)

                for (const line of lines){
                    try{
                        const parsed = JSON.parse(line)

                        if(parsed.response){
                            controller.enqueue(
                                encoder.encode(parsed.response)
                            )
                        }
                    } catch (err) {
                        // ignore partial json parsing errors
                    }
                }
            }
            controller.close()
        }
    })

    return new Response(stream, {
        headers: {
            "Content-Type": "text/plain"
        }
    })
}