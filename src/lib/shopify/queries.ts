// ─── Shopify GraphQL Query Strings ────────────────────────────────────────────
//
// These are used by the sync pipeline and webhook handlers.
// Bulk operation queries wrap the actual query in a bulkOperationRunQuery mutation.

// ─── Bulk operation mutations ─────────────────────────────────────────────────

/**
 * Starts a bulk export of all customers.
 * Shopify processes this async and sends a bulk_operations/finish webhook when done.
 * The webhook payload includes a `url` field pointing to the JSONL file.
 */
export const BULK_CUSTOMERS_QUERY = `
  mutation {
    bulkOperationRunQuery(
      query: """
      {
        customers {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
              ordersCount
              totalSpentV2 {
                amount
                currencyCode
              }
              tags
              createdAt
              updatedAt
            }
          }
        }
      }
      """
    ) {
      bulkOperation {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`

/**
 * Starts a bulk export of all orders.
 * Each order line in the JSONL includes the customer GID so we can link records.
 */
export const BULK_ORDERS_QUERY = `
  mutation {
    bulkOperationRunQuery(
      query: """
      {
        orders {
          edges {
            node {
              id
              name
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              customer {
                id
              }
              lineItems {
                edges {
                  node {
                    title
                    quantity
                    variant {
                      price {
                        amount
                      }
                    }
                  }
                }
              }
              financialStatus
              createdAt
              updatedAt
            }
          }
        }
      }
      """
    ) {
      bulkOperation {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`

// ─── Status query ─────────────────────────────────────────────────────────────

/**
 * Poll the current bulk operation status.
 * Used to check if a running bulk operation is complete before relying on webhooks.
 */
export const BULK_OPERATION_STATUS_QUERY = `
  query {
    currentBulkOperation {
      id
      status
      errorCode
      objectCount
      url
      partialDataUrl
    }
  }
`

// ─── Single-resource queries ──────────────────────────────────────────────────

/**
 * Fetch a single customer by GID.
 * Used by incremental webhook handlers after an orders/create event that has a
 * customer GID reference, or for refreshing stale customer data.
 */
export const SINGLE_CUSTOMER_QUERY = `
  query GetCustomer($id: ID!) {
    customer(id: $id) {
      id
      firstName
      lastName
      email
      phone
      ordersCount
      totalSpentV2 {
        amount
        currencyCode
      }
      tags
      createdAt
      updatedAt
    }
  }
`

/**
 * Fetch a single order by GID.
 * Used by incremental webhook handlers for orders/create and orders/updated events.
 */
export const SINGLE_ORDER_QUERY = `
  query GetOrder($id: ID!) {
    order(id: $id) {
      id
      name
      totalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      customer {
        id
      }
      lineItems(first: 50) {
        edges {
          node {
            title
            quantity
            variant {
              price {
                amount
              }
            }
          }
        }
      }
      financialStatus
      createdAt
      updatedAt
    }
  }
`
