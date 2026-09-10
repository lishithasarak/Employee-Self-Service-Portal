const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');

  const isFormData =
    typeof FormData !== 'undefined' &&
    options.body instanceof FormData;

  const headers = {
    ...options.headers,
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type');

    const data =
      contentType && contentType.includes('application/json')
        ? await response.json()
        : null;

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');

      window.location.href = '/login';

      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      throw new Error(
        data?.message || `HTTP Error: ${response.status}`
      );
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'An error occurred');
  }
};

export const apiGet = (endpoint) => {
  return apiCall(endpoint, {
    method: 'GET',
  });
};

export const apiPost = (endpoint, body) => {
  return apiCall(endpoint, {
    method: 'POST',
    body:
      body instanceof FormData
        ? body
        : JSON.stringify(body),
  });
};

export const apiPut = (endpoint, body) => {
  return apiCall(endpoint, {
    method: 'PUT',
    body:
      body instanceof FormData
        ? body
        : JSON.stringify(body),
  });
};

export const apiDelete = (endpoint) => {
  return apiCall(endpoint, {
    method: 'DELETE',
  });
};
