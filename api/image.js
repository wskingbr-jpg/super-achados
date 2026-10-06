export default async function handler(req, res) {
  const allowedOrigin = "https://ws-kingbr-jpg.github.io";

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const imageUrl = req.query?.url;

    if (!imageUrl) {
      return res.status(400).json({
        ok: false,
        error: "URL da imagem não informada."
      });
    }

    const url = String(imageUrl);

    if (
      !url.startsWith("https://cf.shopee.com.br/") &&
      !url.startsWith("https://cf.shopee.co.th/") &&
      !url.startsWith("https://cf.shopee.com/")
    ) {
      return res.status(400).json({
        ok: false,
        error: "Domínio de imagem não permitido."
      });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: "A Shopee não permitiu baixar a imagem."
      });
    }

    const contentType =
      response.headers.get("content-type") || "image/jpeg";

    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");

    return res.status(200).send(buffer);

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Erro ao carregar imagem.",
      message: error.message
    });
  }
}
