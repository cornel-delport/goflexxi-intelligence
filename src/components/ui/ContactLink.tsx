"use client";

import { Mail, Phone, Globe, Linkedin, Instagram, Facebook, Twitter } from "lucide-react";

/** Ensure a URL has a protocol prefix */
function withProtocol(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return "https://" + url;
}

/** Build a full URL from a social handle or URL */
function socialUrl(value: string, base: string): string {
  const v = value.trim();
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  const handle = v.startsWith("@") ? v.slice(1) : v;
  return base + handle;
}

interface Props {
  value: string | null | undefined;
  type: "email" | "phone" | "website" | "linkedin" | "instagram" | "facebook" | "twitter";
  /** Max chars to display (default: no truncation) */
  maxLen?: number;
  className?: string;
}

const ICON_CLASS = "w-3.5 h-3.5 shrink-0";

export function ContactLink({ value, type, maxLen, className = "" }: Props) {
  if (!value) return null;

  const display = maxLen && value.length > maxLen ? value.slice(0, maxLen) + "…" : value;

  const base =
    "flex items-center gap-1.5 text-xs transition-colors hover:underline focus:outline-none " +
    className;

  switch (type) {
    case "email":
      return (
        <a href={`mailto:${value}`} className={base + " text-gray-700 hover:text-brand-600"} title={value}>
          <Mail className={ICON_CLASS + " text-brand-500"} />
          <span>{display}</span>
        </a>
      );

    case "phone":
      return (
        <a href={`tel:${value.replace(/\s/g, "")}`} className={base + " text-gray-700 hover:text-green-600"} title={value}>
          <Phone className={ICON_CLASS + " text-green-500"} />
          <span>{display}</span>
        </a>
      );

    case "website":
      return (
        <a href={withProtocol(value)} target="_blank" rel="noopener noreferrer" className={base + " text-gray-500 hover:text-brand-600"} title={value}>
          <Globe className={ICON_CLASS} />
          <span>{display}</span>
        </a>
      );

    case "linkedin":
      return (
        <a href={socialUrl(value, "https://linkedin.com/in/")} target="_blank" rel="noopener noreferrer" className={base + " text-blue-600 hover:text-blue-800"} title={value}>
          <Linkedin className={ICON_CLASS} />
          <span>LinkedIn</span>
        </a>
      );

    case "instagram":
      return (
        <a href={socialUrl(value, "https://instagram.com/")} target="_blank" rel="noopener noreferrer" className={base + " text-pink-500 hover:text-pink-700"} title={value}>
          <Instagram className={ICON_CLASS} />
          <span>{display}</span>
        </a>
      );

    case "facebook":
      return (
        <a href={socialUrl(value, "https://facebook.com/")} target="_blank" rel="noopener noreferrer" className={base + " text-blue-500 hover:text-blue-700"} title={value}>
          <Facebook className={ICON_CLASS} />
          <span>{display}</span>
        </a>
      );

    case "twitter":
      return (
        <a href={socialUrl(value, "https://x.com/")} target="_blank" rel="noopener noreferrer" className={base + " text-gray-600 hover:text-gray-900"} title={value}>
          <Twitter className={ICON_CLASS} />
          <span>{display}</span>
        </a>
      );

    default:
      return null;
  }
}
