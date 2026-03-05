import users from '../db/dummyDB.js';

export const saveSubscriptions = (clerkId, subscriptions) => {
    // Check if user already exists
    const existingUserIndex = users.findIndex(user => user.clerkId === clerkId);

    if (existingUserIndex !== -1) {
        // Update subscriptions
        users[existingUserIndex].subscriptions = subscriptions;
        return users[existingUserIndex];
    } else {
        // Create new user entry
        const newUser = { clerkId, subscriptions, history: [], likedVideos: [], playlists: [] };
        users.push(newUser);
        return newUser;
    }
};

export const verifyUser = (clerkId) => {
    // Check if user exists
    const user = users.find(user => user.clerkId === clerkId);
    return user;
};

export const updateUserData = (clerkId, data) => {
    const existingUserIndex = users.findIndex(user => user.clerkId === clerkId);
    if (existingUserIndex !== -1) {
        if (data.history) {
            users[existingUserIndex].history = data.history.slice(0, 10);
        }
        if (data.likedVideos) {
            users[existingUserIndex].likedVideos = data.likedVideos;
        }
        if (data.playlists) {
            users[existingUserIndex].playlists = data.playlists;
        }
        if (data.subscriptions) {
            users[existingUserIndex].subscriptions = data.subscriptions;
        }
        return users[existingUserIndex];
    }
    return null;
};
