import type { TemplateStepSeed } from '@/lib/automations/templates'
import type { AutomationTriggerConfig, AutomationTriggerType } from '@/types'

/** Prefix for all automations in this pack — used for idempotent re-import. */
export const ANAND_RADIO_HOUSE_PACK_PREFIX = 'ARH | '

export interface AutomationPackItem {
  name: string
  description: string
  trigger_type: AutomationTriggerType
  trigger_config: AutomationTriggerConfig
  steps: TemplateStepSeed[]
}

const WELCOME =
  '🙏 Namaste! Welcome to Anand Radio House, Balaghat.\n\nYour Trusted Electronics & Furniture Store.\n\nHow can we help you today?'

const MAP_LINK = 'https://maps.google.com/?q=Anand+Radio+House+Balaghat'

/** Append to detail-collection prompts — sent before the customer replies. */
function collectFooter(kind: 'enquiry' | 'service' | 'executive'): string {
  if (kind === 'service') {
    return '\n\n_Reply with the above details to register your service request._'
  }
  if (kind === 'executive') {
    return '\n\n_Reply with the above details — our executive will call you shortly._'
  }
  return '\n\n_Reply with the above details — our sales team will contact you shortly._'
}

const LOCATION_MSG =
  `📍 *Anand Radio House*\nMain Road, Near SBI\nChitragupt Nagar, Balaghat\nMadhya Pradesh\n\n🕐 *Timing:* 10:30 AM – 9:00 PM\n📞 *Phone:* +91 9589623153\n\n🗺️ Google Map:\n${MAP_LINK}`

const FALLBACK =
  'Sorry, I couldn\'t understand that. 😊\n\nPlease choose an option from the menu or type *Menu* to see options again.\n\nType *Executive* to talk with our sales team.'

const BRANDS = [
  { id: 'lg', title: 'LG' },
  { id: 'samsung', title: 'Samsung' },
  { id: 'sony', title: 'Sony' },
  { id: 'whirlpool', title: 'Whirlpool' },
  { id: 'voltas', title: 'Voltas' },
  { id: 'godrej', title: 'Godrej' },
  { id: 'haier', title: 'Haier' },
  { id: 'ifb', title: 'IFB' },
  { id: 'panasonic', title: 'Panasonic' },
  { id: 'mi', title: 'Mi' },
  { id: 'tcl', title: 'TCL' },
  { id: 'other', title: 'Other Brand' },
] as const

const ELECTRONICS_ALL = [
  { id: 'elec_led_tv', title: '📺 LED TV' },
  { id: 'elec_fridge', title: '❄️ Refrigerator' },
  { id: 'elec_washing', title: '🧺 Washing M/C' },
  { id: 'elec_ac', title: '❄️ AC' },
  { id: 'elec_cooler', title: '💨 Cooler' },
  { id: 'elec_phone', title: '📱 Smartphone' },
  { id: 'elec_laptop', title: '💻 Laptop' },
  { id: 'elec_kitchen', title: '🍳 Kitchen' },
  { id: 'elec_purifier', title: '💧 Purifier' },
  { id: 'elec_inverter', title: '🔋 Inverter' },
  { id: 'elec_audio', title: '🔊 Audio' },
  { id: 'elec_cctv', title: '📷 CCTV' },
  { id: 'elec_other', title: '➕ Other' },
] as const

const FURNITURE_ALL = [
  { id: 'furn_sofa', title: '🛋️ Sofa' },
  { id: 'furn_bed', title: '🛏️ Bed' },
  { id: 'furn_dining', title: '🍽️ Dining' },
  { id: 'furn_wardrobe', title: '👔 Wardrobe' },
  { id: 'furn_office', title: '🏢 Office' },
  { id: 'furn_chair', title: '💺 Chair' },
  { id: 'furn_mattress', title: '🛌 Mattress' },
  { id: 'furn_computer', title: '🖥️ Comp. Table' },
  { id: 'furn_other', title: '➕ Other' },
] as const

const OFFERS_ALL = [
  { id: 'offer_festival', title: '🎁 Festival' },
  { id: 'offer_exchange', title: '♻️ Exchange' },
  { id: 'offer_cashback', title: '💰 Cashback' },
  { id: 'offer_emi', title: '💳 No Cost EMI' },
  { id: 'offer_warranty', title: '🛡️ Warranty' },
] as const

