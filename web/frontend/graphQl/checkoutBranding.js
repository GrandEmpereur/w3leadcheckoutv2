import axios from 'axios';

const token = "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" 

export const checkoutBranding = async () => {
    console.log('checkoutBranding');
    const response = await axios.post(
        'https://w3dev-checkout-extensibility.myshopify.com/admin/api/unstable/graphql.json',
        // '{\n"query": "mutation SetLogo($checkoutProfileId: ID!, $input: CheckoutBrandingInput!) { checkoutBrandingUpsert(checkoutProfileId: $checkoutProfileId, checkoutBrandingInput: $input) { checkoutBranding { customizations { header { logo { image { url } } } } } userErrors { message } } }",\n "variables": {\n    "checkoutProfileId": "gid://shopify/CheckoutProfile/235093654",\n    "input": {\n      "customizations": {\n        "header": {\n          "logo": {\n            "image": {\n              "mediaImageId": "gid://shopify/MediaImage/1072273199"\n            }\n          }\n        }\n      }\n    }\n  }\n}',
        {
            "query": "mutation SetLogo($checkoutProfileId: ID!, $input: CheckoutBrandingInput!) { checkoutBrandingUpsert(checkoutProfileId: $checkoutProfileId, checkoutBrandingInput: $input) { checkoutBranding { customizations { header { logo { image { url } } } } } userErrors { message } } }",
            "variables": {
                "checkoutProfileId": "gid://shopify/CheckoutProfile/10584356",
                "input": {
                    "customizations": {
                        "header": {
                            "logo": {
                                "image": {
                                    "mediaImageId": "gid://shopify/MediaImage/1072273199"
                                }
                            }
                        }
                    }
                }
            }
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': token
            }
        }
    );

    console.log(response);
    return response;
}

