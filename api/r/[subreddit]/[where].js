import {getPosts} from "../../nostr";

export default async function (request, response) {
    const limit = Number(request.query.limit ?? 25)
    const after = Number(request.query.after ?? 0)

    const posts = await getPosts(limit,
        {
            '#t': [request.query.subreddit],
            'until': after || undefined
        }
    )

    response.send(
        posts
    )
}
