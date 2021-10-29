async function handleRequest(request) {
    console.log(`event.request: ${request}`);

    const { searchParams, search } = new URL(request.url);
    const state = searchParams.get('state');
    const code_challenge = searchParams.get('code_challenge');

    const destinationURL = `https://${AUTH0_CUSTOM_DOMAIN}/authorize${search}&ndi_state=${state}&ndi_nonce=${code_challenge}&singpass=true`;

    return Response.redirect(destinationURL, 302);
}

addEventListener("fetch", async event => {
    event.respondWith(handleRequest(event.request))
})
