import { google } from "googleapis";
import axios from "axios";
import dotenv from "dotenv";
import { XMLParser } from "fast-xml-parser";
import * as channelService from "./channel.service.js";

dotenv.config();

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

// Helper to parse ISO 8601 duration (e.g. PT14M23S) to seconds
// Returns 0 for live streams / premieres that use "P0D" or other formats
function parseDuration(duration) {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

export const getPopularVideos = async (limit = 12, pageToken = "") => {
  try {
    const response = await youtube.videos.list({
      part: ["snippet", "statistics", "contentDetails"],
      chart: "mostPopular",
      maxResults: limit,
      pageToken: pageToken,
      regionCode: "US",
    });

    const items = response.data.items;
    const channelIds = [...new Set(items.map((i) => i.snippet.channelId))];

    // Fetch channel avatars
    const channelResponse = await youtube.channels.list({
      part: ["snippet"],
      id: channelIds,
    });
    const avatars = Object.fromEntries(
      channelResponse.data.items.map((c) => [
        c.id,
        c.snippet.thumbnails.default.url,
      ]),
    );

    return {
      items: items.map((item) => ({
        id: item.id,
        title: item.snippet.title,
        thumbnail:
          item.snippet.thumbnails.maxres?.url ||
          item.snippet.thumbnails.high?.url,
        channel: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        channelAvatar: avatars[item.snippet.channelId],
        views: parseInt(item.statistics.viewCount),
        likes: parseInt(item.statistics.likeCount),
        duration: parseDuration(item.contentDetails.duration),
        uploadedAt: item.snippet.publishedAt,
        description: item.snippet.description,
        videoUrl: `https://www.youtube.com/embed/${item.id}`,
        isYouTube: true,
      })),
      nextPageToken: response.data.nextPageToken,
      totalResults: response.data.pageInfo.totalResults,
    };
  } catch (error) {
    console.error("Error fetching popular videos:", error);
    throw error;
  }
};

export const searchVideos = async (query, limit = 12, pageToken = "") => {
  try {
    const searchResponse = await youtube.search.list({
      part: ["snippet"],
      q: query,
      maxResults: limit,
      type: ["video"],
      pageToken: pageToken,
    });

    const videoIds = searchResponse.data.items.map((item) => item.id.videoId);
    if (!videoIds.length) return { items: [], totalResults: 0 };

    // Fetch extra details (stats, contentDetails) for these videos
    const detailResponse = await youtube.videos.list({
      part: ["snippet", "statistics", "contentDetails"],
      id: videoIds,
    });

    const items = detailResponse.data.items;
    const channelIds = [...new Set(items.map((i) => i.snippet.channelId))];

    // Fetch channel avatars
    const channelResponse = await youtube.channels.list({
      part: ["snippet"],
      id: channelIds,
    });
    const avatars = Object.fromEntries(
      channelResponse.data.items.map((c) => [
        c.id,
        c.snippet.thumbnails.default.url,
      ]),
    );

    return {
      items: items.map((item) => ({
        id: item.id,
        title: item.snippet.title,
        thumbnail:
          item.snippet.thumbnails.maxres?.url ||
          item.snippet.thumbnails.high?.url,
        channel: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        channelAvatar: avatars[item.snippet.channelId],
        views: parseInt(item.statistics.viewCount),
        likes: parseInt(item.statistics.likeCount),
        duration: parseDuration(item.contentDetails.duration),
        uploadedAt: item.snippet.publishedAt,
        description: item.snippet.description,
        videoUrl: `https://www.youtube.com/embed/${item.id}`,
        isYouTube: true,
      })),
      nextPageToken: searchResponse.data.nextPageToken,
      totalResults: searchResponse.data.pageInfo.totalResults,
    };
  } catch (error) {
    console.error("Error searching videos:", error);
    throw error;
  }
};

export const getVideoDetails = async (videoId) => {
  try {
    const response = await youtube.videos.list({
      part: ["snippet", "statistics", "contentDetails"],
      id: [videoId],
    });

    if (!response.data.items.length) {
      throw new Error("Video not found");
    }

    const item = response.data.items[0];

    // Fetch channel avatar
    const channelResponse = await youtube.channels.list({
      part: ["snippet", "statistics"],
      id: [item.snippet.channelId],
    });

    const channel = channelResponse.data.items[0];

    return {
      id: item.id,
      title: item.snippet.title,
      thumbnail:
        item.snippet.thumbnails.maxres?.url ||
        item.snippet.thumbnails.high?.url,
      channel: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      channelAvatar: channel.snippet.thumbnails.default.url,
      subscribers: formatSubscribers(channel.statistics.subscriberCount),
      views: parseInt(item.statistics.viewCount),
      likes: parseInt(item.statistics.likeCount),
      duration: parseDuration(item.contentDetails.duration),
      uploadedAt: item.snippet.publishedAt,
      description: item.snippet.description,
      videoUrl: `https://www.youtube.com/embed/${item.id}`,
      isYouTube: true,
    };
  } catch (error) {
    console.error("Error fetching video details:", error);
    throw error;
  }
};

const parser = new XMLParser({
  ignoreAttributes: false,
});

export const getVideosByChannels = async (
  channelIds,
  limit = 5,
  pageToken = "",
) => {
  console.log(channelIds);

  try {
    if (!channelIds || channelIds.length === 0) {
      return { items: [], nextPageToken: null };
    }

    const targetChannels = channelIds.slice(0, 12);
    const allVideoIds = [];
    const publishedBefore = pageToken || null;

    await Promise.all(
      targetChannels.map(async (channelId) => {
        try {
          // -------- STEP 1 : RSS --------
          const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

          const res = await axios.get(rssUrl);
          const parsed = parser.parse(res.data);

          const entries = parsed?.feed?.entry || [];

          entries.slice(0, 4).forEach((video) => {
            const videoId = video["yt:videoId"];
            const published = video.published;

            if (
              videoId &&
              (!publishedBefore ||
                new Date(published) < new Date(publishedBefore))
            ) {
              allVideoIds.push(videoId);
            }
          });
        } catch (rssError) {
          console.warn(`RSS failed for ${channelId}, fallback to API`);
          console.log(`RSS failed for ${channelId}, fallback to API`);

          // -------- STEP 2 : API FALLBACK --------
          try {
            const searchParams = {
              part: ["snippet"],
              channelId,
              maxResults: 4,
              order: "date",
              type: "video",
            };

            if (publishedBefore) {
              searchParams.publishedBefore = publishedBefore;
            }

            const res = await youtube.search.list(searchParams);

            if (res.data.items) {
              allVideoIds.push(...res.data.items.map((i) => i.id.videoId));
            }
          } catch (apiErr) {
            console.error(
              `API fallback failed for channel ${channelId}`,
              apiErr.message,
            );
            console.log(
              `API fallback failed for channel ${channelId}`,
              apiErr.message,
            );
          }
        }
      }),
    );

    if (allVideoIds.length === 0) {
      return { items: [], nextPageToken: null };
    }

    // -------- STEP 3 : VIDEO DETAILS --------
    const detailResponse = await youtube.videos.list({
      part: ["snippet", "statistics", "contentDetails"],
      id: allVideoIds,
    });

    const items = (detailResponse.data.items || [])
      .map((item) => ({
        id: item.id,
        title: item.snippet.title,
        thumbnail:
          item.snippet.thumbnails.maxres?.url ||
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.medium?.url,
        channel: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        views: parseInt(item.statistics.viewCount || 0),
        likes: parseInt(item.statistics.likeCount || 0),
        duration: parseDuration(item.contentDetails.duration),
        uploadedAt: item.snippet.publishedAt,
        description: item.snippet.description,
        videoUrl: `https://www.youtube.com/embed/${item.id}`,
        isYouTube: true,
      }))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    // -------- STEP 4 : CHANNEL AVATARS --------
    const finalChannelIds = [...new Set(items.map((i) => i.channelId))];

    if (finalChannelIds.length > 0) {
      const channelResponse = await youtube.channels.list({
        part: ["snippet"],
        id: finalChannelIds,
      });

      const avatars = Object.fromEntries(
        (channelResponse.data.items || []).map((c) => [
          c.id,
          c.snippet.thumbnails.default.url,
        ]),
      );

      items.forEach((item) => {
        item.channelAvatar = avatars[item.channelId] || "";
      });
    }

    // -------- STEP 5 : NEXT PAGE TOKEN --------
    const oldestVideo = items[items.length - 1];
    const nextPageToken = oldestVideo
      ? new Date(
        new Date(oldestVideo.uploadedAt).getTime() - 1000,
      ).toISOString()
      : null;

    return {
      items,
      nextPageToken,
    };
  } catch (error) {
    console.error("Error fetching videos by channels:", error);
    throw error;
  }
};

export const getChannelsDetails = async (channelIds) => {
  try {
    if (!channelIds || channelIds.length === 0) return { items: [] };

    const response = await youtube.channels.list({
      part: ["snippet", "statistics"],
      id: channelIds,
    });

    return {
      items: response.data.items.map((channel) => ({
        id: channel.id,
        name: channel.snippet.title,
        avatar: channel.snippet.thumbnails.default.url,
        subscribers: formatSubscribers(channel.statistics.subscriberCount),
        description: channel.snippet.description,
      })),
    };
  } catch (error) {
    console.error("Error fetching channel details:", error);
    throw error;
  }
};

function formatSubscribers(count) {
  const n = parseInt(count);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

export const getChannelFromRSS = async (channelId) => {
  try {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const response = await axios.get(url);
    const parser = new XMLParser();
    const output = parser.parse(response.data);

    const feed = output.feed;
    if (!feed) throw new Error("Invalid RSS feed");

    return {
      channelId: channelId,
      channelName: feed.title,
    };
  } catch (error) {
    console.error("RSS fetch error:", error.message);
    throw error;
  }
};

export const scrapeChannelFromSearch = async (query) => {
  // ── 1. Check Postgres channels table first ─────────────────────────────
  // We search by channel_id (exact match) or fall through to scrape.
  // We cannot do a name search in the channels table (it only stores IDs),
  // so we rely on the in-flight scrape and cache the result for next time.
  try {
    console.log(`[scrape] Searching YouTube for "${query}"...`);
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const match = html.match(/ytInitialData\s*=\s*({.*?});/);
    if (!match) throw new Error("Could not parse YouTube data");

    const ytInitialData = JSON.parse(match[1]);
    const searchResults =
      ytInitialData.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents;
    if (!searchResults)
      throw new Error("Could not find search results in JSON");

    for (const section of searchResults) {
      const itemSection = section.itemSectionRenderer;
      if (itemSection && itemSection.contents) {
        for (const item of itemSection.contents) {
          if (item.channelRenderer) {
            const renderer = item.channelRenderer;
            const channelData = {
              channelId: renderer.channelId,
              channelName:
                renderer.title.simpleText || renderer.title.runs?.[0]?.text,
              avatar: renderer.thumbnail.thumbnails[
                renderer.thumbnail.thumbnails.length - 1
              ].url.startsWith("//")
                ? "https:" +
                renderer.thumbnail.thumbnails[
                  renderer.thumbnail.thumbnails.length - 1
                ].url
                : renderer.thumbnail.thumbnails[
                  renderer.thumbnail.thumbnails.length - 1
                ].url,
              subscribers:
                renderer.videoCountText?.simpleText ||
                renderer.subscriberCountText?.simpleText ||
                "0 subscribers",
              description: renderer.descriptionSnippet?.runs?.[0]?.text || "",
            };

            // ── 2. Persist to Postgres channels table (fire-and-forget) ──
            channelService.upsertChannel(channelData.channelId, []).catch(
              (err) => console.warn("[scrape] Failed to cache channel in DB:", err.message)
            );
            console.log(`[scrape] Channel found & cached: ${channelData.channelName} (${channelData.channelId})`);

            return channelData;
          }
        }
      }
    }

    throw new Error("No channel found in search results");
  } catch (error) {
    console.error("[scrape] Error:", error.message);
    throw error;
  }
};
