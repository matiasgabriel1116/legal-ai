import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/supabase';
import { createAdminClient } from '@/lib/server/admin';
import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import {
  preliminaryAnswerChainAgent,
  generateDocumentMetadata,
  generateEmbeddings
} from './agentchains';
import { pipeline } from '@xenova/transformers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function sanitizeFilename(filename: string): string {
  // Fallback for missing String.prototype.normalize
  console.log("@@@ filename => ", filename  )
  const normalized = typeof filename.normalize === 'function' 
    ? filename.normalize('NFD') 
    : filename;
  
  return normalized
    .replace(/[^\w.-]/g, '_') // Combined replacement
    .replace(/_+/g, '_')      // Collapse multiple underscores
    .replace(/^_+|_+$/g, ''); // Trim leading/trailing underscores
}

interface DocumentRecord {
  user_id: string;
  embedding: string;
  text_content: string;
  title: string;
  timestamp: string;
  ai_title: string;
  ai_description: string;
  ai_maintopics: string[];
  ai_keyentities: string[];
  primary_language: string;
  filter_tags: string;
  page_number: number;
  total_pages: number;
  chunk_number: number;
  total_chunks: number;
}

async function processFile(pages: string[], fileName: string, userId: string) {
  let selectedDocuments = pages;
  console.log("@@@ processFile->fileName => ", fileName)
  if (pages.length > 19) {
    selectedDocuments = [...pages.slice(0, 10), ...pages.slice(-10)];
  }

  const combinedDocumentContent = selectedDocuments.join('\n\n');
  const { object } = await generateDocumentMetadata(
    combinedDocumentContent,
    userId
  );

  console.log('@@@ Document metadata object:', object); // Add this to verify structure

  const now = new TZDate(new Date(), 'Europe/Copenhagen');
  const timestamp = format(now, 'yyyy-MM-dd');
  const sanitizedFilename = sanitizeFilename(fileName);
  const filterTags = `${sanitizedFilename}[[${timestamp}]]`;
  const totalPages = pages.length;

  const processingBatchSize = 100;
  const upsertBatchSize = 100;

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  const chunks = <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  const pageChunks = chunks(pages, processingBatchSize);
  console.log('Processing page chunks:', pageChunks.length);
  const supabase = createAdminClient();

  for (let chunkIndex = 0; chunkIndex < pageChunks.length; chunkIndex++) {
    console.log(`Processing chunk ${chunkIndex + 1} of ${pageChunks.length}`);
    const batch = pageChunks[chunkIndex];
    let batchRecords: DocumentRecord[] = [];

    await Promise.all(
      batch.map(async (doc: string, index: number) => {
        if (!doc) {
          console.error('Document is undefined, skipping document');
          return;
        }

        const pageNumber = chunkIndex * processingBatchSize + index + 1;
        console.log(`Processing page ${pageNumber} of ${totalPages}`);

        try {
          const { combinedPreliminaryAnswers, usage } =
            await processDocumentWithAgentChains(
              doc,
              object.descriptiveTitle,
              object.shortDescription,
              object.mainTopics || [],
              userId
            );

          totalPromptTokens += usage.promptTokens;
          totalCompletionTokens += usage.completionTokens;

          const combinedContent = combinedPreliminaryAnswers
            ? `
      File Name: ${fileName}
      Date: ${timestamp}
      Page: ${pageNumber} of ${totalPages}
      Title: ${object.descriptiveTitle}
      Description: ${object.shortDescription}
      Main Topics: ${object.mainTopics}
      Key Entities: ${object.keyEntities}
      
      Content:
      ${doc}
      
      Preliminary Analysis:
      ${combinedPreliminaryAnswers}
      `
            : `
      File Name: ${fileName}
      Date: ${timestamp}
      Page: ${pageNumber} of ${totalPages}
      Title: ${object.descriptiveTitle}
      
      Content:
      ${doc}
      `;

          try {
            // Use the generateEmbeddings function from agentchains
            const embedding = await generateEmbeddings(combinedContent);
            
            if (!embedding) {
              console.log('No embedding generated, skipping document');
              return;
            }

            batchRecords.push({
              user_id: userId,
              embedding: JSON.stringify(embedding), // Stringify the array
              text_content: doc,
              title: fileName,
              timestamp,
              ai_title: object.descriptiveTitle,
              ai_description: object.shortDescription,
              ai_maintopics: object.mainTopics,
              ai_keyentities: object.keyEntities,
              primary_language: object.primaryLanguage,
              filter_tags: filterTags,
              page_number: pageNumber,
              total_pages: totalPages,
              chunk_number: 1,
              total_chunks: 1
            });
          } catch (embedError) {
            console.error(
              `Error generating embedding for page ${pageNumber}:`,
              embedError
            );
          }
        } catch (error) {
          console.error(`Error processing document page: ${pageNumber}`, error);
        }
      })
    );

    if (batchRecords.length > 0) {
      const upsertBatches = chunks(batchRecords, upsertBatchSize);
      console.log(`Processing ${upsertBatches.length} upsert batches`);

      for (const batch of upsertBatches) {
        try {
          console.log(`Upserting batch of ${batch.length} records`);
          const { error } = await supabase
            .from('vector_documents')
            .upsert(batch, {
              onConflict: 'user_id, title, timestamp, page_number, chunk_number',
              ignoreDuplicates: false
            });

          if (error) {
            console.error('Error upserting batch to Supabase:', error);
          } else {
            console.log(
              `Successfully upserted batch of ${batch.length} records`
            );
          }
        } catch (error) {
          console.error('Error upserting batch to Supabase:', error);
        }
      }
    } else {
      console.warn('No records to upsert for this batch');
    }

    batchRecords = [];
  }

  console.log('Final Token Usage:', totalPromptTokens, totalCompletionTokens);
  return filterTags;
}

