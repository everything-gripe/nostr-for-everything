import {getPosts, getPubkey} from "../../nostr";

export default async function (request, response) {
    const pubkey = await getPubkey(request.query.username)
    const limit = Number(request.query.limit ?? 25)
    const posts = await getPosts(limit,
        {
            authors: [pubkey]
        }
    )

    response.send(
        posts
    )
}
