import crypto from "crypto";
import fs from "fs";
import path from "path";
import { logger } from "./logger";

export function computeHashes(filePath: string): { sha256: string; md5: string; sha1: string } {
  const data = fs.readFileSync(filePath);
  return {
    sha256: crypto.createHash("sha256").update(data).digest("hex"),
    md5: crypto.createHash("md5").update(data).digest("hex"),
    sha1: crypto.createHash("sha1").update(data).digest("hex"),
  };
}

export function extractStrings(filePath: string): {
  urls: string[];
  ipAddresses: string[];
  emailAddresses: string[];
  domains: string[];
  printableStrings: string[];
} {
  try {
    const buffer = fs.readFileSync(filePath);
    const text = buffer.toString("utf8", 0, Math.min(buffer.length, 2 * 1024 * 1024));

    const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const domainRegex = /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(?:com|net|org|io|gov|edu|co|uk|de|fr|ru|cn|info|biz|me|app|dev|xyz|tk|ml|ga|cf|gq)\b/gi;
    const printableRegex = /[\x20-\x7E]{6,}/g;

    const urls = [...new Set(text.match(urlRegex) || [])].slice(0, 50);
    const ipAddresses = [...new Set(text.match(ipRegex) || [])].filter(ip => {
      const parts = ip.split(".");
      return parts.every(p => parseInt(p) <= 255);
    }).slice(0, 50);
    const emailAddresses = [...new Set(text.match(emailRegex) || [])].slice(0, 50);
    const domains = [...new Set(text.match(domainRegex) || [])].filter(
      d => !urls.some(u => u.includes(d)) && d.length < 100
    ).slice(0, 50);
    const printableStrings = [...new Set(text.match(printableRegex) || [])].slice(0, 100);

    return { urls, ipAddresses, emailAddresses, domains, printableStrings };
  } catch (err) {
    logger.warn({ err }, "Failed to extract strings");
    return { urls: [], ipAddresses: [], emailAddresses: [], domains: [], printableStrings: [] };
  }
}

export async function extractPdfMeta(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    const info = data.info || {};
    return {
      author: info.Author || null,
      title: info.Title || null,
      subject: info.Subject || null,
      creator: info.Creator || null,
      producer: info.Producer || null,
      creationDate: info.CreationDate || null,
      modDate: info.ModDate || null,
      pageCount: data.numpages || null,
      wordCount: data.text ? data.text.split(/\s+/).filter(Boolean).length : null,
    };
  } catch (err) {
    logger.warn({ err }, "Failed to extract PDF metadata");
    return null;
  }
}

export async function extractImageExif(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const exifReader = (await import("exif-reader")).default;
    const buffer = fs.readFileSync(filePath);
    const exif = exifReader(buffer);
    const image = exif.image || {};
    const gps = exif.gps || {};
    return {
      make: image.Make || null,
      model: image.Model || null,
      software: image.Software || null,
      dateTime: image.DateTime || null,
      gpsLatitude: gps.GPSLatitude ? convertDMSToDD(gps.GPSLatitude, gps.GPSLatitudeRef) : null,
      gpsLongitude: gps.GPSLongitude ? convertDMSToDD(gps.GPSLongitude, gps.GPSLongitudeRef) : null,
      width: image.ImageWidth || exif.exif?.PixelXDimension || null,
      height: image.ImageHeight || exif.exif?.PixelYDimension || null,
      colorSpace: exif.exif?.ColorSpace || null,
    };
  } catch (err) {
    logger.warn({ err }, "Failed to extract image EXIF");
    return null;
  }
}

function convertDMSToDD(dms: number[], ref: string): number {
  const dd = dms[0] + dms[1] / 60 + dms[2] / 3600;
  return ref === "S" || ref === "W" ? -dd : dd;
}

