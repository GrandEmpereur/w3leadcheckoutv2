// Importer les bibliothèques nécessaires
use shopify_function::prelude::*;
use shopify_function::Result;

use serde::{Deserialize, Serialize};

// Générer les types à partir des fichiers GraphQL
generate_types!(
    query_path = "./input.graphql",
    schema_path = "./schema.graphql"
);

// La fonction principale qui sera exécutée par Shopify Function
#[shopify_function]
fn function(input: input::ResponseData) -> Result<output::FunctionResult> {
    // Créez un vecteur contenant l'ordre souhaité pour les méthodes d'expédition
    let table = vec!["Eco", "Standard", "Express"];

    // Itérer sur les options de livraison et créer des opérations de déplacement
    // basées sur l'ordre souhaité
    let move_operations: Vec<_> = input.cart.delivery_groups
        .iter() // Itérer sur les groupes de livraison
        .flat_map(|group| &group.delivery_options) // Aplatir les options de livraison en une seule liste
        .enumerate() // Associer chaque option de livraison à son index
        .filter_map(|(index, option)| { // Filtrer et créer des opérations de déplacement
            if let Some(title) = &option.title { // Vérifier si le titre de l'option est présent
                if let Some(pos) = table.iter().position(|&x| x == title) { // Vérifier si le titre est dans la table
                    // Créer une opération de déplacement avec la position souhaitée
                    Some(output::MoveOperation {
                        delivery_option_handle: option.handle.to_string(),
                        index: pos as i64,
                    })
                } else {
                    None // Ne pas créer d'opération de déplacement si le titre n'est pas dans la table
                }
            } else {
                None // Ne pas créer d'opération de déplacement si le titre est absent
            }
        })
        .map(|move_op| output::Operation { // Convertir les opérations de déplacement en opérations de sortie
            rename: None,
            hide: None,
            move_: Some(move_op),
        })
        .collect(); // Collecter les opérations de sortie dans un vecteur

    // Retourner les opérations sous forme de FunctionResult
    Ok(output::FunctionResult { operations: move_operations })
}

// Tests (à compléter si nécessaire)
#[cfg(test)]
mod tests;
