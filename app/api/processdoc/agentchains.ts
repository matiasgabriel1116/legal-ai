import 'server-only';
import { z } from 'zod';
import { env, pipeline } from '@xenova/transformers'; // Corrected import

// Configure environment
env.localModelPath = './models'; // Local cache directory
env.allowRemoteModels = true; // Allow downloads if files missing

// ---- Text Generation Model ----
let _textModel: any = null;
const getTextModel = async () => {
  if (!_textModel) {
    try {
      _textModel = await pipeline('text-generation', 'Xenova/TinyLlama-1.1B-Chat-v1.0', {
        quantized: true, // Use 4-bit quantization
        revision: 'main',
        progress_callback: (progress) => {
          console.log(`Download Progress: ${progress.status} | ${progress.loaded}/${progress.total} bytes`);
        }
      });
    } catch (error) {
      console.error('Failed to load TinyLlama, falling back to Phi-2');
      _textModel = await pipeline('text-generation', 'Xenova/phi-2', {
        quantized: true // Fallback model
      });
    }
  }
  return _textModel;
};

// ---- Embedding Model ----
let _embeddingModel: any = null;
const getEmbeddingModel = async () => {
  if (!_embeddingModel) {
    _embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true, // Reduced memory usage
      progress_callback: (progress) => {
        console.log(`Embedding Model: ${progress.status}`);
      }
    });
  }
  return _embeddingModel;
};

const contentAnalysisSchema = z.object({
  preliminary_answer_1: z
    .string()
    .describe(
      'Generate a preliminary answer based on the provided text context. The answer should be a concise, informative response that addresses the specifics of the context under consideration. Responses must be tailored to provide clear, preliminary insights or guidance relevant to the presented scenario.'
    ),
  preliminary_answer_2: z
    .string()
    .describe(
      'Generate a second preliminary answer based on the provided text context. The answer should be a concise, informative response that addresses the specifics of the context under consideration. Responses must be tailored to provide clear, preliminary insights or guidance relevant to the presented scenario.'
    ),
  tags: z
    .array(z.string())
    .describe(
      'Identify and tag key concepts or topics within the provided text for categorization and indexing purposes. Each tag in the array represents a specific topic, theme, or concept found within the text, ensuring they accurately reflect the nuances and specifics of the subject matter being addressed.'
    ),
  hypothetical_question_1: z
    .string()
    .describe(
      'Generate a hypothetical question based on the provided text. The question should explore possible scenarios, implications, or considerations that arise from the content. Questions aim to provoke thought, analysis, or discussion on potential outcomes or interpretations.'
    ),
  hypothetical_question_2: z
    .string()
    .describe(
      'Generate a second hypothetical question based on the provided text. The question should explore possible scenarios, implications, or considerations that arise from the content. Questions aim to provoke thought, analysis, or discussion on potential outcomes or interpretations.'
    )
});

export const preliminaryAnswerChainAgent = async (
  content: string,
  userId: string
) => {
  const SystemPrompt =
    'Given the content provided below, perform a comprehensive analysis. Generate two preliminary answers, tag key concepts or topics, and generate two hypothetical questions. Ensure all outputs address specific elements mentioned in the text. Focus on interpreting key themes, implications of specific concepts, and potential real-life applications or consequences. Answers and questions should be detailed and thought-provoking. The output language should be in the same as the input text.';

  try {
    const model = await getTextModel();
    const response = await model(SystemPrompt + '\n\nContent: ' + content, {
      max_length: 1024,
      temperature: 0.3
    });

    // Parse the response into the schema format
    // Note: You might need to adjust this parsing based on your model's output format
    const result = contentAnalysisSchema.parse(JSON.parse(response[0].generated_text));
    
    return {
      object: result,
      usage: {
        promptTokens: content.length,
        completionTokens: response[0].generated_text.length
      }
    };
  } catch (error) {
    console.error('Error in preliminaryAnswerChainAgent:', error);
    throw error;
  }
};

const documentMetadataSchema = z.object({
  descriptiveTitle: z
    .string()
    .describe(
      'Generate a descriptive title that accurately represents the main topic or theme of the entire document.'
    ),
  shortDescription: z
    .string()
    .describe(
      'Provide a explanatory description that summarizes what the document is about, its key points, and its potential significance.'
    ),
  mainTopics: z
    .array(z.string())
    .describe('List up to 5 main topics or themes discussed in the document.'),
  keyEntities: z
    .array(z.string())
    .describe(
      'Identify up to 10 key entities (e.g., people, organizations, laws, concepts) mentioned in the document.'
    ),
  primaryLanguage: z
    .string()
    .describe('Identify the primary language used in the document content.')
});

export const generateDocumentMetadata = async (
  content: string,
  userId: string
) => {
  const SystemPrompt = `Analyze the provided document content thoroughly and generate comprehensive metadata. 
  Your task is to extract key information that will help in understanding the document's context, 
  relevance, and potential applications. This metadata will be used to provide context for AI-assisted 
  querying of document chunks, so focus on information that will be most useful for understanding 
  and answering questions about the document content.

  Remember, this metadata will be crucial in providing context for AI systems when answering user queries about the document.
  The output language should be in the same as the input text.
  
  Document: ${content}`;

  try {
    const model = await getTextModel();
    const response = await model(SystemPrompt + '\n\nContent: ' + content, {
      max_length: 1024,
      temperature: 0.3
    });

    // Extract JSON from response
    // const rawText = response[0].generated_text;
    // console.log("rawText from LLM => ", rawText)
    // const jsonStart = rawText.indexOf('{');
    // const jsonEnd = rawText.lastIndexOf('}') + 1;
    // const jsonString = rawText.slice(jsonStart, jsonEnd);
    // // Parse the response into the schema format
    // const result = documentMetadataSchema.parse(JSON.parse(jsonString));
    const result = response[0].generated_text;
    
    return {
      object: result,
      usage: {
        promptTokens: content.length,
        completionTokens: result
      },
      // finishReason: 'length' // This is a simplification; you might want to get this from the model response
    };
  } catch (error) {
    console.error('Error in generateDocumentMetadata:', error);
    throw error;
  }
};

// Helper function to generate embeddings
export const generateEmbeddings = async (text: string) => {
  try {
    const extractor = await getEmbeddingModel();
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true
    });
    return Array.from(output.data);
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
};