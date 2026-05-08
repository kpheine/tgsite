import type { APIRoute } from 'astro';
import { adminUrl, requireUser } from '../../../../lib/auth';
import { AdminCaseError, deleteAdminCase, updateAdminCase } from '../../../../lib/admin-cases';
import { cleanupUploadedFiles, fieldValue, parseCaseUploadRequest, UploadValidationError, type ParsedCaseUpload } from '../../../../lib/uploads';

export const POST: APIRoute = async ({ params, request, cookies }) => {
  if (!requireUser(cookies)) {
    return new Response(null, { status: 303, headers: { Location: adminUrl('login') } });
  }

  const caseId = Number(params.id);
  if (!Number.isInteger(caseId)) return new Response('Não encontrado', { status: 404 });

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    if (formData.get('_action') === 'delete') {
      try {
        deleteAdminCase(caseId);
      } catch (error) {
        if (error instanceof AdminCaseError) return new Response(error.message, { status: error.status });
        throw error;
      }

      return new Response(null, { status: 303, headers: { Location: adminUrl('cases') } });
    }

    return new Response('Envio inválido', { status: 400 });
  }

  let upload: ParsedCaseUpload;
  try {
    upload = await parseCaseUploadRequest(request);
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return new Response(error.message, { status: 400 });
    }

    throw error;
  }

  if (fieldValue(upload, '_action') === 'delete') {
    cleanupUploadedFiles(upload.uploadedUrls);

    try {
      deleteAdminCase(caseId);
    } catch (error) {
      if (error instanceof AdminCaseError) return new Response(error.message, { status: error.status });
      throw error;
    }

    return new Response(null, { status: 303, headers: { Location: adminUrl('cases') } });
  }

  try {
    updateAdminCase(caseId, upload);
  } catch (error) {
    if (error instanceof AdminCaseError) return new Response(error.message, { status: error.status });
    throw error;
  }

  return new Response(null, { status: 303, headers: { Location: adminUrl('cases') } });
};
