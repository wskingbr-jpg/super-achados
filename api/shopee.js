import crypto from "node:crypto";

const SHOPEE_URL =
  "https://open-api.affiliate.shopee.com.br/graphql";

const ALLOWED_ORIGIN =
  "https://ws-kingbr-jpg.github.io";

const query = `
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
        sales
        imageUrl
        shopName
        productLink
        offerLink
        periodStartTime
        periodEndTime
        priceMin
        priceMax
        productCatIds
        ratingStar
        priceDiscountRate
        shopId
        shopType
        sellerCommissionRate
        shopeeCommissionRate
      }

      pageInfo {
        page
        limit
        hasNextPage
      }
    }
  }
`;

function setCors(res) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    ALLOWED_ORIGIN
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

function send(res, status, body) {
  setCors(res);
  return res.status(status).json(body);
}

export default async function handler(req, res) {

  setCors(res);

  // =========================
  // CORS PREFLIGHT
  // =========================

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // =========================
  // CREDENCIAIS
  // =========================

  const appId = process.env.SHOPEE_APP_ID;
  const secret = process.env.SHOPEE_SECRET;

  if (!appId || !secret) {
    return send(res, 500, {
      ok: false,
      error:
        "Variáveis SHOPEE_APP_ID e SHOPEE_SECRET não configuradas."
    });
  }

  try {

    // =========================
    // GET
    // =========================

    if (req.method === "GET") {

      const keyword =
        String(req.query?.keyword || "").trim();

      const limit = Math.min(
        Math.max(
          Number(req.query?.limit || 10),
          1
        ),
        50
      );

      const sortType = Number(
        req.query?.sortType || 5
      );

      const page = Number(
        req.query?.page || 1
      );

      const variables = {
        keyword: keyword || null,
        sortType,
        page,
        limit
      };

      const payloadObject = {
        query,
        variables,
        operationName: "ProductOffers"
      };

      const payload =
        JSON.stringify(payloadObject);

      const timestamp =
        Math.floor(Date.now() / 1000).toString();

      const signature =
        crypto
          .createHash("sha256")
          .update(
            `${appId}${timestamp}${payload}${secret}`
          )
          .digest("hex");

      const response = await fetch(
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

      if (!response.ok || data.errors) {

        return send(res, 502, {
          ok: false,
          error:
            "A Shopee retornou um erro.",

          details:
            data.errors || data
        });

      }

      const offers =
        data?.data?.productOfferV2?.nodes || [];

      const pageInfo =
        data?.data?.productOfferV2?.pageInfo || null;

      // =========================
      // RESPOSTA PARA O
      // SUPER ACHADOS
      // =========================

      const products =
        offers.map((p) => ({
          itemId:
            String(p.itemId || ""),

          productName:
            p.productName || "",

          commissionRate:
            Number(p.commissionRate || 0),

          commission:
            Number(p.commission || 0),

          price:
            Number(p.price || 0),

          priceMin:
            Number(p.priceMin || 0),

          priceMax:
            Number(p.priceMax || 0),

          sales:
            Number(p.sales || 0),

          ratingStar:
            Number(p.ratingStar || 0),

          priceDiscountRate:
            Number(p.priceDiscountRate || 0),

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

      return send(res, 200, {

        ok: true,

        keyword,

        pageInfo,

        total:
          products.length,

        products
      });
    }

    // =========================
    // POST
    // =========================

    if (req.method === "POST") {

      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : (req.body || {});

      const keyword =
        String(body.keyword || "").trim();

      const sortType =
        Number(body.sortType || 5);

      const page =
        Number(body.page || 1);

      const limit =
        Math.min(
          Math.max(
            Number(body.limit || 10),
            1
          ),
          50
        );

      const variables = {
        keyword: keyword || null,
        sortType,
        page,
        limit
      };

      const payloadObject = {
        query,
        variables,
        operationName: "ProductOffers"
      };

      const payload =
        JSON.stringify(payloadObject);

      const timestamp =
        Math.floor(Date.now() / 1000).toString();

      const signature =
        crypto
          .createHash("sha256")
          .update(
            `${appId}${timestamp}${payload}${secret}`
          )
          .digest("hex");

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

      if (!response.ok || data.errors) {

        return send(res, 502, {
          ok: false,
          error:
            "A Shopee retornou um erro.",

          details:
            data.errors || data
        });

      }

      const offers =
        data?.data?.productOfferV2?.nodes || [];

      const pageInfo =
        data?.data?.productOfferV2?.pageInfo || null;

      const products =
        offers.map((p) => ({
          itemId:
            String(p.itemId || ""),

          productName:
            p.productName || "",

          commissionRate:
            Number(p.commissionRate || 0),

          commission:
            Number(p.commission || 0),

          price:
            Number(p.price || 0),

          priceMin:
            Number(p.priceMin || 0),

          priceMax:
            Number(p.priceMax || 0),

          sales:
            Number(p.sales || 0),

          ratingStar:
            Number(p.ratingStar || 0),

          priceDiscountRate:
            Number(p.priceDiscountRate || 0),

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

      return send(res, 200, {
        ok: true,
        keyword,
        pageInfo,
        total: products.length,
        products
      });
    }

    // =========================
    // MÉTODO INVÁLIDO
    // =========================

    return send(res, 405, {
      ok: false,
      error: "Método não permitido."
    });

  } catch (error) {

    console.error(
      "Erro Shopee:",
      error
    );

    return send(res, 500, {
      ok: false,

      error:
        "Erro ao consultar a API da Shopee.",

      details:
        error?.message ||
        String(error)
    });
  }
}
