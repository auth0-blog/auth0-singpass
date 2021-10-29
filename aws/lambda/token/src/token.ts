import {APIGatewayProxyEventV2, APIGatewayProxyResultV2} from 'aws-lambda';
import * as qs from 'querystring';
import axios, {AxiosRequestConfig} from 'axios';
import {SignJWT} from 'jose/jwt/sign';
import {jwtVerify} from 'jose/jwt/verify';
import * as uuid from 'uuid';
import * as util from 'util';
import {parseJwk} from 'jose/jwk/parse';
import {createRemoteJWKSet} from 'jose/jwks/remote';
import {URL} from 'url';
import * as crypto from 'crypto';
import {SecretsManagerClient, GetSecretValueCommand} from '@aws-sdk/client-secrets-manager';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const REGION = process.env.REGION || 'ap-southeast-2';
const SINGPASS_ENVIRONMENT = process.env.SINGPASS_ENVIRONMENT || 'https://stg-id.singpass.gov.sg';
const TOKEN_ENDPOINT = process.env.TOKEN_ENDPOINT || SINGPASS_ENVIRONMENT + '/token';
const AUTH0_COMPANION_CLIENT_ID = process.env.AUTH0_COMPANION_CLIENT_ID || '';

const PRIVATE_KEY_ARN = process.env.PRIVATE_KEY_ARN;
const AUTH0_COMPANION_CLIENT_SECRET_ARN = process.env.AUTH0_COMPANION_CLIENT_SECRET_ARN;

const SINGPASS_CLIENT_ID = process.env.SINGPASS_CLIENT_ID || '';

if (!AUTH0_DOMAIN)
    throw new Error('AUTH0_DOMAIN undefined');

const error = (msg: string) => ({
    statusCode: 401,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({error: 'unauthorized', error_message: msg})
});


const client = new SecretsManagerClient({region: REGION});

async function get_private_key() {
    const data = await client.send(new GetSecretValueCommand({SecretId: PRIVATE_KEY_ARN}));
    // @ts-ignore
    return 'SecretString' in data ? data.SecretString : new Buffer(data.SecretBinary, 'base64').toString('ascii');
}

async function get_companion_app_secret() {
    const data = await client.send(new GetSecretValueCommand({SecretId: AUTH0_COMPANION_CLIENT_SECRET_ARN}));
    // @ts-ignore
    return 'SecretString' in data ? data.SecretString : new Buffer(data.SecretBinary, 'base64').toString('ascii');
}


async function response(response: Record<string, unknown>) {
    return {
        statusCode: 200,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(response)
    };
}

async function generatePrivateKeyJWT(config: { alg: string, CLIENT_ID: string, AUDIENCE: string }) {
    const private_key = JSON.parse(await get_private_key() || '{}');
    const key = await parseJwk(private_key, 'ES256');

    return await new SignJWT({})
        .setProtectedHeader({alg: config.alg, kid: /*KID*/private_key.kid})
        .setIssuedAt()
        .setIssuer(config.CLIENT_ID)
        .setSubject(config.CLIENT_ID)
        .setAudience(config.AUDIENCE)
        .setExpirationTime('2m') // NDI will not accept tokens with an exp longer than 2 minutes since iat.
        .setJti(uuid.v4())
        .sign(key);
}

interface TokenPayload {
    client_id: string,
    code: string,
    redirect_uri: string,
    grant_type: string;
}

const SINGPASS_PUBLIC_KEY = createRemoteJWKSet(new URL(`${SINGPASS_ENVIRONMENT}/.well-known/keys`));

// noinspection JSUnusedGlobalSymbols
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {

    const isBase64Encoded = event.isBase64Encoded;
    if (!event.body) return error('missing request payload.');

    const body = isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body;
    console.log('token input: ' + body);
    const params = qs.parse(body);

    // @ts-ignore
    const {client_id, code, redirect_uri, grant_type, client_secret, code_verifier}: TokenPayload = params;
    if (!client_id || !code || !redirect_uri || !grant_type)
        return error('missing valid input.');

    if (grant_type !== 'authorization_code')
        return error('invalid grant_type: ' + grant_type);

    const AUTH0_COMPANION_CLIENT_SECRET = await get_companion_app_secret();

    if (client_id !== AUTH0_COMPANION_CLIENT_ID || client_secret !== AUTH0_COMPANION_CLIENT_SECRET)
        return error('invalid client_id/secret. expecting: ' + AUTH0_COMPANION_CLIENT_SECRET);

    const client_assertion = await generatePrivateKeyJWT({
        alg: 'ES256',
        CLIENT_ID: SINGPASS_CLIENT_ID,
        AUDIENCE: SINGPASS_ENVIRONMENT
    });

    const options: AxiosRequestConfig = {
        method: 'POST',
        url: TOKEN_ENDPOINT,
        headers: {'content-type': 'application/x-www-form-urlencoded'},
        timeout: 10000,
        data: qs.stringify({
            grant_type,
            client_id: SINGPASS_CLIENT_ID,
            client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
            client_assertion,
            code,
            redirect_uri
        })
    };

    const code_v = new util.TextEncoder().encode(code_verifier);
    const code_v_s256: string = crypto.createHash('sha256').update(code_v).digest('base64')
        .replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '');

    try {
        console.log('performing post against: ' + TOKEN_ENDPOINT);

        const rsp = await axios.request(options);
        const data = rsp.data;

        const {id_token} = data;

        const {payload, protectedHeader} = await jwtVerify(id_token, SINGPASS_PUBLIC_KEY, {
            issuer: SINGPASS_ENVIRONMENT,
            audience: SINGPASS_CLIENT_ID,
        });

        if (payload.nonce !== code_v_s256)
            return error('nonce mismatch');

        console.log(protectedHeader);
        console.log(payload);
        console.log(`expected nonce: ${code_v_s256}`);

        return response(data);
    } catch (e) {
        console.log('exception', e);
        return error('exception ' + e.toString());
    }
};
