
export default async function (request, response) {
    response.redirect(decodeURIComponent(request.query.image.replace(/%2E/g, '.')))
}
