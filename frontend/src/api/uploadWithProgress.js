import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

/**
 * Sends a FormData upload and reports how much has gone up, which fetch() cannot do.
 * `onProgress(percent)` is called with whole numbers from 0 to 100. Errors are the same
 * ApiError (message + status) every other call in the app throws, so callers treat them alike.
 * A network failure comes back as status 0 with a plain-words message.
 */
export function uploadWithProgress(path, { method = "PUT", body, onProgress, fallback = "The upload failed. Please try again." }) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(method, `${API_BASE_URL}${path}`);
    request.withCredentials = true;

    if (onProgress) {
      request.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      };
    }

    request.onload = () => {
      let data = null;
      try {
        data = JSON.parse(request.responseText);
      } catch {
        // An empty or non-JSON body is fine for a success; the status decides.
      }

      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve(data);
      } else {
        reject(new ApiError(resolveErrorMessage({ status: request.status }, data, fallback), request.status));
      }
    };

    request.onerror = () => reject(new ApiError("Can't reach the server. Check your connection, then try again.", 0));
    request.ontimeout = () => reject(new ApiError("The upload took too long. Check your connection, then try again.", 0));
    request.onabort = () => reject(new ApiError("The upload was cancelled.", 0));

    request.send(body);
  });
}
