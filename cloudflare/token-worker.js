function getClaims() {
    return {
        iss: `${SINGPASS_CLIENT_ID}`,
        sub: `${SINGPASS_CLIENT_ID}`,
        aud: `${SINGPASS_ENVIRONMENT}`,
        iat: Math.round(Date.now() / 1000),
        exp: Math.round(Date.now() / 1000) + 2 * 60,
        jti: crypto.randomUUID()
    };
}

function byteStringToUint8Array(byteString) {
    const ui = new Uint8Array(byteString.length)
    for (let i = 0; i < byteString.length; ++i) {
        ui[i] = byteString.charCodeAt(i)
    }
    return ui
}

function binToUrlBase64(bin) {
    return btoa(bin)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+/g, '');
}

function strToUrlBase64(str) {
    return binToUrlBase64(utf8ToBinaryString(str));
}

function utf8ToBinaryString(str) {
    let escStr = encodeURIComponent(str);
    return escStr.replace(/%([0-9A-F]{2})/g, function (match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
    });
}

function uint8ToUrlBase64(uint8) {
    let bin = '';
    uint8.forEach(function (code) {
        bin += String.fromCharCode(code);
    });
    return binToUrlBase64(bin);
}

// https://coolaj86.com/articles/sign-jwt-webcrypto-vanilla-js/
async function generatePrivateKeyJWT() {
    const keyType = {name: 'ECDSA', namedCurve: 'P-256'};

    const jwk = JSON.parse(`${JWK}`);
    const key = await crypto.subtle.importKey('jwk', jwk, keyType, false, ["sign"]);

    const sigType = {name: 'ECDSA', hash: {name: 'SHA-256'}};

    const payload = strToUrlBase64(JSON.stringify(getClaims()));

    const headers = {typ: 'JWT', alg: 'ES256', kid: jwk.kid};

    const headers_string = strToUrlBase64(JSON.stringify(headers));

    const data = byteStringToUint8Array(headers_string + '.' + payload);

    const sig = await crypto.subtle.sign(sigType, key, data);
    const signature = uint8ToUrlBase64(new Uint8Array(sig));

    return headers_string + '.' + payload + '.' + signature;
}

async function gatherResponse(response) {
    const {headers} = response
    const contentType = headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
        return JSON.stringify(await response.json())
    } else if (contentType.includes("application/text")) {
        return response.text()
    } else if (contentType.includes("text/html")) {
        return response.text()
    } else {
        return response.text()
    }
}

async function readRequestBody(request) {
    const {headers} = request
    const contentType = headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
        return await request.json()
    } else if (contentType.includes("application/text")) {
        return request.text()
    } else if (contentType.includes("text/html")) {
        return request.text()
    } else if (contentType.includes("form")) {
        const formData = await request.formData()
        const body = {}
        for (const entry of formData.entries()) {
            body[entry[0]] = entry[1]
        }
        return body;
    } else {
        // Perhaps some other type of data was submitted in the form
        // like an image, or some other binary data.
        return 'a file';
    }
}

const encodeFormData = (data) => {
    return Object.keys(data)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
        .join('&');
}

function parseBase64(string) {
    return parse(string, base64UrlEncoding, { loose : true})
}

const base64UrlEncoding = {
    chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
    bits: 6
}

function parse(string, encoding, opts){
    // Build the character lookup table:
    if (!encoding.codes) {
        encoding.codes = {}
        for (let i = 0; i < encoding.chars.length; ++i) {
            encoding.codes[encoding.chars[i]] = i
        }
    }

    // The string must have a whole number of bytes:
    if (!opts.loose && (string.length * encoding.bits) & 7) {
        throw new SyntaxError('Invalid padding')
    }

    // Count the padding bytes:
    let end = string.length
    while (string[end - 1] === '=') {
        --end

        // If we get a whole number of bytes, there is too much padding:
        if (!opts.loose && !(((string.length - end) * encoding.bits) & 7)) {
            throw new SyntaxError('Invalid padding')
        }
    }

    // Allocate the output:
    const out = new (opts.out ?? Uint8Array)(
        ((end * encoding.bits) / 8) | 0
    )

    // Parse the data:
    let bits = 0 // Number of bits currently in the buffer
    let buffer = 0 // Bits waiting to be written out, MSB first
    let written = 0 // Next byte to write
    for (let i = 0; i < end; ++i) {
        // Read one character from the string:
        const value = encoding.codes[string[i]]
        if (value === undefined) {
            throw new SyntaxError('Invalid character ' + string[i])
        }

        // Append the bits to the buffer:
        buffer = (buffer << encoding.bits) | value
        bits += encoding.bits

        // Write out some bits if the buffer has a byte's worth:
        if (bits >= 8) {
            bits -= 8
            out[written++] = 0xff & (buffer >> bits)
        }
    }

    // Verify that we have received just enough bits:
    if (bits >= encoding.bits || 0xff & (buffer << (8 - bits))) {
        throw new SyntaxError('Unexpected end of data')
    }

    return out
}

const public_key_jwk = JSON.parse(`${SINGPASS_PUBLIC_KEY}`).keys[0];

async function isValid (jws, iss, aud, nonce) {
    const public_key = await crypto.subtle.importKey('jwk', public_key_jwk, {name: 'ECDSA', namedCurve: 'P-256'},
        false, ["verify"]);
    const jwsSigningInput = jws.split('.').slice(0, 2).join('.');
    const jwsSignature = jws.split('.')[2];

    const valid_signature = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256'}, public_key,
        parseBase64(jwsSignature), new TextEncoder().encode(jwsSigningInput));

    const body = JSON.parse(atob(jws.split('.')[1].replace(/\//g, '_').replace(/\+/g, '-').replace(/=+/g, '')));
    const now = Math.round(Date.now() / 1000);

    return valid_signature && body.exp > now && body.iss === iss && body.aud === aud && body.nonce === nonce;
}

async function handleRequest(request) {
    const reqBody = await readRequestBody(request);

    const {code, client_id, client_secret, code_verifier, grant_type, redirect_uri} = reqBody;

    if (client_id !== `${AUTH0_COMPANION_CLIENT_ID}` || client_secret !== `${AUTH0_COMPANION_CLIENT_SECRET}`)
        throw new Error(`invalid client_id/secret combination: ${client_id}`);

    const client_assertion = await generatePrivateKeyJWT();

    const code_v = new TextEncoder().encode(code_verifier);
    const code_v_s256 = await crypto.subtle.digest({name: "SHA-256"}, code_v);
    const code_challenge = uint8ToUrlBase64(new Uint8Array(code_v_s256));

    const body = {
        grant_type: grant_type,
        client_id: `${SINGPASS_CLIENT_ID}`,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: client_assertion,
        code: code,
        redirect_uri: redirect_uri
    };

    const init = {
        body: encodeFormData(body),
        method: "POST",
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        },
    };

    console.log(`sending token request to endpoint: ${SINGPASS_TOKEN_ENDPOINT}`);
    const response = await fetch(`${SINGPASS_TOKEN_ENDPOINT}`, init);
    const results = await gatherResponse(response);

    const {id_token} = JSON.parse(results);

    const valid = await isValid(id_token, `${SINGPASS_ENVIRONMENT}`, `${SINGPASS_CLIENT_ID}`, code_challenge);

    if(valid)
        return new Response(results, init);

    throw new Error(`invalid response from upstream idp.`);
}

addEventListener("fetch", event => {
    return event.respondWith(handleRequest(event.request))
})