const SERVICE_ALL = [
  { id: 'svc_install', title: '🔧 Installation' },
  { id: 'svc_repair', title: '🛠️ Repair' },
  { id: 'svc_warranty', title: '📋 Warranty' },
  { id: 'svc_amc', title: '🔄 AMC' },
  { id: 'svc_other', title: '➕ Other' },
] as const

/** Main menu — 6 options per flowchart (2 rows × 3 buttons). */
const MAIN_MENU_PAGE_1 = [
  { id: 'electronics', title: '📺 Electronics' },
  { id: 'furniture', title: '🛋️ Furniture' },
  { id: 'offers', title: '🎁 Offers' },
] as const

const MAIN_MENU_PAGE_2 = [
  { id: 'service', title: '🔧 Service' },
  { id: 'location', title: '📍 Location' },
  { id: 'executive', title: '👤 Executive' },
] as const

const PRODUCT_LABELS: Record<string, string> = {
  elec_led_tv: 'LED TV',
  elec_fridge: 'Refrigerator',
  elec_washing: 'Washing Machine',
  elec_ac: 'Air Conditioner',
  elec_cooler: 'Cooler',
  elec_phone: 'Smartphone',
  elec_laptop: 'Laptop',
  elec_kitchen: 'Kitchen Appliances',
  elec_purifier: 'Water Purifier',
  elec_inverter: 'Inverter & Battery',
  elec_audio: 'Home Audio',
  elec_cctv: 'CCTV',
  elec_other: 'Electronics',
}

function m(text: string): TemplateStepSeed {
  return { step_type: 'send_message', step_config: { text } }
}

function exactKw(keywords: string[]): AutomationTriggerConfig {
  return { keywords, match_type: 'exact' as const, case_sensitive: false }
}

function containsKw(keywords: string[]): AutomationTriggerConfig {
  return { keywords, match_type: 'contains' as const, case_sensitive: false }
}

const BUDGET_OPTIONS = [
  { id: 'budget_under_20k', title: '💰 Under ₹20K' },
  { id: 'budget_20_40k', title: '₹20K – ₹40K' },
  { id: 'budget_40_70k', title: '₹40K – ₹70K' },
  { id: 'budget_above_70k', title: '₹70K+' },
]

function btnMenu(
  body: string,
  options: { id: string; title: string }[],
  header?: string,
  footer?: string,
): TemplateStepSeed {
  return {
    step_type: 'send_interactive_menu',
    step_config: {
      menu_type: 'buttons',
      body,
      header,
      footer,
      options: options.slice(0, 3),
    },
  }
}

