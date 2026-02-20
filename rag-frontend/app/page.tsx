"use client" // this tells Next.js this file runs in browser (client side)...we need to tell this because we use usestate and browser APIs.

import { useState } from "react"  

export default function Home() {
  //store user input
  const [message, setMessage] = useState("")

  //store llm response
  const [response, setResponse] = useState("")

  // this function runs when user clicks "send"...it sends message to backend and reads streaming response
  const sendMessage = async() => {
    //clears previous response
    setResponse("");


    // call our own backend API route...not ollama directly...because backend will later handle RAG logic
    const res = await fetch("/api/chat", {
      method: "POST",

      //convert JS object into JSON string
      body: JSON.stringify({message})
    })

    /*
      streaming logic begins here
      res.body is a readable stream.
      we use getReader() to read chunks manually
    */
    const reader = res.body?.getReader();

    //decoder converts binary data to readable text
    const decoder = new TextDecoder("utf-8");

    while(true){
      //read next chunk from stream
      const {done, value} = await reader!.read();

      //if stream finished break the loop
      if (done) break;

      //decode binary chunk into text
      const chunk = decoder.decode(value)

      /* 
        append new chunk to the existing response
        this creates the typing effect
      */
     setResponse((prev) => prev + chunk)
    }
  }

  return (
    <div style={{padding: "2rem"}}>
      <h1>Local LLM Chat</h1>

      {/*User Input Area*/}
      <textarea
        rows={4}
        style={{width:"100%"}}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      {/*Butto to send message*/}
      <button onClick={sendMessage}>Send</button>

      {/*Dsiplay steamed Response*/}
      <pre style={{whiteSpace: "pre-wrap", marginTop: "1rem"}}>
        {response}
      </pre>
    </div>
  )

}