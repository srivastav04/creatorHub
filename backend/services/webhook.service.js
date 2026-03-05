import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

export const sendDataToN8n = async (data) => {
    try {
        if (!N8N_WEBHOOK_URL) {
            console.error('N8N_WEBHOOK_URL is not defined in .env');
            return;
        }

        const response = await axios.post(N8N_WEBHOOK_URL, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Data successfully sent to n8n:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending data to n8n:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        throw error;
    }
};
