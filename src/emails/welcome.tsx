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

interface WelcomeEmailProps {
  storeName: string
  customerName?: string
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

export default function WelcomeEmail({
  storeName,
  customerName,
  unsubscribeUrl,
  logoUrl,
  customHeadline,
  customBody,
  customCtaText,
}: WelcomeEmailProps) {
  const greeting = customerName ? `Hi ${customerName},` : 'Hi there,'
  const defaultHeadline = `Welcome to ${storeName}`
  const defaultBody = `Thank you for your first order! You've made a great choice. We put real care into every product we offer, and we're committed to making sure you love what you get. As a ${storeName} customer, you'll be the first to hear about new arrivals, exclusive deals, and insider tips.`
  const defaultCtaText = 'Explore the Store'

  return (
    <Html lang="en">
      <Head />
      <Preview>Thanks for your order — here&apos;s what to expect as a {storeName} customer</Preview>
      <Body style={main}>
        <Container style={container}>
          {logoUrl && (
            <Section style={logoSection}>
              <Img src={logoUrl} alt={`${storeName} logo`} width="120" height="40" />
            </Section>
          )}

          <Text style={heading}>{customHeadline ?? defaultHeadline}</Text>
          <Text style={subheading}>You&apos;re officially one of us</Text>

          <Text style={bodyText}>{greeting}</Text>
          <Text style={bodyText}>
            {customBody ?? defaultBody}
          </Text>
          <Text style={bodyText}>
            Ready to explore? Check out our bestsellers and latest arrivals — there&apos;s something for everyone.
          </Text>

          <Section style={buttonContainer}>
            <Button href="#" style={button}>
              {customCtaText ?? defaultCtaText}
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            You received this email because you made a purchase at {storeName}.
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

WelcomeEmail.PreviewProps = {
  storeName: 'Acme Store',
  customerName: 'Jane',
  unsubscribeUrl: 'https://example.com/unsubscribe?token=abc',
} satisfies WelcomeEmailProps
