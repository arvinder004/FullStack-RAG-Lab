/**
 * This file handles:
 * - Loading embedding model
 * - Converting text into vector embeddings
 */

import { pipeline } from "@xenova/transformers";
import { normalize } from "path";

// singleton pattern - model only loads once
let embedder: any = null;

/**
 * Loads the embedding model if not already loaded
 */
async function getEmbedder(){
    if(!embedder){
        console.log("Loading embedding model...")

        embedder = await pipeline(
            "feature-extraction",
            "Xenova/all-MiniLM-L6-v2"
        )

        console.log("Embedding model loaded")
    }
    return embedder
}

/**
 * Converts text into embedding vector
 */
export async function createEmbedding(text: string): Promise<number []> {
    const model = await getEmbedder();

    const output = await model(text, {
        pooling: "mean",
        normalize: true,
    })

    return Array.from(output.data)
}