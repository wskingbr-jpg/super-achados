const ALLOWED_ORIGIN = "https://ws-kingbr-jpg.github.io";

const ALLOWED_HOSTS = new Set([
  "cf.shopee.com.br",
  "cf.shopee.co.th",
  "cf.shopee.com",
  "cf.shopee.com.my",
  "cf.shopee.ph",
  "cf.shopee.sg",
  "cf.shopee.tw",
  "susercontent.com",
  "down-br.img.susercontent.com",
  "down-id.img.susercontent.com",
  "down-vn.img.susercontent.com",
  "down-th.img.susercontent.com",
  "down-my.img.susercontent.com",
  "down-ph.img.susercontent.com"
]);

export default async function handler(req, res) {

  res.setHeader(
    "Access-Control-Allow-Origin",
    ALLOWED_ORIGIN
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  res.setHeader(
    "Cache-Control",
    "public, max-age=86400, s-maxage=86400"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Método não permitido."
    });
  }

  try {

    const raw =
      typeof req.query?.url === "string"
        ? req.query.url
        : "";

    if (!raw) {
      return res.status(400).json({
        ok: false,
        error: "URL da imagem não informada."
      });
    }

    let target;

    try {
      target = new URL(raw);
    } catch {
      return res.status(400).json({
        ok: false,
        error: "URL da imagem inválida."
      });
    }

    if (
      target.protocol !== "https:" ||
      !ALLOWED_HOSTS.has(target.hostname)
    ) {
      return res.status(403).json({
        ok: false,
        error: "Domínio da imagem não autorizado.",
        host: target.hostname
      });
    }

    const upstream = await fetch(target.toString(), {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",

        "Accept":
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",

        "Referer":
          "https://shopee.com.br/"
      }
    });

    if (!upstream.ok) {
      return res.status(502).json({
        ok: false,
        error: "A Shopee não disponibilizou a imagem.",
        status: upstream.status
      });
    }

    const contentType =
      (
        upstream.headers.get("content-type") ||
        "image/jpeg"
      )
        .split(";")[0]
        .trim();

    if (!contentType.startsWith("image/")) {
      return res.status(502).json({
        ok: false,
        error: "A resposta recebida não é uma imagem.",
        contentType
      });
    }

    const buffer = Buffer.from(
      await upstream.arrayBuffer()
    );

    // IMPORTANTE:
    // Retorna a imagem diretamente,
    // porque o V15.3 espera uma imagem neste endpoint.
    res.setHeader(
      "Content-Type",
      contentType
    );

    res.setHeader(
      "Content-Length",
      buffer.length.toString()
    );

    return res.status(200).send(buffer);

  } catch (error) {

    console.error(
      "Erro no proxy de imagem:",
      error
    );

    return res.status(500).json({
      ok: false,
      error: "Erro ao carregar imagem.",
      message: error?.message || ""
    });
  }
}
