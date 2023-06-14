import 'websocket-polyfill'
import {SimplePool} from "nostr-tools";

async function getEvents(limit, filter = {}) {
    const pool = new SimplePool()

    const relays = [
        "wss://relay.damus.io",
        "wss://nostr-pub.wellorder.net",
        "wss://nostr.mom",
        // "wss://no.str.cr",
        "wss://nostr.wine",
        // "wss://relay.nostr.bg",
        // "wss://nostr.bitcoiner.social",
        // "wss://nos.lol",
        // "wss://relay.nostr.ch",
        // "wss://relay.mostr.pub",
        // "wss://atlas.nostr.land",
        // "wss://relay.nostr.com.au",
        // "wss://puravida.nostr.land",
        // "wss://relay.nostrich.de",
        // "wss://relay.orangepill.dev",
        "wss://relay.plebstr.com",
        // "wss://rsslay.nostr.moe",
        // "wss://eden.nostr.land",
        "wss://relay.snort.social",
        // "wss://relay.nostr.band",
        // "wss://relay.nostrati.com",
        // "wss://nostr.inosta.cc",
        // "wss://nostr.gives.africa",
        // "wss://nostr.oxtr.dev",
        // "wss://nostr.milou.lol",
        // "wss://nostr.sandwich.farm",
        // "wss://nostr.mutinywallet.com",
        "wss://expensive-relay.fiatjaf.com",
        // "wss://nostr-relay.wlvs.space",
        // "wss://nostr.rocks",
        // "wss://nostr.fmt.wiz.biz",
        // "wss://nostr.orangepill.dev"
    ]

    return await pool.list(relays, [
        {
            ...filter,
            limit,
            kinds: [1]
        }
    ]);
}

export async function getPosts(limit, filter = {}) {
    const events = await getEvents(limit, filter);

    return {
        kind: "Listing",
        data: {
            after: null,
            dist: limit,
            modhash: "",
            geo_filter: null,
            children: events.map(event => convertEventToPost(event)),
            before: null
        }
    }
}

export async function getComments(postId, limit, filter = {}) {
    console.log(postId)
    const post = await getPosts(1,
        {
            ids: [postId]
        }
    )

    const events = await getEvents(limit,
        {
            ...filter,
            '#e': [postId]
        }
    );

    return [post, {
        kind: "Listing",
        data: {
            after: null,
            dist: limit,
            modhash: "",
            geo_filter: null,
            children: nestEvents(events, postId),
            before: null
        }
    }]
}


function nestEvents(flatEvents, rootId) {
    const events = {};

    for (const event of flatEvents) {
        const tags = event.tags || [];

        // let rootId = null;
        let replyId = null;

        for (const tag of tags) {
            if (tag[0] === "e") {
                const eventId = tag[1];
                if (tag.length === 2) {
                    replyId = eventId
                } else if (tag.length >= 4) {
                    const eventId = tag[1];
                    const marker = tag[3];

                    if (marker === "root") {
                        // rootId = eventId;
                    } else if (marker === "reply") {
                        replyId = eventId;
                    } else if (marker === "mention") {

                    }
                }
            }
        }

        const parentId = replyId ?? rootId
        events[parentId] ??= [];
        events[parentId].push(convertEventToComment(rootId, event));
    }

    for (const eventId in events) {
        for (const event of events[eventId]) {
            console.log('eventId', event.data.id)
            const replies = events[event.data.id]
            console.log('replies', replies)
            if (replies) {
                event.data.replies = {
                    kind: "Listing",
                    data: {
                        after: null,
                        dist: null,
                        modhash: "",
                        geo_filter: null,
                        children: replies,
                        before: null
                    }
                }
            }
        }
    }

    return events[rootId] ?? [];
}


function convertEventToPost(event) {
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
            is_self: true,
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

    // convertedData.data.title = "Title"
    convertedData.data.selftext = event.content;
    convertedData.data.author = event.pubkey;
    // convertedData.data.name = `t3_${eventResponse.id}`;
    convertedData.data.id = event.id;
    convertedData.data.created_utc = event.created_at;

    return convertedData;
}

function convertEventToComment(postId, event) {
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

    convertedData.data.author = event.pubkey;
    convertedData.data.id = event.id;
    convertedData.data.link_id = `t3_${postId}`
    convertedData.data.body = event.content;
    convertedData.data.body_html = event.content;
    convertedData.data.created = event.created_at
    convertedData.data.created_utc = event.created_at;

    return convertedData;
}