async function processDocumentWithAgentChains(
  doc: string,
  ai_title: string,
  ai_description: string,
  ai_maintopics: string[],
  userId: string
): Promise<{
  combinedPreliminaryAnswers: string;
  usage: { promptTokens: number; completionTokens: number };
}> {

  console.log("@@@ ai_maintopics => ", ai_maintopics);
  const prompt = `
  Title: ${ai_title}
  Description: ${ai_description}
  ${ai_maintopics ? `Main Topics: ${ai_maintopics.join(', ')}` : ''}
  Document: ${doc}
  `;

  console.log("@@@ prompt => ", prompt);

  try {
    const result = await preliminaryAnswerChainAgent(prompt, userId);

    const { object, usage } = result;
    console.log('Result:', object);
    const tagTaxProvisions = object.tags?.join(', ') || '';

    const combinedPreliminaryAnswers = [
      object.preliminary_answer_1,
      object.preliminary_answer_2,
      tagTaxProvisions,
      object.hypothetical_question_1,
      object.hypothetical_question_2
    ].join('\n');
    return {
      combinedPreliminaryAnswers,
      usage: {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens
      }
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Processing timeout after 15 seconds'
    ) {
      console.log('Skipping document processing due to timeout');
    } else {
      console.error(`Error processing document with agent chains: ${error}`);
    }

    return {
      combinedPreliminaryAnswers: '',
      usage: {
        promptTokens: 0,
        completionTokens: 0
      }
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      );
    }

    const userId = session.id;

    const { jobId, fileName } = await req.json();

    console.log("@@@ req->fileName => ", fileName)

    // Check if we're using Llama Cloud or local processing
    if (process.env.LLAMA_CLOUD_API_KEY) {
      const markdownResponse = await fetch(
        `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/markdown`,
        {
          headers: {
            Authorization: `Bearer ${process.env.LLAMA_CLOUD_API_KEY}`,
            Accept: 'application/json'
          }
        }
      );

      if (!markdownResponse.ok) {
        console.error(
          'Failed to get Markdown result:',
          markdownResponse.statusText
        );
        return NextResponse.json(
          {
            error: `Failed to get Markdown result: ${markdownResponse.statusText}`
          },
          { status: 500 }
        );
      }

      const markdown = await markdownResponse.text();
      const pages = markdown
        .split('\\n---\\n')
        .map((page) => page.trim())
        .filter((page) => page !== '');
      
      const filterTags = await processFile(pages, fileName, userId);
      return NextResponse.json({ status: 'SUCCESS', filterTags });
    } else {
      // Local file processing (if you implement this later)
      return NextResponse.json(
        { error: 'Local file processing not yet implemented' },
        { status: 501 }
      );
    }
  } catch (error) {
    console.error('Error in POST request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}