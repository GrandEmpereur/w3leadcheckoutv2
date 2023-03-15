use shopify_function::prelude::*;
use shopify_function::Result;

use serde::{Deserialize, Serialize};

generate_types!(
    query_path = "./input.graphql",
    schema_path = "./schema.graphql"
);

// Créez une structure qui correspond à la structure JSON que vous utiliserez pour votre configuration
#[derive(Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all(deserialize = "camelCase"))]
struct Configuration {
    payment_method_name: String,
    cart_total: f64,
}

// Analysez la valeur JSON du champ méta à l'aide de serde
impl Configuration {
    fn from_str(value: &str) -> Self {
        serde_json::from_str(value).expect("Unable to parse configuration value from metafield")
    }
}

// La fonction principale qui sera exécutée par Shopify Function
#[shopify_function]
fn function(input: input::ResponseData) -> Result<output::FunctionResult> {
    // Créez un vecteur contenant l'ordre souhaité pour les méthodes de paiement
    let payment_order = vec![
        "SPAM",
        "Paypal",
        "Cash on Delivery (COD)",
        "(for testing) Bogus Gateway",
    ];

    let config = match input.payment_customization.metafield {
        Some(input::InputPaymentCustomizationMetafield { value }) =>
            Configuration::from_str(&value),
        None => Configuration::default(),
    };

    let cart_total = input.cart.cost.total_amount.amount.parse::<f64>().unwrap();

    // Itérer sur les méthodes de paiement et créer des opérations de déplacement
    // basées sur l'ordre souhaité
    let move_operations: Vec<_> = input.payment_methods
        .iter()
        .enumerate()
        .filter_map(|(index, method)| {
            if let Some(pos) = payment_order.iter().position(|&x| x == method.name) {
                Some(output::MoveOperation {
                    payment_method_id: method.id.to_string(),
                    index: pos as i64,
                })
            } else {
                None
            }
        })
        .map(|move_op| output::Operation {
            rename: None,
            hide: None,
            move_: Some(move_op),
        })
        .collect(); // Collecter les opérations de sortie dans un vecteur

    if cart_total < config.cart_total {
        eprintln!("Cart total is not high enough, no need to hide the payment method.");
        return Ok(output::FunctionResult { operations: move_operations });
    }

    // Utilisez le nom de la méthode de paiement configuré au lieu d'une valeur codée en dur
    let hide_payment_method = input.payment_methods
        .iter()
        .find(|&method| method.name.contains(&config.payment_method_name))
        .map(|method| output::HideOperation {
            payment_method_id: method.id.to_string(),
        });

    let mut operations = move_operations;
    if let Some(hide_operation) = hide_payment_method {
        operations.push(output::Operation {
            hide: Some(hide_operation),
            move_: None,
            rename: None,
        });
    }

    // Retourner les opérations sous forme de FunctionResult
    Ok(output::FunctionResult { operations })
}

// Tests (à compléter si nécessaire)
#[cfg(test)]
mod tests;
