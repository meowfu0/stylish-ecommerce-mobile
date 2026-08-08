import type { DashboardIconName } from "@/features/merchant-dashboard/dashboard-primitives";

/**
 * Help & Support content.
 *
 * All of it is fixture copy. There is no support API in this project, so
 * nothing here submits anything — the contact channels are shown as
 * information, not as a form that pretends to file a ticket. Keeping the copy
 * in one module means a real help-centre API can replace `loadSupportContent`
 * without touching the dialog.
 */

export type SupportTopic = {
  answer: string;
  id: string;
  question: string;
};

export type SupportSection = {
  icon: DashboardIconName;
  id: string;
  title: string;
  topics: SupportTopic[];
};

export type SupportChannel = {
  detail: string;
  icon: DashboardIconName;
  id: string;
  /** When someone can expect a reply, so the card is not a dead end. */
  responseTime: string;
  title: string;
};

export const supportSections: SupportSection[] = [
  {
    icon: "help-circle-outline",
    id: "common",
    title: "Common questions",
    topics: [
      {
        answer:
          "Open Catalog → Products, choose a draft, and use Publish from its row menu. A product needs a description, a category and at least one active variant with a price before it can go live.",
        id: "publish",
        question: "How do I publish a product to my storefront?",
      },
      {
        answer:
          "Archiving keeps a product's order history, inventory records and images intact but takes it off your storefront permanently. Deactivating simply hides it, and you can publish it again at any time.",
        id: "archive",
        question: "What is the difference between archiving and deactivating?",
      },
      {
        answer:
          "Amounts are stored in centavos and shown in Philippine pesos throughout the dashboard. Reports, orders and product prices all use the same unit.",
        id: "currency",
        question: "Which currency does the dashboard use?",
      },
    ],
  },
  {
    icon: "account-cog-outline",
    id: "account",
    title: "Account & workspace",
    topics: [
      {
        answer:
          "Use Switch Workspace at the bottom of the sidebar. It opens the same workspace picker you saw after signing in, and lists every merchant you belong to.",
        id: "switch",
        question: "How do I move between merchants?",
      },
      {
        answer:
          "Your permissions come from your role, so an administrator or owner has to change your role in Staff & Permissions. A workspace always keeps at least one active owner.",
        id: "permissions",
        question: "Why can't I open a section in the sidebar?",
      },
      {
        answer:
          "A merchant under review cannot sell yet. Selling sections stay locked and your storefront is hidden until the Velori partner team approves the application.",
        id: "review",
        question: "My store says it is under review — what does that mean?",
      },
    ],
  },
  {
    icon: "truck-outline",
    id: "orders",
    title: "Orders & fulfilment",
    topics: [
      {
        answer:
          "Orders lists everything that has been placed; Fulfilment is the working view for orders that still need packing, shipping or delivery. The same order appears in both.",
        id: "difference",
        question: "How do Orders and Fulfilment differ?",
      },
      {
        answer:
          "Open the order and use its row menu to move it to the next status. Cancelled and refunded orders keep their history rather than disappearing.",
        id: "status",
        question: "How do I move an order forward?",
      },
    ],
  },
  {
    icon: "package-variant-closed",
    id: "catalog",
    title: "Catalog & inventory",
    topics: [
      {
        answer:
          "Use Adjust Stock on a variant in Inventory → Stock Levels. Every adjustment is recorded as a movement, so Movements shows what changed, when and by how much.",
        id: "adjust",
        question: "How do I correct a stock count?",
      },
      {
        answer:
          "A variant appears in Low Stock once it reaches or falls below its reorder threshold. The sidebar badge counts the same variants.",
        id: "low-stock",
        question: "When does something count as low stock?",
      },
      {
        answer:
          "Locations are the places you hold stock. One is marked as default, and new stock movements are attributed to it unless you pick another.",
        id: "locations",
        question: "What are inventory locations for?",
      },
    ],
  },
];

export const supportChannels: SupportChannel[] = [
  {
    detail: "partners@velori.ph",
    icon: "email-outline",
    id: "email",
    responseTime: "Replies within 1 business day",
    title: "Email the partner team",
  },
  {
    detail: "+63 2 8555 0100",
    icon: "phone-outline",
    id: "phone",
    responseTime: "Weekdays, 9am – 6pm PHT",
    title: "Call merchant support",
  },
  {
    detail: "velori.ph/help",
    icon: "book-open-outline",
    id: "help-centre",
    responseTime: "Guides and release notes",
    title: "Velori Help Centre",
  },
];

export type SupportContent = {
  channels: SupportChannel[];
  sections: SupportSection[];
};

/** Stands in for a help-centre API. */
export async function loadSupportContent(): Promise<SupportContent> {
  return { channels: supportChannels, sections: supportSections };
}

/** Matches a query against both the question and its answer. */
export function searchSupport(sections: SupportSection[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return sections;

  return sections
    .map((section) => ({
      ...section,
      topics: section.topics.filter(
        (topic) =>
          topic.question.toLowerCase().includes(needle) ||
          topic.answer.toLowerCase().includes(needle),
      ),
    }))
    .filter((section) => section.topics.length > 0);
}
