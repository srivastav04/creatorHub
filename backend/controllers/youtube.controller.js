import * as youtubeService from '../services/youtube.service.js';
import { sendDataToN8n } from '../services/webhook.service.js';


export const getFeed = async (req, res) => {
    try {
        const { limit, pageToken } = req.query;
        const data = await youtubeService.getPopularVideos(limit ? parseInt(limit) : 12, pageToken);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const search = async (req, res) => {
    try {
        const { q, limit, pageToken } = req.query;
        if (!q) {
            return res.status(400).json({ message: 'Query parameter "q" is required' });
        }
        const data = await youtubeService.searchVideos(q, limit ? parseInt(limit) : 12, pageToken);

        // Send to n8n (async)
        sendDataToN8n({
            event: 'video_search',
            query: q,
            results_count: data?.items?.length || 0,
            timestamp: new Date().toISOString()
        }).catch(err => console.error('Failed to send search details to n8n:', err.message));

        res.json(data);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await youtubeService.getVideoDetails(id);

        // Send to n8n (async)
        sendDataToN8n({
            event: 'video_view',
            videoId: id,
            title: data?.title,
            channel: data?.channelTitle,
            timestamp: new Date().toISOString()
        }).catch(err => console.error('Failed to send video view details to n8n:', err.message));

        res.json(data);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getRelated = async (req, res) => {
    try {
        const { id } = req.params;
        // YouTube API v3 no longer has a dedicated 'related' endpoint for search without specific permissions or deprecated.
        // We can search for videos using the video's title/tags or use search with relatedToVideoId (if allowed/quota permit)
        // For now, let's search by category or title.
        const video = await youtubeService.getVideoDetails(id);
        const data = await youtubeService.searchVideos(video.title, 10);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const getSubscriptionVideos = async (req, res) => {
    try {
        const { channelIds, pageToken } = req.query;
        if (!channelIds) {
            return res.status(400).json({ message: 'channelIds query parameter is required' });
        }

        // channelIds will be passed as a comma-separated string
        const idsArray = channelIds.split(',').filter(Boolean);
        const data = await youtubeService.getVideosByChannels(idsArray, 20, pageToken);
        res.json(data);
    } catch (error) {
        console.error('Controller error in getSubscriptionVideos:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getChannels = async (req, res) => {
    try {
        const { ids } = req.query;
        if (!ids) {
            return res.status(400).json({ message: 'ids query parameter is required' });
        }
        const idsArray = ids.split(',').filter(Boolean);
        const data = await youtubeService.getChannelsDetails(idsArray);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

