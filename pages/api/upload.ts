import nextConnect from 'next-connect';
import multer from 'multer';
import fs from 'fs';

const upload = multer({ dest: './public/uploads' });

const apiRoute = nextConnect({
  onError(error, req, res) {
    res.status(501).json({ error: `Upload failed: ${error.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' not allowed` });
  },
});

apiRoute.use(upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
]));

apiRoute.post((req, res) => {
  const data = {
    ...req.body,
    imageRefs: req.files?.image?.[0]?.filename || null,
    videoRefs: req.files?.video?.[0]?.filename || null,
  };

  const logPath = './data/logs.json';
  const existing = fs.existsSync(logPath)
    ? JSON.parse(fs.readFileSync(logPath, 'utf8'))
    : [];

  existing.push(data);
  fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));

  res.status(200).json({ status: 'saved', data });
});

export default apiRoute;

export const config = {
  api: {
    bodyParser: false,
  },
};
