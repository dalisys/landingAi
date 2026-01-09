const API_BASE_URL = 'http://localhost:3001';

// Save a base64 image to a file via backend API
export const saveImage = async (base64Data: string, filename: string, projectId?: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/save-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base64Data, filename, projectId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save image: ${response.statusText}`);
    }

    const data = await response.json();
    return data.url; // Returns /generated-images/[projectId]/filename.png
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
};


// Generate a unique filename
export const generateFilename = (prefix: string, extension: string = 'png'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}.${extension}`;
};
