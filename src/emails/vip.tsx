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

interface VipEmailProps {
  storeName: string
  customerName?: string
  totalSpent: string
  orderCount: number
  perks?: string[]
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

const vipBadge = {
  backgroundColor: '#fef9c3',
  border: '1px solid #fde68a',
  borderRadius: '20px',
  padding: '4px 16px',
  display: 'inline-block',
  margin: '0 auto 16px',
}

const vipBadgeText = {
  fontSize: '12px',
  fontWeight: '700',
  color: '#92400e',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
  margin: '0',
}

const badgeSection = {
  textAlign: 'center' as const,
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

const statsRow = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  display: 'flex',
  justifyContent: 'space-around' as const,
}

const statBox = {
  textAlign: 'center' as const,
  padding: '0 16px',
}

const statValue = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#2563eb',
  margin: '0 0 4px',
}

const statLabel = {
  fontSize: '12px',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0',
}

const perksSection = {
  margin: '16px 0',
}

const perksLabel = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0 0 12px',
}

const perkItem = {
  fontSize: '15px',
  color: '#1f2937',
  lineHeight: '22px',
  margin: '0 0 6px',
  paddingLeft: '20px',
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

export default function VipEmail({
  storeName,
  customerName,
  totalSpent,
  orderCount,
  perks,
  shopUrl,
  unsubscribeUrl,
  logoUrl,
}: VipEmailProps) {
  const greeting = customerName
    ? `You're a VIP, ${customerName}!`
    : "You're a VIP!"

  return (
    <Html lang="en">
      <Head />
      <Preview>You&apos;re a VIP at {storeName} — thank you for your loyalty</Preview>
      <Body style={main}>
        <Container style={container}>
          {logoUrl && (
            <Section style={logoSection}>
              <Img src={logoUrl} alt={`${storeName} logo`} width="120" height="40" />
            </Section>
          )}

          <Section style={badgeSection}>
            <div style={vipBadge}>
              <Text style={vipBadgeText}>VIP Member</Text>
            </div>
          </Section>

          <Text style={heading}>{greeting}</Text>

          <Text style={bodyText}>
            You&apos;re one of our most valued customers at {storeName}. We wanted to take
            a moment to say thank you for your incredible loyalty and support.
          </Text>

          <Section style={statsRow}>
            <div style={statBox}>
              <Text style={statValue}>{totalSpent}</Text>
              <Text style={statLabel}>Total spent</Text>
            </div>
            <div style={statBox}>
              <Text style={statValue}>{orderCount}</Text>
              <Text style={statLabel}>Orders placed</Text>
            </div>
          </Section>

          {perks && perks.length > 0 && (
            <Section style={perksSection}>
              <Text style={perksLabel}>Your exclusive perks</Text>
              {perks.map((perk, index) => (
                <Text key={index} style={perkItem}>
                  &#8226; {perk}
                </Text>
              ))}
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button href={shopUrl} style={button}>
              Shop the VIP Collection
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            You received this email because you are a valued VIP customer of {storeName}.
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

VipEmail.PreviewProps = {
  storeName: 'Acme Store',
  customerName: 'Jane',
  totalSpent: '$1,240.00',
  orderCount: 12,
  perks: [
    'Free shipping on all orders',
    'Early access to new collections',
    'Priority customer support',
  ],
  shopUrl: 'https://example.com',
  unsubscribeUrl: 'https://example.com/unsubscribe?token=abc',
} satisfies VipEmailProps