export async function extractEmailMeta(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const { simpleParser } = await import("mailparser");
    const buffer = fs.readFileSync(filePath);
    const parsed = await simpleParser(buffer);
    return {
      from: parsed.from?.text || null,
      to: parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map(t => t.text).join(", ") : parsed.to.text) : null,
      subject: parsed.subject || null,
      date: parsed.date?.toISOString() || null,
      messageId: parsed.messageId || null,
      receivedChain: parsed.headers.get("received")
        ? (Array.isArray(parsed.headers.get("received"))
          ? (parsed.headers.get("received") as string[])
          : [parsed.headers.get("received") as string])
        : [],
      hasAttachments: (parsed.attachments?.length ?? 0) > 0,
      attachmentNames: parsed.attachments?.map(a => a.filename || "unnamed") || [],
    };
  } catch (err) {
    logger.warn({ err }, "Failed to extract email metadata");
    return null;
  }
}

export function getFileStats(filePath: string): Record<string, unknown> {
  try {
    const stats = fs.statSync(filePath);
    return {
      created: stats.birthtime?.toISOString() || null,
      modified: stats.mtime?.toISOString() || null,
      accessed: stats.atime?.toISOString() || null,
    };
  } catch {
    return { created: null, modified: null, accessed: null };
  }
}

const BUILTIN_YARA_RULES = [
  { name: "SuspiciousURL", description: "Detects suspicious URLs", patterns: [/https?:\/\/\d+\.\d+\.\d+\.\d+/gi, /\.onion\b/gi], severity: "high" as const },
  { name: "CreditCardPattern", description: "Detects potential credit card numbers", patterns: [/\b4[0-9]{12}(?:[0-9]{3})?\b/g, /\b5[1-5][0-9]{14}\b/g], severity: "critical" as const },
  { name: "PasswordInText", description: "Detects plaintext passwords", patterns: [/password\s*[:=]\s*\S+/gi, /passwd\s*[:=]\s*\S+/gi], severity: "high" as const },
  { name: "PrivateKey", description: "Detects private key material", patterns: [/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g], severity: "critical" as const },
  { name: "Base64Encoded", description: "Large Base64 encoded blocks", patterns: [/[A-Za-z0-9+/]{100,}={0,2}/g], severity: "medium" as const },
  { name: "SQLInjection", description: "SQL injection patterns", patterns: [/(?:UNION\s+SELECT|DROP\s+TABLE|INSERT\s+INTO)/gi], severity: "high" as const },
  { name: "WindowsRegistry", description: "Windows registry paths", patterns: [/HKEY_[A-Z_]+\\[^\s"]+/g], severity: "medium" as const },
  { name: "ShellCommand", description: "Shell command execution patterns", patterns: [/(?:cmd\.exe|powershell|bash|sh)\s+[-\/][^\s]+/gi], severity: "medium" as const },
  { name: "Base64Flag", description: "Embedded flag-like patterns", patterns: [/flag\{[^}]+\}/gi, /CTF\{[^}]+\}/gi], severity: "info" as const },
  { name: "NetworkIOC", description: "Network indicators of compromise", patterns: [/(?:malware|exploit|payload|backdoor|trojan|rootkit)/gi], severity: "high" as const },
];

export function runYaraScan(filePath: string, customRules?: string): Array<{ ruleName: string; description: string; matchedStrings: string[]; severity: string }> {
  const matches: Array<{ ruleName: string; description: string; matchedStrings: string[]; severity: string }> = [];

  try {
    const buffer = fs.readFileSync(filePath);
    const text = buffer.toString("utf8", 0, Math.min(buffer.length, 5 * 1024 * 1024));

    for (const rule of BUILTIN_YARA_RULES) {
      const found: string[] = [];
      for (const pattern of rule.patterns) {
        const m = text.match(pattern) || [];
        found.push(...m.slice(0, 5));
      }
      if (found.length > 0) {
        matches.push({
          ruleName: rule.name,
          description: rule.description,
          matchedStrings: [...new Set(found)].slice(0, 10),
          severity: rule.severity,
        });
      }
    }

    if (customRules) {
      const lines = customRules.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
      for (const line of lines.slice(0, 20)) {
        try {
          const regex = new RegExp(line, "gi");
          const m = text.match(regex) || [];
          if (m.length > 0) {
            matches.push({
              ruleName: `custom_${line.substring(0, 20)}`,
              description: `Custom rule: ${line}`,
              matchedStrings: [...new Set(m)].slice(0, 10),
              severity: "medium",
            });
          }
        } catch {
          // Skip invalid regex patterns
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, "YARA scan failed");
  }

  return matches;
}
