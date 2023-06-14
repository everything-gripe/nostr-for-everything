import {getPubkey, getUser} from "../../nostr";

export default async function (request, response) {
    const pubkey = await getPubkey(request.query.username)
    const user = await getUser(pubkey)

    response.send(
        user
    )
}
