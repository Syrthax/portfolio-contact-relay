export async function onRequestPost(context) {
  try {
    const { name, message, token } = await context.request.json();

    if (!message || !token) {
      return Response.json({ success: false }, { status: 400 });
    }

    const verify = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: context.env.TURNSTILE_SECRET,
          response: token,
        }),
      }
    );

    const result = await verify.json();

    if (!result.success) {
      return Response.json({ success: false }, { status: 403 });
    }

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ success: false }, { status: 500 });
  }
}
