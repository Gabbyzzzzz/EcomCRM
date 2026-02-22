import 'dotenv/config'
import { db } from '../src/lib/db'
import { emailTemplates } from '../src/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// ─── Shop ID ──────────────────────────────────────────────────────────────────

const shopUrl = process.env.SHOPIFY_STORE_URL ?? ''
const shopId = new URL(shopUrl).hostname

// ─── Design Helpers ───────────────────────────────────────────────────────────

function row(id: string, contents: object[], bgColor = '') {
  return {
    id,
    cells: [1],
    columns: [
      {
        id: `${id}-col`,
        contents,
        values: {
          backgroundColor: bgColor,
          padding: '20px',
          border: {},
          _meta: { htmlID: `${id}-col`, htmlClassNames: 'u_column' },
        },
      },
    ],
    values: {
      displayCondition: null,
      columns: false,
      backgroundColor: bgColor,
      columnsBackgroundColor: '',
      backgroundImage: {
        url: '',
        fullWidth: true,
        repeat: 'no-repeat',
        size: 'custom',
        position: 'center',
      },
      padding: '0px',
      hideDesktop: false,
      _meta: { htmlID: id, htmlClassNames: 'u_row' },
      selectable: true,
      draggable: true,
      duplicatable: true,
      deletable: true,
      hideable: true,
    },
  }
}

function headingBlock(
  id: string,
  text: string,
  fontSize = '28px',
  color = '#333333'
) {
  return {
    id,
    type: 'heading',
    values: {
      containerPadding: '10px',
      anchor: '',
      headingType: 'h1',
      fontWeight: 700,
      fontSize,
      color,
      lineHeight: '140%',
      linkStyle: {
        inherit: true,
        linkColor: '#0000ee',
        linkHoverColor: '#0000ee',
        linkUnderline: true,
        linkHoverUnderline: true,
      },
      hideDesktop: false,
      displayCondition: null,
      _meta: { htmlID: id, htmlClassNames: 'u_content_heading' },
      selectable: true,
      draggable: true,
      duplicatable: true,
      deletable: true,
      hideable: true,
      text: `<h1 style="margin: 0; line-height: 140%; text-align: center; word-wrap: break-word;">${text}</h1>`,
    },
  }
}

function textBlock(id: string, text: string, color = '#555555') {
  return {
    id,
    type: 'text',
    values: {
      containerPadding: '10px',
      anchor: '',
      fontSize: '14px',
      color,
      lineHeight: '160%',
      linkStyle: {
        inherit: true,
        linkColor: '#0000ee',
        linkHoverColor: '#0000ee',
        linkUnderline: true,
        linkHoverUnderline: true,
      },
      hideDesktop: false,
      displayCondition: null,
      _meta: { htmlID: id, htmlClassNames: 'u_content_text' },
      selectable: true,
      draggable: true,
      duplicatable: true,
      deletable: true,
      hideable: true,
      text: `<p style="margin: 0; text-align: center; word-wrap: break-word;">${text}</p>`,
    },
  }
}

function buttonBlock(
  id: string,
  label: string,
  href = '#',
  bgColor = '#3B82F6'
) {
  return {
    id,
    type: 'button',
    values: {
      containerPadding: '20px',
      anchor: '',
      href: { name: 'web', values: { href, target: '_blank' } },
      buttonColors: {
        color: '#FFFFFF',
        backgroundColor: bgColor,
        hoverColor: '#FFFFFF',
        hoverBackgroundColor: bgColor,
      },
      size: { autoWidth: true, width: '100%' },
      fontWeight: 700,
      fontSize: '14px',
      textAlign: 'center',
      lineHeight: '120%',
      padding: '12px 30px',
      border: {},
      borderRadius: '4px',
      hideDesktop: false,
      displayCondition: null,
      _meta: { htmlID: id, htmlClassNames: 'u_content_button' },
      selectable: true,
      draggable: true,
      duplicatable: true,
      deletable: true,
      hideable: true,
      text: `<span style="word-break: break-word; line-height: 168%;">${label}</span>`,
      calculatedWidth: 152,
      calculatedHeight: 43,
    },
  }
}

function dividerBlock(id: string) {
  return {
    id,
    type: 'divider',
    values: {
      width: '100%',
      border: {
        borderTopWidth: '1px',
        borderTopStyle: 'solid',
        borderTopColor: '#EEEEEE',
      },
      textAlign: 'center',
      containerPadding: '10px',
      anchor: '',
      hideDesktop: false,
      displayCondition: null,
      _meta: { htmlID: id, htmlClassNames: 'u_content_divider' },
      selectable: true,
      draggable: true,
      duplicatable: true,
      deletable: true,
      hideable: true,
    },
  }
}

function makeDesign(id: string, rows: object[], bgColor = '#F4F4F4') {
  return {
    schemaVersion: 12,
    counters: {
      u_row: rows.length,
      u_column: rows.length,
      u_content_text: 2,
      u_content_image: 1,
      u_content_button: 1,
      u_content_heading: 1,
      u_content_divider: 1,
    },
    body: {
      id,
      rows,
      headers: [],
      footers: [],
      values: {
        textColor: '#000000',
        backgroundColor: bgColor,
        backgroundImage: {
          url: '',
          fullWidth: true,
          repeat: 'no-repeat',
          size: 'custom',
          position: 'center',
        },
        preheaderText: '',
        linkStyle: {
          body: true,
          linkColor: '#0000ee',
          linkHoverColor: '#0000ee',
          linkUnderline: true,
          linkHoverUnderline: true,
        },
        fontFamily: { label: 'Arial', value: 'arial,helvetica,sans-serif' },
        _meta: { htmlID: 'u_body', htmlClassNames: 'u_body' },
      },
    },
  }
}

