import crypto from "crypto";

const SHOPEE_URL = "https://open-api.affiliate.shopee.com.br/graphql";

const ALLOWED_ORIGIN = "https://ws-kingbr-jpg.github.io";

const QUERY = `
query ProductOfferV2(
  $keyword: String
  $sortType: Int
  $page: Int
  $limit: Int
) {
  productOfferV2(
    keyword: $keyword
    sortType: $sortType
    page: $page
    limit: $limit
  ) {
    nodes {
      itemId
      productName
      productLink
      offerLink
      imageUrl
      priceMin
      priceMax
      priceDiscountRate
      sales
      ratingStar
      commissionRate
      sellerCommissionRate
      shopeeCommissionRate
      commission
      shopId
      shopName
      shopType
      productCatIds
      periodStartTime
      periodEndTime
    }
    pageInfo {
      page
      limit
      hasNextPage
    }
  }
}
`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const appId = process.env.SHOPEE_APP_ID;
    const secret = process.env.SHOPEE_SECRET;

    if (!appId || !secret) {
      return res.status(500).json({
        ok: false,
        error: "Credenciais da Shopee não configuradas no Vercel."
      });
    }

    const body = req.method === "POST"
      ? (req.body || {})
      : req.query;

    const keyword =
      typeof body.keyword === "string" && body.keyword.trim()
        ? body.keyword.trim()
        : "ofertas";

    const page = Math.max(
      1,
      parseInt(body.page || "1", 10)
    );

    const limit = Math.min(
      50,
      Math.max(1, parseInt(body.limit || "10", 10))
    );

    const sortType = Math.min(
      5,
      Math.max(1, parseInt(body.sortType || "5", 10))
    );

    const variables = {
      keyword,
      sortType,
      page,
      limit
    };

    const payloadObject = {
      query: QUERY,
      operationName: "ProductOfferV2",
      variables
    };

    const payload = JSON.stringify(payloadObject);

    const timestamp = Math.floor(Date.now() / 1000);

    const signatureBase =
      appId +
      timestamp +
      payload +
      secret;

    const signature = crypto
      .createHash("sha256")
      .update(signatureBase)
      .digest("hex");

    const authorization =
      `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`;

    const response = await fetch(SHOPEE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authorization
      },
      body: payload
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: "Erro na API da Shopee.",
        details: data
      });
    }

    if (data.errors) {
      return res.status(400).json({
        ok: false,
        error: "A Shopee retornou um erro.",
        details: data.errors
      });
    }

    const result = data?.data?.productOfferV2;

    if (!result) {
      return res.status(500).json({
        ok: false,
        error: "A Shopee não retornou ofertas.",
        details: data
      });
    }

    return res.status(200).json({
      ok: true,
      keyword,
      pageInfo: result.pageInfo,
      total: result.nodes?.length || 0,
      products: result.nodes || []
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Erro interno no conector.",
      message: error.message
    });
  }
}
