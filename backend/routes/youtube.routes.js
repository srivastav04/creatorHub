import express from 'express';
import * as youtubeController from '../controllers/youtube.controller.js';

const router = express.Router();

router.get('/feed', youtubeController.getFeed);
router.get('/search', youtubeController.search);
router.get('/video/:id', youtubeController.getVideo);
router.get('/video/:id/related', youtubeController.getRelated);
router.get('/subscriptions/videos', youtubeController.getSubscriptionVideos);
router.get('/channels', youtubeController.getChannels);
router.get('/scrape-channel', youtubeController.scrapeChannel);

export default router;
