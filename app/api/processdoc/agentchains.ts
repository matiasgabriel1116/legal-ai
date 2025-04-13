import 'server-only';
import { z } from 'zod';
import { env, pipeline } from '@xenova/transformers';
import type { Pipeline } from '@xenova/transformers';

// ===== Type Definitions ===== //
interface TextModelConfig {
  quantized: boolean;
  revision?: string;
  model_file?: string;
  config_file?: string;
  tokenizer_file?: string;
  progress_callback?: (progress: ProgressData) => void;
  [key: string]: unknown; // For additional options
}

interface EmbeddingModelConfig {
  quantized: boolean;
  model_file?: string;
  config_file?: string;
  tokenizer_file?: string;
  pooling?: 'mean' | 'max';
  normalize?: boolean;
  progress_callback?: (progress: ProgressData) => void;
  [key: string]: unknown;
}

interface ProgressData {
  status: string;
  loaded: number;
  total: number;
}

// ===== Configuration ===== //
env.localModelPath = './models';
env.allowRemoteModels = false; // Default to local-only
env.allowLocalModels = true;
env.backends.onnx.wasm.numThreads = 1;

// ===== Model Cache ===== //
let _textModel: Pipeline | null = null;
let _embeddingModel: Pipeline | null = null;

// ===== Text Generation Model ===== //
const getTextModel = async (): Promise<Pipeline> => {
  if (!_textModel) {
    const modelName = 'Xenova/TinyLlama-1.1B-Chat-v1.0';
    const fallbackModel = 'Xenova/phi-2';

    const loadModel = async (model: string, config: TextModelConfig): Promise<Pipeline> => {
      try {
        console.log(`Attempting to load ${model}...`);
        return await pipeline('text-generation', model, config);
      } catch (error) {
        console.error(`Failed to load ${model}:`, error);
        throw error;
      }
    };

    const localConfig: TextModelConfig = {
      quantized: true,
      revision: 'main',
      model_file: 'model_q4f16.onnx',
      config_file: 'config.json',
      tokenizer_file: 'tokenizer.json',
      progress_callback: (progress) => {
        if (progress.status === 'progress') {
          console.log(`Loading progress: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
        }
      }
    };

    try {
      _textModel = await loadModel(modelName, localConfig);
    } catch (localError) {
      console.warn('Local load failed, attempting download...');
      try {
        env.allowRemoteModels = true;
        _textModel = await loadModel(modelName, {
          ...localConfig,
          revision: 'main'
        });
      } catch (remoteError) {
        console.warn('Download failed, falling back to Phi-2...');
        _textModel = await loadModel(fallbackModel, localConfig);
      } finally {
        env.allowRemoteModels = false;
      }
    }
  }
  return _textModel;
};

// ===== Embedding Model ===== //
const getEmbeddingModel = async (): Promise<Pipeline> => {
  if (!_embeddingModel) {
    const modelName = 'asafaya/bert-large-arabic';
    const fallbackModel = 'danfeg/ArabicBERT_Base'; // Smaller Arabic alternative

    const loadModel = async (model: string, config: EmbeddingModelConfig): Promise<Pipeline> => {
      try {
        console.log(`Loading ${model}...`);
        return await pipeline('feature-extraction', model, {
          ...config,
          revision: 'safeGenesis' // Use the safe variant if available
        });
      } catch (error) {
        console.error(`Failed to load ${model}:`, error);
        throw error;
      }
    };

    const localConfig: EmbeddingModelConfig = {
      quantized: true,
      model_file: 'model.safetensors', 
      config_file: 'config.json',
      tokenizer_file: 'vocab.txt', 
      pooling: 'mean',
      normalize: true,
      progress_callback: (progress) => {
        if (progress.status === 'progress') {
          console.log(`Progress: ${(progress.loaded / (progress.total || 1.35e9) * 100).toFixed(1)}%`);
        }
      }
    };

    try {
      // First try loading locally with quantization
      _embeddingModel = await loadModel(modelName, localConfig);
    } catch (localError) {
      console.warn('Local load failed, attempting download...');
      try {
        env.allowRemoteModels = true;
        
        // Try with safeGenesis variant first
        _embeddingModel = await loadModel(modelName, {
          ...localConfig,
          revision: 'safeGenesis',
          model_file: undefined,
          config_file: undefined,
          tokenizer_file: undefined
        });
      } catch (remoteError) {
        console.warn('Main model failed, falling back to AraBERT...');
        _embeddingModel = await loadModel(fallbackModel, {
          quantized: true,
          pooling: 'mean',
          normalize: true
        });
      } finally {
        env.allowRemoteModels = false;
      }
    }
  }
  return _embeddingModel;
};
// ===== Utilities ===== //
export const clearModelCache = (): void => {
  _textModel = null;
  _embeddingModel = null;
  console.log('Model cache cleared');
};

export const getModelStatus = () => ({
  textModelLoaded: !!_textModel,
  embeddingModelLoaded: !!_embeddingModel
});

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
  const SystemPrompt = `
    You are an advanced content analysis assistant. Analyze the provided text and generate a JSON output with the following components:

    1. **Preliminary Answers** (2 required):
      - "preliminary_answer_1": A concise, informative response addressing the core specifics of the text. Provide clear, actionable insights or guidance directly tied to the context.
      - "preliminary_answer_2": A second preliminary answer offering an alternative perspective or additional nuance. Avoid repetition.

    2. **Tags**:
      - "tags": An array of strings identifying key topics, themes, or concepts in the text. Ensure tags are specific, relevant, and non-redundant.

    3. **Hypothetical Questions** (2 required):
      - "hypothetical_question_1": A thought-provoking question exploring implications, edge cases, or future scenarios derived from the text.
      - "hypothetical_question_2": A second question probing deeper into assumptions, alternatives, or interdisciplinary connections.

    **Rules**:
    - Output MUST be valid JSON. Do not include markdown, code fences, or explanatory text.
    - Answers must be grounded in the provided content, not generic.
    - Hypothetical questions should be plausible and stimulate further analysis.

    Example output (strictly follow this format):
    {
      "preliminary_answer_1": "...",
      "preliminary_answer_2": "...",
      "tags": ["tag1", "tag2"],
      "hypothetical_question_1": "...",
      "hypothetical_question_2": "..."
    }

    Content to analyze:
    ${content}
    `;

  try {
    const model = await getTextModel();
    const response = await model(SystemPrompt + '\n\nContent: ' + content, {
      max_length: 1024,
      temperature: 0.2
    });

    // Parse the response into the schema format
    // Note: You might need to adjust this parsing based on your model's output format
    console.log("@@@ response => ", response);
    const result = contentAnalysisSchema.parse(response[0].generated_text);
    
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
  const SystemPrompt = `
    DOCUMENT METADATA EXTRACTION PROTOCOL
    
    INSTRUCTIONS:
    1. ANALYZE the document content thoroughly
    2. EXTRACT metadata according to the SPECIFIED SCHEMA
    3. OUTPUT must be PRECISE JSON following this STRUCTURE:
      {
        "descriptiveTitle": string,    // 8-12 word title capturing essence
        "shortDescription": string,    // 1-3 sentence comprehensive summary
        "mainTopics": string[],        // 3-5 principal themes (sorted by prominence)
        "keyEntities": string[],       // 5-10 significant named entities
        "primaryLanguage": string      // ISO 639-1 language code
      }

    CONTENT REQUIREMENTS:
    - Titles should be headline-style (no ending punctuation)
    - Descriptions should be complete sentences
    - Topics should be noun phrases
    - Entities should be proper nouns/concepts
    - Language detection should be ISO compliant

    DOCUMENT CONTENT (truncated):
    ${JSON.stringify(content)}`;

    try {
      const model = await getTextModel();
      const response = await model(SystemPrompt, {
        max_length: 1024,
        temperature: 0.2,
        do_sample: false
      });
  
      console.log("Raw response from the model:", response);
  
      const rawText = response[0].generated_text;
  
      // Attempt to extract JSON using regular expression
      const jsonMatch = rawText.match(/{.*}/s); // Match JSON from the start of the first curly brace to the last
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
  
      const jsonString = jsonMatch[0]; // Extract the matched JSON string
      console.log("Extracted JSON:", jsonString);
  
      let parsedJson;
      try {
        parsedJson = JSON.parse(jsonString);
      } catch (error) {
        throw new Error(`Error parsing JSON: ${error.message}`);
      }
  
      console.log("Parsed JSON before schema validation:", parsedJson);
  
      // Now validate with the schema
      try {
        const result = documentMetadataSchema.parse(parsedJson);
        console.log("@@@ result from schema => ", result);
  
        return {
          object: result,
          usage: {
            promptTokens: content.length,
            completionTokens: response[0].generated_text.length
          }
        };
      } catch (schemaError) {
        console.error('Error validating the parsed JSON with schema:', schemaError);
        throw new Error(`Schema validation failed: ${schemaError.message}`);
      }
    } catch (error) {
      console.error('Error in generateDocumentMetadata:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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