/** Split options into WhatsApp reply-button pages (max 3 buttons; 2 + More when needed). */
function createButtonPageAutomations(
  namePrefix: string,
  description: string,
  options: { id: string; title: string }[],
  navPrefix: string,
  pageBody: string,
  header?: string,
  footer?: string,
): { firstPageStep: TemplateStepSeed; navigationAutomations: AutomationPackItem[] } {
  const pages: { id: string; title: string }[][] = []
  let idx = 0
  while (idx < options.length) {
    const left = options.length - idx
    if (left <= 3) {
      pages.push(options.slice(idx))
      break
    }
    const nextPage = pages.length + 2
    pages.push([
      options[idx],
      options[idx + 1],
      { id: `${navPrefix}_${nextPage}`, title: 'Next ▶' },
    ])
    idx += 2
  }

  const firstPageStep = btnMenu(pageBody, pages[0], header, footer)
  const navigationAutomations: AutomationPackItem[] = pages.slice(1).map((pageOptions, i) => ({
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}${namePrefix} P${i + 2}`,
    description,
    trigger_type: 'keyword_match' as const,
    trigger_config: exactKw([`${navPrefix}_${i + 2}`]),
    steps: [btnMenu('Please choose:', pageOptions, header, footer)],
  }))

  return { firstPageStep, navigationAutomations }
}

/** Flowchart main menu — two rows of 3 reply buttons (all 6 options visible). */
function mainMenuSteps(preamble?: string): TemplateStepSeed[] {
  return [
    ...(preamble ? [m(preamble)] : []),
    btnMenu(
      'Please choose a category 👇',
      [...MAIN_MENU_PAGE_1],
      'Anand Radio House',
      'Balaghat • 9589623153',
    ),
    btnMenu('More options 👇', [...MAIN_MENU_PAGE_2], 'Anand Radio House'),
  ]
}

const ELECTRONICS_BUTTONS = createButtonPageAutomations(
  'Electronics',
  'Electronics category buttons',
  [...ELECTRONICS_ALL],
  'elec_menu',
  'Which product are you looking for?',
  'Electronics',
)

const FURNITURE_BUTTONS = createButtonPageAutomations(
  'Furniture',
  'Furniture category buttons',
  [...FURNITURE_ALL],
  'furn_menu',
  'Which furniture do you need?',
  'Furniture',
)

const OFFERS_BUTTONS = createButtonPageAutomations(
  'Offers',
  'Offer type buttons',
  [...OFFERS_ALL],
  'offer_menu',
  'Explore our current offers:',
  'Special Offers',
)

const SERVICE_BUTTONS = createButtonPageAutomations(
  'Service',
  'Service type buttons',
  [...SERVICE_ALL],
  'svc_menu',
  'How can we help you?',
  'Service',
)

const BUDGET_BUTTONS = createButtonPageAutomations(
  'Budget',
  'Budget range buttons',
  BUDGET_OPTIONS.map((b) => ({ id: b.id, title: b.title })),
  'budget_menu',
  'What is your approximate budget?',
  'Anand Radio House',
)

function brandMenuSteps(productId: string, label: string): {
  steps: TemplateStepSeed[]
  navAutomations: AutomationPackItem[]
} {
  const brandOpts = BRANDS.map((b) => ({
    id: `${productId}_brand_${b.id}`,
    title: b.title,
  }))
  const { firstPageStep, navigationAutomations } = createButtonPageAutomations(
    `${label} Brands`,
    `Brand buttons for ${label}`,
    brandOpts,
    `${productId}_brands`,
    'Which brand are you interested in?',
    'Anand Radio House',
  )
  return {
    steps: [
      m(`Great choice! 📺 *${label}*\n\nWhich brand are you interested in?`),
      firstPageStep,
    ],
    navAutomations: navigationAutomations,
  }
}

function productAutomation(productId: string): AutomationPackItem[] {
  const label = PRODUCT_LABELS[productId] ?? 'Product'
  const { steps, navAutomations } = brandMenuSteps(productId, label)
  return [
    {
      name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}${label}`,
      description: `Electronics: ${label} — brand selection`,
      trigger_type: 'keyword_match',
      trigger_config: exactKw([productId]),
      steps,
    },
    ...navAutomations,
  ]
}

const ALL_BRAND_KEYWORDS = ELECTRONICS_ALL.flatMap((p) =>
  BRANDS.map((b) => `${p.id}_brand_${b.id}`),
)

