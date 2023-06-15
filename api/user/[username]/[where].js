import {getFlatComments, getPosts, getPostsAndComments, getPubkey} from "../../nostr";

export default async function (request, response) {
    const pubkey = await getPubkey(request.query.username)
    const limit = Number(request.query.limit ?? 25)

    let getPostsFunc;
    switch (request.query.where.toLowerCase()) {
        case 'comments':
            getPostsFunc = getFlatComments
            break
        case 'submitted':
            getPostsFunc = getPosts
            break
        case 'overview':
        default:
            getPostsFunc = getPostsAndComments
    }

    const posts = await getPostsFunc(limit,
        {
            authors: [pubkey]
        }
    )

    response.send(
        posts
    )
}
