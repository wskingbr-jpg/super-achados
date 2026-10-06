import crypto from "node:crypto";

const SHOPEE_URL =
  "https://open-api.affiliate.shopee.com.br/graphql";

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

function applyCors(res) {
  /*
   * CORS aberto para permitir que o GitHub Pages
   * consulte o backend Vercel.
   */

  try {
    res.removeHeader("Access-Control-Allow-Origin");
    res.removeHeader("Access-Control-Allow-Methods");
    res.removeHeader("Access-Control-Allow-Headers");
    res.removeHeader("Access-Control-Allow-Credentials");
  } catch (e) {}

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

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

  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );
}

function sendJson(res, status, data) {
  applyCors(res);

  return res
    .status(status)
    .json(data);
}

function getNumber(value, fallback = 0) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

export default async function handler(req, res) {

  // ===============================
  // CORS
  // ===============================

  applyCors(res);

  // ===============================
  // PREFLIGHT
  // ===============================

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // ===============================
  // MÉTODO
  // ===============================

  if (
    req.method !== "GET" &&
    req.method !== "POST"
  ) {
    return sendJson(res, 405, {
      ok: false,
      error: "Método não permitido."
    });
  }

  // ===============================
  // CREDENCIAIS
  // ===============================

  const appId =
    process.env.SHOPEE_APP_ID;

  const secret =
    process.env.SHOPEE_SECRET;

  if (!appId || !secret) {
    return sendJson(res, 500, {
      ok: false,
      error:
        "Credenciais da Shopee não configuradas no Vercel.",
      missing: {
        SHOPEE_APP_ID: !appId,
        SHOPEE_SECRET: !secret
      }
    });
  }

  try {

    // ===============================
    // PARÂMETROS
    // ===============================

    let keyword = "";
    let limit = 10;
    let page = 1;
    let sortType = 5;

    if (req.method === "GET") {

      keyword = String(
        req.query?.keyword || ""
      ).trim();

      limit = getNumber(
        req.query?.limit,
        10
      );

      page = getNumber(
        req.query?.page,
        1
      );

      sortType = getNumber(
        req.query?.sortType,
        5
      );

    } else {

      let body = req.body || {};

      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }

      keyword = String(
        body.keyword || ""
      ).trim();

      limit = getNumber(
        body.limit,
        10
      );

      page = getNumber(
        body.page,
        1
      );

      sortType = getNumber(
        body.sortType,
        5
      );
    }

    // Limites de segurança
    limit = Math.min(
      Math.max(
        Math.floor(limit),
        1
      ),
      50
    );

    page = Math.max(
      Math.floor(page),
      1
    );

    sortType = Math.floor(
      sortType
    );

    // ===============================
    // VARIÁVEIS DA SHOPEE
    // ===============================

    const variables = {
      keyword: keyword || null,
      sortType,
      page,
      limit
    };

    // ===============================
    // PAYLOAD
    // ===============================

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

    // ===============================
    // TIMESTAMP
    // ===============================

    const timestamp =
      Math.floor(
        Date.now() / 1000
      ).toString();

    // ===============================
    // ASSINATURA
    // ===============================

    const signature =
      crypto
        .createHash("sha256")
        .update(
          `${appId}${timestamp}${payload}${secret}`
        )
        .digest("hex");

    // ===============================
    // CHAMADA PARA A SHOPEE
    // ===============================

    const upstream =
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

    // ===============================
    // RESPOSTA DA SHOPEE
    // ===============================

    let data;

    try {
      data = await upstream.json();
    } catch {
      return sendJson(res, 502, {
        ok: false,
        error:
          "A Shopee retornou uma resposta inválida."
      });
    }

    // ===============================
    // ERRO DA SHOPEE
    // ===============================

    if (!upstream.ok) {

      return sendJson(res, 502, {
        ok: false,
        error:
          "Erro HTTP retornado pela Shopee.",
        status:
          upstream.status,
        details:
          data
      });
    }

    if (data?.errors) {

      return sendJson(res, 502, {
        ok: false,
        error:
          "A API da Shopee retornou um erro.",
        details:
          data.errors
      });
    }

    // ===============================
    // EXTRAÇÃO DOS PRODUTOS
    // ===============================

    const result =
      data?.data?.productOfferV2;

    const nodes =
      result?.nodes || [];

    const pageInfo =
      result?.pageInfo || null;

    // ===============================
    // NORMALIZAÇÃO
    // ===============================

    const products =
      nodes.map((p) => {

        return {
          itemId:
            String(
              p.itemId || ""
            ),

          productName:
            p.productName || "",

          commissionRate:
            getNumber(
              p.commissionRate
            ),

          commission:
            getNumber(
              p.commission
            ),

          price:
            getNumber(
              p.price
            ),

          priceMin:
            getNumber(
              p.priceMin
            ),

          priceMax:
            getNumber(
              p.priceMax
            ),

          sales:
            getNumber(
              p.sales
            ),

          ratingStar:
            getNumber(
              p.ratingStar
            ),

          priceDiscountRate:
            getNumber(
              p.priceDiscountRate
            ),

          shopName:
            p.shopName || "",

          productLink:
            p.productLink || "",

          offerLink:
            p.offerLink || "",

          /*
           * IMPORTANTE:
           * A URL real da imagem da Shopee
           * vai para o Super Achados.
           */
          imageUrl:
            p.imageUrl || "",

          shopId:
            String(
              p.shopId || ""
            ),

          shopType:
            Array.isArray(
              p.shopType
            )
              ? p.shopType
              : [],

          sellerCommissionRate:
            getNumber(
              p.sellerCommissionRate
            ),

          shopeeCommissionRate:
            getNumber(
              p.shopeeCommissionRate
            ),

          periodStartTime:
            getNumber(
              p.periodStartTime
            ),

          periodEndTime:
            getNumber(
              p.periodEndTime
            ),

          productCatIds:
            Array.isArray(
              p.productCatIds
            )
              ? p.productCatIds
              : []
        };
      });

    // ===============================
    // RESPOSTA FINAL
    // ===============================

    return sendJson(res, 200, {

      ok: true,

      keyword,

      total:
        products.length,

      pageInfo,

      products
    });

  } catch (error) {

    console.error(
      "SUPER ACHADOS SHOPEE ERROR:",
      error
    );

    return sendJson(res, 500, {

      ok: false,

      error:
        "Erro interno ao consultar a API da Shopee.",

      details:
        error?.message ||
        String(error)
    });
  }
}
