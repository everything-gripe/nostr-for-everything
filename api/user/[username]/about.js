import {getPubkey, getUser} from "../../nostr";

export default async function (request, response) {
    const pubkey = await getPubkey(request.query.username)
    if (!pubkey) return response.status(404) && response.send()

    const user = await getUser(pubkey)

    response.send(
        user
    )
}
