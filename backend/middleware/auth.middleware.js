// Middleware to verify the user via clerkId in headers
export const authMiddleware = (req, res, next) => {
    try {
        // Extract clerkId from standard Authorization or a custom header
        const authHeader = req.headers.authorization;
        let clerkId = req.headers['x-clerk-id'];

        if (authHeader && authHeader.startsWith('Bearer ')) {
            clerkId = authHeader.split(' ')[1];
        }

        if (!clerkId) {
            return res.status(401).json({ error: 'Unauthorized: missing clerkId token in headers.' });
        }

        // Attach clerkId to the request object
        req.clerkId = clerkId;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error during authentication.' });
    }
};
