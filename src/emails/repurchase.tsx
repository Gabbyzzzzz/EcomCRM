import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Img,
  Hr,
} from '@react-email/components'
import * as React from 'react'

interface ProductSuggestion {
  title: string
  price: string
  url: string
}

interface RepurchaseEmailProps {
  storeName: string
  customerName?: string
  lastOrderDate: string
  productSuggestions?: ProductSuggestion[]
  shopUrl: string
  unsubscribeUrl: string
  logoUrl?: string
}

const main = {
  backgroundColor: '#f9fafb',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '24px',
  maxWidth: '600px',
  borderRadius: '8px',
}

const logoSection = {
  textAlign: 'center' as const,
  paddingBottom: '16px',
}

const heading = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#1f2937',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}

const bodyText = {
  fontSize: '16px',
  color: '#1f2937',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const lastOrderBox = {
  backgroundColor: '#f3f4f6',
  borderRadius: '6px',
  padding: '12px 16px',
  margin: '0 0 16px',
}

const lastOrderLabel = {
  fontSize: '12px',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0 0 4px',
}

const lastOrderDateStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0',
}

const sectionLabel = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '16px 0 12px',
}

const suggestionItem = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 0',
  borderBottom: '1px solid #f3f4f6',
}

const suggestionTitle = {
  fontSize: '14px',
  color: '#1f2937',
  textDecoration: 'none',
  fontWeight: '500',
}

const suggestionPrice = {
  fontSize: '14px',
  color: '#2563eb',
  fontWeight: '600',
  margin: '4px 0 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '12px 24px',
  display: 'inline-block',
}

const hr = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '24px 0',
}

const footer = {
  fontSize: '12px',
  color: '#6b7280',
  textAlign: 'center' as const,
  lineHeight: '18px',
}

const unsubscribeLink = {
  color: '#6b7280',
  textDecoration: 'underline',
}

export default function RepurchaseEmail({
  storeName,
  customerName,
  lastOrderDate,
  productSuggestions,
  shopUrl,
  unsubscribeUrl,
  logoUrl,
}: RepurchaseEmailProps) {
  const greeting = customerName ? `Hi ${customerName},` : 'Hi there,'

  return (
    <Html lang="en">
      <Head />
      <Preview>Time to restock? Shop the latest from {storeName}</Preview>
      <Body style={main}>
        <Container style={container}>
          {logoUrl && (
            <Section style={logoSection}>
              <Img src={logoUrl} alt={`${storeName} logo`} width="120" height="40" />
            </Section>
          )}

          <Text style={heading}>Time to restock?</Text>

          <Text style={bodyText}>{greeting}</Text>
          <Text style={bodyText}>
            It&apos;s been a while since your last order from {storeName}. We have new
            products and restocked favourites waiting for you.
          </Text>

          <Section style={lastOrderBox}>
            <Text style={lastOrderLabel}>Your last order</Text>
            <Text style={lastOrderDateStyle}>{lastOrderDate}</Text>
          </Section>

          {productSuggestions && productSuggestions.length > 0 && (
            <Section>
              <Text style={sectionLabel}>You might like</Text>
              {productSuggestions.map((product, index) => (
                <Section key={index} style={suggestionItem}>
                  <div>
                    <a href={product.url} style={suggestionTitle}>
                      {product.title}
                    </a>
                    <Text style={suggestionPrice}>{product.price}</Text>
                  </div>
                  <Button href={product.url} style={{ ...button, padding: '8px 16px', fontSize: '14px' }}>
                    Shop
                  </Button>
                </Section>
              ))}
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button href={shopUrl} style={button}>
              Visit the Store
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            You received this email as a valued customer of {storeName}.
            <br />
            <a href={unsubscribeUrl} style={unsubscribeLink}>
              Unsubscribe
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

RepurchaseEmail.PreviewProps = {
  storeName: 'Acme Store',
  customerName: 'Jane',
  lastOrderDate: 'January 15, 2026',
  productSuggestions: [
    { title: 'Premium Coffee Beans', price: '$24.00', url: 'https://example.com/product/1' },
    { title: 'Reusable Travel Mug', price: '$34.00', url: 'https://example.com/product/2' },
  ],
  shopUrl: 'https://example.com',
  unsubscribeUrl: 'https://example.com/unsubscribe?token=abc',
} satisfies RepurchaseEmailProps
