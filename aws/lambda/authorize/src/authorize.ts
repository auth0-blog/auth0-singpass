import {APIGatewayProxyEventV2, APIGatewayProxyResultV2} from 'aws-lambda';

const AUTH0_CUSTOM_DOMAIN = process.env.AUTH0_CUSTOM_DOMAIN;

if (!AUTH0_CUSTOM_DOMAIN)
    throw new Error('AUTH0_CUSTOM_DOMAIN undefined');

const error = (msg: string) => ({
    statusCode: 401,
    headers: {'Content-Type': 'text/plain'},
    body: msg
});

// noinspection JSUnusedGlobalSymbols
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {

    if(! event.queryStringParameters )
        return error('missing query string params');

    const state = event.queryStringParameters['state'];
    const code_challenge = event.queryStringParameters['code_challenge'];

    if(!state || !code_challenge)
        return error('missing state or code_challenge');

    const Location = `https://${AUTH0_CUSTOM_DOMAIN}/authorize?${event.rawQueryString}&&ndi_state=${state}&ndi_nonce=${code_challenge}&singpass=true`;

    console.log(`redirecting to ${Location}`);

    return { statusCode: 302,
        headers: {
            Location
        }
    };
};