// ─── Preset Designs ───────────────────────────────────────────────────────────

const WELCOME_DESIGN = makeDesign('welcome-doc', [
  row('welcome-header', [headingBlock('welcome-h1', 'Welcome to the Family!', '28px', '#FFFFFF')], '#1E40AF'),
  row('welcome-content', [
    textBlock('welcome-t1', "Thank you for joining us. We're thrilled to have you."),
    buttonBlock('welcome-btn', 'Shop Now', '#', '#1E40AF'),
  ]),
  row('welcome-footer', [
    dividerBlock('welcome-div'),
    textBlock(
      'welcome-unsub',
      "You're receiving this because you opted in. <a href='#'>Unsubscribe</a>.",
      '#999999'
    ),
  ]),
])

const ABANDONED_CART_DESIGN = makeDesign('abandoned-cart-doc', [
  row(
    'cart-header',
    [headingBlock('cart-h1', 'You Left Something Behind', '28px', '#FFFFFF')],
    '#F59E0B'
  ),
  row('cart-content', [
    textBlock('cart-t1', 'Your cart is waiting! Complete your purchase before items sell out.'),
    buttonBlock('cart-btn', 'Return to Cart', '#', '#F59E0B'),
  ]),
  row('cart-footer', [
    dividerBlock('cart-div'),
    textBlock(
      'cart-unsub',
      "You're receiving this because you opted in. <a href='#'>Unsubscribe</a>.",
      '#999999'
    ),
  ]),
])

const REPURCHASE_DESIGN = makeDesign('repurchase-doc', [
  row(
    'repurchase-header',
    [headingBlock('repurchase-h1', 'Time to Stock Up?', '28px', '#FFFFFF')],
    '#10B981'
  ),
  row('repurchase-content', [
    textBlock(
      'repurchase-t1',
      "It's been a while since your last order. Your favorites are still available!"
    ),
    buttonBlock('repurchase-btn', 'Shop Again', '#', '#10B981'),
  ]),
  row('repurchase-footer', [
    dividerBlock('repurchase-div'),
    textBlock(
      'repurchase-unsub',
      "You're receiving this because you opted in. <a href='#'>Unsubscribe</a>.",
      '#999999'
    ),
  ]),
])

const WINBACK_DESIGN = makeDesign('winback-doc', [
  row(
    'winback-header',
    [headingBlock('winback-h1', 'We Miss You!', '28px', '#FFFFFF')],
    '#8B5CF6'
  ),
  row('winback-content', [
    textBlock(
      'winback-t1',
      "It's been a while. Here's an exclusive offer to welcome you back: use code WINBACK15 for 15% off."
    ),
    buttonBlock('winback-btn', 'Claim Your Discount', '#', '#8B5CF6'),
  ]),
  row('winback-footer', [
    dividerBlock('winback-div'),
    textBlock(
      'winback-unsub',
      "You're receiving this because you opted in. <a href='#'>Unsubscribe</a>.",
      '#999999'
    ),
  ]),
])

const VIP_DESIGN = makeDesign('vip-doc', [
  row(
    'vip-header',
    [headingBlock('vip-h1', 'You\'re a VIP \u2746', '28px', '#FFFFFF')],
    '#B45309'
  ),
  row('vip-content', [
    textBlock(
      'vip-t1',
      'As one of our most valued customers, you get exclusive early access to new arrivals and special rewards.'
    ),
    buttonBlock('vip-btn', 'Shop the VIP Collection', '#', '#B45309'),
  ]),
  row('vip-footer', [
    dividerBlock('vip-div'),
    textBlock(
      'vip-unsub',
      "You're receiving this because you opted in. <a href='#'>Unsubscribe</a>.",
      '#999999'
    ),
  ]),
])

// ─── Presets List ─────────────────────────────────────────────────────────────

const PRESETS = [
  { name: 'Welcome', design: WELCOME_DESIGN },
  { name: 'Abandoned Cart', design: ABANDONED_CART_DESIGN },
  { name: 'Repurchase', design: REPURCHASE_DESIGN },
  { name: 'Win-back', design: WINBACK_DESIGN },
  { name: 'VIP', design: VIP_DESIGN },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding preset templates for shop: ${shopId}`)

  const existing = await db
    .select({ id: emailTemplates.id, name: emailTemplates.name })
    .from(emailTemplates)
    .where(
      and(
        eq(emailTemplates.shopId, shopId),
        eq(emailTemplates.isPreset, true)
      )
    )

  const existingByName = new Map(existing.map((r) => [r.name, r.id]))

  for (const preset of PRESETS) {
    const existingId = existingByName.get(preset.name)
    if (existingId) {
      await db
        .update(emailTemplates)
        .set({ designJson: preset.design, html: null, updatedAt: new Date() })
        .where(eq(emailTemplates.id, existingId))
      console.log(`  [${preset.name}] updated`)
      continue
    }
    await db.insert(emailTemplates).values({
      shopId,
      name: preset.name,
      designJson: preset.design,
      html: null,
      isPreset: true,
    })
    console.log(`  [${preset.name}] inserted`)
  }

  console.log('Done!')
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
