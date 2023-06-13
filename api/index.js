import 'websocket-polyfill'
import {relayInit} from "nostr-tools"

export default async function (request, response) {
    const limit = Number(request.query.limit ?? 25)
    const events = []

    const relay = relayInit('wss://nostr.wine')
    await relay.connect()

    let sub = relay.sub([
        {
            limit: limit,
            kinds: [1]
        }
    ])

    sub.on('event', event => {
        events.push(event)
    })

    await new Promise((resolve) => {
        sub.on('eose', () => {
            resolve()
        })
    });

    response.send(
        {
            kind: "Listing",
            data: {
                after: null,
                dist: limit,
                modhash: "",
                geo_filter: null,
                children: events.map(event => convertEventResponse(event)),
                before: null
            }
        }
    )
}

function convertEventResponse(eventResponse) {
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

    convertedData.data.title = "Title"
    convertedData.data.selftext = eventResponse.content;
    convertedData.data.author = eventResponse.pubkey;
    // convertedData.data.name = `t3_${eventResponse.id}`;
    convertedData.data.id = eventResponse.id;
    convertedData.data.created_utc = eventResponse.created_at;

    return convertedData;
}

