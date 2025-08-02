import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import handleCors from '@/utils/cors';

export const config = {
  api: {
    bodyParser: false, // Required for file uploads
  },
};

const UPLOAD_DIR = path.resolve('./public/uploads');
const LOG_DIR = path.resolve('./data/diveLogs');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (await handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const form = formidable({ multiples: false });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('❌ Form parsing error:', err);
        return res.status(500).json({ error: 'Failed to parse form data' });
      }

      // ✅ Safely extract diveLogId
      let diveLogId: string | undefined;
      if (fields.diveLogId) {
        diveLogId = Array.isArray(fields.diveLogId)
          ? fields.diveLogId[0]
          : (fields.diveLogId as string);
      }

      if (!diveLogId) {
        return res.status(400).json({ error: 'Missing diveLogId' });
      }

      // ✅ Safely extract image file
      let imageFile: formidable.File | undefined;
      if (files.image) {
        imageFile = Array.isArray(files.image)
          ? files.image[0]
          : (files.image as formidable.File);
      }

      if (!imageFile) {
        return res.status(400).json({ error: 'No image file uploaded' });
      }

      // ✅ Save image to /public/uploads
      const fileExt = path.extname(imageFile.originalFilename || '.jpg');
      const newFileName = `${diveLogId}${fileExt}`;
      const savePath = path.join(UPLOAD_DIR, newFileName);

      await fs.promises.rename(imageFile.filepath, savePath);

      const imageUrl = `/uploads/${newFileName}`;

      // ✅ Update local JSON log file
      const userFolders = fs.readdirSync(LOG_DIR);
      let logUpdated = false;

      for (const folder of userFolders) {
        const logFile = path.join(LOG_DIR, folder, `${diveLogId}.json`);
        if (fs.existsSync(logFile)) {
          const logData = JSON.parse(fs.readFileSync(logFile, 'utf8'));
          logData.imageUrl = imageUrl;
          await fs.promises.writeFile(logFile, JSON.stringify(logData, null, 2));
          logUpdated = true;
          break;
        }
      }

      if (!logUpdated) {
        console.warn(`⚠️ No local dive log found for ID: ${diveLogId}`);
      }

      // ✅ Sync image info to Wix
      try {
        await axios.post(
          'https://www.deepfreediving.com/_functions/updateDiveLogImage',
          { diveLogId, imageUrl },
          { headers: { 'Content-Type': 'application/json' } }
        );
      } catch (wixErr: any) {
        console.error(`⚠️ Failed to sync image for log ${diveLogId} to Wix:`, wixErr.response?.data || wixErr.message);
      }

      console.log(`✅ Image uploaded & linked to dive log: ${diveLogId}`);

      return res.status(200).json({
        success: true,
        message: '✅ Image uploaded and linked to your dive log.',
        imageUrl,
      });
    });
  } catch (error: any) {
    console.error('❌ Upload error:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
