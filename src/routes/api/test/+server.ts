import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type') || '';
    console.log('Request content-type:', contentType);
    
    if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        
        // Log file details
        const fileInfo = {
          exists: !!file,
          type: file ? typeof file : 'none',
          isFile: file instanceof File,
          name: file instanceof File ? file.name : 'n/a',
          size: file instanceof File ? file.size : 0,
          contentType: file instanceof File ? file.type : 'n/a'
        };
        
        console.log('File details:', fileInfo);
        
        return json({
          success: true,
          message: 'File received',
          fileInfo
        });
      } catch (error) {
        console.error('Form data parsing error:', error);
        return json({ error: 'Failed to parse form data' }, { status: 400 });
      }
    }
    
    return json({ error: 'Not a multipart request' }, { status: 400 });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}; 