// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import { GraphqlQueryError } from '@shopify/shopify-api';

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import GDPRWebhookHandlers from "./gdpr.js";

//@ts-ignore
const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);

const CREATE_CODE_MUTATION = `
  mutation CreateCodeDiscount($discount: DiscountCodeAppInput!) {
    discountCreate: discountCodeAppCreate(codeAppDiscount: $discount) {
      userErrors {
        code
        message
        field
      }
    }
  }
`;

const CREATE_AUTOMATIC_MUTATION = `
  mutation CreateAutomaticDiscount($discount: DiscountAutomaticAppInput!) {
    discountCreate: discountAutomaticAppCreate(
      automaticAppDiscount: $discount
    ) {
      userErrors {
        code
        message
        field
      }
    }
  }
`;


const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  //@ts-ignore
  shopify.processWebhooks({ webhookHandlers: GDPRWebhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

// delivery Shopify function 

// Helper function for handling any user-facing errors in GraphQL responses
function handleUserError(userErrors, res) {
  if (userErrors && userErrors.length > 0) {
    const message = userErrors.map((error) => error.message).join(' ');
    res.status(500).send({ error: message });
    return true;
  }
  return false;
}

// Endpoint for the delivery customization UI to invoke
app.post("/api/deliveryCustomization/create", async (req, res) => {
  const payload = req.body;
  const graphqlClient = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session
  });

  try {
    // Create the delivery customization for the provided function ID
    const createResponse = await graphqlClient.query({
      data: {
        query: `mutation DeliveryCustomizationCreate($input: DeliveryCustomizationInput!) {
          deliveryCustomizationCreate(deliveryCustomization: $input) {
            deliveryCustomization {
              id
            }
            userErrors {
              message
            }
          }
        }`,
        variables: {
          input: {
            functionId: payload.functionId,
            title: `Display message for ${payload.stateProvinceCode}`,
            enabled: true,
          },
        }
      },
    });
    //@ts-ignore
    let createResult = createResponse.body.data.deliveryCustomizationCreate;
    if (handleUserError(createResult.userErrors, res)) {
      return;
    }

    // Populate the function configuration metafield for the delivery customization
    const customizationId = createResult.deliveryCustomization.id;
    const metafieldResponse = await graphqlClient.query({
      data: {
        query: `mutation MetafieldsSet($customizationId: ID!, $configurationValue: String!) {
          metafieldsSet(metafields: [
            {
              ownerId: $customizationId
              namespace: "$app:delivery-customization"
              key: "function-configuration"
              value: $configurationValue
              type: "json"
            }
          ]) {
            metafields {
              id
            }
            userErrors {
              message
            }
          }
        }`,
        variables: {
          customizationId,
          configurationValue: JSON.stringify({
            stateProvinceCode: payload.stateProvinceCode,
            message: payload.message
          })
        }
      }
    });
    //@ts-ignore
    let metafieldResult = metafieldResponse.body.data.metafieldsSet;
    if (handleUserError(metafieldResult, res)) {
      return;
    }
  } catch (error) {
    // Handle errors thrown by the graphql client
    if (!(error instanceof GraphqlQueryError)) {
      throw error;
    }
    return res.status(500).send({ error: error.response });
  }

  return res.status(200).send();
});

// discount Shopify function

const runDiscountMutation = async (req, res, mutation) => {
  const graphqlClient = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session
  });

  try {
    const data = await graphqlClient.query({
      data: {
        query: mutation,
        variables: req.body,
      },
    });

    res.send(data.body);
  } catch (error) {
    // Handle errors thrown by the GraphQL client
    if (!(error instanceof GraphqlQueryError)) {
      throw error;
    }
    return res.status(500).send({ error: error.response });
  }
};

// Endpoint to create code-based discounts
app.post("/api/discounts/code", async (req, res) => {
  await runDiscountMutation(req, res, CREATE_CODE_MUTATION);
});

// Endpoint to create automatic discounts
app.post("/api/discounts/automatic", async (req, res) => {
  await runDiscountMutation(req, res, CREATE_AUTOMATIC_MUTATION);
});


app.get("/api/products/count", async (_req, res) => {
  const countData = await shopify.api.rest.Product.count({
    session: res.locals.shopify.session,
  });
  res.status(200).send(countData);
});

app.get("/api/products/create", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(join(STATIC_PATH, "index.html")));
});

app.listen(PORT);
