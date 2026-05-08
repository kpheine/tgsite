import type { APIRoute } from 'astro';
import { adminUrl, requireUser } from '../../../lib/auth';
import { AdminCaseError, createAdminCase } from '../../../lib/admin-cases';
import { parseCaseUploadRequest, UploadValidationError, type ParsedCaseUpload } from '../../../lib/uploads';

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!requireUser(cookies)) {
    return new Response(null, { status: 303, headers: { Location: adminUrl('login') } });
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

  try {
    createAdminCase(upload);
  } catch (error) {
    if (error instanceof AdminCaseError) return new Response(error.message, { status: error.status });
    throw error;
  }

  return new Response(null, { status: 303, headers: { Location: adminUrl('cases') } });
};
