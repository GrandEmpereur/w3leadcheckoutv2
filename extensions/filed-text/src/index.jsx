import React, { useState, useEffect } from "react";
import {
	render,
	TextField,
	useApplyMetafieldsChange,
	useMetafield,
	BlockStack,
	Checkbox,
} from "@shopify/checkout-ui-extensions-react";

// Set up the entry point for the extension
render("Checkout::ShippingMethods::RenderAfter", () => <FiledTextApp />);

function FiledTextApp() {
	// Set up the checkbox state
	const [checked, setChecked] = useState(false);

	// Define the metafield namespace and key
	const metafieldNamespace = "OrderShipping";
	const metafieldKey = "deliveryInstructions";

	// Get a reference to the metafield
	const deliveryInstructions = useMetafield({
		namespace: metafieldNamespace,
		key: metafieldKey,
	});

	// Set a function to handle updating a metafield
	const applyMetafieldsChange = useApplyMetafieldsChange();

	// Set a function to handle the Checkbox component's onChange event
	const handleChange = () => {
		setChecked(!checked);
	};

	// Render the extension components
	return (
		<BlockStack>
			<Checkbox checked={checked} onChange={handleChange}>
				Provide delivery instructions
			</Checkbox>
			{checked && (
				<TextField
					label="Delivery instructions"
					multiline={3}
					onChange={(value) => {
						// Apply the change to the metafield
						applyMetafieldsChange({
							type: "updateMetafield",
							namespace: metafieldNamespace,
							key: metafieldKey,
							valueType: "string",
							value,
						});
					}}
					value={deliveryInstructions?.value}
				/>
			)}
		</BlockStack>
	);
}
