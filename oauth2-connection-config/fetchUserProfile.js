function fetchUserProfile(access_token, ctx, callback) {
    console.log('auth0-to-singpass fetchUserProfile with ctx: ' + JSON.stringify(ctx));
    const jsonwebtoken = require('jsonwebtoken@8.5.0');

    const { id_token } = ctx;

    if (!id_token) {
        return callback('[singpass_auth_failure] ID token is missing.');
    }

    const jwt = jsonwebtoken.decode(id_token);

    if (!jwt) {
        return callback('[singpass_auth_failure] ID token is malformed.');
    }

    if (!jwt.sub) {
        return callback('[singpass_auth_failure] ID token is malformed. (sub missing)');
    }

    const profile = {
        user_id: jwt.sub,
    };

    return callback(null, profile);
}
