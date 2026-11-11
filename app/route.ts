import { after, NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { RICKROLL_URL, DISCORD_WEBHOOK_URL } = process.env;

  if (!RICKROLL_URL || !DISCORD_WEBHOOK_URL) {
    console.error("Missing environment variables");
    return new NextResponse("Server configuration error", { status: 500 });
  }

  let destination: URL;

  try {
    destination = new URL(RICKROLL_URL);
    const webhook = new URL(DISCORD_WEBHOOK_URL);

    if (!["http:", "https:"].includes(destination.protocol)) {
      throw new Error("Invalid redirect URL");
    }

    if (
      webhook.protocol !== "https:" ||
      webhook.hostname !== "discord.com"
    ) {
      throw new Error("Invalid Discord webhook URL");
    }
  } catch (error) {
    console.error("Invalid configuration:", error);
    return new NextResponse("Invalid configuration", { status: 500 });
  }

  const headers = request.headers;

  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "Unavailable";

  const info = {
    date: new Date().toISOString(),
    ip,
    location: [
      headers.get("x-vercel-ip-city"),
      headers.get("x-vercel-ip-country"),
    ]
      .filter(Boolean)
      .join(", ") || "Unavailable",
    userAgent: headers.get("user-agent"),
    platform: headers.get("sec-ch-ua-platform"),
    language: headers.get("accept-language"),
    referer: headers.get("referer"),
    origin: headers.get("origin"),
    method: request.method,
    path: request.nextUrl.pathname,
    query: request.nextUrl.search || "None",
  };

  const format = (value: string | null | undefined) =>
    String(value ?? "Unavailable")
      .replace(/[` \n\r]/g, " ")
      .slice(0, 100);

  const fields = [
    {
      name: "🌐 Network",
      value: [
        `**IP :** \`${format(info.ip)}\``,
        `**Localisation :** \`${format(info.location)}\``,
      ].join("\n"),
      inline: true,
    },
    {
      name: "💻 Device",
      value: [
        `**Navigateur :** \`${format(info.userAgent)}\``,
        `**Plateforme :** \`${format(info.platform)}\``,
        `**Langue :** \`${format(info.language)}\``,
      ].join("\n"),
      inline: true,
    },
    {
      name: "🔗 Navigator",
      value: [
        `**Méthode :** \`${format(info.method)}\``,
        `**Page :** \`${format(info.path)}\``,
        `**Query :** \`${format(info.query)}\``,
        `**Referer :** \`${format(info.referer)}\``,
        `**Origin :** \`${format(info.origin)}\``,
      ].join("\n"),
      inline: false,
    },
  ];

  after(async () => {
    try {
      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeds: [
            {
              title: "🎯 HELLO FRIEND",
              color: 0xff0000,
              fields,
              timestamp: info.date,
              footer: {
                text: "Power Trip",
              },
            },
          ],
          allowed_mentions: {
            parse: [],
          },
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.error(
          "Discord webhook error:",
          response.status,
          await response.text()
        );
      }
    } catch (error) {
      console.error("Discord notification failed:", error);
    }
  });

  return NextResponse.redirect(destination, 302);
}
