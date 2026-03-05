import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
});

// Helper to parse ISO 8601 duration (e.g. PT14M23S) to seconds
function parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
}

export const getPopularVideos = async (limit = 12, pageToken = '') => {
    try {
        const response = await youtube.videos.list({
            part: ['snippet', 'statistics', 'contentDetails'],
            chart: 'mostPopular',
            maxResults: limit,
            pageToken: pageToken,
            regionCode: 'US'
        });

        const items = response.data.items;
        const channelIds = [...new Set(items.map(i => i.snippet.channelId))];

        // Fetch channel avatars
        const channelResponse = await youtube.channels.list({
            part: ['snippet'],
            id: channelIds
        });
        const avatars = Object.fromEntries(
            channelResponse.data.items.map(c => [c.id, c.snippet.thumbnails.default.url])
        );

        return {
            items: items.map(item => ({
                id: item.id,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url,
                channel: item.snippet.channelTitle,
                channelId: item.snippet.channelId,
                channelAvatar: avatars[item.snippet.channelId],
                views: parseInt(item.statistics.viewCount),
                likes: parseInt(item.statistics.likeCount),
                duration: parseDuration(item.contentDetails.duration),
                uploadedAt: item.snippet.publishedAt,
                description: item.snippet.description,
                videoUrl: `https://www.youtube.com/embed/${item.id}`,
                isYouTube: true
            })),
            nextPageToken: response.data.nextPageToken,
            totalResults: response.data.pageInfo.totalResults
        };
    } catch (error) {
        console.error('Error fetching popular videos:', error);
        throw error;
    }
};

export const searchVideos = async (query, limit = 12, pageToken = '') => {
    try {
        const searchResponse = await youtube.search.list({
            part: ['snippet'],
            q: query,
            maxResults: limit,
            type: ['video'],
            pageToken: pageToken
        });

        const videoIds = searchResponse.data.items.map(item => item.id.videoId);
        if (!videoIds.length) return { items: [], totalResults: 0 };

        // Fetch extra details (stats, contentDetails) for these videos
        const detailResponse = await youtube.videos.list({
            part: ['snippet', 'statistics', 'contentDetails'],
            id: videoIds
        });

        const items = detailResponse.data.items;
        const channelIds = [...new Set(items.map(i => i.snippet.channelId))];

        // Fetch channel avatars
        const channelResponse = await youtube.channels.list({
            part: ['snippet'],
            id: channelIds
        });
        const avatars = Object.fromEntries(
            channelResponse.data.items.map(c => [c.id, c.snippet.thumbnails.default.url])
        );

        return {
            items: items.map(item => ({
                id: item.id,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url,
                channel: item.snippet.channelTitle,
                channelId: item.snippet.channelId,
                channelAvatar: avatars[item.snippet.channelId],
                views: parseInt(item.statistics.viewCount),
                likes: parseInt(item.statistics.likeCount),
                duration: parseDuration(item.contentDetails.duration),
                uploadedAt: item.snippet.publishedAt,
                description: item.snippet.description,
                videoUrl: `https://www.youtube.com/embed/${item.id}`,
                isYouTube: true
            })),
            nextPageToken: searchResponse.data.nextPageToken,
            totalResults: searchResponse.data.pageInfo.totalResults
        };
    } catch (error) {
        console.error('Error searching videos:', error);
        throw error;
    }
};

export const getVideoDetails = async (videoId) => {
    try {
        const response = await youtube.videos.list({
            part: ['snippet', 'statistics', 'contentDetails'],
            id: [videoId]
        });

        if (!response.data.items.length) {
            throw new Error('Video not found');
        }

        const item = response.data.items[0];

        // Fetch channel avatar
        const channelResponse = await youtube.channels.list({
            part: ['snippet', 'statistics'],
            id: [item.snippet.channelId]
        });

        const channel = channelResponse.data.items[0];

        return {
            id: item.id,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url,
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
            isYouTube: true
        };
    } catch (error) {
        console.error('Error fetching video details:', error);
        throw error;
    }
};

export const getVideosByChannels = async (channelIds, limit = 20, pageToken = '') => {
    try {
        if (!channelIds || channelIds.length === 0) return { items: [], nextPageToken: null };

        // Fetch from up to 15 channels to keep quota usage reasonable while providing variety
        // Sorting them or shuffling could provide variety, for now we take the first 15
        const targetChannels = channelIds.slice(0, 12);

        const allVideoIds = [];
        const publishedBefore = pageToken || null;

        // Fetch latest for each channel
        await Promise.all(targetChannels.map(async (channelId) => {
            try {
                const searchParams = {
                    part: ['snippet'],
                    channelId: channelId,
                    maxResults: 4,
                    order: 'date',
                    type: 'video'
                };
                if (publishedBefore) {
                    searchParams.publishedBefore = publishedBefore;
                }

                const res = await youtube.search.list(searchParams);
                if (res.data.items) {
                    allVideoIds.push(...res.data.items.map(i => i.id.videoId));
                }
            } catch (err) {
                console.error(`Error fetching for channel ${channelId}:`, err.message);
            }
        }));

        if (allVideoIds.length === 0) return { items: [], nextPageToken: null };

        // Fetch details for these videos
        const detailResponse = await youtube.videos.list({
            part: ['snippet', 'statistics', 'contentDetails'],
            id: allVideoIds
        });

        const items = (detailResponse.data.items || []).map(item => ({
            id: item.id,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
            channel: item.snippet.channelTitle,
            channelId: item.snippet.channelId,
            views: parseInt(item.statistics.viewCount || 0),
            likes: parseInt(item.statistics.likeCount || 0),
            duration: parseDuration(item.contentDetails.duration),
            uploadedAt: item.snippet.publishedAt,
            description: item.snippet.description,
            videoUrl: `https://www.youtube.com/embed/${item.id}`,
            isYouTube: true
        })).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

        // Fetch channel avatars for these videos
        const finalChannelIds = [...new Set(items.map(i => i.channelId))];
        if (finalChannelIds.length > 0) {
            const channelResponse = await youtube.channels.list({
                part: ['snippet'],
                id: finalChannelIds
            });
            const avatars = Object.fromEntries(
                (channelResponse.data.items || []).map(c => [c.id, c.snippet.thumbnails.default.url])
            );

            items.forEach(item => {
                item.channelAvatar = avatars[item.channelId] || '';
            });
        }

        // The next page token will be the publishedAt of the oldest video, 
        // offset by 1 second to avoid duplicates
        const oldestVideo = items[items.length - 1];
        const nextPageToken = oldestVideo ? new Date(new Date(oldestVideo.uploadedAt).getTime() - 1000).toISOString() : null;

        return {
            items,
            nextPageToken
        };
    } catch (error) {
        console.error('Error fetching videos by channels:', error);
        throw error;
    }
};


export const getChannelsDetails = async (channelIds) => {
    try {
        if (!channelIds || channelIds.length === 0) return { items: [] };

        const response = await youtube.channels.list({
            part: ['snippet', 'statistics'],
            id: channelIds
        });

        return {
            items: response.data.items.map(channel => ({
                id: channel.id,
                name: channel.snippet.title,
                avatar: channel.snippet.thumbnails.default.url,
                subscribers: formatSubscribers(channel.statistics.subscriberCount),
                description: channel.snippet.description
            }))
        };
    } catch (error) {
        console.error('Error fetching channel details:', error);
        throw error;
    }
};

function formatSubscribers(count) {
    const n = parseInt(count);
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
}


