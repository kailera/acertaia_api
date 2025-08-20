import { Index, Pinecone, RecordMetadata } from "@pinecone-database/pinecone";
import { BaseMessage, BaseRetriever, RetrieveOptions } from "@voltagent/core";
import { CohereClientV2 } from "cohere-ai";

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
  sourceTag: "endomarketing",
});

const indexName = "endomarketing-knowledge-base";

async function initializeIndex() {
  try {
    let indexExists = false;
    try {
      await pc.describeIndex(indexName);
      indexExists = true;
    } catch (error) {
      console.log(`Criando new Index ${indexName}...`);
    }

    if (!indexExists) {
      await pc.createIndex({
        name: indexName,
        dimension: 1024,
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1",
          },
        },
        waitUntilReady: true,
      });
    }
    const index = pc.index(indexName);

    const stats = await index.describeIndexStats();
    if (stats.totalRecordCount === 0) {
      await populateWithSampleData(index);
    }
  } catch (e) {
    console.error("Error initializing Pinecone index:", e);
  }
}

function populateWithSampleData(index: Index<RecordMetadata>) {
  throw new Error("Function not implemented.");
}

async function retrieveDocuments(query: string, topK = 3) {
  try {
    // Generate embedding for the query
    const cohere = new CohereClientV2({
      token: process.env.COHERE_API_KEY!,
    });

    const embeddingResponse = await cohere.embed({
      model: "embed-v4.0",
      inputType: "search_query",
      texts: [query],
    });

    const queryVector = embeddingResponse.embeddings.float?.[0];

    if (!queryVector) {
      throw new Error("Falha ao gerar embedding");
    }
    // Search the index
    const index = pc.index(indexName);
    const searchResults = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      includeValues: false,
    });

    // Format results
    return (
      searchResults.matches?.map((match) => ({
        content: match.metadata?.text || "",
        metadata: match.metadata || {},
        score: match.score || 0,
        id: match.id,
      })) || []
    );
  } catch (error) {
    console.error("Error retrieving documents:", error);
    return [];
  }
}

export class PineconeRetriever extends BaseRetriever {
  async retrieve(
    input: string | BaseMessage[],
    options: RetrieveOptions
  ): Promise<string> {
    // Convert input to searchable string
    let searchText = "";

    if (typeof input === "string") {
      searchText = input;
    } else if (Array.isArray(input) && input.length > 0) {
      const lastMessage = input[input.length - 1];

      if (Array.isArray(lastMessage.content)) {
        const textParts = lastMessage.content
          .filter((part: any) => part.type === "text")
          .map((part: any) => part.text);
        searchText = textParts.join(" ");
      } else {
        searchText = lastMessage.content as string;
      }
    }

    // Perform semantic search
    const results = await retrieveDocuments(searchText, 3);

    // Add references to userContext for tracking
    if (options.userContext && results.length > 0) {
      const references = results.map((doc: any, index: number) => ({
        id: doc.id,
        title: doc.metadata.topic || `Document ${index + 1}`,
        source: "Pinecone Knowledge Base",
        score: doc.score,
        category: doc.metadata.category,
      }));

      options.userContext.set("references", references);
    }

    // Format results for the LLM
    if (results.length === 0) {
      return "No relevant documents found in the knowledge base.";
    }

    return results
      .map(
        (doc: any, index: number) =>
          `Document ${index + 1} (ID: ${doc.id}, Score: ${doc.score.toFixed(
            4
          )}, Category: ${doc.metadata.category}):\n${doc.content}`
      )
      .join("\n\n---\n\n");
  }
}

export const retriever = new PineconeRetriever();
