import { nextConnect } from 'next-connect';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

// Configure multer upload
const upload = multer({ dest: path.join(process.cwd(), 'public/uploads') });

// Extend the request type to include multer fields
interface ExtendedRequest extends NextApiRequest {
  files?: {
    image?: Express.Multer.File[];
    video?: Express.Multer.File[];
  };
}

// Initialize the API route with error handling
const apiRoute = nextConnect<ExtendedRequest, NextApiResponse>({
  onError(error: Error, _req: NextApiRequest, res: NextApiResponse) {
    res.status(501).json({ error: `Upload failed: ${error.message}` });
  },
  onNoMatch(req: NextApiRequest, res: NextApiResponse) {
    res.status(405).json({ error: `Method '${req.method}' not allowed` });
  },
});

// Middleware for parsing multipart/form-data
apiRoute.use(
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ])
);

// POST handler
apiRoute.post((req, res) => {
  const data = {
    ...req.body,
    imageRefs: req.files?.image?.[0]?.filename || null,
    videoRefs: req.files?.video?.[0]?.filename || null,
  };

  const logPath = path.join(process.cwd(), 'data/logs.json');
  const existing = fs.existsSync(logPath)
    ? JSON.parse(fs.readFileSync(logPath, 'utf8'))
    : [];

  existing.push(data);
  fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));

  res.status(200).json({ status: 'saved', data });
});

// Disable Next.js bodyParser so multer can handle it
export const config = {
  api: {
    bodyParser: false,
  },
};

export default apiRoute;
