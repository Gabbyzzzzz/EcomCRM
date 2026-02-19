// ─── Shopify Admin GraphQL API Response Types ─────────────────────────────────

export interface GraphQLCostExtension {
  requestedQueryCost: number
  actualQueryCost: number
  throttleStatus: {
    maximumAvailable: number
    currentlyAvailable: number
    restoreRate: number
  }
}

export interface GraphQLResponse<T> {
  data: T
  errors?: Array<{
    message: string
    locations?: Array<{
      line: number
      column: number
    }>
  }>
  extensions?: {
    cost: GraphQLCostExtension
  }
}

// ─── Shopify Customer ─────────────────────────────────────────────────────────

export interface ShopifyCustomer {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  /** UnsignedInt64 — serialized as a string by the Shopify GraphQL API */
  numberOfOrders: string
  amountSpent: {
    amount: string
    currencyCode: string
  }
  tags: string[]
  createdAt: string
  updatedAt: string
}

// ─── Shopify Order ────────────────────────────────────────────────────────────

export interface ShopifyOrder {
  id: string
  name: string
  totalPriceSet: {
    shopMoney: {
      amount: string
      currencyCode: string
    }
  }
  customer: {
    id: string
  } | null
  lineItems: {
    edges: Array<{
      node: {
        title: string
        quantity: number
        /** Money scalar — a plain decimal string like "19.99" */
        variant: { price: string } | null
      }
    }>
  }
  displayFinancialStatus: string
  createdAt: string
  updatedAt: string
}

// ─── Shopify Bulk Operation ───────────────────────────────────────────────────

export interface ShopifyBulkOperation {
  id: string
  status: string
  errorCode: string | null
  objectCount: string
  url: string | null
  partialDataUrl: string | null
}

export interface BulkOperationWebhookPayload {
  admin_graphql_api_id: string
  status: string
  error_code: string | null
  object_count: string
  url: string | null
  type: string
}
