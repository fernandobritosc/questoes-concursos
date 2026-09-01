/**
 * LS Concurso - Extrator de Metas (Background Service Worker)
 *
 * Faz os fetch ao backend fora do contexto da página para evitar o bloqueio
 * de mixed content (página https do LS -> backend http://204.216.111.13:3000).
 *
 * Protocolo (chrome.runtime.sendMessage):
 *   { type: "monitorpro_fetch", url, method, headers?, body? }
 * Resposta:
 *   { ok, status, statusText, bodyText }
 */

const BACKEND_URL = "http://204.216.111.13:3000";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "monitorpro_fetch") {
    return false;
  }

  (async () => {
    try {
      const url = message.url.startsWith("http")
        ? message.url
        : `${BACKEND_URL}${message.url}`;
      const res = await fetch(url, {
        method: message.method || "GET",
        headers: message.headers || {},
        ...(message.body !== undefined ? { body: message.body } : {})
      });
      const bodyText = await res.text();
      sendResponse({
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        bodyText
      });
    } catch (err) {
      sendResponse({
        ok: false,
        status: 0,
        statusText: err && err.message ? err.message : String(err),
        bodyText: ""
      });
    }
  })();

  return true;
});