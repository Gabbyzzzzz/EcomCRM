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
  Row,
  Column,
} from '@react-email/components'
import * as React from 'react'

interface CartItem {
  title: string
  price: string
  imageUrl?: string
}

interface AbandonedCartEmailProps {
  storeName: string
  customerName?: string
  cartItems: CartItem[]
  cartUrl: string
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

const sectionLabel = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0 0 12px',
}

const cartItemRow = {
  padding: '12px 0',
  borderBottom: '1px solid #f3f4f6',
}

const cartItemImage = {
  width: '64px',
  height: '64px',
  objectFit: 'cover' as const,
  borderRadius: '4px',
  backgroundColor: '#f3f4f6',
}

const cartItemTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 4px',
}

const cartItemPrice = {
  fontSize: '14px',
  color: '#2563eb',
  fontWeight: '600',
  margin: '0',
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

export default function AbandonedCartEmail({
  storeName,
  customerName,
  cartItems,
  cartUrl,
  unsubscribeUrl,
  logoUrl,
}: AbandonedCartEmailProps) {
  const greeting = customerName ? `Hi ${customerName},` : 'Hi there,'

  return (
    <Html lang="en">
      <Head />
      <Preview>You left something behind — complete your order at {storeName}</Preview>
      <Body style={main}>
        <Container style={container}>
          {logoUrl && (
            <Section style={logoSection}>
              <Img src={logoUrl} alt={`${storeName} logo`} width="120" height="40" />
            </Section>
          )}

          <Text style={heading}>You left something behind</Text>

          <Text style={bodyText}>{greeting}</Text>
          <Text style={bodyText}>
            It looks like you left some items in your cart at {storeName}. They&apos;re
            still waiting for you!
          </Text>

          {cartItems.length > 0 && (
            <Section>
              <Text style={sectionLabel}>Your cart</Text>
              {cartItems.map((item, index) => (
                <Row key={index} style={cartItemRow}>
                  <Column width={80}>
                    {item.imageUrl ? (
                      <Img
                        src={item.imageUrl}
                        alt={item.title}
                        width="64"
                        height="64"
                        style={cartItemImage}
                      />
                    ) : (
                      <div style={{ ...cartItemImage, display: 'block' }} />
                    )}
                  </Column>
                  <Column>
                    <Text style={cartItemTitle}>{item.title}</Text>
                    <Text style={cartItemPrice}>{item.price}</Text>
                  </Column>
                </Row>
              ))}
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button href={cartUrl} style={button}>
              Complete Your Purchase
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            You received this email because you have an abandoned cart at {storeName}.
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

AbandonedCartEmail.PreviewProps = {
  storeName: 'Acme Store',
  customerName: 'Jane',
  cartItems: [
    { title: 'Blue Sneakers', price: '$89.00', imageUrl: undefined },
    { title: 'White T-Shirt', price: '$29.00', imageUrl: undefined },
  ],
  cartUrl: 'https://example.com/cart',
  unsubscribeUrl: 'https://example.com/unsubscribe?token=abc',
} satisfies AbandonedCartEmailProps
