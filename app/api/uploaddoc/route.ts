import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/supabase';
import { createAdminClient } from '@/lib/server/admin';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface UploadRequest {
  name: string;
  path: string;
}

interface SuccessResponse {
  file: string;
  status: 'success';
  jobId: string;
}

interface ErrorResponse {
  file: string;
  status: 'error';
  message: string;
}

type UploadResponse = SuccessResponse | ErrorResponse;

const supabaseAdmin = createAdminClient();

export async function POST(req: NextRequest) {
  // Debug: Log the incoming request
  console.log('[uploaddoc] Incoming request');

  try {
    // Validate environment configuration
    if (!process.env.LLAMA_CLOUD_API_KEY) {
      const errorMsg = 'LLAMA_CLOUD_API_KEY is not configured';
      console.error('[uploaddoc]', errorMsg);
      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      );
    }

    // Validate session
    const session = await getSession();
    if (!session) {
      const errorMsg = 'No active session found';
      console.error('[uploaddoc]', errorMsg);
      return NextResponse.json(
        { error: errorMsg },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let requestBody: { name?: string; path?: string } | undefined;;
    try {
      requestBody = await req.json();
      console.debug('[uploaddoc] Request body:', JSON.stringify(requestBody, null, 2));
      
      if (!requestBody?.name || !requestBody.path) {
        throw new Error('Missing required fields: name and path');
      }
    } catch (parseError) {
      const errorMsg = 'Invalid request body';
      console.error('[uploaddoc] Error parsing request body:', parseError);
      return NextResponse.json<ErrorResponse>(
        { 
          file: requestBody?.name || 'unknown', 
          status: 'error', 
          message: errorMsg 
        },
        { status: 400 }
      );
    }

    const { name, path } = requestBody;

    // Download file from Supabase
    console.debug(`[uploaddoc] Downloading file from path: ${path}`);
    let fileData: Blob;
    try {
      const { data, error } = await supabaseAdmin.storage
        .from('userfiles')
        .download(path);

      if (error || !data) {
        const errorMsg = error?.message || 'Unknown download error';
        console.error('[uploaddoc] Download failed:', errorMsg);
        return NextResponse.json<ErrorResponse>(
          { 
            file: name, 
            status: 'error', 
            message: `File download failed: ${errorMsg}` 
          },
          { status: 500 }
        );
      }
      fileData = data;
    } catch (downloadError) {
      const errorMsg = downloadError instanceof Error ? downloadError.message : 'Unknown download error';
      console.error('[uploaddoc] Download error:', errorMsg);
      return NextResponse.json<ErrorResponse>(
        { 
          file: name, 
          status: 'error', 
          message: `File download failed: ${errorMsg}` 
        },
        { status: 500 }
      );
    }

    // Upload to Llama Cloud
    console.debug(`[uploaddoc] Uploading file ${name} to Llama Cloud`);
    try {
      const formData = new FormData();
      formData.append('file', new Blob([fileData]), name);

      const uploadResponse = await fetch(
        'https://api.cloud.llamaindex.ai/api/v1/parsing/upload',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.LLAMA_CLOUD_API_KEY}`,
            Accept: 'application/json'
          },
          body: formData
        }
      );

      if (!uploadResponse.ok) {
        const errorMsg = `Llama Cloud upload failed: ${uploadResponse.statusText} (${uploadResponse.status})`;
        console.error('[uploaddoc]', errorMsg);
        return NextResponse.json<ErrorResponse>(
          { 
            file: name, 
            status: 'error', 
            message: errorMsg 
          },
          { status: 502 } // Bad Gateway
        );
      }

      const uploadResult = await uploadResponse.json();
      console.debug('[uploaddoc] Llama Cloud response:', JSON.stringify(uploadResult, null, 2));

      if (!uploadResult.id) {
        const errorMsg = 'Invalid response from Llama Cloud: missing job ID';
        console.error('[uploaddoc]', errorMsg);
        return NextResponse.json<ErrorResponse>(
          { 
            file: name, 
            status: 'error', 
            message: errorMsg 
          },
          { status: 502 }
        );
      }

      // Success response
      console.debug(`[uploaddoc] Successfully processed file ${name}, jobId: ${uploadResult.id}`);
      return NextResponse.json<SuccessResponse>(
        { 
          file: name, 
          status: 'success', 
          jobId: uploadResult.id 
        },
        { status: 200 }
      );

    } catch (uploadError) {
      const errorMsg = uploadError instanceof Error ? uploadError.message : 'Unknown upload error';
      console.error('[uploaddoc] Upload error:', errorMsg);
      return NextResponse.json<ErrorResponse>(
        { 
          file: name, 
          status: 'error', 
          message: `File upload failed: ${errorMsg}` 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown server error';
    console.error('[uploaddoc] Unexpected error:', errorMsg, error);
    return NextResponse.json(
      { 
        error: `Internal server error: ${errorMsg}` 
      },
      { status: 500 }
    );
  }
}