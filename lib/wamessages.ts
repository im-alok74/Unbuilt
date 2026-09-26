import { AGENCY } from "@/lib/packages";

export interface WaTemplate {
  id: string;
  label: string;
  /** When to use it, in plain words. */
  when: string;
  text: string;
}

export interface WaContext {
  business: string;
  rep: string;
  rating?: number | null;
  hasWebsite: boolean;
  demoUrl?: string;
}

const sign = (rep: string) => `${rep}\n${AGENCY.name} | ${AGENCY.site} | ${AGENCY.phone}`;

/** Ready-to-send WhatsApp messages. The rep taps one, WhatsApp opens with the text filled in. */
export function waTemplates(c: WaContext): WaTemplate[] {
  const praise = c.rating ? ` ${c.rating}★ on Google is great!` : "";
  return [
    {
      id: "intro",
      label: "First message",
      when: "Before or right after the first call",
      text: [
        `Hi, this is ${c.rep} from ${AGENCY.name}. I found *${c.business}* on Google Maps.${praise}`,
        c.hasWebsite
          ? "I noticed a few things on your website that could bring you more customers, and I would love to share them."
          : "I noticed you don't have a website yet. Customers who search for you online can't find your prices, photos or contact details, so they go to a competitor.",
        `We build simple, affordable websites for local businesses, starting at ₹5,000. Can I send you a quick preview?`,
        "",
        sign(c.rep),
      ].join("\n"),
    },
    {
      id: "demo",
      label: "Send demo website",
      when: "You made a preview site for them",
      text: [
        `Hi, ${c.rep} here from ${AGENCY.name}. I made a quick preview of how a website for *${c.business}* could look:`,
        c.demoUrl || "(demo link)",
        "Have a look on your phone and tell me what you think. We can change anything you like.",
        "",
        sign(c.rep),
      ].join("\n"),
    },
    {
      id: "followup",
      label: "Gentle follow-up",
      when: "They didn't reply for a day or two",
      text: [
        `Hi, just checking in about the website for *${c.business}*. No pressure at all. If you have any questions about price or how it works, I am happy to explain in two minutes.`,
        "",
        sign(c.rep),
      ].join("\n"),
    },
    {
      id: "nudge",
      label: "Last reminder",
      when: "Quote sent, no answer for 4+ days",
      text: [
        `Hi, I am following up on the quote I sent for *${c.business}*. I can hold the price for you this week. Would you like me to get started?`,
        "",
        sign(c.rep),
      ].join("\n"),
    },
    {
      id: "thanks",
      label: "Thank you after the call",
      when: "Right after speaking with them",
      text: [
        `Thank you for your time today! As discussed, I will send you the details for *${c.business}* shortly. Feel free to message me here anytime.`,
        "",
        sign(c.rep),
      ].join("\n"),
    },
  ];
}
