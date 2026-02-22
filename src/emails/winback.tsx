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

interface WinbackEmailProps {
  storeName: string
  customerName?: string
  daysSinceLastOrder: number
  incentive?: string
  shopUrl: string
  unsubscribeUrl: string
  logoUrl?: string
  customHeadline?: string
  customBody?: string
  customCtaText?: string
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

const subheading = {
  fontSize: '16px',
  color: '#6b7280',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}

const bodyText = {
  fontSize: '16px',
  color: '#1f2937',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const incentiveBox = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const incentiveLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#2563eb',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0 0 4px',
}

const incentiveText = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#1e40af',
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

export default function WinbackEmail({
  storeName,
  customerName,
  daysSinceLastOrder,
  incentive,
  shopUrl,
  unsubscribeUrl,
  logoUrl,
  customHeadline,
  customBody,
  customCtaText,
}: WinbackEmailProps) {
  const greeting = customerName ? `We miss you, ${customerName}` : 'We miss you'
  const defaultBody = `It's been ${daysSinceLastOrder} days since your last visit and we've been thinking about you. We'd love to have you back.`
  const defaultCtaText = 'Come Back and Shop'

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`${customerName ? `We miss you, ${customerName}` : 'We miss you'} — it's been ${daysSinceLastOrder} days`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {logoUrl && (
            <Section style={logoSection}>
              <Img src={logoUrl} alt={`${storeName} logo`} width="120" height="40" />
            </Section>
          )}

          <Text style={heading}>{customHeadline ?? greeting}</Text>
          <Text style={subheading}>{storeName}</Text>

          <Text style={bodyText}>
            {customBody ?? defaultBody}
          </Text>

          <Text style={bodyText}>
            A lot has changed since your last order — new arrivals, restocks, and
            surprises await you.
          </Text>

          {incentive && (
            <Section style={incentiveBox}>
              <Text style={incentiveLabel}>Special offer for you</Text>
              <Text style={incentiveText}>{incentive}</Text>
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button href={shopUrl} style={button}>
              {customCtaText ?? defaultCtaText}
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            You received this email as a past customer of {storeName}.
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

WinbackEmail.PreviewProps = {
  storeName: 'Acme Store',
  customerName: 'Jane',
  daysSinceLastOrder: 90,
  incentive: '15% off your next order — use code COMEBACK15',
  shopUrl: 'https://example.com',
  unsubscribeUrl: 'https://example.com/unsubscribe?token=abc',
} satisfies WinbackEmailProps
