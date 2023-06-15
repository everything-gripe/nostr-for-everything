import {getNestedComments} from "../../../nostr";

export default async function (request, response) {
    const limit = Number(request.query.limit ?? 25)
    const comments = await getNestedComments(request.query, limit)

    response.send(
        comments
    )
}
