import {getNestedComments} from "../nostr";

export default async function (request, response) {
    const limit = Number(request.query.limit ?? 25)
    const comments = await getNestedComments({postId: request.query.postId}, limit, {}, request.query.subreddit)

    response.send(
        comments
    )
}
