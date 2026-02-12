import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Basic validation
    if (!body.name || !body.email || !body.message) {
      return NextResponse.json(
        { status: "error", message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Honeypot protection
    if (body.honeypot) {
      return NextResponse.json(
        { status: "error", message: "Spam detected" },
        { status: 400 }
      );
    }

    const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!scriptUrl) {
      console.error("GOOGLE_APPS_SCRIPT_URL is not configured");
      return NextResponse.json(
        { status: "error", message: "Server configuration error" },
        { status: 500 }
      );
    }

    const response = await fetch(scriptUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: body.name,
          email: body.email,
          message: body.message,
        }),
      }
    );

    const text = await response.text();

    // Google Apps Script may return empty body or non-JSON on success
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // If the script didn't return JSON but the request went through, treat as success
      if (response.ok || response.redirected) {
        data = { status: "success", message: "Message sent successfully" };
      } else {
        throw new Error("Failed to reach Google Script");
      }
    }

    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
