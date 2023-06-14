import {getPosts} from "../../nostr";

export default async function (request, response) {
    const limit = Number(request.query.limit ?? 25)
    const posts = await getPosts(limit,
        {
            '#t': [request.query.subreddit]
        }
    )

    response.send(
        posts
    )
}
