import * as userService from '../services/user.service.js';
import { sendDataToN8n } from '../services/webhook.service.js';


export const setupUser = (req, res) => {
    try {
        const { clerkId, subscriptions } = req.body;

        if (!clerkId || !subscriptions || !Array.isArray(subscriptions)) {
            return res.status(400).json({ error: 'Valid clerkId and subscriptions array are required.' });
        }

        const user = userService.saveSubscriptions(clerkId, subscriptions);

        // Send to n8n
        sendDataToN8n({
            event: 'user_setup',
            clerkId,
            subscriptions,
            timestamp: new Date().toISOString()
        }).catch(err => console.error('Failed to send user_setup to n8n:', err.message));

        console.log("user", user);

        res.status(200).json({
            message: 'Subscriptions saved successfully.',
            user
        });

    } catch (error) {
        console.error('Error saving subscriptions:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

export const verifyUser = (req, res) => {
    try {
        const clerkId = req.clerkId; // Handled by auth.middleware.js

        const user = userService.verifyUser(clerkId);

        if (user) {
            console.log('user already exists');

            res.status(200).json({
                exists: true,
                subscriptions: user.subscriptions,
                history: user.history || [],
                likedVideos: user.likedVideos || [],
                playlists: user.playlists || []
            });
        } else {
            console.log('user does not exist');
            res.status(200).json({
                exists: false
            });
        }
    } catch (error) {
        console.error('Error verifying user:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

export const syncUserData = (req, res) => {
    try {
        const clerkId = req.clerkId;
        const { history, likedVideos, playlists, subscriptions } = req.body;

        const updatedUser = userService.updateUserData(clerkId, { history, likedVideos, playlists, subscriptions });

        if (updatedUser) {
            // Send to n8n
            sendDataToN8n({
                event: 'user_sync',
                clerkId,
                history,
                likedVideos,
                playlists,
                subscriptions,
                timestamp: new Date().toISOString()
            }).catch(err => console.error('Failed to send user_sync to n8n:', err.message));

            res.status(200).json({ message: 'User data synced successfully', user: updatedUser });
        } else {
            res.status(404).json({ error: 'User not found' });
        }

    } catch (error) {
        console.error('Error syncing user data:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};
