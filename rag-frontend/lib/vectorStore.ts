/**
 * This is a simple in-memory vector store
 * it stores embeddings and performs cosine similarity search
 */

import { createReactServerErrorHandler } from "next/dist/server/app-render/create-error-handler";
import { createEmbedding } from "./embeddings";
import documents from '@/data/documents.json'

interface VectorDocument {
    id: string;
    text: string;
    embedding: number[];
}

let vectorDB: VectorDocument[] = [];

/**
 * cosine similarity between 2 vectors
 */
function cosineSimilarity(a: number[], b: number[]) {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const norA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const norB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))

    return dot / (norA + norB);
}

 /**
  * initialize vectorDB(embed all docs)
  */
export async function initializeVectorDB() {
    if(vectorDB.length > 0) return;

    console.log("Embedding Documents...")

    for(const doc of documents){
        const embedding = await createEmbedding(doc.text)

        vectorDB.push({
            id: doc.id,
            text: doc.text,
            embedding
        })
    }
    console.log("Vector DB Ready")
}

/**
 * Search most similar Documents
 * returns documents with similarity scores
 */
export async function search(query:string, topK = 2) {
    await initializeVectorDB();

    const queryEmbedding = await createEmbedding(query);

    const scored = vectorDB.map((doc) => {
        const score =  cosineSimilarity(queryEmbedding, doc.embedding),

        return {
            id: doc.id,
            text: doc.text,
            score, //similarity score
        }
    })

    scored.sort((a, b) => b.score - a.score)

    return scored.slice(0, topK)
}