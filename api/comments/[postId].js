import {getComments} from "../nostr";

export default async function (request, response) {
    const limit = Number(request.query.limit ?? 25)
    const comments = await getComments(request.query.postId, limit)

    response.send(
        comments
    )
}
