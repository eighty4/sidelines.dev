export default () => {
    // todo support login redirects with ?state=
    const state = 'abcdefg'
    const redirectURI = encodeURIComponent(
        process.env.WEBAPP_ADDRESS + '/github/redirect/user/authorized',
    )
    const ghUrl = `https://github.com/login/oauth/authorize?prompt=select_account&client_id=${process.env.GH_CLIENT_ID}&state=${state}&redirect_uri=${redirectURI}`
    console.debug('gh login authorize redirect', ghUrl)
    return Response.redirect(ghUrl, 302)
}
