// packages/client/src/lib/download.ts
/**
 * Utilities to convert an axios response or raw data into a downloaded file
 * in the browser.
 */

type AxiosLikeResponse = {
  data?: any;
  headers?: Record<string, string>;
};

export async function downloadResponseAsFile(
  resp: AxiosLikeResponse,
  fallbackFileName: string,
): Promise<void> {
  // 1) normalize response data + headers
  const respData = (resp as any)?.data ?? resp;
  const headers = (resp as any)?.headers ?? {};

  // 2) build a Blob from the response data depending on its runtime shape
  let blob: Blob;
  if (respData instanceof Blob) {
    blob = respData;
  } else if (
    respData &&
    typeof respData === "object" &&
    respData.constructor?.name === "ArrayBuffer"
  ) {
    // some libs return ArrayBuffer for binary responses
    blob = new Blob([respData], {
      type: headers["content-type"] ?? "text/csv",
    });
  } else if (typeof respData === "string") {
    blob = new Blob([respData], {
      type: headers["content-type"] ?? "text/csv",
    });
  } else {
    // fallback: stringify JSON
    blob = new Blob([JSON.stringify(respData)], {
      type: "application/json",
    });
  }

  // 3) create object URL and derive filename from Content-Disposition if present
  const url = window.URL.createObjectURL(blob);

  const disp =
    headers["content-disposition"] ||
    headers["Content-Disposition"] ||
    undefined;

  let fileName = fallbackFileName;
  if (typeof disp === "string") {
    // try common filename patterns
    const m = disp.match(/filename="(.+)"/);
    if (m && m[1]) fileName = m[1];
    else {
      const m2 = disp.match(/filename\*=UTF-8''(.+)/i);
      if (m2 && m2[1]) fileName = decodeURIComponent(m2[1]);
    }
  }

  // 4) create and click anchor to trigger download then cleanup
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
