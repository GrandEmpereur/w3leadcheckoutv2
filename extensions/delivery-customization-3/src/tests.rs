use super::*;
use shopify_function::{run_function_with_input, Result};

#[test]
fn test_result_contains_move_operations() -> Result<()> {
    let result = run_function_with_input(
        function,
        r#"
            {
                "cart": {
                    "deliveryGroups": [
                        {
                            "deliveryOptions": [
                                {
                                    "handle": "standard",
                                    "title": "Standard Shipping"
                                },
                                {
                                    "handle": "express",
                                    "title": "Express Shipping"
                                },
                                {
                                    "handle": "eco",
                                    "title": "Eco Shipping"
                                }
                            ]
                        }
                    ]
                },
                "deliveryCustomization": {
                    "metafield": null
                }
            }
        "#,
    )?;

    let expected = crate::output::FunctionResult {
        operations: vec![
            crate::output::Operation {
                rename: None,
                hide: None,
                move_: Some(crate::output::MoveOperation {
                    delivery_option_handle: "eco".to_string(),
                    index: 0,
                }),
            },
            crate::output::Operation {
                rename: None,
                hide: None,
                move_: Some(crate::output::MoveOperation {
                    delivery_option_handle: "standard".to_string(),
                    index: 1,
                }),
            },
            crate::output::Operation {
                rename: None,
                hide: None,
                move_: Some(crate::output::MoveOperation {
                    delivery_option_handle: "express".to_string(),
                    index: 2,
                }),
            },
        ],
    };

    assert_eq!(result, expected);
    Ok(())
}
