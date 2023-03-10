import React, { useEffect, useState } from "react";
import {
  render,
  Divider,
  Image,
  Banner,
  Heading,
  Button,
  InlineLayout,
  BlockStack,
  Text,
  SkeletonText,
  SkeletonImage,
  useCartLines,
  useApplyCartLinesChange,
  useExtensionApi,
} from "@shopify/checkout-ui-extensions-react";

// Set up some static product variants that could be on offer
// You'll need to change these to the appropriate values for your store
// Your product variant data could come from an external HTTP call using `fetch()`
const PRODUCT_VARIANTS_DATA = [
  {
    id: "gid://shopify/ProductVariant/44734894375204",
    img: "https://cdn.shopify.com/s/files/1/0728/4549/2516/products/DIY-animal-bowtie.jpg?v=1678103218&width=1946",
    title: "Product 1 Title",
    price: 50.0,
  },
  {
    id: "gid://shopify/ProductVariant/44734893031716",
    img: "https://cdn.shopify.com/s/files/1/0728/4549/2516/products/childrens-black-beanie.jpg?v=1678103213&width=1946",
    title: "Product 2 Title",
    price: 50.0,
  },
];

// Set up the entry point for the extension
render("Checkout::Dynamic::Render", () => <ProductOffert />);


// The function that will render the app
function ProductOffert() {
  // Use i18n to format currencies, numbers, and translate strings
  const { i18n } = useExtensionApi();
  // Get a reference to the function that will apply changes to the cart lines from the imported hook
  const applyCartLinesChange = useApplyCartLinesChange();
  // Set up the states
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showError, setShowError] = useState(false);

  // On initial load, fetch the product variants
  useEffect(() => {
    // Set the loading state to show some UI if you're waiting
    setLoading(true);
    // If you're making a network request, then replace the following code with the HTTP call
    // If you don't need to make a network request, then you can remove this `useEffect`
    new Promise((resolve) => {
      setTimeout(() => {
        resolve(PRODUCT_VARIANTS_DATA);
      }, 800);
    })
      .then((result) => {
        // Set the "products" array so that you can reference the array items
        setProducts(result);
      })
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
  }, []);

  // If an offer is added and an error occurs, then show some error feedback using a banner
  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  // Access the current cart lines and subscribe to changes
  const lines = useCartLines();

  // Show a loading UI if you're waiting for product variant data
  // Use Skeleton components to keep placement from shifting when content loads
  if (loading) {
    return (
      <BlockStack spacing="loose">
        <Divider />
        <Heading level={2}>You might also like</Heading>
        <BlockStack spacing="loose">
          <InlineLayout
            spacing="base"
            columns={[64, "fill", "auto"]}
            blockAlignment="center"
          >
            <SkeletonImage aspectRatio={1} />
            <BlockStack spacing="none">
              <SkeletonText inlineSize="large" />
              <SkeletonText inlineSize="small" />
            </BlockStack>
            <Button kind="secondary" disabled={true}>
              Add
            </Button>
          </InlineLayout>
        </BlockStack>
      </BlockStack>
    );
  }
  // If product variants can't be loaded, then show nothing
  if (!loading && products.length === 0) {
    return null;
  }

  // Filter out any product variants on offer that are already current cart lines
  const productsOnOffer = products.filter(
    (product) => !lines.map((item) => item.merchandise.id).includes(product.id)
  );
  // Choose the first available product variant on offer or display the default fallback product variant
  const { id, img, title, price } = productsOnOffer[0] || products[0];
  // Localize the currency for international merchants and customers
  const renderPrice = i18n.formatCurrency(price);

  return (
    <BlockStack spacing="loose">
      <Divider />
      <Heading level={2}>You might also like</Heading>
      <BlockStack spacing="loose">
        <InlineLayout
          spacing="base"
          // Use the `columns` property to set the width of the columns
          // Image: column should be 64px wide
          // BlockStack: column, which contains the title and price, should "fill" all available space
          // Button: column should "auto" size based on the intrinsic width of the elements
          columns={[64, "fill", "auto"]}
          blockAlignment="center"
        >
          <Image
            border="base"
            borderWidth="base"
            borderRadius="loose"
            source={img}
            description={title}
            aspectRatio={1}
          />
          <BlockStack spacing="none">
            <Text size="medium" emphasis="strong">
              {title}
            </Text>
            <Text appearance="subdued">{renderPrice}</Text>
          </BlockStack>
          <Button
            kind="secondary"
            loading={adding}
            accessibilityLabel={`Add ${title} to cart`}
            onPress={async () => {
              setAdding(true);
              // Apply the cart lines change
              const result = await applyCartLinesChange({
                type: "addCartLine",
                merchandiseId: id,
                quantity: 1,
              });
              setAdding(false);
              if (result.type === "error") {
                // An error occurred adding the cart line
                // Verify that you're using a valid product variant ID
                // For example, 'gid://shopify/ProductVariant/123'
                setShowError(true);
                console.error(result.message);
              }
            }}
          >
            Add
          </Button>
        </InlineLayout>
      </BlockStack>
      {showError && (
        <Banner status="critical">
          There was an issue adding this product. Please try again.
        </Banner>
      )}
    </BlockStack>
  );
}
