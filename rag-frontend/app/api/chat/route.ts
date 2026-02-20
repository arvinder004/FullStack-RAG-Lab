import { NextRequest } from "next/server";

/*
    this function handles POST requests to: /api/chat

    When frontend sends a message. this function will forward it to Ollama and stream the response back.
*/
export async function POST(req: NextRequest) {
    // Extract message sent from frontend
    const {message} = await req.json();

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

    return new Response(ollamaResponse.body, {
        headers: {
            "Content-Type": "text/plain"
        }
    })
}