const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${host}:5000/api`;
};

export const API_BASE_URL = getBaseUrl();

export const getAuthToken = () => localStorage.getItem('token');

export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response;
};

export const buildDownloadUrl = (endpointWithParams) => {
  const token = getAuthToken();
  const separator = endpointWithParams.includes('?') ? '&' : '?';
  return `${API_BASE_URL}${endpointWithParams}${token ? `${separator}token=${encodeURIComponent(token)}` : ''}`;
};

export const triggerFileDownload = async (endpoint, fallbackFileName) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    let message = 'Download failed';
    try {
      const errJson = await response.json();
      message = errJson.message || message;
    } catch {
      // ignore non-json error
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  let fileName = fallbackFileName || 'download';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  if (match && match[1]) {
    fileName = match[1];
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