/** FAQ groups — 100+ customer questions covered via keyword contains. */
const FAQ_GROUPS: { name: string; keywords: string[]; reply: string }[] = [
  {
    name: 'Store Timing',
    keywords: [
      'timing', 'time', 'hours', 'open', 'close', 'closed', 'opening', 'closing',
      'kab khulta', 'kab band', 'samay', 'kitne baje', '10:30', '9 pm', 'shop time',
      'store time', 'working hours', 'business hours',
    ],
    reply:
      '🕐 *Store Timing*\n10:30 AM to 9:00 PM (All days)\n\nVisit us anytime during business hours! 🙏',
  },
  {
    name: 'Address & Location',
    keywords: [
      'address', 'location', 'kahan', 'kaha', 'where', 'map', 'direction', 'directions',
      'balaghat', 'chitragupt', 'sbi', 'main road', 'store address', 'shop address',
      'kaise pahunche', 'reach', 'landmark',
    ],
    reply: LOCATION_MSG,
  },
  {
    name: 'Contact Number',
    keywords: [
      'contact', 'number', 'phone', 'call', 'mobile', 'whatsapp', '9589623153',
      'call karna', 'phone number', 'contact number', 'customer care number',
    ],
    reply: '📞 *Contact Anand Radio House*\n+91 9589623153\n\nCall or WhatsApp us anytime during store hours! 🙏',
  },
  {
    name: 'Delivery',
    keywords: [
      'delivery', 'deliver', 'home delivery', 'shipping', 'ghar pe', 'ghar tak',
      'delivery charge', 'free delivery', 'dispatch', 'courier',
    ],
    reply:
      '🚚 *Home Delivery Available*\n\nWe deliver across Balaghat & nearby areas.\nDelivery charges depend on product & location.\n\nShare your product & pin code — our team will confirm! 📦',
  },
  {
    name: 'Installation',
    keywords: [
      'installation', 'install', 'fitting', 'setup', 'set up', 'mount', 'technician',
      'ac fitting', 'tv wall mount', 'install karoge',
    ],
    reply:
      '🔧 *Installation Service*\n\nFree/paid installation available on selected products (AC, TV, purifier, etc.).\n\nChoose *Service Request* from menu for booking.',
  },
  {
    name: 'Warranty',
    keywords: [
      'warranty', 'guarantee', 'guaranty', 'warranti', 'brand warranty',
      'extended warranty', 'amc', 'service warranty',
    ],
    reply:
      '🛡️ *Warranty*\n\nAll products come with brand warranty.\nExtended warranty available on select items.\n\nShare product name — we\'ll confirm warranty details!',
  },
  {
    name: 'Exchange Offer',
    keywords: [
      'exchange', 'old product', 'trade in', 'trade-in', 'purana', 'exchange offer',
      'old tv', 'old fridge', 'scrap',
    ],
    reply:
      '♻️ *Exchange Offer*\n\nExchange your old appliance & get the best value on a new purchase!\n\nVisit store or choose *Current Offers* from menu.',
  },
  {
    name: 'EMI & Finance',
    keywords: [
      'emi option', 'emi available', 'finance option', 'loan available',
      'no cost emi', 'nocost emi', 'installment plan', 'monthly emi',
      'credit card emi', 'finance facility', 'bajaj finance', 'emi kaise',
    ],
    reply:
      '💳 *EMI & Finance*\n\nNo Cost EMI & finance available on selected products.\n\nDocuments: Aadhar, PAN, Bank passbook, Photo.\n\nChoose *Offers* → *No Cost EMI* from menu for details!',
  },
  {
    name: 'Payment Methods',
    keywords: [
      'payment', 'pay', 'cash', 'card', 'credit card', 'debit', 'upi', 'gpay',
      'google pay', 'phonepe', 'paytm', 'online payment', 'cheque', 'cod',
    ],
    reply:
      '💰 *Payment Options*\n\n✅ Cash\n✅ Credit / Debit Card\n✅ UPI (GPay, PhonePe, Paytm)\n✅ EMI & Finance\n\nVisit store or enquire on WhatsApp!',
  },
  {
    name: 'Brands Available',
    keywords: [
      'which brand', 'brands available', 'brand available', 'kaun se brand',
      'kon se brand', 'brands do you have', 'brands you have', 'brand list',
    ],
    reply:
      '🏷️ *Brands We Stock*\n\nLG • Samsung • Sony • Whirlpool • Voltas • Godrej • Haier • IFB • Panasonic • Mi • TCL & more!\n\nChoose *Electronics* from menu to browse categories.',
  },
  {
    name: 'Electronics Products',
    keywords: [
      'what electronics', 'electronics products', 'electronic products',
      'tv available', 'fridge available', 'washing machine available',
      'which ac', 'which tv', 'which fridge', 'cooler available',
      'laptop available', 'mobile available', 'smartphone available',
    ],
    reply:
      '📺 *Electronics*\n\nLED TV • Fridge • Washing Machine • AC • Cooler • Mobile • Laptop • Kitchen • Purifier • Inverter • Audio • CCTV & more!\n\nType *Menu* or choose *Electronics* from options.',
  },
  {
    name: 'Furniture',
    keywords: [
      'what furniture', 'furniture available', 'sofa available', 'bed available',
      'dining table available', 'wardrobe available', 'mattress available',
      'furniture products', 'which sofa', 'which bed',
    ],
    reply:
      '🛋️ *Furniture*\n\nSofa • Bed • Dining • Wardrobe • Office • Chair • Mattress & more!\n\nChoose *Furniture* from the main menu.',
  },
  {
    name: 'Offers & Discount',
    keywords: [
      'any offer', 'any discount', 'current discount', 'festival offer',
      'festival sale', 'cashback offer', 'diwali offer', 'holi offer',
      'clearance sale', 'special offer', 'best deal',
    ],
    reply:
      '🎉 *Current Offers*\n\nFestival offers • Exchange • No Cost EMI • Cashback • Extended warranty!\n\nChoose *Current Offers* from menu for details.',
  },
  {
    name: 'Stock & Availability',
    keywords: [
      'available', 'availability', 'stock', 'in stock', 'milega', 'available hai',
      'ready stock', 'out of stock', 'kab milega',
    ],
    reply:
      '✅ *Availability*\n\nMost models available in store!\n\nShare product name & brand — our team will confirm stock instantly. 📞 9589623153',
  },
  {
    name: 'Price & Rate',
    keywords: [
      'what price', 'what is price', 'price kya hai', 'rate kya hai', 'kitne ka hai',
      'kitna price', 'mrp kya', 'quotation chahiye', 'quote chahiye',
      'best price kya', 'lowest price', 'final rate',
    ],
    reply:
      '💰 *Best Price Guarantee*\n\nShare product name, brand & budget — our executive will share the best offer!\n\nOr choose a category from *Menu*.',
  },
  {
    name: 'Returns & Refund',
    keywords: [
      'return', 'refund', 'replace', 'replacement', 'exchange policy', 'cancel',
    ],
    reply:
      '🔄 *Returns & Replacement*\n\nAs per brand & store policy on defective products.\n\nContact us with invoice details: 9589623153',
  },
  {
    name: 'Repair & Service',
    keywords: [
      'repair', 'service', 'broken', 'not working', 'complaint', 'service center',
      'technician', 'fix', 'kharaab', 'problem',
    ],
    reply:
      '🔧 *Service & Repair*\n\nInstallation • Repair • Warranty • AMC available.\n\nChoose *Service Request* from menu.',
  },
  {
    name: 'Accessories',
    keywords: [
      'accessory', 'accessories', 'remote', 'stand', 'cover', 'case', 'charger',
      'cable', 'hdmi', 'mount', 'stabilizer',
    ],
    reply:
      '🔌 *Accessories*\n\nTV stands, remotes, stabilizers, covers & more available in store.\n\nVisit us or ask our team on 9589623153!',
  },
]

