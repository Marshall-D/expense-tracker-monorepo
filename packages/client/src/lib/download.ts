/**
 * packages/client/src/lib/download.ts
 *
 * Utilities for taking an axios response / blob-like payload and
 * turning it into a client download.
 */

type AxiosLikeResponse = {
  data?: any;
  headers?: Record<string, string>;
};

export async function downloadResponseAsFile(
  resp: AxiosLikeResponse,
  fallbackFileName: string
): Promise<void> {
  const respData = (resp as any)?.data ?? resp;
  const headers = (resp as any)?.headers ?? {};

  let blob: Blob;
  if (respData instanceof Blob) {
    blob = respData;
  } else if (
    respData &&
    typeof respData === "object" &&
    respData.constructor?.name === "ArrayBuffer"
  ) {
    blob = new Blob([respData], {
      type: headers["content-type"] ?? "text/csv",
    });
  } else if (typeof respData === "string") {
    blob = new Blob([respData], {
      type: headers["content-type"] ?? "text/csv",
    });
  } else {
    blob = new Blob([JSON.stringify(respData)], {
      type: "application/json",
    });
  }

  const url = window.URL.createObjectURL(blob);

  const disp =
    headers["content-disposition"] ||
    headers["Content-Disposition"] ||
    undefined;

  let fileName = fallbackFileName;
  if (typeof disp === "string") {
    const m = disp.match(/filename="(.+)"/);
    if (m && m[1]) fileName = m[1];
    else {
      const m2 = disp.match(/filename\*=UTF-8''(.+)/i);
      if (m2 && m2[1]) fileName = decodeURIComponent(m2[1]);
    }
  }

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
