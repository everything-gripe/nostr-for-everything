import 'websocket-polyfill'
import ogs from 'open-graph-scraper'
import probeImageSize from 'probe-image-size'
import {nip05, nip19, SimplePool} from "nostr-tools";

const urlRegex = /https?:\/\/(?:www\.)?([-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6})\b[-a-zA-Z0-9()@:%_+.~#?&\/=]*/gm
const onlyUrlRegex = new RegExp(`^${urlRegex.source}$`)
const tagRegex = /(#\[(\d+)])/gm
const hashtagRegex = /(#(\w+))/gm
const nostrRegex = /(nostr:(\w+))/gm

async function getEvents({limit, filter = {}}) {
    const pool = new SimplePool()

    const relays = [
        // "wss://relay.damus.io",
        // "wss://nostr-pub.wellorder.net",
        // "wss://nostr.mom",
        // "wss://no.str.cr",
        // "wss://nostr.wine",
        // "wss://e.nos.lol",
        // "wss://relay.nostrdocs.com",
        // "wss://nostr-pub1.southflorida.ninja",
        // "wss://relay.lacosanostr.com",
        // "wss://relay.727whiskey.com",
        // "wss://nostr.topeth.info",
        // "wss://nostr.bongbong.com",
        // "wss://nostr.bitcoiner.social",
        // "wss://nostr.w3ierd.tech",
        // "wss://nostr-relay.derekross.me",
        // "wss://relay.nostr.bg",
        // "wss://nostr.bitcoiner.social",
        // "wss://nos.lol",
        // "wss://relay.nostr.ch",
        // "wss://relay.mostr.pub",
        // "wss://atlas.nostr.land",
        // "wss://relay.nostr.com.au",
        // "wss://puravida.nostr.land",
        // "wss://relay.nostrich.de",
        "wss://relay.orangepill.dev",
        "wss://nostr.orangepill.dev",
        // "wss://relay.plebstr.com",
        // "wss://rsslay.nostr.moe",
        // "wss://eden.nostr.land",
        // "wss://relay.snort.social",
        // "wss://relay.nostr.band",
        // "wss://relay.nostrati.com",
        // "wss://nostr.inosta.cc",
        // "wss://nostr.gives.africa",
        // "wss://nostr.oxtr.dev",
        // "wss://nostr.milou.lol",
        // "wss://nostr.sandwich.farm",
        // "wss://nostr.mutinywallet.com",
        // "wss://expensive-relay.fiatjaf.com",
        // "wss://nostr-relay.wlvs.space",
        // "wss://nostr.rocks",
        // "wss://nostr.fmt.wiz.biz",
        // "wss://nostr.orangepill.dev"
    ]

    const {filterFunc, ...relayFilter} = filter

    let events = await pool.list(relays, [
        {
            limit,
            kinds: [1],
            ...relayFilter
        }
    ])

    if (filterFunc) {
        events = events.filter(filterFunc)
    }

    return events.sort((eventLeft, eventRight) => eventRight.created_at - eventLeft.created_at);
}

export async function getPubkey(user) {
    const parenthesesRegex = /\((.*?)\)$/
    const parenthesesMatch = user.match(parenthesesRegex)
    if (parenthesesMatch) {
        user = parenthesesMatch[1]
    }

    const userNpubRegex = /(npub\w+)/
    const npubMatch = user.match(userNpubRegex)
    if (npubMatch) {
        user = nip19.decode(npubMatch[1]).data
    } else {
        nip05.useFetchImplementation(require('node-fetch'))
        user = (await nip05.queryProfile(user))?.pubkey
    }

    return user
}

export async function getUser(pubkey) {
    const user = JSON.parse(deduplicateEventsByLatestVersion(await getEvents({
        limit: 1,
        filter: {
            kinds: [0],
            authors: [pubkey]
        }
    }))[0]?.content || '{}')

    return {
        kind: "t2",
        data: {
            icon_img: user.picture,
            name: displayNameOrUsername(user, pubkey),
            id: pubkey,
            subreddit: {
                public_description: user.about,
                display_name: displayNameOrUsername(user, pubkey),
                display_name_prefixed: `${displayNameOrUsername(user, pubkey)}`,
                url: `/u/${username(user, pubkey)}`,
                subreddit_type: "user",
                icon_img: user.picture,
            }
        }
    }
}

async function getEventAuthors(events) {
    if (!events?.length) return {}

    const authors = [...new Set(events.map(event => event.pubkey))]
    const authorEvents = deduplicateEventsByLatestVersion(await getEvents({
        filter: {
            kinds: [0],
            authors
        }
    }))

    return Object.fromEntries(authorEvents.map(event => [event.pubkey, JSON.parse(event.content)]));
}

export async function getPosts(limit, filter = {}, subreddit) {
    filter.filterFunc = isNotReply
    const events = await getEvents({limit, filter});
    const authors = await getEventAuthors(events);

    return {
        kind: "Listing",
        data: {
            after: events[events.length -1]?.created_at,
            dist: events.length,
            modhash: "",
            geo_filter: null,
            children: await Promise.all(events.map(async event => await convertEventToPost(event, authors, subreddit))),
            before: null
        }
    }
}

function deduplicateEventsByLatestVersion(events) {
    const deduplicated = {};

    for (const event of events) {
        const pubkey = event.pubkey
        const createdAt = event.created_at

        if (!(pubkey in deduplicated) || createdAt > deduplicated[pubkey].created_at) {
            deduplicated[pubkey] = event
        }
    }

    return Object.values(deduplicated)
}

export async function getNestedComments(ids, limit, filter = {}, subreddit) {
    const post = await getPosts(1,
        {
            ids: [ids.postId]
        }, subreddit
    )

    if (ids.commentId) {
        var comment = (await getEvents({
            limit: 1,
            filter: {
                ids: [ids.commentId]
            }
        }))[0]
    }

    const events = await getEvents({
        limit,
        filter: {
            filterFunc: isReply,
            '#e': [ids.postId],
            ids: comment ? [...new Set(comment.tags.filter(tag => tag[0] === "e").map(tag => tag[1]))] : undefined,
            ...filter
        },
    });

    if (comment) {
        const replyEvents = await getEvents({
            limit,
            filter: {
                filterFunc: isReply,
                '#e': [ids.commentId],
                ...filter
            },
        });

        events.push(comment, ...replyEvents)
    }

    const authors = await getEventAuthors(events);

    return [post, {
        kind: "Listing",
        data: {
            after: events[events.length -1]?.created_at,
            dist: events.length,
            modhash: "",
            geo_filter: null,
            children: await nestEvents(ids.postId, events, authors, subreddit),
            before: null
        }
    }]
}


export async function getFlatComments(limit, filter = {}, subreddit) {
    const events = await getEvents({
        limit,
        filter: {
            filterFunc: isReply,
            ...filter
        }
    });

    const authors = await getEventAuthors(events);

    return {
        kind: "Listing",
        data: {
            after: events[events.length -1]?.created_at,
            dist: events.length,
            modhash: "",
            geo_filter: null,
            children: await Promise.all(events.map(async event => {
                const postId = getReplyIds(event).rootId
                return await convertEventToComment(postId, event, authors, subreddit)
            })),
            before: null
        }
    }
}

export async function getPostsAndComments(limit, filter = {}, subreddit) {
    const events = await getEvents({
        limit,
        filter: {
            ...filter
        }
    });

    const authors = await getEventAuthors(events);

    return {
        kind: "Listing",
        data: {
            after: events[events.length -1]?.created_at,
            dist: events.length,
            modhash: "",
            geo_filter: null,
            children: await Promise.all(events.map(async event => {
                if (isReply(event)) {
                    const postId = getReplyIds(event).rootId
                    return await convertEventToComment(postId, event, authors)
                } else {
                    return await convertEventToPost(event, authors, subreddit)
                }
            })),
            before: null
        }
    }
}

function getReplyIds(event) {
    const ids = {}
    for (const tag of event.tags || []) {
        if (tag[0] === "e") {
            const eventId = tag[1];
            if (tag.length === 2) {
                if (!ids.rootId) {
                    ids.rootId = eventId
                }
                ids.replyId = eventId
            } else if (tag.length >= 4) {
                const eventId = tag[1];
                const marker = tag[3];

                //TODO: Consider if there is no marker
                if (marker === "root") {
                    ids.rootId = eventId
                } else if (marker === "reply") {
                    ids.replyId = eventId;
                } else if (marker === "mention") {

                }
            }
        }
    }
    return ids;
}

async function nestEvents(rootId, flatEvents, authors, subreddit) {
    const events = {};

    for (const event of flatEvents) {

        let replyIds = getReplyIds(event)

        const parentId = replyIds.replyId ?? replyIds.rootId
        events[parentId] ??= [];
        events[parentId].push({event, comment: await convertEventToComment(replyIds.rootId, event, authors, subreddit)})
    }

    for (const eventId in events) {
        events[eventId].sort((leftEvent, rightEvent) => rightEvent.event.created_at - leftEvent.event.created_at)
        for (const event of events[eventId]) {
            const replies = events[event.event.id]
            if (replies) {
                event.comment.data.replies = {
                    kind: "Listing",
                    data: {
                        after: null,
                        dist: null,
                        modhash: "",
                        geo_filter: null,
                        children: replies.map(event => event.comment),
                        before: null
                    }
                }
            }
        }
    }

    return events[rootId]?.map(event => event.comment) ?? [];
}

export const displayNameOrUsername = (user, pubkey) => displayName(user) || username(user, pubkey)
export const displayName = (user) => user.display_name || user.displayName || user.name || user.username
export const username = (user, pubkey) => user.nip05 || nip19.npubEncode(pubkey)
export const author = (user, pubkey)=> user ? displayName(user) ? `${displayName(user)} (${username(user, pubkey)})` : username(user, pubkey) : nip19.npubEncode(pubkey);
export const subject = event => event.tags.find(tag => tag[0] === 'subject')?.[1]
export const isNotReply = event => !isReply(event)
//TODO: Consider if there is no marker
export const processContent = async event => {
    const mediaMetadata = {}

    const content = await(await(await(await event.content
        .replaceAll(hashtagRegex, '[$1](/r/$2)')
        .replaceAllAsync(tagRegex, async (substring, ...args) => await tagToUrl(event, substring, ...args)))
        .replaceAllAsync(nostrRegex, nip21ToUrl))
        .replaceAllAsync(urlRegex, async (substring, ...args) => {
            const imageUrl = substring

            try {
                const imageSize = await probeImageSize(imageUrl)
                let imageUrlEncoded = encodeURIComponent(imageUrl).replace(/\.(?![^.]+$)/g, '%2E')
                const imageId = imageUrlEncoded.substring(0, imageUrlEncoded.length -(imageSize.type.length + 1))

                mediaMetadata[imageId] = {
                    id: imageId,
                    status: "valid",
                    e: "Image",
                    m: `image/${imageSize.type}`,
                    p: [{
                        y: imageSize.height,
                        x: imageSize.width,
                        u: `https://preview.redd.it/${imageUrlEncoded}?width=${imageSize.width}&amp;format=pjpg&amp;auto=webp&amp;v=enabled&amp;s=9cc0b6d6a1681042ab2726257ecaa105c621212e`
                    }],
                    s: {
                        y: imageSize.height,
                        x: imageSize.width,
                        u: `https://preview.redd.it/${imageUrlEncoded}?width=${imageSize.width}&amp;format=pjpg&amp;auto=webp&amp;v=enabled&amp;s=9cc0b6d6a1681042ab2726257ecaa105c621212e`,
                        [imageSize.type]: `https://preview.redd.it/${imageUrlEncoded}?width=${imageSize.width}&amp;format=pjpg&amp;auto=webp&amp;v=enabled&amp;s=9cc0b6d6a1681042ab2726257ecaa105c621212e`,
                    },
                }

                return `https://preview.redd.it/${imageUrlEncoded}?width=${imageSize.width}&amp;format=pjpg&amp;auto=webp&amp;v=enabled&amp;s=9cc0b6d6a1681042ab2726257ecaa105c621212e`
            } catch (e) {
                return substring
            }
        }))

    return {content, mediaMetadata}
}

export const isReply = event => event.tags
    .filter(tag => tag[0] === "e")
    .some(tag => tag[3] !== "mention")

async function convertEventToPost(event, authors, subreddit = "") {
    const convertedData = {
        kind: "t3",
        data: {
            approved_at_utc: null,
            subreddit: "",
            selftext: "",
            author_fullname: "",
            saved: false,
            mod_reason_title: null,
            gilded: 0,
            clicked: false,
            title: "",
            link_flair_richtext: [],
            subreddit_name_prefixed: "",
            hidden: false,
            pwls: 6,
            link_flair_css_class: null,
            downs: 0,
            thumbnail_height: null,
            top_awarded_type: null,
            hide_score: false,
            name: "",
            quarantine: false,
            link_flair_text_color: "dark",
            upvote_ratio: 0,
            author_flair_background_color: null,
            subreddit_type: "public",
            ups: 0,
            total_awards_received: 0,
            media_embed: {},
            media_metadata: {},
            thumbnail_width: null,
            author_flair_template_id: null,
            is_original_content: false,
            user_reports: [],
            secure_media: null,
            is_reddit_media_domain: false,
            is_meta: false,
            category: null,
            secure_media_embed: {},
            link_flair_text: null,
            can_mod_post: false,
            score: 0,
            approved_by: null,
            is_created_from_ads_ui: false,
            author_premium: false,
            thumbnail: "",
            edited: false,
            author_flair_css_class: null,
            author_flair_richtext: [],
            gildings: {},
            content_categories: null,
            is_self: false,
            mod_note: null,
            created: 0,
            link_flair_type: "text",
            wls: 6,
            removed_by_category: null,
            banned_by: null,
            author_flair_type: "text",
            domain: "",
            allow_live_comments: true,
            selftext_html: null,
            likes: null,
            suggested_sort: null,
            banned_at_utc: null,
            view_count: null,
            archived: false,
            no_follow: false,
            is_crosspostable: true,
            pinned: false,
            over_18: false,
            all_awardings: [],
            awarders: [],
            media_only: false,
            can_gild: true,
            spoiler: false,
            locked: false,
            author_flair_text: null,
            treatment_tags: [],
            visited: false,
            removed_by: null,
            num_reports: null,
            distinguished: null,
            subreddit_id: "",
            author_is_blocked: false,
            mod_reason_by: null,
            removal_reason: null,
            link_flair_background_color: "",
            id: "",
            is_robot_indexable: true,
            report_reasons: null,
            author: "",
            discussion_type: null,
            num_comments: 0,
            send_replies: true,
            whitelist_status: "all_ads",
            contest_mode: false,
            mod_reports: [],
            author_patreon_flair: false,
            author_flair_text_color: null,
            permalink: "",
            parent_whitelist_status: "all_ads",
            stickied: false,
            url: "",
            subreddit_subscribers: 0,
            created_utc: 0,
            num_crossposts: 0,
            media: null,
            is_video: false
        }
    };

    convertedData.data.title = subject(event)

    // convertedData.data.title = "----------------------------------------------------"
    const contentTrimmed = event.content.trim();
    const match = contentTrimmed.match(onlyUrlRegex);

    if (match) {
        convertedData.data.url = contentTrimmed
        convertedData.data.domain = match[1]

        try {
            const { result: metadata } = await ogs({url: event.content})
            convertedData.data.title ||= metadata.ogTitle

            if (metadata.ogImage[0]) {
                const preview = {
                    images: metadata.ogImage.map(image =>
                        ({
                            source: {
                                url: image.url,
                                width: image.height || 1000,
                                height: image.width || 1000
                            },
                            resolutions: [
                                {
                                    url: image.url,
                                    width: image.height || 1000,
                                    height: image.width || 1000
                                }
                            ],
                            variants: {},
                            id: image.url
                        })
                    ),
                    enabled: false
                }

                convertedData.data.thumbnail = metadata.ogImage[0].url
                convertedData.data.preview = preview
            }
        } catch (e) {}
    } else {
        const processed = await processContent(event)

        convertedData.data.selftext = processed.content
        convertedData.data.media_metadata = processed.mediaMetadata
        convertedData.data.is_self = true
    }

    convertedData.data.subreddit = subreddit
    convertedData.data.author = author(authors[event.pubkey], event.pubkey)
    convertedData.data.author_fullname = `t2_${event.pubkey}`
    // convertedData.data.name = authors[event.pubkey].display_name
    // convertedData.data.name = `t3_${eventResponse.id}`;
    convertedData.data.id = event.id;
    convertedData.data.created_utc = event.created_at;

    return convertedData;
}


async function keyToUrl(decoded) {
    switch (decoded.type) {
        case 'npub':
            // case 'nsec':
            const user = await getUser(decoded.data)
            return `[${user.data.subreddit.display_name}](${user.data.subreddit.url})`
        case 'note':
            return `/comments/${decoded.data}`
    }
}

async function nip21ToUrl(substring, ...args) {
    const decoded = nip19.decode(args[1])
    return (await keyToUrl(decoded, substring)) || substring;
}

function tagToUrl(event, substring, ...args) {
    const tag = event.tags[Number(args[1])]
    switch (tag[0]) {
        case 'p':
            return keyToUrl({type: 'npub', data: tag[1]})
        case 'e':
            return keyToUrl({type: 'note', data: tag[1]} )
    }

    return substring
}

async function convertEventToComment(postId, event, authors, subreddit = "") {
    const convertedData = {
        kind: "t1",
        data: {
            subreddit_id: "",
            approved_at_utc: null,
            author_is_blocked: false,
            comment_type: null,
            link_title: "",
            mod_reason_by: null,
            banned_by: null,
            ups: 0,
            num_reports: null,
            author_flair_type: "text",
            total_awards_received: 0,
            subreddit: "",
            link_author: "",
            likes: null,
            replies: "",
            user_reports: [],
            saved: false,
            id: "",
            banned_at_utc: null,
            mod_reason_title: null,
            gilded: 0,
            archived: false,
            collapsed_reason_code: null,
            no_follow: true,
            author: "",
            num_comments: 0,
            can_mod_post: false,
            send_replies: true,
            parent_id: "",
            score: 0,
            author_fullname: "",
            over_18: false,
            report_reasons: null,
            removal_reason: null,
            approved_by: null,
            controversiality: 0,
            media_metadata: {},
            body: "",
            edited: false,
            top_awarded_type: null,
            downs: 0,
            author_flair_css_class: null,
            is_submitter: false,
            collapsed: false,
            author_flair_richtext: [],
            author_patreon_flair: false,
            body_html: "",
            gildings: {},
            collapsed_reason: null,
            distinguished: null,
            associated_award: null,
            stickied: false,
            author_premium: false,
            can_gild: true,
            link_id: "",
            unrepliable_reason: null,
            author_flair_text_color: null,
            score_hidden: false,
            permalink: "",
            subreddit_type: "public",
            link_permalink: "",
            name: "",
            author_flair_template_id: null,
            subreddit_name_prefixed: "",
            author_flair_text: null,
            treatment_tags: [],
            created: 0,
            created_utc: 0,
            awarders: [],
            all_awardings: [],
            locked: false,
            author_flair_background_color: null,
            collapsed_because_crowd_control: null,
            mod_reports: [],
            quarantine: false,
            mod_note: null,
            link_url: ""
        }
    }

    const processed = await processContent(event)

    convertedData.data.subreddit = subreddit
    convertedData.data.author = author(authors[event.pubkey], event.pubkey);
    convertedData.data.id = event.id;
    convertedData.data.author_fullname = `t2_${event.pubkey}`
    convertedData.data.link_id = `t3_${postId}`
    // convertedData.data.link_id = `t3_7efd3372c0cbbd5b5f45cdedc14d58f28b8873e7673c642aeb7796177757e52e`
    // convertedData.data.permalink = `/r/anything/comments/${postId}/something_here/${event.id}`
    // convertedData.data.link_permalink = `https://www.reddit.com/r/anything/comments/${postId}/something_here/`
    convertedData.data.body = processed.content;
    convertedData.data.body_html = processed.content;
    convertedData.data.media_metadata = processed.mediaMetadata;
    convertedData.data.created = event.created_at;
    convertedData.data.created_utc = event.created_at;

    return convertedData;
}


String.prototype.replaceAllAsync = async function(regex, asyncFn) {
    const promises = [];
    this.replaceAll(regex, (match, ...args) => {
        const promise = asyncFn(match, ...args);
        promises.push(promise);
    });
    const data = await Promise.all(promises);
    return this.replaceAll(regex, () => data.shift());
}
