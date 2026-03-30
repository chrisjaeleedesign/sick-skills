/**
 * Embedding generation service using OpenAI text-embedding-3-small (1536 dims).
 * Graceful degradation: returns null if no API key is configured.
 */

const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMS = 1536;

/**
 * Generates an embedding vector for the given text using OpenAI's API.
 * Returns null if OPENAI_API_KEY is not set or the API call fails.
 */
export async function generateEmbedding(text: string): Promise<Float32Array | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
        dimensions: EMBEDDING_DIMS,
      }),
    });

    if (!response.ok) {
      console.error(`Embedding API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding as number[] | undefined;
    if (!embedding || embedding.length !== EMBEDDING_DIMS) {
      console.error("Unexpected embedding response format");
      return null;
    }

    return new Float32Array(embedding);
  } catch (err) {
    console.error("Embedding generation failed:", err);
    return null;
  }
}