export const ANAND_RADIO_HOUSE_AUTOMATIONS: AutomationPackItem[] = [
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Welcome & Main Menu`,
    description: 'Greet new customers and show the main interactive menu.',
    trigger_type: 'first_inbound_message',
    trigger_config: {},
    steps: mainMenuSteps(WELCOME),
  },
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Greeting → Main Menu`,
    description: 'Welcome returning customers who say hi, hello, etc.',
    trigger_type: 'keyword_match',
    trigger_config: exactKw([
      'hi',
      'hello',
      'hey',
      'hii',
      'hiii',
      'namaste',
      'namaskar',
      'good morning',
      'good evening',
      'good afternoon',
      'start chat',
    ]),
    steps: mainMenuSteps(WELCOME),
  },
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Menu (Resend)`,
    description: 'Resend main menu when customer types Menu.',
    trigger_type: 'keyword_match',
    trigger_config: exactKw(['menu', 'main menu', 'options', 'start', 'hi menu', 'offer_no_menu']),
    steps: mainMenuSteps('Here are our options 👇'),
  },
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Electronics Categories`,
    description: 'Show electronics product categories as buttons.',
    trigger_type: 'keyword_match',
    trigger_config: exactKw(['electronics']),
    steps: [
      m('Excellent! 📺\n\nWhich electronics product are you looking for?'),
      ELECTRONICS_BUTTONS.firstPageStep,
    ],
  },
  ...ELECTRONICS_BUTTONS.navigationAutomations,
  ...ELECTRONICS_ALL.flatMap((c) => productAutomation(c.id)),
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Budget Selection`,
    description: 'Ask budget after brand selection (all electronics).',
    trigger_type: 'keyword_match',
    trigger_config: exactKw(ALL_BRAND_KEYWORDS),
    steps: [
      m('Great choice! 👍\n\nWhat is your approximate budget?'),
      BUDGET_BUTTONS.firstPageStep,
    ],
  },
  ...BUDGET_BUTTONS.navigationAutomations,
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Electronics Lead Capture`,
    description: 'Collect customer details after budget selection.',
    trigger_type: 'keyword_match',
    trigger_config: exactKw(BUDGET_OPTIONS.map((b) => b.id)),
    steps: [
      m(
        'Almost done! 📝\n\nPlease share your details in one message:\n• Name\n• Mobile Number\n• City\n• Any Additional Requirement' +
          collectFooter('enquiry'),
      ),
      { step_type: 'assign_conversation', step_config: { mode: 'round_robin' } },
    ],
  },
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Furniture Categories`,
    description: 'Furniture category buttons.',
    trigger_type: 'keyword_match',
    trigger_config: exactKw(['furniture']),
    steps: [
      m('Wonderful! 🛋️\n\nWhich furniture are you interested in?'),
      FURNITURE_BUTTONS.firstPageStep,
    ],
  },
  ...FURNITURE_BUTTONS.navigationAutomations,
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Furniture Lead`,
    description: 'Capture furniture enquiry.',
    trigger_type: 'keyword_match',
    trigger_config: exactKw(FURNITURE_ALL.map((f) => f.id)),
    steps: [
      m(
        'Wonderful! 🛋️\n\nPlease share your details in one message:\n• Name\n• Mobile Number\n• City\n• Budget\n• Furniture Type\n• Any Additional Requirement' +
          collectFooter('enquiry'),
      ),
      { step_type: 'assign_conversation', step_config: { mode: 'round_robin' } },
    ],
  },
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Current Offers`,
    description: 'Show current offers as buttons.',
    trigger_type: 'keyword_match',
    trigger_config: exactKw(['offers']),
    steps: [
      m('🎉 *Current Offers at Anand Radio House*'),
      OFFERS_BUTTONS.firstPageStep,
    ],
  },
  ...OFFERS_BUTTONS.navigationAutomations,
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Offer — No Cost EMI Info`,
    description: 'EMI details when customer picks No Cost EMI offer.',
    trigger_type: 'keyword_match',
    trigger_config: exactKw(['offer_emi']),
    steps: [
      m(
        '💳 *No Cost EMI*\n\n0% interest EMI on selected products.\nDocuments: Aadhar, PAN, Bank Passbook, Photo.\n\nVisit store or speak with our finance team!',
      ),
      btnMenu('Would you like to talk to our executive?', [
        { id: 'offer_yes_exec', title: '✅ Yes, Please' },
        { id: 'offer_no_menu', title: '🏠 Main Menu' },
      ]),
    ],
  },
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Offer Details`,
    description: 'Offer information + Yes/No for executive.',
    trigger_type: 'keyword_match',
    trigger_config: exactKw([
      'offer_festival', 'offer_exchange', 'offer_cashback', 'offer_warranty',
    ]),
    steps: [
      m(
        '🎁 Great choice!\n\nVisit our store for the latest offer details & best price at Anand Radio House, Balaghat.',
      ),
      btnMenu('Would you like to talk to our executive?', [
        { id: 'offer_yes_exec', title: '✅ Yes, Please' },
        { id: 'offer_no_menu', title: '🏠 Main Menu' },
      ]),
    ],
  },
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Offer — Talk to Executive`,
    description: 'Lead capture when customer says Yes on offers.',
    trigger_type: 'keyword_match',
    trigger_config: exactKw(['offer_yes_exec']),
    steps: [
      m(
        'Please share in one message:\n• Your Name\n• Mobile Number\n• Reason\n• Preferred Time' +
          collectFooter('executive'),
      ),
      btnMenu('Meanwhile:', [{ id: 'menu', title: '🏠 Main Menu' }]),
      { step_type: 'assign_conversation', step_config: { mode: 'round_robin' } },
    ],
  },
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Service Request`,
    description: 'Service request type buttons.',
    trigger_type: 'keyword_match',
    trigger_config: exactKw(['service']),
    steps: [
      m('🔧 *Service Request*\n\nHow can we help you?'),
      SERVICE_BUTTONS.firstPageStep,
    ],
  },
  ...SERVICE_BUTTONS.navigationAutomations,
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Service Lead`,
    description: 'Capture service request details.',
    trigger_type: 'keyword_match',
    trigger_config: exactKw(SERVICE_ALL.map((s) => s.id)),
    steps: [
      m(
        'Please share in one message:\n• Name\n• Mobile Number\n• Product Name\n• Issue Description\n• Invoice Number (optional)' +
          collectFooter('service'),
      ),
      { step_type: 'assign_conversation', step_config: { mode: 'round_robin' } },
    ],
  },
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Store Location`,
    description: 'Store address, map and action buttons.',
    trigger_type: 'keyword_match',
    trigger_config: exactKw(['location']),
    steps: [
      m(LOCATION_MSG),
      btnMenu('What would you like to do?', [
        { id: 'call_store', title: '📞 Call Now' },
        { id: 'map_link', title: '🗺️ Google Map' },
        { id: 'executive', title: '💬 Executive' },
      ]),
      btnMenu('Go back:', [{ id: 'menu', title: '🏠 Main Menu' }]),
    ],
  },
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Google Map`,
    description: 'Send Google Maps link for the store.',
    trigger_type: 'keyword_match',
    trigger_config: exactKw(['map_link']),
    steps: [
      m(`🗺️ *Google Map — Anand Radio House*\n\n${MAP_LINK}`),
      btnMenu('Need more help?', [
        { id: 'call_store', title: '📞 Call Now' },
        { id: 'executive', title: '💬 Executive' },
        { id: 'menu', title: '🏠 Main Menu' },
      ]),
    ],
  },
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Call Store`,
    description: 'Share store phone number.',
    trigger_type: 'keyword_match',
    trigger_config: exactKw(['call_store']),
    steps: [
      m('📞 Call Anand Radio House:\n+91 9589623153\n\nTiming: 10:30 AM – 9:00 PM'),
      btnMenu('Need more help?', [
        { id: 'location', title: '📍 Location' },
        { id: 'executive', title: '💬 Executive' },
        { id: 'menu', title: '🏠 Main Menu' },
      ]),
    ],
  },
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Talk to Executive`,
    description: 'Transfer to sales executive.',
    trigger_type: 'keyword_match',
    trigger_config: exactKw(['executive', 'sales', 'human', 'agent', 'call me']),
    steps: [
      m(
        'Please share in one message:\n• Your Name\n• Mobile Number\n• Reason for call\n• Preferred Time' +
          collectFooter('executive'),
      ),
      btnMenu('Meanwhile:', [{ id: 'menu', title: '🏠 Main Menu' }]),
      { step_type: 'assign_conversation', step_config: { mode: 'round_robin' } },
    ],
  },
  {
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}Fallback`,
    description: 'When customer message is not understood.',
    trigger_type: 'keyword_match',
    trigger_config: containsKw([
      'help', '???', 'what', 'kya', 'samjha nahi', 'understand nahi',
    ]),
    steps: [
      m(FALLBACK),
      btnMenu('Quick options:', [
        { id: 'menu', title: '🏠 Main Menu' },
        { id: 'executive', title: '👤 Executive' },
      ]),
    ],
  },
  ...FAQ_GROUPS.map((faq) => ({
    name: `${ANAND_RADIO_HOUSE_PACK_PREFIX}FAQ: ${faq.name}`,
    description: `Auto-reply: ${faq.name}`,
    trigger_type: 'keyword_match' as const,
    trigger_config: containsKw(faq.keywords),
    steps: [
      m(faq.reply),
      btnMenu('Need more help?', [
        { id: 'menu', title: '🏠 Main Menu' },
        { id: 'executive', title: '👤 Executive' },
      ]),
    ],
  })),
]

export function getAnandRadioHousePack() {
  return {
    slug: 'anand_radio_house' as const,
    title: 'Anand Radio House — Sales Assistant',
    description:
      'Complete WhatsApp sales chatbot for Anand Radio House, Balaghat: 6-option menu, electronics & furniture enquiry, offers, service, location, FAQs & lead capture.',
    automationCount: ANAND_RADIO_HOUSE_AUTOMATIONS.length,
    automations: ANAND_RADIO_HOUSE_AUTOMATIONS,
  }
}
