// Importer les bibliothèques nécessaires
use shopify_function::prelude::*;
use shopify_function::Result;
use serde::{Deserialize, Serialize};

// Générer les types à partir des fichiers GraphQL
generate_types!(
    query_path = "./input.graphql",
    schema_path = "./schema.graphql"
);

// Créer une structure pour la configuration
#[derive(Serialize, Deserialize, PartialEq)]
#[serde(rename_all(deserialize = "camelCase"))]
struct Configuration {
    pub quantity: i64,
    pub percentage: f64,
}

// Implémentation de la structure `Configuration`
impl Configuration {
    // Constantes pour les valeurs par défaut de la quantité et du pourcentage
    const DEFAULT_QUANTITY: i64 = 999;
    const DEFAULT_PERCENTAGE: f64 = 0.0;

    // Fonction pour convertir la chaîne JSON en structure `Configuration`
    fn from_str(value: &str) -> Self {
        serde_json::from_str(value).expect("Unable to parse configuration value from metafield")
    }
}

// Implémentation par défaut pour la structure `Configuration`
impl Default for Configuration {
    fn default() -> Self {
        Configuration {
            quantity: Self::DEFAULT_QUANTITY,
            percentage: Self::DEFAULT_PERCENTAGE,
        }
    }
}

// La fonction principale qui sera exécutée par Shopify Function
#[shopify_function]
fn function(input: input::ResponseData) -> Result<output::FunctionResult> {
    // Créer un résultat sans remise
    let no_discount = output::FunctionResult {
        discounts: vec![],
        discount_application_strategy: output::DiscountApplicationStrategy::FIRST,
    };

    // Récupérer la configuration à partir du champ "metafield"
    let config = match input.discount_node.metafield {
        Some(input::InputDiscountNodeMetafield { value }) =>
            Configuration::from_str(&value),
        None => return Ok(no_discount),
    };

    // Sélectionner les lignes du panier qui sont éligibles pour la remise
    let targets = input.cart.lines
        .iter()
        .filter(|line| line.quantity >= config.quantity) // Filtrer les lignes en fonction de la quantité configurée
        .filter_map(|line| match &line.merchandise {
            input::InputCartLinesMerchandise::ProductVariant(variant) => Some(variant),
            input::InputCartLinesMerchandise::CustomProduct => None,
        })
        .map(|variant| output::Target {
            product_variant: Some(output::ProductVariantTarget {
                id: variant.id.to_string(),
                quantity: None,
            }),
        })
        .collect::<Vec<output::Target>>();

    // Vérifier si des lignes de panier sont éligibles
    if targets.is_empty() {
        eprintln!("No cart lines qualify for volume discount.");
        return Ok(no_discount);
    }

    // Créer le résultat avec les remises
    Ok(output::FunctionResult {
        discounts: vec![output::Discount {
            message: None,
            targets,
            value: output::Value {
                fixed_amount: None,
                percentage: Some(output::Percentage {
                    value: config.percentage.to_string() // Utiliser le pourcentage configuré
                }),
            },
        }],
        discount_application_strategy: output::DiscountApplicationStrategy::FIRST,
    })
}

// Tests (à compléter si nécessaire)
#[cfg(test)]
mod tests;
