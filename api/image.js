const ALLOWED_ORIGIN = "https://ws-kingbr-jpg.github.io";

const ALLOWED_HOSTS = new Set([
  "cf.shopee.com.br",
  "cf.shopee.co.th",
  "cf.shopee.com",
  "cf.shopee.com.my",
  "cf.shopee.ph",
  "cf.shopee.sg",
  "cf.shopee.tw"
]);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Método não permitido."
    });
  }

  try {
    const raw = typeof req.query?.url === "string"
      ? req.query.url
      : "";

    if (!raw) {
      return res.status(400).json({
        ok: false,
        error: "URL da imagem não informada."
      });
    }

    const target = new URL(raw);

    if (
      target.protocol !== "https:" ||
      !ALLOWED_HOSTS.has(target.hostname)
    ) {
      return res.status(403).json({
        ok: false,
        error: "Domínio de imagem não autorizado."
      });
    }

    const upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 Super-Achados/1.0",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      }
    });

    if (!upstream.ok) {
      return res.status(502).json({
        ok: false,
        error: "A Shopee não disponibilizou a imagem agora."
      });
    }

    const type = upstream.headers.get("content-type") || "image/jpeg";

    if (!type.startsWith("image/")) {
      return res.status(502).json({
        ok: false,
        error: "Resposta inválida para imagem."
      });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    const dataUrl =
      `data:${type};base64,${buffer.toString("base64")}`;

    return res.status(200).json({
      ok: true,
      contentType: type,
      dataUrl
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Erro ao carregar imagem.",
      message: error?.message || ""
    });
  }
}
