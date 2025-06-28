import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { maskSensitiveDataRefined } from '@/lib/utils/masking-refined';
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache';

export async function POST(request: NextRequest) {
  try {
    // Check authentication using Bearer token
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate user
    const userProfile = await getAuthenticatedUserProfile(authorization, supabaseAdmin);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const text = formData.get('text') as string | null;
    const projectId = formData.get('projectId') as string;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!file && !text) {
      return NextResponse.json({ error: 'Either file or text is required' }, { status: 400 });
    }

    let originalContent = '';
    let fileName = '';

    // Process file upload
    if (file) {
      fileName = file.name;
      
      // Check file type
      const allowedTypes = ['text/plain', 'text/csv', 'application/vnd.ms-excel'];
      if (!allowedTypes.includes(file.type) && !fileName.endsWith('.txt')) {
        return NextResponse.json({ error: 'Invalid file type. Only text files are allowed.' }, { status: 400 });
      }

      // Read file content
      const arrayBuffer = await file.arrayBuffer();
      originalContent = new TextDecoder('utf-8').decode(arrayBuffer);
    } else if (text) {
      originalContent = text;
      fileName = `text_input_${Date.now()}.txt`;
    }

    // Mask filename if it contains PII
    const fileNameMaskingResult = maskSensitiveDataRefined(fileName);
    const maskedFileName = fileNameMaskingResult.detectedCount && Object.keys(fileNameMaskingResult.detectedCount).length > 0
      ? fileNameMaskingResult.maskedText
      : fileName;

    // Apply masking
    const maskingResult = maskSensitiveDataRefined(originalContent);

    // Save masked file to Supabase Storage (only if masking detected sensitive data)
    let fileUrl = null;
    if (Object.keys(maskingResult.detectedCount).length > 0) {
      const uploadFileName = `masked_${Date.now()}_${maskedFileName}`;
      const maskedBlob = new Blob([maskingResult.maskedText], { type: 'text/plain' });
      
      // Sanitize filename for Supabase Storage
      const sanitizedFileName = uploadFileName
        .replace(/[^a-zA-Z0-9가-힣.\-_\[\]]/g, '_') // Replace special characters with underscore (keep brackets for masked values)
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .slice(0, 100); // Limit length
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin
        .storage
        .from('interview-files')
        .upload(`projects/${projectId}/masked/${sanitizedFileName}`, maskedBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return NextResponse.json({ error: 'Failed to upload masked file' }, { status: 500 });
      }

      // Get public URL
      const { data: { publicUrl } } = supabaseAdmin
        .storage
        .from('interview-files')
        .getPublicUrl(`projects/${projectId}/masked/${sanitizedFileName}`);
      
      fileUrl = publicUrl;
    }

    // Combine detected counts from filename and content
    const combinedDetectedCount = { ...maskingResult.detectedCount };
    if (fileNameMaskingResult.detectedCount) {
      Object.entries(fileNameMaskingResult.detectedCount).forEach(([key, count]) => {
        combinedDetectedCount[`FILENAME_${key}`] = count;
      });
    }

    return NextResponse.json({
      success: true,
      originalLength: originalContent.length,
      maskedLength: maskingResult.maskedText.length,
      detectedCount: combinedDetectedCount,
      processingTime: maskingResult.processingTime,
      confidence: maskingResult.confidence,
      originalFileName: fileName,
      maskedFileName: maskedFileName,
      fileUrl,
      preview: maskingResult.maskedText
    });

  } catch (error) {
    console.error('Masking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}