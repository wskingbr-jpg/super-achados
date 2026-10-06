import crypto from "node:crypto";

const SHOPEE_URL =
  "https://open-api.affiliate.shopee.com.br/graphql";

const ALLOWED_ORIGIN =
  "https://ws-kingbr-jpg.github.io";

const QUERY = `
query ProductOffers(
  $keyword: String,
  $sortType: Int,
  $page: Int,
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
      commissionRate
      commission
      price
      priceMin
      priceMax
      sales
      imageUrl
      shopName
      productLink
      offerLink
      ratingStar
      priceDiscountRate
      shopId
      shopType
      sellerCommissionRate
      shopeeCommissionRate
      periodStartTime
      periodEndTime
      productCatIds
    }

    pageInfo {
      page
      limit
      hasNextPage
    }
  }
}
`;

function applyCors(req, res) {

  // Remove qualquer cabeçalho CORS
  // que possa ter sido colocado anteriormente.
  try {
    res.removeHeader("Access-Control-Allow-Origin");
    res.removeHeader("Access-Control-Allow-Methods");
    res.removeHeader("Access-Control-Allow-Headers");
    res.removeHeader("Access-Control-Allow-Credentials");
  } catch {}

  const origin = req.headers?.origin || "";

  // Aceita somente nosso GitHub Pages.
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader(
      "Access-Control-Allow-Origin",
      ALLOWED_ORIGIN
    );
  } else {
    // Para acesso direto pelo navegador,
    // mantém a origem autorizada.
    res.setHeader(
      "Access-Control-Allow-Origin",
      ALLOWED_ORIGIN
    );
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept"
  );

  res.setHeader(
    "Access-Control-Max-Age",
    "86400"
  );

  res.setHeader(
    "Vary",
    "Origin"
  );
}

function result(res, status, data) {
  return res
    .status(status)
    .json(data);
}

export default async function handler(req, res) {

  applyCors(req, res);

  // =========================
  // PREFLIGHT
  // =========================

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // =========================
  // CREDENCIAIS
  // =========================

  const appId =
    process.env.SHOPEE_APP_ID;

  const secret =
    process.env.SHOPEE_SECRET;

  if (!appId || !secret) {
    return result(res, 500, {
      ok: false,
      error:
        "SHOPEE_APP_ID ou SHOPEE_SECRET não configurado."
    });
  }

  try {

    // =========================
    // PARÂMETROS
    // =========================

    let keyword = "";
    let limit = 10;
    let page = 1;
    let sortType = 5;

    if (req.method === "GET") {

      keyword =
        String(
          req.query?.keyword || ""
        ).trim();

      limit = Math.min(
        Math.max(
          Number(
            req.query?.limit || 10
          ),
          1
        ),
        50
      );

      page = Math.max(
        Number(
          req.query?.page || 1
        ),
        1
      );

      sortType =
        Number(
          req.query?.sortType || 5
        );

    } else if (req.method === "POST") {

      const body =
        typeof req.body === "string"
          ? JSON.parse(
              req.body || "{}"
            )
          : (req.body || {});

      keyword =
        String(
          body.keyword || ""
        ).trim();

      limit = Math.min(
        Math.max(
          Number(
            body.limit || 10
          ),
          1
        ),
        50
      );

      page = Math.max(
        Number(
          body.page || 1
        ),
        1
      );

      sortType =
        Number(
          body.sortType || 5
        );
    } else {

      return result(res, 405, {
        ok: false,
        error:
          "Método não permitido."
      });
    }

    // =========================
    // PAYLOAD
    // =========================

    const variables = {
      keyword: keyword || null,
      sortType,
      page,
      limit
    };

    const payloadObject = {
      query: QUERY,
      variables,
      operationName:
        "ProductOffers"
    };

    const payload =
      JSON.stringify(
        payloadObject
      );

    // =========================
    // ASSINATURA SHOPEE
    // =========================

    const timestamp =
      Math.floor(
        Date.now() / 1000
      ).toString();

    const signature =
      crypto
        .createHash("sha256")
        .update(
          `${appId}${timestamp}${payload}${secret}`
        )
        .digest("hex");

    // =========================
    // CHAMADA SHOPEE
    // =========================

    const response =
      await fetch(
        SHOPEE_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`
          },

          body: payload
        }
      );

    const data =
      await response.json();

    // =========================
    // ERRO SHOPEE
    // =========================

    if (
      !response.ok ||
      data?.errors
    ) {

      return result(res, 502, {
        ok: false,
        error:
          "Erro retornado pela API da Shopee.",
        details:
          data?.errors || data
      });
    }

    // =========================
    // PRODUTOS
    // =========================

    const nodes =
      data?.data
        ?.productOfferV2
        ?.nodes || [];

    const pageInfo =
      data?.data
        ?.productOfferV2
        ?.pageInfo || null;

    const products =
      nodes.map((p) => ({
        itemId:
          String(
            p.itemId || ""
          ),

        productName:
          p.productName || "",

        commissionRate:
          Number(
            p.commissionRate || 0
          ),

        commission:
          Number(
            p.commission || 0
          ),

        price:
          Number(
            p.price || 0
          ),

        priceMin:
          Number(
            p.priceMin || 0
          ),

        priceMax:
          Number(
            p.priceMax || 0
          ),

        sales:
          Number(
            p.sales || 0
          ),

        ratingStar:
          Number(
            p.ratingStar || 0
          ),

        priceDiscountRate:
          Number(
            p.priceDiscountRate || 0
          ),

        shopName:
          p.shopName || "",

        productLink:
          p.productLink || "",

        offerLink:
          p.offerLink || "",

        imageUrl:
          p.imageUrl || "",

        shopId:
          p.shopId || "",

        shopType:
          p.shopType || [],

        sellerCommissionRate:
          Number(
            p.sellerCommissionRate || 0
          ),

        shopeeCommissionRate:
          Number(
            p.shopeeCommissionRate || 0
          ),

        periodStartTime:
          p.periodStartTime || 0,

        periodEndTime:
          p.periodEndTime || 0,

        productCatIds:
          p.productCatIds || []
      }));

    // =========================
    // RESPOSTA
    // =========================

    return result(res, 200, {

      ok: true,

      keyword,

      total:
        products.length,

      pageInfo,

      products
    });

  } catch (error) {

    console.error(
      "Erro Super Achados Shopee:",
      error
    );

    return result(res, 500, {

      ok: false,

      error:
        "Erro ao consultar a API da Shopee.",

      details:
        error?.message ||
        String(error)
    });
  }
}
